import fs from 'node:fs';
import path from 'node:path';
import { performance } from 'node:perf_hooks';
import { fileURLToPath } from 'node:url';

import * as poseDetection from '@tensorflow-models/pose-detection';
import * as tf from '@tensorflow/tfjs';

export const MOVENET_READINESS_SCHEMA_VERSION = 'movebeta.movenet-readiness-report.v1';

export const DEFAULT_MOVENET_READINESS_BUDGET = {
  averageInferenceMs: 1_500,
  loadMs: 25_000,
  maxInferenceMs: 3_000,
};

const defaultInputShape = [192, 192, 3];

function roundMs(value) {
  return Math.max(0, Math.round(value));
}

function average(values) {
  if (values.length === 0) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function check(key, passed, label, detail) {
  return {
    detail,
    key,
    label,
    status: passed ? 'pass' : 'fail',
  };
}

export function buildMoveNetReadinessReport({
  backend,
  budget = DEFAULT_MOVENET_READINESS_BUDGET,
  generatedAt = new Date().toISOString(),
  inputShape = defaultInputShape,
  inferenceRunsMs,
  loadMs,
  memory,
  output,
  warmupMs,
}) {
  const roundedRuns = inferenceRunsMs.map(roundMs);
  const averageInferenceMs = roundMs(average(roundedRuns));
  const maxInferenceMs = roundedRuns.length > 0 ? Math.max(...roundedRuns) : 0;
  const checks = [
    check('model-load', loadMs > 0 && loadMs <= budget.loadMs, 'Model loads inside budget', `${roundMs(loadMs)}ms / ${budget.loadMs}ms`),
    check(
      'inference-array',
      output.poseArrayReturned === true,
      'Inference returns a pose array',
      `poseArrayReturned=${String(output.poseArrayReturned)}`,
    ),
    check(
      'average-inference-budget',
      averageInferenceMs > 0 && averageInferenceMs <= budget.averageInferenceMs,
      'Average inference stays inside budget',
      `${averageInferenceMs}ms / ${budget.averageInferenceMs}ms`,
    ),
    check(
      'max-inference-budget',
      maxInferenceMs > 0 && maxInferenceMs <= budget.maxInferenceMs,
      'Worst inference stays inside budget',
      `${maxInferenceMs}ms / ${budget.maxInferenceMs}ms`,
    ),
  ];
  const failedChecks = checks.filter((item) => item.status === 'fail');

  return {
    averageInferenceMs,
    backend,
    budget,
    checks,
    generatedAt,
    input: {
      kind: 'synthetic-blank-frame',
      shape: inputShape,
    },
    inferenceRunsMs: roundedRuns,
    limitations: [
      'Synthetic blank-frame inference proves local model execution only.',
      'Real climbing-video accuracy still requires consented clips, coach scores, and physical-device QA.',
    ],
    loadMs: roundMs(loadMs),
    maxInferenceMs,
    memory,
    model: 'MoveNet SinglePose Lightning',
    output,
    schemaVersion: MOVENET_READINESS_SCHEMA_VERSION,
    status: failedChecks.length === 0 ? 'ready' : 'degraded',
    warmupMs: roundMs(warmupMs),
  };
}

export async function runMoveNetReadinessProbe({
  budget = DEFAULT_MOVENET_READINESS_BUDGET,
  generatedAt = new Date().toISOString(),
  inputShape = defaultInputShape,
  runs = 3,
} = {}) {
  await tf.setBackend('cpu');
  await tf.ready();

  const loadStartedAt = performance.now();
  const detector = await poseDetection.createDetector(poseDetection.SupportedModels.MoveNet, {
    modelType: poseDetection.movenet.modelType.SINGLEPOSE_LIGHTNING,
  });
  const loadMs = performance.now() - loadStartedAt;
  const input = tf.zeros(inputShape, 'int32');

  try {
    const warmupStartedAt = performance.now();
    const warmupPoses = await detector.estimatePoses(input, { maxPoses: 1 });
    const warmupMs = performance.now() - warmupStartedAt;
    const inferenceRunsMs = [];
    let poseArrayReturned = Array.isArray(warmupPoses);
    let maxPoses = warmupPoses.length;
    let maxKeypoints = warmupPoses[0]?.keypoints?.length ?? 0;

    for (let index = 0; index < runs; index += 1) {
      const inferenceStartedAt = performance.now();
      const poses = await detector.estimatePoses(input, { maxPoses: 1 });
      inferenceRunsMs.push(performance.now() - inferenceStartedAt);
      poseArrayReturned = poseArrayReturned && Array.isArray(poses);
      maxPoses = Math.max(maxPoses, poses.length);
      maxKeypoints = Math.max(maxKeypoints, poses[0]?.keypoints?.length ?? 0);
    }

    return buildMoveNetReadinessReport({
      backend: tf.getBackend(),
      budget,
      generatedAt,
      inputShape,
      inferenceRunsMs,
      loadMs,
      memory: tf.memory(),
      output: {
        maxKeypoints,
        maxPoses,
        poseArrayReturned,
      },
      warmupMs,
    });
  } finally {
    input.dispose();
    detector.dispose();
  }
}

export function resolveDefaultOutputPath(rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')) {
  return path.join(rootDir, 'docs/sdlc/movenet-readiness-report.json');
}

export function writeMoveNetReadinessReport(report, outputPath = resolveDefaultOutputPath()) {
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, `${JSON.stringify(report, null, 2)}\n`);
  return outputPath;
}

function readCliOptions(argv) {
  const outputIndex = argv.indexOf('--output');
  return {
    outputPath: outputIndex >= 0 ? argv[outputIndex + 1] : resolveDefaultOutputPath(),
    stdout: argv.includes('--stdout'),
  };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const options = readCliOptions(process.argv.slice(2));
  const report = await runMoveNetReadinessProbe();
  const outputPath = writeMoveNetReadinessReport(report, options.outputPath);
  if (options.stdout) {
    console.log(JSON.stringify(report, null, 2));
  } else {
    console.log(`Wrote MoveNet readiness report to ${outputPath}`);
    console.log(`Status: ${report.status}; avg inference: ${report.averageInferenceMs}ms; load: ${report.loadMs}ms`);
  }
}
