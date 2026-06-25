# Vercel Deployment Readiness Report

Generated: 2026-06-25T08:00:07.753Z

- Status: static-ready
- Deployment mode: static-prebuilt
- Checks: 4/6
- Action needed: 2
- Blocked checks: 0
- Project binding: missing
- Backend required: no
- Credential values included: no
- Project id values included: no
- Next action: Connect the Vercel project and deployment secrets, then run the prebuilt deploy commands and post-deploy smoke.

| Check | Status | Detail | Action |
| --- | --- | --- | --- |
| Vercel static config | verified | vercel.json uses npm run export:web, outputDirectory dist, static headers, and SPA fallback. | Keep vercel.json static-first with outputDirectory dist. |
| PWA readiness evidence | verified | PWA readiness report is ready, including manifest, service worker, static assets, and no-backend checks. | Run npm run export:web && npm run web:pwa:check before deployment. |
| No backend surface | verified | No Vercel API routes, functions directory, or backend surface is present. | Do not add api, pages/api, or functions until a paid backend path is explicitly selected. |
| Deployment env template | verified | Vercel deployment key names are documented in .env.example with empty template values. | Keep VERCEL_TOKEN, VERCEL_ORG_ID, and VERCEL_PROJECT_ID documented with empty template values. |
| Vercel project binding | action-needed | .vercel/project.json is not present; deployment can still be configured from Vercel Git integration or CI secrets. | Run vercel link or vercel pull on the target Vercel account when ready to deploy. |
| Deployment secret availability | action-needed | Current shell is missing deployment values for VERCEL_TOKEN, VERCEL_ORG_ID, VERCEL_PROJECT_ID. | Set Vercel credential values only in local shell, CI secrets, or Vercel project settings. |

| Command | Value | Purpose |
| --- | --- | --- |
| Export web PWA | `npm run export:web` | Build the static web output into dist. |
| Validate PWA output | `npm run web:pwa:check` | Verify manifest, service worker, static assets, and no-backend path. |
| Pull Vercel project settings | `npx vercel pull --yes --environment=production --token=$VERCEL_TOKEN` | Bind local configuration to the selected Vercel project without committing secret values. |
| Build prebuilt Vercel artifact | `npx vercel build --prod --token=$VERCEL_TOKEN` | Build Vercel output from the static project configuration. |
| Deploy prebuilt production artifact | `npx vercel deploy --prebuilt --prod --token=$VERCEL_TOKEN` | Deploy the prebuilt static PWA to production. |
| Smoke deployed PWA | `MOVEBETA_SMOKE_URL=<deployment-url> python3 scripts/smoke_web_video.py` | Verify the deployed URL renders the installable PWA and app workflows. |
