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
} from './launchReadiness';
import {
  buildReleaseUnblockChecklist,
  type ReleaseUnblockChecklist,
  type ReleaseUnblockChecklistItem,
} from './releaseUnblockChecklist';

export const releaseCriticalPathSchemaVersion = 'movebeta.release-critical-path.v1';

const ReleaseCriticalPathLaneSchema = z.enum(['real-world-validation', 'native-build-qa', 'store-accounts']);
const ReleaseCriticalPathStatusSchema = z.enum(['blocked', 'ready', 'ready-to-start']);

export const ReleaseCriticalPathStepSchema = z.object({
  acceptance: z.array(z.string()).min(1),
  action: z.string(),
  blockedBy: z.array(LaunchReadinessCheckKeySchema),
  commands: z.array(z.string()).min(1),
  dependencyKeys: z.array(LaunchReadinessCheckKeySchema),
  key: LaunchReadinessCheckKeySchema,
  label: z.string(),
  lane: ReleaseCriticalPathLaneSchema,
  owner: z.enum(['engineering', 'qa', 'product', 'release']),
  proof: z.array(z.string()).min(1),
  sequence: z.number().int().positive(),
  status: ReleaseCriticalPathStatusSchema,
  tracks: z.array(LaunchTrackSchema).min(1),
});

export const ReleaseCriticalPathSchema = z.object({
  generatedAt: z.string(),
  privacy: z.object({
    credentialValuesIncluded: z.literal(false),
    localPathsIncluded: z.literal(false),
    rawArtifactsIncluded: z.literal(false),
    rawVideoIncluded: z.literal(false),
    tokenLikeValuesIncluded: z.literal(false),
  }),
  schemaVersion: z.literal(releaseCriticalPathSchemaVersion),
  steps: z.array(ReleaseCriticalPathStepSchema),
  summary: z.object({
    blockedSteps: z.number().int().nonnegative(),
    criticalChainLength: z.number().int().nonnegative(),
    laneCount: z.number().int().nonnegative(),
    nextAction: z.string(),
    readySteps: z.number().int().nonnegative(),
    readyToStartSteps: z.number().int().nonnegative(),
    status: z.enum(['blocked', 'ready']),
    stepCount: z.number().int().nonnegative(),
    trackCount: z.number().int().positive(),
  }),
});

export type ReleaseCriticalPath = z.infer<typeof ReleaseCriticalPathSchema>;
export type ReleaseCriticalPathStep = z.infer<typeof ReleaseCriticalPathStepSchema>;

type CriticalPathKey = Extract<
  LaunchReadinessCheck['key'],
  'cueValidationDataset' | 'easCredentials' | 'easProject' | 'iosBuild' | 'nativeDeviceQa'
>;

type CriticalPathConfig = {
  acceptance: string[];
  commands: string[];
  dependencies: CriticalPathKey[];
  lane: z.infer<typeof ReleaseCriticalPathLaneSchema>;
  proof: string[];
};

const criticalPathOrder: CriticalPathKey[] = [
  'cueValidationDataset',
  'iosBuild',
  'nativeDeviceQa',
  'easProject',
  'easCredentials',
];

