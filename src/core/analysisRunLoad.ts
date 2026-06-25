import { z } from 'zod';

import type { AnalysisProvider, VideoAsset } from '@/movement/contracts';
import { videoAnalysisConfig } from '@/video/videoConfig';

export const analysisRunLoadSchemaVersion = 'movebeta.analysis-run-load.v1';

const AnalysisRunLoadStatusSchema = z.enum(['cooldown', 'ready', 'review']);
const AnalysisRunLoadStepStatusSchema = z.enum(['action', 'ready', 'review']);
const AnalysisRunLoadStepKeySchema = z.enum(['recent-volume', 'runtime-budget', 'cooldown', 'device-boundary', 'privacy-boundary']);

export const AnalysisRunLoadRecordSchema = z.object({
  activeDurationMs: z.number().int().nonnegative(),
  analysisMs: z.number().int().nonnegative(),
  budgetMs: z.number().int().nonnegative(),
  completedAt: z.string().datetime(),
  provider: z.string().min(1),
  sourceType: z.enum(['camera', 'fixture', 'import']),
});

export const AnalysisRunLoadStepSchema = z.object({
  action: z.string().min(1),
  detail: z.string().min(1),
  key: AnalysisRunLoadStepKeySchema,
  label: z.string().min(1),
  status: AnalysisRunLoadStepStatusSchema,
});

export const AnalysisRunLoadSchema = z.object({
  generatedAt: z.string().datetime(),
  privacy: z.object({
    credentialValuesIncluded: z.literal(false),
    localPathsIncluded: z.literal(false),
    rawArtifactsIncluded: z.literal(false),
    rawVideoIncluded: z.literal(false),
    reportIdsIncluded: z.literal(false),
    tokenLikeValuesIncluded: z.literal(false),
    videoUriIncluded: z.literal(false),
  }),
  schemaVersion: z.literal(analysisRunLoadSchemaVersion),
  steps: z.array(AnalysisRunLoadStepSchema).length(5),
  summary: z.object({
    actionCount: z.number().int().nonnegative(),
    canStartAnalysis: z.boolean(),
    cooldownRemainingMs: z.number().int().nonnegative(),
    nextAction: z.string().min(1),
    recentRunCount: z.number().int().nonnegative(),
    reviewCount: z.number().int().nonnegative(),
    status: AnalysisRunLoadStatusSchema,
    totalRecentAnalysisMs: z.number().int().nonnegative(),
    windowMs: z.number().int().positive(),
  }),
});

export type AnalysisRunLoad = z.infer<typeof AnalysisRunLoadSchema>;
export type AnalysisRunLoadRecord = z.infer<typeof AnalysisRunLoadRecordSchema>;
export type AnalysisRunLoadStatus = z.infer<typeof AnalysisRunLoadStatusSchema>;
export type AnalysisRunLoadStep = z.infer<typeof AnalysisRunLoadStepSchema>;
export type AnalysisRunLoadStepStatus = z.infer<typeof AnalysisRunLoadStepStatusSchema>;

const forbiddenAnalysisRunLoadValuePattern =
  /(file:\/\/|content:\/\/|asset:\/\/|ph:\/\/|\/Users\/|\/private\/|\/var\/mobile\/|[A-Za-z]:\\|\.mov\b|\.mp4\b|BEGIN PRIVATE KEY|ghp_[A-Za-z0-9_]+|github_pat_[A-Za-z0-9_]+|pat_[A-Za-z0-9_]+|sk_live_[A-Za-z0-9_]+|sk_test_[A-Za-z0-9_]+|bearer\s+[A-Za-z0-9._-]+|eyJ[A-Za-z0-9_-]{20,})/i;

function containsForbiddenValue(value: unknown): boolean {
  if (typeof value === 'string') return forbiddenAnalysisRunLoadValuePattern.test(value);
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
  key: AnalysisRunLoadStep['key'];
  label: string;
  status: AnalysisRunLoadStepStatus;
}) {
  return AnalysisRunLoadStepSchema.parse({ action, detail, key, label, status });
}

function parseTime(value: string) {
  const time = Date.parse(value);
  return Number.isFinite(time) ? time : 0;
}

function recentRecords(records: AnalysisRunLoadRecord[], nowMs: number) {
  return records
    .map((record) => AnalysisRunLoadRecordSchema.parse(record))
    .filter((record) => {
      const completedAt = parseTime(record.completedAt);
      return completedAt > 0 && nowMs - completedAt <= videoAnalysisConfig.analysisRunLoad.windowMs;
    })
    .sort((left, right) => parseTime(left.completedAt) - parseTime(right.completedAt));
}

