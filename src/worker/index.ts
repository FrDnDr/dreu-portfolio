interface Env {
  GITHUB_TOKEN: string;
  GITHUB_USERNAME: string;
  CONTRIBUTIONS_UPSTREAM_LIMITER: {
    limit(options: { key: string }): Promise<{ success: boolean }>;
  };
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

const browserHeaders = {
  "Content-Security-Policy": "base-uri 'self'; object-src 'none'; frame-ancestors 'none'",
  "X-Frame-Options": "DENY",
  "X-Content-Type-Options": "nosniff",
  "Referrer-Policy": "strict-origin-when-cross-origin",
  "Permissions-Policy": "camera=(), microphone=(), geolocation=(), payment=()",
};

const freshSeconds = 300;
const staleSeconds = 86_400;
const refreshes = new Map<string, Promise<Response>>();

function calendarResponse(cached: Response, stale = false): Response {
  const headers = new Headers({
    "Content-Type": "application/json",
    "Cache-Control": stale ? "no-store" : `public, max-age=${freshSeconds}`,
  });
  if (stale) headers.set("X-Contributions-Stale", "true");
  return new Response(cached.body, { headers });
}

async function contributions(request: Request, env: Env): Promise<Response> {
  if (request.method !== "GET" && request.method !== "HEAD") {
    return new Response(null, { status: 405, headers: { Allow: "GET, HEAD", "Cache-Control": "no-store" } });
  }
  // HEAD never spends GitHub quota, including on a cold cache.
  if (request.method === "HEAD") {
    return new Response(null, { headers: { "Content-Type": "application/json", "Cache-Control": "no-store" } });
  }

  const now = new Date();
  const requestedYear = Number(new URL(request.url).searchParams.get("year"));
  const currentYear = now.getUTCFullYear();
  const year = Number.isInteger(requestedYear) && requestedYear >= 2008 && requestedYear <= currentYear
    ? requestedYear : currentYear;
  // Caller-controlled hosts and irrelevant query parameters cannot fragment the cache.
  const key = new Request(`https://frdndr.com/__contributions-cache/v1/${encodeURIComponent(env.GITHUB_USERNAME)}/${year}`);
  const cache = await caches.open("github-contributions-v1");
  const cached = await cache.match(key);
  const storedAt = Number(cached?.headers.get("X-Cached-At") ?? NaN);
  const age = (now.getTime() - storedAt) / 1000;
  const usable = cached && Number.isFinite(age) && age >= 0 && age < staleSeconds ? cached : undefined;
  if (usable && age < freshSeconds) return calendarResponse(usable);

  // Coalesce simultaneous misses in this isolate; the binding also bounds misses across isolates.
  const pending = refreshes.get(key.url);
  if (pending) return (await pending).clone();
  const refresh = (async () => {
    try {
      // A shared upstream budget applies across years and public hostnames, without trusting client IDs.
      const { success } = await env.CONTRIBUTIONS_UPSTREAM_LIMITER.limit({ key: `portfolio-contributions:${env.GITHUB_USERNAME}` });
      if (!success) {
        if (usable) return calendarResponse(usable, true);
        return Response.json({ error: "Please try again shortly." }, {
          status: 429, headers: { "Retry-After": "60", "Cache-Control": "no-store" },
        });
      }
      const from = new Date(Date.UTC(year, 0, 1));
      const to = year === currentYear ? now : new Date(Date.UTC(year, 11, 31, 23, 59, 59, 999));
      const response = await fetch("https://api.github.com/graphql", {
        method: "POST",
        headers: { Authorization: `Bearer ${env.GITHUB_TOKEN}`, Accept: "application/vnd.github+json", "Content-Type": "application/json", "User-Agent": "dreu-portfolio" },
        body: JSON.stringify({ query: contributionQuery, variables: { login: env.GITHUB_USERNAME, from: from.toISOString(), to: to.toISOString() } }),
        signal: AbortSignal.timeout(8_000),
      });
      const payload = await response.json() as { data?: { user?: { contributionsCollection?: { contributionCalendar?: ContributionCalendar } } }; errors?: unknown[] };
      const calendar = payload.data?.user?.contributionsCollection?.contributionCalendar;
      if (!response.ok || payload.errors || !calendar) throw new Error("GitHub calendar unavailable");
      const counts = new Map<string, number>();
      for (const week of calendar.weeks) for (const day of week.contributionDays) {
        if (day.date >= isoDate(from) && day.date <= isoDate(to)) counts.set(day.date, day.contributionCount);
      }
      const stored = Response.json(calendarFromDays(from, to, counts), {
        headers: { "Cache-Control": `public, max-age=${staleSeconds}`, "X-Cached-At": String(Date.now()) },
      });
      // Keep a bounded stale copy for outages; only the shorter freshness is exposed to clients.
      try { await cache.put(key, stored.clone()); }
      catch { console.error("Contribution cache write failed"); }
      return calendarResponse(stored);
    } catch {
      console.error("GitHub contribution refresh failed");
      if (usable) return calendarResponse(usable, true);
      return Response.json({ error: "GitHub contributions are temporarily unavailable." }, {
        status: 502, headers: { "Cache-Control": "no-store" },
      });
    }
  })();
  refreshes.set(key.url, refresh);
  try { return (await refresh).clone(); }
  finally { refreshes.delete(key.url); }
}

async function handleRequest(request: Request, env: Env): Promise<Response> {
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
    if (request.method !== "GET" && request.method !== "HEAD") {
      return new Response(null, { status: 405, headers: { Allow: "GET, HEAD" } });
    }
    const object = await env.PORTFOLIO_ASSETS.get(asset.key);

    if (!object) {
      return new Response("Not found", { status: 404 });
    }

    return new Response(request.method === "HEAD" ? null : object.body, {
      headers: {
        "Cache-Control": asset.cacheControl ?? "public, max-age=31536000, immutable",
        "Content-Type": object.httpMetadata?.contentType ?? asset.contentType,
      },
    });
  }

  if (url.pathname !== "/api/github/contributions") {
    return new Response("Not found", { status: 404 });
  }

  return contributions(request, env);
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    let response: Response;
    try { response = await handleRequest(request, env); }
    catch {
      console.error("Portfolio request failed");
      response = Response.json({ error: "Temporarily unavailable." }, { status: 503, headers: { "Cache-Control": "no-store" } });
    }
    // Static _headers rules do not cover Worker-generated responses, including errors.
    const secured = new Response(response.body, response);
    for (const [name, value] of Object.entries(browserHeaders)) secured.headers.set(name, value);
    return secured;
  },
};
