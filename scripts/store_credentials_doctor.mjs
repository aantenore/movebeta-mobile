import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const STORE_CREDENTIALS_REPORT_SCHEMA_VERSION = 'movebeta.store-credentials-report.v1';

export const storeCredentialEnvKeys = {
  androidServiceAccount: ['GOOGLE_SERVICE_ACCOUNT_JSON', 'GOOGLE_SERVICE_ACCOUNT_KEY_PATH', 'MOVEBETA_GOOGLE_SERVICE_ACCOUNT_JSON_BASE64'],
  easToken: ['EXPO_TOKEN'],
  iosAppleId: ['MOVEBETA_APPLE_ID'],
  iosApiKey: ['ASC_API_KEY_ID', 'ASC_API_ISSUER_ID', 'ASC_API_KEY_P8_BASE64'],
  iosAscAppId: ['MOVEBETA_ASC_APP_ID'],
};

function resolveProjectRoot() {
  return path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
}

export function resolveDefaultJsonPath(rootDir = resolveProjectRoot()) {
  return path.join(rootDir, 'docs/sdlc/store-credentials-report.json');
}

export function resolveDefaultMarkdownPath(rootDir = resolveProjectRoot()) {
  return path.join(rootDir, 'docs/sdlc/store-credentials-report.md');
}

function hasText(value) {
  return typeof value === 'string' && value.trim().length > 0;
}

function presentKeys(env, keys) {
  return keys.filter((key) => hasText(env[key]));
}

function missingKeys(env, keys) {
  return keys.filter((key) => !hasText(env[key]));
}

function check(status, id, label, detail, action, keys = []) {
  return { action, detail, id, keys, label, status };
}

function getProjectId(appConfig) {
  return appConfig?.extra?.eas?.projectId;
}

function iosCredentialMode(env) {
  const ascAppIdReady = hasText(env.MOVEBETA_ASC_APP_ID);
  const appleIdReady = hasText(env.MOVEBETA_APPLE_ID);
  const apiKeyReady = storeCredentialEnvKeys.iosApiKey.every((key) => hasText(env[key]));
  if (!ascAppIdReady) return 'missing';
  if (apiKeyReady) return 'api-key';
  if (appleIdReady) return 'apple-id';
  return 'missing';
}

function statusFromChecks(checks) {
  return checks.every((item) => item.status === 'pass') ? 'ready' : 'blocked';
}

/**
 * @param {{ appConfig?: any, env?: Record<string, string | undefined>, generatedAt?: string }} [options]
 */
