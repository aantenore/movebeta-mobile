import { describe, expect, it } from 'vitest';

import { compareAttempts, compareLatestAttempts } from '../src/movement/attemptComparison';
import type { LocalAnalysisReport } from '../src/movement/contracts';
import { localMovementAnalyzer } from '../src/movement/localAnalyzer';
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

function withMetricScore(report: LocalAnalysisReport, metricId: string, score: number): LocalAnalysisReport {
  return {
    ...report,
    metrics: report.metrics.map((metric) => (metric.id === metricId ? { ...metric, score } : metric)),
  };
}

describe('attempt comparison', () => {
  it('compares the latest attempt against the previous local report', async () => {
    const reports = await buildSampleReports();
    const comparison = compareLatestAttempts(reports);

    expect(comparison).not.toBeNull();
    expect(comparison?.currentReport.session.id).toBe('session-slab-001');
    expect(comparison?.baselineReport.session.id).toBe('session-vertical-001');
    expect(comparison?.metrics).toHaveLength(comparison?.currentReport.metrics.length ?? 0);
    expect(comparison?.headline).toContain('Movement quality');
    expect(comparison?.recommendation.length).toBeGreaterThan(20);
  });

  it('classifies metric improvements and regressions from score deltas', async () => {
    const [baseline] = await buildSampleReports();
    const current = withMetricScore(withMetricScore(baseline, 'flow', 95), 'foot-cuts', 40);
    const comparison = compareAttempts(current, baseline);

    expect(comparison.metrics.find((metric) => metric.id === 'flow')?.direction).toBe('improved');
    expect(comparison.metrics.find((metric) => metric.id === 'foot-cuts')?.direction).toBe('regressed');
    expect(comparison.improvedMetrics.some((metric) => metric.id === 'flow')).toBe(true);
    expect(comparison.regressedMetrics.some((metric) => metric.id === 'foot-cuts')).toBe(true);
  });

  it('tracks recurring, new, and resolved coaching cues', async () => {
    const [baseline] = await buildSampleReports();
    const current = {
      ...baseline,
      cues: [
        baseline.cues[0],
        {
          body: 'New cue body',
          drill: 'New cue drill',
          id: 'cue-new-test',
          severity: 'watch' as const,
          timestampMs: 1200,
          title: 'New cue',
        },
      ],
    };
    const comparison = compareAttempts(current, baseline);

    expect(comparison.cueComparison.recurringCues.map((cue) => cue.id)).toContain(baseline.cues[0].id);
    expect(comparison.cueComparison.newCues.map((cue) => cue.id)).toContain('cue-new-test');
    expect(comparison.cueComparison.resolvedCues.length).toBe(Math.max(0, baseline.cues.length - 1));
  });

  it('returns null when fewer than two reports are available', async () => {
    const [report] = await buildSampleReports();

    expect(compareLatestAttempts([])).toBeNull();
    expect(compareLatestAttempts([report])).toBeNull();
  });
});
