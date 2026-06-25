# Release Blocker Issues Report

Generated: 2026-06-25T09:21:30.418Z

- Status: ready-to-file
- Issue drafts: 5
- Owners: 4
- Commands: 15
- Proof artifacts: 8
- Credential key names: 4
- Issue template: `.github/ISSUE_TEMPLATE/release_blocker.md`
- Next action: File one issue per external blocker, attach the required proof, then rerun release readiness checks.
- Credential values included: no
- Local paths included: no
- Raw artifacts included: no
- Raw video included: no

| Issue | Owner | Tracks | Labels | Commands | Proof |
| --- | --- | --- | --- | --- | --- |
| [Release Blocker] Native device QA evidence | qa | internal, store | `release-blocker`, `owner:qa`, `track:internal`, `track:store`, `check:nativeDeviceQa` | `npm run native:qa:runbook`<br>`npm run native:qa:starter`<br>`npm run native:qa:validate` | `docs/sdlc/native-qa-evidence.json` |
| [Release Blocker] iOS build verification | engineering | store | `release-blocker`, `owner:engineering`, `track:store`, `check:iosBuild` | `npm run toolchain:ios`<br>`npm run native:ios:pods`<br>`npm run native:ios:doctor`<br>`npx expo run:ios --device`<br>`xcodebuild -workspace ios/MoveBeta.xcworkspace -scheme MoveBeta -configuration Debug -sdk iphonesimulator` | `docs/sdlc/ios-toolchain-report.json`<br>`iOS simulator or device build log` |
| [Release Blocker] Real cue-validation dataset | product | store | `release-blocker`, `owner:product`, `track:store`, `check:cueValidationDataset` | `npm run validation:cue:starter`<br>`npm run validation:cue`<br>`npm run validation:cue:doctor` | `docs/validation/cue-validation-dataset.json`<br>`docs/sdlc/cue-validation-dataset-report.json` |
| [Release Blocker] EAS project binding | release | store | `release-blocker`, `owner:release`, `track:store`, `check:easProject` | `npx eas-cli@latest init`<br>`npm run release:credentials:starter` | `app.json extra.eas.projectId` |
| [Release Blocker] Store submission credentials | release | store | `release-blocker`, `owner:release`, `track:store`, `check:easCredentials` | `npm run release:credentials:starter`<br>`npm run release:eas:strict` | `CI/EAS secret configuration`<br>`Strict EAS validation output` |
