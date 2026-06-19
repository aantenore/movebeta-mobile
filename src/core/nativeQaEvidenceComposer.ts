import { nativeQaEvidenceBudgets } from './nativeQaEvidenceKit';
import {
  validateNativeQaEvidenceForApp,
  type NativeQaEvidencePayload,
  type NativeQaEvidenceRun,
  type NativeQaWorkflowStatus,
} from './nativeQaEvidenceValidation';

export const nativeQaEvidenceComposerSchemaVersion = 'movebeta.native-qa-evidence-composer.v1';
export const nativeQaEvidenceComposerExportSchemaVersion = 'movebeta.native-qa-evidence-composer-export.v1';

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

export type NativeQaEvidenceComposerExport = {
  generatedAt: string;
  payload: NativeQaEvidencePayload;
  privacy: {
    credentialValuesIncluded: false;
    localPathsIncluded: false;
    rawArtifactsIncluded: false;
    rawVideoIncluded: false;
    secretsIncluded: false;
  };
  schemaVersion: typeof nativeQaEvidenceComposerExportSchemaVersion;
  summary: {
    blockingChecks: number;
    readyRuns: number;
    status: NativeQaEvidenceComposerPreview['status'];
    totalRuns: number;
  };
};

const forbiddenComposerExportPattern =
  /(file:\/\/|content:\/\/|asset:\/\/|ph:\/\/|\/Users\/|\/private\/|\/var\/mobile\/|[A-Za-z]:\\|\.mov\b|\.mp4\b|BEGIN PRIVATE KEY|ghp_[A-Za-z0-9_]+|pat_[A-Za-z0-9_]+|sk_live_[A-Za-z0-9_]+|sk_test_[A-Za-z0-9_]+|eyJ[A-Za-z0-9_-]{20,})/i;

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

function containsForbiddenComposerExportValue(value: unknown): boolean {
  if (typeof value === 'string') return forbiddenComposerExportPattern.test(value);
  if (Array.isArray(value)) return value.some(containsForbiddenComposerExportValue);
  if (value && typeof value === 'object') return Object.values(value).some(containsForbiddenComposerExportValue);
  return false;
}

export function assertNativeQaEvidenceComposerExportIsShareSafe(packet: NativeQaEvidenceComposerExport) {
  if (containsForbiddenComposerExportValue(packet)) {
    throw new Error('Native QA evidence export contains a raw artifact, local path, credential, or token-like value.');
  }
  return packet;
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

export function buildNativeQaEvidenceComposerExport({
  generatedAt = new Date().toISOString(),
  preview,
}: {
  generatedAt?: string;
  preview: NativeQaEvidenceComposerPreview;
}): NativeQaEvidenceComposerExport {
  return assertNativeQaEvidenceComposerExportIsShareSafe({
    generatedAt,
    payload: preview.payload,
    privacy: {
      credentialValuesIncluded: false,
      localPathsIncluded: false,
      rawArtifactsIncluded: false,
      rawVideoIncluded: false,
      secretsIncluded: false,
    },
    schemaVersion: nativeQaEvidenceComposerExportSchemaVersion,
    summary: {
      blockingChecks: preview.blockingChecks,
      readyRuns: preview.readyRuns,
      status: preview.status,
      totalRuns: preview.totalRuns,
    },
  });
}