export function buildStoreCredentialsReport({
  appConfig,
  env = process.env,
  generatedAt = new Date().toISOString(),
} = {}) {
  const projectIdReady = hasText(getProjectId(appConfig));
  const easTokenReady = hasText(env.EXPO_TOKEN);
  const iosMode = iosCredentialMode(env);
  const iosSubmitReady = iosMode !== 'missing';
  const androidSubmitReady = presentKeys(env, storeCredentialEnvKeys.androidServiceAccount).length > 0;
  const checkedEnvKeys = [
    ...storeCredentialEnvKeys.easToken,
    ...storeCredentialEnvKeys.iosAscAppId,
    ...storeCredentialEnvKeys.iosAppleId,
    ...storeCredentialEnvKeys.iosApiKey,
    ...storeCredentialEnvKeys.androidServiceAccount,
  ];
  const checks = [
    check(
      projectIdReady ? 'pass' : 'fail',
      'eas-project-id',
      'EAS project binding',
      projectIdReady ? 'Expo extra.eas.projectId is configured.' : 'Expo extra.eas.projectId is missing.',
      'Run npx eas-cli@latest init on the target Expo account and store the generated project id in app config.',
    ),
    check(
      easTokenReady ? 'pass' : 'fail',
      'eas-token',
      'EAS auth token',
      easTokenReady ? 'Required key is present: EXPO_TOKEN.' : 'Required key is missing: EXPO_TOKEN.',
      'Set EXPO_TOKEN in CI or the local release shell before non-interactive EAS builds.',
      storeCredentialEnvKeys.easToken,
    ),
    check(
      iosSubmitReady ? 'pass' : 'fail',
      'ios-submit-credentials',
      'iOS submit credentials',
      iosSubmitReady
        ? `iOS submission keys are present using ${iosMode === 'api-key' ? 'App Store Connect API key' : 'Apple ID'} mode.`
        : `Missing ${storeCredentialEnvKeys.iosAscAppId.join(', ')} plus ${storeCredentialEnvKeys.iosAppleId.join(', ')} or ${storeCredentialEnvKeys.iosApiKey.join(', ')}.`,
      'Set MOVEBETA_ASC_APP_ID plus either MOVEBETA_APPLE_ID or ASC_API_KEY_ID, ASC_API_ISSUER_ID, and ASC_API_KEY_P8_BASE64.',
      [...storeCredentialEnvKeys.iosAscAppId, ...storeCredentialEnvKeys.iosAppleId, ...storeCredentialEnvKeys.iosApiKey],
    ),
    check(
      androidSubmitReady ? 'pass' : 'fail',
      'android-submit-credentials',
      'Android submit credentials',
      androidSubmitReady
        ? `At least one Google Play credential key is present: ${presentKeys(env, storeCredentialEnvKeys.androidServiceAccount).join(', ')}.`
        : `Missing one of ${storeCredentialEnvKeys.androidServiceAccount.join(', ')}.`,
      'Set one Google Play service account credential key in CI or the local release shell.',
      storeCredentialEnvKeys.androidServiceAccount,
    ),
  ];
  const status = statusFromChecks(checks);

  return {
    checks,
    generatedAt,
    nextAction:
      status === 'ready'
        ? 'Run npm run release:eas:strict before TestFlight, Play internal testing, or production submission.'
        : checks.find((item) => item.status === 'fail')?.action ?? 'Review missing store credential checks.',
    privacy: {
      checkedEnvKeys,
      credentialValuesIncluded: false,
      localPathsIncluded: false,
      secretsIncluded: false,
    },
    schemaVersion: STORE_CREDENTIALS_REPORT_SCHEMA_VERSION,
    status,
    summary: {
      androidSubmitReady,
      easCredentialsReady: easTokenReady && iosSubmitReady && androidSubmitReady,
      easProjectReady: projectIdReady,
      easTokenReady,
      iosCredentialMode: iosMode,
      iosSubmitReady,
      missingEnvKeys: missingKeys(env, checkedEnvKeys),
      presentEnvKeys: presentKeys(env, checkedEnvKeys),
    },
  };
}

export function renderStoreCredentialsMarkdown(report) {
  const rows = report.checks
    .map((item) => `| ${item.label} | ${item.status} | ${item.detail.replace(/\n/g, ' ')} | ${item.action} |`)
    .join('\n');

  return `# Store Credentials Report

Generated: ${report.generatedAt}

- Status: ${report.status}
- Credential values included: no
- Next action: ${report.nextAction}

| Check | Status | Detail | Action |
| --- | --- | --- | --- |
${rows}
`;
}

/**
 * @param {{ jsonPath?: string, markdownPath?: string, report?: ReturnType<typeof buildStoreCredentialsReport> }} [options]
 */
export function writeStoreCredentialsReport({
  jsonPath = resolveDefaultJsonPath(),
  markdownPath = resolveDefaultMarkdownPath(),
  report,
} = {}) {
  const rootDir = path.resolve(path.dirname(jsonPath), '../..');
  const appConfig = JSON.parse(fs.readFileSync(path.join(rootDir, 'app.json'), 'utf8')).expo;
  const nextReport = report ?? buildStoreCredentialsReport({ appConfig });
  fs.mkdirSync(path.dirname(jsonPath), { recursive: true });
  fs.writeFileSync(jsonPath, `${JSON.stringify(nextReport, null, 2)}\n`);
  fs.writeFileSync(markdownPath, renderStoreCredentialsMarkdown(nextReport));
  return { jsonPath, markdownPath, report: nextReport };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const { jsonPath, markdownPath, report } = writeStoreCredentialsReport();
  console.log(`Wrote store credentials report to ${jsonPath}`);
  console.log(`Wrote store credentials summary to ${markdownPath}`);
  console.log(`Status: ${report.status}; next action: ${report.nextAction}`);
}
