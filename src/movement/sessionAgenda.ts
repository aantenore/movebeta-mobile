import { z } from 'zod';

import type { LocalAnalysisReport } from './contracts';
import type { DrillPracticeRecord } from './drillPracticeRepository';
import type { ReportAnnotation } from './reportAnnotationRepository';
import { buildSessionCloseout } from './sessionCloseout';
import { buildSessionPlan, type SessionPlanIntensity } from './sessionPlan';
import { summarizeTrainingLoad } from './trainingLoad';

export const sessionAgendaSchemaVersion = 'movebeta.session-agenda.v1';

export const SessionAgendaBlockSchema = z.object({
  durationMinutes: z.number().int().positive(),
  evidence: z.string(),
  id: z.string(),
  instruction: z.string(),
  intensity: z.enum(['baseline', 'easy', 'moderate', 'hard']),
  label: z.string(),
  source: z.enum(['session-plan', 'training-load', 'session-closeout']),
  title: z.string(),
});

export const SessionAgendaSchema = z.object({
  anchor: z.string(),
  blocks: z.array(SessionAgendaBlockSchema),
  generatedAt: z.string(),
  nextAction: z.string(),
  privacy: z.object({
    cloudUploadRequired: z.literal(false),
    privateNotesIncluded: z.literal(false),
    rawVideoIncluded: z.literal(false),
  }),
  schemaVersion: z.literal(sessionAgendaSchemaVersion),
  status: z.enum(['baseline', 'controlled', 'deload', 'progress']),
  summary: z.object({
    blockCount: z.number().int().nonnegative(),
    closeoutNeededCount: z.number().int().nonnegative(),
    loadStatus: z.string(),
    planStatus: z.string(),
    totalMinutes: z.number().int().nonnegative(),
  }),
  title: z.string(),
});

export type SessionAgendaBlock = z.infer<typeof SessionAgendaBlockSchema>;
export type SessionAgenda = z.infer<typeof SessionAgendaSchema>;

export type SessionAgendaConfig = {
  closeoutMinutes: number;
  loadCheckMinutes: number;
  maxBlocks: number;
};

const defaultConfig: SessionAgendaConfig = {
  closeoutMinutes: 6,
  loadCheckMinutes: 5,
  maxBlocks: 6,
};

const forbiddenAgendaValuePattern =
  /(file:\/\/|content:\/\/|ph:\/\/|asset-library:\/\/|blob:|data:|\/users\/|\/var\/|\/private\/|rawVideo|videoUri|keyFrame|landmarks|secret|token)/i;

function containsForbiddenValue(value: unknown): boolean {
  if (typeof value === 'string') return forbiddenAgendaValuePattern.test(value);
  if (Array.isArray(value)) return value.some(containsForbiddenValue);
  if (value && typeof value === 'object') return Object.values(value).some(containsForbiddenValue);
  return false;
}

function totalMinutes(blocks: SessionAgendaBlock[]) {
  return blocks.reduce((sum, block) => sum + block.durationMinutes, 0);
}

function agendaStatus(
  planStatus: ReturnType<typeof buildSessionPlan>['status'],
  loadStatus: ReturnType<typeof summarizeTrainingLoad>['status'],
  closeoutStatus: ReturnType<typeof buildSessionCloseout>['status'],
): SessionAgenda['status'] {
  if (planStatus === 'baseline') return 'baseline';
  if (loadStatus === 'deload') return 'deload';
  if (planStatus === 'recover' || closeoutStatus === 'reset-first' || loadStatus === 'review') return 'controlled';
  return 'progress';
}

function titleFor(status: SessionAgenda['status']) {
  if (status === 'baseline') return 'Baseline agenda';
  if (status === 'deload') return 'Lower-load agenda';
  if (status === 'controlled') return 'Controlled repeat agenda';
  return 'Progress agenda';
}

function intensityFor(status: SessionAgenda['status'], planIntensity: SessionPlanIntensity): SessionPlanIntensity {
  if (status === 'deload') return 'easy';
  if (status === 'controlled' && planIntensity === 'hard') return 'moderate';
  return planIntensity;
}

