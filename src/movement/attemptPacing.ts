import { z } from 'zod';

import type { LocalAnalysisReport } from './contracts';
import type { DrillPracticeRecord } from './drillPracticeRepository';
import { buildPreSendGuard } from './preSendGuard';
import type { ReportAnnotation } from './reportAnnotationRepository';
import { buildSessionAgenda } from './sessionAgenda';
import { summarizeTrainingLoad } from './trainingLoad';

export const attemptPacingSchemaVersion = 'movebeta.attempt-pacing.v1';
export const attemptPacingPacketSchemaVersion = 'movebeta.attempt-pacing-packet.v1';

export const AttemptPacingStepSchema = z.object({
  countsTowardAttemptBudget: z.boolean(),
  evidence: z.string(),
  id: z.string(),
  instruction: z.string(),
  intensity: z.enum(['baseline', 'easy', 'moderate', 'hard']),
  label: z.string(),
  restAfterSeconds: z.number().int().nonnegative(),
  title: z.string(),
  type: z.enum(['baseline-capture', 'warmup-capture', 'controlled-repeat', 'hard-try', 'quality-check', 'closeout']),
});

export const AttemptPacingStopRuleSchema = z.object({
  detail: z.string(),
  id: z.string(),
  label: z.string(),
  status: z.enum(['ready', 'watch', 'limit']),
});

export const AttemptPacingPlanSchema = z.object({
  anchor: z.string(),
  generatedAt: z.string(),
  nextAction: z.string(),
  privacy: z.object({
    cloudUploadRequired: z.literal(false),
    privateNotesIncluded: z.literal(false),
    rawVideoIncluded: z.literal(false),
  }),
  schemaVersion: z.literal(attemptPacingSchemaVersion),
  status: z.enum(['baseline', 'reset', 'controlled', 'progress']),
  steps: z.array(AttemptPacingStepSchema),
  stopRules: z.array(AttemptPacingStopRuleSchema),
  summary: z.object({
    attemptSlots: z.number().int().nonnegative(),
    guardStatus: z.string(),
    hardAttemptSlots: z.number().int().nonnegative(),
    loadStatus: z.string(),
    maxHardAttempts: z.number().int().nonnegative(),
    maxTotalAttempts: z.number().int().positive(),
    restMinutes: z.number().int().nonnegative(),
    stepCount: z.number().int().nonnegative(),
  }),
  title: z.string(),
});

export const AttemptPacingPacketSchema = z.object({
  generatedAt: z.string(),
  nextAction: z.string(),
  pacing: AttemptPacingPlanSchema,
  privacy: z.object({
    cloudUploadRequired: z.literal(false),
    privateNotesIncluded: z.literal(false),
    rawVideoIncluded: z.literal(false),
  }),
  purpose: z.string(),
  schemaVersion: z.literal(attemptPacingPacketSchemaVersion),
  summary: z.object({
    attemptSlots: z.number().int().nonnegative(),
    hardAttemptSlots: z.number().int().nonnegative(),
    maxTotalAttempts: z.number().int().positive(),
    restMinutes: z.number().int().nonnegative(),
    status: z.string(),
    stopRuleCount: z.number().int().nonnegative(),
  }),
});

export type AttemptPacingPlan = z.infer<typeof AttemptPacingPlanSchema>;
export type AttemptPacingPacket = z.infer<typeof AttemptPacingPacketSchema>;
export type AttemptPacingStep = z.infer<typeof AttemptPacingStepSchema>;
export type AttemptPacingStopRule = z.infer<typeof AttemptPacingStopRuleSchema>;

export type AttemptPacingConfig = {
  baselineAttemptLimit: number;
  controlledAttemptLimit: number;
  controlledRestSeconds: number;
  easyRestSeconds: number;
  hardRestSeconds: number;
  maxFallsBeforeStop: number;
  progressAttemptLimit: number;
  progressHardAttemptLimit: number;
  reassessAfterAttempts: number;
  resetAttemptLimit: number;
};

const defaultConfig: AttemptPacingConfig = {
  baselineAttemptLimit: 1,
  controlledAttemptLimit: 3,
  controlledRestSeconds: 180,
  easyRestSeconds: 120,
  hardRestSeconds: 300,
  maxFallsBeforeStop: 2,
  progressAttemptLimit: 4,
  progressHardAttemptLimit: 1,
  reassessAfterAttempts: 2,
  resetAttemptLimit: 2,
};

const forbiddenAttemptPacingValuePattern =
  /(file:\/\/|content:\/\/|ph:\/\/|asset-library:\/\/|blob:|data:|\/users\/|\/var\/|\/private\/|rawVideo|videoUri|keyFrame|landmarks|privateNote|secret|token)/i;

