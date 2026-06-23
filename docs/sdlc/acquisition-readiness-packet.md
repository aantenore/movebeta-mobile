# Acquisition Readiness Packet

Generated: 2026-06-23T21:51:37.532Z

## Summary

- Status: needs-external-clearance
- Signals ready: 5/9
- Review signals: 3
- Blocked signals: 0
- External blockers: 10
- Due diligence artifacts ready: 18/18
- Next action: Create docs/validation/cue-validation-dataset.json from real consented coach reviews and run the validation gate.

## Privacy

- Credential values included: no
- Local paths included: no
- Payment data included: no
- Raw artifacts included: no
- Raw video included: no
- Token-like values included: no

## Signals

| Signal | Status | Owner | Detail | Next action |
| --- | --- | --- | --- | --- |
| Product scope | ready | product | Tracked delivery scope has no internal gaps and 182/182 traceability rows covered. | Keep feature-completion evidence fresh before buyer review. |
| Release gate | ready | engineering | The automated release gate is passing. | Regenerate the gate after any source or evidence change. |
| Launch clearance | external-required | release | 1/3 launch track(s) ready with 10 external blocker reference(s) still tracked. | Create docs/validation/cue-validation-dataset.json from real consented coach reviews and run the validation gate. |
| Model provenance | review | release | Model provenance is review; delivery lifecycle is ready. | Complete commercial review for upstream model terms before final buyer reliance. |
| Commercial path | review | founder | Commercial path is review; billing provider Not connected; paid plan mapping 0/2. | Choose a billing adapter and map paid plan keys when subscriptions enter scope. |
| Distribution | ready | release | Store metadata is metadata-ready; PWA readiness is ready; web smoke is pass; Vercel static readiness is static-ready; Vercel handoff is handoff-ready. | Use the static PWA path for buyer demo and keep native store blockers tracked separately. |
| Handoff evidence | ready | release | Handoff packet includes 12/12 expected screenshot(s). | Regenerate handoff after the final commit is pushed. |
| Supply review | review | release | Dependency license report is review; model license/provenance review is review; license review packet is review. | Review notice, attribution, or file-level obligations before commercial distribution. |
| Privacy boundary | ready | engineering | The packet contains negative privacy flags and rejects credential values, local paths, media references, and token-like values before sharing. | Keep buyer-facing artifacts packet-only and do not attach private media or account values. |

## Artifacts

| Artifact | Status | Path |
| --- | --- | --- |
| Release gate report | ready | `docs/sdlc/release-gate-report.json` |
| Launch readiness report | ready | `docs/sdlc/launch-readiness-report.json` |
| Feature completion report | ready | `docs/sdlc/feature-completion-report.json` |
| Release handoff packet | ready | `docs/sdlc/release-handoff-packet.json` |
| Store submission packet | ready | `docs/store/store-submission-packet.json` |
| Acquisition readiness packet | ready | `docs/sdlc/acquisition-readiness-packet.json` |
| Dependency license report | ready | `docs/sdlc/dependency-license-report.json` |
| License review packet | ready | `docs/sdlc/license-review-packet.json` |
| Third-party notices | ready | `docs/legal/THIRD_PARTY_NOTICES.md` |
| Model asset provenance report | ready | `docs/sdlc/model-asset-provenance-report.json` |
| Model delivery lifecycle report | ready | `docs/sdlc/model-delivery-lifecycle-report.json` |
| PWA readiness report | ready | `docs/sdlc/pwa-readiness-report.json` |
| Web smoke report | ready | `docs/sdlc/web-smoke-report.json` |
| Vercel deployment report | ready | `docs/sdlc/vercel-deployment-report.json` |
| Vercel deployment handoff | ready | `docs/sdlc/vercel-deployment-handoff.json` |
| Screenshot gallery | ready | `docs/screenshots.md` |
| Source archive | ready | `../movebeta-mobile-source.zip` |
| Web dist archive | ready | `../movebeta-mobile-web-dist.zip` |

## Commands

| Command | Owner | Value | Purpose |
| --- | --- | --- | --- |
| Release gate | engineering | `npm run release:check` | Refresh automated quality, model, web, security, and evidence gates before buyer review. |
| Launch readiness | release | `npm run release:readiness` | Refresh launch blocker status and next actions from the latest external evidence. |
| Acquisition readiness | founder | `npm run release:acquisition` | Regenerate the buyer-ready due diligence packet after release evidence changes. |
| Pin delivered commit | release | `npm run release:handoff -- --commit-sha <delivered-commit>` | Generate final handoff evidence against the exact pushed commit being transferred. |
| Release archives | release | `npm run release:archives` | Refresh source and web distribution archives with SHA-256 manifest evidence. |
