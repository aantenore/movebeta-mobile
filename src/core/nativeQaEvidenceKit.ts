export const nativeQaEvidenceKitSchemaVersion = 'movebeta.native-qa-evidence-kit.v1';

export const nativeQaEvidenceBudgets = {
  maxBatteryDropPct: 4,
  maxLatencyByClipMs: [
    { maxAnalysisMs: 8_000, maxClipDurationMs: 10_000 },
    { maxAnalysisMs: 25_000, maxClipDurationMs: 45_000 },
    { maxAnalysisMs: 35_000, maxClipDurationMs: 60_000 },
  ],
  passingThermalStates: ['nominal', 'fair'],
  requiredPlatforms: ['android', 'ios'],
  requiredWorkflows: [
    'cameraPermission',
    'recordVideo',
    'mutedRecording',
    'metadataRead',
    'importVideo',
    'airplaneModeAnalysis',
    'deleteReport',
  ],
} as const;

type NativeQaWorkflowKey = (typeof nativeQaEvidenceBudgets.requiredWorkflows)[number];
type NativeQaPlatformKey = (typeof nativeQaEvidenceBudgets.requiredPlatforms)[number];

const workflowCopy: Record<NativeQaWorkflowKey, { evidence: string; label: string }> = {
  airplaneModeAnalysis: {
    evidence: 'Report generated from a local camera or import clip while airplane mode is enabled.',
    label: 'Airplane-mode analysis',
  },
  cameraPermission: {
    evidence: 'Camera permission flow completes without requesting audio access.',
    label: 'Camera permission',
  },
  deleteReport: {
    evidence: 'Report deletion removes the related private log, practice log, and consent record.',
    label: 'Delete report',
  },
  importVideo: {
    evidence: 'Imported local clip reaches preview, intake checks, and local analysis.',
    label: 'Import video',
  },
  metadataRead: {
    evidence: 'Native duration and dimensions are recorded for camera and import clips.',
    label: 'Native metadata read',
  },
  mutedRecording: {
    evidence: 'Recorded clip is muted and no microphone permission appears.',
    label: 'Muted recording',
  },
  recordVideo: {
    evidence: 'Camera recording creates a local clip that reaches analysis.',
    label: 'Record video',
  },
};

const platformLabels: Record<NativeQaPlatformKey, string> = {
  android: 'Android physical device',
  ios: 'iOS physical device',
};

export function buildNativeQaEvidenceKit() {
  const workflows = nativeQaEvidenceBudgets.requiredWorkflows.map((key, index) => ({
    evidence: workflowCopy[key].evidence,
    key,
    label: workflowCopy[key].label,
    order: index + 1,
  }));
  const platforms = nativeQaEvidenceBudgets.requiredPlatforms.map((key) => ({
    key,
    label: platformLabels[key],
    requiredWorkflows: workflows,
  }));

  return {
    evidenceFile: 'docs/sdlc/native-qa-evidence.json',
    placeholderPolicy: 'Template placeholders are rejected by the native QA validator.',
    platforms,
    schemaVersion: nativeQaEvidenceKitSchemaVersion,
    summary: {
      action: 'Capture one Android and one iOS physical-device run before internal beta or store submission.',
      requiredRuns: nativeQaEvidenceBudgets.requiredPlatforms.length,
      status: 'blocked-until-real-device-evidence',
      workflowCountPerPlatform: nativeQaEvidenceBudgets.requiredWorkflows.length,
    },
    validationCommand: 'npm run native:qa:validate',
    budgets: {
      maxBatteryDropPct: nativeQaEvidenceBudgets.maxBatteryDropPct,
      maxLatencyByClipMs: nativeQaEvidenceBudgets.maxLatencyByClipMs,
      passingThermalStates: nativeQaEvidenceBudgets.passingThermalStates,
    },
  };
}