function containsForbiddenValue(value: unknown): boolean {
  if (typeof value === 'string') return forbiddenAttemptPacingValuePattern.test(value);
  if (Array.isArray(value)) return value.some(containsForbiddenValue);
  if (value && typeof value === 'object') return Object.values(value).some(containsForbiddenValue);
  return false;
}

function latestReport(reports: LocalAnalysisReport[]) {
  return [...reports].sort((a, b) => b.session.createdAt.localeCompare(a.session.createdAt))[0] ?? null;
}

function planStatus({
  agendaStatus,
  guardStatus,
  loadStatus,
}: {
  agendaStatus: ReturnType<typeof buildSessionAgenda>['status'];
  guardStatus: ReturnType<typeof buildPreSendGuard>['status'];
  loadStatus: ReturnType<typeof summarizeTrainingLoad>['status'];
}): AttemptPacingPlan['status'] {
  if (guardStatus === 'baseline' || agendaStatus === 'baseline') return 'baseline';
  if (guardStatus === 'reset-first' || agendaStatus === 'deload' || loadStatus === 'deload') return 'reset';
  if (guardStatus === 'controlled-repeat' || agendaStatus === 'controlled' || loadStatus === 'review') return 'controlled';
  return 'progress';
}

function titleFor(status: AttemptPacingPlan['status']) {
  if (status === 'baseline') return 'Baseline pacing';
  if (status === 'reset') return 'Reset pacing';
  if (status === 'controlled') return 'Controlled repeat pacing';
  return 'Progress pacing';
}

function maxTotalAttemptsFor(status: AttemptPacingPlan['status'], config: AttemptPacingConfig) {
  if (status === 'baseline') return config.baselineAttemptLimit;
  if (status === 'reset') return config.resetAttemptLimit;
  if (status === 'controlled') return config.controlledAttemptLimit;
  return config.progressAttemptLimit;
}

function maxHardAttemptsFor(status: AttemptPacingPlan['status'], config: AttemptPacingConfig) {
  return status === 'progress' ? config.progressHardAttemptLimit : 0;
}

function makeStep(step: AttemptPacingStep): AttemptPacingStep {
  return AttemptPacingStepSchema.parse(step);
}

