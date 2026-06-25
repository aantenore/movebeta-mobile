# Release Blocker Progress

Generated: 2026-06-25T15:43:16.338Z

- Status: needs-external-evidence
- Blockers: 5
- Needs proof: 3
- Dependency blocked: 2
- Proof ready: 0
- Accepted proofs: 0
- Missing proofs: 8
- Commands: 15
- Next action: engineering: Install full Xcode and verify an iOS simulator or device build.
- Credential values included: no
- Local paths included: no
- Raw artifacts included: no
- Raw video included: no
- Token-like values included: no

## Blockers

| Blocker | Status | Owner | Lane | Missing proofs | Current command | Blocked by |
| --- | --- | --- | --- | ---: | --- | --- |
| Native device QA evidence | blocked-by-dependency | qa | native-build-qa | 1 | `npm run native:qa:runbook` | iosBuild |
| iOS build verification | needs-proof | engineering | native-build-qa | 2 | `npm run toolchain:ios` | - |
| Real cue-validation dataset | needs-proof | product | real-world-validation | 2 | `npm run validation:cue:starter` | - |
| EAS project binding | needs-proof | release | store-accounts | 1 | `npx eas-cli@latest init` | - |
| Store submission credentials | blocked-by-dependency | release | store-accounts | 2 | `npm run release:credentials:starter` | easProject |

## Proof References

| Blocker | Status | Expected proof | Accepted references |
| --- | --- | --- | --- |
| Native device QA evidence | missing | `docs/sdlc/native-qa-evidence.json` | `relative-path`, `report-id`, `issue-url` |
| iOS build verification | missing | `docs/sdlc/ios-toolchain-report.json` | `relative-path`, `issue-url`, `ci-run-url` |
| iOS build verification | missing | `iOS simulator or device build log` | `relative-path`, `issue-url`, `ci-run-url` |
| Real cue-validation dataset | missing | `docs/validation/cue-validation-dataset.json` | `relative-path`, `report-id`, `issue-url` |
| Real cue-validation dataset | missing | `docs/sdlc/cue-validation-dataset-report.json` | `relative-path`, `report-id`, `issue-url` |
| EAS project binding | missing | `app.json extra.eas.projectId` | `report-id`, `issue-url`, `ci-run-url`, `store-console-state` |
| Store submission credentials | missing | `CI/EAS secret configuration` | `report-id`, `issue-url`, `ci-run-url`, `store-console-state` |
| Store submission credentials | missing | `Strict EAS validation output` | `report-id`, `issue-url`, `ci-run-url`, `store-console-state` |
