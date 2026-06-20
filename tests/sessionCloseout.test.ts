import { describe, expect, it } from 'vitest';

import { createDrillPracticeRecord } from '../src/movement/drillPracticeRepository';
import { localMovementAnalyzer } from '../src/movement/localAnalyzer';
import { createReportAnnotation, updateRepeatOutcome } from '../src/movement/reportAnnotationRepository';
import { sampleAttempts } from '../src/movement/sampleSession';
import { assertSessionCloseoutIsShareSafe, buildSessionCloseout } from '../src/movement/sessionCloseout';

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

describe('session closeout', () => {
  it('creates baseline closeout actions before any local report exists', () => {
    const closeout = buildSessionCloseout({
      annotations: [],
      generatedAt: '2026-06-20T10:00:00.000Z',
      reports: [],
    });

    expect(closeout.schemaVersion).toBe('movebeta.session-closeout.v1');
    expect(closeout.status).toBe('baseline-needed');
    expect(closeout.summary.neededCount).toBe(2);
    expect(closeout.actions.map((action) => action.id)).toEqual(['baseline-analysis', 'baseline-training-log']);
    expect(closeout.nextAction).toContain('baseline');
    expect(closeout.privacy).toEqual({
      cloudUploadRequired: false,
      privateNotesIncluded: false,
      rawVideoIncluded: false,
    });
  });

  it('builds a privacy-safe closeout checklist for the latest report', async () => {
    const reports = await buildSampleReports();
    const closeout = buildSessionCloseout({
      annotations: [],
      drillPractice: [],
      generatedAt: '2026-06-20T10:00:00.000Z',
      reports,
    });

    expect(closeout.status).toBe('ready-to-close');
    expect(closeout.summary.actionCount).toBe(4);
    expect(closeout.summary.neededCount).toBeGreaterThan(0);
    expect(closeout.actions.map((action) => action.id)).toEqual([
      'training-log',
      'drill-follow-through',
      'repeat-outcome',
      'privacy-boundary',
    ]);
    expect(closeout.actions.find((action) => action.id === 'privacy-boundary')?.status).toBe('ready');
    expect(JSON.stringify(closeout)).not.toContain('keyFrame');
    expect(assertSessionCloseoutIsShareSafe(closeout)).toBe(closeout);
  });

  it('marks the closeout complete when the latest training, drill, and repeat evidence is logged', async () => {
    const reports = await buildSampleReports();
    const latest = [...reports].sort((a, b) => b.session.createdAt.localeCompare(a.session.createdAt))[0];
    const cueId = latest.cues[0].id;
    const annotation = updateRepeatOutcome(
      createReportAnnotation(latest.id, {
        confidence: 4,
        perceivedEffort: 3,
        privateNote: 'This private note must not appear in closeout output.',
        projectStatus: 'repeat',
      }),
      {
        attempts: 2,
        resolvedCueIds: [cueId],
        status: 'improved',
        updatedAt: '2026-06-20T10:05:00.000Z',
      },
    );
    const closeout = buildSessionCloseout({
      annotations: [annotation],
      drillPractice: [
        createDrillPracticeRecord({
          cueId,
          drillId: `${cueId}-${latest.id}`,
          reportId: latest.id,
          status: 'completed',
          updatedAt: '2026-06-20T10:04:00.000Z',
        }),
      ],
      generatedAt: '2026-06-20T10:10:00.000Z',
      reports,
    });

    expect(closeout.status).toBe('evidence-complete');
    expect(closeout.summary.readyCount).toBe(4);
    expect(closeout.summary.neededCount).toBe(0);
    expect(closeout.nextAction).toContain('enough local evidence');
    expect(JSON.stringify(closeout)).not.toContain(annotation.privateNote);
  });

  it('rejects injected local paths, raw video, landmarks, private notes, and token-like values', async () => {
    const reports = await buildSampleReports();
    const closeout = buildSessionCloseout({
      annotations: [],
      generatedAt: '2026-06-20T10:00:00.000Z',
      reports,
    });
    const unsafe = {
      ...closeout,
      actions: [
        ...closeout.actions,
        {
          detail: 'Leaked /Users/example/raw-video.mov with token abc.',
          id: 'unsafe',
          label: 'Unsafe',
          ownerSurface: 'Progress',
          requiredBeforeNextAnalysis: true,
          status: 'needed',
        },
      ],
    };

    expect(() => assertSessionCloseoutIsShareSafe(unsafe as typeof closeout)).toThrow('Session closeout contains local paths');
  });
});
