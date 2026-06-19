import { describe, expect, it } from 'vitest';

import { createDrillPracticeRecord } from '../src/movement/drillPracticeRepository';
import { localMovementAnalyzer } from '../src/movement/localAnalyzer';
import { createReportAnnotation, updateRepeatOutcome } from '../src/movement/reportAnnotationRepository';
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

  it('lowers intensity when skipped practice logs show follow-through is blocked', async () => {
    const reports = await buildSampleReports();
    const cueId = reports[0].cues[0].id;
    const plan = buildSessionPlan(
      reports,
      [],
      [
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
      ],
    );

    expect(plan.title).toBe('Practice reset session');
    expect(plan.status).toBe('recover');
    expect(plan.intensityCap).toBe('easy');
    expect(plan.phases.map((phase) => phase.id)).toContain('practice-reset-drill');
    expect(plan.safetyNote).toContain('Reduce complexity');
  });

  it('lowers intensity when repeat outcomes stall after comparable attempts', async () => {
    const reports = await buildSampleReports();
    const plan = buildSessionPlan(reports, [
      updateRepeatOutcome(createReportAnnotation(reports[0].id), {
        attempts: 2,
        resolvedCueIds: [],
        status: 'fell',
        updatedAt: '2026-06-19T18:00:00.000Z',
      }),
      updateRepeatOutcome(createReportAnnotation(reports[1].id), {
        attempts: 2,
        resolvedCueIds: [],
        status: 'regressed',
        updatedAt: '2026-06-19T19:00:00.000Z',
      }),
    ]);

    expect(plan.title).toBe('Repeat outcome reset');
    expect(plan.status).toBe('recover');
    expect(plan.intensityCap).toBe('easy');
    expect(plan.phases.map((phase) => phase.id)).toContain('repeat-outcome-reset-drill');
    expect(plan.safetyNote).toContain('repeat outcome improves');
  });
});
