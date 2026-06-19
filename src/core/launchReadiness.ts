import { z } from 'zod';

export const LaunchTrackSchema = z.enum(['demo', 'internal', 'store']);
export const LaunchStatusSchema = z.enum(['ready', 'action', 'blocked']);
export const LaunchReadinessCheckKeySchema = z.enum([
  'releaseGate',
  'webSmoke',
  'privacyManifest',
  'storeListing',
  'androidDebugBuild',
  'iosPods',
  'modelReadiness',
  'modelAnalysisReplay',
  'nativeQaRunbook',
  'iosBuild',
  'nativeDeviceQa',
  'cueValidationDataset',
  'easProject',
  'easCredentials',
]);

export const LaunchReadinessEvidenceSchema = z.object({
  androidDebugBuild: z.boolean().optional(),
  cueValidationDataset: z.boolean().optional(),
  easCredentials: z.boolean().optional(),
  easProject: z.boolean().optional(),
  iosBuild: z.boolean().optional(),
  iosPods: z.boolean().optional(),
  modelReadiness: z.boolean().optional(),
  modelAnalysisReplay: z.boolean().optional(),
  nativeQaRunbook: z.boolean().optional(),
  nativeDeviceQa: z.boolean().optional(),
  privacyManifest: z.boolean().optional(),
  releaseGate: z.boolean().optional(),
  storeListing: z.boolean().optional(),
  webSmoke: z.boolean().optional(),
});

export const LaunchReadinessCheckSchema = z.object({
  action: z.string(),
  evidence: z.boolean(),
  key: LaunchReadinessCheckKeySchema,
  label: z.string(),
  owner: z.enum(['engineering', 'qa', 'product', 'release']),
  status: LaunchStatusSchema,
});

export const LaunchReadinessTrackSchema = z.object({
  action: z.string(),
  checks: z.array(LaunchReadinessCheckSchema),
  key: LaunchTrackSchema,
  label: z.string(),
  readyChecks: z.number().int().nonnegative(),
  requiredChecks: z.number().int().nonnegative(),
  status: LaunchStatusSchema,
  summary: z.string(),
});

export const LaunchReadinessSummarySchema = z.object({
  nextAction: z.string(),
  readyTracks: z.number().int().nonnegative(),
  status: LaunchStatusSchema,
  tracks: z.array(LaunchReadinessTrackSchema),
});

export type LaunchReadinessEvidence = z.infer<typeof LaunchReadinessEvidenceSchema>;
export type LaunchReadinessCheck = z.infer<typeof LaunchReadinessCheckSchema>;
export type LaunchReadinessTrack = z.infer<typeof LaunchReadinessTrackSchema>;
export type LaunchReadinessSummary = z.infer<typeof LaunchReadinessSummarySchema>;

type CheckDefinition = Omit<LaunchReadinessCheck, 'evidence' | 'status'> & {
  blockingForStore?: boolean;
};

const checkDefinitions: Record<z.infer<typeof LaunchReadinessCheckKeySchema>, CheckDefinition> = {
  androidDebugBuild: {
    action: 'Keep the Android custom development APK available for stakeholder testing.',
    key: 'androidDebugBuild',
    label: 'Android custom debug build',
    owner: 'engineering',
  },
  cueValidationDataset: {
    action: 'Run the versioned cue-validation dataset gate on real consented coach review data.',
    blockingForStore: true,
    key: 'cueValidationDataset',
    label: 'Real cue-validation dataset',
    owner: 'product',
  },
  easCredentials: {
    action: 'Provide Expo, App Store Connect, and Google Play credentials outside the repository.',
    blockingForStore: true,
    key: 'easCredentials',
    label: 'Store submission credentials',
    owner: 'release',
  },
  easProject: {
    action: 'Initialize the app on the target Expo account and store the generated project id in config.',
    blockingForStore: true,
    key: 'easProject',
    label: 'EAS project binding',
    owner: 'release',
  },
  iosBuild: {
    action: 'Install full Xcode and verify an iOS simulator or device build.',
    blockingForStore: true,
    key: 'iosBuild',
    label: 'iOS build verification',
    owner: 'engineering',
  },
  iosPods: {
    action: 'Keep CocoaPods install green for the local native pose module.',
    key: 'iosPods',
    label: 'iOS pods install',
    owner: 'engineering',
  },
  modelReadiness: {
    action: 'Run the MoveNet readiness report and keep local model load plus inference inside budget.',
    key: 'modelReadiness',
    label: 'MoveNet model readiness',
    owner: 'engineering',
  },
  modelAnalysisReplay: {
    action: 'Run the model-analysis replay and keep model-shaped cue evidence passing.',
    key: 'modelAnalysisReplay',
    label: 'Model-analysis replay',
    owner: 'engineering',
  },
  nativeDeviceQa: {
    action: 'Capture physical iOS and Android evidence for camera, import, latency, battery, thermal, and airplane mode.',
    blockingForStore: true,
    key: 'nativeDeviceQa',
    label: 'Native device QA evidence',
    owner: 'qa',
  },
  nativeQaRunbook: {
    action: 'Keep the generated native QA runbook ready for physical iOS and Android validation.',
    key: 'nativeQaRunbook',
    label: 'Native QA runbook',
    owner: 'qa',
  },
  privacyManifest: {
    action: 'Keep privacy declarations aligned with local-only analysis and export behavior.',
    key: 'privacyManifest',
    label: 'Privacy declarations',
    owner: 'product',
  },
  releaseGate: {
    action: 'Keep typecheck, tests, web export, EAS standard check, and high-severity audit passing.',
    key: 'releaseGate',
    label: 'Release gate',
    owner: 'engineering',
  },
  storeListing: {
    action: 'Keep listing copy and screenshots ready for app-store review.',
    key: 'storeListing',
    label: 'Store listing kit',
    owner: 'product',
  },
  webSmoke: {
    action: 'Keep the exported web bundle smoke-tested across mobile and desktop viewports.',
    key: 'webSmoke',
    label: 'Web preview smoke',
    owner: 'qa',
  },
};

