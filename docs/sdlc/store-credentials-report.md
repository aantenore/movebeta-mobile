# Store Credentials Report

Generated: 2026-06-25T08:39:10.060Z

- Status: blocked
- Credential values included: no
- Next action: Run npx eas-cli@latest init on the target Expo account and store the generated project id in app config.

| Check | Status | Detail | Action |
| --- | --- | --- | --- |
| EAS project binding | fail | Expo extra.eas.projectId is missing. | Run npx eas-cli@latest init on the target Expo account and store the generated project id in app config. |
| EAS auth token | fail | Required key is missing: EXPO_TOKEN. | Set EXPO_TOKEN in CI or the local release shell before non-interactive EAS builds. |
| iOS submit credentials | fail | Missing MOVEBETA_ASC_APP_ID plus MOVEBETA_APPLE_ID or ASC_API_KEY_ID, ASC_API_ISSUER_ID, ASC_API_KEY_P8_BASE64. | Set MOVEBETA_ASC_APP_ID plus either MOVEBETA_APPLE_ID or ASC_API_KEY_ID, ASC_API_ISSUER_ID, and ASC_API_KEY_P8_BASE64. |
| Android submit credentials | fail | Missing one of GOOGLE_SERVICE_ACCOUNT_JSON, GOOGLE_SERVICE_ACCOUNT_KEY_PATH, MOVEBETA_GOOGLE_SERVICE_ACCOUNT_JSON_BASE64. | Set one Google Play service account credential key in CI or the local release shell. |
