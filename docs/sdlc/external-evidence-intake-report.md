# External Evidence Intake Report

Generated: 2026-06-23T12:43:53.579Z

- Status: needs-evidence
- Intake items: 5
- Owners: 4
- Proof references: 8
- Commands: 15
- Next action: Fill the template with share-safe references to real proof artifacts, then rerun release readiness checks.
- Credential values included: no
- Local paths included: no
- Raw artifacts included: no
- Raw video included: no

## Instructions

- Use relative repository paths, issue URLs, CI run URLs, or provider-console state references only.
- Do not paste credential values, private keys, raw video paths, absolute local paths, reviewer identities, or raw local artifacts.
- After proof is collected, run the listed commands and regenerate release readiness, freshness, blocker issues, and handoff reports.

| Blocker | Owner | Tracks | Expected proof | Accepted references | Commands |
| --- | --- | --- | --- | --- | --- |
| Native device QA evidence | qa | internal, store | `docs/sdlc/native-qa-evidence.json` | `relative-path`, `report-id`, `issue-url` | `npm run native:qa:runbook`<br>`npm run native:qa:starter`<br>`npm run native:qa:validate` |
| iOS build verification | engineering | store | `docs/sdlc/ios-toolchain-report.json` | `relative-path`, `issue-url`, `ci-run-url` | `npm run toolchain:ios`<br>`npm run native:ios:pods`<br>`npm run native:ios:doctor`<br>`npx expo run:ios --device`<br>`xcodebuild -workspace ios/MoveBeta.xcworkspace -scheme MoveBeta -configuration Debug -sdk iphonesimulator` |
| iOS build verification | engineering | store | `iOS simulator or device build log` | `relative-path`, `issue-url`, `ci-run-url` | `npm run toolchain:ios`<br>`npm run native:ios:pods`<br>`npm run native:ios:doctor`<br>`npx expo run:ios --device`<br>`xcodebuild -workspace ios/MoveBeta.xcworkspace -scheme MoveBeta -configuration Debug -sdk iphonesimulator` |
| Real cue-validation dataset | product | store | `docs/validation/cue-validation-dataset.json` | `relative-path`, `report-id`, `issue-url` | `npm run validation:cue:starter`<br>`npm run validation:cue`<br>`npm run validation:cue:doctor` |
| Real cue-validation dataset | product | store | `docs/sdlc/cue-validation-dataset-report.json` | `relative-path`, `report-id`, `issue-url` | `npm run validation:cue:starter`<br>`npm run validation:cue`<br>`npm run validation:cue:doctor` |
| EAS project binding | release | store | `app.json extra.eas.projectId` | `report-id`, `issue-url`, `ci-run-url`, `store-console-state` | `npx eas-cli@latest init`<br>`npm run release:credentials:starter` |
| Store submission credentials | release | store | `CI/EAS secret configuration` | `report-id`, `issue-url`, `ci-run-url`, `store-console-state` | `npm run release:credentials:starter`<br>`npm run release:eas:strict` |
| Store submission credentials | release | store | `Strict EAS validation output` | `report-id`, `issue-url`, `ci-run-url`, `store-console-state` | `npm run release:credentials:starter`<br>`npm run release:eas:strict` |
