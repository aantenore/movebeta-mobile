import { z } from 'zod';

export const LandmarkNameSchema = z.enum([
  'nose',
  'leftShoulder',
  'rightShoulder',
  'leftElbow',
  'rightElbow',
  'leftWrist',
  'rightWrist',
  'leftHip',
  'rightHip',
  'leftKnee',
  'rightKnee',
  'leftAnkle',
  'rightAnkle',
]);

export const PoseLandmarkSchema = z.object({
  name: LandmarkNameSchema,
  x: z.number().min(0).max(1),
  y: z.number().min(0).max(1),
  z: z.number().optional(),
  visibility: z.number().min(0).max(1).default(1),
});

export const PoseFrameSchema = z.object({
  timestampMs: z.number().nonnegative(),
  landmarks: z.array(PoseLandmarkSchema),
});

export const VideoAssetSchema = z.object({
  id: z.string(),
  uri: z.string(),
  source: z.enum(['camera', 'import', 'fixture']),
  durationMs: z.number().positive(),
  width: z.number().positive(),
  height: z.number().positive(),
  capturedAt: z.string(),
});

export const ClimbSessionSchema = z.object({
  id: z.string(),
  title: z.string(),
  gym: z.string(),
  grade: z.string(),
  wallAngle: z.enum(['slab', 'vertical', 'overhang']),
  createdAt: z.string(),
  durationMs: z.number().positive(),
  source: z.enum(['camera', 'import', 'fixture']),
});

export const MovementMetricSchema = z.object({
  id: z.string(),
  label: z.string(),
  value: z.number(),
  unit: z.string(),
  score: z.number().min(0).max(100),
  helper: z.string(),
});

export const MovementCueSchema = z.object({
  id: z.string(),
  severity: z.enum(['info', 'watch', 'fix']),
  timestampMs: z.number().nonnegative(),
  title: z.string(),
  body: z.string(),
  drill: z.string(),
});

export const TimelineEventSchema = z.object({
  id: z.string(),
  timestampMs: z.number().nonnegative(),
  label: z.string(),
  type: z.enum(['pause', 'foot-cut', 'lock-off', 'flow']),
});

export const AnalysisQualitySchema = z.object({
  score: z.number().min(0).max(100),
  frameCoverage: z.number().min(0).max(1),
  averageVisibility: z.number().min(0).max(1),
  landmarkCoverage: z.number().min(0).max(1),
  warnings: z.array(z.string()),
});

export const AnalysisPerformanceSchema = z.object({
  analysisMs: z.number().nonnegative(),
  budgetMs: z.number().nonnegative(),
  budgetStatus: z.enum(['within-budget', 'over-budget', 'not-measured']),
  framesPerSecond: z.number().nonnegative(),
  measuredAt: z.string(),
});

export const LocalAnalysisReportSchema = z.object({
  id: z.string(),
  session: ClimbSessionSchema,
  engine: z.object({
    provider: z.enum([
      'local-fixture',
      'local-video-fallback',
      'web-tfjs-movenet',
      'native-platform-pose',
      'native-mediapipe',
      'native-coreml',
      'native-tflite',
    ]),
    model: z.string(),
    runsOnDevice: z.boolean(),
    uploadsVideo: z.boolean(),
    processedFrames: z.number().int().nonnegative(),
  }),
  performance: AnalysisPerformanceSchema.default({
    analysisMs: 0,
    budgetMs: 0,
    budgetStatus: 'not-measured',
    framesPerSecond: 0,
    measuredAt: '1970-01-01T00:00:00.000Z',
  }),
  metrics: z.array(MovementMetricSchema),
  cues: z.array(MovementCueSchema),
  timeline: z.array(TimelineEventSchema),
  keyFrame: PoseFrameSchema,
  analysisQuality: AnalysisQualitySchema,
  privacy: z.object({
    videoLeavesDevice: z.boolean(),
    storedArtifacts: z.array(z.string()),
    retention: z.string(),
  }),
});

export type LandmarkName = z.infer<typeof LandmarkNameSchema>;
export type PoseLandmark = z.infer<typeof PoseLandmarkSchema>;
export type PoseFrame = z.infer<typeof PoseFrameSchema>;
export type VideoAsset = z.infer<typeof VideoAssetSchema>;
export type ClimbSession = z.infer<typeof ClimbSessionSchema>;
export type MovementMetric = z.infer<typeof MovementMetricSchema>;
export type MovementCue = z.infer<typeof MovementCueSchema>;
export type TimelineEvent = z.infer<typeof TimelineEventSchema>;
export type AnalysisQuality = z.infer<typeof AnalysisQualitySchema>;
export type AnalysisPerformance = z.infer<typeof AnalysisPerformanceSchema>;
export type LocalAnalysisReport = z.infer<typeof LocalAnalysisReportSchema>;

export type AnalyzerThresholds = {
  pauseVelocity: number;
  lockOffAngle: number;
  footCutVelocity: number;
  hipDrift: number;
};

export type LocalAnalyzerInput = {
  session: ClimbSession;
  frames: PoseFrame[];
  thresholds?: Partial<AnalyzerThresholds>;
};

export type OnDeviceAnalyzer = {
  analyze(input: LocalAnalyzerInput): Promise<LocalAnalysisReport>;
};
