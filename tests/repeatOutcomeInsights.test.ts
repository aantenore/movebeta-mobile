import { describe, expect, it } from 'vitest';

import { localMovementAnalyzer } from '../src/movement/localAnalyzer';
import { createReportAnnotation, updateRepeatOutcome } from '../src/movement/reportAnnotationRepository';
import { summarizeRepeatOutcomes } from '../src/movement/repeatOutcomeInsights';
import { sampleAttempts } from '../src/movement/sampleSession';

async function buildReports() {
  return Promise.all(
    sampleAttempts.map((attempt) =>
      localMovementAnalyzer.analyze({
        frames: attempt.frames,
        session: attempt.session,
      }),
    ),
  );
}

describe('repeat outcome insights', () => {
  it('summarizes improved, sent, stalled, and resolved cue outcomes', async () => {
    const reports = await buildReports();
    const firstCueId = reports[0].cues[0].id;
    const annotations = [
      updateRepeatOutcome(createReportAnnotation(reports[0].id), {
        attempts: 2,
        resolvedCueIds: [firstCueId],
        status: 'improved',
        updatedAt: '2026-06-19T18:00:00.000Z',
      }),
      updateRepeatOutcome(createReportAnnotation(reports[1].id), {
        attempts: 1,
        resolvedCueIds: [],
        status: 'sent',
        updatedAt: '2026-06-19T19:00:00.000Z',
      }),
      updateRepeatOutcome(createReportAnnotation(reports[2].id), {
        attempts: 3,
        resolvedCueIds: [],
        status: 'fell',
        updatedAt: '2026-06-19T17:00:00.000Z',
      }),
      updateRepeatOutcome(createReportAnnotation('orphan-report'), {
        attempts: 1,
        resolvedCueIds: ['cue-orphan'],
        status: 'sent',
        updatedAt: '2026-06-19T20:00:00.000Z',
      }),
    ];

    const insight = summarizeRepeatOutcomes(reports, annotations);

    expect(insight).toMatchObject({
      attemptedCount: 3,
      improvedCount: 1,
      resolvedCueCount: 1,
      sentCount: 1,
      stalledCount: 1,
      status: 'progressing',
      successRate: 67,
      totalLogged: 3,
    });
    expect(insight.latest?.reportId).toBe(reports[1].id);
    expect(insight.action).toContain('sent repeat');
  });

  it('marks outcomes as stalled when falls and regressions exceed positive repeats', async () => {
    const reports = await buildReports();
    const annotations = [
      updateRepeatOutcome(createReportAnnotation(reports[0].id), {
        attempts: 2,
        resolvedCueIds: [],
        status: 'fell',
      }),
      updateRepeatOutcome(createReportAnnotation(reports[1].id), {
        attempts: 2,
        resolvedCueIds: [],
        status: 'regressed',
      }),
    ];

    const insight = summarizeRepeatOutcomes(reports, annotations);

    expect(insight.status).toBe('stalled');
    expect(insight.successRate).toBe(0);
    expect(insight.action).toContain('Lower the intensity');
  });

  it('returns an empty state before repeat outcomes are logged', async () => {
    const reports = await buildReports();

    const insight = summarizeRepeatOutcomes(reports, [createReportAnnotation(reports[0].id)]);

    expect(insight.status).toBe('empty');
    expect(insight.totalLogged).toBe(0);
    expect(insight.action).toContain('Log the result');
  });
});
