# Dreu Portfolio

An editable Vite + React portfolio mockup for data, UI design, mobile, and web work.

## Edit your content

Most content is centralized in `src/data/portfolio.ts`. Replace the bracketed
placeholders there without touching the layout components.

- Add your portrait at `public/images/profile.jpg`; it uses `object-fit: cover`.
- Put project assets in `public/projects/` and add their paths to project objects.
- Replace `[GITHUB_USERNAME]` to load public profile and repository data.
- The contribution graph is intentionally a secure-server placeholder: a real graph needs a server-side token, never a browser token.
- Connect Resend, Formspree, or your own API in `src/App.tsx` to make the contact form deliver email.

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
