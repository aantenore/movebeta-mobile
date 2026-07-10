import { appConfig } from '@/core/config';
import { resolveVideoAnalysisSamplingPlan } from '@/video/analysisWindow';
import { buildVideoAnalysisPerformance } from '@/video/performanceBudget';

import {
  LocalAnalysisReportSchema,
  type AnalysisProvider,
  type CoachLensKey,
  type ClimbSession,
  type LocalAnalysisReport,
  type OnDeviceAnalyzer,
  type PoseFrame,
  type VideoAsset,
} from './contracts';
import { attachAnalysisEvidence } from './analysisEvidence';
import { throwIfAnalysisAborted, type AnalysisRunOptions } from './analysisCancellation';
import { localMovementAnalyzer } from './localAnalyzer';
import { NativePlatformPoseEstimator } from './nativePlatformPoseEstimator';
import { sampleAttempts, samplePoseFrames } from './sampleSession';
import { LocalVideoFallbackPoseEstimator } from './videoPoseFallback';
import { WebTfjsMoveNetPoseEstimator } from './webTfjsPoseEstimator';

export type { AnalysisProvider };

export type PoseEstimator = {
  model?: string;
  provider: AnalysisProvider;
  estimate(video: VideoAsset, options?: AnalysisRunOptions): Promise<PoseFrame[]>;
  isAvailable(): Promise<boolean>;
};

export type OnDeviceMovementPipelineOptions = {
  analyzer?: OnDeviceAnalyzer;
  coachLens?: CoachLensKey;
  poseEstimator?: PoseEstimator;
};

class LocalFixturePoseEstimator implements PoseEstimator {
  model = 'fixture-pose-v1';
  provider: AnalysisProvider = 'local-fixture';

  async estimate(video: VideoAsset, options: AnalysisRunOptions = {}): Promise<PoseFrame[]> {
    throwIfAnalysisAborted(options.signal);
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
  private readonly coachLens: CoachLensKey;
  private readonly poseEstimator: PoseEstimator;

  constructor(options: OnDeviceMovementPipelineOptions = {}) {
    this.analyzer = options.analyzer ?? localMovementAnalyzer;
    this.coachLens = options.coachLens ?? appConfig.coachLens;
    this.poseEstimator = options.poseEstimator ?? createPoseEstimator();
  }

  async canAnalyzeLocally() {
    return this.poseEstimator.isAvailable();
  }

  async analyze(
    video: VideoAsset,
    session: ClimbSession,
    options: AnalysisRunOptions & { coachLens?: CoachLensKey } = {},
  ): Promise<LocalAnalysisReport> {
    const startedAt = Date.now();
    const samplingPlan = resolveVideoAnalysisSamplingPlan(video);
    throwIfAnalysisAborted(options.signal);
    const frames = await this.poseEstimator.estimate(video, options);
    throwIfAnalysisAborted(options.signal);
    const report = await this.analyzer.analyze({
      frames,
      coachLens: options.coachLens ?? this.coachLens,
      model: this.poseEstimator.model ?? this.poseEstimator.provider,
      privacyMode: appConfig.privacyMode,
      provider: this.poseEstimator.provider,
      sample: {
        durationMs: samplingPlan.durationMs,
        expectedFrameCount: samplingPlan.expectedFrameCount,
        referenceIntervalMs: samplingPlan.referenceIntervalMs,
        samplingIntervalMs: samplingPlan.samplingIntervalMs,
      },
      session,
      video,
    });
    throwIfAnalysisAborted(options.signal);
    const completedAt = Date.now();

    const finalReport = LocalAnalysisReportSchema.parse({
      ...report,
      engine: {
        ...report.engine,
        analysisWindow: samplingPlan.window,
        provider: this.poseEstimator.provider,
        runsOnDevice: true,
        uploadsVideo: false,
      },
      performance: buildVideoAnalysisPerformance({
        analysisMs: completedAt - startedAt,
        durationMs: samplingPlan.durationMs,
        frameCount: frames.length,
        measuredAt: new Date(completedAt).toISOString(),
      }),
      privacy: {
        ...report.privacy,
        retention: 'The report stores pose evidence and metrics, not the selected video file.',
        videoLeavesDevice: false,
      },
    });

    return attachAnalysisEvidence(finalReport, { generatedAt: finalReport.performance.measuredAt });
  }
}

export const onDeviceMovementPipeline = new OnDeviceMovementPipeline();
