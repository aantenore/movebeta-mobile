import { z } from 'zod';

import { type ModelEvidenceConfig } from './modelEvidence';

export const modelVerificationSuiteSchemaVersion = 'movebeta.model-verification-suite-report.v1';

const VerificationCheckStatusSchema = z.enum(['blocked', 'external-required', 'pass']);
const VerificationSuiteStatusSchema = z.enum(['blocked', 'ready', 'technical-ready']);

export const ModelVerificationSuiteCheckSchema = z.object({
  command: z.string(),
  detail: z.string(),
  key: z.string(),
  label: z.string(),
  owner: z.enum(['engineering', 'product', 'qa']),
  status: VerificationCheckStatusSchema,
});

export const ModelVerificationSuiteSchema = z.object({
  coverage: z.object({
    cueCount: z.number().int().nonnegative(),
    metricIds: z.array(z.string()),
    providerCount: z.number().int().nonnegative(),
    providers: z.array(z.string()),
    replayAttempts: z.object({
      passed: z.number().int().nonnegative(),
      total: z.number().int().nonnegative(),
    }),
    wallAngles: z.object({
      covered: z.array(z.string()),
      missing: z.array(z.string()),
      required: z.array(z.string()),
    }),
  }),
  generatedAt: z.string(),
  privacy: z.object({
    credentialValuesIncluded: z.literal(false),
    localPathsIncluded: z.literal(false),
    rawArtifactsIncluded: z.literal(false),
    rawVideoIncluded: z.literal(false),
    tokenLikeValuesIncluded: z.literal(false),
  }),
  schemaVersion: z.literal(modelVerificationSuiteSchemaVersion),
  status: VerificationSuiteStatusSchema,
  summary: z.object({
    blockedChecks: z.number().int().nonnegative(),
    externalChecks: z.number().int().nonnegative(),
    nextAction: z.string(),
    passedChecks: z.number().int().nonnegative(),
    technicalReady: z.boolean(),
    totalChecks: z.number().int().positive(),
  }),
  checks: z.array(ModelVerificationSuiteCheckSchema).min(1),
});

export type ModelVerificationSuite = z.infer<typeof ModelVerificationSuiteSchema>;

type MoveNetReadinessReport = {
  averageInferenceMs?: number;
  budget?: {
    averageInferenceMs?: number;
    loadMs?: number;
    maxInferenceMs?: number;
  };
  checks?: Array<{ key?: string; status?: string }>;
  loadMs?: number;
  maxInferenceMs?: number;
  schemaVersion?: string;
  status?: string;
};

type ModelAnalysisReplayReport = {
  attempts?: Array<{
    cueIds?: string[];
    metricIds?: string[];
    passed?: boolean;
    privacySafe?: boolean;
    provider?: string;
    wallAngle?: string;
  }>;
  schemaVersion?: string;
  status?: string;
  summary?: {
    passedAttempts?: number;
    totalAttempts?: number;
  };
};

const forbiddenModelVerificationValuePattern =
  /(file:\/\/|content:\/\/|asset:\/\/|ph:\/\/|\/Users\/|\/private\/|\/var\/mobile\/|[A-Za-z]:\\|\.mov\b|\.mp4\b|BEGIN PRIVATE KEY|ghp_[A-Za-z0-9_]+|github_pat_[A-Za-z0-9_]+|pat_[A-Za-z0-9_]+|sk_live_[A-Za-z0-9_]+|sk_test_[A-Za-z0-9_]+|bearer\s+[A-Za-z0-9._-]+|eyJ[A-Za-z0-9_-]{20,})/i;

const defaultRequiredWallAngles = ['slab', 'vertical', 'overhang'];
const defaultRequiredMetricIds = ['flow', 'pause-time', 'lock-off', 'hip-drift', 'foot-cuts'];

function containsForbiddenValue(value: unknown): boolean {
  if (typeof value === 'string') return forbiddenModelVerificationValuePattern.test(value);
  if (Array.isArray(value)) return value.some(containsForbiddenValue);
  if (value && typeof value === 'object') return Object.values(value).some(containsForbiddenValue);
  return false;
}

function check({
  command,
  detail,
  key,
  label,
  owner = 'engineering',
  status,
}: {
  command: string;
  detail: string;
  key: string;
  label: string;
  owner?: 'engineering' | 'product' | 'qa';
  status: z.infer<typeof VerificationCheckStatusSchema>;
}) {
  return ModelVerificationSuiteCheckSchema.parse({ command, detail, key, label, owner, status });
}

