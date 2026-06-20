import type { LocalAnalysisReport, MovementCue, MovementMetric } from './contracts';
import type { ReportAnnotation } from './reportAnnotationRepository';
import {
  buildManualRepeatMatch,
  findBestRepeatMatch,
  type RepeatMatchSummary,
} from './repeatMatcher';

export type ComparisonDirection = 'improved' | 'regressed' | 'flat' | 'new';

export type MetricComparison = {
  id: string;
  label: string;
  currentScore: number;
  baselineScore: number | null;
  scoreDelta: number | null;
  currentValue: number;
  baselineValue: number | null;
  unit: string;
  direction: ComparisonDirection;
};

export type CueComparison = {
  newCues: MovementCue[];
  recurringCues: MovementCue[];
  resolvedCues: MovementCue[];
};

export type AttemptComparison = {
  baselineMatch: RepeatMatchSummary;
  currentReport: LocalAnalysisReport;
  baselineReport: LocalAnalysisReport;
  overallScoreDelta: number;
  qualityDelta: number;
  metrics: MetricComparison[];
  improvedMetrics: MetricComparison[];
  regressedMetrics: MetricComparison[];
  cueComparison: CueComparison;
  headline: string;
  recommendation: string;
};

function sortReports(reports: LocalAnalysisReport[]) {
  return [...reports].sort((a, b) => b.session.createdAt.localeCompare(a.session.createdAt));
}

function average(values: number[]) {
  if (values.length === 0) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function directionFromDelta(delta: number | null): ComparisonDirection {
  if (delta === null) return 'new';
  if (Math.abs(delta) < 2) return 'flat';
  return delta > 0 ? 'improved' : 'regressed';
}

function metricById(metrics: MovementMetric[]) {
  return new Map(metrics.map((metric) => [metric.id, metric]));
}

function cueById(cues: MovementCue[]) {
  return new Map(cues.map((cue) => [cue.id, cue]));
}

function buildCueComparison(currentReport: LocalAnalysisReport, baselineReport: LocalAnalysisReport): CueComparison {
  const currentCues = cueById(currentReport.cues);
  const baselineCues = cueById(baselineReport.cues);

  return {
    newCues: currentReport.cues.filter((cue) => !baselineCues.has(cue.id)),
    recurringCues: currentReport.cues.filter((cue) => baselineCues.has(cue.id)),
    resolvedCues: baselineReport.cues.filter((cue) => !currentCues.has(cue.id)),
  };
}

function buildHeadline(overallScoreDelta: number, cueComparison: CueComparison) {
  const direction = overallScoreDelta > 1 ? 'up' : overallScoreDelta < -1 ? 'down' : 'steady';
  const resolvedCount = cueComparison.resolvedCues.length;

  if (direction === 'up' && resolvedCount > 0) {
    return `Movement quality improved by ${overallScoreDelta} points and ${resolvedCount} cue${resolvedCount === 1 ? '' : 's'} cleared.`;
  }
  if (direction === 'up') {
    return `Movement quality improved by ${overallScoreDelta} points.`;
  }
  if (direction === 'down') {
    return `Movement quality dropped by ${Math.abs(overallScoreDelta)} points; repeat with the same beta focus.`;
  }
  if (resolvedCount > 0) {
    return `${resolvedCount} cue${resolvedCount === 1 ? '' : 's'} cleared while total movement quality stayed steady.`;
  }
  return 'Movement quality is steady across the last two attempts.';
}

function buildRecommendation(
  comparisonMetrics: MetricComparison[],
  cueComparison: CueComparison,
  qualityDelta: number,
): string {
  if (qualityDelta < -12) {
    return 'Capture the next repeat with the climber fully visible before judging technique changes.';
  }

  const weakestRegression = comparisonMetrics
    .filter((metric) => metric.direction === 'regressed')
    .sort((a, b) => (a.scoreDelta ?? 0) - (b.scoreDelta ?? 0))[0];

  if (weakestRegression) {
    return `Prioritize ${weakestRegression.label.toLowerCase()} on the next repeat, then compare again against this baseline.`;
  }

  const recurringCue = cueComparison.recurringCues[0];
  if (recurringCue) {
    return `Progress is visible; keep the ${recurringCue.drill.toLowerCase()} drill until the recurring cue clears.`;
  }

  const strongestImprovement = comparisonMetrics
    .filter((metric) => metric.direction === 'improved')
    .sort((a, b) => (b.scoreDelta ?? 0) - (a.scoreDelta ?? 0))[0];

  if (strongestImprovement) {
    return `Lock in the gain on ${strongestImprovement.label.toLowerCase()} with one clean repeat before increasing difficulty.`;
  }

  return 'Add one more repeat of the same climb to build a stronger comparison window.';
}

export function compareAttempts(
  currentReport: LocalAnalysisReport,
  baselineReport: LocalAnalysisReport,
  baselineMatch: RepeatMatchSummary = buildManualRepeatMatch(currentReport, baselineReport),
): AttemptComparison {
  const baselineMetrics = metricById(baselineReport.metrics);
  const metrics = currentReport.metrics.map((metric) => {
    const baselineMetric = baselineMetrics.get(metric.id);
    const scoreDelta = baselineMetric ? metric.score - baselineMetric.score : null;

    return {
      baselineScore: baselineMetric?.score ?? null,
      baselineValue: baselineMetric?.value ?? null,
      currentScore: metric.score,
      currentValue: metric.value,
      direction: directionFromDelta(scoreDelta),
      id: metric.id,
      label: metric.label,
      scoreDelta,
      unit: metric.unit,
    };
  });
  const currentOverall = Math.round(average(currentReport.metrics.map((metric) => metric.score)));
  const baselineOverall = Math.round(average(baselineReport.metrics.map((metric) => metric.score)));
  const overallScoreDelta = currentOverall - baselineOverall;
  const cueComparison = buildCueComparison(currentReport, baselineReport);

  return {
    baselineMatch,
    baselineReport,
    cueComparison,
    currentReport,
    headline: buildHeadline(overallScoreDelta, cueComparison),
    improvedMetrics: metrics.filter((metric) => metric.direction === 'improved'),
    metrics,
    overallScoreDelta,
    qualityDelta: currentReport.analysisQuality.score - baselineReport.analysisQuality.score,
    recommendation: buildRecommendation(
      metrics,
      cueComparison,
      currentReport.analysisQuality.score - baselineReport.analysisQuality.score,
    ),
    regressedMetrics: metrics.filter((metric) => metric.direction === 'regressed'),
  };
}

export function compareLatestAttempts(
  reports: LocalAnalysisReport[],
  annotations: ReportAnnotation[] = [],
): AttemptComparison | null {
  const [currentReport, ...candidateReports] = sortReports(reports);
  if (!currentReport || candidateReports.length === 0) return null;
  const match = findBestRepeatMatch(currentReport, candidateReports, annotations);
  if (!match) return null;
  return compareAttempts(currentReport, match.report, {
    confidence: match.confidence,
    reasons: match.reasons,
    score: match.score,
    strategy: match.strategy,
  });
}