function buildSteps({
  anchor,
  config,
  guardAction,
  latestTitle,
  maxHardAttempts,
  status,
}: {
  anchor: string;
  config: AttemptPacingConfig;
  guardAction: string;
  latestTitle: string;
  maxHardAttempts: number;
  status: AttemptPacingPlan['status'];
}) {
  if (status === 'baseline') {
    return [
      makeStep({
        countsTowardAttemptBudget: true,
        evidence: `Anchor ${anchor}; no hard pacing until a clean local baseline exists.`,
        id: 'baseline-capture',
        instruction: 'Film one easy, clean baseline with the same wall angle and camera setup you plan to repeat.',
        intensity: 'easy',
        label: 'Baseline',
        restAfterSeconds: config.controlledRestSeconds,
        title: 'Capture baseline',
        type: 'baseline-capture',
      }),
      makeStep({
        countsTowardAttemptBudget: false,
        evidence: 'Baseline pacing uses only local report quality and private log counts.',
        id: 'baseline-closeout',
        instruction: 'Save effort, confidence, and repeat intent before adding more attempts.',
        intensity: 'baseline',
        label: 'Log',
        restAfterSeconds: 0,
        title: 'Log baseline evidence',
        type: 'closeout',
      }),
    ];
  }

  if (status === 'reset') {
    return [
      makeStep({
        countsTowardAttemptBudget: true,
        evidence: guardAction,
        id: 'reset-repeat',
        instruction: 'Use an easier variation and keep one cue focus unchanged.',
        intensity: 'easy',
        label: 'Reset',
        restAfterSeconds: config.easyRestSeconds,
        title: 'Easy reset repeat',
        type: 'controlled-repeat',
      }),
      makeStep({
        countsTowardAttemptBudget: true,
        evidence: `Compare against ${latestTitle} only if the first reset attempt is clean.`,
        id: 'reset-comparison',
        instruction: 'Repeat once more only if quality improves and effort stays controlled.',
        intensity: 'easy',
        label: 'Compare',
        restAfterSeconds: config.controlledRestSeconds,
        title: 'Optional reset comparison',
        type: 'controlled-repeat',
      }),
      makeStep({
        countsTowardAttemptBudget: false,
        evidence: 'Stop rules prioritize local quality and private outcome logging.',
        id: 'reset-closeout',
        instruction: 'Close the session with repeat outcome and drill follow-through before adding intensity.',
        intensity: 'easy',
        label: 'Close',
        restAfterSeconds: 0,
        title: 'Close reset loop',
        type: 'closeout',
      }),
    ];
  }

  if (status === 'controlled') {
    return [
      makeStep({
        countsTowardAttemptBudget: true,
        evidence: `Anchor ${anchor}; controlled repeat before hard attempts.`,
        id: 'controlled-warmup',
        instruction: 'Record one warm-up capture to confirm framing and cue visibility.',
        intensity: 'easy',
        label: 'Warm-up',
        restAfterSeconds: config.easyRestSeconds,
        title: 'Warm-up capture',
        type: 'warmup-capture',
      }),
      makeStep({
        countsTowardAttemptBudget: true,
        evidence: guardAction,
        id: 'controlled-repeat',
        instruction: 'Repeat the latest attempt once with one constraint and no grade or beta change.',
        intensity: 'moderate',
        label: 'Repeat',
        restAfterSeconds: config.controlledRestSeconds,
        title: 'Controlled repeat',
        type: 'controlled-repeat',
      }),
      makeStep({
        countsTowardAttemptBudget: false,
        evidence: 'Quality check happens locally from the next report and private repeat log.',
        id: 'controlled-quality-check',
        instruction: 'Review cue count, quality warnings, and repeat outcome before another attempt.',
        intensity: 'baseline',
        label: 'Review',
        restAfterSeconds: 0,
        title: 'Local quality check',
        type: 'quality-check',
      }),
    ];
  }

  return [
    makeStep({
      countsTowardAttemptBudget: true,
      evidence: `Anchor ${anchor}; quality and readiness support progression.`,
      id: 'progress-warmup',
      instruction: 'Record one controlled warm-up on the same setup before the hard attempt.',
      intensity: 'easy',
      label: 'Warm-up',
      restAfterSeconds: config.easyRestSeconds,
      title: 'Warm-up capture',
      type: 'warmup-capture',
    }),
    makeStep({
      countsTowardAttemptBudget: true,
      evidence: 'Controlled repeat preserves comparability before intensity changes.',
      id: 'progress-controlled-repeat',
      instruction: 'Take one moderate repeat and confirm the main cue is improving.',
      intensity: 'moderate',
      label: 'Repeat',
      restAfterSeconds: config.controlledRestSeconds,
      title: 'Controlled repeat',
      type: 'controlled-repeat',
    }),
    makeStep({
      countsTowardAttemptBudget: true,
      evidence: `${maxHardAttempts} hard attempt slot${maxHardAttempts === 1 ? '' : 's'} allowed by current local evidence.`,
      id: 'progress-hard-try',
      instruction: 'Take one hard try, then log outcome before deciding whether to continue.',
      intensity: 'hard',
      label: 'Hard',
      restAfterSeconds: config.hardRestSeconds,
      title: 'Hard try window',
      type: 'hard-try',
    }),
    makeStep({
      countsTowardAttemptBudget: false,
      evidence: 'Pacing closes through private local outcome and drill logs.',
      id: 'progress-closeout',
      instruction: 'Stop hard attempts after the budget is used and save repeat outcome evidence.',
      intensity: 'easy',
      label: 'Close',
      restAfterSeconds: 0,
      title: 'Close progress loop',
      type: 'closeout',
    }),
  ];
}

function buildStopRules(status: AttemptPacingPlan['status'], config: AttemptPacingConfig): AttemptPacingStopRule[] {
  return [
    {
      detail: `Reassess after ${config.reassessAfterAttempts} counted attempt${config.reassessAfterAttempts === 1 ? '' : 's'} before adding intensity.`,
      id: 'reassess-window',
      label: 'Reassess window',
      status: status === 'progress' ? 'watch' : 'ready',
    },
    {
      detail: `Stop hard pacing after ${config.maxFallsBeforeStop} fall or regression outcome${config.maxFallsBeforeStop === 1 ? '' : 's'} in this session.`,
      id: 'fall-limit',
      label: 'Fall/regression limit',
      status: status === 'reset' ? 'limit' : 'watch',
    },
    {
      detail: 'Retake the clip instead of adding attempts when analysis quality warnings increase.',
      id: 'quality-drop',
      label: 'Quality drop',
      status: 'ready',
    },
    {
      detail: 'Pacing uses derived local metrics and private log counts only.',
      id: 'privacy-boundary',
      label: 'Privacy boundary',
      status: 'ready',
    },
  ].map((rule) => AttemptPacingStopRuleSchema.parse(rule));
}

