import { z } from 'zod';

import type { LocalAnalysisReport } from './contracts';
import { summarizeDrillPracticeInsights } from './drillPracticeInsights';
import type { DrillPracticeRecord } from './drillPracticeRepository';
import { buildPreSendGuard } from './preSendGuard';
import { summarizeRepeatOutcomes } from './repeatOutcomeInsights';
import type { ReportAnnotation } from './reportAnnotationRepository';
import { buildSessionPlan } from './sessionPlan';

export const sessionCloseoutSchemaVersion = 'movebeta.session-closeout.v1';

export const SessionCloseoutActionSchema = z.object({
  detail: z.string(),
  id: z.string(),
  label: z.string(),
  ownerSurface: z.enum(['Sessions', 'Drills', 'Progress', 'Privacy']),
  requiredBeforeNextAnalysis: z.boolean(),
  status: z.enum(['ready', 'needed', 'blocked']),
});

export const SessionCloseoutSchema = z.object({
  anchor: z.string(),
  evidence: z.object({
    latestReportId: z.string().nullable(),
    preSendGuardStatus: z.string(),
    sessionPlanStatus: z.string(),
  }),
  generatedAt: z.string(),
  prompts: z.array(z.string()),
  privacy: z.object({
    cloudUploadRequired: z.literal(false),
    privateNotesIncluded: z.literal(false),
    rawVideoIncluded: z.literal(false),
  }),
  schemaVersion: z.literal(sessionCloseoutSchemaVersion),
  status: z.enum(['baseline-needed', 'ready-to-close', 'reset-first', 'evidence-complete']),
  summary: z.object({
    actionCount: z.number().int().nonnegative(),
    blockedCount: z.number().int().nonnegative(),
    neededCount: z.number().int().nonnegative(),
    readyCount: z.number().int().nonnegative(),
  }),
  title: z.string(),
  nextAction: z.string(),
  actions: z.array(SessionCloseoutActionSchema),
});

export type SessionCloseoutAction = z.infer<typeof SessionCloseoutActionSchema>;
export type SessionCloseout = z.infer<typeof SessionCloseoutSchema>;

const forbiddenCloseoutValuePattern =
  /(file:\/\/|content:\/\/|ph:\/\/|asset-library:\/\/|blob:|data:|\/users\/|\/var\/|\/private\/|rawVideo|videoUri|keyFrame|landmarks|secret|token)/i;

function latestReport(reports: LocalAnalysisReport[]) {
  return [...reports].sort((a, b) => b.session.createdAt.localeCompare(a.session.createdAt))[0] ?? null;
}

function containsForbiddenValue(value: unknown): boolean {
  if (typeof value === 'string') return forbiddenCloseoutValuePattern.test(value);
  if (Array.isArray(value)) return value.some(containsForbiddenValue);
  if (value && typeof value === 'object') return Object.values(value).some(containsForbiddenValue);
  return false;
}

function actionStatusFromBoolean(done: boolean, blocked = false): SessionCloseoutAction['status'] {
  if (blocked) return 'blocked';
  return done ? 'ready' : 'needed';
}

function statusFor(actions: SessionCloseoutAction[], reports: LocalAnalysisReport[]) {
  if (reports.length === 0) return 'baseline-needed';
  if (actions.some((action) => action.status === 'blocked')) return 'reset-first';
  if (actions.every((action) => action.status === 'ready')) return 'evidence-complete';
  return 'ready-to-close';
}

function titleFor(status: SessionCloseout['status']) {
  if (status === 'baseline-needed') return 'Baseline closeout';
  if (status === 'reset-first') return 'Reset before next hard try';
  if (status === 'evidence-complete') return 'Closeout complete';
  return 'Close the loop';
}

function nextActionFor(actions: SessionCloseoutAction[], status: SessionCloseout['status']) {
  if (status === 'baseline-needed') return 'Record one clean baseline attempt, then save effort and confidence in Sessions.';
  const firstBlocked = actions.find((action) => action.status === 'blocked');
  if (firstBlocked) return firstBlocked.detail;
  const firstNeeded = actions.find((action) => action.status === 'needed');
  if (firstNeeded) return firstNeeded.detail;
  return 'The latest session has enough local evidence for the next comparison.';
}

export function assertSessionCloseoutIsShareSafe(closeout: SessionCloseout) {
  if (containsForbiddenValue(closeout)) {
    throw new Error('Session closeout contains local paths, raw video artifacts, private notes, landmarks, or token-like data.');
  }
  return closeout;
}

