import { describe, expect, it } from 'vitest';

import { attachAnalysisEvidence } from '../src/movement/analysisEvidence';
import { buildAnalysisTrustSummary } from '../src/movement/analysisTrust';
import type { LocalAnalysisReport } from '../src/movement/contracts';
import { localMovementAnalyzer } from '../src/movement/localAnalyzer';
import { samplePoseFrames, sampleSession } from '../src/movement/sampleSession';

async function buildReport(overrides: Partial<LocalAnalysisReport> = {}) {
  const report = await localMovementAnalyzer.analyze({
    frames: samplePoseFrames,
    session: sampleSession,
  });

  return attachAnalysisEvidence(
    {
      ...report,
      ...overrides,
      performance: {
        ...report.performance,
        analysisMs: 640,
        budgetMs: 1800,
        budgetStatus: 'within-budget',
        framesPerSecond: 42,
        measuredAt: sampleSession.createdAt,
        ...overrides.performance,
      },
    },
    { generatedAt: sampleSession.createdAt },
  );
}

describe('analysis trust summary', () => {
  it('marks strong local reports ready for coaching decisions', async () => {
    const trust = buildAnalysisTrustSummary(await buildReport());

    expect(trust.schemaVersion).toBe('movebeta.analysis-trust.v1');
    expect(trust.decision).toBe('coach-ready');
    expect(trust.score).toBe(100);
    expect(trust.blockers).toHaveLength(0);
    expect(trust.factors.every((factor) => factor.status === 'pass')).toBe(true);
    expect(trust.privacy).toMatchObject({
      localOnly: true,
      rawVideoIncluded: false,
      uploadsVideo: false,
    });
  });

  it('recommends a retake when pose signal quality cannot support cue timing', async () => {
    const report = await buildReport({
      analysisQuality: {
        averageVisibility: 0.38,
        frameCoverage: 0.42,
        landmarkCoverage: 0.58,
        score: 45,
        warnings: ['Pose visibility is low.'],
      },
    });
    const trust = buildAnalysisTrustSummary(report);

    expect(trust.decision).toBe('retake');
    expect(trust.title).toBe('Retake before coaching');
    expect(trust.blockers.join(' ')).toContain('too weak');
    expect(trust.factors.find((factor) => factor.id === 'signal-coverage')?.status).toBe('block');
  });

  it('keeps reports as private journal material when local-only privacy is violated', async () => {
    const report = await buildReport({
      engine: {
        coachLens: {
          key: 'balanced',
          label: 'Balanced',
          summary: 'General movement review across flow, feet, hips, and arm load.',
        },
        model: 'remote-review',
        processedFrames: samplePoseFrames.length,
        provider: 'local-fixture',
        runsOnDevice: false,
        uploadsVideo: true,
      },
      privacy: {
        retention: 'Review before sharing.',
        storedArtifacts: ['pose landmarks', 'movement metrics'],
        videoLeavesDevice: true,
      },
    });
    const trust = buildAnalysisTrustSummary(report);

    expect(trust.decision).toBe('journal-only');
    expect(trust.privacy.localOnly).toBe(false);
    expect(trust.factors.find((factor) => factor.id === 'privacy-boundary')?.status).toBe('block');
    expect(JSON.stringify(trust)).not.toMatch(/file:\/\/|content:\/\/|\/Users\/|token|secret/i);
  });
});