const criticalPathConfigs: Record<CriticalPathKey, CriticalPathConfig> = {
  cueValidationDataset: {
    acceptance: [
      'Real consented coach review rows are composed into the cue-validation dataset.',
      'Cue-validation dataset doctor reports ready without raw artifacts or reviewer identities.',
    ],
    commands: ['npm run validation:cue', 'npm run validation:cue:doctor'],
    dependencies: [],
    lane: 'real-world-validation',
    proof: ['docs/validation/cue-validation-dataset.json', 'docs/sdlc/cue-validation-dataset-report.json'],
  },
  easCredentials: {
    acceptance: [
      'Expo, App Store Connect, and Google Play credential groups are available outside the repository.',
      'Strict EAS release gate passes without committing credential values.',
    ],
    commands: ['npm run release:credentials:doctor', 'npm run release:eas:strict'],
    dependencies: ['easProject'],
    lane: 'store-accounts',
    proof: ['docs/sdlc/store-credentials-report.json', 'Strict EAS validation output'],
  },
  easProject: {
    acceptance: [
      'The app is initialized on the target Expo account.',
      'The generated EAS project id is stored in app config.',
    ],
    commands: ['npx eas-cli@latest init', 'npm run release:credentials:doctor'],
    dependencies: [],
    lane: 'store-accounts',
    proof: ['app.json extra.eas.projectId', 'docs/sdlc/store-credentials-report.json'],
  },
  iosBuild: {
    acceptance: [
      'Full Xcode is installed and selected.',
      'The iOS workspace, Pods, and build-settings probe pass before physical iOS QA.',
    ],
    commands: ['npm run native:ios:doctor', 'npx expo run:ios --device'],
    dependencies: [],
    lane: 'native-build-qa',
    proof: ['docs/sdlc/ios-toolchain-report.json', 'iOS simulator or device build log'],
  },
  nativeDeviceQa: {
    acceptance: [
      'Physical iOS and Android runs cover camera, import, latency, battery, thermal, and airplane-mode workflows.',
      'Native QA evidence validator passes with measured values and no raw local artifacts.',
    ],
    commands: ['npm run native:qa:runbook', 'npm run native:qa:starter', 'npm run native:qa:validate'],
    dependencies: ['iosBuild'],
    lane: 'native-build-qa',
    proof: ['docs/sdlc/native-qa-evidence.json'],
  },
};

const forbiddenCriticalPathValuePattern =
  /(file:\/\/|content:\/\/|asset:\/\/|ph:\/\/|\/Users\/|\/private\/|\/var\/mobile\/|[A-Za-z]:\\|\.mov\b|\.mp4\b|BEGIN PRIVATE KEY|ghp_[A-Za-z0-9_]+|github_pat_[A-Za-z0-9_]+|pat_[A-Za-z0-9_]+|sk_live_[A-Za-z0-9_]+|sk_test_[A-Za-z0-9_]+|bearer\s+[A-Za-z0-9._-]+|eyJ[A-Za-z0-9_-]{20,})/i;

function containsForbiddenValue(value: unknown): boolean {
  if (typeof value === 'string') return forbiddenCriticalPathValuePattern.test(value);
  if (Array.isArray(value)) return value.some(containsForbiddenValue);
  if (value && typeof value === 'object') return Object.values(value).some(containsForbiddenValue);
  return false;
}

function checklistByKey(checklist: ReleaseUnblockChecklist) {
  return new Map(checklist.items.map((item) => [item.key, item]));
}

function checkByKey(evidence: LaunchReadinessEvidence) {
  return new Map(
    buildLaunchReadinessSummary(evidence)
      .tracks.flatMap((track) => track.checks)
      .map((check) => [check.key, check]),
  );
}

function tracksForCheck(key: CriticalPathKey, evidence: LaunchReadinessEvidence) {
  return buildLaunchReadinessSummary(evidence).tracks
    .filter((track) => track.checks.some((check) => check.key === key))
    .map((track) => track.key);
}

function dependencyDepth(key: CriticalPathKey): number {
  const dependencies = criticalPathConfigs[key].dependencies;
  if (dependencies.length === 0) return 1;
  return 1 + Math.max(...dependencies.map(dependencyDepth));
}

function stepStatus(
  key: CriticalPathKey,
  check: LaunchReadinessCheck | undefined,
  evidence: LaunchReadinessEvidence,
): z.infer<typeof ReleaseCriticalPathStatusSchema> {
  if (check?.status === 'ready') return 'ready';
  const blockedDependencies = criticalPathConfigs[key].dependencies.filter((dependencyKey) => evidence[dependencyKey] !== true);
  return blockedDependencies.length === 0 ? 'ready-to-start' : 'blocked';
}

function fallbackAction(check?: LaunchReadinessCheck) {
  return check?.action ?? 'Complete this external release blocker before promotion.';
}