function passedBudget(value: number | undefined, budget: number | undefined) {
  return typeof value === 'number' && typeof budget === 'number' && value <= budget;
}

function missingValues(required: string[], covered: string[]) {
  return required.filter((item) => !covered.includes(item));
}

function nextAction(checks: ModelVerificationSuite['checks']) {
  const blocked = checks.find((item) => item.status === 'blocked');
  if (blocked) return blocked.command;

  const external = checks.find((item) => item.status === 'external-required');
  if (external) return external.command;

  return 'Keep model verification, real-world validation, and native QA evidence fresh before release.';
}

export function assertModelVerificationSuiteIsShareSafe(report: ModelVerificationSuite) {
  if (containsForbiddenValue(report)) {
    throw new Error('Model verification suite contains credential values, local paths, raw artifacts, raw video references, or token-like data.');
  }
  return report;
}

export function buildModelVerificationSuite({
  generatedAt = new Date().toISOString(),
  modelAnalysisReplayReport,
  moveNetReadinessReport,
  realWorldValidation,
  requiredMetricIds = defaultRequiredMetricIds,
  requiredWallAngles = defaultRequiredWallAngles,
}: {
  generatedAt?: string;
  modelAnalysisReplayReport: ModelAnalysisReplayReport;
  moveNetReadinessReport: MoveNetReadinessReport;
  realWorldValidation?: ModelEvidenceConfig['realWorldValidation'];
  requiredMetricIds?: string[];
  requiredWallAngles?: string[];
}): ModelVerificationSuite {
  const attempts = modelAnalysisReplayReport.attempts ?? [];
  const providers = [...new Set(attempts.map((attempt) => attempt.provider).filter((value): value is string => Boolean(value)))].sort();
  const wallAngles = [...new Set(attempts.map((attempt) => attempt.wallAngle).filter((value): value is string => Boolean(value)))].sort();
  const metricIds = [...new Set(attempts.flatMap((attempt) => attempt.metricIds ?? []))].sort();
  const cueCount = attempts.reduce((count, attempt) => count + (attempt.cueIds?.length ?? 0), 0);
  const missingWallAngles = missingValues(requiredWallAngles, wallAngles);
  const missingMetrics = missingValues(requiredMetricIds, metricIds);
  const passedAttempts = modelAnalysisReplayReport.summary?.passedAttempts ?? attempts.filter((attempt) => attempt.passed).length;
  const totalAttempts = modelAnalysisReplayReport.summary?.totalAttempts ?? attempts.length;
  const moveNetChecksPass =
    moveNetReadinessReport.status === 'ready' &&
    (moveNetReadinessReport.checks ?? []).every((item) => item.status === 'pass');
  const replayPass =
    modelAnalysisReplayReport.status === 'pass' &&
    totalAttempts > 0 &&
    passedAttempts === totalAttempts &&
    attempts.every((attempt) => attempt.passed === true);
  const privacyPass = attempts.length > 0 && attempts.every((attempt) => attempt.privacySafe === true);
  const realValidationReady = realWorldValidation?.status === 'ready';

  const checks = [
    check({
      command: 'npm run model:movenet:readiness',
      detail: moveNetChecksPass
        ? `${moveNetReadinessReport.loadMs ?? 'n/a'}ms load, ${moveNetReadinessReport.averageInferenceMs ?? 'n/a'}ms avg inference, ${moveNetReadinessReport.maxInferenceMs ?? 'n/a'}ms max inference`
        : 'MoveNet readiness report must be ready and all budget checks must pass.',
      key: 'movenet-runtime',
      label: 'MoveNet runtime budget',
      status: moveNetChecksPass ? 'pass' : 'blocked',
    }),
    check({
      command: 'npm run model:movenet:readiness',
      detail: passedBudget(moveNetReadinessReport.loadMs, moveNetReadinessReport.budget?.loadMs)
        ? `${moveNetReadinessReport.loadMs}ms <= ${moveNetReadinessReport.budget?.loadMs}ms load budget`
        : 'Model load time must stay inside the configured budget.',
      key: 'movenet-load-budget',
      label: 'Model load budget',
      status: passedBudget(moveNetReadinessReport.loadMs, moveNetReadinessReport.budget?.loadMs) ? 'pass' : 'blocked',
    }),
    check({
      command: 'npm run model:movenet:readiness',
      detail:
        passedBudget(moveNetReadinessReport.averageInferenceMs, moveNetReadinessReport.budget?.averageInferenceMs) &&
        passedBudget(moveNetReadinessReport.maxInferenceMs, moveNetReadinessReport.budget?.maxInferenceMs)
          ? `${moveNetReadinessReport.averageInferenceMs}ms avg and ${moveNetReadinessReport.maxInferenceMs}ms max inference are inside budget`
          : 'Average and worst inference time must stay inside configured budgets.',
      key: 'movenet-inference-budget',
      label: 'Inference budget',
      status:
        passedBudget(moveNetReadinessReport.averageInferenceMs, moveNetReadinessReport.budget?.averageInferenceMs) &&
        passedBudget(moveNetReadinessReport.maxInferenceMs, moveNetReadinessReport.budget?.maxInferenceMs)
          ? 'pass'
          : 'blocked',
    }),
    check({
      command: 'npm run model:analysis:replay',
      detail: replayPass
        ? `${passedAttempts}/${totalAttempts} model-shaped attempts passed`
        : 'Every model-shaped replay attempt must pass through the analyzer.',
      key: 'analysis-replay',
      label: 'Model-shaped analysis replay',
      status: replayPass ? 'pass' : 'blocked',
    }),
    check({
      command: 'npm run model:analysis:replay',
      detail: missingWallAngles.length === 0 ? wallAngles.join(', ') : `Missing wall angles: ${missingWallAngles.join(', ')}`,
      key: 'wall-angle-coverage',
      label: 'Wall-angle coverage',
      status: missingWallAngles.length === 0 ? 'pass' : 'blocked',
    }),
    check({
      command: 'npm run model:analysis:replay',
      detail: missingMetrics.length === 0 ? metricIds.join(', ') : `Missing metrics: ${missingMetrics.join(', ')}`,
      key: 'metric-coverage',
      label: 'Movement metric coverage',
      status: missingMetrics.length === 0 ? 'pass' : 'blocked',
    }),
    check({
      command: 'npm run model:analysis:replay',
      detail: cueCount > 0 ? `${cueCount} cue outputs across ${totalAttempts} replay attempts` : 'Replay must produce cue outputs.',
      key: 'cue-output-coverage',
      label: 'Cue output coverage',
      status: cueCount > 0 ? 'pass' : 'blocked',
    }),
    check({
      command: 'npm run model:analysis:replay',
      detail: privacyPass ? 'Replay report excludes raw video, local paths, and upload flags.' : 'Replay privacy checks must pass.',
      key: 'privacy-boundary',
      label: 'Privacy boundary',
      status: privacyPass ? 'pass' : 'blocked',
    }),
    check({
      command: 'npm run validation:cue',
      detail: realValidationReady
        ? 'Coach-reviewed real climbing-video validation is ready.'
        : realWorldValidation?.nextAction ?? 'Collect consented real climbing clips and coach review rows.',
      key: 'real-world-validation',
      label: 'Real climbing validation',
      owner: 'product',
      status: realValidationReady ? 'pass' : 'external-required',
    }),
  ];
  const blockedChecks = checks.filter((item) => item.status === 'blocked').length;
  const externalChecks = checks.filter((item) => item.status === 'external-required').length;
  const passedChecks = checks.filter((item) => item.status === 'pass').length;
  const technicalReady = blockedChecks === 0;
  const report = ModelVerificationSuiteSchema.parse({
    checks,
    coverage: {
      cueCount,
      metricIds,
      providerCount: providers.length,
      providers,
      replayAttempts: {
        passed: passedAttempts,
        total: totalAttempts,
      },
      wallAngles: {
        covered: wallAngles,
        missing: missingWallAngles,
        required: requiredWallAngles,
      },
    },
    generatedAt,
    privacy: {
      credentialValuesIncluded: false,
      localPathsIncluded: false,
      rawArtifactsIncluded: false,
      rawVideoIncluded: false,
      tokenLikeValuesIncluded: false,
    },
    schemaVersion: modelVerificationSuiteSchemaVersion,
    status: blockedChecks > 0 ? 'blocked' : externalChecks > 0 ? 'technical-ready' : 'ready',
    summary: {
      blockedChecks,
      externalChecks,
      nextAction: nextAction(checks),
      passedChecks,
      technicalReady,
      totalChecks: checks.length,
    },
  });

  return assertModelVerificationSuiteIsShareSafe(report);
}
