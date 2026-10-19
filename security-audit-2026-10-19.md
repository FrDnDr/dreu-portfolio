# Website security audit

## Implementation follow-up

The findings below describe the pre-fix audit snapshot. Subsequent local changes
address the GitHub endpoint with canonical caching, miss throttling, request
coalescing, GET/HEAD restrictions, stale fallback, and an eight-second timeout.
Static and Worker responses now define browser security headers; the broad
resource CSP is report-only while framing/base/plugin restrictions are enforced.
Tooling was refreshed to Wrangler 4.151.1 and patched transitive dependencies;
the fresh lockfile audit reports zero vulnerabilities. Actions are SHA-pinned,
CI runs security tests/advisory checks, and Dependabot is configured.

Validation: production build passed; all ten mocked Worker security tests passed;
Cloudflare deployment dry-run accepted the rate-limit binding; built `_headers`
matches its source. Local Cloudflare runtime smoke testing was attempted but
cannot run on this host's macOS 12.6 (runtime requires 13.5+). No deployment,
commit, or push occurred during implementation validation. Production header/runtime checks, report-only CSP
review, Formspree rejection cases, and account permission checks remain pending.
See `README.md`, Security controls, for configuration and follow-up instructions.

Reviewed 2026-10-19, Asia/Manila. Local checkout: `70da79b52fd3ae969ce897b85bc99b59939df6dd`.

## Executive summary

No critical or high application vulnerability was confirmed. The main actionable risks are anonymous consumption of authenticated GitHub quota, missing browser security headers on the live homepage, and known vulnerabilities in development/build tooling. The contact form now includes Turnstile, and the owner confirms Formspree verification is enabled. That resolves the earlier report's uncertainty about whether verification was configured, although rejection behavior was not independently tested.

Scope: React/TypeScript frontend, Cloudflare Worker, R2 asset delivery, Vite development middleware, GitHub Actions, locked npm dependencies, and passive GET checks of the production homepage and contributions API. Owner confirms this is a public portfolio without accounts, private dashboards, or sensitive data beyond ordinary inquiries. React and general JavaScript frontend skill references were applied; no dedicated Cloudflare Worker backend reference was available, so backend findings use source and official platform documentation.

The existing `security_best_practices_report.md` is preserved as an older snapshot. This report supersedes its observations where the current implementation differs.

## Critical / High application findings

None confirmed. npm's high-severity dependency entries are discussed separately from demonstrated application exposure.

## Medium findings

### 1. Public contributions requests can consume authenticated GitHub quota

