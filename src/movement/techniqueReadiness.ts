import { z } from 'zod';

import { buildDrillPlan, type DrillPlanItem } from './drillPlanner';
import { summarizeProgress, type ProgressInsightSummary } from './progressInsights';
import { summarizeProjectQueue, type ProjectQueueSummary } from './projectQueue';
import type { LocalAnalysisReport } from './contracts';
import type { ReportAnnotation } from './reportAnnotationRepository';

export const techniqueReadinessPacketSchemaVersion = 'movebeta.technique-readiness-packet.v1';

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

export type TechniqueReadinessSafetyCap = {
  headline: string;
  maxStatus: TechniqueReadinessStatus;
  nextAction: string;
  risk: string;
};

export const TechniqueReadinessStatusSchema = z.enum(['ready', 'repeat', 'recover', 'baseline']);

export const TechniqueReadinessPacketSchema = z.object({
  generatedAt: z.string(),
  privacy: z.object({
    localPathsIncluded: z.literal(false),
    privateNotesIncluded: z.literal(false),
    rawVideoIncluded: z.literal(false),
    reportIdsIncluded: z.literal(false),
    tokenLikeValuesIncluded: z.literal(false),
    videoUriIncluded: z.literal(false),
  }),
  purpose: z.string(),
  readiness: z.object({
    drill: z
      .object({
        dosage: z.string(),
        drill: z.string(),
        feedbackStatus: z.string(),
        focus: z.string(),
        priority: z.string(),
        sourceSessionTitle: z.string(),
        title: z.string(),
      })
      .nullable(),
    focus: z.string(),
    headline: z.string(),
    nextAction: z.string(),
    risk: z.string(),
    score: z.number().int().min(0).max(100),
    status: TechniqueReadinessStatusSchema,
    warmup: z.string(),
  }),
  schemaVersion: z.literal(techniqueReadinessPacketSchemaVersion),
});

export type TechniqueReadinessPacket = z.infer<typeof TechniqueReadinessPacketSchema>;

const forbiddenReadinessPacketValuePattern =
  /(file:\/\/|content:\/\/|ph:\/\/|asset-library:\/\/|blob:|data:|\/users\/|\/var\/|\/private\/|rawVideo|videoUri|keyFrame|landmarks|privateNote|sourceReportId|reportId|secret|token|BEGIN PRIVATE KEY)/i;

function containsForbiddenValue(value: unknown): boolean {
  if (typeof value === 'string') return forbiddenReadinessPacketValuePattern.test(value);
  if (Array.isArray(value)) return value.some(containsForbiddenValue);
  if (value && typeof value === 'object') return Object.values(value).some(containsForbiddenValue);
  return false;
}

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

const readinessStatusRank: Record<TechniqueReadinessStatus, number> = {
  baseline: 0,
  recover: 1,
  repeat: 2,
  ready: 3,
};

export function applyTechniqueReadinessSafetyCap(
  plan: TechniqueReadinessPlan,
  cap: TechniqueReadinessSafetyCap,
): TechniqueReadinessPlan {
  if (readinessStatusRank[plan.status] <= readinessStatusRank[cap.maxStatus]) return plan;

  return {
    ...plan,
    headline: cap.headline,
    nextAction: cap.nextAction,
    risk: cap.risk,
    status: cap.maxStatus,
    warmup: warmupFor(cap.maxStatus, plan.focus),
  };
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

function packetDrill(drill: DrillPlanItem | null) {
  if (!drill) return null;

  return {
    dosage: drill.dosage,
    drill: drill.drill,
    feedbackStatus: drill.feedbackStatus,
    focus: drill.focus,
    priority: drill.priority,
    sourceSessionTitle: drill.sourceSessionTitle,
    title: drill.title,
  };
}

export function assertTechniqueReadinessPacketIsPrivacySafe(packet: TechniqueReadinessPacket) {
  if (containsForbiddenValue(packet)) {
    throw new Error('Technique readiness packet contains raw media, local path, report id, private note, or secret-like evidence.');
  }

  return packet;
}

export function buildTechniqueReadinessPacket(
  readiness: TechniqueReadinessPlan,
  options: { generatedAt?: string; purpose?: string } = {},
): TechniqueReadinessPacket {
  const packet = TechniqueReadinessPacketSchema.parse({
    generatedAt: options.generatedAt ?? new Date().toISOString(),
    privacy: {
      localPathsIncluded: false,
      privateNotesIncluded: false,
      rawVideoIncluded: false,
      reportIdsIncluded: false,
      tokenLikeValuesIncluded: false,
      videoUriIncluded: false,
    },
    purpose: options.purpose ?? 'Share local technique readiness without sensitive artifacts.',
    readiness: {
      drill: packetDrill(readiness.drill),
      focus: readiness.focus,
      headline: readiness.headline,
      nextAction: readiness.nextAction,
      risk: readiness.risk,
      score: readiness.score,
      status: readiness.status,
      warmup: readiness.warmup,
    },
    schemaVersion: techniqueReadinessPacketSchemaVersion,
  });

  return assertTechniqueReadinessPacketIsPrivacySafe(packet);
}

export function formatTechniqueReadinessPacketSummary(packet: TechniqueReadinessPacket) {
  return [
    `Technique readiness: ${packet.readiness.status} (${packet.readiness.score}/100)`,
    `Focus: ${packet.readiness.focus}`,
    `Action: ${packet.readiness.nextAction}`,
    `Privacy: raw video no - URI no - private notes no - report ids no`,
  ].join('\n');
}
