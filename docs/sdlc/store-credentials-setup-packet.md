# Store Credentials Setup Packet

Generated: 2026-06-23T22:12:49.768Z

- Status: blocked
- Present groups: 0/4
- Missing groups: 4
- Next action: Run npx eas-cli@latest init on the target Expo account, then store extra.eas.projectId in app config.
- Credential values included: no
- Secrets included: no
- Local paths included: no

| Group | Status | Storage | Required key names |
| --- | --- | --- | --- |
| EAS project binding | missing | app-config | `extra.eas.projectId` |
| EAS auth token | missing | ci-or-local-env | `EXPO_TOKEN` |
| iOS submit credentials | missing | ci-or-local-env | `MOVEBETA_ASC_APP_ID`, `MOVEBETA_APPLE_ID`, `ASC_API_KEY_ID`, `ASC_API_ISSUER_ID`, `ASC_API_KEY_P8_BASE64` |
| Android submit credentials | missing | ci-or-local-env | `GOOGLE_SERVICE_ACCOUNT_JSON`, `GOOGLE_SERVICE_ACCOUNT_KEY_PATH`, `MOVEBETA_GOOGLE_SERVICE_ACCOUNT_JSON_BASE64` |

| Command | Owner | Run |
| --- | --- | --- |
| Bind Expo project | release | `npx eas-cli@latest init` |
| Refresh credential doctor | release | `npm run release:credentials:doctor` |
| Run strict EAS gate | release | `npm run release:eas:strict` |
| Refresh release gate | engineering | `npm run release:check` |