function adaptInstruction(status: SessionAgenda['status'], instruction: string) {
  if (status === 'deload') return `${instruction} Keep the set easier than the latest hard attempt.`;
  if (status === 'controlled') return `${instruction} Keep one variable unchanged for comparison.`;
  return instruction;
}

function nextActionFor(
  status: SessionAgenda['status'],
  load: ReturnType<typeof summarizeTrainingLoad>,
  closeout: ReturnType<typeof buildSessionCloseout>,
  fallback: string,
) {
  if (status === 'baseline') return 'Record one clean local baseline, then save effort and confidence.';
  if (status === 'deload') return load.nextAction;
  if (closeout.status === 'reset-first') return closeout.nextAction;
  return fallback;
}

export function assertSessionAgendaIsShareSafe(agenda: SessionAgenda) {
  if (containsForbiddenValue(agenda)) {
    throw new Error('Session agenda contains local paths, raw video artifacts, private notes, landmarks, or token-like data.');
  }
  return agenda;
}

export function buildSessionAgenda({
  annotations,
  config = defaultConfig,
  drillPractice = [],
  generatedAt = new Date().toISOString(),
  reports,
}: {
  annotations: ReportAnnotation[];
  config?: Partial<SessionAgendaConfig>;
  drillPractice?: DrillPracticeRecord[];
  generatedAt?: string;
  reports: LocalAnalysisReport[];
}) {
  const options = { ...defaultConfig, ...config };
  const sessionPlan = buildSessionPlan(reports, annotations, drillPractice);
  const trainingLoad = summarizeTrainingLoad({ annotations, drillPractice, generatedAt });
  const closeout = buildSessionCloseout({ annotations, drillPractice, generatedAt, reports });
  const status = agendaStatus(sessionPlan.status, trainingLoad.status, closeout.status);

  const loadBlock: SessionAgendaBlock = {
    durationMinutes: options.loadCheckMinutes,
    evidence: trainingLoad.recommendation,
    id: 'load-check',
    instruction: trainingLoad.nextAction,
    intensity: status === 'deload' ? 'easy' : status === 'progress' ? 'moderate' : 'easy',
    label: 'Load',
    source: 'training-load',
    title: trainingLoad.title,
  };
  const planBlocks = sessionPlan.phases.map<SessionAgendaBlock>((phase, index) => ({
    durationMinutes: phase.durationMinutes,
    evidence: phase.evidence,
    id: phase.id,
    instruction: adaptInstruction(status, phase.instruction),
    intensity: intensityFor(status, sessionPlan.intensityCap),
    label: `Block ${index + 1}`,
    source: 'session-plan',
    title: phase.title,
  }));
  const closeoutBlock: SessionAgendaBlock = {
    durationMinutes: options.closeoutMinutes,
    evidence: closeout.summary.neededCount > 0 ? `${closeout.summary.neededCount} closeout actions still need evidence.` : 'Closeout evidence is current.',
    id: 'agenda-closeout',
    instruction: closeout.nextAction,
    intensity: 'easy',
    label: 'Closeout',
    source: 'session-closeout',
    title: closeout.title,
  };
  const blocks = [loadBlock, ...planBlocks, closeoutBlock].slice(0, options.maxBlocks);
  const agenda = SessionAgendaSchema.parse({
    anchor: sessionPlan.anchor,
    blocks,
    generatedAt,
    nextAction: nextActionFor(status, trainingLoad, closeout, sessionPlan.target),
    privacy: {
      cloudUploadRequired: false,
      privateNotesIncluded: false,
      rawVideoIncluded: false,
    },
    schemaVersion: sessionAgendaSchemaVersion,
    status,
    summary: {
      blockCount: blocks.length,
      closeoutNeededCount: closeout.summary.neededCount,
      loadStatus: trainingLoad.status,
      planStatus: sessionPlan.status,
      totalMinutes: totalMinutes(blocks),
    },
    title: titleFor(status),
  });

  return assertSessionAgendaIsShareSafe(agenda);
}
