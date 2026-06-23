# Vercel Workflow Report

Generated: 2026-06-23T22:22:10.064Z

- Status: template-ready
- Checks: 3/5
- Action needed: 2
- Blocked checks: 0
- Template path: docs/sdlc/ci-templates/vercel-static-deploy.yml
- Active workflow path: .github/workflows/vercel-static-deploy.yml
- Credential values included: no
- Secret values included: no
- Next action: Add Vercel GitHub secrets and copy the template to .github/workflows/vercel-static-deploy.yml when workflow scope is available.

| Check | Status | Detail | Action |
| --- | --- | --- | --- |
| Workflow template | verified | Vercel static deployment workflow template exists in docs/sdlc/ci-templates. | Keep docs/sdlc/ci-templates/vercel-static-deploy.yml committed as the activation source. |
| Template deployment contract | verified | Template contains release gate, static export, PWA/Vercel checks, prebuilt deployment, deployed smoke, and artifact upload. | Keep the template on main push plus manual workflow_dispatch, with release gate before deployment. |
| Secret references | verified | Template references VERCEL_TOKEN, VERCEL_ORG_ID, and VERCEL_PROJECT_ID through GitHub secrets. | Reference only GitHub secret names for Vercel deployment credentials. |
| Active workflow file | action-needed | .github/workflows/vercel-static-deploy.yml is not committed; activation is intentionally deferred. | Copy the template to .github/workflows/vercel-static-deploy.yml only after the GitHub token has workflow scope and Vercel secrets exist. |
| Active/template parity | action-needed | Skipped until the active Vercel workflow file is committed. | Keep the active Vercel workflow byte-for-byte aligned with the documented template. |
