import { nativeQaEvidenceBudgets } from './nativeQaEvidenceKit';
import {
  validateNativeQaEvidenceForApp,
  type NativeQaEvidencePayload,
  type NativeQaEvidenceRun,
  type NativeQaWorkflowStatus,
} from './nativeQaEvidenceValidation';

export const nativeQaEvidenceComposerSchemaVersion = 'movebeta.native-qa-evidence-composer.v1';

type NativeQaPlatform = (typeof nativeQaEvidenceBudgets.requiredPlatforms)[number];
type NativeQaWorkflow = (typeof nativeQaEvidenceBudgets.requiredWorkflows)[number];

export type NativeQaEvidenceComposerRun = {
  allWorkflowsPassed?: boolean;
  analysisSeconds?: number | string | null;
  batteryDropPct?: number | string | null;
  buildId?: string | null;
  clipDurationSeconds?: number | string | null;
  clipId?: string | null;
  deviceName?: string | null;
  osVersion?: string | null;
  platform: NativeQaPlatform;
  provider?: string | null;
  recordedAt?: string | null;
  source?: string | null;
  thermalState?: string | null;
  workflows?: Partial<Record<NativeQaWorkflow, NativeQaWorkflowStatus>> | null;
};

export type NativeQaEvidenceComposerInput = {
  appVersion?: string | null;
  generatedAt?: string | null;
  runs: NativeQaEvidenceComposerRun[];
};

export type NativeQaEvidenceComposerPreview = {
  action: string;
  badge: string;
  blockingChecks: number;
  payload: NativeQaEvidencePayload;
  payloadJson: string;
  readyRuns: number;
  schemaVersion: typeof nativeQaEvidenceComposerSchemaVersion;
  status: 'blocked' | 'ready';
  totalRuns: number;
};

function optionalText(value: string | null | undefined) {
  const trimmed = value?.trim();
  return trimmed && trimmed.length > 0 ? trimmed : undefined;
}

function secondsToMs(value: number | string | null | undefined) {
  const numeric = typeof value === 'string' ? Number(value.replace(',', '.')) : Number(value);
  return Number.isFinite(numeric) && numeric > 0 ? Math.round(numeric * 1000) : null;
}

function optionalNumber(value: number | string | null | undefined) {
  const numeric = typeof value === 'string' ? Number(value.replace(',', '.')) : Number(value);
  return Number.isFinite(numeric) ? numeric : null;
}

function workflowMap(run: NativeQaEvidenceComposerRun) {
  if (run.workflows) return run.workflows;

  return Object.fromEntries(
    nativeQaEvidenceBudgets.requiredWorkflows.map((workflow) => [workflow, run.allWorkflowsPassed ? 'pass' : 'pending']),
  ) as Record<NativeQaWorkflow, NativeQaWorkflowStatus>;
}

export function composeNativeQaEvidence(input: NativeQaEvidenceComposerInput): NativeQaEvidencePayload {
  const generatedAt = optionalText(input.generatedAt) ?? new Date(0).toISOString();

  return {
    appVersion: optionalText(input.appVersion) ?? '1.0.0',
    generatedAt,
    runs: input.runs.map<NativeQaEvidenceRun>((run) => ({
      buildId: optionalText(run.buildId),
      clip: {
        durationMs: secondsToMs(run.clipDurationSeconds),
        id: optionalText(run.clipId),
        source: optionalText(run.source) ?? 'camera',
      },
      deviceName: optionalText(run.deviceName),
      osVersion: optionalText(run.osVersion),
      performance: {
        analysisMs: secondsToMs(run.analysisSeconds),
        batteryDropPct: optionalNumber(run.batteryDropPct),
        thermalState: optionalText(run.thermalState),
      },
      platform: run.platform,
      provider: optionalText(run.provider) ?? 'native-platform-pose',
      recordedAt: optionalText(run.recordedAt) ?? generatedAt,
      workflows: workflowMap(run),
    })),
  };
}

export function buildNativeQaEvidenceComposerPreview(input: NativeQaEvidenceComposerInput): NativeQaEvidenceComposerPreview {
  const payload = composeNativeQaEvidence(input);
  const validation = validateNativeQaEvidenceForApp(payload);
  const readyRuns = validation.runSummaries.filter((run) => run.status === 'pass').length;

  return {
    action: validation.ready
      ? 'Composed native QA evidence is ready for the release validator.'
      : 'Fill real device values, mark only passed workflows, and keep raw video references out of the evidence.',
    badge: validation.ready ? 'Ready' : 'Blocked',
    blockingChecks: validation.failedChecks.length,
    payload,
    payloadJson: JSON.stringify(payload, null, 2),
    readyRuns,
    schemaVersion: nativeQaEvidenceComposerSchemaVersion,
    status: validation.ready ? 'ready' : 'blocked',
    totalRuns: validation.runSummaries.length,
  };
}
