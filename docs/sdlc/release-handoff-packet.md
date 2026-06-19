# MoveBeta Release Handoff Packet

Generated: 2026-06-19T21:38:46.979Z

## Build

- Product: MoveBeta 1.0.0
- Repository: https://github.com/aantenore/movebeta-mobile.git
- Branch: main
- Base commit at generation: 1a0b493bf4c786d42affad0440c5d02af9ab4483
- Worktree dirty at generation: no

## Summary

- Release gate: pass
- Launch readiness: blocked (1/3 tracks ready)
- MoveNet readiness: ready; load 3451ms; average inference 327ms
- Screenshots: 8/8
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
- Physical-device QA validator: `npm run native:qa:validate`
- Coach cue-validation gate: `npm run validation:cue`
- Strict EAS store gate: `npm run release:eas:strict`

## Artifacts

- [x] Release readiness report: `docs/sdlc/release-readiness-report.md`
- [x] Release gate report: `docs/sdlc/release-gate-report.json`
- [x] Launch readiness report: `docs/sdlc/launch-readiness-report.json`
- [x] MoveNet readiness report: `docs/sdlc/movenet-readiness-report.json`
- [x] Model analysis replay report: `docs/sdlc/model-analysis-replay-report.json`
- [x] Native QA runbook: `docs/sdlc/native-qa-runbook.json`
- [x] Store manifest: `docs/store/store-manifest.json`
- [x] Screenshot gallery: `docs/screenshots.md`
- [x] Release unblock screenshot: `docs/store/screenshots/07-release-unblock.png`
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
- [x] Checksum-aware local backup restore preview: `docs/store/screenshots/08-data-portability.png`
