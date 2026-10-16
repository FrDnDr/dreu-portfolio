interface Env {
  GITHUB_TOKEN: string;
  GITHUB_USERNAME: string;
  PORTFOLIO_ASSETS: {
    head(key: string): Promise<{ size: number; httpEtag: string } | null>;
    get(key: string, options?: { range: { offset: number; length: number } }): Promise<{
      body: ReadableStream;
      httpMetadata?: { contentType?: string };
    } | null>;
  };
}

type ContributionDay = { date: string; contributionCount: number };
type ContributionCalendar = { totalContributions: number; weeks: { contributionDays: ContributionDay[] }[] };

const contributionQuery = `
  query Contributions($login: String!, $from: DateTime!, $to: DateTime!) {
    user(login: $login) {
      contributionsCollection(from: $from, to: $to) {
        contributionCalendar {
          totalContributions
          weeks {
            contributionDays {
              date
              contributionCount
            }
          }
        }
      }
    }
  }
`;

const isoDate = (date: Date) => date.toISOString().slice(0, 10);
const addDays = (date: Date, days: number) => new Date(date.getTime() + days * 86_400_000);

function calendarFromDays(from: Date, to: Date, counts: Map<string, number>): ContributionCalendar {
  const firstDay = new Date(Date.UTC(from.getUTCFullYear(), from.getUTCMonth(), from.getUTCDate()));
  const lastDay = new Date(Date.UTC(to.getUTCFullYear(), to.getUTCMonth(), to.getUTCDate()));
  const firstVisibleDay = addDays(firstDay, -firstDay.getUTCDay());
  const weeks: { contributionDays: ContributionDay[] }[] = [];

  for (let weekStart = firstVisibleDay; weekStart <= lastDay; weekStart = addDays(weekStart, 7)) {
    weeks.push({ contributionDays: Array.from({ length: 7 }, (_, index) => {
      const day = addDays(weekStart, index);
      const date = isoDate(day);
      return { date, contributionCount: date >= isoDate(firstDay) && date <= isoDate(lastDay) ? counts.get(date) ?? 0 : 0 };
    }) });
  }

  return { totalContributions: [...counts.values()].reduce((total, count) => total + count, 0), weeks };
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    const assetKeys: Record<string, { key: string; contentType: string; cacheControl?: string }> = {
      "/images/me-pic.jpg": { key: "me-pic.jpg", contentType: "image/jpeg" },
      "/images/me-pic-pixel.png": { key: "me-pic-pixel.png", contentType: "image/png" },
      "/projects/nobogey-platform-ecosystem-cover.png": {
        key: "projects/nobogey-platform-ecosystem-cover.png",
        contentType: "image/png",
        cacheControl: "public, max-age=3600",
      },
    };
    if (url.pathname === "/projects/etl-pipeline.mp4") {
      if (request.method !== "GET" && request.method !== "HEAD") {
        return new Response(null, { status: 405, headers: { Allow: "GET, HEAD" } });
      }
      const key = "projects/etl-pipeline.mp4";
      const metadata = await env.PORTFOLIO_ASSETS.head(key);
      if (!metadata) return new Response("Not found", { status: 404 });
      const headers = new Headers({
        "Content-Type": "video/mp4",
        "Cache-Control": "public, max-age=3600",
        "Accept-Ranges": "bytes",
        "Content-Length": String(metadata.size),
        ETag: metadata.httpEtag,
      });
      if (request.method === "HEAD") return new Response(null, { headers });

      const requestedRange = request.headers.get("Range");
      const ifRange = request.headers.get("If-Range");
      let range: { offset: number; length: number } | undefined;
      if (requestedRange && (!ifRange || ifRange === metadata.httpEtag)) {
        const match = /^bytes=(\d*)-(\d*)$/.exec(requestedRange);
        const start = match?.[1] ? Number(match[1]) : Math.max(0, metadata.size - Number(match?.[2]));
        const end = match?.[1] && match[2] ? Math.min(Number(match[2]), metadata.size - 1) : metadata.size - 1;
        if (!match || (!match[1] && !match[2]) || !Number.isSafeInteger(start) || !Number.isSafeInteger(end) || start < 0 || start >= metadata.size || end < start) {
          headers.set("Content-Range", `bytes */${metadata.size}`);
          headers.set("Content-Length", "0");
          return new Response(null, { status: 416, headers });
        }
        range = { offset: start, length: end - start + 1 };
        headers.set("Content-Range", `bytes ${start}-${end}/${metadata.size}`);
        headers.set("Content-Length", String(range.length));
      }
      const object = await env.PORTFOLIO_ASSETS.get(key, range ? { range } : undefined);
      if (!object) return new Response("Not found", { status: 404 });
      return new Response(object.body, { status: range ? 206 : 200, headers });
    }

    const asset = assetKeys[url.pathname];

    if (asset) {
      const object = await env.PORTFOLIO_ASSETS.get(asset.key);

      if (!object) {
        return new Response("Not found", { status: 404 });
      }

      return new Response(object.body, {
        headers: {
          "Cache-Control": asset.cacheControl ?? "public, max-age=31536000, immutable",
          "Content-Type": object.httpMetadata?.contentType ?? asset.contentType,
        },
      });
    }

    if (url.pathname !== "/api/github/contributions") {
      return new Response("Not found", { status: 404 });
    }

    try {
    const now = new Date();
    const requestedYear = Number(url.searchParams.get("year"));
    const currentYear = now.getFullYear();
    const startYear = Number.isInteger(requestedYear) && requestedYear >= 2008 && requestedYear <= currentYear
      ? requestedYear
      : currentYear;
    const from = new Date(Date.UTC(startYear, 0, 1));
    const to = startYear === currentYear ? now : new Date(Date.UTC(startYear, 11, 31, 23, 59, 59, 999));

    const ranges: { from: Date; to: Date }[] = [];
    for (let rangeStart = from; rangeStart < to;) {
      const nextYear = new Date(Date.UTC(rangeStart.getUTCFullYear() + 1, rangeStart.getUTCMonth(), rangeStart.getUTCDate()));
      const rangeEnd = nextYear < to ? nextYear : to;
      ranges.push({ from: rangeStart, to: rangeEnd });
      rangeStart = rangeEnd;
    }

    const responses = await Promise.all(ranges.map(async (range) => {
      const response = await fetch("https://api.github.com/graphql", {
        method: "POST",
        headers: { Authorization: `Bearer ${env.GITHUB_TOKEN}`, Accept: "application/vnd.github+json", "Content-Type": "application/json", "User-Agent": "dreu-portfolio" },
        body: JSON.stringify({ query: contributionQuery, variables: { login: env.GITHUB_USERNAME, from: range.from.toISOString(), to: range.to.toISOString() } }),
      });
      const payload = await response.json() as { data?: { user?: { contributionsCollection?: { contributionCalendar?: ContributionCalendar } } }; errors?: { message?: string }[] };
      const calendar = payload.data?.user?.contributionsCollection?.contributionCalendar;
      if (!response.ok || payload.errors || !calendar) throw new Error(payload.errors?.map(({ message }) => message).join(", ") || `GitHub returned ${response.status}`);
      return calendar;
    }));

    const counts = new Map<string, number>();
    for (const calendar of responses) for (const week of calendar.weeks) for (const day of week.contributionDays) {
      if (day.date >= isoDate(from) && day.date <= isoDate(to)) counts.set(day.date, day.contributionCount);
    }

    return Response.json(
      calendarFromDays(from, to, counts),
      { headers: { "Cache-Control": "public, max-age=300" } },
    );
    } catch (error) {
    console.error("GitHub contribution request failed", error);
    return Response.json(
      { error: "GitHub contributions are temporarily unavailable." },
      { status: 502 },
    );
    }
  },
};
