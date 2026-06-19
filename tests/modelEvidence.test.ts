import { describe, expect, it } from 'vitest';

import { buildModelEvidenceSummary, parseModelEvidenceConfig, type ModelEvidenceConfig } from '../src/core/modelEvidence';

const technicalEvidence: ModelEvidenceConfig = {
  analysisReplay: {
    generatedAt: '2026-06-19T23:04:29.038Z',
    minimumQualityScore: 100,
    passedAttempts: 3,
    privacySafe: true,
    provider: 'web-tfjs-movenet',
    status: 'pass',
    totalAttempts: 3,
  },
  modelName: 'MoveNet SinglePose Lightning',
  provider: 'web-tfjs-movenet',
  readiness: {
    averageInferenceMs: 329,
    backend: 'cpu',
    budget: {
      averageInferenceMs: 1500,
      loadMs: 25000,
      maxInferenceMs: 3000,
    },
    generatedAt: '2026-06-19T23:04:23.101Z',
    loadMs: 4322,
    maxInferenceMs: 334,
    status: 'ready',
  },
  realWorldValidation: {
    estimatedReviewRows: 40,
    nextAction: 'Collect consented climbing clips before production movement-quality claims.',
    requiredClips: 20,
    requiredWallAngles: ['slab', 'vertical', 'overhang'],
    status: 'needs-real-video',
  },
};

describe('model evidence summary', () => {
  it('marks passing local model checks as technical-ready until real video validation exists', () => {
    const summary = buildModelEvidenceSummary(technicalEvidence);

    expect(summary.status).toBe('technical-ready');
    expect(summary.badge).toBe('Technical ready');
    expect(summary.metrics.map((metric) => metric.value)).toEqual(['4.3s', '329ms', '3/3']);
    expect(summary.checks.map((check) => [check.label, check.status])).toEqual([
      ['MoveNet execution', 'ready'],
      ['Model-shaped replay', 'ready'],
      ['Real climbing validation', 'action'],
    ]);
    expect(summary.limitation).toContain('real climbing-video accuracy still needs coach-reviewed clips');
  });

  it('marks the summary validated only after real-world validation is ready', () => {
    const summary = buildModelEvidenceSummary({
      ...technicalEvidence,
      realWorldValidation: {
        ...technicalEvidence.realWorldValidation,
        status: 'ready',
      },
    });

    expect(summary.status).toBe('ready');
    expect(summary.badge).toBe('Validated');
    expect(summary.checks.every((check) => check.status === 'ready')).toBe(true);
  });

  it('degrades when technical evidence no longer passes', () => {
    const summary = buildModelEvidenceSummary({
      ...technicalEvidence,
      readiness: {
        ...technicalEvidence.readiness,
        status: 'degraded',
      },
    });

    expect(summary.status).toBe('degraded');
    expect(summary.badge).toBe('Needs rerun');
    expect(summary.checks[0]).toMatchObject({
      label: 'MoveNet execution',
      status: 'blocked',
    });
  });

  it('parses environment JSON and keeps the evidence privacy-safe', () => {
    const parsed = parseModelEvidenceConfig(JSON.stringify(technicalEvidence));
    const serialized = JSON.stringify(buildModelEvidenceSummary(parsed));

    expect(parsed?.provider).toBe('web-tfjs-movenet');
    expect(serialized).not.toMatch(/rawVideo|videoUri|file:\/\//i);
  });

  it('returns a blocked missing state when no evidence is configured', () => {
    const summary = buildModelEvidenceSummary();

    expect(summary.status).toBe('missing');
    expect(summary.checks[0].status).toBe('blocked');
    expect(summary.action).toContain('Configure model evidence');
  });
});