function formatDuration(valueMs: number) {
  const totalSeconds = Math.max(0, Math.ceil(valueMs / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

function aggregateStatus(steps: AnalysisRunLoadStep[], cooldownRemainingMs: number): AnalysisRunLoadStatus {
  if (cooldownRemainingMs > 0) return 'cooldown';
  if (steps.some((item) => item.status === 'review')) return 'review';
  return 'ready';
}

export function createAnalysisRunLoadRecord({
  activeDurationMs,
  analysisMs,
  budgetMs,
  completedAt = new Date().toISOString(),
  provider,
  sourceType,
}: {
  activeDurationMs: number;
  analysisMs: number;
  budgetMs: number;
  completedAt?: string;
  provider: AnalysisProvider | string;
  sourceType: VideoAsset['source'];
}): AnalysisRunLoadRecord {
  return AnalysisRunLoadRecordSchema.parse({
    activeDurationMs: Math.max(0, Math.trunc(activeDurationMs)),
    analysisMs: Math.max(0, Math.trunc(analysisMs)),
    budgetMs: Math.max(0, Math.trunc(budgetMs)),
    completedAt,
    provider,
    sourceType,
  });
}

export function assertAnalysisRunLoadIsShareSafe(load: AnalysisRunLoad) {
  if (containsForbiddenValue(load)) {
    throw new Error('Analysis run load contains credential values, local paths, report ids, raw artifacts, raw video references, or token-like data.');
  }
  return load;
}

export function buildAnalysisRunLoad({
  currentBudgetMs,
  generatedAt = new Date().toISOString(),
  records,
}: {
  currentBudgetMs: number;
  generatedAt?: string;
  records: AnalysisRunLoadRecord[];
}): AnalysisRunLoad {
  const nowMs = parseTime(generatedAt);
  const recent = recentRecords(records, nowMs);
  const lastCompletedAt = recent.at(-1)?.completedAt;
  const cooldownRemainingMs =
    recent.length >= videoAnalysisConfig.analysisRunLoad.reviewRunCount && lastCompletedAt
      ? Math.max(0, parseTime(lastCompletedAt) + videoAnalysisConfig.analysisRunLoad.cooldownMs - nowMs)
      : 0;
  const totalRecentAnalysisMs = recent.reduce((total, record) => total + record.analysisMs, 0);
  const budgetReview = currentBudgetMs > videoAnalysisConfig.analysisRunLoad.highBudgetMs;
  const sustainedReview = totalRecentAnalysisMs > videoAnalysisConfig.analysisRunLoad.sustainedRuntimeReviewMs;
  const volumeReview = recent.length >= videoAnalysisConfig.analysisRunLoad.reviewRunCount;
  const steps = [
    step({
      action:
        volumeReview && cooldownRemainingMs > 0
          ? `Wait ${formatDuration(cooldownRemainingMs)} before the next repeated local analysis.`
          : volumeReview
            ? 'Use shorter windows or add rest between repeated local analyses.'
            : 'Run count is within the configured local analysis window.',
      detail: `${recent.length}/${videoAnalysisConfig.analysisRunLoad.reviewRunCount} run(s) in the last ${formatDuration(
        videoAnalysisConfig.analysisRunLoad.windowMs,
      )}.`,
      key: 'recent-volume',
      label: 'Recent volume',
      status: volumeReview ? 'review' : 'ready',
    }),
    step({
      action: budgetReview ? 'Prefer a shorter analysis window before starting this run.' : 'Current analysis budget is within the configured run-load threshold.',
      detail: `${formatDuration(currentBudgetMs)} current budget; ${formatDuration(videoAnalysisConfig.analysisRunLoad.highBudgetMs)} review threshold.`,
      key: 'runtime-budget',
      label: 'Runtime budget',
      status: budgetReview ? 'review' : 'ready',
    }),
    step({
      action:
        cooldownRemainingMs > 0
          ? `Pause for ${formatDuration(cooldownRemainingMs)} to reduce heat and battery pressure.`
          : 'No local cooldown is currently recommended.',
      detail: `${formatDuration(videoAnalysisConfig.analysisRunLoad.cooldownMs)} cooldown after repeated runs.`,
      key: 'cooldown',
      label: 'Cooldown',
      status: cooldownRemainingMs > 0 ? 'action' : 'ready',
    }),
    step({
      action: sustainedReview ? 'Treat the next analysis as review-first on warm or low-battery devices.' : 'Recent measured runtime is under the sustained-load threshold.',
      detail: `${formatDuration(totalRecentAnalysisMs)} measured analysis runtime in the active window.`,
      key: 'device-boundary',
      label: 'Device boundary',
      status: sustainedReview ? 'review' : 'ready',
    }),
    step({
      action: 'Keep run-load exports limited to aggregate timing, provider, and source-type metadata.',
      detail: 'The packet excludes video URI, raw media, local paths, credentials, token-like values, and report ids.',
      key: 'privacy-boundary',
      label: 'Privacy boundary',
      status: 'ready',
    }),
  ];

  const status = aggregateStatus(steps, cooldownRemainingMs);
  const packet = AnalysisRunLoadSchema.parse({
    generatedAt,
    privacy: {
      credentialValuesIncluded: false,
      localPathsIncluded: false,
      rawArtifactsIncluded: false,
      rawVideoIncluded: false,
      reportIdsIncluded: false,
      tokenLikeValuesIncluded: false,
      videoUriIncluded: false,
    },
    schemaVersion: analysisRunLoadSchemaVersion,
    steps,
    summary: {
      actionCount: steps.filter((item) => item.status === 'action').length,
      canStartAnalysis: cooldownRemainingMs === 0,
      cooldownRemainingMs,
      nextAction:
        steps.find((item) => item.status === 'action')?.action ??
        steps.find((item) => item.status === 'review')?.action ??
        'Analysis run load is ready.',
      recentRunCount: recent.length,
      reviewCount: steps.filter((item) => item.status === 'review').length,
      status,
      totalRecentAnalysisMs,
      windowMs: videoAnalysisConfig.analysisRunLoad.windowMs,
    },
  });

  return assertAnalysisRunLoadIsShareSafe(packet);
}
