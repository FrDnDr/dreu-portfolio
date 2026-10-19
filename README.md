# Dreu Portfolio

An editable Vite + React portfolio mockup for data, UI design, mobile, and web work.

## Edit your content

Most content is centralized in `src/data/portfolio.ts`. Replace the bracketed
placeholders there without touching the layout components.

- Add your portrait at `public/images/profile.jpg`; it uses `object-fit: cover`.
- Put project assets in `public/projects/` and add their paths to project objects.
- Replace `[GITHUB_USERNAME]` to load public profile and repository data.
- The contribution graph uses the Worker API and a server-side GitHub token;
  never expose the token in browser configuration.
- Contact delivery uses Formspree with Turnstile; see the provider setup below.

## Run

```bash
npm install
npm run dev
```

## Contact form bot protection

The contact form uses Cloudflare Turnstile and sends `cf-turnstile-response`
to Formspree. The public site key is configured in `src/components/Turnstile.tsx`.
The secret belongs only in Formspree's CAPTCHA settings, never in this repository.

Before enabling enforcement in Formspree:

1. Allow `frdndr.com` and `www.frdndr.com` in the Cloudflare widget settings.
   Allow any workers.dev hostname separately if submissions should work there.
2. Deploy the frontend integration.
3. Select Turnstile in Formspree, enter the matching secret, and enable CAPTCHA.
4. Verify a real submission reaches the inbox and a submission without a token
   is rejected. Check the spam folder as well.

Local development needs an allowed development hostname or a Cloudflare test
site key paired with its test secret in a separate test form. Never use test
keys for production protection. Expired/failed challenges offer a retry; failed
submissions refresh the challenge because tokens are single-use.

## Security controls

- `npm run test:security` tests the Worker with mocked upstream, cache, limiter,
  and storage bindings. `npm audit --audit-level=high` checks dependency advisories.
  Both checks run in CI before deployment; Dependabot proposes weekly npm/action updates.
- GitHub Actions are pinned to commit hashes. Deployment reuses the Wrangler
  version installed from the lockfile by `npm ci`, so there is no separate CI version pin.
- Contributions allow GET/HEAD only; HEAD never calls GitHub. Calendars share a
  canonical cache across public hostnames and ignored query parameters: five minutes
  fresh, with up to 24 hours of stale fallback during upstream errors or throttling.
  Concurrent refreshes in one isolate share a request, and GitHub calls time out after
  eight seconds. Failures/limits are not cached by clients.
- `CONTRIBUTIONS_UPSTREAM_LIMITER` permits six cache-miss refreshes per minute,
  shared across years and hostnames within each Cloudflare location. Cached hits do
  not spend this budget. Cold requests above the limit return 429 and `Retry-After: 60`.
  Cloudflare counters are approximate and regional, not a strict global GitHub-quota
  guarantee. The namespace ID in `wrangler.jsonc` is reserved for this portfolio;
  keep it distinct from unrelated rate-limit bindings in the account.
- `public/_headers` applies framing, MIME-sniffing, referrer, and browser-permission
  policies to static responses. Worker responses receive equivalent headers in code.
  The enforced CSP blocks framing, plugins, and foreign base URLs. The broader
  script/resource allowlist is initially **report-only**, including Turnstile,
  Formspree, GitHub, Google Fonts, and animation styles. No reporting collector is
  configured: inspect browser console/CSP violation events during validation.

After deployment, check apex, www, workers.dev, a project deep link, API errors,
images, and video range responses for the expected headers. In desktop/mobile
browsers, exercise navigation, animation, fonts, GitHub year switching, and Turnstile;
review report-only CSP violations before promoting that policy to enforcement.
Use a separate Formspree test form to verify successful delivery and rejection of
missing, invalid, expired, and reused challenge tokens. This repository cannot
prove the provider's verification settings or token scopes.

In provider dashboards, confirm GitHub credentials have only required read access,
Cloudflare credentials are restricted to the required account/resources, and main
changes/deployments receive appropriate review. These checks require account access;
they are not established by the source configuration.
