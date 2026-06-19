import { describe, expect, it } from 'vitest';

import { localMovementAnalyzer } from '../src/movement/localAnalyzer';
import { summarizeProjectQueue } from '../src/movement/projectQueue';
import { createReportAnnotation } from '../src/movement/reportAnnotationRepository';
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

describe('project queue', () => {
  it('summarizes private annotations into an actionable project queue', async () => {
    const reports = await buildSampleReports();
    const annotations = [
      createReportAnnotation(reports[0].id, {
        confidence: 2,
        perceivedEffort: 5,
        projectStatus: 'project',
        updatedAt: '2026-06-19T12:00:00.000Z',
      }),
      createReportAnnotation(reports[1].id, {
        confidence: 4,
        perceivedEffort: 4,
        projectStatus: 'repeat',
        updatedAt: '2026-06-19T12:10:00.000Z',
      }),
      createReportAnnotation(reports[2].id, {
        confidence: 5,
        perceivedEffort: 2,
        projectStatus: 'sent',
        updatedAt: '2026-06-19T12:20:00.000Z',
      }),
    ];

    const summary = summarizeProjectQueue(reports, annotations);

    expect(summary.annotatedCount).toBe(3);
    expect(summary.activeCount).toBe(2);
    expect(summary.repeatCount).toBe(1);
    expect(summary.sentCount).toBe(1);
    expect(summary.averageEffort).toBeCloseTo(3.7, 1);
    expect(summary.nextProject?.annotation.projectStatus).toBe('repeat');
    expect(summary.nextProject?.action).toContain('Repeat');
  });

  it('ignores annotations whose report no longer exists', async () => {
    const reports = await buildSampleReports();
    const summary = summarizeProjectQueue(reports, [
      createReportAnnotation('deleted-report', {
        projectStatus: 'repeat',
      }),
    ]);

    expect(summary.annotatedCount).toBe(0);
    expect(summary.activeCount).toBe(0);
    expect(summary.nextProject).toBeNull();
  });
});
