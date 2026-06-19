import { describe, expect, it } from 'vitest';

import { createDrillPracticeRecord } from '../src/movement/drillPracticeRepository';
import { summarizeDrillPracticeInsights } from '../src/movement/drillPracticeInsights';
import { localMovementAnalyzer } from '../src/movement/localAnalyzer';
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

describe('drill practice insights', () => {
  it('summarizes completed and skipped drill practice records', async () => {
    const reports = await buildSampleReports();
    const cueId = reports[0].cues[0].id;
    const records = [
      createDrillPracticeRecord({
        cueId,
        drillId: `${cueId}-${reports[0].id}`,
        reportId: reports[0].id,
        status: 'completed',
        updatedAt: '2026-06-19T16:00:00.000Z',
      }),
      createDrillPracticeRecord({
        cueId,
        drillId: `${cueId}-${reports[1].id}`,
        reportId: reports[1].id,
        status: 'skipped',
        updatedAt: '2026-06-19T17:00:00.000Z',
      }),
    ];

    const summary = summarizeDrillPracticeInsights(reports, records);

    expect(summary.totalCount).toBe(2);
    expect(summary.completedCount).toBe(1);
    expect(summary.skippedCount).toBe(1);
    expect(summary.completionRate).toBe(50);
    expect(summary.status).toBe('building');
    expect(summary.latest?.latestStatus).toBe('skipped');
    expect(summary.skippedCue?.cueId).toBe(cueId);
  });

  it('marks practice as blocked when skipped records exceed completions', async () => {
    const reports = await buildSampleReports();
    const cueId = reports[0].cues[0].id;
    const records = [
      createDrillPracticeRecord({
        cueId,
        drillId: `${cueId}-${reports[0].id}`,
        reportId: reports[0].id,
        status: 'skipped',
        updatedAt: '2026-06-19T16:00:00.000Z',
      }),
      createDrillPracticeRecord({
        cueId,
        drillId: `${cueId}-${reports[1].id}`,
        reportId: reports[1].id,
        status: 'skipped',
        updatedAt: '2026-06-19T17:00:00.000Z',
      }),
    ];

    const summary = summarizeDrillPracticeInsights(reports, records);

    expect(summary.status).toBe('blocked');
    expect(summary.recommendation).toContain('easier variant');
  });

  it('ignores orphan drill practice records whose report no longer exists', async () => {
    const reports = await buildSampleReports();
    const summary = summarizeDrillPracticeInsights(reports, [
      createDrillPracticeRecord({
        cueId: 'cue-orphan',
        drillId: 'cue-orphan-deleted-report',
        reportId: 'deleted-report',
        status: 'completed',
      }),
    ]);

    expect(summary.totalCount).toBe(0);
    expect(summary.insights).toEqual([]);
    expect(summary.latest).toBeNull();
  });

  it('returns an empty state before practice is logged', async () => {
    const reports = await buildSampleReports();

    const summary = summarizeDrillPracticeInsights(reports, []);

    expect(summary.status).toBe('empty');
    expect(summary.totalCount).toBe(0);
    expect(summary.completionRate).toBe(0);
    expect(summary.recommendation).toContain('Log one suggested drill');
  });
});
