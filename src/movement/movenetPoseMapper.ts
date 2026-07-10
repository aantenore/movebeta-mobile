import type { Keypoint, Pose } from '@tensorflow-models/pose-detection';

import { PoseFrameSchema, type LandmarkName, type PoseFrame, type PoseLandmark } from './contracts';

export const moveNetRequiredKeypoints: Record<LandmarkName, string> = {
  leftAnkle: 'left_ankle',
  leftElbow: 'left_elbow',
  leftHip: 'left_hip',
  leftKnee: 'left_knee',
  leftShoulder: 'left_shoulder',
  leftWrist: 'left_wrist',
  nose: 'nose',
  rightAnkle: 'right_ankle',
  rightElbow: 'right_elbow',
  rightHip: 'right_hip',
  rightKnee: 'right_knee',
  rightShoulder: 'right_shoulder',
  rightWrist: 'right_wrist',
};

export type PoseFrameDimensions = {
  height: number;
  width: number;
};

function clamp(value: number) {
  return Math.max(0, Math.min(1, value));
}

function indexMoveNetKeypoints(keypoints: Keypoint[]) {
  return new Map(keypoints.filter((keypoint) => keypoint.name).map((keypoint) => [keypoint.name, keypoint]));
}

function mapKeypoint(name: LandmarkName, keypoint: Keypoint | undefined, dimensions: PoseFrameDimensions): PoseLandmark {
  if (!keypoint || !Number.isFinite(keypoint.x) || !Number.isFinite(keypoint.y)) {
    throw new Error(`MoveNet did not return the required ${name} keypoint.`);
  }

  const normalizedX = keypoint.x / Math.max(dimensions.width, 1);
  const normalizedY = keypoint.y / Math.max(dimensions.height, 1);

  return {
    inFrame: normalizedX >= 0 && normalizedX <= 1 && normalizedY >= 0 && normalizedY <= 1,
    name,
    visibility: clamp(keypoint.score ?? 0),
    x: clamp(normalizedX),
    y: clamp(normalizedY),
    z: keypoint.z,
  };
}

export function mapMoveNetPoseToFrame(pose: Pick<Pose, 'keypoints'>, dimensions: PoseFrameDimensions, timestampMs: number): PoseFrame {
  const keypoints = indexMoveNetKeypoints(pose.keypoints);
  const landmarks = Object.entries(moveNetRequiredKeypoints).map(([name, keypointName]) =>
    mapKeypoint(name as LandmarkName, keypoints.get(keypointName), dimensions),
  );

  return PoseFrameSchema.parse({
    landmarks,
    timestampMs,
  });
}

export function tryMapMoveNetPoseToFrame(pose: Pick<Pose, 'keypoints'>, dimensions: PoseFrameDimensions, timestampMs: number) {
  try {
    return mapMoveNetPoseToFrame(pose, dimensions, timestampMs);
  } catch {
    return null;
  }
}
