import { describe, expect, it } from 'vitest';

import {
  attachAnalysisEvidence,
  buildAnalysisEvidenceTimeline,
  summarizeAnalysisEvidence,
} from '../src/movement/analysisEvidence';
import { analysisEvidenceSchemaVersion, LocalAnalysisReportSchema } from '../src/movement/contracts';
import { localMovementAnalyzer } from '../src/movement/localAnalyzer';
import { samplePoseFrames, sampleSession } from '../src/movement/sampleSession';

async function buildReport() {
  return localMovementAnalyzer.analyze({
    frames: samplePoseFrames,
    session: sampleSession,
  });
}

describe('analysis evidence timeline', () => {
  it('builds a versioned privacy-safe timeline for local reports', async () => {
    const report = await buildReport();
    const timeline = buildAnalysisEvidenceTimeline(report, {
      generatedAt: '2026-06-20T12:00:00.000Z',
    });
    const summary = summarizeAnalysisEvidence(timeline);

    expect(timeline.schemaVersion).toBe(analysisEvidenceSchemaVersion);
    expect(timeline.generatedAt).toBe('2026-06-20T12:00:00.000Z');
    expect(timeline.steps.map((step) => step.id)).toEqual([
      'input-normalized',
      'pose-provider',
      'quality-gate',
      'metric-cue-generation',
      'performance-budget',
      'privacy-boundary',
    ]);
    expect(timeline.steps.find((step) => step.id === 'privacy-boundary')?.status).toBe('pass');
    expect(JSON.stringify(timeline)).not.toMatch(/file:\/\/|content:\/\/|raw video uri|secret|token/i);
    expect(summary).toMatchObject({
      blocked: 0,
      status: report.performance.budgetStatus === 'not-measured' ? 'review' : 'pass',
      total: 6,
    });
  });

  it('marks weak quality, over-budget runtime, and raw artifact hints as blocked evidence', async () => {
    const report = attachAnalysisEvidence({
      ...(await buildReport()),
      analysisQuality: {
        averageVisibility: 0.3,
        frameCoverage: 0.4,
        landmarkCoverage: 0.6,
        score: 45,
        warnings: ['Pose visibility is low.'],
      },
      performance: {
        analysisMs: 7000,
        budgetMs: 3000,
        budgetStatus: 'over-budget',
        framesPerSecond: 4,
        measuredAt: '2026-06-20T12:00:00.000Z',
      },
      privacy: {
        retention: 'Video URI file:///private/raw.mov was retained for review.',
        storedArtifacts: ['movement metrics', '/Users/athlete/raw.mov'],
        videoLeavesDevice: false,
      },
    });
    const summary = summarizeAnalysisEvidence(report.analysisEvidence);

    expect(report.analysisEvidence.steps.find((step) => step.id === 'quality-gate')?.status).toBe('blocked');
    expect(report.analysisEvidence.steps.find((step) => step.id === 'performance-budget')?.status).toBe('blocked');
    expect(report.analysisEvidence.steps.find((step) => step.id === 'privacy-boundary')?.status).toBe('blocked');
    expect(summary.status).toBe('blocked');
    expect(summary.blocked).toBeGreaterThanOrEqual(3);
  });

  it('keeps legacy reports readable with an empty default timeline', async () => {
    const report = await buildReport();
    const legacy = {
      ...report,
      analysisEvidence: undefined,
    };
    delete legacy.analysisEvidence;

    const parsed = LocalAnalysisReportSchema.parse(legacy);

    expect(parsed.analysisEvidence).toEqual({
      generatedAt: '1970-01-01T00:00:00.000Z',
      schemaVersion: analysisEvidenceSchemaVersion,
      steps: [],
    });
  });
});
