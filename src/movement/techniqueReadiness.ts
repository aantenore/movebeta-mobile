import { buildDrillPlan, type DrillPlanItem } from './drillPlanner';
import { summarizeProgress, type ProgressInsightSummary } from './progressInsights';
import { summarizeProjectQueue, type ProjectQueueSummary } from './projectQueue';
import type { LocalAnalysisReport } from './contracts';
import type { ReportAnnotation } from './reportAnnotationRepository';

export type TechniqueReadinessStatus = 'ready' | 'repeat' | 'recover' | 'baseline';

export type TechniqueReadinessPlan = {
  drill: DrillPlanItem | null;
  focus: string;
  headline: string;
  nextAction: string;
  risk: string;
  score: number;
  status: TechniqueReadinessStatus;
  warmup: string;
};

function clampScore(score: number) {
  return Math.max(0, Math.min(100, Math.round(score)));
}

function latestCueSeverityWeight(report: LocalAnalysisReport | null) {
  if (!report) return 0;
  return report.cues.reduce((max, cue) => {
    if (cue.severity === 'fix') return Math.max(max, 18);
    if (cue.severity === 'watch') return Math.max(max, 9);
    return max;
  }, 0);
}

function effortPenalty(projectQueue: ProjectQueueSummary) {
  if (projectQueue.averageEffort >= 4.5) return 16;
  if (projectQueue.averageEffort >= 4) return 10;
  return 0;
}

function confidencePenalty(projectQueue: ProjectQueueSummary) {
  const confidence = projectQueue.nextProject?.annotation.confidence ?? 5;
  if (confidence <= 2) return 12;
  if (confidence === 3) return 6;
  return 0;
}

function trendBonus(summary: ProgressInsightSummary) {
  const deltas = summary.trends.flatMap((trend) => (trend.delta === null ? [] : [trend.delta]));
  if (deltas.length === 0) return 0;
  const averageDelta = deltas.reduce((sum, delta) => sum + delta, 0) / deltas.length;
  if (averageDelta >= 6) return 8;
  if (averageDelta <= -6) return -8;
  return 0;
}

function statusFor(score: number, summary: ProgressInsightSummary, projectQueue: ProjectQueueSummary): TechniqueReadinessStatus {
  if (summary.attemptCount === 0) return 'baseline';
  if (score < 45 || projectQueue.averageEffort >= 4.5) return 'recover';
  if (score < 70 || projectQueue.activeCount > 0) return 'repeat';
  return 'ready';
}

function warmupFor(status: TechniqueReadinessStatus, focus: string) {
  if (status === 'baseline') return 'Record one easy benchmark climb before changing the drill load.';
  if (status === 'recover') return `Use 10 minutes of easy movement, then one low-intensity ${focus.toLowerCase()} check.`;
  if (status === 'repeat') return `Warm up with two easy repeats that exaggerate ${focus.toLowerCase()} before the project attempt.`;
  return `Warm up normally, then add one quality repeat focused on ${focus.toLowerCase()} before increasing difficulty.`;
}

function headlineFor(status: TechniqueReadinessStatus) {
  if (status === 'baseline') return 'Create a baseline first';
  if (status === 'recover') return 'Lower the load before the next hard try';
  if (status === 'repeat') return 'Repeat the current project with one clear focus';
  return 'Ready to increase difficulty';
}

function riskFor(status: TechniqueReadinessStatus, summary: ProgressInsightSummary) {
  if (status === 'baseline') return 'No local movement baseline yet.';
  const warnings = summary.latestReport?.analysisQuality.warnings.length ?? 0;
  if (warnings > 0) return 'Latest video quality had warnings, so treat cues as directional.';
  if (status === 'recover') return 'High effort or weak signal suggests avoiding a max-intensity session.';
  if (status === 'repeat') return 'Changing the climb now may hide whether the beta improved.';
  return 'Keep the next attempt honest: same angle, similar grade, then progress.';
}

export function buildTechniqueReadinessPlan(
  reports: LocalAnalysisReport[],
  annotations: ReportAnnotation[],
): TechniqueReadinessPlan {
  const summary = summarizeProgress(reports);
  const projectQueue = summarizeProjectQueue(reports, annotations);
  const drillPlan = buildDrillPlan(reports);
  const focus = summary.focusMetric?.label ?? projectQueue.nextProject?.report.session.title ?? 'baseline movement';
  const rawScore =
    summary.averageQuality +
    trendBonus(summary) -
    latestCueSeverityWeight(summary.latestReport) -
    effortPenalty(projectQueue) -
    confidencePenalty(projectQueue);
  const score = summary.attemptCount === 0 ? 0 : clampScore(rawScore);
  const status = statusFor(score, summary, projectQueue);
  const drill = drillPlan.items[0] ?? null;
  const nextAction =
    projectQueue.nextProject?.action ??
    drill?.drill ??
    (status === 'baseline' ? 'Record a controlled benchmark attempt.' : 'Repeat the latest climb and save a private note.');

  return {
    drill,
    focus,
    headline: headlineFor(status),
    nextAction,
    risk: riskFor(status, summary),
    score,
    status,
    warmup: warmupFor(status, focus),
  };
}
