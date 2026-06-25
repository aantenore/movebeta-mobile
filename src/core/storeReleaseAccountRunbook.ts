import { z } from 'zod';

import {
  buildStoreCredentialsSetupPacket,
  type StoreCredentialsSetupPacket,
} from './storeCredentialsSetupPacket';

export const storeReleaseAccountRunbookSchemaVersion = 'movebeta.store-release-account-runbook.v1';

const StoreReleaseAccountPhaseStatusSchema = z.enum(['blocked', 'ready', 'verified']);
const StoreReleaseAccountPhaseKeySchema = z.enum([
  'store-metadata',
  'eas-project-binding',
  'expo-token',
  'ios-submit-account',
  'android-submit-account',
  'native-qa-evidence',
  'strict-eas-gate',
  'store-submit',
]);

const StoreReleaseAccountRunbookCommandSchema = z.object({
  command: z.string(),
  key: z.string(),
  label: z.string(),
  owner: z.enum(['engineering', 'product', 'qa', 'release']),
  purpose: z.string(),
});

const StoreReleaseAccountRunbookPhaseSchema = z.object({
  action: z.string(),
  commandKey: z.string(),
  dependsOn: z.array(StoreReleaseAccountPhaseKeySchema),
  evidence: z.array(z.string()),
  key: StoreReleaseAccountPhaseKeySchema,
  label: z.string(),
  owner: z.enum(['product', 'qa', 'release']),
  requiredKeys: z.array(z.string()),
  status: StoreReleaseAccountPhaseStatusSchema,
});

export const StoreReleaseAccountRunbookSchema = z.object({
  app: z.object({
    androidPackage: z.string(),
    iosBundleIdentifier: z.string(),
    name: z.string(),
    slug: z.string(),
  }),
  commands: z.array(StoreReleaseAccountRunbookCommandSchema),
  generatedAt: z.string(),
  phases: z.array(StoreReleaseAccountRunbookPhaseSchema).min(1),
  privacy: z.object({
    credentialValuesIncluded: z.literal(false),
    localPathsIncluded: z.literal(false),
    projectIdsIncluded: z.literal(false),
    rawArtifactsIncluded: z.literal(false),
    rawVideoIncluded: z.literal(false),
    secretsIncluded: z.literal(false),
    tokenLikeValuesIncluded: z.literal(false),
  }),
  schemaVersion: z.literal(storeReleaseAccountRunbookSchemaVersion),
  summary: z.object({
    blockedPhaseCount: z.number().int().nonnegative(),
    currentCommand: z.string(),
    currentPhase: StoreReleaseAccountPhaseKeySchema,
    nextAction: z.string(),
    phaseCount: z.number().int().positive(),
    readyPhaseCount: z.number().int().nonnegative(),
    status: z.enum(['blocked', 'ready-for-strict-gate', 'ready-for-submission']),
    verifiedPhaseCount: z.number().int().nonnegative(),
  }),
});

export type StoreReleaseAccountRunbook = z.infer<typeof StoreReleaseAccountRunbookSchema>;
export type StoreReleaseAccountRunbookPhase = z.infer<typeof StoreReleaseAccountRunbookPhaseSchema>;

export type StoreReleaseAccountRunbookInput = {
  credentialsPacket?: StoreCredentialsSetupPacket;
  generatedAt?: string;
  nativeQaEvidenceReady?: boolean;
  presentEnvKeys?: string[];
  staticEasProjectConfigured?: boolean;
  storeMetadataReady?: boolean;
  strictGatePassed?: boolean;
};

const forbiddenStoreReleaseAccountValuePattern =
  /(file:\/\/|content:\/\/|asset:\/\/|ph:\/\/|\/Users\/|\/private\/|\/var\/mobile\/|[A-Za-z]:\\|\.mov\b|\.mp4\b|BEGIN PRIVATE KEY|ghp_[A-Za-z0-9_]+|github_pat_[A-Za-z0-9_]+|pat_[A-Za-z0-9_]+|sk_live_[A-Za-z0-9_]+|sk_test_[A-Za-z0-9_]+|bearer\s+[A-Za-z0-9._-]+|eyJ[A-Za-z0-9_-]{20,}|"private_key"\s*:|"client_email"\s*:)/i;

