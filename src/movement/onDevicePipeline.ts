import { appConfig } from '@/core/config';
import { buildVideoAnalysisPerformance } from '@/video/performanceBudget';

import {
  LocalAnalysisReportSchema,
  type AnalysisProvider,
  type ClimbSession,
  type LocalAnalysisReport,
  type OnDeviceAnalyzer,
  type PoseFrame,
  type VideoAsset,
} from './contracts';
import { attachAnalysisEvidence } from './analysisEvidence';
import { localMovementAnalyzer } from './localAnalyzer';
import { NativePlatformPoseEstimator } from './nativePlatformPoseEstimator';
import { sampleAttempts, samplePoseFrames } from './sampleSession';
import { LocalVideoFallbackPoseEstimator } from './videoPoseFallback';
import { WebTfjsMoveNetPoseEstimator } from './webTfjsPoseEstimator';

export type { AnalysisProvider };

export type PoseEstimator = {
  provider: AnalysisProvider;
  estimate(video: VideoAsset): Promise<PoseFrame[]>;
  isAvailable(): Promise<boolean>;
};

export type OnDeviceMovementPipelineOptions = {
  analyzer?: OnDeviceAnalyzer;
  poseEstimator?: PoseEstimator;
};

class LocalFixturePoseEstimator implements PoseEstimator {
  provider: AnalysisProvider = 'local-fixture';

  async estimate(video: VideoAsset): Promise<PoseFrame[]> {
    return sampleAttempts.find((attempt) => attempt.video.id === video.id)?.frames ?? samplePoseFrames;
  }

  async isAvailable() {
    return true;
  }
}

export function createPoseEstimator(provider: AnalysisProvider = appConfig.analysisProvider): PoseEstimator {
  if (provider === 'local-fixture') return new LocalFixturePoseEstimator();
  if (provider === 'local-video-fallback') return new LocalVideoFallbackPoseEstimator();
  if (provider === 'web-tfjs-movenet') return new WebTfjsMoveNetPoseEstimator();
  return new NativePlatformPoseEstimator(provider);
}

export class OnDeviceMovementPipeline {
  private readonly analyzer: OnDeviceAnalyzer;
  private readonly poseEstimator: PoseEstimator;

  constructor(options: OnDeviceMovementPipelineOptions = {}) {
    this.analyzer = options.analyzer ?? localMovementAnalyzer;
    this.poseEstimator = options.poseEstimator ?? createPoseEstimator();
  }

  async canAnalyzeLocally() {
    return this.poseEstimator.isAvailable();
  }

  async analyze(video: VideoAsset, session: ClimbSession): Promise<LocalAnalysisReport> {
    const startedAt = Date.now();
    const frames = await this.poseEstimator.estimate(video);
    const report = await this.analyzer.analyze({
      frames,
      privacyMode: appConfig.privacyMode,
      provider: this.poseEstimator.provider,
      session,
    });
    const completedAt = Date.now();

    const finalReport = LocalAnalysisReportSchema.parse({
      ...report,
      engine: {
        ...report.engine,
        provider: this.poseEstimator.provider,
        runsOnDevice: true,
        uploadsVideo: false,
      },
      performance: buildVideoAnalysisPerformance({
        analysisMs: completedAt - startedAt,
        durationMs: video.durationMs,
        frameCount: frames.length,
        measuredAt: new Date(completedAt).toISOString(),
      }),
      privacy: {
        ...report.privacy,
        retention: 'Video remains in the local media sandbox unless the user exports it.',
        videoLeavesDevice: false,
      },
    });

    return attachAnalysisEvidence(finalReport, { generatedAt: finalReport.performance.measuredAt });
  }
}

export const onDeviceMovementPipeline = new OnDeviceMovementPipeline();
