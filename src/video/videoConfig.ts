export const videoAnalysisConfig = {
  defaultDurationMs: 12_000,
  defaultHeight: 1920,
  defaultSession: {
    grade: 'Project',
    gym: 'Local wall',
    wallAngle: 'vertical' as const,
  },
  defaultWidth: 1080,
  maxImportDurationSeconds: 120,
  maxRecordingFileSizeBytes: 350_000_000,
  maxRecordingDurationSeconds: 45,
  maxTfjsFrames: 48,
  recordingVideoBitrate: 6_000_000,
  recordingVideoQuality: '1080p' as const,
  captureCalibration: {
    idealDistanceMeters: {
      max: 6,
      min: 2.5,
    },
    usableDistanceMeters: {
      max: 8,
      min: 1.5,
    },
  },
  minimumLongSidePx: 640,
  minimumDurationMs: 1_500,
  minimumShortSidePx: 360,
  minTfjsFrames: 10,
  recommendedAnalysisDurationMs: 45_000,
  tfjsFrameIntervalMs: 350,
} as const;