function containsForbiddenStoreReleaseAccountValue(value: unknown): boolean {
  if (typeof value === 'string') return forbiddenStoreReleaseAccountValuePattern.test(value);
  if (Array.isArray(value)) return value.some(containsForbiddenStoreReleaseAccountValue);
  if (value && typeof value === 'object') return Object.values(value).some(containsForbiddenStoreReleaseAccountValue);
  return false;
}

function groupReady(packet: StoreCredentialsSetupPacket, groupKey: StoreCredentialsSetupPacket['credentialGroups'][number]['key']) {
  return packet.credentialGroups.find((group) => group.key === groupKey)?.status === 'ready';
}

function phaseStatus(ready: boolean, verified = false): StoreReleaseAccountRunbookPhase['status'] {
  if (verified) return 'verified';
  return ready ? 'ready' : 'blocked';
}

function phase({
  action,
  commandKey,
  dependsOn = [],
  evidence,
  key,
  label,
  owner,
  ready,
  requiredKeys = [],
  verified = false,
}: {
  action: string;
  commandKey: string;
  dependsOn?: StoreReleaseAccountRunbookPhase['dependsOn'];
  evidence: string[];
  key: StoreReleaseAccountRunbookPhase['key'];
  label: string;
  owner: StoreReleaseAccountRunbookPhase['owner'];
  ready: boolean;
  requiredKeys?: string[];
  verified?: boolean;
}): StoreReleaseAccountRunbookPhase {
  return {
    action,
    commandKey,
    dependsOn,
    evidence,
    key,
    label,
    owner,
    requiredKeys,
    status: phaseStatus(ready, verified),
  };
}

function statusFor(phases: StoreReleaseAccountRunbookPhase[]) {
  const strictGate = phases.find((item) => item.key === 'strict-eas-gate');
  const storeSubmit = phases.find((item) => item.key === 'store-submit');
  if (storeSubmit?.status === 'ready' || storeSubmit?.status === 'verified') return 'ready-for-submission' as const;
  if (strictGate?.status === 'ready' || strictGate?.status === 'verified') return 'ready-for-strict-gate' as const;
  return 'blocked' as const;
}

function currentPhaseFor(phases: StoreReleaseAccountRunbookPhase[]) {
  const strictGate = phases.find((item) => item.key === 'strict-eas-gate');
  const storeSubmit = phases.find((item) => item.key === 'store-submit');
  if (storeSubmit?.status === 'ready') return storeSubmit;
  if (strictGate?.status === 'ready') return strictGate;
  return phases.find((item) => item.status === 'blocked') ?? phases[phases.length - 1];
}

export function assertStoreReleaseAccountRunbookIsShareSafe(packet: StoreReleaseAccountRunbook) {
  if (containsForbiddenStoreReleaseAccountValue(packet)) {
    throw new Error('Store release account runbook contains credential values, local paths, raw artifacts, raw video, or token-like data.');
  }
  return packet;
}

