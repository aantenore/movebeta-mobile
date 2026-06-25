import { z } from 'zod';

import type { AnalysisWindowMode, VideoAsset } from '@/movement/contracts';

import { buildVideoAnalysisWindow, formatVideoAnalysisWindow } from './analysisWindow';
import { resolveVideoAnalysisBudgetMs } from './performanceBudget';
import { videoAnalysisConfig } from './videoConfig';
import { estimateSampledFrameCount, formatVideoDuration, isLocalVideoUri } from './videoIntake';

export const analysisResourcePlanSchemaVersion = 'movebeta.analysis-resource-plan.v1';

const AnalysisResourcePlanStatusSchema = z.enum(['blocked', 'ready', 'review']);
const AnalysisResourcePlanStepKeySchema = z.enum([
  'source-locality',
  'analysis-window',
  'frame-sampling',
  'runtime-budget',
  'decode-surface',
]);

export const AnalysisResourcePlanStepSchema = z.object({
  action: z.string().min(1),
  detail: z.string().min(1),
  key: AnalysisResourcePlanStepKeySchema,
  label: z.string().min(1),
  status: AnalysisResourcePlanStatusSchema,
});

export const AnalysisResourcePlanSchema = z.object({
  generatedAt: z.string().datetime(),
  privacy: z.object({
    credentialValuesIncluded: z.literal(false),
    localPathsIncluded: z.literal(false),
    rawArtifactsIncluded: z.literal(false),
    rawVideoIncluded: z.literal(false),
    tokenLikeValuesIncluded: z.literal(false),
    videoUriIncluded: z.literal(false),
  }),
  schemaVersion: z.literal(analysisResourcePlanSchemaVersion),
  source: z.object({
    analysisWindow: z.object({
      durationMs: z.number().int().positive(),
      endMs: z.number().int().nonnegative(),
      label: z.string().min(1),
      mode: z.enum(['early', 'full', 'late', 'middle']),
      sourceDurationMs: z.number().int().positive(),
      startMs: z.number().int().nonnegative(),
    }),
    durationMs: z.number().int().positive(),
    height: z.number().int().positive(),
    sourceType: z.enum(['camera', 'fixture', 'import']),
    width: z.number().int().positive(),
  }),
  steps: z.array(AnalysisResourcePlanStepSchema).length(5),
  summary: z.object({
    activeDurationMs: z.number().int().positive(),
    budgetMs: z.number().int().positive(),
    decodeSurfaceBytes: z.number().int().nonnegative(),
    estimatedSampledFrames: z.number().int().nonnegative(),
    nextAction: z.string().min(1),
    pixelWorkload: z.number().int().nonnegative(),
    readyForLocalAnalysis: z.boolean(),
    status: AnalysisResourcePlanStatusSchema,
    workloadLevel: z.enum(['high', 'normal']),
  }),
});

export type AnalysisResourcePlan = z.infer<typeof AnalysisResourcePlanSchema>;
export type AnalysisResourcePlanStatus = z.infer<typeof AnalysisResourcePlanStatusSchema>;
export type AnalysisResourcePlanStep = z.infer<typeof AnalysisResourcePlanStepSchema>;

const forbiddenAnalysisResourceValuePattern =
  /(file:\/\/|content:\/\/|asset:\/\/|ph:\/\/|\/Users\/|\/private\/|\/var\/mobile\/|[A-Za-z]:\\|\.mov\b|\.mp4\b|BEGIN PRIVATE KEY|ghp_[A-Za-z0-9_]+|github_pat_[A-Za-z0-9_]+|pat_[A-Za-z0-9_]+|sk_live_[A-Za-z0-9_]+|sk_test_[A-Za-z0-9_]+|bearer\s+[A-Za-z0-9._-]+|eyJ[A-Za-z0-9_-]{20,})/i;

function containsForbiddenValue(value: unknown): boolean {
  if (typeof value === 'string') return forbiddenAnalysisResourceValuePattern.test(value);
  if (Array.isArray(value)) return value.some(containsForbiddenValue);
  if (value && typeof value === 'object') return Object.values(value).some(containsForbiddenValue);
  return false;
}

function planStep({
  action,
  detail,
  key,
  label,
  status,
}: {
  action: string;
  detail: string;
  key: AnalysisResourcePlanStep['key'];
  label: string;
  status: AnalysisResourcePlanStatus;
}) {
  return AnalysisResourcePlanStepSchema.parse({ action, detail, key, label, status });
}

function aggregateStatus(steps: AnalysisResourcePlanStep[]): AnalysisResourcePlanStatus {
  if (steps.some((step) => step.status === 'blocked')) return 'blocked';
  if (steps.some((step) => step.status === 'review')) return 'review';
  return 'ready';
}

function localSourceStatus(video: VideoAsset): AnalysisResourcePlanStatus {
  if (!video.uri.trim()) return 'blocked';
  return isLocalVideoUri(video.uri) ? 'ready' : 'blocked';
}

function frameSamplingStatus(frameCount: number): AnalysisResourcePlanStatus {
  if (frameCount < videoAnalysisConfig.minTfjsFrames) return 'blocked';
  if (frameCount >= videoAnalysisConfig.resourcePlan.highSampledFrameCount) return 'review';
  return 'ready';
}

function decodeSurfaceStatus(decodeSurfaceBytes: number): AnalysisResourcePlanStatus {
  return decodeSurfaceBytes > videoAnalysisConfig.resourcePlan.highDecodeSurfaceBytes ? 'review' : 'ready';
}

