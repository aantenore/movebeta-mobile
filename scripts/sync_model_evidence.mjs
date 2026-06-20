import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const MODEL_EVIDENCE_SYNC_SCHEMA_VERSION = 'movebeta.model-evidence-sync.v1';
export const defaultCueValidationDatasetReportPath = 'docs/sdlc/cue-validation-dataset-report.json';

export const defaultRealWorldValidation = {
  estimatedReviewRows: 40,
  nextAction: 'Collect consented climbing clips, coach review rows, and physical-device evidence before production movement-quality claims.',
  requiredClips: 20,
  requiredWallAngles: ['slab', 'vertical', 'overhang'],
  status: 'needs-real-video',
};

export function resolveProjectRoot() {
  return path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function writeJson(filePath, value) {
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`);
}

function providerFromReplay(replayReport) {
  const providers = [...new Set((replayReport.attempts ?? []).map((attempt) => attempt.provider).filter(Boolean))];
  return providers[0] ?? 'web-tfjs-movenet';
}

function replayPrivacySafe(replayReport) {
  return (replayReport.attempts ?? []).every((attempt) => attempt.privacySafe === true);
}

function isShareSafeCueDatasetReport(report) {
  return (
    report?.privacy?.datasetIncluded === false &&
    report?.privacy?.rawArtifactsIncluded === false &&
    report?.privacy?.reviewerIdentitiesIncluded === false
  );
}

/**
 * @param {{ cueValidationDatasetReport?: any, existingRealWorldValidation?: any }} options
 */
export function realWorldValidationFromCueDatasetReport({ cueValidationDatasetReport, existingRealWorldValidation }) {
  if (!cueValidationDatasetReport || cueValidationDatasetReport.status !== 'ready') {
    return existingRealWorldValidation ?? defaultRealWorldValidation;
  }

  if (!isShareSafeCueDatasetReport(cueValidationDatasetReport)) {
    return existingRealWorldValidation ?? defaultRealWorldValidation;
  }

  const summary = cueValidationDatasetReport.summary ?? {};
  const clipCount = Math.max(0, Number(summary.clipCount ?? 0));
  const reviewCount = Math.max(0, Number(summary.reviewCount ?? 0));
  const wallAngles = Array.isArray(summary.wallAngles) ? summary.wallAngles.filter(Boolean).map(String) : [];

  return {
    estimatedReviewRows: reviewCount,
    nextAction: 'Keep cue-validation dataset, model readiness, and physical-device evidence fresh before production movement-quality claims.',
    requiredClips: clipCount,
    requiredWallAngles: wallAngles,
    status: 'ready',
  };
}

/**
 * @param {{ cueValidationDatasetReport?: any, existingModelEvidence?: any, moveNetReadinessReport: any, modelAnalysisReplayReport: any }} options
 */
export function buildModelEvidenceFromReports({
  cueValidationDatasetReport,
  existingModelEvidence,
  moveNetReadinessReport,
  modelAnalysisReplayReport,
}) {
  const provider = providerFromReplay(modelAnalysisReplayReport);
  const realWorldValidation = realWorldValidationFromCueDatasetReport({
    cueValidationDatasetReport,
    existingRealWorldValidation: existingModelEvidence?.realWorldValidation,
  });

  return {
    analysisReplay: {
      generatedAt: modelAnalysisReplayReport.generatedAt,
      minimumQualityScore: modelAnalysisReplayReport.summary?.minQualityScore ?? modelAnalysisReplayReport.minQualityScore,
      passedAttempts: modelAnalysisReplayReport.summary?.passedAttempts ?? 0,
      privacySafe: replayPrivacySafe(modelAnalysisReplayReport),
      provider,
      status: modelAnalysisReplayReport.status === 'pass' ? 'pass' : 'fail',
      totalAttempts: modelAnalysisReplayReport.summary?.totalAttempts ?? 0,
    },
    modelName: moveNetReadinessReport.model ?? existingModelEvidence?.modelName ?? 'MoveNet SinglePose Lightning',
    provider: existingModelEvidence?.provider ?? provider,
    readiness: {
      averageInferenceMs: moveNetReadinessReport.averageInferenceMs,
      backend: moveNetReadinessReport.backend,
      budget: moveNetReadinessReport.budget,
      generatedAt: moveNetReadinessReport.generatedAt,
      loadMs: moveNetReadinessReport.loadMs,
      maxInferenceMs: moveNetReadinessReport.maxInferenceMs,
      status: moveNetReadinessReport.status === 'ready' ? 'ready' : 'degraded',
    },
    realWorldValidation,
  };
}

/**
 * @param {{ appConfigPath: string, cueValidationDatasetReportPath?: string, modelAnalysisReplayPath: string, moveNetReadinessPath: string, write?: boolean }} options
 */
export function syncModelEvidence({
  appConfigPath,
  cueValidationDatasetReportPath,
  modelAnalysisReplayPath,
  moveNetReadinessPath,
  write = true,
}) {
  const appConfig = readJson(appConfigPath);
  const moveNetReadinessReport = readJson(moveNetReadinessPath);
  const modelAnalysisReplayReport = readJson(modelAnalysisReplayPath);
  const cueValidationDatasetReport =
    cueValidationDatasetReportPath && fs.existsSync(cueValidationDatasetReportPath)
      ? readJson(cueValidationDatasetReportPath)
      : undefined;
  const extra = appConfig.expo.extra ?? {};
  const previousEvidence = extra.modelEvidence;
  const nextEvidence = buildModelEvidenceFromReports({
    cueValidationDatasetReport,
    existingModelEvidence: previousEvidence,
    modelAnalysisReplayReport,
    moveNetReadinessReport,
  });
  const nextConfig = {
    ...appConfig,
    expo: {
      ...appConfig.expo,
      extra: {
        ...extra,
        modelEvidence: nextEvidence,
      },
    },
  };
  const changed = JSON.stringify(previousEvidence) !== JSON.stringify(nextEvidence);
  const result = {
    changed,
    modelEvidence: nextEvidence,
    schemaVersion: MODEL_EVIDENCE_SYNC_SCHEMA_VERSION,
    sources: {
      appConfigPath,
      cueValidationDatasetReportPath,
      modelAnalysisReplayPath,
      moveNetReadinessPath,
    },
  };

  if (write && changed) {
    writeJson(appConfigPath, nextConfig);
  }

  return result;
}

function readCliOptions(argv, rootDir = resolveProjectRoot()) {
  const optionValue = (name, fallback) => {
    const index = argv.indexOf(name);
    return index >= 0 ? argv[index + 1] : fallback;
  };

  return {
    appConfigPath: optionValue('--app-config', path.join(rootDir, 'app.json')),
    cueValidationDatasetReportPath: optionValue(
      '--cue-validation-report',
      path.join(rootDir, defaultCueValidationDatasetReportPath),
    ),
    dryRun: argv.includes('--dry-run'),
    modelAnalysisReplayPath: optionValue('--model-analysis-replay', path.join(rootDir, 'docs/sdlc/model-analysis-replay-report.json')),
    moveNetReadinessPath: optionValue('--movenet-readiness', path.join(rootDir, 'docs/sdlc/movenet-readiness-report.json')),
    stdout: argv.includes('--stdout'),
  };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const options = readCliOptions(process.argv.slice(2));
  const result = syncModelEvidence({
    appConfigPath: options.appConfigPath,
    cueValidationDatasetReportPath: options.cueValidationDatasetReportPath,
    modelAnalysisReplayPath: options.modelAnalysisReplayPath,
    moveNetReadinessPath: options.moveNetReadinessPath,
    write: !options.dryRun,
  });

  if (options.stdout) {
    console.log(JSON.stringify(result, null, 2));
  } else {
    console.log(`${result.changed ? 'Updated' : 'Already current'} model evidence in ${options.appConfigPath}`);
    console.log(
      `MoveNet: ${result.modelEvidence.readiness.status}; load ${result.modelEvidence.readiness.loadMs}ms; avg ${result.modelEvidence.readiness.averageInferenceMs}ms`,
    );
    console.log(
      `Replay: ${result.modelEvidence.analysisReplay.status}; ${result.modelEvidence.analysisReplay.passedAttempts}/${result.modelEvidence.analysisReplay.totalAttempts} attempts`,
    );
  }
}