const trackRequirements: Record<z.infer<typeof LaunchTrackSchema>, Array<z.infer<typeof LaunchReadinessCheckKeySchema>>> = {
  demo: ['releaseGate', 'webSmoke', 'privacyManifest', 'storeListing', 'modelReadiness', 'modelAnalysisReplay'],
  internal: [
    'releaseGate',
    'webSmoke',
    'androidDebugBuild',
    'iosPods',
    'modelReadiness',
    'modelAnalysisReplay',
    'nativeQaRunbook',
    'nativeDeviceQa',
  ],
  store: [
    'releaseGate',
    'webSmoke',
    'privacyManifest',
    'storeListing',
    'modelReadiness',
    'modelAnalysisReplay',
    'iosBuild',
    'nativeQaRunbook',
    'nativeDeviceQa',
    'cueValidationDataset',
    'easProject',
    'easCredentials',
  ],
};

const trackLabels: Record<z.infer<typeof LaunchTrackSchema>, string> = {
  demo: 'Stakeholder demo',
  internal: 'Internal native beta',
  store: 'Store submission',
};

export const defaultLaunchReadinessEvidence: LaunchReadinessEvidence = {
  androidDebugBuild: true,
  easCredentials: false,
  easProject: false,
  cueValidationDataset: false,
  iosBuild: false,
  iosPods: true,
  modelReadiness: true,
  modelAnalysisReplay: true,
  nativeQaRunbook: true,
  nativeDeviceQa: false,
  privacyManifest: true,
  releaseGate: true,
  storeListing: true,
  webSmoke: true,
};

function statusForCheck(definition: CheckDefinition, evidence: boolean): LaunchReadinessCheck['status'] {
  if (evidence) return 'ready';
  return definition.blockingForStore ? 'blocked' : 'action';
}

function statusForTrack(checks: LaunchReadinessCheck[]): LaunchReadinessTrack['status'] {
  if (checks.every((check) => check.status === 'ready')) return 'ready';
  if (checks.some((check) => check.status === 'blocked')) return 'blocked';
  return 'action';
}

function actionForTrack(status: LaunchReadinessTrack['status'], checks: LaunchReadinessCheck[]) {
  if (status === 'ready') return 'Ready to use this launch track.';
  return checks.find((check) => check.status !== 'ready')?.action ?? 'Complete the remaining launch checks.';
}

function summaryForTrack(label: string, readyChecks: number, requiredChecks: number, status: LaunchReadinessTrack['status']) {
  if (status === 'ready') return `${label} is ready with ${readyChecks}/${requiredChecks} checks complete.`;
  return `${label} has ${readyChecks}/${requiredChecks} checks complete.`;
}

function buildCheck(key: z.infer<typeof LaunchReadinessCheckKeySchema>, evidence: LaunchReadinessEvidence): LaunchReadinessCheck {
  const definition = checkDefinitions[key];
  const hasEvidence = evidence[key] === true;
  return LaunchReadinessCheckSchema.parse({
    ...definition,
    evidence: hasEvidence,
    status: statusForCheck(definition, hasEvidence),
  });
}

export function buildLaunchReadinessSummary(
  evidence: LaunchReadinessEvidence = defaultLaunchReadinessEvidence,
): LaunchReadinessSummary {
  const tracks = Object.entries(trackRequirements).map(([trackKey, keys]) => {
    const checks = keys.map((key) => buildCheck(key, evidence));
    const readyChecks = checks.filter((check) => check.status === 'ready').length;
    const status = statusForTrack(checks);
    const label = trackLabels[trackKey as z.infer<typeof LaunchTrackSchema>];

    return LaunchReadinessTrackSchema.parse({
      action: actionForTrack(status, checks),
      checks,
      key: trackKey,
      label,
      readyChecks,
      requiredChecks: checks.length,
      status,
      summary: summaryForTrack(label, readyChecks, checks.length, status),
    });
  });
  const readyTracks = tracks.filter((track) => track.status === 'ready').length;
  const firstBlockedOrAction = tracks.find((track) => track.status !== 'ready');

  return LaunchReadinessSummarySchema.parse({
    nextAction: firstBlockedOrAction?.action ?? 'All configured launch tracks are ready.',
    readyTracks,
    status: tracks.every((track) => track.status === 'ready')
      ? 'ready'
      : tracks.some((track) => track.status === 'blocked')
        ? 'blocked'
        : 'action',
    tracks,
  });
}
