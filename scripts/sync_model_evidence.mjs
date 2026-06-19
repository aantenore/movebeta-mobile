import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const MODEL_EVIDENCE_SYNC_SCHEMA_VERSION = 'movebeta.model-evidence-sync.v1';

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

export function buildModelEvidenceFromReports({
  existingModelEvidence,
  moveNetReadinessReport,
  modelAnalysisReplayReport,
}) {
  const provider = providerFromReplay(modelAnalysisReplayReport);

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
    realWorldValidation: existingModelEvidence?.realWorldValidation ?? defaultRealWorldValidation,
  };
}

export function syncModelEvidence({
  appConfigPath,
  modelAnalysisReplayPath,
  moveNetReadinessPath,
  write = true,
}) {
  const appConfig = readJson(appConfigPath);
  const moveNetReadinessReport = readJson(moveNetReadinessPath);
  const modelAnalysisReplayReport = readJson(modelAnalysisReplayPath);
  const extra = appConfig.expo.extra ?? {};
  const previousEvidence = extra.modelEvidence;
  const nextEvidence = buildModelEvidenceFromReports({
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
