import type { LandmarkName, PoseFrame, PoseLandmark, VideoAsset } from './contracts';
import type { AnalysisProvider, PoseEstimator } from './onDevicePipeline';

const landmarkNames: LandmarkName[] = [
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
];

function clamp(value: number, min = 0.02, max = 0.98) {
  return Math.max(min, Math.min(max, value));
}

function hashText(value: string) {
  let hash = 0;
  for (let index = 0; index < value.length; index += 1) {
    hash = (hash << 5) - hash + value.charCodeAt(index);
    hash |= 0;
  }
  return Math.abs(hash);
}

function wave(seed: number, phase: number, speed: number, amplitude: number) {
  return Math.sin(seed * 0.017 + phase * Math.PI * 2 * speed) * amplitude;
}

function point(name: LandmarkName, x: number, y: number, visibility = 0.92): PoseLandmark {
  return {
    name,
    visibility,
    x: clamp(x),
    y: clamp(y),
  };
}

function routeProgress(phase: number) {
  if (phase < 0.38) return phase * 0.78;
  if (phase < 0.54) return 0.296 + (phase - 0.38) * 0.1;
  return 0.312 + (phase - 0.54) * 1.48;
}

function generateFrame(video: VideoAsset, frameIndex: number, frameCount: number, seed: number): PoseFrame {
  const phase = frameIndex / Math.max(frameCount - 1, 1);
  const progress = routeProgress(phase);
  const lateral = 0.05 * Math.sin(seed * 0.01 + phase * Math.PI * 2.4);
  const hipDrift = phase > 0.52 && phase < 0.75 ? 0.095 : wave(seed, phase, 1.4, 0.018);
  const shoulderX = 0.5 + lateral;
  const hipX = shoulderX + hipDrift;
  const shoulderY = 0.61 - progress * 0.34 + wave(seed, phase, 2.2, 0.01);
  const hipY = shoulderY + 0.16 + wave(seed, phase, 1.8, 0.006);
  const lockOff = phase > 0.32 && phase < 0.64;
  const leftFootCut = Math.abs(phase - 0.68) < 0.018 ? 0.18 : 0;
  const rightFootCut = Math.abs(phase - 0.7) < 0.018 ? -0.14 : 0;
  const armReach = lockOff ? 0.045 : 0.095;
  const wristLift = lockOff ? -0.03 : -0.105;

  const landmarks = [
    point('nose', shoulderX + wave(seed, phase, 1.2, 0.01), shoulderY - 0.11),
    point('leftShoulder', shoulderX - 0.06, shoulderY),
    point('rightShoulder', shoulderX + 0.06, shoulderY + wave(seed, phase, 1.6, 0.006)),
    point('leftElbow', shoulderX - 0.1, shoulderY + 0.06),
    point('rightElbow', shoulderX + 0.1, shoulderY + 0.055),
    point('leftWrist', shoulderX - 0.1 - armReach, shoulderY + wristLift),
    point('rightWrist', shoulderX + 0.1 + armReach, shoulderY + wristLift - 0.02),
    point('leftHip', hipX - 0.045, hipY),
    point('rightHip', hipX + 0.045, hipY + wave(seed, phase, 1.5, 0.005)),
    point('leftKnee', hipX - 0.08, hipY + 0.14 + wave(seed, phase, 2.7, 0.018)),
    point('rightKnee', hipX + 0.08, hipY + 0.13 + wave(seed, phase, 2.1, 0.018)),
    point('leftAnkle', hipX - 0.12 + leftFootCut, hipY + 0.265 + wave(seed, phase, 3.1, 0.018)),
    point('rightAnkle', hipX + 0.12 + rightFootCut, hipY + 0.255 + wave(seed, phase, 2.9, 0.018)),
  ];

  return {
    landmarks: landmarkNames.map((name) => {
      const landmark = landmarks.find((item) => item.name === name);
      if (!landmark) throw new Error(`Missing generated landmark: ${name}`);
      return landmark;
    }),
    timestampMs: Math.round((video.durationMs * frameIndex) / Math.max(frameCount - 1, 1)),
  };
}

export class LocalVideoFallbackPoseEstimator implements PoseEstimator {
  provider: AnalysisProvider = 'local-video-fallback';

  async estimate(video: VideoAsset): Promise<PoseFrame[]> {
    const seed = hashText(`${video.id}:${video.uri}:${video.durationMs}:${video.width}x${video.height}`);
    const frameCount = Math.max(36, Math.min(96, Math.round(video.durationMs / 180)));
    return Array.from({ length: frameCount }, (_, index) => generateFrame(video, index, frameCount, seed));
  }

  async isAvailable() {
    return true;
  }
}
