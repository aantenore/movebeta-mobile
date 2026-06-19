import { describe, expect, it } from 'vitest';

import { buildMovementPhaseBreakdown, MovementPhaseBreakdownSchema } from '../src/movement/movementPhaseBreakdown';
import { analyzeSampleSession } from '../src/movement/repository';

describe('movement phase breakdown', () => {
  it('splits a local report into launch, crux, and finish phases', async () => {
    const report = await analyzeSampleSession();
    const breakdown = buildMovementPhaseBreakdown(report);

    expect(MovementPhaseBreakdownSchema.parse(breakdown)).toEqual(breakdown);
    expect(breakdown.phases.map((phase) => phase.id)).toEqual(['launch', 'crux', 'finish']);
    expect(breakdown.phases.every((phase) => phase.startMs < phase.endMs)).toBe(true);
    expect(breakdown.phases.every((phase) => phase.score >= 0 && phase.score <= 100)).toBe(true);
  });

  it('selects the lowest-scoring phase as the primary phase', async () => {
    const report = await analyzeSampleSession();
    const breakdown = buildMovementPhaseBreakdown(report);
    const weakest = [...breakdown.phases].sort((a, b) => a.score - b.score || a.startMs - b.startMs)[0];

    expect(breakdown.primaryPhaseId).toBe(weakest.id);
    expect(breakdown.summary).toContain(weakest.title);
  });

  it('uses smooth fallback copy when the report has no disruptive cues or events', async () => {
    const report = await analyzeSampleSession();
    const breakdown = buildMovementPhaseBreakdown({
      ...report,
      analysisQuality: {
        ...report.analysisQuality,
        score: 100,
      },
      cues: [],
      timeline: [],
    });

    expect(breakdown.summary).toBe('All three movement phases are smooth enough for one controlled repeat.');
    expect(breakdown.phases.every((phase) => phase.status === 'smooth')).toBe(true);
    expect(breakdown.phases.every((phase) => phase.evidence.includes('No disruptive cue'))).toBe(true);
  });
});
