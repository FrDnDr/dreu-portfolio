interface Env {
  GITHUB_TOKEN: string;
  GITHUB_USERNAME: string;
  PORTFOLIO_ASSETS: {
    get(key: string): Promise<{
      body: ReadableStream;
      httpMetadata?: { contentType?: string };
    } | null>;
  };
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname === "/images/me-pic.jpg") {
      const portrait = await env.PORTFOLIO_ASSETS.get("me-pic.jpg");

      if (!portrait) {
        return new Response("Not found", { status: 404 });
      }

      return new Response(portrait.body, {
        headers: {
          "Cache-Control": "public, max-age=31536000, immutable",
          "Content-Type": portrait.httpMetadata?.contentType ?? "image/jpeg",
        },
      });
    }

    if (url.pathname !== "/api/github/contributions") {
      return new Response("Not found", { status: 404 });
    }

    const to = new Date();
    const from = new Date(to);
    from.setFullYear(from.getFullYear() - 1);

    const query = `
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

    const response = await fetch("https://api.github.com/graphql", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${env.GITHUB_TOKEN}`,
        Accept: "application/vnd.github+json",
        "Content-Type": "application/json",
        "User-Agent": "dreu-portfolio",
      },
      body: JSON.stringify({
        query,
        variables: {
          login: env.GITHUB_USERNAME,
          from: from.toISOString(),
          to: to.toISOString(),
        },
      }),
    });

    const responseText = await response.text();
    let payload: {
      data?: { user?: { contributionsCollection?: { contributionCalendar?: unknown } } };
      errors?: { message?: string }[];
    };

    try {
      payload = JSON.parse(responseText);
    } catch {
      console.error("GitHub contribution request returned a non-JSON response", {
        status: response.status,
        body: responseText.slice(0, 160),
      });
      return Response.json(
        { error: "GitHub contributions are temporarily unavailable." },
        { status: 502 },
      );
    }

    const calendar = payload.data?.user?.contributionsCollection?.contributionCalendar;

    if (!response.ok || payload.errors || !calendar) {
      console.error("GitHub contribution request failed", {
        status: response.status,
        errors: payload.errors?.map(({ message }) => message),
      });
      return Response.json(
        { error: "GitHub contributions are temporarily unavailable." },
        { status: 502 },
      );
    }

    return Response.json(
      calendar,
      { headers: { "Cache-Control": "public, max-age=300" } },
    );
  },
};
