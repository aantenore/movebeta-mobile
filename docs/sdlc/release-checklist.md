# Release Checklist

## Pre-Release

- [x] Scope is locked in `docs/sdlc/delivery-contract.md`.
- [x] `CHANGELOG.md` has user-facing release notes.
- [x] `npm ci` succeeds from the lockfile.
- [x] `npm run release:check` passes.
- [x] `npm run release:eas:check` passes with account-bound store prerequisites reported as warnings.
- [x] `npm run native:android:debug` passes.
- [x] Android merged manifest validation passes with camera/import permissions, no audio permission, and backup disabled.
- [x] Native QA runbook is generated with `npm run native:qa:runbook`.
- [x] `npm run native:ios:pods` passes with local Ruby/CocoaPods.
- [x] Versioning is aligned across `package.json`, `app.json`, and native build numbers.
- [x] Browser smoke passes on desktop and 390px mobile viewport.
- [x] Privacy review confirms raw video is not uploaded by default.
- [x] Android backup is disabled for privacy-sensitive local reports.
- [x] Consent/export/sync gates are reviewed.
- [x] Report deletion/export contracts are verified.
- [x] Cue validation dataset gate and template are ready for consented coach review studies.
- [x] Known P0/P1 risks are closed or explicitly accepted.

## Native Release Additions

- [x] Android dev build compiles with local on-device pose module.
- [ ] iOS dev build runs local analysis after full Xcode is installed.
- [x] Camera permissions and import permissions are reviewed.
- [x] Bundle identifier, Android package, and store metadata are confirmed by `tests/storeReadiness.test.ts` and `docs/store/store-manifest.json`.
- [x] Offline readiness self-check passes in the app surface and web smoke.
- [ ] App works in airplane mode.
- [ ] Native QA evidence file is captured and passes `npm run native:qa:validate`.
- [ ] Cue validation dataset is captured and passes `npm run validation:cue`.
- [ ] EAS project id, `EXPO_TOKEN`, App Store Connect, and Play Console credentials are configured outside the repository.
- [ ] `npm run release:eas:strict` passes before TestFlight, internal Play, or production submission.
- [ ] Thermal and battery behavior are measured within the native QA evidence budget.
- [x] Store screenshots and privacy declarations are consistent with product behavior and generated from the exported app.
- [x] Release source/web archives and SHA-256 manifest are generated with `npm run release:archives`.
- [x] Release handoff packet is generated with `npm run release:handoff`.

## Rollback

- Web preview: revert to previous exported artifact.
- Native app: stop rollout, revert release channel, or submit hotfix build.
- Data: reports are local-only in the current prototype; future sync must include backup and restore procedure.