- **Rule:** Backend resource-consumption control.
- **Location:** `src/worker/index.ts:121-162`; routes at `wrangler.jsonc:4-7,23-26`.
- **Evidence:** The handler accepts requests without a method guard and executes `fetch("https://api.github.com/graphql", ...)` using the server token. No cache lookup, request rate limiter, or upstream timeout appears in this path. The owner confirms only Formspree verification is enabled, rather than API rate limits.
- **Validation:** An isolated test transpiled the current handler in memory and replaced upstream fetch with a stub. Two identical GETs, a POST, and a HEAD all returned 200 and produced four upstream calls. This proves handler behavior; it does not measure deployed edge rules or exhaust production quota. One live API GET returned 200.
- **Impact:** An anonymous caller can degrade contribution data availability by draining quota or causing secondary throttling; shared-token integrations could also suffer. The query, upstream host, and configured user are fixed, and the year is bounded, so this is not arbitrary GraphQL access or token disclosure.
- **Suggestion:** Prefer scheduled/precomputed calendars, or implement a canonical cache key based only on validated year, cache lookup before GitHub, stale fallback, bounded fetch timeout, and rate limits before upstream work. Allow GET/HEAD only and make HEAD avoid unnecessary upstream calls. Cover apex, www, and workers.dev routes; disabling an unnecessary workers.dev endpoint is another option.
- **Uncertainty:** Account-level rules were not inspected. `Cache-Control: public, max-age=300` does not establish a cache lookup inside this Worker.
- **Reference:** [GitHub GraphQL limits](https://docs.github.com/en/graphql/overview/rate-limits-and-query-limits-for-the-graphql-api).

### 2. Live homepage lacks explicit browser security headers

- **Rule:** REACT-HEADERS-001.
- **Location:** `index.html:3-17`, `wrangler.jsonc:23-26`; Worker responses at `src/worker/index.ts:74-80,113-118,160-168`.
- **Evidence:** A production GET to `https://frdndr.com/` returned 200 with no Content-Security-Policy, X-Frame-Options, X-Content-Type-Options, Referrer-Policy, or Permissions-Policy. No `public/_headers` exists. The API GET also lacked those headers.
- **Impact:** The homepage has no explicit framing protection and no CSP containment if an injection or script compromise occurs. No exploitable injection was found; missing CSP alone does not demonstrate XSS. For this account-free portfolio, direct clickjacking impact is limited.
- **Suggestion:** Add static-asset headers through `public/_headers`; set suitable headers independently on Worker responses. Begin a CSP rollout in report-only mode, then enforce after checking contact submission, deep links, animations, fonts, and GitHub activity. Include `frame-ancestors 'none'`, `object-src 'none'`, `base-uri 'self'`, nosniff, an explicit referrer policy, and limited browser permissions. Allow the actual Turnstile script/frame endpoints, Formspree, GitHub, and Google Fonts as needed. Account for existing inline animation styles without enabling unsafe script execution.
- **Uncertainty:** Live checks cover apex homepage and one API response only; www, workers.dev, deep links, and all media responses need follow-up validation.
- **Reference:** [Cloudflare static asset headers](https://developers.cloudflare.com/workers/static-assets/headers/) explains that `_headers` rules do not apply to Worker-generated responses.

### 3. Locked development/build dependencies have known advisories

- **Rule:** REACT-SUPPLY-001.
- **Location:** `package-lock.json:2351,2593,2656,2714,2859`; independent CI Wrangler pin at `.github/workflows/ci.yml:47`.
- **Evidence:** Fresh `npm audit --json --package-lock-only` reports five high-severity package entries: miniflare, sharp, source-map-js, undici, wrangler; no critical entries. Locked versions include Wrangler 4.135.0, Miniflare 5.20260918.0-alpha, sharp 0.35.4, source-map-js 1.2.1, and undici 7.29.0. Wrangler/Miniflare inherit transitive findings, so these are not five independent flaws. All entries report fixes available.
- **Impact:** Advisory-specific malicious source maps, SVG processing, or affected HTTP/WebSocket paths could harm developer or CI processes if reachable. These packages are build/local tooling; their presence does not prove exploitable code in the deployed Worker or React bundle. Application priority is Medium, with upstream High labels retained explicitly.
- **Suggestion:** Refresh dependencies in a reviewed change, update the CI Wrangler pin alongside the lockfile, rerun audit/build, and check local Worker development. Add dependency update automation and an advisory check; current CI runs `npm ci` and build without an audit step (`.github/workflows/ci.yml:34-38`). Avoid a blind forced audit fix.
- **Uncertainty:** Advisory-specific exploit reachability was not established. Raw audit evidence is temporary at `/tmp/dreu-security-audit-20261019.json`.
- **Advisories:** [sharp/librsvg](https://github.com/advisories/GHSA-wq5f-xc86-pv6w), [source-map-js](https://github.com/advisories/GHSA-68fv-2mgg-jv7q), [undici TLS validation](https://github.com/advisories/GHSA-w293-vg96-wgc3). The raw response contains the other undici advisories.

## Low findings and verification items

### 4. Contact session and field limits are browser conveniences

- **Rule:** Client validation is not a server security boundary.
- **Location:** `src/App.tsx:138-186`; `src/components/Turnstile.tsx:22-42,63-78`; `README.md:23-41`.
- **Evidence:** The form validates name/email/10–150 message words in JavaScript, stores its one-per-session flag in sessionStorage, and sends a Turnstile token to Formspree. The owner confirms Formspree verification is enabled. Failed submissions refresh the challenge and the POST has a 20-second timeout.
- **Impact:** Direct callers can bypass local field/session limits. CAPTCHA verification reduces automated abuse but does not guarantee one message per person or enforce the word limit. Residual spam can consume the form allowance.
- **Suggestion:** Retain the UI controls, confirm provider spam/quota settings, and verify a normal submission succeeds while missing, invalid, expired, and reused tokens fail, preferably with a separate test form. If exact length or submission quotas become business requirements, enforce them in the receiving service. Do not add a backend merely to enforce a cosmetic word limit.
- **Uncertainty:** Provider dashboard and rejection behavior were not inspected; enabled verification is owner-confirmed. No form POSTs were sent during this audit. The public site key and Formspree form identifier are intentionally public.
- **Reference:** [Turnstile server validation](https://developers.cloudflare.com/turnstile/get-started/server-side-validation/) requires receiving-service validation and describes expiring, single-use tokens.

### 5. Deployment actions use mutable version tags

- **Rule:** Supply-chain defense in depth.
- **Location:** `.github/workflows/ci.yml:25,28,43-53`.
- **Evidence:** Actions use `@v4` tags; the deploy step receives Cloudflare and GitHub credentials. Repository permissions are read-only, installs use `npm ci`, and pull requests cannot run the production deployment step.
- **Impact:** A compromised referenced action release could execute with job privileges; deploy-step compromise could access deployment secrets. No compromise or attacker ability to modify these tags was established.
- **Suggestion:** Pin actions to reviewed full commit SHAs with automated update PRs. Confirm narrowly scoped Cloudflare/GitHub credentials, protected main changes, and production-environment controls in the provider dashboards. These controls were not verified and are recommendations, not confirmed missing protections.

## Positive observations

- GitHub authorization stays in the Worker/dev middleware; `.env.local` is ignored and untracked. A value-only comparison found no occurrence of the local token in the one existing generated JS file. No secret values were printed. This is not a full historical or deployed-bundle secret scan.
- React renders dynamic content as text/attributes; no raw HTML injection, eval, cross-window message handling, user upload, SQL/database path, or browser authentication session was found in application source.
- Worker GitHub requests use a fixed host/query with variables and a bounded year; production errors return a generic message (`src/worker/index.ts:125-169`).
- R2 keys are allowlisted; video requests allow GET/HEAD and validate byte ranges (`src/worker/index.ts:58-101`). There is no caller-controlled arbitrary R2 key.
- New-tab links use noreferrer. Storage contains a theme and submission flag rather than an authentication token.

## Validation, limits, and suggested order

Completed: source/configuration review; live homepage/API GETs; current lockfile advisory query; isolated mocked Worker behavior test; local-token comparison against existing build output. No application changes were made, so a build was not rerun. Existing unrelated work and the old report were preserved.

Suggested order: protect the GitHub endpoint; refresh vulnerable tooling; add and validate headers; verify provider rejection cases and deployment credential scope/action pins. No production load tests, form submissions, account modifications, deployment, commits, or dependency updates were performed. Provider settings, token scopes, branch protections, historical secrets, R2 bucket policies, and deployed-source parity remain unverified. See `dreu-portfolio-threat-model.md` for boundaries and abuse paths.
