import type { Keypoint, Pose } from '@tensorflow-models/pose-detection';
import { z } from 'zod';

import { LocalAnalysisReportSchema, type LocalAnalysisReport, type PoseFrame } from './contracts';
import { localMovementAnalyzer } from './localAnalyzer';
import { mapMoveNetPoseToFrame, moveNetRequiredKeypoints, type PoseFrameDimensions } from './movenetPoseMapper';
import { sampleAttempts, type SampleAttempt } from './sampleSession';

export const MODEL_ANALYSIS_REPLAY_SCHEMA_VERSION = 'movebeta.model-analysis-replay-report.v1';

const ReplayAttemptSchema = z.object({
  analysisQualityScore: z.number().min(0).max(100),
  cueIds: z.array(z.string()),
  frameCount: z.number().int().nonnegative(),
  metricIds: z.array(z.string()),
  passed: z.boolean(),
  privacySafe: z.boolean(),
  provider: z.string(),
  sessionId: z.string(),
  title: z.string(),
  wallAngle: z.string(),
});

export const ModelAnalysisReplayReportSchema = z.object({
  attempts: z.array(ReplayAttemptSchema),
  dimensions: z.object({
    height: z.number().positive(),
    width: z.number().positive(),
  }),
  generatedAt: z.string(),
  limitations: z.array(z.string()),
  minQualityScore: z.number().min(0).max(100),
  schemaVersion: z.literal(MODEL_ANALYSIS_REPLAY_SCHEMA_VERSION),
  status: z.enum(['pass', 'fail']),
  summary: z.object({
    averageQualityScore: z.number().min(0).max(100),
    failedAttempts: z.number().int().nonnegative(),
    maxQualityScore: z.number().min(0).max(100),
    minQualityScore: z.number().min(0).max(100),
    passedAttempts: z.number().int().nonnegative(),
    totalAttempts: z.number().int().nonnegative(),
  }),
});

export type ModelAnalysisReplayReport = z.infer<typeof ModelAnalysisReplayReportSchema>;

const defaultDimensions: PoseFrameDimensions = {
  height: 1920,
  width: 1080,
};

function average(values: number[]) {
  if (values.length === 0) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function round(value: number) {
  return Number(value.toFixed(2));
}

export function moveNetPoseFromFrame(frame: PoseFrame, dimensions: PoseFrameDimensions = defaultDimensions): Pick<Pose, 'keypoints'> {
  const keypoints = Object.entries(moveNetRequiredKeypoints).map(([landmarkName, keypointName]) => {
    const landmark = frame.landmarks.find((item) => item.name === landmarkName);
    if (!landmark) throw new Error(`Missing fixture landmark: ${landmarkName}`);

    return {
      name: keypointName,
      score: landmark.visibility,
      x: landmark.x * dimensions.width,
      y: landmark.y * dimensions.height,
      z: landmark.z,
    } satisfies Keypoint;
  });

  return { keypoints };
}

function reportIsPrivacySafe(report: LocalAnalysisReport) {
  const serialized = JSON.stringify(report);
  const forbiddenVideoReferences = ['fixture://', 'file://', 'content://', 'ph://', 'asset-library://', 'blob:', 'data:'];

  return (
    report.engine.uploadsVideo === false &&
    report.privacy.videoLeavesDevice === false &&
    forbiddenVideoReferences.every((fragment) => !serialized.includes(fragment))
  );
}

async function replayAttempt(
  attempt: SampleAttempt,
  dimensions: PoseFrameDimensions,
  minQualityScore: number,
): Promise<z.infer<typeof ReplayAttemptSchema>> {
  const mappedFrames = attempt.frames.map((frame) =>
    mapMoveNetPoseToFrame(moveNetPoseFromFrame(frame, dimensions), dimensions, frame.timestampMs),
  );
  const report = LocalAnalysisReportSchema.parse(
    await localMovementAnalyzer.analyze({
      frames: mappedFrames,
      model: 'movenet-shaped-replay-to-local-rules-v1',
      privacyMode: 'on-device',
      provider: 'web-tfjs-movenet',
      session: attempt.session,
    }),
  );
  const privacySafe = reportIsPrivacySafe(report);
  const passed =
    report.engine.provider === 'web-tfjs-movenet' &&
    report.engine.processedFrames === mappedFrames.length &&
    report.analysisQuality.score >= minQualityScore &&
    report.metrics.length >= 5 &&
    report.cues.length > 0 &&
    privacySafe;

  return ReplayAttemptSchema.parse({
    analysisQualityScore: report.analysisQuality.score,
    cueIds: report.cues.map((cue) => cue.id),
    frameCount: report.engine.processedFrames,
    metricIds: report.metrics.map((metric) => metric.id),
    passed,
    privacySafe,
    provider: report.engine.provider,
    sessionId: attempt.session.id,
    title: attempt.session.title,
    wallAngle: attempt.session.wallAngle,
  });
}

export async function runModelAnalysisReplay({
  attempts = sampleAttempts,
  dimensions = defaultDimensions,
  generatedAt = new Date().toISOString(),
  minQualityScore = 90,
}: {
  attempts?: SampleAttempt[];
  dimensions?: PoseFrameDimensions;
  generatedAt?: string;
  minQualityScore?: number;
} = {}): Promise<ModelAnalysisReplayReport> {
  const replayedAttempts = await Promise.all(
    attempts.map((attempt) => replayAttempt(attempt, dimensions, minQualityScore)),
  );
  const scores = replayedAttempts.map((attempt) => attempt.analysisQualityScore);
  const failedAttempts = replayedAttempts.filter((attempt) => !attempt.passed).length;
  const minObservedQualityScore = scores.length > 0 ? Math.min(...scores) : 0;
  const maxObservedQualityScore = scores.length > 0 ? Math.max(...scores) : 0;

  return ModelAnalysisReplayReportSchema.parse({
    attempts: replayedAttempts,
    dimensions,
    generatedAt,
    limitations: [
      'Uses deterministic MoveNet-shaped fixture keypoints to verify app analysis integration.',
      'Does not replace physical-device validation with real climbing videos and coach-reviewed labels.',
    ],
    minQualityScore,
    schemaVersion: MODEL_ANALYSIS_REPLAY_SCHEMA_VERSION,
    status: failedAttempts === 0 ? 'pass' : 'fail',
    summary: {
      averageQualityScore: round(average(scores)),
      failedAttempts,
      maxQualityScore: maxObservedQualityScore,
      minQualityScore: minObservedQualityScore,
      passedAttempts: replayedAttempts.length - failedAttempts,
      totalAttempts: replayedAttempts.length,
    },
  });
}
