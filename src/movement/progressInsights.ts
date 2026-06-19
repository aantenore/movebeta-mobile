import type { LocalAnalysisReport, MovementMetric } from './contracts';
import { compareLatestAttempts, type AttemptComparison } from './attemptComparison';

export type MetricTrend = {
  id: string;
  label: string;
  currentScore: number;
  previousScore: number | null;
  delta: number | null;
  direction: 'up' | 'down' | 'flat' | 'new';
};

export type ProgressInsightSummary = {
  attemptCount: number;
  averageQuality: number;
  latestReport: LocalAnalysisReport | null;
  bestMetric: MovementMetric | null;
  focusMetric: MovementMetric | null;
  attemptComparison: AttemptComparison | null;
  trends: MetricTrend[];
};

function sortReports(reports: LocalAnalysisReport[]) {
  return [...reports].sort((a, b) => b.session.createdAt.localeCompare(a.session.createdAt));
}

function average(values: number[]) {
  if (values.length === 0) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function directionFromDelta(delta: number | null): MetricTrend['direction'] {
  if (delta === null) return 'new';
  if (Math.abs(delta) < 2) return 'flat';
  return delta > 0 ? 'up' : 'down';
}

function findMetric(report: LocalAnalysisReport | null, metricId: string) {
  return report?.metrics.find((metric) => metric.id === metricId) ?? null;
}

export function summarizeProgress(reports: LocalAnalysisReport[]): ProgressInsightSummary {
  const orderedReports = sortReports(reports);
  const latestReport = orderedReports[0] ?? null;
  const previousReport = orderedReports[1] ?? null;
  const latestMetrics = latestReport?.metrics ?? [];
  const bestMetric = latestMetrics.length > 0 ? [...latestMetrics].sort((a, b) => b.score - a.score)[0] : null;
  const focusMetric = latestMetrics.length > 0 ? [...latestMetrics].sort((a, b) => a.score - b.score)[0] : null;
  const trends: MetricTrend[] = latestMetrics.map((metric) => {
    const previousMetric = findMetric(previousReport, metric.id);
    const delta = previousMetric ? metric.score - previousMetric.score : null;

    return {
      currentScore: metric.score,
      delta,
      direction: directionFromDelta(delta),
      id: metric.id,
      label: metric.label,
      previousScore: previousMetric?.score ?? null,
    };
  });

  return {
    attemptCount: orderedReports.length,
    attemptComparison: compareLatestAttempts(orderedReports),
    averageQuality: Math.round(average(orderedReports.map((report) => report.analysisQuality.score))),
    bestMetric,
    focusMetric,
    latestReport,
    trends,
  };
}
