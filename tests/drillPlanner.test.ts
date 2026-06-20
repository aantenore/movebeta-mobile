import { describe, expect, it } from 'vitest';

import type { MovementCue } from '../src/movement/contracts';
import { buildDrillPlan } from '../src/movement/drillPlanner';
import { localMovementAnalyzer } from '../src/movement/localAnalyzer';
import { createReportAnnotation, updateCueFeedback } from '../src/movement/reportAnnotationRepository';
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

describe('drill planner', () => {
  it('builds a weekly plan from local report cues', async () => {
    const plan = buildDrillPlan(await buildReports());

    expect(plan.sourceReportCount).toBe(3);
    expect(plan.items.length).toBeGreaterThan(0);
    expect(plan.weeklyLoad).toContain('priority');
    expect(plan.items[0].priority).toBe('high');
    expect(plan.items[0].dosage).toContain('focused repeats');
    expect(plan.items[0].evidence).toContain('s');
  });

  it('deduplicates repeated cue ids while keeping a higher priority item', async () => {
    const reports = await buildReports();
    const baseCue = reports[0].cues[0];
    const repeatedWatchCue: MovementCue = {
      ...baseCue,
      severity: 'watch',
      title: 'Lower priority duplicate',
    };
    const repeatedFixCue: MovementCue = {
      ...baseCue,
      severity: 'fix',
      title: 'Higher priority duplicate',
    };
    const plan = buildDrillPlan([
      {
        ...reports[0],
        cues: [repeatedWatchCue],
      },
      {
        ...reports[1],
        cues: [repeatedFixCue],
      },
    ]);

    expect(plan.items).toHaveLength(1);
    expect(plan.items[0].priority).toBe('high');
    expect(plan.items[0].title).toBe('Higher priority duplicate');
  });

  it('adapts drill evidence from private useful cue feedback', async () => {
    const reports = await buildReports();
    const cueId = reports[0].cues[0].id;
    const annotations = [
      updateCueFeedback(createReportAnnotation(reports[0].id), {
        cueId,
        rating: 'useful',
        updatedAt: '2026-06-19T11:00:00.000Z',
      }),
    ];

    const plan = buildDrillPlan(reports, annotations);
    const item = plan.items.find((drill) => drill.cueId === cueId);

    expect(item?.feedbackStatus).toBe('reinforce');
    expect(item?.feedbackEvidence).toContain('marked useful');
  });

  it('flags drill variants when private cue feedback needs review', async () => {
    const reports = await buildReports();
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

    const plan = buildDrillPlan(reports, annotations);
    const item = plan.items.find((drill) => drill.cueId === cueId);

    expect(item?.feedbackStatus).toBe('variant');
    expect(item?.feedbackEvidence).toContain('need review');
    expect(plan.weeklyLoad).toContain('need variants');
  });

  it('adds selected coach lens guidance to drill dosage', async () => {
    const report = await localMovementAnalyzer.analyze({
      coachLens: 'footwork',
      frames: sampleAttempts[0].frames,
      session: sampleAttempts[0].session,
    });
    const plan = buildDrillPlan([report]);
    const footworkItem = plan.items.find((item) => item.cueId === 'cue-foot-cut');

    expect(footworkItem?.dosage).toContain('quiet-feet lens');
  });

  it('ignores orphan feedback when adapting drill plans', async () => {
    const reports = await buildReports();
    const cueId = reports[0].cues[0].id;
    const annotations = [
      updateCueFeedback(createReportAnnotation('deleted-report'), {
        cueId,
        rating: 'not-useful',
        updatedAt: '2026-06-19T11:00:00.000Z',
      }),
    ];

    const plan = buildDrillPlan(reports, annotations);
    const item = plan.items.find((drill) => drill.cueId === cueId);

    expect(item?.feedbackStatus).toBe('untested');
    expect(item?.feedbackEvidence).toContain('No private feedback');
  });

  it('returns an empty plan when no report has coach cues', async () => {
    const reports = await buildReports();
    const plan = buildDrillPlan([{ ...reports[0], cues: [] }]);

    expect(plan.sourceReportCount).toBe(1);
    expect(plan.items).toEqual([]);
    expect(plan.weeklyLoad).toContain('No focused drill load');
  });
});
