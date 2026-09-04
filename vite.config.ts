import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const token = env.GITHUB_TOKEN

  return {
  plugins: [react(), {
    name: 'github-contributions-dev-api',
    configureServer(server) {
      server.middlewares.use('/api/github/contributions', async (request, response) => {
        if (!token) {
          response.statusCode = 503
          response.setHeader('Content-Type', 'application/json')
          response.end(JSON.stringify({ error: 'Missing local GITHUB_TOKEN.' }))
          return
        }

        const now = new Date()
        const requestedYear = Number(new URL(request.url || '', 'http://localhost').searchParams.get('year'))
        const currentYear = now.getFullYear()
        const startYear = Number.isInteger(requestedYear) && requestedYear >= 2008 && requestedYear <= currentYear ? requestedYear : currentYear
        const from = new Date(Date.UTC(startYear, 0, 1))
        const to = startYear === currentYear ? now : new Date(Date.UTC(startYear, 11, 31, 23, 59, 59, 999))
        const query = `query Contributions($login: String!, $from: DateTime!, $to: DateTime!) {
          user(login: $login) {
            contributionsCollection(from: $from, to: $to) {
              contributionCalendar { totalContributions weeks { contributionDays { date contributionCount } } }
            }
          }
        }`

        try {
          const ranges: { from: Date; to: Date }[] = []
          for (let rangeStart = from; rangeStart < to;) {
            const nextYear = new Date(Date.UTC(rangeStart.getUTCFullYear() + 1, rangeStart.getUTCMonth(), rangeStart.getUTCDate()))
            const rangeEnd = nextYear < to ? nextYear : to
            ranges.push({ from: rangeStart, to: rangeEnd })
            rangeStart = rangeEnd
          }
          const calendars = await Promise.all(ranges.map(async (range) => {
            const githubResponse = await fetch('https://api.github.com/graphql', {
              method: 'POST',
              headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
              body: JSON.stringify({ query, variables: { login: env.GITHUB_USERNAME || 'FrDnDr', from: range.from.toISOString(), to: range.to.toISOString() } }),
            })
            const payload = await githubResponse.json()
            if (!githubResponse.ok || payload.errors) throw new Error(payload.errors?.[0]?.message || 'GitHub request failed')
            return payload.data.user?.contributionsCollection?.contributionCalendar
          }))
          const isoDate = (date: Date) => date.toISOString().slice(0, 10)
          const addDays = (date: Date, days: number) => new Date(date.getTime() + days * 86_400_000)
          const counts = new Map<string, number>()
          for (const calendar of calendars) for (const week of calendar.weeks) for (const day of week.contributionDays) {
            if (day.date >= isoDate(from) && day.date <= isoDate(to)) counts.set(day.date, day.contributionCount)
          }
          const firstDay = new Date(Date.UTC(from.getFullYear(), from.getMonth(), from.getDate()))
          const lastDay = new Date(Date.UTC(to.getFullYear(), to.getMonth(), to.getDate()))
          const firstVisibleDay = addDays(firstDay, -firstDay.getUTCDay())
          const weeks = []
          for (let weekStart = firstVisibleDay; weekStart <= lastDay; weekStart = addDays(weekStart, 7)) {
            weeks.push({ contributionDays: Array.from({ length: 7 }, (_, index) => {
              const day = addDays(weekStart, index)
              const date = isoDate(day)
              return { date, contributionCount: date >= isoDate(firstDay) && date <= isoDate(lastDay) ? counts.get(date) || 0 : 0 }
            }) })
          }
          const calendar = { totalContributions: [...counts.values()].reduce((total, count) => total + count, 0), weeks }
          response.statusCode = 200
          response.setHeader('Content-Type', 'application/json')
          response.setHeader('Cache-Control', 'no-store')
          response.end(JSON.stringify(calendar))
        } catch (error) {
          response.statusCode = 502
          response.setHeader('Content-Type', 'application/json')
          response.end(JSON.stringify({ error: error instanceof Error ? error.message : 'GitHub request failed.' }))
        }
      })
    },
  }],
}
})
