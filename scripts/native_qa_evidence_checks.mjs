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

function latencyBudget(durationMs) {
  return (
    nativeQaBudgets.maxLatencyByClipMs.find((budget) => durationMs <= budget.maxClipDurationMs) ??
    nativeQaBudgets.maxLatencyByClipMs[nativeQaBudgets.maxLatencyByClipMs.length - 1]
  );
}

function hasText(value) {
  return typeof value === 'string' && value.trim().length > 0;
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
    hasText(run.deviceName) && hasText(run.osVersion) && hasText(run.buildId)
      ? pass(`${prefix}-device`, 'Device identity', `${run.deviceName} · ${run.osVersion} · ${run.buildId}`)
      : fail(`${prefix}-device`, 'Device identity', 'Device name, OS version, and build id are required.'),
  );

  checks.push(
    hasText(run.provider)
      ? pass(`${prefix}-provider`, 'Pose provider', run.provider)
      : fail(`${prefix}-provider`, 'Pose provider', 'Provider id is required.'),
  );

  checks.push(
    run.clip && hasText(run.clip.id) && Number.isFinite(run.clip.durationMs) && run.clip.durationMs > 0
      ? pass(`${prefix}-clip`, 'Clip evidence', `${run.clip.id} · ${run.clip.durationMs}ms`)
      : fail(`${prefix}-clip`, 'Clip evidence', 'Clip id and positive duration are required.'),
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
