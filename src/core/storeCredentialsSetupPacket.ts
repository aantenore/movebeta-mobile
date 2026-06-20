import { z } from 'zod';

export const storeCredentialsSetupPacketSchemaVersion = 'movebeta.store-credentials-setup-packet.v1';

const StoreCredentialsSetupCommandSchema = z.object({
  command: z.string(),
  key: z.string(),
  label: z.string(),
  owner: z.enum(['engineering', 'release']),
  purpose: z.string(),
});

const StoreCredentialsSetupGroupSchema = z.object({
  key: z.enum(['eas-project', 'eas-token', 'ios-submit', 'android-submit']),
  label: z.string(),
  owner: z.enum(['engineering', 'release']),
  requiredKeys: z.array(z.string()),
  secretStorage: z.enum(['app-config', 'ci-or-local-env']),
  status: z.enum(['ready', 'missing']),
});

export const StoreCredentialsSetupPacketSchema = z.object({
  app: z.object({
    androidPackage: z.string(),
    iosBundleIdentifier: z.string(),
    name: z.string(),
    slug: z.string(),
  }),
  commands: z.array(StoreCredentialsSetupCommandSchema),
  credentialGroups: z.array(StoreCredentialsSetupGroupSchema),
  generatedAt: z.string(),
  privacy: z.object({
    credentialValuesIncluded: z.literal(false),
    localPathsIncluded: z.literal(false),
    rawArtifactsIncluded: z.literal(false),
    rawVideoIncluded: z.literal(false),
    secretsIncluded: z.literal(false),
  }),
  schemaVersion: z.literal(storeCredentialsSetupPacketSchemaVersion),
  summary: z.object({
    missingGroupCount: z.number().int().nonnegative(),
    nextAction: z.string(),
    presentGroupCount: z.number().int().nonnegative(),
    status: z.enum(['ready', 'blocked']),
    totalGroupCount: z.number().int().positive(),
  }),
});

export type StoreCredentialsSetupPacket = z.infer<typeof StoreCredentialsSetupPacketSchema>;

export type StoreCredentialsSetupInput = {
  androidPackage?: string;
  easProjectConfigured?: boolean;
  generatedAt?: string;
  iosBundleIdentifier?: string;
  name?: string;
  presentEnvKeys?: string[];
  slug?: string;
};

const easProjectKey = 'extra.eas.projectId';
const easTokenKeys = ['EXPO_TOKEN'];
const iosSubmitKeys = [
  'MOVEBETA_ASC_APP_ID',
  'MOVEBETA_APPLE_ID',
  'ASC_API_KEY_ID',
  'ASC_API_ISSUER_ID',
  'ASC_API_KEY_P8_BASE64',
];
const androidSubmitKeys = [
  'GOOGLE_SERVICE_ACCOUNT_JSON',
  'GOOGLE_SERVICE_ACCOUNT_KEY_PATH',
  'MOVEBETA_GOOGLE_SERVICE_ACCOUNT_JSON_BASE64',
];

const forbiddenCredentialsSetupValuePattern =
  /(file:\/\/|content:\/\/|asset:\/\/|ph:\/\/|\/Users\/|\/private\/|\/var\/mobile\/|[A-Za-z]:\\|BEGIN PRIVATE KEY|ghp_[A-Za-z0-9_]+|pat_[A-Za-z0-9_]+|sk_live_[A-Za-z0-9_]+|sk_test_[A-Za-z0-9_]+|bearer\s+[A-Za-z0-9._-]+|eyJ[A-Za-z0-9_-]{20,}|"private_key"\s*:|"client_email"\s*:)/i;

function hasAny(presentEnvKeys: Set<string>, keys: string[]) {
  return keys.some((key) => presentEnvKeys.has(key));
}

function hasIosSubmitKeys(presentEnvKeys: Set<string>) {
  const hasAscAppId = presentEnvKeys.has('MOVEBETA_ASC_APP_ID');
  const hasAppleId = presentEnvKeys.has('MOVEBETA_APPLE_ID');
  const hasApiKey = ['ASC_API_KEY_ID', 'ASC_API_ISSUER_ID', 'ASC_API_KEY_P8_BASE64'].every((key) =>
    presentEnvKeys.has(key),
  );
  return hasAscAppId && (hasAppleId || hasApiKey);
}

function containsForbiddenCredentialsSetupValue(value: unknown): boolean {
  if (typeof value === 'string') return forbiddenCredentialsSetupValuePattern.test(value);
  if (Array.isArray(value)) return value.some(containsForbiddenCredentialsSetupValue);
  if (value && typeof value === 'object') return Object.values(value).some(containsForbiddenCredentialsSetupValue);
  return false;
}

