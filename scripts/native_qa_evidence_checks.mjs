export const nativeQaBudgets = {
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
};

function pass(id, label, detail) {
  return { detail, id, label, status: 'pass' };
}

function fail(id, label, detail) {
  return { detail, id, label, status: 'fail' };
}

function forbiddenArtifactMatches(value, path = []) {
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
      const keyIssue = /rawVideo|raw_video|videoUri|video_uri|fileUri|file_uri|localPath|local_path|secret|token|apiKey|password/i.test(key)
        ? [`${[...path, key].join('.')} is not allowed in native QA evidence.`]
        : [];
      return [...keyIssue, ...forbiddenArtifactMatches(item, [...path, key])];
    });
  }
  return [];
}

function latencyBudget(durationMs) {
  return (
    nativeQaBudgets.maxLatencyByClipMs.find((budget) => durationMs <= budget.maxClipDurationMs) ??
    nativeQaBudgets.maxLatencyByClipMs[nativeQaBudgets.maxLatencyByClipMs.length - 1]
  );
}

function hasText(value) {
  return typeof value === 'string' && value.trim().length > 0;
}

function looksLikePlaceholder(value) {
  return /^(android|ios)-real-climbing-clip-id$/i.test(value.trim()) || /placeholder|replace|device name|android version|ios version|internal-build-id|real-climbing-clip-id/i.test(value);
}

function hasRealText(value) {
  return hasText(value) && !looksLikePlaceholder(value);
}

function validateRun(run, index) {
  const checks = [];
  const prefix = `run-${index + 1}`;

  checks.push(
    nativeQaBudgets.requiredPlatforms.includes(run.platform)
      ? pass(`${prefix}-platform`, 'Platform', run.platform)
      : fail(`${prefix}-platform`, 'Platform', 'Run platform must be android or ios.'),
  );

  checks.push(
    hasRealText(run.deviceName) && hasRealText(run.osVersion) && hasRealText(run.buildId)
      ? pass(`${prefix}-device`, 'Device identity', `${run.deviceName} · ${run.osVersion} · ${run.buildId}`)
      : fail(`${prefix}-device`, 'Device identity', 'Real device name, OS version, and build id are required; placeholders are rejected.'),
  );

  checks.push(
    hasText(run.provider)
      ? pass(`${prefix}-provider`, 'Pose provider', run.provider)
      : fail(`${prefix}-provider`, 'Pose provider', 'Provider id is required.'),
  );

  checks.push(
    run.clip && hasRealText(run.clip.id) && Number.isFinite(run.clip.durationMs) && run.clip.durationMs > 0
      ? pass(`${prefix}-clip`, 'Clip evidence', `${run.clip.id} · ${run.clip.durationMs}ms`)
      : fail(`${prefix}-clip`, 'Clip evidence', 'A real clip id and positive duration are required; placeholders are rejected.'),
  );

  for (const workflow of nativeQaBudgets.requiredWorkflows) {
    const status = run.workflows?.[workflow];
    checks.push(
      status === 'pass'
        ? pass(`${prefix}-${workflow}`, workflow, 'pass')
        : fail(`${prefix}-${workflow}`, workflow, `${workflow} must pass on device.`),
    );
  }

  const budget = latencyBudget(run.clip?.durationMs ?? 0);
  checks.push(
    Number.isFinite(run.performance?.analysisMs) && run.performance.analysisMs <= budget.maxAnalysisMs
      ? pass(`${prefix}-latency`, 'Analysis latency', `${run.performance.analysisMs}ms <= ${budget.maxAnalysisMs}ms`)
      : fail(`${prefix}-latency`, 'Analysis latency', `Analysis must complete within ${budget.maxAnalysisMs}ms.`),
  );

  checks.push(
    Number.isFinite(run.performance?.batteryDropPct) && run.performance.batteryDropPct <= nativeQaBudgets.maxBatteryDropPct
      ? pass(`${prefix}-battery`, 'Battery delta', `${run.performance.batteryDropPct}%`)
      : fail(`${prefix}-battery`, 'Battery delta', `Battery drop must be <= ${nativeQaBudgets.maxBatteryDropPct}% for the run.`),
  );

  checks.push(
    nativeQaBudgets.passingThermalStates.includes(run.performance?.thermalState)
      ? pass(`${prefix}-thermal`, 'Thermal state', run.performance.thermalState)
      : fail(`${prefix}-thermal`, 'Thermal state', 'Thermal state must be nominal or fair.'),
  );

  return checks;
}

export function validateNativeQaEvidence(evidence) {
  const runs = Array.isArray(evidence?.runs) ? evidence.runs : [];
  const checks = [];

  checks.push(
    hasText(evidence?.appVersion) && hasText(evidence?.generatedAt)
      ? pass('evidence-header', 'Evidence header', `${evidence.appVersion} · ${evidence.generatedAt}`)
      : fail('evidence-header', 'Evidence header', 'appVersion and generatedAt are required.'),
  );

  const forbiddenArtifacts = forbiddenArtifactMatches(evidence);
  checks.push(
    forbiddenArtifacts.length === 0
      ? pass('privacy-artifacts', 'Raw artifact exclusion', 'No raw video, URI, path, or secret-like fields detected.')
      : fail('privacy-artifacts', 'Raw artifact exclusion', forbiddenArtifacts[0]),
  );

  for (const platform of nativeQaBudgets.requiredPlatforms) {
    checks.push(
      runs.some((run) => run.platform === platform)
        ? pass(`platform-${platform}`, `${platform} coverage`, 'At least one run recorded.')
        : fail(`platform-${platform}`, `${platform} coverage`, 'At least one run is required before store submission.'),
    );
  }

  runs.forEach((run, index) => {
    checks.push(...validateRun(run, index));
  });

  return {
    checks,
    ready: checks.every((check) => check.status === 'pass'),
  };
}
