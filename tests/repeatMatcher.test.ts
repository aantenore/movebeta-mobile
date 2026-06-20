import { describe, expect, it } from 'vitest';

import type { LocalAnalysisReport } from '../src/movement/contracts';
import { localMovementAnalyzer } from '../src/movement/localAnalyzer';
import { createReportAnnotation } from '../src/movement/reportAnnotationRepository';
import { findBestRepeatMatch } from '../src/movement/repeatMatcher';
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

function cloneReport(report: LocalAnalysisReport, id: string, createdAt: string, title = report.session.title): LocalAnalysisReport {
  return {
    ...report,
    id,
    session: {
      ...report.session,
      createdAt,
      id: `session-${id}`,
      title,
    },
  };
}

describe('repeat matcher', () => {
  it('selects the most comparable local baseline instead of the nearest chronological report', async () => {
    const [overhang, vertical, slab] = await buildSampleReports();
    const current = cloneReport(overhang, 'current-overhang-repeat', '2026-06-17T11:00:00+02:00', 'Overhang board repeat');
    const chronologicalPrevious = cloneReport(slab, 'chronological-slab', '2026-06-17T10:59:00+02:00');
    const comparableBaseline = cloneReport(overhang, 'baseline-overhang', '2026-06-17T10:00:00+02:00');
    const match = findBestRepeatMatch(current, [chronologicalPrevious, vertical, comparableBaseline]);

    expect(match?.report.id).toBe('baseline-overhang');
    expect(match?.confidence).toBe('high');
    expect(match?.reasons.map((reason) => reason.id)).toEqual(expect.arrayContaining(['wall-angle', 'gym', 'grade']));
  });

  it('uses private local annotations for tag and project-status confidence without exposing notes', async () => {
    const [overhang, vertical] = await buildSampleReports();
    const current = cloneReport(overhang, 'current-project', '2026-06-17T11:00:00+02:00');
    const candidate = cloneReport(vertical, 'tagged-candidate', '2026-06-17T10:30:00+02:00');
    const annotations = [
      createReportAnnotation(current.id, {
        privateNote: 'Private note should stay outside matching reasons.',
        projectStatus: 'repeat',
        tags: ['crux', 'left-hip'],
      }),
      createReportAnnotation(candidate.id, {
        privateNote: 'Another private note.',
        projectStatus: 'repeat',
        tags: ['crux', 'board'],
      }),
    ];
    const match = findBestRepeatMatch(current, [candidate], annotations);

    expect(match?.reasons.map((reason) => reason.id)).toEqual(expect.arrayContaining(['tags', 'project-status']));
    expect(JSON.stringify(match)).not.toContain('Private note');
  });

  it('does not award project-status confidence when local annotation states differ', async () => {
    const [overhang, vertical] = await buildSampleReports();
    const current = cloneReport(overhang, 'current-project-status', '2026-06-17T11:00:00+02:00');
    const candidate = cloneReport(vertical, 'different-project-status', '2026-06-17T10:30:00+02:00');
    const annotations = [
      createReportAnnotation(current.id, {
        projectStatus: 'repeat',
      }),
      createReportAnnotation(candidate.id, {
        projectStatus: 'sent',
      }),
    ];
    const match = findBestRepeatMatch(current, [candidate], annotations);

    expect(match?.reasons.map((reason) => reason.id)).not.toContain('project-status');
  });

  it('returns null when no eligible baseline exists', async () => {
    const [report] = await buildSampleReports();

    expect(findBestRepeatMatch(report, [])).toBeNull();
    expect(findBestRepeatMatch(report, [report])).toBeNull();
  });
});
