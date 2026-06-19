import { z } from 'zod';

import {
  buildLaunchReadinessSummary,
  defaultLaunchReadinessEvidence,
  LaunchReadinessCheckKeySchema,
  LaunchReadinessEvidenceSchema,
  LaunchStatusSchema,
  LaunchTrackSchema,
  type LaunchReadinessCheck,
  type LaunchReadinessEvidence,
  type LaunchReadinessTrack,
} from './launchReadiness';

export const releaseUnblockChecklistSchemaVersion = 'movebeta.release-unblock-checklist.v1';

const ReleaseUnblockStatusSchema = z.enum(['ready', 'needs-external-access']);

export const ReleaseUnblockChecklistItemSchema = z.object({
  acceptance: z.array(z.string()).min(1),
  action: z.string(),
  commands: z.array(z.string()),
  envKeys: z.array(z.string()),
  key: LaunchReadinessCheckKeySchema,
  label: z.string(),
  owner: z.enum(['engineering', 'qa', 'product', 'release']),
  proof: z.array(z.string()).min(1),
  secretPolicy: z.string(),
  status: LaunchStatusSchema,
  tracks: z.array(LaunchTrackSchema).min(1),
});

export const ReleaseUnblockChecklistSchema = z.object({
  items: z.array(ReleaseUnblockChecklistItemSchema),
  schemaVersion: z.literal(releaseUnblockChecklistSchemaVersion),
  summary: z.object({
    blockedItems: z.number().int().nonnegative(),
    commandCount: z.number().int().nonnegative(),
    nextAction: z.string(),
    ownerCount: z.number().int().nonnegative(),
    proofCount: z.number().int().nonnegative(),
    status: ReleaseUnblockStatusSchema,
  }),
});

export type ReleaseUnblockChecklistItem = z.infer<typeof ReleaseUnblockChecklistItemSchema>;
export type ReleaseUnblockChecklist = z.infer<typeof ReleaseUnblockChecklistSchema>;

type ReleaseUnblockConfig = {
  acceptance: string[];
  commands: string[];
  envKeys?: string[];
  proof: string[];
  secretPolicy?: string;
};

const releaseUnblockConfigs: Partial<Record<LaunchReadinessCheck['key'], ReleaseUnblockConfig>> = {
  cueValidationDataset: {
    acceptance: [
      'The cue-validation dataset uses consented climbing clips and real coach review rows.',
      'The dataset validator passes without template placeholders or local raw-video references.',
    ],
    commands: ['npm run validation:cue'],
    proof: ['docs/validation/cue-validation-dataset.json'],
  },
  easCredentials: {
    acceptance: [
      'Expo, App Store Connect, and Google Play credentials are available only in shell, CI, or EAS secret storage.',
      'Strict EAS release validation passes without committing secret values.',
    ],
    commands: ['npm run release:eas:strict'],
    envKeys: [
      'EXPO_TOKEN',
      'MOVEBETA_ASC_APP_ID',
      'MOVEBETA_APPLE_ID or ASC_API_KEY_ID + ASC_API_ISSUER_ID + ASC_API_KEY_P8_BASE64',
      'GOOGLE_SERVICE_ACCOUNT_JSON or GOOGLE_SERVICE_ACCOUNT_KEY_PATH or MOVEBETA_GOOGLE_SERVICE_ACCOUNT_JSON_BASE64',
    ],
    proof: ['CI/EAS secret configuration', 'Strict EAS validation output'],
    secretPolicy: 'Store credential values outside the repository; this checklist may list key names only.',
  },
  easProject: {
    acceptance: [
      'The app is initialized in the target Expo account.',
      'The generated EAS project id is present in app configuration before strict release checks run.',
    ],
    commands: ['npx eas-cli@latest init'],
    proof: ['app.json extra.eas.projectId'],
  },
  iosBuild: {
    acceptance: [
      'Full Xcode is installed on the release machine.',
      'An iOS simulator or physical-device build reaches the app shell with local analysis available.',
    ],
    commands: [
      'npx expo run:ios --device',
      'xcodebuild -workspace ios/MoveBeta.xcworkspace -scheme MoveBeta -configuration Debug -sdk iphonesimulator',
    ],
    proof: ['iOS simulator or device build log'],
  },
  nativeDeviceQa: {
    acceptance: [
      'Physical iOS and Android runs cover camera, import, latency, battery, thermal, and airplane-mode workflows.',
      'The native QA evidence validator passes with real measured values.',
    ],
    commands: ['npm run native:qa:runbook', 'npm run native:qa:validate'],
    proof: ['docs/sdlc/native-qa-evidence.json'],
  },
};

const defaultSecretPolicy = 'No secret values or raw local artifacts should be committed as proof.';

function tracksForCheck(
  checkKey: LaunchReadinessCheck['key'],
  tracks: LaunchReadinessTrack[],
): Array<z.infer<typeof LaunchTrackSchema>> {
  return tracks
    .filter((track) => track.checks.some((check) => check.key === checkKey))
    .map((track) => track.key);
}

export function buildReleaseUnblockChecklist(
  evidence: LaunchReadinessEvidence = defaultLaunchReadinessEvidence,
): ReleaseUnblockChecklist {
  const parsedEvidence = LaunchReadinessEvidenceSchema.parse(evidence);
  const launchReadiness = buildLaunchReadinessSummary(parsedEvidence);
  const configuredChecks = launchReadiness.tracks.flatMap((track) => track.checks);
  const itemsByKey = new Map<LaunchReadinessCheck['key'], ReleaseUnblockChecklistItem>();

  configuredChecks.forEach((check) => {
    const config = releaseUnblockConfigs[check.key];
    if (!config || check.status === 'ready' || itemsByKey.has(check.key)) return;

    itemsByKey.set(
      check.key,
      ReleaseUnblockChecklistItemSchema.parse({
        acceptance: config.acceptance,
        action: check.action,
        commands: config.commands,
        envKeys: config.envKeys ?? [],
        key: check.key,
        label: check.label,
        owner: check.owner,
        proof: config.proof,
        secretPolicy: config.secretPolicy ?? defaultSecretPolicy,
        status: check.status,
        tracks: tracksForCheck(check.key, launchReadiness.tracks),
      }),
    );
  });

  const items = Array.from(itemsByKey.values());
  const blockedItems = items.filter((item) => item.status === 'blocked').length;
  const commandCount = items.reduce((total, item) => total + item.commands.length, 0);
  const ownerCount = new Set(items.map((item) => item.owner)).size;
  const proofCount = items.reduce((total, item) => total + item.proof.length, 0);
  const firstItem = items[0];

  return ReleaseUnblockChecklistSchema.parse({
    items,
    schemaVersion: releaseUnblockChecklistSchemaVersion,
    summary: {
      blockedItems,
      commandCount,
      nextAction: firstItem?.action ?? 'All configured external release blockers are cleared.',
      ownerCount,
      proofCount,
      status: items.length === 0 ? 'ready' : 'needs-external-access',
    },
  });
}
