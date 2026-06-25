# MoveBeta Release Handoff Packet

Generated: 2026-06-25T08:00:58.940Z

## Build

- Product: MoveBeta 1.0.0
- Repository: https://github.com/aantenore/movebeta-mobile.git
- Branch: main
- Base commit at generation: 435c4061a855dd6ebe4f2164fe7f9e05e6feaa74
- Worktree dirty at generation: no

## Summary

- Release gate: pass
- Launch readiness: blocked (1/3 tracks ready)
- MoveNet readiness: ready; load 10ms; average inference 314ms
- Model verification suite: technical-ready
- Screenshots: 12/12
- Blockers: 5
- Next action: Create docs/validation/cue-validation-dataset.json from real consented coach reviews and run the validation gate.

## External Blockers

- Real cue-validation dataset (product, store): Create docs/validation/cue-validation-dataset.json from real consented coach reviews and run the validation gate.
- Store submission credentials (release, store): Set Expo, App Store Connect, and Google Play submission credentials outside the repository.
- EAS project binding (release, store): Run npx eas-cli@latest init and store extra.eas.projectId in app.json.
- iOS build verification (engineering, store): Install full Xcode and verify an iOS simulator or device build.
- Native device QA evidence (qa, internal, store): Capture docs/sdlc/native-qa-evidence.json from physical iOS and Android runs.

## Verification Commands

- Full local release gate: `npm run release:full`
- Exported web smoke report: `npm run web:smoke:report`
- Store screenshot capture: `MOVEBETA_SMOKE_URL=http://127.0.0.1:8083 npm run store:screenshots`
- Model verification suite: `npm run model:verification:suite`
- MoveNet static assets doctor: `npm run model:movenet:assets:check`
- Model asset provenance doctor: `npm run model:assets:provenance`
- Model delivery lifecycle report: `npm run model:delivery:lifecycle`
- Native QA evidence starter: `npm run native:qa:starter`
- Physical-device QA validator: `npm run native:qa:validate`
- Cue-validation starter kit: `npm run validation:cue:starter`
- Coach cue-validation gate: `npm run validation:cue`
- Store credentials starter: `npm run release:credentials:starter`
- GitHub workflow doctor: `npm run release:github:doctor`
- Dependency license report: `npm run security:licenses`
- License review packet: `npm run release:license-review`
- Feature completion doctor: `npm run feature:doctor`
- Release blocker issue report: `npm run release:blocker-issues`
- Release blocker issue filing plan: `npm run release:blocker-issues:file`
- Release blocker issue web links: `npm run release:blocker-issues:links`
- External evidence intake: `npm run release:evidence:intake`
- External evidence validation: `npm run release:evidence:validate`
- External evidence promotion candidate: `npm run release:evidence:promote`
- External evidence apply guard: `npm run release:evidence:apply`
- Release evidence freshness doctor: `npm run release:freshness:doctor`
- Acquisition readiness packet: `npm run release:acquisition`
- Data-room index: `npm run release:data-room`
- PWA static readiness doctor: `npm run export:web && npm run web:pwa:check`
- Vercel deployment readiness doctor: `npm run web:vercel:check`
- Vercel workflow readiness doctor: `npm run web:vercel:workflow`
- Vercel deployment handoff: `npm run web:vercel:handoff`
- Vercel prebuilt production deploy: `npx vercel build --prod --token=$VERCEL_TOKEN && npx vercel deploy --prebuilt --prod --token=$VERCEL_TOKEN`
- Strict EAS store gate: `npm run release:eas:strict`

## Artifacts

