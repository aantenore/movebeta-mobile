import { z } from 'zod';

export const ModelEvidenceStatusSchema = z.enum(['ready', 'degraded', 'missing']);
export const RealWorldValidationStatusSchema = z.enum(['ready', 'needs-real-video']);

export const ModelEvidenceConfigSchema = z.object({
  analysisReplay: z.object({
    generatedAt: z.string().optional(),
    minimumQualityScore: z.number().nonnegative().optional(),
    passedAttempts: z.number().int().nonnegative(),
    privacySafe: z.boolean().optional(),
    provider: z.string().min(1).optional(),
    status: z.enum(['pass', 'fail', 'missing']),
    totalAttempts: z.number().int().nonnegative(),
  }),
  modelName: z.string().min(1),
  provider: z.string().min(1),
  readiness: z.object({
    averageInferenceMs: z.number().nonnegative().optional(),
    backend: z.string().min(1).optional(),
    budget: z.object({
      averageInferenceMs: z.number().positive(),
      loadMs: z.number().positive(),
      maxInferenceMs: z.number().positive(),
    }).optional(),
    generatedAt: z.string().optional(),
    loadMs: z.number().nonnegative().optional(),
    maxInferenceMs: z.number().nonnegative().optional(),
    status: ModelEvidenceStatusSchema,
  }),
  realWorldValidation: z.object({
    estimatedReviewRows: z.number().int().nonnegative(),
    nextAction: z.string().min(1),
    requiredClips: z.number().int().nonnegative(),
    requiredWallAngles: z.array(z.string().min(1)),
    status: RealWorldValidationStatusSchema,
  }),
});

export type ModelEvidenceConfig = z.infer<typeof ModelEvidenceConfigSchema>;
export type ModelEvidenceSummaryStatus = 'missing' | 'degraded' | 'technical-ready' | 'ready';

export type ModelEvidenceSummary = {
  action: string;
  badge: string;
  checks: Array<{
    detail: string;
    key: string;
    label: string;
    status: 'ready' | 'blocked' | 'action';
  }>;
  limitation: string;
  metrics: Array<{
    detail: string;
    key: string;
    label: string;
    value: string;
  }>;
  modelName: string;
  provider: string;
  status: ModelEvidenceSummaryStatus;
};

export const defaultModelEvidenceConfig: ModelEvidenceConfig = {
  analysisReplay: {
    generatedAt: '2026-06-20T02:28:11.560Z',
    minimumQualityScore: 100,
    passedAttempts: 3,
    privacySafe: true,
    provider: 'web-tfjs-movenet',
    status: 'pass',
    totalAttempts: 3,
  },
  modelName: 'MoveNet SinglePose Lightning',
  provider: 'web-tfjs-movenet',
  readiness: {
    averageInferenceMs: 344,
    backend: 'cpu',
    budget: {
      averageInferenceMs: 1500,
      loadMs: 25000,
      maxInferenceMs: 3000,
    },
    generatedAt: '2026-06-20T02:28:05.948Z',
    loadMs: 3926,
    maxInferenceMs: 359,
    status: 'ready',
  },
  realWorldValidation: {
    estimatedReviewRows: 40,
    nextAction: 'Collect consented climbing clips, coach review rows, and physical-device evidence before production movement-quality claims.',
    requiredClips: 20,
    requiredWallAngles: ['slab', 'vertical', 'overhang'],
    status: 'needs-real-video',
  },
};

export function parseModelEvidenceConfig(value: unknown): ModelEvidenceConfig | undefined {
  if (value === undefined || value === null || value === '') return undefined;
  const parsed = typeof value === 'string' ? JSON.parse(value) : value;
  return ModelEvidenceConfigSchema.parse(parsed);
}

function msValue(value: number | undefined) {
  if (value === undefined) return 'n/a';
  return value >= 1000 ? `${(value / 1000).toFixed(1)}s` : `${Math.round(value)}ms`;
}

function budgetDetail(value: number | undefined, budget: number | undefined) {
  if (value === undefined || budget === undefined) return 'Budget not configured';
  return `${msValue(value)} / ${msValue(budget)} budget`;
}

