import { describe, expect, it } from 'vitest';

import { buildBetaReplayPlan, BetaReplayPlanSchema } from '../src/movement/betaReplayPlan';
import { analyzeSampleSession } from '../src/movement/repository';

describe('beta replay plan', () => {
  it('turns local cue evidence into a three-step repeat plan', async () => {
    const report = await analyzeSampleSession();
    const plan = buildBetaReplayPlan(report);

    expect(BetaReplayPlanSchema.parse(plan)).toEqual(plan);
    expect(plan.steps.map((step) => step.phase).sort()).toEqual(['crux', 'exit', 'setup']);
    expect(plan.steps).toHaveLength(3);
    expect(plan.focusCueIds.length).toBeGreaterThan(0);
    expect(plan.primaryFocus).toBe('Review sustained elbow flexion');
    expect(plan.summary).toContain('review sustained elbow flexion');
  });

  it('keeps replay steps sorted by observed timestamps', async () => {
    const report = await analyzeSampleSession();
    const plan = buildBetaReplayPlan(report);
    const sorted = [...plan.steps].sort((a, b) => a.timestampMs - b.timestampMs || a.id.localeCompare(b.id));

    expect(plan.steps).toEqual(sorted);
    expect(plan.steps.every((step) => step.timestampMs >= 0)).toBe(true);
  });

  it('uses the selected coach lens when choosing beta replay focus', async () => {
    const report = await analyzeSampleSession('footwork');
    const plan = buildBetaReplayPlan(report);

    expect(plan.primaryFocus).toBe('Check rapid foot movement');
    expect(plan.focusCueIds[0]).toBe('cue-foot-cut');
    expect(plan.summary).toContain('Prioritize quiet feet');
  });

  it('falls back to weak metrics when no cue crosses a coaching threshold', async () => {
    const report = await analyzeSampleSession();
    const plan = buildBetaReplayPlan({
      ...report,
      cues: [],
      timeline: [],
    });

    expect(plan.focusCueIds).toEqual([]);
    expect(plan.primaryFocus).toBe('Elbow-flexion time');
    expect(plan.summary).toContain('elbow-flexion time');
    expect(plan.steps.every((step) => step.evidence.length > 0)).toBe(true);
  });
});
