import { nativeQaEvidenceBudgets } from './nativeQaEvidenceKit';

export type NativeQaEvidenceCheckStatus = 'fail' | 'pass';
export type NativeQaWorkflowStatus = 'fail' | 'pass' | 'pending';

export type NativeQaEvidenceRun = {
  buildId?: string | null;
  clip?: {
    durationMs?: number | null;
    id?: string | null;
    source?: string | null;
  } | null;
  deviceName?: string | null;
  notes?: string | null;
  osVersion?: string | null;
  performance?: {
    analysisMs?: number | null;
    batteryDropPct?: number | null;
    thermalState?: string | null;
  } | null;
  platform?: string | null;
  provider?: string | null;
  recordedAt?: string | null;
  workflows?: Partial<Record<(typeof nativeQaEvidenceBudgets.requiredWorkflows)[number], NativeQaWorkflowStatus>> | null;
};

export type NativeQaEvidencePayload = {
  appVersion?: string | null;
  generatedAt?: string | null;
  runs?: NativeQaEvidenceRun[] | null;
};

export type NativeQaEvidenceCheck = {
  detail: string;
  id: string;
  label: string;
  status: NativeQaEvidenceCheckStatus;
};

export type NativeQaEvidenceRunSummary = {
  failedChecks: number;
  firstIssue?: string;
  passedChecks: number;
  platform: string;
  status: NativeQaEvidenceCheckStatus;
  totalChecks: number;
};

function pass(id: string, label: string, detail: string): NativeQaEvidenceCheck {
  return { detail, id, label, status: 'pass' };
}

function fail(id: string, label: string, detail: string): NativeQaEvidenceCheck {
  return { detail, id, label, status: 'fail' };
}

