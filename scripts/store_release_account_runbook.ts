import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { validateNativeQaEvidenceForApp } from '../src/core/nativeQaEvidenceValidation';
import {
  StoreReleaseAccountRunbookSchema,
  assertStoreReleaseAccountRunbookIsShareSafe,
  buildStoreReleaseAccountRunbook,
  type StoreReleaseAccountRunbook,
} from '../src/core/storeReleaseAccountRunbook';
import { buildStoreCredentialsSetupPacket } from '../src/core/storeCredentialsSetupPacket';

type EnvMap = Record<string, string | undefined>;

const credentialEnvKeys = [
  'EXPO_TOKEN',
  'MOVEBETA_ASC_APP_ID',
  'MOVEBETA_APPLE_ID',
  'ASC_API_KEY_ID',
  'ASC_API_ISSUER_ID',
  'ASC_API_KEY_P8_BASE64',
  'GOOGLE_SERVICE_ACCOUNT_JSON',
  'GOOGLE_SERVICE_ACCOUNT_KEY_PATH',
  'MOVEBETA_GOOGLE_SERVICE_ACCOUNT_JSON_BASE64',
] as const;

export function resolveProjectRoot() {
  return path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
}

function readJsonIfExists(filePath: string) {
  if (!fs.existsSync(filePath)) return undefined;
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function hasText(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

function presentCredentialKeys(env: EnvMap) {
  return credentialEnvKeys.filter((key) => hasText(env[key]));
}

function projectConfigured(expoConfig: unknown) {
  return hasText((expoConfig as { extra?: { eas?: { projectId?: unknown } } })?.extra?.eas?.projectId);
}

function resolveNativeQaEvidenceReady(rootDir: string) {
  const evidence = readJsonIfExists(path.join(rootDir, 'docs/sdlc/native-qa-evidence.json'));
  if (!evidence) return false;
  return validateNativeQaEvidenceForApp(evidence).ready;
}

function resolveStoreMetadataReady(rootDir: string) {
  const packet = readJsonIfExists(path.join(rootDir, 'docs/store/store-submission-packet.json')) as
    | { schemaVersion?: string; summary?: { status?: string } }
    | undefined;
  return packet?.schemaVersion === 'movebeta.store-submission-packet.v1' && packet.summary?.status === 'metadata-ready';
}

export function resolveStoreReleaseAccountRunbookPaths(rootDir = resolveProjectRoot()) {
  const sdlcDir = path.join(rootDir, 'docs/sdlc');

  return {
    jsonPath: path.join(sdlcDir, 'store-release-account-runbook.json'),
    markdownPath: path.join(sdlcDir, 'store-release-account-runbook.md'),
  };
}

export function buildStoreReleaseAccountRunbookFromWorkspace({
  env = process.env,
  generatedAt = new Date().toISOString(),
  rootDir = resolveProjectRoot(),
}: {
  env?: EnvMap;
  generatedAt?: string;
  rootDir?: string;
} = {}) {
  const expoConfig = readJsonIfExists(path.join(rootDir, 'app.json'))?.expo ?? {};
  const credentialsPacket = buildStoreCredentialsSetupPacket({
    androidPackage: expoConfig.android?.package,
    easProjectConfigured: projectConfigured(expoConfig),
    generatedAt,
    iosBundleIdentifier: expoConfig.ios?.bundleIdentifier,
    name: expoConfig.name,
    presentEnvKeys: presentCredentialKeys(env),
    slug: expoConfig.slug,
  });
  const runbook = buildStoreReleaseAccountRunbook({
    credentialsPacket,
    generatedAt,
    nativeQaEvidenceReady: resolveNativeQaEvidenceReady(rootDir),
    storeMetadataReady: resolveStoreMetadataReady(rootDir),
  });

  StoreReleaseAccountRunbookSchema.parse(runbook);
  assertStoreReleaseAccountRunbookIsShareSafe(runbook);

  return runbook;
}

export function renderStoreReleaseAccountRunbookMarkdown(runbook: StoreReleaseAccountRunbook) {
  const phaseRows = runbook.phases
    .map(
      (phase) =>
        `| ${phase.label} | ${phase.status} | ${phase.owner} | \`${phase.commandKey}\` | ${phase.action} |`,
    )
    .join('\n');
  const commandRows = runbook.commands
    .map((command) => `| ${command.label} | ${command.owner} | \`${command.command}\` | ${command.purpose} |`)
    .join('\n');

  return `# Store Release Account Runbook

Generated: ${runbook.generatedAt}

- Status: ${runbook.summary.status}
- Current phase: ${runbook.summary.currentPhase}
- Current command: \`${runbook.summary.currentCommand}\`
- Ready phases: ${runbook.summary.readyPhaseCount}/${runbook.summary.phaseCount}
- Verified phases: ${runbook.summary.verifiedPhaseCount}
- Blocked phases: ${runbook.summary.blockedPhaseCount}
- Next action: ${runbook.summary.nextAction}
- Credential values included: no
- Project id values included: no
- Local paths included: no
- Token-like values included: no

## Phases

| Phase | Status | Owner | Command key | Action |
| --- | --- | --- | --- | --- |
${phaseRows}

## Commands

| Command | Owner | Value | Purpose |
| --- | --- | --- | --- |
${commandRows}
`;
}

function writeJson(filePath: string, value: unknown) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`);
}

function writeText(filePath: string, value: string) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, value);
}

export function writeStoreReleaseAccountRunbook({
  env = process.env,
  generatedAt,
  rootDir = resolveProjectRoot(),
}: {
  env?: EnvMap;
  generatedAt?: string;
  rootDir?: string;
} = {}) {
  const paths = resolveStoreReleaseAccountRunbookPaths(rootDir);
  const runbook = buildStoreReleaseAccountRunbookFromWorkspace({
    env,
    generatedAt,
    rootDir,
  });

  writeJson(paths.jsonPath, runbook);
  writeText(paths.markdownPath, renderStoreReleaseAccountRunbookMarkdown(runbook));

  return {
    paths,
    runbook,
  };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const { paths, runbook } = writeStoreReleaseAccountRunbook();
  console.log(`Wrote store release account runbook to ${paths.jsonPath}`);
  console.log(`Wrote store release account runbook summary to ${paths.markdownPath}`);
  console.log(`Status: ${runbook.summary.status}; next action: ${runbook.summary.nextAction}`);
}
