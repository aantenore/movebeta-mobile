import { describe, expect, it } from 'vitest';

import {
  buildMoveNetReadinessReport,
  DEFAULT_MOVENET_READINESS_BUDGET,
  MOVENET_READINESS_SCHEMA_VERSION,
} from '../scripts/movenet_readiness_report.mjs';

describe('MoveNet readiness report', () => {
  it('marks a local model execution run ready when load and inference budgets pass', () => {
    const report = buildMoveNetReadinessReport({
      backend: 'cpu',
      generatedAt: '2026-06-20T09:00:00.000Z',
      inferenceRunsMs: [320.4, 280.1, 300.2],
      loadMs: 1_800,
      memory: { numBytes: 1024, numDataBuffers: 1, numTensors: 1, unreliable: false },
      output: {
        maxKeypoints: 0,
        maxPoses: 0,
        poseArrayReturned: true,
      },
      warmupMs: 410.7,
    });

    expect(report.schemaVersion).toBe(MOVENET_READINESS_SCHEMA_VERSION);
    expect(report.status).toBe('ready');
    expect(report.averageInferenceMs).toBe(300);
    expect(report.maxInferenceMs).toBe(320);
    expect(report.checks.every((check) => check.status === 'pass')).toBe(true);
    expect(report.limitations[0]).toContain('Synthetic blank-frame');
  });

  it('marks the report degraded when model execution exceeds configured budgets', () => {
    const report = buildMoveNetReadinessReport({
      backend: 'cpu',
      budget: DEFAULT_MOVENET_READINESS_BUDGET,
      generatedAt: '2026-06-20T09:05:00.000Z',
      inferenceRunsMs: [4_000, 4_500],
      loadMs: 30_000,
      memory: { numBytes: 1024, numDataBuffers: 1, numTensors: 1, unreliable: false },
      output: {
        maxKeypoints: 0,
        maxPoses: 0,
        poseArrayReturned: true,
      },
      warmupMs: 5_000,
    });

    expect(report.status).toBe('degraded');
    expect(report.checks.filter((check) => check.status === 'fail').map((check) => check.key)).toEqual([
      'model-load',
      'average-inference-budget',
      'max-inference-budget',
    ]);
  });
});
