import { z } from 'zod';

import type { PwaAnalysisPreflight } from './pwaAnalysisPreflight';
import type { AnalysisResourcePlan } from '@/video/analysisResourcePlan';
import type { ClipTriagePlan } from '@/video/clipTriage';
import type { VideoIntakeAssessment } from '@/video/videoIntake';

export const analysisExecutionPlanSchemaVersion = 'movebeta.analysis-execution-plan.v1';

const AnalysisExecutionPlanStatusSchema = z.enum(['blocked', 'ready', 'review', 'warmup-required']);
const AnalysisExecutionPlanStepStatusSchema = z.enum(['action', 'blocked', 'ready', 'review']);
const AnalysisExecutionPlanStepKeySchema = z.enum([
  'clip-intake',
  'clip-triage',
  'model-readiness',
  'resource-budget',
  'privacy-boundary',
]);

export const AnalysisExecutionPlanStepSchema = z.object({
  action: z.string().min(1),
  detail: z.string().min(1),
  key: AnalysisExecutionPlanStepKeySchema,
  label: z.string().min(1),
  status: AnalysisExecutionPlanStepStatusSchema,
});

export const AnalysisExecutionPlanSchema = z.object({
  generatedAt: z.string().datetime(),
  privacy: z.object({
    credentialValuesIncluded: z.literal(false),
    localPathsIncluded: z.literal(false),
    rawArtifactsIncluded: z.literal(false),
    rawVideoIncluded: z.literal(false),
    tokenLikeValuesIncluded: z.literal(false),
    videoUriIncluded: z.literal(false),
  }),
  schemaVersion: z.literal(analysisExecutionPlanSchemaVersion),
  steps: z.array(AnalysisExecutionPlanStepSchema).length(5),
  summary: z.object({
    actionCount: z.number().int().nonnegative(),
    blockedCount: z.number().int().nonnegative(),
    canStartAnalysis: z.boolean(),
    nextAction: z.string().min(1),
    readyCount: z.number().int().nonnegative(),
    reviewCount: z.number().int().nonnegative(),
    shouldWarmModel: z.boolean(),
    status: AnalysisExecutionPlanStatusSchema,
  }),
});

export type AnalysisExecutionPlan = z.infer<typeof AnalysisExecutionPlanSchema>;
export type AnalysisExecutionPlanStatus = z.infer<typeof AnalysisExecutionPlanStatusSchema>;
export type AnalysisExecutionPlanStep = z.infer<typeof AnalysisExecutionPlanStepSchema>;
export type AnalysisExecutionPlanStepStatus = z.infer<typeof AnalysisExecutionPlanStepStatusSchema>;

const forbiddenAnalysisExecutionValuePattern =
  /(file:\/\/|content:\/\/|asset:\/\/|ph:\/\/|\/Users\/|\/private\/|\/var\/mobile\/|[A-Za-z]:\\|\.mov\b|\.mp4\b|BEGIN PRIVATE KEY|ghp_[A-Za-z0-9_]+|github_pat_[A-Za-z0-9_]+|pat_[A-Za-z0-9_]+|sk_live_[A-Za-z0-9_]+|sk_test_[A-Za-z0-9_]+|bearer\s+[A-Za-z0-9._-]+|eyJ[A-Za-z0-9_-]{20,})/i;

function containsForbiddenValue(value: unknown): boolean {
  if (typeof value === 'string') return forbiddenAnalysisExecutionValuePattern.test(value);
  if (Array.isArray(value)) return value.some(containsForbiddenValue);
  if (value && typeof value === 'object') return Object.values(value).some(containsForbiddenValue);
  return false;
}

function step({
  action,
  detail,
  key,
  label,
  status,
}: {
  action: string;
  detail: string;
  key: AnalysisExecutionPlanStep['key'];
  label: string;
  status: AnalysisExecutionPlanStepStatus;
}) {
  return AnalysisExecutionPlanStepSchema.parse({ action, detail, key, label, status });
}

function intakeStatus(intake: VideoIntakeAssessment): AnalysisExecutionPlanStepStatus {
  if (!intake.canAnalyze) return 'blocked';
  return intake.status === 'review' ? 'review' : 'ready';
}

function triageStatus(triage: ClipTriagePlan): AnalysisExecutionPlanStepStatus {
  if (!triage.canAnalyze || triage.decision === 'blocked') return 'blocked';
  return triage.decision === 'analyze' ? 'ready' : 'review';
}

