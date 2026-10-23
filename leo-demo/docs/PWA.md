# LEO Progressive Web App

LEO can be installed from a supported browser without an app store. This does not change Supabase authentication, classroom permissions or the Cloudflare deployment target.

## What is included

- `vite.config.ts` defines the app name, standalone window, start URL and icons. Vite generates `dist/manifest.webmanifest` and `dist/sw.js` on production builds.
- `public/logo-mark.svg` and `public/logo-wordmark.svg` are local copies of the originals from the public Supabase `images/projectimgs` folder. The square mark is used for install icons and the favicon; the wider wordmark brands the offline page.
- `npm run icons:pwa` regenerates the committed PNGs from the mark. Android's maskable icon has extra padding; iOS uses the 180px Apple touch icon. Builds use the committed icons and do not need to download images.
- `src/sw.ts` caches only built JavaScript/CSS, the public app manifest, local branding and `offline.html`. All page navigations use the network, falling back to the offline page when a request fails. Supabase requests, authentication callback URLs, signed document links and personal data are not stored in service-worker caches.
- `PwaStatus.tsx` shows a connection warning without unmounting the active page. A new service worker waits for the user to select Reload; returning to the app also checks for updates. Save work in all open LEO windows before reloading.

This is an **installable, online-first PWA**, not offline lesson delivery. Lessons, sign-in, uploads, quizzes and submissions still require internet. There is no background submission queue or offline database. Existing Supabase session storage is unchanged.

## Test locally

Run commands inside `leo-demo`:

```sh
npm ci
npx playwright install chromium
npm run test:pwa
```

The PWA suite creates a production build in `.pwa-test-dist` with dummy local Supabase settings, serves it on port 4175, and tests desktop and mobile Chromium. No real accounts or hosted database are used, and the normal `dist` deployment output is not overwritten. It checks install metadata, icon dimensions, offline deep links, reconnection, form preservation, cache isolation and update consent. Existing unit/integration/database E2E suites remain separate.

To manually preview with your real local environment settings (see `.env.example`):

```sh
npm run build
npm run preview -- --host 127.0.0.1 --port 4173
```

Open `http://127.0.0.1:4173`. The service worker is deliberately disabled in `npm run dev` so cached builds do not interfere with development. Localhost is allowed for PWA testing; other devices need an HTTPS deployment, not a plain HTTP LAN address.

## Cloudflare and CI

The existing Wrangler configuration already serves `dist` and supports SPA deep links. No hosting migration or new Cloudflare secrets are needed. `public/_headers` asks browsers to revalidate the worker and manifest rather than keep stale copies.

PWA tests run in the existing checks job, before integration tests and deployment. The deployment job still builds again with the hosted Supabase variables. A feature branch does not deploy to production: open a pull request into `main`, let CI pass, and merge when approved. The existing push-to-main workflow deploys it to Cloudflare.

After deployment:

1. Open the HTTPS site in Chrome/Edge and use the browser's install option. On iPhone/iPad, open Safari, use Share, then Add to Home Screen (enable Open as Web App if offered).
2. Launch the installed app and check login, Google sign-in, password reset links and a lesson. OAuth redirect URLs remain unchanged; test on real devices because browser/install behaviour varies.
3. Visit online once, then disconnect and reopen a deep link. LEO should display the branded offline screen. Reconnect and press Try again.
4. Check DevTools > Application for the manifest, activated service worker and static-only cache contents.
5. On a later deployment, leave a form open and confirm the update prompt does not reload it without consent.

Do not add broad API or storage runtime caching rules without a separate privacy and offline-sync design. Public classroom pictures and private PDFs are intentionally not precached.

References: [Vite PWA custom workers](https://vite-pwa-org.netlify.app/guide/inject-manifest), [Cloudflare static asset headers](https://developers.cloudflare.com/workers/static-assets/headers/).
