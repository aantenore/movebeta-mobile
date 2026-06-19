import { describe, expect, it } from 'vitest';

import { buildCueTrustReport, CueTrustReportSchema } from '../src/movement/cueTrust';
import { localMovementAnalyzer } from '../src/movement/localAnalyzer';
import { samplePoseFrames, sampleSession } from '../src/movement/sampleSession';

async function buildReport() {
  return localMovementAnalyzer.analyze({
    frames: samplePoseFrames,
    session: sampleSession,
  });
}

describe('cue trust report', () => {
  it('scores local coaching cues from signal quality, timing, runtime, and validation readiness', async () => {
    const report = await buildReport();
    const trust = buildCueTrustReport(report, { generatedAt: '2026-06-19T12:00:00.000Z' });

    expect(CueTrustReportSchema.parse(trust)).toEqual(trust);
    expect(trust.schemaVersion).toBe('movebeta.cue-trust.v1');
    expect(trust.generatedAt).toBe('2026-06-19T12:00:00.000Z');
    expect(trust.signals).toHaveLength(report.cues.length);
    expect(trust.validationStatus).toBe('pending');
    expect(trust.averageScore).toBeGreaterThanOrEqual(80);
    expect(trust.signals.every((signal) => signal.factors.map((factor) => factor.id).includes('validation'))).toBe(true);
  });

  it('downgrades trust when pose quality and runtime evidence are weak', async () => {
    const report = await buildReport();
    const trust = buildCueTrustReport({
      ...report,
      analysisQuality: {
        ...report.analysisQuality,
        score: 45,
        warnings: ['Pose visibility is low.'],
      },
      performance: {
        ...report.performance,
        budgetStatus: 'over-budget',
      },
    });

    expect(trust.averageScore).toBeLessThan(70);
    expect(trust.reviewCueIds.length).toBeGreaterThan(0);
    expect(trust.signals.some((signal) => signal.level === 'low' || signal.level === 'review')).toBe(true);
  });

  it('uses real validation evidence when a cue fails review', async () => {
    const report = await buildReport();
    const failingCueId = report.cues[0].id;
    const trust = buildCueTrustReport(report, {
      validation: {
        acceptance: 'needs-review',
        averageScore: 3.5,
        failingCueIds: [failingCueId],
        reviewedCueCount: report.cues.length,
        unreviewedCueIds: [],
      },
    });
    const failingSignal = trust.signals.find((signal) => signal.cueId === failingCueId);

    expect(trust.validationStatus).toBe('needs-review');
    expect(failingSignal?.factors.find((factor) => factor.id === 'validation')?.status).toBe('weak');
    expect(failingSignal?.score).toBeLessThan(trust.averageScore + 10);
  });
});
