import { z } from 'zod';

import type { DrillPracticeRecord } from './drillPracticeRepository';
import type { ReportAnnotation } from './reportAnnotationRepository';

export const trainingLoadSchemaVersion = 'movebeta.training-load.v1';

export const TrainingLoadSignalSchema = z.object({
  detail: z.string(),
  id: z.string(),
  label: z.string(),
  status: z.enum(['ready', 'watch', 'limit']),
});

export const TrainingLoadSummarySchema = z.object({
  generatedAt: z.string(),
  nextAction: z.string(),
  privacy: z.object({
    cloudUploadRequired: z.literal(false),
    privateNotesIncluded: z.literal(false),
    rawVideoIncluded: z.literal(false),
  }),
  recommendation: z.string(),
  schemaVersion: z.literal(trainingLoadSchemaVersion),
  signals: z.array(TrainingLoadSignalSchema),
  status: z.enum(['baseline', 'balanced', 'review', 'deload']),
  summary: z.object({
    annotatedSessionCount: z.number().int().nonnegative(),
    averageEffort: z.number().nonnegative(),
    completedDrillCount: z.number().int().nonnegative(),
    highEffortSessionCount: z.number().int().nonnegative(),
    repeatAttemptCount: z.number().int().nonnegative(),
    skippedDrillCount: z.number().int().nonnegative(),
    skippedDrillRate: z.number().int().min(0).max(100),
    stalledRepeatCount: z.number().int().nonnegative(),
  }),
  title: z.string(),
  trainingLoadScore: z.number().int().min(0).max(100),
  windowDays: z.number().int().positive(),
});

export type TrainingLoadSignal = z.infer<typeof TrainingLoadSignalSchema>;
export type TrainingLoadSummary = z.infer<typeof TrainingLoadSummarySchema>;

export type TrainingLoadConfig = {
  highEffortThreshold: number;
  highEffortSessionLimit: number;
  lookbackDays: number;
  repeatAttemptLimit: number;
  skippedDrillRateLimit: number;
};

const defaultConfig: TrainingLoadConfig = {
  highEffortSessionLimit: 3,
  highEffortThreshold: 4,
  lookbackDays: 7,
  repeatAttemptLimit: 8,
  skippedDrillRateLimit: 50,
};

const forbiddenTrainingLoadValuePattern =
  /(file:\/\/|content:\/\/|ph:\/\/|asset-library:\/\/|blob:|data:|\/users\/|\/var\/|\/private\/|rawVideo|videoUri|keyFrame|landmarks|secret|token)/i;

function parseTimestamp(value: string) {
  const time = Date.parse(value);
  return Number.isFinite(time) ? time : 0;
}

function inWindow(updatedAt: string, generatedAt: string, lookbackDays: number) {
  const generatedTime = parseTimestamp(generatedAt);
  const updatedTime = parseTimestamp(updatedAt);
  if (generatedTime === 0 || updatedTime === 0) return false;
  const windowMs = lookbackDays * 24 * 60 * 60 * 1000;
  return updatedTime >= generatedTime - windowMs && updatedTime <= generatedTime;
}

function round(value: number) {
  return Math.round(value);
}

function clampScore(value: number) {
  return Math.max(0, Math.min(100, round(value)));
}

function containsForbiddenValue(value: unknown): boolean {
  if (typeof value === 'string') return forbiddenTrainingLoadValuePattern.test(value);
  if (Array.isArray(value)) return value.some(containsForbiddenValue);
  if (value && typeof value === 'object') return Object.values(value).some(containsForbiddenValue);
  return false;
}

function signalStatus(overLimit: boolean, watch: boolean): TrainingLoadSignal['status'] {
  if (overLimit) return 'limit';
  return watch ? 'watch' : 'ready';
}

function titleFor(status: TrainingLoadSummary['status']) {
  if (status === 'baseline') return 'Build a load baseline';
  if (status === 'deload') return 'Lower the next session load';
  if (status === 'review') return 'Keep the next session controlled';
  return 'Training load balanced';
}

function recommendationFor(status: TrainingLoadSummary['status']) {
  if (status === 'baseline') return 'Save a few effort and repeat logs before using load guidance.';
  if (status === 'deload') return 'Use easier technique repeats and finish with a logged lower-effort session.';
  if (status === 'review') return 'Keep one variable stable: same climb, same wall angle, or one cue focus.';
  return 'Progress one variable only: grade, volume, or cue complexity.';
}

function nextActionFor(status: TrainingLoadSummary['status'], signals: TrainingLoadSignal[]) {
  const limit = signals.find((signal) => signal.status === 'limit');
  if (limit) return limit.detail;
  const watch = signals.find((signal) => signal.status === 'watch');
  if (watch) return watch.detail;
  if (status === 'baseline') return 'Log effort and repeat outcome after the next local attempt.';
  return 'Run the next session plan and keep the closeout checklist current.';
}

export function assertTrainingLoadSummaryIsShareSafe(summary: TrainingLoadSummary) {
  if (containsForbiddenValue(summary)) {
    throw new Error('Training load summary contains local paths, raw video artifacts, private notes, landmarks, or token-like data.');
  }
  return summary;
}

