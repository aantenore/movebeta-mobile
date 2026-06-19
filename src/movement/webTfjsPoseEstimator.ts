import { videoAnalysisConfig } from '@/video/videoConfig';

import type { PoseFrame, VideoAsset } from './contracts';
import { tryMapMoveNetPoseToFrame } from './movenetPoseMapper';
import type { AnalysisProvider, PoseEstimator } from './onDevicePipeline';

type PoseDetectionModule = typeof import('@tensorflow-models/pose-detection');
type PoseDetector = import('@tensorflow-models/pose-detection').PoseDetector;

const detectorLoadTimeoutMs = 25_000;
const videoEventTimeoutMs = 12_000;
let detectorPromise: Promise<PoseDetector> | null = null;

function hasBrowserVideoRuntime() {
  return typeof document !== 'undefined' && typeof HTMLVideoElement !== 'undefined';
}

function waitForVideoEvent(element: HTMLVideoElement, eventName: string, timeoutMs = videoEventTimeoutMs) {
  return new Promise<void>((resolve, reject) => {
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
    const cleanup = () => {
      window.clearTimeout(timeout);
      element.removeEventListener(eventName, onReady);
      element.removeEventListener('error', onError);
    };

    element.addEventListener(eventName, onReady, { once: true });
    element.addEventListener('error', onError, { once: true });
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
  return poseDetection.createDetector(poseDetection.SupportedModels.MoveNet, {
    modelType: poseDetection.movenet.modelType.SINGLEPOSE_LIGHTNING,
  });
}

async function getDetector() {
  detectorPromise ??= withTimeout(createDetector(), 'MoveNet model loading timed out.');
  return detectorPromise;
}

async function prepareVideoElement(video: VideoAsset) {
  const element = document.createElement('video');
  element.crossOrigin = 'anonymous';
  element.muted = true;
  element.playsInline = true;
  element.preload = 'auto';
  element.src = video.uri;
  element.width = video.width;
  element.height = video.height;
  element.load();

  if (element.readyState < HTMLMediaElement.HAVE_METADATA) {
    await waitForVideoEvent(element, 'loadedmetadata');
  }

  return element;
}

async function seekVideo(element: HTMLVideoElement, timestampMs: number) {
  const durationSeconds = Number.isFinite(element.duration) && element.duration > 0 ? element.duration : timestampMs / 1000;
  const targetSeconds = Math.max(0, Math.min(timestampMs / 1000, Math.max(durationSeconds - 0.05, 0)));

  if (Math.abs(element.currentTime - targetSeconds) < 0.025 && element.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA) {
    return;
  }

  element.currentTime = targetSeconds;
  await waitForVideoEvent(element, 'seeked');
}

function getVideoDimensions(element: HTMLVideoElement) {
  const width = element.videoWidth || element.width || 1;
  const height = element.videoHeight || element.height || 1;
  return { height, width };
}

function getFrameTimestamps(video: VideoAsset) {
  const frameCount = Math.max(
    videoAnalysisConfig.minTfjsFrames,
    Math.min(videoAnalysisConfig.maxTfjsFrames, Math.ceil(video.durationMs / videoAnalysisConfig.tfjsFrameIntervalMs)),
  );

  return Array.from({ length: frameCount }, (_, index) =>
    Math.round((video.durationMs * index) / Math.max(frameCount - 1, 1)),
  );
}

function cleanupVideoElement(element: HTMLVideoElement) {
  element.pause();
  element.removeAttribute('src');
  element.load();
  element.remove();
}

export class WebTfjsMoveNetPoseEstimator implements PoseEstimator {
  provider: AnalysisProvider = 'web-tfjs-movenet';

  async estimate(video: VideoAsset): Promise<PoseFrame[]> {
    if (!(await this.isAvailable())) {
      throw new Error('TensorFlow.js MoveNet requires a browser video runtime.');
    }

    const detector = await getDetector();
    const element = await prepareVideoElement(video);

    try {
      const frames: PoseFrame[] = [];
      for (const timestampMs of getFrameTimestamps(video)) {
        await seekVideo(element, timestampMs);
        const poses = await detector.estimatePoses(element, { maxPoses: 1 }, timestampMs);
        if (poses[0]) {
          const frame = tryMapMoveNetPoseToFrame(poses[0], getVideoDimensions(element), timestampMs);
          if (frame) frames.push(frame);
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
  detectorPromise?.then((detector) => detector.dispose()).catch(() => undefined);
  detectorPromise = null;
}