function modelStatus(preflight: PwaAnalysisPreflight): AnalysisExecutionPlanStepStatus {
  if (!preflight.canAnalyze) return 'blocked';
  if (preflight.shouldWarmBeforeAnalysis || preflight.status === 'action') return 'action';
  return 'ready';
}

function resourceStatus(resourcePlan: AnalysisResourcePlan): AnalysisExecutionPlanStepStatus {
  if (resourcePlan.summary.status === 'blocked') return 'blocked';
  return resourcePlan.summary.status === 'review' ? 'review' : 'ready';
}

function summaryStatus({
  blockedCount,
  reviewCount,
  shouldWarmModel,
}: {
  blockedCount: number;
  reviewCount: number;
  shouldWarmModel: boolean;
}): AnalysisExecutionPlanStatus {
  if (blockedCount > 0) return 'blocked';
  if (shouldWarmModel) return 'warmup-required';
  if (reviewCount > 0) return 'review';
  return 'ready';
}

export function assertAnalysisExecutionPlanIsShareSafe(plan: AnalysisExecutionPlan) {
  if (containsForbiddenValue(plan)) {
    throw new Error('Analysis execution plan contains credential values, local paths, raw artifacts, raw video references, or token-like data.');
  }
  return plan;
}

export function buildAnalysisExecutionPlan({
  generatedAt = new Date().toISOString(),
  intake,
  modelPreflight,
  resourcePlan,
  triage,
}: {
  generatedAt?: string;
  intake: VideoIntakeAssessment;
  modelPreflight: PwaAnalysisPreflight;
  resourcePlan: AnalysisResourcePlan;
  triage: ClipTriagePlan;
}): AnalysisExecutionPlan {
  const steps = [
    step({
      action: intake.canAnalyze ? intake.action : 'Resolve the clip intake blocker before the model starts.',
      detail: `${intake.title}; ${intake.expectedFrames} expected sampled frame(s).`,
      key: 'clip-intake',
      label: 'Clip intake',
      status: intakeStatus(intake),
    }),
    step({
      action: triage.primaryAction,
      detail: `${triage.title}; score ${triage.score}/100; decision ${triage.decision}.`,
      key: 'clip-triage',
      label: 'Clip triage',
      status: triageStatus(triage),
    }),
    step({
      action: modelPreflight.action,
      detail: `${modelPreflight.title}; ${modelPreflight.detail}`,
      key: 'model-readiness',
      label: 'Model readiness',
      status: modelStatus(modelPreflight),
    }),
    step({
      action: resourcePlan.summary.nextAction,
      detail: `${resourcePlan.summary.estimatedSampledFrames} frame(s), ${resourcePlan.summary.budgetMs}ms budget, ${resourcePlan.summary.workloadLevel} workload.`,
      key: 'resource-budget',
      label: 'Resource budget',
      status: resourceStatus(resourcePlan),
    }),
    step({
      action: 'Keep raw video, local paths, credentials, and token-like values out of exported analysis evidence.',
      detail: 'The execution packet contains only derived readiness statuses and numeric planning metadata.',
      key: 'privacy-boundary',
      label: 'Privacy boundary',
      status: 'ready',
    }),
  ];

  const blockedCount = steps.filter((item) => item.status === 'blocked').length;
  const reviewCount = steps.filter((item) => item.status === 'review').length;
  const actionCount = steps.filter((item) => item.status === 'action').length;
  const readyCount = steps.filter((item) => item.status === 'ready').length;
  const shouldWarmModel = modelPreflight.shouldWarmBeforeAnalysis;
  const status = summaryStatus({ blockedCount, reviewCount, shouldWarmModel });
  const packet = AnalysisExecutionPlanSchema.parse({
    generatedAt,
    privacy: {
      credentialValuesIncluded: false,
      localPathsIncluded: false,
      rawArtifactsIncluded: false,
      rawVideoIncluded: false,
      tokenLikeValuesIncluded: false,
      videoUriIncluded: false,
    },
    schemaVersion: analysisExecutionPlanSchemaVersion,
    steps,
    summary: {
      actionCount,
      blockedCount,
      canStartAnalysis: blockedCount === 0,
      nextAction:
        steps.find((item) => item.status === 'blocked')?.action ??
        steps.find((item) => item.status === 'action')?.action ??
        steps.find((item) => item.status === 'review')?.action ??
        'Analysis execution checklist is ready.',
      readyCount,
      reviewCount,
      shouldWarmModel,
      status,
    },
  });

  return assertAnalysisExecutionPlanIsShareSafe(packet);
}
