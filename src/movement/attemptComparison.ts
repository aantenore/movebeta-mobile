import type { LocalAnalysisReport, MovementCue, MovementMetric } from './contracts';
import type { ReportAnnotation } from './reportAnnotationRepository';
import { assessCaptureReadiness } from './captureReadiness';
import {
  buildManualRepeatMatch,
  findBestRepeatMatch,
  type RepeatMatchSummary,
} from './repeatMatcher';
import { measuredMovementMetrics } from './metricEvidence';

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

export type TargetFocusComparison = {
  cueId: string;
  metric: MetricComparison;
  status: 'cleared' | 'persisted' | 'regressed';
  title: string;
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
  targetFocus: TargetFocusComparison | null;
};

export type AttemptComparisonCompatibility = {
  compatible: boolean;
  reasons: string[];
};

function sortReports(reports: LocalAnalysisReport[]) {
  return [...reports].sort((a, b) => b.session.createdAt.localeCompare(a.session.createdAt));
}

function average(values: number[]) {
  if (values.length === 0) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

export const minimumMeaningfulScoreDelta = 15;

const cueMetricIds: Record<string, string> = {
  'cue-foot-cut': 'foot-cuts',
  'cue-hip': 'hip-drift',
  'cue-lockoff': 'lock-off',
  'cue-pause': 'pause-time',
};

function directionFromDelta(delta: number | null): ComparisonDirection {
  if (delta === null) return 'new';
  if (Math.abs(delta) < minimumMeaningfulScoreDelta) return 'flat';
  return delta > 0 ? 'improved' : 'regressed';
}

function metricById(metrics: MovementMetric[]) {
  return new Map(measuredMovementMetrics(metrics).map((metric) => [metric.id, metric]));
}

function cueById(cues: MovementCue[]) {
  return new Map(cues.map((cue) => [cue.id, cue]));
}

export function assessAttemptComparisonCompatibility(
  currentReport: LocalAnalysisReport,
  baselineReport: LocalAnalysisReport,
): AttemptComparisonCompatibility {
  const reasons: string[] = [];
  const currentWindow = currentReport.engine.analysisWindow;
  const baselineWindow = baselineReport.engine.analysisWindow;
  const currentCapture = currentReport.engine.capture;
  const baselineCapture = baselineReport.engine.capture;

  if (currentReport.id === baselineReport.id) reasons.push('The baseline and repeat are the same report.');
  if (
    currentReport.session.projectId &&
    baselineReport.session.projectId &&
    currentReport.session.projectId !== baselineReport.session.projectId
  ) {
    reasons.push('The attempts belong to different climb projects.');
  }
  if (currentReport.session.wallAngle !== baselineReport.session.wallAngle) {
    reasons.push('The wall angle changed between attempts.');
  }
  if (currentReport.engine.provider !== baselineReport.engine.provider) {
    reasons.push('The pose provider changed between attempts.');
  }
  if (currentReport.engine.model !== baselineReport.engine.model) {
    reasons.push('The pose model changed between attempts.');
  }
  if (currentReport.engine.cueEngineVersion !== baselineReport.engine.cueEngineVersion) {
    reasons.push('The movement scoring version changed between attempts.');
  }
  if (currentReport.engine.coachLens.key !== baselineReport.engine.coachLens.key) {
    reasons.push('The analysis focus changed between attempts.');
  }
  if ((currentWindow && !baselineWindow) || (!currentWindow && baselineWindow) || currentWindow?.mode !== baselineWindow?.mode) {
    reasons.push('The analyzed video window changed between attempts.');
  }
  const currentDurationMs = currentWindow?.durationMs ?? currentReport.session.durationMs;
  const baselineDurationMs = baselineWindow?.durationMs ?? baselineReport.session.durationMs;
  if (Math.abs(currentDurationMs - baselineDurationMs) > Math.max(3_000, baselineDurationMs * 0.2)) {
    reasons.push('The analyzed clip duration changed too much for a stable comparison.');
  }
  if (currentCapture && baselineCapture && currentCapture.orientation !== baselineCapture.orientation) {
    reasons.push('The video orientation changed between attempts.');
  }
  if (currentCapture && baselineCapture) {
    const currentAspectRatio = currentCapture.width / currentCapture.height;
    const baselineAspectRatio = baselineCapture.width / baselineCapture.height;
    if (Math.abs(currentAspectRatio - baselineAspectRatio) / baselineAspectRatio > 0.05) {
      reasons.push('The video framing aspect ratio changed between attempts.');
    }
  }
  if (
    assessCaptureReadiness(currentReport.analysisQuality).status === 'retake' ||
    assessCaptureReadiness(baselineReport.analysisQuality).status === 'retake'
  ) {
    reasons.push('At least one clip does not have enough pose quality for a comparison.');
  }

  const baselineMetrics = metricById(baselineReport.metrics);
  const commonMetricCount = measuredMovementMetrics(currentReport.metrics).filter((metric) => {
    const baselineMetric = baselineMetrics.get(metric.id);
    return baselineMetric?.unit === metric.unit;
  }).length;
  if (commonMetricCount === 0) reasons.push('The attempts have no comparable measured signals.');

  const targetCueId = currentReport.session.targetCueId;
  if (targetCueId) {
    const targetMetricId = cueMetricIds[targetCueId];
    const targetCue = baselineReport.cues.find((cue) => cue.id === targetCueId);
    const currentMetric = targetMetricId ? metricById(currentReport.metrics).get(targetMetricId) : undefined;
    const baselineMetric = targetMetricId ? baselineMetrics.get(targetMetricId) : undefined;
    if (!targetCue || !targetMetricId) reasons.push('The selected focus cue is not available in the baseline report.');
    if (!currentMetric || !baselineMetric || currentMetric.unit !== baselineMetric.unit) {
      reasons.push('The selected focus signal was not measured in both attempts.');
    }
  }

  return { compatible: reasons.length === 0, reasons };
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

function buildTargetFocusComparison(
  currentReport: LocalAnalysisReport,
  baselineReport: LocalAnalysisReport,
  metrics: MetricComparison[],
): TargetFocusComparison | null {
  const cueId = currentReport.session.targetCueId;
  if (!cueId) return null;
  const baselineCue = baselineReport.cues.find((cue) => cue.id === cueId);
  const metric = metrics.find((candidate) => candidate.id === cueMetricIds[cueId]);
  if (!baselineCue || !metric) return null;
  const recurring = currentReport.cues.some((cue) => cue.id === cueId);
  return {
    cueId,
    metric,
    status: recurring ? (metric.direction === 'regressed' ? 'regressed' : 'persisted') : 'cleared',
    title: baselineCue.title,
  };
}

function buildHeadline(
  overallScoreDelta: number,
  cueComparison: CueComparison,
  targetFocus: TargetFocusComparison | null,
) {
  if (targetFocus?.status === 'cleared') {
    return `${targetFocus.title}: the measured focus signal was not detected in the repeat.`;
  }
  if (targetFocus?.status === 'regressed') {
    return `${targetFocus.title}: the measured focus signal increased in the repeat.`;
  }
  if (targetFocus?.status === 'persisted') {
    return `${targetFocus.title}: the measured focus signal is still present.`;
  }

  const direction =
    overallScoreDelta >= minimumMeaningfulScoreDelta
      ? 'up'
      : overallScoreDelta <= -minimumMeaningfulScoreDelta
        ? 'down'
        : 'steady';
  const resolvedCount = cueComparison.resolvedCues.length;

  if (direction === 'up' && resolvedCount > 0) {
    return `Measured movement signals improved by ${overallScoreDelta} points and ${resolvedCount} focus cue${resolvedCount === 1 ? '' : 's'} cleared.`;
  }
  if (direction === 'up') {
    return `Measured movement signals improved by ${overallScoreDelta} points.`;
  }
  if (direction === 'down') {
    return `Measured movement signals dropped by ${Math.abs(overallScoreDelta)} points; repeat with the same focus.`;
  }
  if (resolvedCount > 0) {
    return `${resolvedCount} focus cue${resolvedCount === 1 ? '' : 's'} cleared while the measured signals stayed steady.`;
  }
  return 'Measured movement signals are steady across the two linked attempts.';
}

function buildRecommendation(
  comparisonMetrics: MetricComparison[],
  cueComparison: CueComparison,
  qualityDelta: number,
  targetFocus: TargetFocusComparison | null,
): string {
  if (qualityDelta < -12) {
    return 'Capture the next repeat with the climber fully visible before judging technique changes.';
  }

  if (targetFocus?.status === 'cleared') {
    return 'Repeat once more with the same camera position before treating the signal change as stable.';
  }
  if (targetFocus?.status === 'regressed') {
    return `Review ${targetFocus.title.toLowerCase()} at the marked timestamp and keep the next repeat focused on that signal.`;
  }
  if (targetFocus?.status === 'persisted') {
    return `Keep the same focus on ${targetFocus.title.toLowerCase()} and compare one more compatible repeat.`;
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
  const compatibility = assessAttemptComparisonCompatibility(currentReport, baselineReport);
  if (!compatibility.compatible) {
    throw new Error(`Attempts cannot be compared: ${compatibility.reasons.join(' ')}`);
  }

  const baselineMetrics = metricById(baselineReport.metrics);
  const currentMetrics = measuredMovementMetrics(currentReport.metrics).filter((metric) => {
    const baselineMetric = baselineMetrics.get(metric.id);
    return baselineMetric?.unit === metric.unit;
  });
  const metrics = currentMetrics.map((metric) => {
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
  const currentOverall = Math.round(average(currentMetrics.map((metric) => metric.score)));
  const baselineOverall = Math.round(average(metrics.map((metric) => metric.baselineScore ?? 0)));
  const overallScoreDelta = currentOverall - baselineOverall;
  const cueComparison = buildCueComparison(currentReport, baselineReport);
  const targetFocus = buildTargetFocusComparison(currentReport, baselineReport, metrics);

  return {
    baselineMatch,
    baselineReport,
    cueComparison,
    currentReport,
    headline: buildHeadline(overallScoreDelta, cueComparison, targetFocus),
    improvedMetrics: metrics.filter((metric) => metric.direction === 'improved'),
    metrics,
    overallScoreDelta,
    qualityDelta: currentReport.analysisQuality.score - baselineReport.analysisQuality.score,
    recommendation: buildRecommendation(
      metrics,
      cueComparison,
      currentReport.analysisQuality.score - baselineReport.analysisQuality.score,
      targetFocus,
    ),
    regressedMetrics: metrics.filter((metric) => metric.direction === 'regressed'),
    targetFocus,
  };
}

export function compareLatestAttempts(
  reports: LocalAnalysisReport[],
  annotations: ReportAnnotation[] = [],
): AttemptComparison | null {
  const [currentReport, ...candidateReports] = sortReports(reports);
  if (!currentReport || candidateReports.length === 0) return null;

  const explicitBaseline = currentReport.session.baselineReportId
    ? candidateReports.find((candidate) => candidate.id === currentReport.session.baselineReportId)
    : null;
  if (explicitBaseline) {
    return assessAttemptComparisonCompatibility(currentReport, explicitBaseline).compatible
      ? compareAttempts(currentReport, explicitBaseline)
      : null;
  }

  const projectCandidates = currentReport.session.projectId
    ? candidateReports.filter((candidate) => candidate.session.projectId === currentReport.session.projectId)
    : candidateReports;
  if (projectCandidates.length === 0) return null;
  const match = findBestRepeatMatch(currentReport, projectCandidates, annotations);
  if (!match || match.confidence === 'low') return null;
  if (!assessAttemptComparisonCompatibility(currentReport, match.report).compatible) return null;
  return compareAttempts(currentReport, match.report, {
    confidence: match.confidence,
    reasons: match.reasons,
    score: match.score,
    strategy: match.strategy,
  });
}
