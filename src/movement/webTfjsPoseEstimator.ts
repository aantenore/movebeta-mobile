import { videoAnalysisConfig } from '@/video/videoConfig';
import { appConfig } from '@/core/config';
import { resolveVideoAnalysisSamplingPlan } from '@/video/analysisWindow';

import type { PoseFrame, VideoAsset } from './contracts';
import { throwIfAnalysisAborted, type AnalysisRunOptions } from './analysisCancellation';
import { tryMapMoveNetPoseToFrame } from './movenetPoseMapper';
import type { AnalysisProvider, PoseEstimator } from './onDevicePipeline';

type PoseDetectionModule = typeof import('@tensorflow-models/pose-detection');
type PoseDetector = import('@tensorflow-models/pose-detection').PoseDetector;

const detectorLoadTimeoutMs = 25_000;
const videoEventTimeoutMs = 12_000;
let detectorPromise: Promise<PoseDetector> | null = null;

export function createRetryableLoader<T>() {
  let current: Promise<T> | null = null;

  return {
    load(factory: () => Promise<T>) {
      if (!current) {
        let guarded: Promise<T>;
        guarded = factory().catch((error) => {
          if (current === guarded) current = null;
          throw error;
        });
        current = guarded;
      }
      return current;
    },
    reset(dispose?: (value: T) => void) {
      const pending = current;
      current = null;
      if (pending && dispose) pending.then(dispose).catch(() => undefined);
    },
  };
}

const detectorLoader = createRetryableLoader<PoseDetector>();

function hasBrowserVideoRuntime() {
  return typeof document !== 'undefined' && typeof HTMLVideoElement !== 'undefined';
}

function waitForVideoEvent(
  element: HTMLVideoElement,
  eventName: string,
  timeoutMs = videoEventTimeoutMs,
  signal?: AbortSignal,
) {
  return new Promise<void>((resolve, reject) => {
    try {
      throwIfAnalysisAborted(signal);
    } catch (error) {
      reject(error);
      return;
    }
    const timeout = window.setTimeout(() => {
      cleanup();
      reject(new Error(`Timed out waiting for video ${eventName}.`));
    }, timeoutMs);

    const onReady = () => {
      cleanup();
      resolve();
    };
    const onError = () => {
      cleanup();
      reject(new Error(`Video failed while waiting for ${eventName}.`));
    };
    const onAbort = () => {
      cleanup();
      try {
        throwIfAnalysisAborted(signal);
      } catch (error) {
        reject(error);
      }
    };
    const cleanup = () => {
      window.clearTimeout(timeout);
      element.removeEventListener(eventName, onReady);
      element.removeEventListener('error', onError);
      signal?.removeEventListener('abort', onAbort);
    };

    element.addEventListener(eventName, onReady, { once: true });
    element.addEventListener('error', onError, { once: true });
    signal?.addEventListener('abort', onAbort, { once: true });
  });
}

function withTimeout<T>(promise: Promise<T>, message: string, timeoutMs = detectorLoadTimeoutMs) {
  return new Promise<T>((resolve, reject) => {
    const timeout = window.setTimeout(() => reject(new Error(message)), timeoutMs);
    promise.then(
      (value) => {
        window.clearTimeout(timeout);
        resolve(value);
      },
      (error) => {
        window.clearTimeout(timeout);
        reject(error);
      },
    );
  });
}

async function createDetector() {
  const tf = await import('@tensorflow/tfjs');
  await import('@tensorflow/tfjs-backend-webgl');

  const backendSet = await tf.setBackend('webgl').catch(() => false);
  if (!backendSet) {
    await tf.setBackend('cpu');
  }
  await tf.ready();

  const poseDetection: PoseDetectionModule = await import('@tensorflow-models/pose-detection');
  const modelConfig = {
    modelType: poseDetection.movenet.modelType.SINGLEPOSE_LIGHTNING,
    ...(appConfig.tfjsMoveNetModelUrl ? { modelUrl: appConfig.tfjsMoveNetModelUrl } : {}),
  };
  return poseDetection.createDetector(poseDetection.SupportedModels.MoveNet, modelConfig);
}

