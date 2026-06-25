# Vercel Deployment Handoff

Generated: 2026-06-25T08:39:28.447Z

## Summary

- Status: handoff-ready
- Deployment report status: static-ready
- Workflow report status: template-ready
- Phases ready: 2/7
- External actions: 3
- Blocked phases: 0
- Backend required: no
- Credential values included: no
- Project id values included: no
- Next action: Run npx vercel pull --yes --environment=production --token=$VERCEL_TOKEN on the target Vercel account.

## Phases

| Phase | Status | Owner | Next action |
| --- | --- | --- | --- |
| Static release proof | ready-to-run | engineering | Run npm run release:check before deployment. |
| Static Vercel config | verified | release | Keep vercel.json on the static prebuilt PWA contract before deployment. |
| Project binding | external-required | release | Run npx vercel pull --yes --environment=production --token=$VERCEL_TOKEN on the target Vercel account. |
| Deployment secrets | external-required | release | Set VERCEL_TOKEN, VERCEL_ORG_ID, and VERCEL_PROJECT_ID only in local shell, Vercel settings, or GitHub secrets. |
| Workflow template | verified | release | Keep the documented Vercel workflow template aligned with release gate and prebuilt deploy commands. |
| Workflow activation | external-required | release | Add Vercel GitHub secrets and activate .github/workflows/vercel-static-deploy.yml when workflow scope is available. |
| Production smoke | ready-to-run | qa | Run MOVEBETA_SMOKE_URL=<deployment-url> python3 scripts/smoke_web_video.py after production deployment. |

## Commands

| Command | Owner | Value | Purpose |
| --- | --- | --- | --- |
| Local release gate | engineering | `npm run release:check` | Refresh tests, model evidence, PWA output, Vercel readiness, supply review, data-room, and freshness gates before deployment. |
| Pull Vercel settings | release | `npx vercel pull --yes --environment=production --token=$VERCEL_TOKEN` | Bind the working copy to the selected Vercel project using CI/local secrets only. |
| Build prebuilt artifact | release | `npx vercel build --prod --token=$VERCEL_TOKEN` | Build the static PWA with production Vercel settings before deployment. |
| Deploy prebuilt artifact | release | `npx vercel deploy --prebuilt --prod --token=$VERCEL_TOKEN` | Deploy the already-built static PWA artifact to production without remote rebuilding. |
| Post-deploy smoke | qa | `MOVEBETA_SMOKE_URL=<deployment-url> python3 scripts/smoke_web_video.py` | Verify the production URL renders release UI, PWA cache paths, and model-delivery screens. |
| Inspect deployment | release | `npx vercel inspect <deployment-url> --token=$VERCEL_TOKEN` | Capture deployment status and metadata after production deploy. |
| Rollback deployment | release | `npx vercel rollback <deployment-url-or-id> --token=$VERCEL_TOKEN` | Restore a previous production deployment if post-deploy smoke or monitoring fails. |

## Rollback

- Strategy: Use Vercel rollback to restore the previous production deployment if production smoke fails after deploy.
- Command: `npx vercel rollback <deployment-url-or-id> --token=$VERCEL_TOKEN`