export function assertAnalysisResourcePlanIsShareSafe(plan: AnalysisResourcePlan) {
  if (containsForbiddenValue(plan)) {
    throw new Error('Analysis resource plan contains credential values, local paths, raw artifacts, raw video references, or token-like data.');
  }
  return plan;
}

export function buildAnalysisResourcePlan({
  generatedAt = new Date().toISOString(),
  mode,
  video,
}: {
  generatedAt?: string;
  mode: AnalysisWindowMode;
  video: VideoAsset;
}): AnalysisResourcePlan {
  const analysisWindow = buildVideoAnalysisWindow(video, mode);
  const activeDurationMs = analysisWindow.durationMs;
  const estimatedSampledFrames = estimateSampledFrameCount(activeDurationMs);
  const budgetMs = resolveVideoAnalysisBudgetMs(activeDurationMs);
  const decodeSurfaceBytes = Math.round(video.width * video.height * videoAnalysisConfig.resourcePlan.bytesPerDecodedPixel);
  const pixelWorkload = Math.round(video.width * video.height * estimatedSampledFrames);
  const sourceStatus = localSourceStatus(video);
  const maxImportDurationMs = videoAnalysisConfig.maxImportDurationSeconds * 1000;
  const sourceTooLong = video.durationMs > maxImportDurationMs;
  const windowReview = analysisWindow.mode === 'full' && video.durationMs > videoAnalysisConfig.recommendedAnalysisDurationMs;
  const samplingStatus = frameSamplingStatus(estimatedSampledFrames);
  const surfaceStatus = decodeSurfaceStatus(decodeSurfaceBytes);

  const steps = [
    planStep({
      action:
        sourceStatus === 'ready'
          ? 'Keep the source local; do not use remote media URLs for the default analysis flow.'
          : 'Choose a camera, imported local file, browser blob, or bundled fixture before analysis.',
      detail: sourceStatus === 'ready' ? 'The video source can stay on the device.' : 'The source is missing or remote.',
      key: 'source-locality',
      label: 'Source locality',
      status: sourceStatus,
    }),
    planStep({
      action: sourceTooLong
        ? `Trim the source under ${videoAnalysisConfig.maxImportDurationSeconds}s before local analysis.`
        : windowReview
          ? 'Use early, middle, or late window mode to avoid sampling the whole long clip.'
          : 'Use the selected analysis window; the original file remains unchanged.',
      detail: `${formatVideoAnalysisWindow(analysisWindow)} from ${formatVideoDuration(video.durationMs)} source.`,
      key: 'analysis-window',
      label: 'Analysis window',
      status: sourceTooLong ? 'blocked' : windowReview ? 'review' : 'ready',
    }),
    planStep({
      action:
        samplingStatus === 'ready'
          ? 'Run the configured local sampler.'
          : samplingStatus === 'review'
            ? 'Prefer a shorter active window if the device is warm, old, or low on battery.'
            : 'Record a longer attempt so the sampler can collect enough frames.',
      detail: `${estimatedSampledFrames}/${videoAnalysisConfig.maxTfjsFrames} configured sample frame(s).`,
      key: 'frame-sampling',
      label: 'Frame sampling',
      status: samplingStatus,
    }),
    planStep({
      action:
        activeDurationMs <= videoAnalysisConfig.recommendedAnalysisDurationMs
          ? 'The active window fits the standard local analysis budget.'
          : 'Use a shorter active window before relying on the analysis result.',
      detail: `${formatVideoDuration(activeDurationMs)} active duration with ${formatVideoDuration(budgetMs)} runtime budget.`,
      key: 'runtime-budget',
      label: 'Runtime budget',
      status: activeDurationMs <= videoAnalysisConfig.recommendedAnalysisDurationMs ? 'ready' : 'review',
    }),
    planStep({
      action:
        surfaceStatus === 'ready'
          ? 'Decode surface is within the configured on-device planning threshold.'
          : 'Prefer 1080p capture or trim/window the clip on lower-memory devices.',
      detail: `${video.width}x${video.height} source frame; ${decodeSurfaceBytes} byte RGBA decode surface estimate.`,
      key: 'decode-surface',
      label: 'Decode surface',
      status: surfaceStatus,
    }),
  ];

  const status = aggregateStatus(steps);
  const packet = AnalysisResourcePlanSchema.parse({
    generatedAt,
    privacy: {
      credentialValuesIncluded: false,
      localPathsIncluded: false,
      rawArtifactsIncluded: false,
      rawVideoIncluded: false,
      tokenLikeValuesIncluded: false,
      videoUriIncluded: false,
    },
    schemaVersion: analysisResourcePlanSchemaVersion,
    source: {
      analysisWindow: {
        ...analysisWindow,
        label: formatVideoAnalysisWindow(analysisWindow),
      },
      durationMs: Math.round(video.durationMs),
      height: Math.round(video.height),
      sourceType: video.source,
      width: Math.round(video.width),
    },
    steps,
    summary: {
      activeDurationMs,
      budgetMs,
      decodeSurfaceBytes,
      estimatedSampledFrames,
      nextAction:
        steps.find((step) => step.status === 'blocked')?.action ??
        steps.find((step) => step.status === 'review')?.action ??
        'Local analysis resource plan is ready.',
      pixelWorkload,
      readyForLocalAnalysis: status === 'ready',
      status,
      workloadLevel: samplingStatus === 'review' || surfaceStatus === 'review' ? 'high' : 'normal',
    },
  });

  return assertAnalysisResourcePlanIsShareSafe(packet);
}
