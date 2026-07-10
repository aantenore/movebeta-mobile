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
  it('summarizes local reports without inventing trends across unrelated climbs', async () => {
    const reports = await buildSampleReports();
    const summary = summarizeProgress(reports);

    expect(summary.attemptCount).toBe(3);
    expect(summary.averageQuality).toBeGreaterThan(90);
    expect(summary.latestReport?.session.id).toBe('session-slab-001');
    expect(summary.bestMetric?.score).toBeGreaterThanOrEqual(summary.focusMetric?.score ?? 0);
    expect(summary.attemptComparison).toBeNull();
    expect(summary.trends).toHaveLength(summary.latestReport?.metrics.length ?? 0);
    expect(summary.trends.every((trend) => trend.delta === null)).toBe(true);
  });

  it('passes local annotations into smart repeat matching', async () => {
    const reports = await buildSampleReports();
    const template = reports.find((report) => report.session.id === 'session-slab-001');
    if (!template) throw new Error('Missing slab fixture.');
    const previous = {
      ...template,
      id: 'analysis-slab-baseline',
      session: { ...template.session, createdAt: '2026-06-17T09:00:00+02:00', id: 'session-slab-baseline' },
    };
    const latest = {
      ...template,
      id: 'analysis-slab-repeat',
      session: { ...template.session, createdAt: '2026-06-17T10:00:00+02:00', id: 'session-slab-repeat' },
    };
    const summary = summarizeProgress([previous, latest], [
      createReportAnnotation(latest.id, {
        projectStatus: 'repeat',
        tags: ['slab'],
      }),
      createReportAnnotation(previous.id, {
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

  it('excludes unavailable metrics from best, focus, and trend claims', async () => {
    const [report] = await buildSampleReports();
    const unavailableMetric = { ...report.metrics[0], score: 0, status: 'insufficient-data' as const, value: 0 };
    const summary = summarizeProgress([
      {
        ...report,
        metrics: [unavailableMetric, ...report.metrics.slice(1)],
      },
    ]);

    expect(summary.bestMetric?.id).not.toBe(unavailableMetric.id);
    expect(summary.focusMetric?.id).not.toBe(unavailableMetric.id);
    expect(summary.trends.map((trend) => trend.id)).not.toContain(unavailableMetric.id);
  });
});
