# Release Blocker Issues Report

Generated: 2026-06-23T08:06:04.601Z

- Status: ready-to-file
- Issue drafts: 5
- Owners: 4
- Commands: 7
- Proof artifacts: 6
- Credential key names: 4
- Issue template: `.github/ISSUE_TEMPLATE/release_blocker.md`
- Next action: File one issue per external blocker, attach the required proof, then rerun release readiness checks.
- Credential values included: no
- Local paths included: no
- Raw artifacts included: no
- Raw video included: no

| Issue | Owner | Tracks | Labels | Commands | Proof |
| --- | --- | --- | --- | --- | --- |
| [Release Blocker] Native device QA evidence | qa | internal, store | `release-blocker`, `owner:qa`, `track:internal`, `track:store`, `check:nativeDeviceQa` | `npm run native:qa:runbook`<br>`npm run native:qa:validate` | `docs/sdlc/native-qa-evidence.json` |
| [Release Blocker] iOS build verification | engineering | store | `release-blocker`, `owner:engineering`, `track:store`, `check:iosBuild` | `npx expo run:ios --device`<br>`xcodebuild -workspace ios/MoveBeta.xcworkspace -scheme MoveBeta -configuration Debug -sdk iphonesimulator` | `iOS simulator or device build log` |
| [Release Blocker] Real cue-validation dataset | product | store | `release-blocker`, `owner:product`, `track:store`, `check:cueValidationDataset` | `npm run validation:cue` | `docs/validation/cue-validation-dataset.json` |
| [Release Blocker] EAS project binding | release | store | `release-blocker`, `owner:release`, `track:store`, `check:easProject` | `npx eas-cli@latest init` | `app.json extra.eas.projectId` |
| [Release Blocker] Store submission credentials | release | store | `release-blocker`, `owner:release`, `track:store`, `check:easCredentials` | `npm run release:eas:strict` | `CI/EAS secret configuration`<br>`Strict EAS validation output` |
