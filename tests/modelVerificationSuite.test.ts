import { describe, expect, it } from 'vitest';

import {
  assertModelVerificationSuiteIsShareSafe,
  buildModelVerificationSuite,
  modelVerificationSuiteSchemaVersion,
  ModelVerificationSuiteSchema,
  type ModelVerificationSuite,
} from '../src/core/modelVerificationSuite';
import { defaultModelEvidenceConfig } from '../src/core/modelEvidence';
import { runModelAnalysisReplay } from '../src/movement/modelAnalysisReplay';

const readyMoveNetReport = {
  averageInferenceMs: 328,
  backend: 'cpu',
  budget: {
    averageInferenceMs: 1500,
    loadMs: 25000,
    maxInferenceMs: 3000,
  },
  checks: [
    { key: 'model-load', status: 'pass' },
    { key: 'inference-array', status: 'pass' },
    { key: 'average-inference-budget', status: 'pass' },
    { key: 'max-inference-budget', status: 'pass' },
  ],
  generatedAt: '2026-06-20T10:00:00.000Z',
  loadMs: 3879,
  maxInferenceMs: 331,
  schemaVersion: 'movebeta.movenet-readiness-report.v1',
  status: 'ready',
};

describe('model verification suite', () => {
  it('marks the model technical-ready when local runtime, replay, coverage, and privacy checks pass', async () => {
    const replay = await runModelAnalysisReplay({ generatedAt: '2026-06-20T10:01:00.000Z' });
    const suite = buildModelVerificationSuite({
      generatedAt: '2026-06-20T10:02:00.000Z',
      modelAnalysisReplayReport: replay,
      moveNetReadinessReport: readyMoveNetReport,
      realWorldValidation: defaultModelEvidenceConfig.realWorldValidation,
    });

    expect(ModelVerificationSuiteSchema.parse(suite)).toEqual(suite);
    expect(suite.schemaVersion).toBe(modelVerificationSuiteSchemaVersion);
    expect(suite.status).toBe('technical-ready');
    expect(suite.summary).toMatchObject({
      blockedChecks: 0,
      externalChecks: 1,
      passedChecks: 8,
      technicalReady: true,
      totalChecks: 9,
    });
    expect(suite.coverage.wallAngles).toMatchObject({
      covered: ['overhang', 'slab', 'vertical'],
      missing: [],
      required: ['slab', 'vertical', 'overhang'],
    });
    expect(suite.coverage.metricIds).toEqual(['flow', 'foot-cuts', 'hip-drift', 'lock-off', 'pause-time']);
    expect(suite.coverage.cueCount).toBeGreaterThan(0);
    expect(suite.summary.nextAction).toContain('npm run validation:cue');
  });

  it('promotes to ready only when real-world validation is configured as ready', async () => {
    const replay = await runModelAnalysisReplay({ generatedAt: '2026-06-20T10:01:00.000Z' });
    const suite = buildModelVerificationSuite({
      modelAnalysisReplayReport: replay,
      moveNetReadinessReport: readyMoveNetReport,
      realWorldValidation: {
        ...defaultModelEvidenceConfig.realWorldValidation,
        status: 'ready',
      },
    });

    expect(suite.status).toBe('ready');
    expect(suite.summary.externalChecks).toBe(0);
    expect(suite.checks.every((check) => check.status === 'pass')).toBe(true);
  });

  it('blocks when replay coverage misses required wall angles', async () => {
    const replay = await runModelAnalysisReplay({ generatedAt: '2026-06-20T10:01:00.000Z' });
    const suite = buildModelVerificationSuite({
      modelAnalysisReplayReport: {
        ...replay,
        attempts: replay.attempts.filter((attempt) => attempt.wallAngle !== 'slab'),
        summary: {
          ...replay.summary,
          passedAttempts: 2,
          totalAttempts: 2,
        },
      },
      moveNetReadinessReport: readyMoveNetReport,
      realWorldValidation: defaultModelEvidenceConfig.realWorldValidation,
    });

    expect(suite.status).toBe('blocked');
    expect(suite.checks.find((check) => check.key === 'wall-angle-coverage')).toMatchObject({
      detail: 'Missing wall angles: slab',
      status: 'blocked',
    });
  });

  it('rejects raw video references, local paths, and token-like values before sharing', async () => {
    const replay = await runModelAnalysisReplay({ generatedAt: '2026-06-20T10:01:00.000Z' });
    const suite = buildModelVerificationSuite({
      modelAnalysisReplayReport: replay,
      moveNetReadinessReport: readyMoveNetReport,
      realWorldValidation: defaultModelEvidenceConfig.realWorldValidation,
    });
    const unsafe: ModelVerificationSuite = {
      ...suite,
      checks: [
        {
          ...suite.checks[0],
          detail: 'Open /Users/antonio/raw.mov with ghp_1234567890abcdefTOKENVALUE',
        },
      ],
    };

    expect(() => assertModelVerificationSuiteIsShareSafe(unsafe)).toThrow('Model verification suite contains credential');
  });
});
