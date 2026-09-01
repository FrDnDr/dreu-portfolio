# Multidisciplinary Portfolio

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