async function getDetector() {
  detectorPromise = detectorLoader.load(async () => {
    const creation = createDetector();
    try {
      return await withTimeout(creation, 'MoveNet model loading timed out.');
    } catch (error) {
      creation.then((detector) => detector.dispose()).catch(() => undefined);
      throw error;
    }
  });
  return detectorPromise;
}

async function prepareVideoElement(video: VideoAsset, signal?: AbortSignal) {
  const element = document.createElement('video');
  element.crossOrigin = 'anonymous';
  element.muted = true;
  element.playsInline = true;
  element.preload = 'auto';
  element.src = video.uri;
  element.width = video.width;
  element.height = video.height;
  try {
    element.load();
    if (element.readyState < HTMLMediaElement.HAVE_METADATA) {
      await waitForVideoEvent(element, 'loadedmetadata', videoEventTimeoutMs, signal);
    }
    throwIfAnalysisAborted(signal);
    return element;
  } catch (error) {
    cleanupVideoElement(element);
    throw error;
  }
}

async function seekVideo(element: HTMLVideoElement, timestampMs: number, signal?: AbortSignal) {
  throwIfAnalysisAborted(signal);
  const durationSeconds = Number.isFinite(element.duration) && element.duration > 0 ? element.duration : timestampMs / 1000;
  const targetSeconds = Math.max(0, Math.min(timestampMs / 1000, Math.max(durationSeconds - 0.05, 0)));

  if (Math.abs(element.currentTime - targetSeconds) < 0.025 && element.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA) {
    return;
  }

  element.currentTime = targetSeconds;
  await waitForVideoEvent(element, 'seeked', videoEventTimeoutMs, signal);
}

function getVideoDimensions(element: HTMLVideoElement) {
  const width = element.videoWidth || element.width || 1;
  const height = element.videoHeight || element.height || 1;
  return { height, width };
}

function getFrameTimestamps(video: VideoAsset) {
  const { expectedFrameCount: frameCount, window } = resolveVideoAnalysisSamplingPlan(video);

  return Array.from({ length: frameCount }, (_, index) =>
    Math.round(window.startMs + (window.durationMs * index) / Math.max(frameCount - 1, 1)),
  );
}

function cleanupVideoElement(element: HTMLVideoElement) {
  element.pause();
  element.removeAttribute('src');
  element.load();
  element.remove();
}

export class WebTfjsMoveNetPoseEstimator implements PoseEstimator {
  model = 'movenet-singlepose-lightning-v4';
  provider: AnalysisProvider = 'web-tfjs-movenet';

  async estimate(video: VideoAsset, options: AnalysisRunOptions = {}): Promise<PoseFrame[]> {
    throwIfAnalysisAborted(options.signal);
    if (!(await this.isAvailable())) {
      throw new Error('TensorFlow.js MoveNet requires a browser video runtime.');
    }

    const detector = await getDetector();
    throwIfAnalysisAborted(options.signal);
    const element = await prepareVideoElement(video, options.signal);

    try {
      const frames: PoseFrame[] = [];
      for (const timestampMs of getFrameTimestamps(video)) {
        throwIfAnalysisAborted(options.signal);
        await seekVideo(element, timestampMs, options.signal);
        const decodedTimestampMs = Math.round(element.currentTime * 1000);
        const poses = await detector.estimatePoses(element, { maxPoses: 1 }, decodedTimestampMs);
        throwIfAnalysisAborted(options.signal);
        if (poses[0]) {
          const frame = tryMapMoveNetPoseToFrame(poses[0], getVideoDimensions(element), decodedTimestampMs);
          if (frame && (frames.length === 0 || frame.timestampMs > frames[frames.length - 1].timestampMs)) {
            frames.push(frame);
          }
        }
      }

      if (frames.length < videoAnalysisConfig.minTfjsFrames) {
        throw new Error('MoveNet did not return enough frames for a reliable local analysis.');
      }

      return frames;
    } finally {
      cleanupVideoElement(element);
    }
  }

  async isAvailable() {
    return hasBrowserVideoRuntime();
  }
}

export function resetWebTfjsMoveNetForTests() {
  detectorLoader.reset((detector) => detector.dispose());
  detectorPromise = null;
}
