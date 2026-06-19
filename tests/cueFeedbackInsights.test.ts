import { describe, expect, it } from 'vitest';

import { summarizeCueFeedbackInsights } from '../src/movement/cueFeedbackInsights';
import { localMovementAnalyzer } from '../src/movement/localAnalyzer';
import { createReportAnnotation, updateCueFeedback } from '../src/movement/reportAnnotationRepository';
import { sampleAttempts } from '../src/movement/sampleSession';

async function buildSampleReports() {
  return Promise.all(
    sampleAttempts.map((attempt) =>
      localMovementAnalyzer.analyze({
        frames: attempt.frames,
        session: attempt.session,
      }),
    ),
  );
}

describe('cue feedback insights', () => {
  it('summarizes cue usefulness feedback across local reports', async () => {
    const reports = await buildSampleReports();
    const cueId = reports[0].cues[0].id;
    const annotations = [
      updateCueFeedback(createReportAnnotation(reports[0].id), {
        cueId,
        rating: 'useful',
        updatedAt: '2026-06-19T11:00:00.000Z',
      }),
      updateCueFeedback(createReportAnnotation(reports[1].id), {
        cueId,
        rating: 'unclear',
        updatedAt: '2026-06-19T12:00:00.000Z',
      }),
      updateCueFeedback(createReportAnnotation(reports[2].id), {
        cueId: reports[2].cues[0].id,
        rating: 'not-useful',
        updatedAt: '2026-06-19T13:00:00.000Z',
      }),
    ];

    const summary = summarizeCueFeedbackInsights(reports, annotations);

    expect(summary.feedbackCount).toBe(3);
    expect(summary.usefulCount).toBe(1);
    expect(summary.unclearCount).toBe(1);
    expect(summary.notUsefulCount).toBe(1);
    expect(summary.usefulnessRate).toBe(33);
    expect(summary.topUsefulCue?.cueId).toBe(cueId);
    expect(summary.reviewCue?.notUsefulCount).toBeGreaterThanOrEqual(0);
  });

  it('ignores feedback whose report no longer exists', async () => {
    const reports = await buildSampleReports();
    const orphan = updateCueFeedback(createReportAnnotation('deleted-report'), {
      cueId: 'cue-orphan',
      rating: 'useful',
    });

    const summary = summarizeCueFeedbackInsights(reports, [orphan]);

    expect(summary.feedbackCount).toBe(0);
    expect(summary.insights).toEqual([]);
  });

  it('does not promote a keep cue when no feedback was useful', async () => {
    const reports = await buildSampleReports();
    const cueId = reports[0].cues[0].id;
    const annotations = [
      updateCueFeedback(createReportAnnotation(reports[0].id), {
        cueId,
        rating: 'unclear',
        updatedAt: '2026-06-19T11:00:00.000Z',
      }),
      updateCueFeedback(createReportAnnotation(reports[1].id), {
        cueId,
        rating: 'not-useful',
        updatedAt: '2026-06-19T12:00:00.000Z',
      }),
    ];

    const summary = summarizeCueFeedbackInsights(reports, annotations);

    expect(summary.topUsefulCue).toBeNull();
    expect(summary.reviewCue?.cueId).toBe(cueId);
  });

  it('does not promote a review cue when all feedback was useful', async () => {
    const reports = await buildSampleReports();
    const cueId = reports[0].cues[0].id;
    const annotations = [
      updateCueFeedback(createReportAnnotation(reports[0].id), {
        cueId,
        rating: 'useful',
        updatedAt: '2026-06-19T11:00:00.000Z',
      }),
    ];

    const summary = summarizeCueFeedbackInsights(reports, annotations);

    expect(summary.topUsefulCue?.cueId).toBe(cueId);
    expect(summary.reviewCue).toBeNull();
  });

  it('returns an empty summary before cue feedback is saved', async () => {
    const reports = await buildSampleReports();

    const summary = summarizeCueFeedbackInsights(reports, []);

    expect(summary.feedbackCount).toBe(0);
    expect(summary.topUsefulCue).toBeNull();
    expect(summary.reviewCue).toBeNull();
    expect(summary.usefulnessRate).toBe(0);
  });
});