export function buildStoreReleaseAccountRunbook({
  credentialsPacket,
  generatedAt = new Date().toISOString(),
  nativeQaEvidenceReady = false,
  presentEnvKeys = [],
  staticEasProjectConfigured = false,
  storeMetadataReady = false,
  strictGatePassed = false,
}: StoreReleaseAccountRunbookInput = {}): StoreReleaseAccountRunbook {
  const credentialPlan =
    credentialsPacket ??
    buildStoreCredentialsSetupPacket({
      easProjectConfigured: staticEasProjectConfigured,
      generatedAt,
      presentEnvKeys,
    });
  const easProjectReady = groupReady(credentialPlan, 'eas-project');
  const expoTokenReady = groupReady(credentialPlan, 'eas-token');
  const iosSubmitReady = groupReady(credentialPlan, 'ios-submit');
  const androidSubmitReady = groupReady(credentialPlan, 'android-submit');
  const accountPrerequisitesReady = storeMetadataReady && easProjectReady && expoTokenReady && iosSubmitReady && androidSubmitReady;
  const submissionReady = storeMetadataReady && nativeQaEvidenceReady && strictGatePassed;

  const commands = [
    {
      command: 'npm run store:submission',
      key: 'store-submission-packet',
      label: 'Refresh store metadata packet',
      owner: 'product',
      purpose: 'Verify listing metadata, screenshots, privacy declarations, and copy-risk checks before account work.',
    },
    {
      command: 'npx eas-cli@latest init',
      key: 'eas-init',
      label: 'Bind Expo project',
      owner: 'release',
      purpose: 'Create the EAS project binding on the target Expo account and store only the generated key name location in app config.',
    },
    {
      command: 'npm run release:credentials:starter',
      key: 'credentials-starter',
      label: 'Prepare credential templates',
      owner: 'release',
      purpose: 'Generate the key-name setup packet, empty environment template, and EAS binding template without secret values.',
    },
    {
      command: 'npm run release:credentials:doctor',
      key: 'credentials-doctor',
      label: 'Check credential keys',
      owner: 'release',
      purpose: 'Verify Expo, App Store Connect, and Google Play key names without printing values.',
    },
    {
      command: 'npm run native:qa:validate',
      key: 'native-qa-validate',
      label: 'Validate native QA evidence',
      owner: 'qa',
      purpose: 'Verify Android and iOS physical-device evidence before store submission.',
    },
    {
      command: 'npm run release:eas:strict',
      key: 'strict-eas-gate',
      label: 'Run strict EAS gate',
      owner: 'release',
      purpose: 'Block TestFlight, Play internal testing, and production submission until account-bound prerequisites are ready.',
    },
    {
      command: 'npx eas-cli@latest submit --platform ios --profile production',
      key: 'submit-ios',
      label: 'Submit iOS build',
      owner: 'release',
      purpose: 'Submit the production iOS build after strict EAS and native QA evidence pass.',
    },
    {
      command: 'npx eas-cli@latest submit --platform android --profile production',
      key: 'submit-android',
      label: 'Submit Android build',
      owner: 'release',
      purpose: 'Submit the production Android build after strict EAS and native QA evidence pass.',
    },
  ] satisfies StoreReleaseAccountRunbook['commands'];

  const phases = [
    phase({
      action: 'Regenerate and review the store submission packet.',
      commandKey: 'store-submission-packet',
      evidence: ['docs/store/store-submission-packet.json'],
      key: 'store-metadata',
      label: 'Store metadata readiness',
      owner: 'product',
      ready: storeMetadataReady,
    }),
    phase({
      action: 'Run EAS init on the target Expo account, then commit only the app-config binding location.',
      commandKey: 'eas-init',
      dependsOn: ['store-metadata'],
      evidence: ['app.json expo.extra.eas.projectId key is configured'],
      key: 'eas-project-binding',
      label: 'EAS project binding',
      owner: 'release',
      ready: easProjectReady,
      requiredKeys: ['extra.eas.projectId'],
    }),
    phase({
      action: 'Set EXPO_TOKEN in CI or the local release shell.',
      commandKey: 'credentials-starter',
      dependsOn: ['eas-project-binding'],
      evidence: ['docs/sdlc/store-credentials-report.json'],
      key: 'expo-token',
      label: 'Expo automation token',
      owner: 'release',
      ready: expoTokenReady,
      requiredKeys: ['EXPO_TOKEN'],
    }),
    phase({
      action: 'Set the App Store Connect app id plus Apple ID or API key environment names outside the repository.',
      commandKey: 'credentials-starter',
      dependsOn: ['expo-token'],
      evidence: ['docs/sdlc/store-credentials-report.json'],
      key: 'ios-submit-account',
      label: 'iOS submit account',
      owner: 'release',
      ready: iosSubmitReady,
      requiredKeys: ['MOVEBETA_ASC_APP_ID', 'MOVEBETA_APPLE_ID', 'ASC_API_KEY_ID', 'ASC_API_ISSUER_ID', 'ASC_API_KEY_P8_BASE64'],
    }),
    phase({
      action: 'Set one Google Play service-account credential key in CI or the local release shell.',
      commandKey: 'credentials-starter',
      dependsOn: ['ios-submit-account'],
      evidence: ['docs/sdlc/store-credentials-report.json'],
      key: 'android-submit-account',
      label: 'Android submit account',
      owner: 'release',
      ready: androidSubmitReady,
      requiredKeys: ['GOOGLE_SERVICE_ACCOUNT_JSON', 'GOOGLE_SERVICE_ACCOUNT_KEY_PATH', 'MOVEBETA_GOOGLE_SERVICE_ACCOUNT_JSON_BASE64'],
    }),
    phase({
      action: 'Fill native QA evidence with real Android and iOS physical-device runs, then validate it.',
      commandKey: 'native-qa-validate',
      dependsOn: ['android-submit-account'],
      evidence: ['docs/sdlc/native-qa-evidence.json'],
      key: 'native-qa-evidence',
      label: 'Native QA evidence',
      owner: 'qa',
      ready: nativeQaEvidenceReady,
    }),
    phase({
      action: accountPrerequisitesReady
        ? 'Run the strict EAS gate before submitting builds.'
        : 'Clear metadata, EAS binding, Expo token, and store account prerequisites before running strict EAS.',
      commandKey: 'strict-eas-gate',
      dependsOn: ['android-submit-account'],
      evidence: ['terminal output from npm run release:eas:strict'],
      key: 'strict-eas-gate',
      label: 'Strict EAS gate',
      owner: 'release',
      ready: accountPrerequisitesReady,
      verified: strictGatePassed,
    }),
    phase({
      action: submissionReady
        ? 'Submit iOS and Android production builds with EAS submit.'
        : 'Submit only after metadata, native QA evidence, and strict EAS are verified.',
      commandKey: 'submit-ios',
      dependsOn: ['native-qa-evidence', 'strict-eas-gate'],
      evidence: ['App Store Connect submission id', 'Google Play Console release id'],
      key: 'store-submit',
      label: 'Store submit',
      owner: 'release',
      ready: submissionReady,
    }),
  ] satisfies StoreReleaseAccountRunbook['phases'];

  const currentPhase = currentPhaseFor(phases);
  const status = statusFor(phases);
  const packet = StoreReleaseAccountRunbookSchema.parse({
    app: credentialPlan.app,
    commands,
    generatedAt,
    phases,
    privacy: {
      credentialValuesIncluded: false,
      localPathsIncluded: false,
      projectIdsIncluded: false,
      rawArtifactsIncluded: false,
      rawVideoIncluded: false,
      secretsIncluded: false,
      tokenLikeValuesIncluded: false,
    },
    schemaVersion: storeReleaseAccountRunbookSchemaVersion,
    summary: {
      blockedPhaseCount: phases.filter((item) => item.status === 'blocked').length,
      currentCommand: commands.find((command) => command.key === currentPhase.commandKey)?.command ?? currentPhase.commandKey,
      currentPhase: currentPhase.key,
      nextAction: currentPhase.action,
      phaseCount: phases.length,
      readyPhaseCount: phases.filter((item) => item.status === 'ready').length,
      status,
      verifiedPhaseCount: phases.filter((item) => item.status === 'verified').length,
    },
  });

  return assertStoreReleaseAccountRunbookIsShareSafe(packet);
}