export function buildSessionCloseout({
  annotations,
  drillPractice,
  generatedAt = new Date().toISOString(),
  reports,
}: {
  annotations: ReportAnnotation[];
  drillPractice?: DrillPracticeRecord[];
  generatedAt?: string;
  reports: LocalAnalysisReport[];
}) {
  const safeDrillPractice = drillPractice ?? [];
  const sessionPlan = buildSessionPlan(reports, annotations, safeDrillPractice);
  const preSendGuard = buildPreSendGuard(reports, annotations, safeDrillPractice);
  const practiceInsights = summarizeDrillPracticeInsights(reports, safeDrillPractice);
  const repeatOutcomes = summarizeRepeatOutcomes(reports, annotations);
  const latest = latestReport(reports);
  const latestAnnotation = latest ? annotations.find((annotation) => annotation.reportId === latest.id) ?? null : null;
  const latestPractice = latest ? safeDrillPractice.filter((record) => record.reportId === latest.id) : [];
  const privacyReady = reports.every((report) => !report.engine.uploadsVideo && !report.privacy.videoLeavesDevice);
  const resetFirst = preSendGuard.status === 'reset-first' || practiceInsights.status === 'blocked' || repeatOutcomes.status === 'stalled';

  const actions: SessionCloseoutAction[] =
    reports.length === 0
      ? [
          {
            detail: 'Create the first local analysis so future closeouts have a baseline.',
            id: 'baseline-analysis',
            label: 'Record baseline analysis',
            ownerSurface: 'Progress',
            requiredBeforeNextAnalysis: true,
            status: 'needed',
          },
          {
            detail: 'Save effort, confidence, and project status after the first report.',
            id: 'baseline-training-log',
            label: 'Save baseline log',
            ownerSurface: 'Sessions',
            requiredBeforeNextAnalysis: true,
            status: 'needed',
          },
        ]
      : [
          {
            detail: latestAnnotation
              ? 'Training log saved for the latest local report.'
              : 'Open Sessions and save effort, confidence, project status, and a short private note.',
            id: 'training-log',
            label: 'Training log',
            ownerSurface: 'Sessions',
            requiredBeforeNextAnalysis: true,
            status: actionStatusFromBoolean(Boolean(latestAnnotation)),
          },
          {
            detail:
              latestPractice.length > 0
                ? 'Latest drill follow-through is logged.'
                : 'Open Drills and mark at least one suggested drill as Done or Skip.',
            id: 'drill-follow-through',
            label: 'Drill follow-through',
            ownerSurface: 'Drills',
            requiredBeforeNextAnalysis: resetFirst,
            status: actionStatusFromBoolean(latestPractice.length > 0),
          },
          {
            detail:
              latestAnnotation?.repeatOutcome && latestAnnotation.repeatOutcome.status !== 'not-tried'
                ? 'Repeat outcome is logged for the latest comparable attempt.'
                : resetFirst
                  ? 'Complete the reset drill before treating the next try as a hard-send outcome.'
                  : 'After the next comparable try, mark Improved, Sent, Fell, or Regressed in Sessions.',
            id: 'repeat-outcome',
            label: 'Repeat outcome',
            ownerSurface: 'Sessions',
            requiredBeforeNextAnalysis: false,
            status: actionStatusFromBoolean(
              Boolean(latestAnnotation?.repeatOutcome && latestAnnotation.repeatOutcome.status !== 'not-tried'),
              resetFirst && !latestAnnotation?.repeatOutcome,
            ),
          },
          {
            detail: privacyReady
              ? 'Closeout contains only derived local evidence and no raw video.'
              : 'Review privacy settings before sharing any closeout evidence.',
            id: 'privacy-boundary',
            label: 'Privacy boundary',
            ownerSurface: 'Privacy',
            requiredBeforeNextAnalysis: true,
            status: actionStatusFromBoolean(privacyReady, !privacyReady),
          },
        ];

  const status = statusFor(actions, reports);
  const blockedCount = actions.filter((action) => action.status === 'blocked').length;
  const neededCount = actions.filter((action) => action.status === 'needed').length;
  const readyCount = actions.filter((action) => action.status === 'ready').length;

  const closeout = SessionCloseoutSchema.parse({
    actions,
    anchor: sessionPlan.anchor,
    evidence: {
      latestReportId: latest?.id ?? null,
      preSendGuardStatus: preSendGuard.status,
      sessionPlanStatus: sessionPlan.status,
    },
    generatedAt,
    nextAction: nextActionFor(actions, status),
    privacy: {
      cloudUploadRequired: false,
      privateNotesIncluded: false,
      rawVideoIncluded: false,
    },
    prompts:
      reports.length === 0
        ? ['Did the first clip keep the full body visible?', 'What should stay comparable next time?']
        : [
            `Did the session match ${sessionPlan.target}?`,
            'Which cue felt resolved, useful, unclear, or not useful?',
            'What should stay comparable in the next local clip?',
          ],
    schemaVersion: sessionCloseoutSchemaVersion,
    status,
    summary: {
      actionCount: actions.length,
      blockedCount,
      neededCount,
      readyCount,
    },
    title: titleFor(status),
  });

  return assertSessionCloseoutIsShareSafe(closeout);
}
