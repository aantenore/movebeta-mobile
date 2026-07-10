import { estimateNativePoseFrames, isNativePoseAvailable } from 'movebeta-pose';

import { videoAnalysisConfig } from '@/video/videoConfig';
import { resolveVideoAnalysisWindow } from '@/video/analysisWindow';

import { PoseFrameSchema, type PoseFrame, type VideoAsset } from './contracts';
import { throwIfAnalysisAborted, type AnalysisRunOptions } from './analysisCancellation';
import type { AnalysisProvider, PoseEstimator } from './onDevicePipeline';

const implementedNativeProviders = new Set<AnalysisProvider>(['native-platform-pose']);

export class NativePlatformPoseEstimator implements PoseEstimator {
  model = 'native-platform-body-pose-v1';

  constructor(public provider: Extract<AnalysisProvider, 'native-platform-pose' | 'native-mediapipe' | 'native-coreml' | 'native-tflite'>) {}

  async estimate(video: VideoAsset, options: AnalysisRunOptions = {}): Promise<PoseFrame[]> {
    throwIfAnalysisAborted(options.signal);
    if (!implementedNativeProviders.has(this.provider)) {
      throw new Error(`${this.provider} is reserved for a future native adapter and is not implemented in this build.`);
    }

    if (!(await this.isAvailable())) {
      throw new Error(`${this.provider} requires a custom Expo development build with the MoveBetaPose native module.`);
    }

    const window = resolveVideoAnalysisWindow(video);
    const frames = await estimateNativePoseFrames({
      analysisEndMs: window.endMs,
      analysisStartMs: window.startMs,
      durationMs: video.durationMs,
      frameIntervalMs: videoAnalysisConfig.tfjsFrameIntervalMs,
      height: video.height,
      maxInferenceLongSidePx: videoAnalysisConfig.maxInferenceLongSidePx,
      maxFrames: videoAnalysisConfig.maxTfjsFrames,
      minFrames: videoAnalysisConfig.minTfjsFrames,
      provider: this.provider,
      uri: video.uri,
      width: video.width,
    });

    throwIfAnalysisAborted(options.signal);
    return PoseFrameSchema.array().parse(frames);
  }

  async isAvailable() {
    if (!implementedNativeProviders.has(this.provider)) return false;
    return isNativePoseAvailable(this.provider);
  }
}
