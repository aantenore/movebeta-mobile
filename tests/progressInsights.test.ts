import { describe, expect, it } from 'vitest';

import { localMovementAnalyzer } from '../src/movement/localAnalyzer';
import { createReportAnnotation } from '../src/movement/reportAnnotationRepository';
import { summarizeProgress } from '../src/movement/progressInsights';
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

describe('progress insights', () => {
  it('summarizes local reports into best signal, focus metric, and metric trends', async () => {
    const reports = await buildSampleReports();
    const summary = summarizeProgress(reports);

    expect(summary.attemptCount).toBe(3);
    expect(summary.averageQuality).toBeGreaterThan(90);
    expect(summary.latestReport?.session.id).toBe('session-slab-001');
    expect(summary.bestMetric?.score).toBeGreaterThanOrEqual(summary.focusMetric?.score ?? 0);
    expect(summary.attemptComparison?.currentReport.session.id).toBe('session-slab-001');
    expect(summary.attemptComparison?.baselineReport.session.id).toBe('session-vertical-001');
    expect(summary.attemptComparison?.baselineMatch.strategy).toBe('smart-match');
    expect(summary.trends).toHaveLength(summary.latestReport?.metrics.length ?? 0);
    expect(summary.trends.some((trend) => trend.delta !== null)).toBe(true);
  });

  it('passes local annotations into smart repeat matching', async () => {
    const reports = await buildSampleReports();
    const latest = reports.find((report) => report.session.id === 'session-slab-001');
    const previous = reports.find((report) => report.session.id === 'session-vertical-001');
    const summary = summarizeProgress(reports, [
      createReportAnnotation(latest?.id ?? '', {
        projectStatus: 'repeat',
        tags: ['slab'],
      }),
      createReportAnnotation(previous?.id ?? '', {
        projectStatus: 'repeat',
        tags: ['slab'],
      }),
    ]);

    expect(summary.attemptComparison?.baselineMatch.reasons.map((reason) => reason.id)).toEqual(
      expect.arrayContaining(['tags', 'project-status']),
    );
  });

  it('returns an empty summary without throwing when there are no reports', () => {
    const summary = summarizeProgress([]);

    expect(summary.attemptCount).toBe(0);
    expect(summary.averageQuality).toBe(0);
    expect(summary.latestReport).toBeNull();
    expect(summary.bestMetric).toBeNull();
    expect(summary.focusMetric).toBeNull();
    expect(summary.attemptComparison).toBeNull();
    expect(summary.trends).toEqual([]);
  });
});