export function summarizeTrainingLoad({
  annotations,
  config = defaultConfig,
  drillPractice = [],
  generatedAt = new Date().toISOString(),
}: {
  annotations: ReportAnnotation[];
  config?: Partial<TrainingLoadConfig>;
  drillPractice?: DrillPracticeRecord[];
  generatedAt?: string;
}) {
  const thresholds = { ...defaultConfig, ...config };
  const recentAnnotations = annotations.filter((annotation) => inWindow(annotation.updatedAt, generatedAt, thresholds.lookbackDays));
  const recentPractice = drillPractice.filter((record) => inWindow(record.updatedAt, generatedAt, thresholds.lookbackDays));
  const efforts = recentAnnotations.map((annotation) => annotation.perceivedEffort);
  const averageEffort = efforts.length === 0 ? 0 : round(efforts.reduce((sum, effort) => sum + effort, 0) / efforts.length);
  const highEffortSessionCount = recentAnnotations.filter(
    (annotation) => annotation.perceivedEffort >= thresholds.highEffortThreshold,
  ).length;
  const repeatOutcomes = recentAnnotations.map((annotation) => annotation.repeatOutcome).filter(Boolean);
  const repeatAttemptCount = repeatOutcomes.reduce((sum, outcome) => sum + (outcome?.attempts ?? 0), 0);
  const stalledRepeatCount = repeatOutcomes.filter(
    (outcome) => outcome?.status === 'fell' || outcome?.status === 'regressed',
  ).length;
  const completedDrillCount = recentPractice.filter((record) => record.status === 'completed').length;
  const skippedDrillCount = recentPractice.filter((record) => record.status === 'skipped').length;
  const drillCount = completedDrillCount + skippedDrillCount;
  const skippedDrillRate = drillCount === 0 ? 0 : round((skippedDrillCount / drillCount) * 100);
  const score = clampScore(
    highEffortSessionCount * 18 + repeatAttemptCount * 4 + stalledRepeatCount * 14 + skippedDrillRate * 0.35,
  );

  const effortLimit = highEffortSessionCount > thresholds.highEffortSessionLimit;
  const repeatLimit = repeatAttemptCount > thresholds.repeatAttemptLimit && stalledRepeatCount > 0;
  const drillLimit = skippedDrillRate >= thresholds.skippedDrillRateLimit && skippedDrillCount > completedDrillCount;
  const hasData = recentAnnotations.length > 0 || recentPractice.length > 0;
  const hasWatch = score >= 45 || highEffortSessionCount > 0 || repeatAttemptCount > 0 || skippedDrillCount > 0;
  const status: TrainingLoadSummary['status'] = !hasData
    ? 'baseline'
    : effortLimit || repeatLimit || drillLimit
      ? 'deload'
      : hasWatch
        ? 'review'
        : 'balanced';

  const signals: TrainingLoadSignal[] = [
    {
      detail: effortLimit
        ? `${highEffortSessionCount} high-effort sessions in ${thresholds.lookbackDays} days; lower intensity before adding volume.`
        : `${highEffortSessionCount} high-effort sessions in the current window.`,
      id: 'effort-balance',
      label: 'Effort balance',
      status: signalStatus(effortLimit, highEffortSessionCount > 0),
    },
    {
      detail: repeatLimit
        ? `${repeatAttemptCount} repeat attempts with ${stalledRepeatCount} stalled outcomes; make the next repeat easier.`
        : `${repeatAttemptCount} repeat attempts and ${stalledRepeatCount} stalled outcomes logged.`,
      id: 'repeat-load',
      label: 'Repeat load',
      status: signalStatus(repeatLimit, repeatAttemptCount > 0),
    },
    {
      detail: drillLimit
        ? `${skippedDrillRate}% of logged drills were skipped; use an easier variant before adding complexity.`
        : `${completedDrillCount} completed and ${skippedDrillCount} skipped drills logged.`,
      id: 'drill-follow-through',
      label: 'Drill follow-through',
      status: signalStatus(drillLimit, skippedDrillCount > 0),
    },
    {
      detail: 'Training load uses derived effort, repeat, and drill counts only.',
      id: 'privacy-boundary',
      label: 'Privacy boundary',
      status: 'ready',
    },
  ];

  const summary = TrainingLoadSummarySchema.parse({
    generatedAt,
    nextAction: nextActionFor(status, signals),
    privacy: {
      cloudUploadRequired: false,
      privateNotesIncluded: false,
      rawVideoIncluded: false,
    },
    recommendation: recommendationFor(status),
    schemaVersion: trainingLoadSchemaVersion,
    signals,
    status,
    summary: {
      annotatedSessionCount: recentAnnotations.length,
      averageEffort,
      completedDrillCount,
      highEffortSessionCount,
      repeatAttemptCount,
      skippedDrillCount,
      skippedDrillRate,
      stalledRepeatCount,
    },
    title: titleFor(status),
    trainingLoadScore: score,
    windowDays: thresholds.lookbackDays,
  });

  return assertTrainingLoadSummaryIsShareSafe(summary);
}
