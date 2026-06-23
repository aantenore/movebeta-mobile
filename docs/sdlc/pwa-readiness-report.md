# PWA Readiness Report

Generated: 2026-06-23T08:20:27.690Z

- Status: ready
- Checks: 10/10
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
| Exported static model cache assets | verified | Exported dist includes the static MoveNet manifest and every listed model file, and the service worker cache path covers them. |
| Exported offline app cache assets | verified | Exported service worker pre-caches Expo JS bundles, router assets, and metadata needed for offline app boot. |
| Content-addressed service worker cache | verified | Exported service worker cache version matches the app, model, metadata, and shell asset content hash. |
| Vercel static deployment config | verified | vercel.json deploys the Expo web export from dist with static headers and SPA fallback. |
| No backend surface required | verified | Repository does not include Vercel API routes or a backend directory for the PWA path. |