- [x] Release readiness report: `docs/sdlc/release-readiness-report.md`
- [x] Release gate report: `docs/sdlc/release-gate-report.json`
- [x] Launch readiness report: `docs/sdlc/launch-readiness-report.json`
- [x] Feature completion report: `docs/sdlc/feature-completion-report.json`
- [x] Cue validation starter kit report: `docs/sdlc/cue-validation-starter-kit-report.json`
- [x] Cue validation review worksheet CSV: `docs/validation/cue-validation-review-worksheet.csv`
- [x] Release blocker issues report: `docs/sdlc/release-blocker-issues-report.json`
- [x] Release blocker issue filing plan: `docs/sdlc/release-blocker-issue-filing-plan.json`
- [x] Release blocker issue web links: `docs/sdlc/release-blocker-issue-web-links.json`
- [x] External evidence intake report: `docs/sdlc/external-evidence-intake-report.json`
- [x] External evidence intake template: `docs/sdlc/external-evidence-intake.template.json`
- [x] External evidence validation report: `docs/sdlc/external-evidence-validation-report.json`
- [x] External evidence promotion report: `docs/sdlc/external-evidence-promotion-report.json`
- [x] External evidence apply report: `docs/sdlc/external-evidence-apply-report.json`
- [x] MoveNet readiness report: `docs/sdlc/movenet-readiness-report.json`
- [x] MoveNet static assets report: `docs/sdlc/movenet-static-assets-report.json`
- [x] Model asset provenance report: `docs/sdlc/model-asset-provenance-report.json`
- [x] Model delivery lifecycle report: `docs/sdlc/model-delivery-lifecycle-report.json`
- [x] Model asset attribution notice: `docs/sdlc/model-asset-attribution.md`
- [x] Model analysis replay report: `docs/sdlc/model-analysis-replay-report.json`
- [x] Model verification suite report: `docs/sdlc/model-verification-suite-report.json`
- [x] Native QA runbook: `docs/sdlc/native-qa-runbook.json`
- [x] Native QA evidence starter report: `docs/sdlc/native-qa-evidence-starter-report.json`
- [x] Native QA evidence input template: `docs/sdlc/native-qa-evidence-input.template.json`
- [x] GitHub workflow report: `docs/sdlc/github-workflow-report.json`
- [x] Dependency license report: `docs/sdlc/dependency-license-report.json`
- [x] License review packet: `docs/sdlc/license-review-packet.json`
- [x] Third-party notices: `docs/legal/THIRD_PARTY_NOTICES.md`
- [x] Release evidence freshness report: `docs/sdlc/release-freshness-report.json`
- [x] Acquisition readiness packet: `docs/sdlc/acquisition-readiness-packet.json`
- [x] Data-room index: `docs/sdlc/data-room-index.json`
- [x] PWA readiness report: `docs/sdlc/pwa-readiness-report.json`
- [x] Web smoke report: `docs/sdlc/web-smoke-report.json`
- [x] Vercel deployment report: `docs/sdlc/vercel-deployment-report.json`
- [x] Vercel workflow report: `docs/sdlc/vercel-workflow-report.json`
- [x] Vercel deployment handoff: `docs/sdlc/vercel-deployment-handoff.json`
- [x] Store credentials setup packet: `docs/sdlc/store-credentials-setup-packet.json`
- [x] Store credentials env template: `docs/sdlc/store-credentials.env.template`
- [x] EAS project binding template: `docs/sdlc/eas-project-binding.template.json`
- [x] Store manifest: `docs/store/store-manifest.json`
- [x] Screenshot gallery: `docs/screenshots.md`
- [x] Release unblock screenshot: `docs/store/screenshots/07-release-unblock.png`
- [x] Release critical path screenshot: `docs/store/screenshots/09-release-critical-path.png`
- [x] Release evidence scenarios screenshot: `docs/store/screenshots/10-release-evidence-scenarios.png`
- [x] Release evidence freshness screenshot: `docs/store/screenshots/11-release-freshness.png`
- [x] Model delivery lifecycle screenshot: `docs/store/screenshots/12-model-delivery.png`
- [x] Source archive: `../movebeta-mobile-source.zip`
- [x] Web dist archive: `../movebeta-mobile-web-dist.zip`
- [x] Release archives manifest: `../movebeta-mobile-release-archives.json`
- [x] Release archives summary: `../movebeta-mobile-release-archives.md`

## Screenshots

- [x] On-device video analysis and capture setup: `docs/store/screenshots/01-analyze.png`
- [x] Evidence-based drills: `docs/store/screenshots/02-drills.png`
- [x] Technique progress trends: `docs/store/screenshots/03-progress.png`
- [x] Local report history: `docs/store/screenshots/04-sessions.png`
- [x] Freemium plan catalog: `docs/store/screenshots/05-plan.png`
- [x] Privacy and offline readiness: `docs/store/screenshots/06-privacy.png`
- [x] Release unblock checklist: `docs/store/screenshots/07-release-unblock.png`
- [x] Release critical path: `docs/store/screenshots/09-release-critical-path.png`
- [x] Release evidence scenarios: `docs/store/screenshots/10-release-evidence-scenarios.png`
- [x] Release evidence freshness: `docs/store/screenshots/11-release-freshness.png`
- [x] Model delivery lifecycle: `docs/store/screenshots/12-model-delivery.png`
- [x] Local backup restore preview: `docs/store/screenshots/08-data-portability.png`
