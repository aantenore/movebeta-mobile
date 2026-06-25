# Data Room Index

Generated: 2026-06-25T07:53:27.019Z

## Summary

- Status: needs-external-evidence
- Items ready: 17/34
- Review items: 3
- External-required items: 14
- Missing items: 0
- Blocked items: 0
- Next action: Create docs/validation/cue-validation-dataset.json from real consented coach reviews and run the validation gate.

## Privacy

- Credential values included: no
- Local paths included: no
- Payment data included: no
- Raw artifacts included: no
- Raw video included: no
- Token-like values included: no

## Items

| Item | Category | Status | Owner | Sensitivity | Location | Refresh |
| --- | --- | --- | --- | --- | --- | --- |
| Release gate report | release | ready | engineering | share-safe | `docs/sdlc/release-gate-report.json` | `npm run release:check` |
| Launch readiness report | release | external-required | release | share-safe | `docs/sdlc/launch-readiness-report.json` | `npm run release:readiness` |
| Feature completion report | product | external-required | product | share-safe | `docs/sdlc/feature-completion-report.json` | `npm run feature:doctor` |
| Acquisition readiness packet | release | external-required | founder | share-safe | `docs/sdlc/acquisition-readiness-packet.json` | `npm run release:acquisition` |
| Release handoff packet | release | ready | release | share-safe | `docs/sdlc/release-handoff-packet.json` | `npm run release:handoff` |
| Release freshness report | release | ready | release | share-safe | `docs/sdlc/release-freshness-report.json` | `npm run release:freshness:doctor` |
| Release blocker web links | release | ready | release | share-safe | `docs/sdlc/release-blocker-issue-web-links.json` | `npm run release:blocker-issues:links` |
| External evidence intake | release | external-required | release | external-proof-reference | `docs/sdlc/external-evidence-intake-report.json` | `npm run release:evidence:intake` |
| MoveNet readiness report | model | ready | engineering | share-safe | `docs/sdlc/movenet-readiness-report.json` | `npm run model:movenet:readiness` |
| Model verification suite | model | ready | engineering | share-safe | `docs/sdlc/model-verification-suite-report.json` | `npm run model:verification:suite` |
| Model delivery lifecycle | model | ready | engineering | share-safe | `docs/sdlc/model-delivery-lifecycle-report.json` | `npm run model:delivery:lifecycle` |
| Model asset provenance | legal | review | release | share-safe | `docs/sdlc/model-asset-provenance-report.json` | `npm run model:assets:provenance` |
| Dependency license report | legal | review | release | share-safe | `docs/sdlc/dependency-license-report.json` | `npm run security:licenses` |
| License review packet | legal | review | release | share-safe | `docs/sdlc/license-review-packet.json` | `npm run release:license-review` |
| Third-party notices | legal | ready | release | share-safe | `docs/legal/THIRD_PARTY_NOTICES.md` | `npm run release:license-review` |
| Store submission packet | distribution | ready | release | public-store-copy | `docs/store/store-submission-packet.json` | `npm run store:submission` |
| PWA readiness report | distribution | ready | release | share-safe | `docs/sdlc/pwa-readiness-report.json` | `npm run export:web && npm run web:pwa:check` |
| Web smoke report | distribution | ready | qa | share-safe | `docs/sdlc/web-smoke-report.json` | `npm run web:smoke:report` |
| Vercel deployment report | distribution | ready | release | share-safe | `docs/sdlc/vercel-deployment-report.json` | `npm run web:vercel:check` |
| Vercel workflow report | distribution | ready | release | credential-names-only | `docs/sdlc/vercel-workflow-report.json` | `npm run web:vercel:workflow` |
| Vercel deployment handoff | distribution | ready | release | credential-names-only | `docs/sdlc/vercel-deployment-handoff.json` | `npm run web:vercel:handoff` |
| Store credentials setup packet | commercial | external-required | release | credential-names-only | `docs/sdlc/store-credentials-setup-packet.json` | `npm run release:credentials:starter` |
| GitHub workflow report | security | external-required | engineering | credential-names-only | `docs/sdlc/github-workflow-report.json` | `npm run release:github:doctor` |
| iOS toolchain report | native | external-required | engineering | share-safe | `docs/sdlc/ios-toolchain-report.json` | `npm run native:ios:doctor` |
| Native QA evidence starter | native | external-required | qa | external-proof-reference | `docs/sdlc/native-qa-evidence-starter-report.json` | `npm run native:qa:starter` |
| Cue-validation dataset report | validation | external-required | product | external-proof-reference | `docs/sdlc/cue-validation-dataset-report.json` | `npm run validation:cue:doctor` |
| Source archive | archive | ready | release | source-archive | `../movebeta-mobile-source.zip` | `npm run release:archives` |
| Web dist archive | archive | ready | release | share-safe | `../movebeta-mobile-web-dist.zip` | `npm run release:archives` |
| Release archive manifest | archive | ready | release | share-safe | `../movebeta-mobile-release-archives.json` | `npm run release:archives` |
| Real cue-validation dataset proof | validation | external-required | product | external-proof-reference | `docs/validation/cue-validation-dataset.json` | `npm run validation:cue:starter && npm run validation:cue:doctor` |
| Store submission credentials proof | commercial | external-required | release | credential-names-only | `external:eas-and-store-credential-values` | `npm run release:credentials:starter && npm run release:credentials:doctor` |
| EAS project binding proof | commercial | external-required | release | external-proof-reference | `app.json expo.extra.eas.projectId` | `npm run release:eas:check` |
| iOS build verification proof | native | external-required | engineering | external-proof-reference | `external:ios-build-log-or-ci-run` | `npm run native:ios:doctor` |
| Native device QA evidence proof | native | external-required | qa | external-proof-reference | `docs/sdlc/native-qa-evidence.json` | `npm run native:qa:starter && npm run native:qa:validate` |

## Commands

| Command | Owner | Value | Purpose |
| --- | --- | --- | --- |
| Data-room index | release | `npm run release:data-room` | Regenerate this buyer-facing artifact inventory after evidence changes. |
| Acquisition readiness | founder | `npm run release:acquisition` | Refresh buyer due-diligence readiness signals. |
| Release gate | engineering | `npm run release:check` | Refresh automated quality and release evidence. |
| Release archives | release | `npm run release:archives` | Refresh source and web archive checksums before transfer. |
| Release handoff | release | `npm run release:handoff -- --commit-sha <delivered-commit>` | Pin final handoff to the commit being transferred. |
