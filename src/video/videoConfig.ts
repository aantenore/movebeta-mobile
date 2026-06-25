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
  resourcePlan: {
    bytesPerDecodedPixel: 4,
    highDecodeSurfaceBytes: 12_500_000,
    highSampledFrameCount: 40,
  },
  deviceReadiness: {
    lowBatteryLevel: 0.25,
    minimumDeviceMemoryGb: 3,
    minimumFreeStorageBytes: 500_000_000,
    minimumHardwareConcurrency: 4,
  },
  clipTriage: {
    issuePenalties: {
      longDuration: 22,
      lowResolution: 18,
      missingUri: 100,
      remoteUri: 100,
      reviewDuration: 12,
      tooShort: 100,
    },
    readyScore: 90,
    reviewScore: 70,
  },
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
  analysisWindow: {
    defaultMode: 'middle' as const,
    modes: ['full', 'early', 'middle', 'late'] as const,
  },
  tfjsFrameIntervalMs: 350,
} as const;