function nextActionFor(missingGroups: Array<z.infer<typeof StoreCredentialsSetupGroupSchema>>) {
  if (missingGroups.length === 0) {
    return 'Run npm run release:credentials:doctor and npm run release:eas:strict before native store submission.';
  }

  const first = missingGroups[0];
  if (first.key === 'eas-project') return 'Run npx eas-cli@latest init on the target Expo account, then store extra.eas.projectId in app config.';
  if (first.key === 'eas-token') return 'Set EXPO_TOKEN in CI or the local release shell before non-interactive EAS builds.';
  if (first.key === 'ios-submit') return 'Set App Store Connect app id plus Apple ID or API key environment names outside the repository.';
  return 'Set one Google Play service account credential environment name outside the repository.';
}

export function assertStoreCredentialsSetupPacketIsShareSafe(packet: StoreCredentialsSetupPacket) {
  if (containsForbiddenCredentialsSetupValue(packet)) {
    throw new Error('Store credentials setup packet contains credential values, local paths, raw artifacts, or token-like data.');
  }
  return packet;
}

export function buildStoreCredentialsSetupPacket({
  androidPackage = 'com.movebeta.mobile',
  easProjectConfigured = false,
  generatedAt = new Date().toISOString(),
  iosBundleIdentifier = 'com.movebeta.mobile',
  name = 'MoveBeta',
  presentEnvKeys = [],
  slug = 'movebeta-mobile',
}: StoreCredentialsSetupInput = {}): StoreCredentialsSetupPacket {
  const presentKeys = new Set(presentEnvKeys.filter((key) => typeof key === 'string' && key.trim().length > 0));
  const credentialGroups: Array<z.infer<typeof StoreCredentialsSetupGroupSchema>> = [
    {
      key: 'eas-project',
      label: 'EAS project binding',
      owner: 'release',
      requiredKeys: [easProjectKey],
      secretStorage: 'app-config',
      status: easProjectConfigured ? 'ready' : 'missing',
    },
    {
      key: 'eas-token',
      label: 'EAS auth token',
      owner: 'release',
      requiredKeys: easTokenKeys,
      secretStorage: 'ci-or-local-env',
      status: hasAny(presentKeys, easTokenKeys) ? 'ready' : 'missing',
    },
    {
      key: 'ios-submit',
      label: 'iOS submit credentials',
      owner: 'release',
      requiredKeys: iosSubmitKeys,
      secretStorage: 'ci-or-local-env',
      status: hasIosSubmitKeys(presentKeys) ? 'ready' : 'missing',
    },
    {
      key: 'android-submit',
      label: 'Android submit credentials',
      owner: 'release',
      requiredKeys: androidSubmitKeys,
      secretStorage: 'ci-or-local-env',
      status: hasAny(presentKeys, androidSubmitKeys) ? 'ready' : 'missing',
    },
  ];
  const missingGroups = credentialGroups.filter((group) => group.status === 'missing');
  const commands: Array<z.infer<typeof StoreCredentialsSetupCommandSchema>> = [
    {
      command: 'npx eas-cli@latest init',
      key: 'eas-init',
      label: 'Bind Expo project',
      owner: 'release',
      purpose: 'Create the EAS project binding on the target Expo account; commit only the generated project id in app config.',
    },
    {
      command: 'npm run release:credentials:doctor',
      key: 'credentials-doctor',
      label: 'Refresh credential doctor',
      owner: 'release',
      purpose: 'Verify required key names are present without printing or committing credential values.',
    },
    {
      command: 'npm run release:eas:strict',
      key: 'strict-eas-gate',
      label: 'Run strict EAS gate',
      owner: 'release',
      purpose: 'Block TestFlight, Play internal testing, and production submission until account-bound prerequisites are ready.',
    },
    {
      command: 'npm run release:check',
      key: 'release-check',
      label: 'Refresh release gate',
      owner: 'engineering',
      purpose: 'Refresh quality, model, store, EAS standard, audit, and license evidence after credentials are configured.',
    },
  ];
  const packet = StoreCredentialsSetupPacketSchema.parse({
    app: {
      androidPackage,
      iosBundleIdentifier,
      name,
      slug,
    },
    commands,
    credentialGroups,
    generatedAt,
    privacy: {
      credentialValuesIncluded: false,
      localPathsIncluded: false,
      rawArtifactsIncluded: false,
      rawVideoIncluded: false,
      secretsIncluded: false,
    },
    schemaVersion: storeCredentialsSetupPacketSchemaVersion,
    summary: {
      missingGroupCount: missingGroups.length,
      nextAction: nextActionFor(missingGroups),
      presentGroupCount: credentialGroups.length - missingGroups.length,
      status: missingGroups.length === 0 ? 'ready' : 'blocked',
      totalGroupCount: credentialGroups.length,
    },
  });

  return assertStoreCredentialsSetupPacketIsShareSafe(packet);
}