function hasText(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

function looksLikePlaceholder(value: string) {
  return (
    /^(android|ios)-real-climbing-clip-id$/i.test(value.trim()) ||
    /placeholder|replace|device name|android version|ios version|internal-build-id|real-climbing-clip-id/i.test(value)
  );
}

function hasRealText(value: unknown) {
  return hasText(value) && !looksLikePlaceholder(value);
}

function latencyBudget(durationMs: number) {
  return (
    nativeQaEvidenceBudgets.maxLatencyByClipMs.find((budget) => durationMs <= budget.maxClipDurationMs) ??
    nativeQaEvidenceBudgets.maxLatencyByClipMs[nativeQaEvidenceBudgets.maxLatencyByClipMs.length - 1]
  );
}

function forbiddenArtifactMatches(value: unknown, path: string[] = []): string[] {
  if (value == null) return [];
  if (typeof value === 'string') {
    return /(file|content|asset|ph):\/\/|\/Users\/|\/var\/mobile\/|[A-Za-z]:\\|\.mov\b|\.mp4\b/i.test(value)
      ? [`${path.join('.') || 'value'} contains a raw local artifact reference.`]
      : [];
  }
  if (Array.isArray(value)) {
    return value.flatMap((item, index) => forbiddenArtifactMatches(item, [...path, String(index)]));
  }
  if (typeof value === 'object') {
    return Object.entries(value).flatMap(([key, item]) => {
      const keyIssue = /rawVideo|raw_video|videoUri|video_uri|fileUri|file_uri|localPath|local_path|secret|token|apiKey|password/i.test(
        key,
      )
        ? [`${[...path, key].join('.')} is not allowed in native QA evidence.`]
        : [];
      return [...keyIssue, ...forbiddenArtifactMatches(item, [...path, key])];
    });
  }
  return [];
}

function validateRun(run: NativeQaEvidenceRun, index: number) {
  const checks: NativeQaEvidenceCheck[] = [];
  const prefix = `run-${index + 1}`;

  checks.push(
    nativeQaEvidenceBudgets.requiredPlatforms.includes(run.platform as never)
      ? pass(`${prefix}-platform`, 'Platform', String(run.platform))
      : fail(`${prefix}-platform`, 'Platform', 'Run platform must be android or ios.'),
  );

  checks.push(
    hasRealText(run.deviceName) && hasRealText(run.osVersion) && hasRealText(run.buildId)
      ? pass(`${prefix}-device`, 'Device identity', `${run.deviceName} · ${run.osVersion} · ${run.buildId}`)
      : fail(`${prefix}-device`, 'Device identity', 'Real device name, OS version, and build id are required; placeholders are rejected.'),
  );

  checks.push(
    hasText(run.provider)
      ? pass(`${prefix}-provider`, 'Pose provider', String(run.provider))
      : fail(`${prefix}-provider`, 'Pose provider', 'Provider id is required.'),
  );

  checks.push(
    run.clip && hasRealText(run.clip.id) && Number.isFinite(run.clip.durationMs) && Number(run.clip.durationMs) > 0
      ? pass(`${prefix}-clip`, 'Clip evidence', `${run.clip.id} · ${run.clip.durationMs}ms`)
      : fail(`${prefix}-clip`, 'Clip evidence', 'A real clip id and positive duration are required; placeholders are rejected.'),
  );

  for (const workflow of nativeQaEvidenceBudgets.requiredWorkflows) {
    const status = run.workflows?.[workflow];
    checks.push(
      status === 'pass'
        ? pass(`${prefix}-${workflow}`, workflow, 'pass')
        : fail(`${prefix}-${workflow}`, workflow, `${workflow} must pass on device.`),
    );
  }

  const budget = latencyBudget(Number(run.clip?.durationMs ?? 0));
  checks.push(
    Number.isFinite(run.performance?.analysisMs) && Number(run.performance?.analysisMs) <= budget.maxAnalysisMs
      ? pass(`${prefix}-latency`, 'Analysis latency', `${run.performance?.analysisMs}ms <= ${budget.maxAnalysisMs}ms`)
      : fail(`${prefix}-latency`, 'Analysis latency', `Analysis must complete within ${budget.maxAnalysisMs}ms.`),
  );

  checks.push(
    Number.isFinite(run.performance?.batteryDropPct) &&
      Number(run.performance?.batteryDropPct) <= nativeQaEvidenceBudgets.maxBatteryDropPct
      ? pass(`${prefix}-battery`, 'Battery delta', `${run.performance?.batteryDropPct}%`)
      : fail(`${prefix}-battery`, 'Battery delta', `Battery drop must be <= ${nativeQaEvidenceBudgets.maxBatteryDropPct}% for the run.`),
  );

  checks.push(
    nativeQaEvidenceBudgets.passingThermalStates.includes(run.performance?.thermalState as never)
      ? pass(`${prefix}-thermal`, 'Thermal state', String(run.performance?.thermalState))
      : fail(`${prefix}-thermal`, 'Thermal state', 'Thermal state must be nominal or fair.'),
  );

  return checks;
}

function summarizeRun(run: NativeQaEvidenceRun, index: number, checks: NativeQaEvidenceCheck[]): NativeQaEvidenceRunSummary {
  const prefix = `run-${index + 1}`;
  const runChecks = checks.filter((check) => check.id.startsWith(prefix));
  const failedChecks = runChecks.filter((check) => check.status === 'fail');

  return {
    failedChecks: failedChecks.length,
    firstIssue: failedChecks[0]?.detail,
    passedChecks: runChecks.length - failedChecks.length,
    platform: run.platform ?? `run-${index + 1}`,
    status: failedChecks.length === 0 ? 'pass' : 'fail',
    totalChecks: runChecks.length,
  };
}

export function validateNativeQaEvidenceForApp(evidence: NativeQaEvidencePayload) {
  const runs = Array.isArray(evidence.runs) ? evidence.runs : [];
  const checks: NativeQaEvidenceCheck[] = [];

  checks.push(
    hasText(evidence.appVersion) && hasText(evidence.generatedAt)
      ? pass('evidence-header', 'Evidence header', `${evidence.appVersion} · ${evidence.generatedAt}`)
      : fail('evidence-header', 'Evidence header', 'appVersion and generatedAt are required.'),
  );

  const forbiddenArtifacts = forbiddenArtifactMatches(evidence);
  checks.push(
    forbiddenArtifacts.length === 0
      ? pass('privacy-artifacts', 'Raw artifact exclusion', 'No raw video, URI, path, or secret-like fields detected.')
      : fail('privacy-artifacts', 'Raw artifact exclusion', forbiddenArtifacts[0]),
  );

  for (const platform of nativeQaEvidenceBudgets.requiredPlatforms) {
    checks.push(
      runs.some((run) => run.platform === platform)
        ? pass(`platform-${platform}`, `${platform} coverage`, 'At least one run recorded.')
        : fail(`platform-${platform}`, `${platform} coverage`, 'At least one run is required before store submission.'),
    );
  }

  runs.forEach((run, index) => {
    checks.push(...validateRun(run, index));
  });

  const failedChecks = checks.filter((check) => check.status === 'fail');

  return {
    checks,
    failedChecks,
    ready: failedChecks.length === 0,
    runSummaries: runs.map((run, index) => summarizeRun(run, index, checks)),
  };
}

export function buildNativeQaEvidenceDraft({
  appVersion = '1.0.0',
  generatedAt = 'pending-real-device-run',
}: {
  appVersion?: string;
  generatedAt?: string;
} = {}): NativeQaEvidencePayload {
  return {
    appVersion,
    generatedAt,
    runs: nativeQaEvidenceBudgets.requiredPlatforms.map((platform) => ({
      buildId: 'replace-with-internal-build-id',
      clip: {
        durationMs: 10_000,
        id: `${platform}-real-climbing-clip-id`,
        source: 'camera',
      },
      deviceName: `replace-with-${platform}-device-name`,
      osVersion: `replace-with-${platform}-os-version`,
      performance: {
        analysisMs: null,
        batteryDropPct: null,
        thermalState: null,
      },
      platform,
      provider: 'native-platform-pose',
      recordedAt: generatedAt,
      workflows: Object.fromEntries(nativeQaEvidenceBudgets.requiredWorkflows.map((workflow) => [workflow, 'pending'])),
    })),
  };
}
