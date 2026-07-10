# Store Release Account Runbook

Generated: 2026-07-10T08:48:15.852Z

- Status: blocked
- Current phase: eas-project-binding
- Current command: `npx eas-cli@latest init`
- Ready phases: 1/8
- Verified phases: 0
- Blocked phases: 7
- Next action: Run EAS init on the target Expo account, then commit only the app-config binding location.
- Credential values included: no
- Project id values included: no
- Local paths included: no
- Token-like values included: no

## Phases

| Phase | Status | Owner | Command key | Action |
| --- | --- | --- | --- | --- |
| Store metadata readiness | ready | product | `store-submission-packet` | Regenerate and review the store submission packet. |
| EAS project binding | blocked | release | `eas-init` | Run EAS init on the target Expo account, then commit only the app-config binding location. |
| Expo automation token | blocked | release | `credentials-starter` | Set EXPO_TOKEN in CI or the local release shell. |
| iOS submit account | blocked | release | `credentials-starter` | Set the App Store Connect app id plus Apple ID or API key environment names outside the repository. |
| Android submit account | blocked | release | `credentials-starter` | Set one Google Play service-account credential key in CI or the local release shell. |
| Native QA evidence | blocked | qa | `native-qa-validate` | Fill native QA evidence with real Android and iOS physical-device runs, then validate it. |
| Strict EAS gate | blocked | release | `strict-eas-gate` | Clear metadata, EAS binding, Expo token, and store account prerequisites before running strict EAS. |
| Store submit | blocked | release | `submit-ios` | Submit only after metadata, native QA evidence, and strict EAS are verified. |

## Commands

| Command | Owner | Value | Purpose |
| --- | --- | --- | --- |
| Refresh store metadata packet | product | `npm run store:submission` | Verify listing metadata, screenshots, privacy declarations, and copy-risk checks before account work. |
| Bind Expo project | release | `npx eas-cli@latest init` | Create the EAS project binding on the target Expo account and store only the generated key name location in app config. |
| Prepare credential templates | release | `npm run release:credentials:starter` | Generate the key-name setup packet, empty environment template, and EAS binding template without secret values. |
| Check credential keys | release | `npm run release:credentials:doctor` | Verify Expo, App Store Connect, and Google Play key names without printing values. |
| Validate native QA evidence | qa | `npm run native:qa:validate` | Verify Android and iOS physical-device evidence before store submission. |
| Run strict EAS gate | release | `npm run release:eas:strict` | Block TestFlight, Play internal testing, and production submission until account-bound prerequisites are ready. |
| Submit iOS build | release | `npx eas-cli@latest submit --platform ios --profile production` | Submit the production iOS build after strict EAS and native QA evidence pass. |
| Submit Android build | release | `npx eas-cli@latest submit --platform android --profile production` | Submit the production Android build after strict EAS and native QA evidence pass. |