function readinessCheck(config: ModelEvidenceConfig): ModelEvidenceSummary['checks'][number] {
  const isReady = config.readiness.status === 'ready';
  return {
    detail: isReady
      ? `${config.readiness.backend ?? 'local'} backend, ${budgetDetail(config.readiness.averageInferenceMs, config.readiness.budget?.averageInferenceMs)}`
      : 'Run npm run model:movenet:readiness and keep every budget check passing.',
    key: 'model-readiness',
    label: 'MoveNet execution',
    status: isReady ? 'ready' : 'blocked',
  };
}

function replayCheck(config: ModelEvidenceConfig): ModelEvidenceSummary['checks'][number] {
  const isReady = config.analysisReplay.status === 'pass' && config.analysisReplay.passedAttempts === config.analysisReplay.totalAttempts;
  return {
    detail: isReady
      ? `${config.analysisReplay.passedAttempts}/${config.analysisReplay.totalAttempts} replay attempts passed`
      : 'Run npm run model:analysis:replay until all model-shaped attempts pass.',
    key: 'analysis-replay',
    label: 'Model-shaped replay',
    status: isReady ? 'ready' : 'blocked',
  };
}

function realWorldCheck(config: ModelEvidenceConfig): ModelEvidenceSummary['checks'][number] {
  const isReady = config.realWorldValidation.status === 'ready';
  return {
    detail: isReady
      ? 'Real climbing-video validation is complete.'
      : `${config.realWorldValidation.requiredClips} clips and ${config.realWorldValidation.estimatedReviewRows} review rows still required`,
    key: 'real-world-validation',
    label: 'Real climbing validation',
    status: isReady ? 'ready' : 'action',
  };
}

function summaryStatus(config: ModelEvidenceConfig): ModelEvidenceSummaryStatus {
  const technicalReady =
    config.readiness.status === 'ready' &&
    config.analysisReplay.status === 'pass' &&
    config.analysisReplay.passedAttempts === config.analysisReplay.totalAttempts;
  if (!technicalReady) return 'degraded';
  return config.realWorldValidation.status === 'ready' ? 'ready' : 'technical-ready';
}

function badgeForStatus(status: ModelEvidenceSummaryStatus) {
  if (status === 'ready') return 'Validated';
  if (status === 'technical-ready') return 'Technical ready';
  if (status === 'degraded') return 'Needs rerun';
  return 'Missing';
}

export function buildModelEvidenceSummary(config?: ModelEvidenceConfig): ModelEvidenceSummary {
  if (!config) {
    return {
      action: 'Configure model evidence from the latest readiness and replay reports before stakeholder handoff.',
      badge: badgeForStatus('missing'),
      checks: [
        {
          detail: 'No model evidence object is configured.',
          key: 'model-readiness',
          label: 'MoveNet execution',
          status: 'blocked',
        },
      ],
      limitation: 'No local model evidence is available to display.',
      metrics: [],
      modelName: 'Model evidence not configured',
      provider: 'not-configured',
      status: 'missing',
    };
  }

  const status = summaryStatus(config);
  const metrics = [
    {
      detail: budgetDetail(config.readiness.loadMs, config.readiness.budget?.loadMs),
      key: 'load',
      label: 'Load',
      value: msValue(config.readiness.loadMs),
    },
    {
      detail: budgetDetail(config.readiness.averageInferenceMs, config.readiness.budget?.averageInferenceMs),
      key: 'average-inference',
      label: 'Avg inference',
      value: msValue(config.readiness.averageInferenceMs),
    },
    {
      detail: config.analysisReplay.privacySafe === false ? 'Privacy check failed' : 'Privacy-safe replay evidence',
      key: 'replay',
      label: 'Replay',
      value: `${config.analysisReplay.passedAttempts}/${config.analysisReplay.totalAttempts}`,
    },
  ];

  return {
    action:
      status === 'ready'
        ? 'Keep readiness, replay, and real-world validation evidence fresh before each release.'
        : config.realWorldValidation.nextAction,
    badge: badgeForStatus(status),
    checks: [readinessCheck(config), replayCheck(config), realWorldCheck(config)],
    limitation:
      status === 'technical-ready'
        ? 'Synthetic inference and model-shaped replay prove execution and contract compatibility; real climbing-video accuracy still needs coach-reviewed clips.'
        : 'Model evidence must stay tied to release reports and real validation artifacts.',
    metrics,
    modelName: config.modelName,
    provider: config.provider,
    status,
  };
}
