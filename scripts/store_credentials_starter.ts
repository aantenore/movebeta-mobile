import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  StoreCredentialsSetupPacketSchema,
  assertStoreCredentialsSetupPacketIsShareSafe,
  buildStoreCredentialsSetupPacket,
  type StoreCredentialsSetupPacket,
} from '../src/core/storeCredentialsSetupPacket';

export const storeCredentialsStarterSchemaVersion = 'movebeta.store-credentials-starter.v1';

const envKeys = [
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

type EnvMap = Record<string, string | undefined>;

const forbiddenStarterValuePattern =
  /(file:\/\/|content:\/\/|asset:\/\/|ph:\/\/|\/Users\/|\/private\/|\/var\/mobile\/|[A-Za-z]:\\|BEGIN PRIVATE KEY|ghp_[A-Za-z0-9_]+|github_pat_[A-Za-z0-9_]+|pat_[A-Za-z0-9_]+|sk_live_[A-Za-z0-9_]+|sk_test_[A-Za-z0-9_]+|bearer\s+[A-Za-z0-9._-]+|eyJ[A-Za-z0-9_-]{20,}|"private_key"\s*:|"client_email"\s*:)/i;

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

function containsForbiddenValue(value: unknown): boolean {
  if (typeof value === 'string') return forbiddenStarterValuePattern.test(value);
  if (Array.isArray(value)) return value.some(containsForbiddenValue);
  if (value && typeof value === 'object') return Object.values(value).some(containsForbiddenValue);
  return false;
}

function readExpoConfig(rootDir: string) {
  return readJsonIfExists(path.join(rootDir, 'app.json'))?.expo ?? {};
}

function projectConfigured(expoConfig: unknown) {
  return hasText((expoConfig as { extra?: { eas?: { projectId?: unknown } } })?.extra?.eas?.projectId);
}

function presentCredentialKeys(env: EnvMap) {
  return envKeys.filter((key) => hasText(env[key]));
}

export function resolveStoreCredentialsStarterPaths(rootDir = resolveProjectRoot()) {
  const sdlcDir = path.join(rootDir, 'docs/sdlc');

  return {
    envTemplatePath: path.join(sdlcDir, 'store-credentials.env.template'),
    packetJsonPath: path.join(sdlcDir, 'store-credentials-setup-packet.json'),
    packetMarkdownPath: path.join(sdlcDir, 'store-credentials-setup-packet.md'),
    projectBindingTemplatePath: path.join(sdlcDir, 'eas-project-binding.template.json'),
  };
}

export function buildStoreCredentialsEnvTemplate() {
  return `# Store credential key names only. Do not commit a filled copy.
# EAS project id belongs in app config after running: npx eas-cli@latest init
EXPO_TOKEN=
MOVEBETA_ASC_APP_ID=
MOVEBETA_APPLE_ID=
ASC_API_KEY_ID=
ASC_API_ISSUER_ID=
ASC_API_KEY_P8_BASE64=
GOOGLE_SERVICE_ACCOUNT_JSON=
GOOGLE_SERVICE_ACCOUNT_KEY_PATH=
MOVEBETA_GOOGLE_SERVICE_ACCOUNT_JSON_BASE64=
`;
}

export function buildEasProjectBindingTemplate() {
  return {
    instructions: [
      'Run npx eas-cli@latest init on the target Expo account.',
      'Copy only the generated project id into app.json at expo.extra.eas.projectId.',
      'Do not paste Expo tokens, Apple credentials, Google service account JSON, or local credential paths into this file.',
    ],
    patchShape: {
      expo: {
        extra: {
          eas: {
            projectId: 'replace-with-eas-project-id-from-eas-init',
          },
        },
      },
    },
    schemaVersion: storeCredentialsStarterSchemaVersion,
  };
}

export function assertStoreCredentialsStarterIsShareSafe(value: unknown) {
  if (containsForbiddenValue(value)) {
    throw new Error('Store credentials starter contains credential values, local paths, raw artifacts, or token-like data.');
  }
}

export function buildStoreCredentialsStarterPacket({
  env = process.env,
  generatedAt = new Date().toISOString(),
  rootDir = resolveProjectRoot(),
}: {
  env?: EnvMap;
  generatedAt?: string;
  rootDir?: string;
} = {}) {
  const expoConfig = readExpoConfig(rootDir);
  const packet = buildStoreCredentialsSetupPacket({
    androidPackage: expoConfig.android?.package,
    easProjectConfigured: projectConfigured(expoConfig),
    generatedAt,
    iosBundleIdentifier: expoConfig.ios?.bundleIdentifier,
    name: expoConfig.name,
    presentEnvKeys: presentCredentialKeys(env),
    slug: expoConfig.slug,
  });
  const envTemplate = buildStoreCredentialsEnvTemplate();
  const projectBindingTemplate = buildEasProjectBindingTemplate();

  StoreCredentialsSetupPacketSchema.parse(packet);
  assertStoreCredentialsSetupPacketIsShareSafe(packet);
  assertStoreCredentialsStarterIsShareSafe(packet);
  assertStoreCredentialsStarterIsShareSafe(envTemplate);
  assertStoreCredentialsStarterIsShareSafe(projectBindingTemplate);

  return {
    envTemplate,
    packet,
    projectBindingTemplate,
  };
}

export function renderStoreCredentialsSetupPacketMarkdown(packet: StoreCredentialsSetupPacket) {
  const groupRows = packet.credentialGroups
    .map(
      (group) =>
        `| ${group.label} | ${group.status} | ${group.secretStorage} | ${group.requiredKeys.map((key) => `\`${key}\``).join(', ')} |`,
    )
    .join('\n');
  const commandRows = packet.commands.map((command) => `| ${command.label} | ${command.owner} | \`${command.command}\` |`).join('\n');

  return `# Store Credentials Setup Packet

Generated: ${packet.generatedAt}

- Status: ${packet.summary.status}
- Present groups: ${packet.summary.presentGroupCount}/${packet.summary.totalGroupCount}
- Missing groups: ${packet.summary.missingGroupCount}
- Next action: ${packet.summary.nextAction}
- Credential values included: no
- Secrets included: no
- Local paths included: no

| Group | Status | Storage | Required key names |
| --- | --- | --- | --- |
${groupRows}

| Command | Owner | Run |
| --- | --- | --- |
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

export function writeStoreCredentialsStarter({
  env = process.env,
  generatedAt,
  rootDir = resolveProjectRoot(),
}: {
  env?: EnvMap;
  generatedAt?: string;
  rootDir?: string;
} = {}) {
  const paths = resolveStoreCredentialsStarterPaths(rootDir);
  const starter = buildStoreCredentialsStarterPacket({
    env,
    generatedAt,
    rootDir,
  });

  writeText(paths.envTemplatePath, starter.envTemplate);
  writeJson(paths.projectBindingTemplatePath, starter.projectBindingTemplate);
  writeJson(paths.packetJsonPath, starter.packet);
  writeText(paths.packetMarkdownPath, renderStoreCredentialsSetupPacketMarkdown(starter.packet));

  return {
    paths,
    ...starter,
  };
}

function readCliOptions(argv: string[]) {
  const generatedAtIndex = argv.indexOf('--generated-at');

  return {
    generatedAt: generatedAtIndex >= 0 ? argv[generatedAtIndex + 1] : undefined,
    rootDir: resolveProjectRoot(),
  };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const { packet, paths } = writeStoreCredentialsStarter(readCliOptions(process.argv.slice(2)));
  console.log(`Wrote store credentials setup packet to ${paths.packetJsonPath}`);
  console.log(`Wrote store credentials setup summary to ${paths.packetMarkdownPath}`);
  console.log(`Wrote store credentials env template to ${paths.envTemplatePath}`);
  console.log(`Status: ${packet.summary.status}; present groups: ${packet.summary.presentGroupCount}/${packet.summary.totalGroupCount}`);
}
