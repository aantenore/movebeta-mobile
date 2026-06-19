import { describe, expect, it } from 'vitest';

import type { MovementCue } from '../src/movement/contracts';
import { buildDrillPlan } from '../src/movement/drillPlanner';
import { localMovementAnalyzer } from '../src/movement/localAnalyzer';
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

  it('returns an empty plan when no report has coach cues', async () => {
    const reports = await buildReports();
    const plan = buildDrillPlan([{ ...reports[0], cues: [] }]);

    expect(plan.sourceReportCount).toBe(1);
    expect(plan.items).toEqual([]);
    expect(plan.weeklyLoad).toContain('No focused drill load');
  });
});
