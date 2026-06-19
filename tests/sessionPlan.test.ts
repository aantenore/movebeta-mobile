import { describe, expect, it } from 'vitest';

import { localMovementAnalyzer } from '../src/movement/localAnalyzer';
import { createReportAnnotation } from '../src/movement/reportAnnotationRepository';
import { sampleAttempts } from '../src/movement/sampleSession';
import { buildSessionPlan } from '../src/movement/sessionPlan';

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

describe('session plan', () => {
  it('creates a short baseline plan before any local report exists', () => {
    const plan = buildSessionPlan([], []);

    expect(plan.status).toBe('baseline');
    expect(plan.intensityCap).toBe('baseline');
    expect(plan.durationMinutes).toBe(25);
    expect(plan.phases.map((phase) => phase.id)).toEqual(['baseline-warmup', 'baseline-record', 'baseline-log']);
    expect(plan.safetyNote).toContain('calibration');
  });

  it('turns high-effort project notes into a recovery technique session', async () => {
    const reports = await buildSampleReports();
    const plan = buildSessionPlan(reports, [
      createReportAnnotation(reports[0].id, {
        confidence: 2,
        perceivedEffort: 5,
        projectStatus: 'project',
      }),
    ]);

    expect(plan.status).toBe('recover');
    expect(plan.intensityCap).toBe('easy');
    expect(plan.durationMinutes).toBe(30);
    expect(plan.phases.map((phase) => phase.id)).toContain('recover-drill');
    expect(plan.safetyNote).toContain('Avoid max-intensity');
  });

  it('builds a repeat session around the active private project', async () => {
    const reports = await buildSampleReports();
    const plan = buildSessionPlan(reports, [
      createReportAnnotation(reports[1].id, {
        confidence: 3,
        perceivedEffort: 4,
        projectStatus: 'repeat',
        updatedAt: '2026-06-19T16:00:00.000Z',
      }),
    ]);

    expect(plan.status).toBe('repeat');
    expect(plan.intensityCap).toBe('moderate');
    expect(plan.anchor).toBe(reports[1].session.title);
    expect(plan.phases.find((phase) => phase.id === 'repeat-project')?.instruction).toContain('Repeat');
    expect(plan.durationMinutes).toBe(45);
  });
});