function fromChecklistOrConfig(
  key: CriticalPathKey,
  checklistItem: ReleaseUnblockChecklistItem | undefined,
): Pick<ReleaseCriticalPathStep, 'acceptance' | 'commands' | 'proof'> {
  const config = criticalPathConfigs[key];
  return {
    acceptance: checklistItem?.acceptance ?? config.acceptance,
    commands: checklistItem?.commands.length ? checklistItem.commands : config.commands,
    proof: checklistItem?.proof.length ? checklistItem.proof : config.proof,
  };
}

function nextActionFor(steps: ReleaseCriticalPathStep[]) {
  const readyToStart = steps.find((step) => step.status === 'ready-to-start');
  if (readyToStart) return `${readyToStart.owner}: ${readyToStart.action}`;

  const blocked = steps.find((step) => step.status === 'blocked');
  if (blocked) {
    return `${blocked.owner}: wait for ${blocked.blockedBy.join(', ')} before ${blocked.label}.`;
  }

  return 'All release critical-path steps are ready.';
}

export function assertReleaseCriticalPathIsShareSafe(packet: ReleaseCriticalPath) {
  if (containsForbiddenValue(packet)) {
    throw new Error('Release critical path contains credential values, local paths, raw artifacts, raw video references, or token-like data.');
  }
  return packet;
}

export function buildReleaseCriticalPath({
  checklist,
  evidence = defaultLaunchReadinessEvidence,
  generatedAt = new Date().toISOString(),
}: {
  checklist?: ReleaseUnblockChecklist;
  evidence?: LaunchReadinessEvidence;
  generatedAt?: string;
} = {}): ReleaseCriticalPath {
  const parsedEvidence = LaunchReadinessEvidenceSchema.parse(evidence);
  const nextChecklist = checklist ?? buildReleaseUnblockChecklist(parsedEvidence);
  const checklistItems = checklistByKey(nextChecklist);
  const checks = checkByKey(parsedEvidence);

  const steps = criticalPathOrder.map((key, index) => {
    const check = checks.get(key);
    const checklistItem = checklistItems.get(key);
    const config = criticalPathConfigs[key];
    const blockedBy = config.dependencies.filter((dependencyKey) => parsedEvidence[dependencyKey] !== true);
    const configured = fromChecklistOrConfig(key, checklistItem);

    return ReleaseCriticalPathStepSchema.parse({
      ...configured,
      action: checklistItem?.action ?? fallbackAction(check),
      blockedBy,
      dependencyKeys: config.dependencies,
      key,
      label: check?.label ?? checklistItem?.label ?? key,
      lane: config.lane,
      owner: check?.owner ?? checklistItem?.owner ?? 'release',
      sequence: index + 1,
      status: stepStatus(key, check, parsedEvidence),
      tracks: tracksForCheck(key, parsedEvidence),
    });
  });

  const readySteps = steps.filter((step) => step.status === 'ready').length;
  const readyToStartSteps = steps.filter((step) => step.status === 'ready-to-start').length;
  const blockedSteps = steps.filter((step) => step.status === 'blocked').length;
  const launchReadiness = buildLaunchReadinessSummary(parsedEvidence);
  const packet = ReleaseCriticalPathSchema.parse({
    generatedAt,
    privacy: {
      credentialValuesIncluded: false,
      localPathsIncluded: false,
      rawArtifactsIncluded: false,
      rawVideoIncluded: false,
      tokenLikeValuesIncluded: false,
    },
    schemaVersion: releaseCriticalPathSchemaVersion,
    steps,
    summary: {
      blockedSteps,
      criticalChainLength: Math.max(...criticalPathOrder.map(dependencyDepth)),
      laneCount: new Set(steps.map((step) => step.lane)).size,
      nextAction: nextActionFor(steps),
      readySteps,
      readyToStartSteps,
      status: readySteps === steps.length ? 'ready' : 'blocked',
      stepCount: steps.length,
      trackCount: launchReadiness.tracks.length,
    },
  });

  return assertReleaseCriticalPathIsShareSafe(packet);
}
