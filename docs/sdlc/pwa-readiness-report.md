# PWA Readiness Report

Generated: 2026-06-22T15:44:14.201Z

- Status: ready
- Checks: 7/7
- Backend required: no
- Credential values included: no
- Local paths included: no
- Raw artifacts included: no
- Raw video included: no
- Next action: Deploy the static dist output to Vercel, then run the web smoke against the deployment URL.

| Check | Status | Detail |
| --- | --- | --- |
| Source web manifest | verified | public/manifest.json exists and is valid JSON. |
| Manifest installability fields | verified | Manifest includes name, short name, start URL, scope, standalone display, and 192/512 icons. |
| Source service worker | verified | public/sw.js registers install/fetch handlers and uses Cache Storage. |
| HTML manifest and service worker registration | verified | Exported dist/index.html links the manifest and registers the service worker. |
| Exported PWA static assets | verified | Expo web export copied manifest, service worker, and PWA icons into dist. |
| Vercel static deployment config | verified | vercel.json deploys the Expo web export from dist with static headers and SPA fallback. |
| No backend surface required | verified | Repository does not include Vercel API routes or a backend directory for the PWA path. |
