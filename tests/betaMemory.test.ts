import { describe, expect, it } from 'vitest';

import { summarizeBetaMemory } from '../src/movement/betaMemory';
import { localMovementAnalyzer } from '../src/movement/localAnalyzer';
import { createReportAnnotation, updateRepeatOutcome } from '../src/movement/reportAnnotationRepository';
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

describe('beta memory', () => {
  it('builds reusable beta entries from improved and sent repeat outcomes', async () => {
    const reports = await buildReports();
    const firstCueId = reports[0].cues[0].id;
    const secondCueId = reports[1].cues[0].id;
    const memory = summarizeBetaMemory(reports, [
      updateRepeatOutcome(
        createReportAnnotation(reports[0].id, {
          privateNote: 'This note must stay private.',
        }),
        {
          attempts: 2,
          resolvedCueIds: [firstCueId],
          status: 'improved',
          updatedAt: '2026-06-19T18:00:00.000Z',
        },
      ),
      updateRepeatOutcome(createReportAnnotation(reports[1].id), {
        attempts: 1,
        resolvedCueIds: [secondCueId],
        status: 'sent',
        updatedAt: '2026-06-19T19:00:00.000Z',
      }),
    ]);

    expect(memory).toMatchObject({
      buildingCount: 0,
      improvedCount: 1,
      sentCount: 1,
      status: 'ready',
      totalSuccessful: 2,
    });
    expect(memory.entries[0]).toMatchObject({
      reportId: reports[1].id,
      status: 'sent',
      title: reports[1].session.title,
    });
    expect(memory.entries[0].cueTitles).toEqual([reports[1].cues[0].title]);
    expect(memory.recommendation).toContain('sent beta');
    expect(JSON.stringify(memory)).not.toContain('This note must stay private');
  });

  it('stays in building state when repeats are logged but none improved or sent', async () => {
    const reports = await buildReports();
    const memory = summarizeBetaMemory(reports, [
      updateRepeatOutcome(createReportAnnotation(reports[0].id), {
        attempts: 2,
        resolvedCueIds: [],
        status: 'fell',
      }),
      updateRepeatOutcome(createReportAnnotation(reports[1].id), {
        attempts: 1,
        resolvedCueIds: [],
        status: 'regressed',
      }),
    ]);

    expect(memory.status).toBe('building');
    expect(memory.buildingCount).toBe(2);
    expect(memory.entries).toEqual([]);
    expect(memory.recommendation).toContain('2 repeat outcomes logged');
  });

  it('returns an empty state before repeat outcomes exist', async () => {
    const reports = await buildReports();
    const memory = summarizeBetaMemory(reports, [createReportAnnotation(reports[0].id)]);

    expect(memory.status).toBe('empty');
    expect(memory.totalSuccessful).toBe(0);
    expect(memory.topPattern).toContain('No successful');
  });

  it('ignores orphan annotations and limits visible entries', async () => {
    const reports = await buildReports();
    const memory = summarizeBetaMemory(
      reports,
      [
        ...reports.map((report, index) =>
          updateRepeatOutcome(createReportAnnotation(report.id), {
            attempts: index + 1,
            resolvedCueIds: [],
            status: 'improved',
            updatedAt: `2026-06-19T1${index}:00:00.000Z`,
          }),
        ),
        updateRepeatOutcome(createReportAnnotation('missing-report'), {
          attempts: 1,
          resolvedCueIds: ['cue-orphan'],
          status: 'sent',
          updatedAt: '2026-06-19T20:00:00.000Z',
        }),
      ],
      { limit: 2 },
    );

    expect(memory.totalSuccessful).toBe(3);
    expect(memory.entries).toHaveLength(2);
    expect(memory.entries.some((entry) => entry.reportId === 'missing-report')).toBe(false);
  });
});
