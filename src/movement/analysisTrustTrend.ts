import { z } from 'zod';

import {
  AnalysisTrustDecisionSchema,
  buildAnalysisTrustSummary,
  type AnalysisTrustDecision,
} from './analysisTrust';
import type { LocalAnalysisReport } from './contracts';

export const analysisTrustTrendSchemaVersion = 'movebeta.analysis-trust-trend.v1';

export const AnalysisTrustTrendStatusSchema = z.enum([
  'baseline-needed',
  'improving',
  'stable-ready',
  'stable-review',
  'degrading',
]);

export const AnalysisTrustTrendPointSchema = z.object({
  createdAt: z.string(),
  decision: AnalysisTrustDecisionSchema,
  reportId: z.string(),
  score: z.number().int().min(0).max(100),
  title: z.string(),
});

export const AnalysisTrustTrendSchema = z.object({
  averageScore: z.number().int().min(0).max(100),
  counts: z.object({
    coachReady: z.number().int().nonnegative(),
    journalOnly: z.number().int().nonnegative(),
    retake: z.number().int().nonnegative(),
    reviewFirst: z.number().int().nonnegative(),
  }),
  generatedAt: z.string(),
  latest: AnalysisTrustTrendPointSchema.nullable(),
  nextAction: z.string(),
  previous: AnalysisTrustTrendPointSchema.nullable(),
  privacy: z.object({
    localOnly: z.boolean(),
    privateNotesIncluded: z.literal(false),
    rawVideoIncluded: z.literal(false),
    reportsCrossingLocalBoundary: z.number().int().nonnegative(),
  }),
  reportCount: z.number().int().nonnegative(),
  schemaVersion: z.literal(analysisTrustTrendSchemaVersion),
  status: AnalysisTrustTrendStatusSchema,
  summary: z.string(),
});

export type AnalysisTrustTrendStatus = z.infer<typeof AnalysisTrustTrendStatusSchema>;
export type AnalysisTrustTrendPoint = z.infer<typeof AnalysisTrustTrendPointSchema>;
export type AnalysisTrustTrend = z.infer<typeof AnalysisTrustTrendSchema>;

export type AnalysisTrustTrendOptions = {
  generatedAt?: string;
};

const decisionRank: Record<AnalysisTrustDecision, number> = {
  'coach-ready': 4,
  'review-first': 3,
  'journal-only': 2,
  retake: 1,
};

function createdAtMs(report: LocalAnalysisReport) {
  const value = Date.parse(report.session.createdAt);
  return Number.isNaN(value) ? 0 : value;
}

function sortBySessionDate(reports: LocalAnalysisReport[]) {
  return [...reports].sort((left, right) => createdAtMs(left) - createdAtMs(right));
}

function countDecision(points: AnalysisTrustTrendPoint[], decision: AnalysisTrustDecision) {
  return points.filter((point) => point.decision === decision).length;
}

function averageScore(points: AnalysisTrustTrendPoint[]) {
  if (points.length === 0) return 0;
  return Math.round(points.reduce((sum, point) => sum + point.score, 0) / points.length);
}

function trendStatus(latest: AnalysisTrustTrendPoint | null, previous: AnalysisTrustTrendPoint | null, points: AnalysisTrustTrendPoint[]) {
  if (!latest) return 'baseline-needed';
  if (!previous) return latest.decision === 'coach-ready' ? 'stable-ready' : 'stable-review';

  const scoreDelta = latest.score - previous.score;
  const decisionDelta = decisionRank[latest.decision] - decisionRank[previous.decision];

  if (latest.decision === 'retake' || latest.decision === 'journal-only' || scoreDelta <= -8 || decisionDelta < 0) {
    return 'degrading';
  }

  if (scoreDelta >= 8 || decisionDelta > 0) {
    return 'improving';
  }

  const readyCount = countDecision(points, 'coach-ready');
  if (latest.decision === 'coach-ready' && readyCount >= Math.ceil(points.length * 0.5)) return 'stable-ready';
  return 'stable-review';
}

function summaryFor(status: AnalysisTrustTrendStatus, latest: AnalysisTrustTrendPoint | null, previous: AnalysisTrustTrendPoint | null) {
  if (status === 'baseline-needed') return 'No local analysis reports are available yet.';
  if (!latest) return 'No local analysis reports are available yet.';
  if (status === 'improving') {
    const scoreDelta = previous ? latest.score - previous.score : 0;
    return `Latest trust improved to ${latest.score}/100${scoreDelta > 0 ? `, up ${scoreDelta} points` : ''}.`;
  }
  if (status === 'stable-ready') {
    return `Latest report is ${latest.decision} at ${latest.score}/100 and supports focused coaching decisions.`;
  }
  if (status === 'degrading') {
    const scoreDelta = previous ? latest.score - previous.score : 0;
    return `Latest report is ${latest.decision} at ${latest.score}/100${scoreDelta < 0 ? `, down ${Math.abs(scoreDelta)} points` : ''}.`;
  }
  return `Latest report is ${latest.decision} at ${latest.score}/100 and should be reviewed before changing beta.`;
}

function nextActionFor(status: AnalysisTrustTrendStatus, latest: AnalysisTrustTrendPoint | null) {
  if (status === 'baseline-needed') return 'Run one local analysis to create a trust baseline.';
  if (status === 'improving') return 'Repeat the same climb once and confirm the strongest cue still appears in the clip.';
  if (status === 'stable-ready') return 'Use the latest report for one focused repeat, then log the outcome privately.';
  if (status === 'degrading') return 'Retake or review the latest clip before relying on its coaching cues.';
  if (latest?.decision === 'review-first') return 'Watch the cue moment once before committing to a beta change.';
  return 'Keep the report in history and capture a cleaner local clip for coaching decisions.';
}

export function summarizeAnalysisTrustTrend(
  reports: LocalAnalysisReport[],
  options: AnalysisTrustTrendOptions = {},
): AnalysisTrustTrend {
  const generatedAt = options.generatedAt ?? new Date().toISOString();
  const sortedReports = sortBySessionDate(reports);
  const summaries = sortedReports.map((report) => ({
    report,
    trust: buildAnalysisTrustSummary(report),
  }));
  const points = summaries.map<AnalysisTrustTrendPoint>(({ report, trust }) => ({
    createdAt: report.session.createdAt,
    decision: trust.decision,
    reportId: report.id,
    score: trust.score,
    title: report.session.title,
  }));
  const latest = points.at(-1) ?? null;
  const previous = points.length > 1 ? points.at(-2) ?? null : null;
  const status = trendStatus(latest, previous, points);
  const reportsCrossingLocalBoundary = summaries.filter(({ trust }) => !trust.privacy.localOnly).length;

  return AnalysisTrustTrendSchema.parse({
    averageScore: averageScore(points),
    counts: {
      coachReady: countDecision(points, 'coach-ready'),
      journalOnly: countDecision(points, 'journal-only'),
      retake: countDecision(points, 'retake'),
      reviewFirst: countDecision(points, 'review-first'),
    },
    generatedAt,
    latest,
    nextAction: nextActionFor(status, latest),
    previous,
    privacy: {
      localOnly: reportsCrossingLocalBoundary === 0,
      privateNotesIncluded: false,
      rawVideoIncluded: false,
      reportsCrossingLocalBoundary,
    },
    reportCount: points.length,
    schemaVersion: analysisTrustTrendSchemaVersion,
    status,
    summary: summaryFor(status, latest, previous),
  });
}
