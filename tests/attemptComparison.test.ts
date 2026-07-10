import { describe, expect, it } from 'vitest';

import {
  assessAttemptComparisonCompatibility,
  compareAttempts,
  compareLatestAttempts,
} from '../src/movement/attemptComparison';
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
  it('does not compare unrelated sample attempts only because they are consecutive', async () => {
    const reports = await buildSampleReports();
    const comparison = compareLatestAttempts(reports);

    expect(comparison).toBeNull();
  });

  it('compares the latest attempt against the best matching baseline, not only the nearest report', async () => {
    const [overhang, vertical, slab] = await buildSampleReports();
    const current: LocalAnalysisReport = {
      ...overhang,
      id: 'current-overhang-repeat',
      session: {
        ...overhang.session,
        createdAt: '2026-06-17T11:00:00+02:00',
        id: 'session-current-overhang-repeat',
        title: 'Overhang board repeat',
      },
    };
    const chronologicalPrevious: LocalAnalysisReport = {
      ...slab,
      id: 'chronological-slab',
      session: {
        ...slab.session,
        createdAt: '2026-06-17T10:59:00+02:00',
        id: 'session-chronological-slab',
      },
    };
    const comparableBaseline: LocalAnalysisReport = {
      ...overhang,
      id: 'baseline-overhang',
      session: {
        ...overhang.session,
        createdAt: '2026-06-17T10:00:00+02:00',
        id: 'session-baseline-overhang',
      },
    };
    const comparison = compareLatestAttempts([vertical, chronologicalPrevious, comparableBaseline, current]);

    expect(comparison?.currentReport.id).toBe('current-overhang-repeat');
    expect(comparison?.baselineReport.id).toBe('baseline-overhang');
    expect(comparison?.baselineMatch.confidence).toBe('high');
  });

  it('uses the explicit focused-repeat baseline before similarity matching', async () => {
    const [baseline, unrelated] = await buildSampleReports();
    const current: LocalAnalysisReport = {
      ...baseline,
      id: 'explicit-repeat',
      session: {
        ...baseline.session,
        baselineReportId: baseline.id,
        createdAt: '2026-06-17T12:00:00+02:00',
        id: 'session-explicit-repeat',
        projectId: 'project-focused-repeat',
      },
    };
    const explicitBaseline: LocalAnalysisReport = {
      ...baseline,
      session: { ...baseline.session, projectId: 'project-focused-repeat' },
    };

    const comparison = compareLatestAttempts([unrelated, explicitBaseline, current]);

    expect(comparison?.baselineReport.id).toBe(explicitBaseline.id);
    expect(comparison?.baselineMatch.strategy).toBe('manual');
  });

  it('does not publish a low-confidence automatic comparison', async () => {
    const [baseline, currentTemplate] = await buildSampleReports();
    const current: LocalAnalysisReport = {
      ...currentTemplate,
      id: 'unrelated-current',
      cues: [],
      session: {
        ...currentTemplate.session,
        createdAt: '2027-08-01T12:00:00+02:00',
        grade: 'V12',
        gym: 'Different continent',
        id: 'session-unrelated-current',
        title: 'Completely unrelated climb',
        wallAngle: currentTemplate.session.wallAngle === 'slab' ? 'overhang' : 'slab',
      },
    };

    expect(compareLatestAttempts([baseline, current])).toBeNull();
  });

  it('rejects an explicit repeat when the analysis model or capture orientation changed', async () => {
    const [template] = await buildSampleReports();
    const baseline: LocalAnalysisReport = {
      ...template,
      engine: {
        ...template.engine,
        capture: { height: 1920, orientation: 'portrait', width: 1080 },
      },
      session: { ...template.session, projectId: 'project-compatibility' },
    };
    const current: LocalAnalysisReport = {
      ...baseline,
      engine: {
        ...baseline.engine,
        capture: { height: 1080, orientation: 'landscape', width: 1920 },
        model: 'different-model',
      },
      id: 'incompatible-repeat',
      session: {
        ...baseline.session,
        baselineReportId: baseline.id,
        createdAt: '2026-06-17T12:00:00+02:00',
        id: 'session-incompatible-repeat',
      },
    };

    const compatibility = assessAttemptComparisonCompatibility(current, baseline);

    expect(compatibility.compatible).toBe(false);
    expect(compatibility.reasons.join(' ')).toContain('pose model changed');
    expect(compatibility.reasons.join(' ')).toContain('video orientation changed');
    expect(compareLatestAttempts([baseline, current])).toBeNull();
  });

  it('classifies metric improvements and regressions from score deltas', async () => {
    const [baseline] = await buildSampleReports();
    const baselineFlow = baseline.metrics.find((metric) => metric.id === 'flow')?.score ?? 50;
    const baselineFootCuts = baseline.metrics.find((metric) => metric.id === 'foot-cuts')?.score ?? 50;
    const current = withMetricScore(
      withMetricScore(baseline, 'flow', Math.min(100, baselineFlow + 20)),
      'foot-cuts',
      Math.max(0, baselineFootCuts - 20),
    );
    current.id = 'metric-repeat';
    current.session = { ...current.session, id: 'session-metric-repeat' };
    const comparison = compareAttempts(current, baseline);

    expect(comparison.metrics.find((metric) => metric.id === 'flow')?.direction).toBe('improved');
    expect(comparison.metrics.find((metric) => metric.id === 'foot-cuts')?.direction).toBe('regressed');
    expect(comparison.improvedMetrics.some((metric) => metric.id === 'flow')).toBe(true);
    expect(comparison.regressedMetrics.some((metric) => metric.id === 'foot-cuts')).toBe(true);
  });

  it('treats small score changes as measurement noise', async () => {
    const [baseline] = await buildSampleReports();
    const baselineFlow = baseline.metrics.find((metric) => metric.id === 'flow')?.score ?? 50;
    const current = withMetricScore(baseline, 'flow', Math.min(100, baselineFlow + 4));
    current.id = 'noise-repeat';
    current.session = { ...current.session, id: 'session-noise-repeat' };

    const comparison = compareAttempts(current, baseline);

    expect(comparison.metrics.find((metric) => metric.id === 'flow')?.direction).toBe('flat');
    expect(comparison.headline).toContain('steady');
  });

  it('answers whether the exact focused cue regressed even when another metric improved', async () => {
    const [template] = await buildSampleReports();
    const cue = template.cues.find((candidate) => candidate.id === 'cue-pause') ?? template.cues[0];
    const metricId = cue.id === 'cue-pause' ? 'pause-time' : cue.id === 'cue-lockoff' ? 'lock-off' : cue.id === 'cue-hip' ? 'hip-drift' : 'foot-cuts';
    const targetScore = template.metrics.find((metric) => metric.id === metricId)?.score ?? 60;
    const flowScore = template.metrics.find((metric) => metric.id === 'flow')?.score ?? 60;
    const current = withMetricScore(
      withMetricScore(template, metricId, Math.max(0, targetScore - 20)),
      'flow',
      Math.min(100, flowScore + 20),
    );
    current.id = 'focused-cue-regression';
    current.session = {
      ...current.session,
      baselineReportId: template.id,
      id: 'session-focused-cue-regression',
      targetCueId: cue.id,
    };

    const comparison = compareAttempts(current, template);

    expect(comparison.targetFocus?.cueId).toBe(cue.id);
    expect(comparison.targetFocus?.status).toBe('regressed');
    expect(comparison.headline).toContain('increased');
  });

  it('reports a focused signal as absent when the target cue does not recur', async () => {
    const [baseline] = await buildSampleReports();
    const cue = baseline.cues[0];
    const current: LocalAnalysisReport = {
      ...baseline,
      cues: baseline.cues.filter((candidate) => candidate.id !== cue.id),
      id: 'focused-cue-cleared',
      session: {
        ...baseline.session,
        baselineReportId: baseline.id,
        id: 'session-focused-cue-cleared',
        targetCueId: cue.id,
      },
    };

    const comparison = compareAttempts(current, baseline);

    expect(comparison.targetFocus?.status).toBe('cleared');
    expect(comparison.headline).toContain('was not detected');
  });

  it('rejects repeats whose analyzed duration changes materially', async () => {
    const [baseline] = await buildSampleReports();
    const current: LocalAnalysisReport = {
      ...baseline,
      id: 'duration-mismatch',
      session: {
        ...baseline.session,
        durationMs: baseline.session.durationMs * 1.6,
        id: 'session-duration-mismatch',
      },
    };

    const compatibility = assessAttemptComparisonCompatibility(current, baseline);

    expect(compatibility.compatible).toBe(false);
    expect(compatibility.reasons.join(' ')).toContain('duration changed');
  });

  it('tracks recurring, new, and resolved coaching cues', async () => {
    const [baseline] = await buildSampleReports();
    const current = {
      ...baseline,
      id: 'cue-repeat',
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
      session: { ...baseline.session, id: 'session-cue-repeat' },
    };
    const comparison = compareAttempts(current, baseline);

    expect(comparison.cueComparison.recurringCues.map((cue) => cue.id)).toContain(baseline.cues[0].id);
    expect(comparison.cueComparison.newCues.map((cue) => cue.id)).toContain('cue-new-test');
    expect(comparison.cueComparison.resolvedCues.length).toBe(Math.max(0, baseline.cues.length - 1));
  });

  it('computes the overall delta only from metrics measured in both attempts', async () => {
    const [baselineTemplate] = await buildSampleReports();
    const baseline: LocalAnalysisReport = {
      ...baselineTemplate,
      metrics: baselineTemplate.metrics.map((metric) =>
        metric.id === 'foot-cuts' ? { ...metric, score: 0, status: 'insufficient-data', value: 0 } : metric,
      ),
    };
    const current: LocalAnalysisReport = {
      ...baselineTemplate,
      id: 'common-metrics-repeat',
      session: { ...baselineTemplate.session, id: 'session-common-metrics-repeat' },
    };

    const comparison = compareAttempts(current, baseline);

    expect(comparison.metrics.map((metric) => metric.id)).not.toContain('foot-cuts');
    expect(comparison.overallScoreDelta).toBe(0);
  });

  it('returns null when fewer than two reports are available', async () => {
    const [report] = await buildSampleReports();

    expect(compareLatestAttempts([])).toBeNull();
    expect(compareLatestAttempts([report])).toBeNull();
  });
});
