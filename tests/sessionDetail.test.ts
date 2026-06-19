import { describe, expect, it } from 'vitest';

import { localMovementAnalyzer } from '../src/movement/localAnalyzer';
import { buildSessionReviewDetail } from '../src/movement/sessionDetail';
import { samplePoseFrames, sampleSession } from '../src/movement/sampleSession';

async function buildReport() {
  return localMovementAnalyzer.analyze({
    frames: samplePoseFrames,
    session: sampleSession,
  });
}

describe('session review detail', () => {
  it('summarizes a local report into focus, quality, performance, timeline, and privacy facts', async () => {
    const report = await buildReport();
    const detail = buildSessionReviewDetail(report);

    expect(detail.status).toBe('strong');
    expect(detail.focusMetric?.score).toBeLessThanOrEqual(detail.bestMetric?.score ?? 0);
    expect(detail.primaryCue?.severity).toBe('fix');
    expect(detail.qualityFacts.map((fact) => fact.label)).toEqual(['Quality', 'Frames', 'Visibility']);
    expect(detail.performanceFacts.map((fact) => fact.label)).toEqual(['Runtime', 'Throughput', 'Budget']);
    expect(detail.privacyFacts.find((fact) => fact.label === 'Video upload')?.value).toBe('off');
    expect(detail.timelineMarkers.length).toBeGreaterThanOrEqual(report.timeline.length);
    expect(detail.timelineMarkers.every((marker) => marker.positionPercent >= 0 && marker.positionPercent <= 100)).toBe(true);
  });

  it('flags report detail as risk when quality is low or analysis exceeds budget', async () => {
    const report = await buildReport();
    const detail = buildSessionReviewDetail({
      ...report,
      analysisQuality: {
        ...report.analysisQuality,
        score: 42,
        warnings: ['Pose visibility is low.'],
      },
      performance: {
        ...report.performance,
        budgetStatus: 'over-budget',
      },
    });

    expect(detail.status).toBe('risk');
    expect(detail.title).toBe('Needs retake review');
    expect(detail.summary).toContain('Retake');
  });
});