function nextActionFor(status: AttemptPacingPlan['status'], guardAction: string, config: AttemptPacingConfig) {
  if (status === 'baseline') return 'Capture one easy baseline attempt and log effort before using hard-try pacing.';
  if (status === 'reset') return guardAction;
  if (status === 'controlled') return `Run one controlled repeat, rest ${Math.round(config.controlledRestSeconds / 60)} min, then compare local quality.`;
  return `Use one hard-try slot after a controlled repeat, rest ${Math.round(config.hardRestSeconds / 60)} min, then log outcome.`;
}

function restMinutes(steps: AttemptPacingStep[]) {
  return Math.round(steps.reduce((sum, step) => sum + step.restAfterSeconds, 0) / 60);
}

export function assertAttemptPacingPlanIsShareSafe(plan: AttemptPacingPlan) {
  if (containsForbiddenValue(plan)) {
    throw new Error('Attempt pacing plan contains local paths, raw video artifacts, private notes, landmarks, or token-like data.');
  }
  return plan;
}

export function assertAttemptPacingPacketIsShareSafe(packet: AttemptPacingPacket) {
  if (containsForbiddenValue(packet)) {
    throw new Error('Attempt pacing packet contains local paths, raw video artifacts, private notes, landmarks, or token-like data.');
  }
  return packet;
}

export function buildAttemptPacingPacket(pacing: AttemptPacingPlan, generatedAt = new Date().toISOString()) {
  const packet = AttemptPacingPacketSchema.parse({
    generatedAt,
    nextAction: pacing.nextAction,
    pacing,
    privacy: {
      cloudUploadRequired: false,
      privateNotesIncluded: false,
      rawVideoIncluded: false,
    },
    purpose: 'Share the local attempt pacing plan with derived attempt budget, rest windows, stop rules, and privacy flags only.',
    schemaVersion: attemptPacingPacketSchemaVersion,
    summary: {
      attemptSlots: pacing.summary.attemptSlots,
      hardAttemptSlots: pacing.summary.hardAttemptSlots,
      maxTotalAttempts: pacing.summary.maxTotalAttempts,
      restMinutes: pacing.summary.restMinutes,
      status: pacing.status,
      stopRuleCount: pacing.stopRules.length,
    },
  });

  return assertAttemptPacingPacketIsShareSafe(packet);
}

export function formatAttemptPacingPacketSummary(packet: AttemptPacingPacket) {
  const parsed = AttemptPacingPacketSchema.parse(packet);
  return `${parsed.summary.status} pacing · ${parsed.summary.attemptSlots}/${parsed.summary.maxTotalAttempts} slots · ${parsed.summary.hardAttemptSlots} hard · ${parsed.summary.restMinutes} min rest`;
}

export function buildAttemptPacingPlan({
  annotations,
  config = {},
  drillPractice = [],
  generatedAt = new Date().toISOString(),
  reports,
}: {
  annotations: ReportAnnotation[];
  config?: Partial<AttemptPacingConfig>;
  drillPractice?: DrillPracticeRecord[];
  generatedAt?: string;
  reports: LocalAnalysisReport[];
}) {
  const options = { ...defaultConfig, ...config };
  const agenda = buildSessionAgenda({ annotations, drillPractice, generatedAt, reports });
  const load = summarizeTrainingLoad({ annotations, drillPractice, generatedAt });
  const guard = buildPreSendGuard(reports, annotations, drillPractice);
  const status = planStatus({
    agendaStatus: agenda.status,
    guardStatus: guard.status,
    loadStatus: load.status,
  });
  const latestTitle = latestReport(reports)?.session.title ?? 'the latest local attempt';
  const maxTotalAttempts = maxTotalAttemptsFor(status, options);
  const maxHardAttempts = maxHardAttemptsFor(status, options);
  const steps = buildSteps({
    anchor: agenda.anchor,
    config: options,
    guardAction: guard.action,
    latestTitle,
    maxHardAttempts,
    status,
  });
  const countedSteps = steps.filter((step) => step.countsTowardAttemptBudget);
  const hardAttemptSlots = countedSteps.filter((step) => step.intensity === 'hard').length;
  const plan = AttemptPacingPlanSchema.parse({
    anchor: agenda.anchor,
    generatedAt,
    nextAction: nextActionFor(status, guard.action, options),
    privacy: {
      cloudUploadRequired: false,
      privateNotesIncluded: false,
      rawVideoIncluded: false,
    },
    schemaVersion: attemptPacingSchemaVersion,
    status,
    steps,
    stopRules: buildStopRules(status, options),
    summary: {
      attemptSlots: countedSteps.length,
      guardStatus: guard.status,
      hardAttemptSlots,
      loadStatus: load.status,
      maxHardAttempts,
      maxTotalAttempts,
      restMinutes: restMinutes(steps),
      stepCount: steps.length,
    },
    title: titleFor(status),
  });

  return assertAttemptPacingPlanIsShareSafe(plan);
}
