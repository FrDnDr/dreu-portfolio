import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const token = env.GITHUB_TOKEN

  return {
  plugins: [react(), {
    name: 'github-contributions-dev-api',
    configureServer(server) {
      server.middlewares.use('/api/github/contributions', async (_request, response) => {
        if (!token) {
          response.statusCode = 503
          response.setHeader('Content-Type', 'application/json')
          response.end(JSON.stringify({ error: 'Missing local GITHUB_TOKEN.' }))
          return
        }

        const to = new Date()
        const from = new Date(to)
        from.setFullYear(from.getFullYear() - 1)
        const query = `query Contributions($login: String!, $from: DateTime!, $to: DateTime!) {
          user(login: $login) {
            contributionsCollection(from: $from, to: $to) {
              contributionCalendar { totalContributions weeks { contributionDays { date contributionCount } } }
            }
          }
        }`

        try {
          const githubResponse = await fetch('https://api.github.com/graphql', {
            method: 'POST',
            headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({ query, variables: { login: env.GITHUB_USERNAME || 'FrDnDr', from: from.toISOString(), to: to.toISOString() } }),
          })
          const payload = await githubResponse.json()
          if (!githubResponse.ok || payload.errors) throw new Error(payload.errors?.[0]?.message || 'GitHub request failed')
          const calendar = payload.data.user?.contributionsCollection?.contributionCalendar
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
