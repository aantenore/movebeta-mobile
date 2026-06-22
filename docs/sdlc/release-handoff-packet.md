# MoveBeta Release Handoff Packet

Generated: 2026-06-22T15:34:04.904Z

## Build

- Product: MoveBeta 1.0.0
- Repository: https://github.com/aantenore/movebeta-mobile.git
- Branch: main
- Base commit at generation: a324dfd6f22189fd28a39e731817fa9b3ba89b44
- Worktree dirty at generation: no

## Summary

- Release gate: pass
- Launch readiness: blocked (1/3 tracks ready)
- MoveNet readiness: ready; load 5005ms; average inference 350ms
- Model verification suite: technical-ready
- Screenshots: 11/11
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
- Exported web smoke: `MOVEBETA_SMOKE_URL=http://127.0.0.1:8083 python3 scripts/smoke_web_video.py`
- Store screenshot capture: `MOVEBETA_SMOKE_URL=http://127.0.0.1:8083 npm run store:screenshots`
- Model verification suite: `npm run model:verification:suite`
- Physical-device QA validator: `npm run native:qa:validate`
- Coach cue-validation gate: `npm run validation:cue`
- GitHub workflow doctor: `npm run release:github:doctor`
- Dependency license report: `npm run security:licenses`
- Feature completion doctor: `npm run feature:doctor`
- Release blocker issue report: `npm run release:blocker-issues`
- Release blocker issue filing plan: `npm run release:blocker-issues:file`
- Release blocker issue web links: `npm run release:blocker-issues:links`
- Release evidence freshness doctor: `npm run release:freshness:doctor`
- PWA static readiness doctor: `npm run export:web && npm run web:pwa:check`
- Strict EAS store gate: `npm run release:eas:strict`

## Artifacts

- [x] Release readiness report: `docs/sdlc/release-readiness-report.md`
- [x] Release gate report: `docs/sdlc/release-gate-report.json`
- [x] Launch readiness report: `docs/sdlc/launch-readiness-report.json`
- [x] Feature completion report: `docs/sdlc/feature-completion-report.json`
- [x] Release blocker issues report: `docs/sdlc/release-blocker-issues-report.json`
- [x] Release blocker issue filing plan: `docs/sdlc/release-blocker-issue-filing-plan.json`
- [x] Release blocker issue web links: `docs/sdlc/release-blocker-issue-web-links.json`
- [x] MoveNet readiness report: `docs/sdlc/movenet-readiness-report.json`
- [x] Model analysis replay report: `docs/sdlc/model-analysis-replay-report.json`
- [x] Model verification suite report: `docs/sdlc/model-verification-suite-report.json`
- [x] Native QA runbook: `docs/sdlc/native-qa-runbook.json`
- [x] GitHub workflow report: `docs/sdlc/github-workflow-report.json`
- [x] Dependency license report: `docs/sdlc/dependency-license-report.json`
- [x] Release evidence freshness report: `docs/sdlc/release-freshness-report.json`
- [x] PWA readiness report: `docs/sdlc/pwa-readiness-report.json`
- [x] Store manifest: `docs/store/store-manifest.json`
- [x] Screenshot gallery: `docs/screenshots.md`
- [x] Release unblock screenshot: `docs/store/screenshots/07-release-unblock.png`
- [x] Release critical path screenshot: `docs/store/screenshots/09-release-critical-path.png`
- [x] Release evidence scenarios screenshot: `docs/store/screenshots/10-release-evidence-scenarios.png`
- [x] Release evidence freshness screenshot: `docs/store/screenshots/11-release-freshness.png`
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
- [x] Local backup restore preview: `docs/store/screenshots/08-data-portability.png`
