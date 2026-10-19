import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test, { beforeEach } from "node:test";
import ts from "typescript";

// Exercise the actual handler with isolated Cache, R2, limiter and upstream bindings.
const source = await readFile(new URL("../src/worker/index.ts", import.meta.url), "utf8");
const { outputText } = ts.transpileModule(source, {
  compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext },
});
const worker = (await import(`data:text/javascript;base64,${Buffer.from(outputText).toString("base64")}`)).default;
let entries, calls, limitCalls, allow, upstream;
const env = {
  GITHUB_USERNAME: "test-user",
  GITHUB_TOKEN: "test-only-placeholder",
  CONTRIBUTIONS_UPSTREAM_LIMITER: { async limit() { limitCalls++; return { success: allow }; } },
  PORTFOLIO_ASSETS: {
    async head() { return { size: 100, httpEtag: '"test"' }; },
    async get(_key, options) {
      return { body: new Blob(["x".repeat(options?.range?.length ?? 100)]).stream() };
    },
  },
};
const request = (query = "?year=2025", options) => new Request(`https://frdndr.com/api/github/contributions${query}`, options);
const headersSafe = response => {
  assert.equal(response.headers.get("X-Content-Type-Options"), "nosniff");
  assert.equal(response.headers.get("X-Frame-Options"), "DENY");
  assert.match(response.headers.get("Content-Security-Policy"), /frame-ancestors 'none'/);
};

beforeEach(() => {
  entries = new Map(); calls = []; limitCalls = 0; allow = true;
  globalThis.caches = { async open() { return {
    async match(key) { return entries.get(key.url)?.clone(); },
    async put(key, response) { entries.set(key.url, response.clone()); },
  }; } };
  upstream = async () => Response.json({ data: { user: { contributionsCollection: {
    contributionCalendar: { weeks: [{ contributionDays: [{ date: "2025-01-01", contributionCount: 3 }] }] },
  } } } });
  globalThis.fetch = async (url, options) => { calls.push({ url, options }); return upstream(); };
});

test("fresh cache is shared across hostnames and irrelevant query parameters", async () => {
  const first = await worker.fetch(request("?year=2025&noise=a"), env);
  assert.equal((await first.json()).totalContributions, 3);
  const second = await worker.fetch(new Request("https://other.workers.dev/api/github/contributions?noise=b&year=2025"), env);
  assert.equal((await second.json()).totalContributions, 3);
  assert.equal(calls.length, 1);
  assert.equal(limitCalls, 1);
  assert.equal(calls[0].url, "https://api.github.com/graphql");
  assert.equal(calls[0].options.headers.Authorization, `Bearer ${env.GITHUB_TOKEN}`);
  assert.ok(calls[0].options.signal instanceof AbortSignal);
  assert.equal(second.headers.get("X-Cached-At"), null);
  headersSafe(second);
});

test("HEAD and unsupported methods never invoke GitHub or limiter", async () => {
  for (const method of ["HEAD", "POST", "PUT", "DELETE", "OPTIONS"]) {
    const response = await worker.fetch(request("", { method }), env);
    assert.equal(response.status, method === "HEAD" ? 200 : 405);
    if (method !== "HEAD") assert.equal(response.headers.get("Allow"), "GET, HEAD");
    assert.equal(await response.text(), "");
    headersSafe(response);
  }
  assert.equal(calls.length, 0);
  assert.equal(limitCalls, 0);
});

test("invalid years normalize to one current-year cache entry", async () => {
  for (const query of ["", "?year=bad", "?year=9999", "?year=2007", "?year=2025.5"]) {
    assert.equal((await worker.fetch(request(query), env)).status, 200);
  }
  assert.equal(calls.length, 1);
  const { variables } = JSON.parse(calls[0].options.body);
  assert.equal(variables.login, env.GITHUB_USERNAME);
  assert.equal(variables.from, `${new Date().getUTCFullYear()}-01-01T00:00:00.000Z`);
});

test("rate-limited cold misses fail closed without upstream calls", async () => {
  allow = false;
  const response = await worker.fetch(request(), env);
  assert.equal(response.status, 429);
  assert.equal(response.headers.get("Retry-After"), "60");
  assert.equal(response.headers.get("Cache-Control"), "no-store");
  assert.equal(calls.length, 0);
  headersSafe(response);
});

test("simultaneous misses share one upstream refresh", async () => {
  const responses = await Promise.all(Array.from({ length: 8 }, () => worker.fetch(request(), env)));
  assert.deepEqual(await Promise.all(responses.map(async response => (await response.json()).totalContributions)), Array(8).fill(3));
  assert.equal(calls.length, 1);
  assert.equal(limitCalls, 1);
});

async function ageCache(seconds) {
  await worker.fetch(request(), env);
  for (const [key, value] of entries) {
    const aged = new Response(value.body, value);
    aged.headers.set("X-Cached-At", String(Date.now() - seconds * 1000));
    entries.set(key, aged);
  }
}

test("upstream timeout uses a stale calendar without exposing error details", async () => {
  await ageCache(600);
  upstream = async () => { throw new DOMException("private upstream detail", "TimeoutError"); };
  const response = await worker.fetch(request(), env);
  assert.equal(response.status, 200);
  assert.equal(response.headers.get("X-Contributions-Stale"), "true");
  assert.equal(response.headers.get("Cache-Control"), "no-store");
  assert.equal((await response.json()).totalContributions, 3);
});

test("rate-limited refresh can still serve stale data", async () => {
  await ageCache(600); allow = false;
  const response = await worker.fetch(request(), env);
  assert.equal(response.status, 200);
  assert.equal(response.headers.get("X-Contributions-Stale"), "true");
  assert.equal(calls.length, 1);
});

test("expired stale data and failed upstream produce a generic uncached error", async () => {
  await ageCache(90_000);
  upstream = async () => Response.json({ errors: [{ message: "private detail" }] });
  const response = await worker.fetch(request(), env);
  assert.equal(response.status, 502);
  assert.equal(response.headers.get("Cache-Control"), "no-store");
  assert.doesNotMatch(await response.text(), /private detail|test-only-placeholder/);
  headersSafe(response);
});

test("missing rate limiter cannot silently spend quota", async () => {
  const response = await worker.fetch(request(), { ...env, CONTRIBUTIONS_UPSTREAM_LIMITER: undefined });
  assert.equal(response.status, 502);
  assert.equal(calls.length, 0);
  headersSafe(response);
});

test("video range behavior and error headers survive response wrapping", async () => {
  const url = "https://frdndr.com/projects/etl-pipeline.mp4";
  const valid = await worker.fetch(new Request(url, { headers: { Range: "bytes=10-19" } }), env);
  assert.equal(valid.status, 206);
  assert.equal(valid.headers.get("Content-Range"), "bytes 10-19/100");
  assert.equal((await valid.text()).length, 10);
  headersSafe(valid);
  const invalid = await worker.fetch(new Request(url, { headers: { Range: "bytes=200-300" } }), env);
  assert.equal(invalid.status, 416);
  headersSafe(invalid);
  const head = await worker.fetch(new Request(url, { method: "HEAD" }), env);
  assert.equal(head.status, 200);
  assert.equal(await head.text(), "");
  headersSafe(head);
  headersSafe(await worker.fetch(new Request("https://frdndr.com/api/unknown"), env));
});
