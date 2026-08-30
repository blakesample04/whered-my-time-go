# Where'd my time go?

A goal-first time-coach app: instead of just tracking screen time, it turns time you take back into
visible progress on things you actually want to do. Onboarding sets a goal and a daily target; Home,
Focus, Progress, and Report track usage, run focus sessions, and show what's been reclaimed over time.

Live at: (add your Netlify URL here once you know it)

## Stack

- [Vite](https://vite.dev) + [React 19](https://react.dev), client-side only — all app data lives in the
  browser's `localStorage` (see `src/state/`), nothing is sent to a server except billing.
- Installable as a PWA via [`vite-plugin-pwa`](https://vite-pwa-org.netlify.app/) (manifest + service
  worker, offline-capable, home-screen installable).
- Deployed to [Netlify](https://netlify.com) via GitHub auto-deploy — push to `main`, live in ~1-2
  minutes, no manual redeploy needed.
- Premium billing (`netlify/functions/`) is real Stripe subscription billing, using
  [Netlify Functions](https://docs.netlify.com/functions/overview/) + [Netlify Blobs](https://docs.netlify.com/blobs/overview/)
  as the only server-side pieces — see the comments in `netlify/functions/*.js` and `src/lib/billing.js`
  for how the email-based unlock flow works.

## Local development

```bash
npm install
npm run dev
```

`npm run dev` runs the front-end only (no billing functions — Vite alone can't run Netlify Functions).
To test the full billing flow locally you need the [Netlify CLI](https://docs.netlify.com/cli/get-started/):

```bash
npm install -g netlify-cli
netlify dev
```

and a `.env` file (copy `.env.example`) with test-mode Stripe keys. See the Premium section of Settings
for the manual Stripe/Netlify setup checklist.

## Icons

All app icons are generated from the single master `icon-source.svg` — don't hand-edit the PNGs in
`public/`, regenerate them instead:

```bash
npm run generate-icons
```

## Scripts

- `npm run dev` — local dev server
- `npm run build` — production build to `dist/`
- `npm run preview` — preview a production build locally
- `npm run lint` — Oxlint
- `npm run generate-icons` — regenerate all icon PNGs from `icon-source.svg`
