import type { Keypoint, Pose } from '@tensorflow-models/pose-detection';
import { describe, expect, it } from 'vitest';

import { LocalAnalysisReportSchema, PoseFrameSchema, type PoseFrame } from '../src/movement/contracts';
import { localMovementAnalyzer } from '../src/movement/localAnalyzer';
import { mapMoveNetPoseToFrame, moveNetRequiredKeypoints } from '../src/movement/movenetPoseMapper';
import { samplePoseFrames, sampleSession } from '../src/movement/sampleSession';

const dimensions = {
  height: 1920,
  width: 1080,
};

function moveNetPoseFromFrame(frame: PoseFrame): Pick<Pose, 'keypoints'> {
  const keypoints = Object.entries(moveNetRequiredKeypoints).map(([landmarkName, keypointName]) => {
    const landmark = frame.landmarks.find((item) => item.name === landmarkName);
    if (!landmark) throw new Error(`Missing fixture landmark: ${landmarkName}`);

    return {
      name: keypointName,
      score: landmark.visibility,
      x: landmark.x * dimensions.width,
      y: landmark.y * dimensions.height,
      z: landmark.z,
    } satisfies Keypoint;
  });

  return { keypoints };
}

describe('MoveNet pose mapper', () => {
  it('maps MoveNet keypoints into the normalized app pose-frame contract', () => {
    const frame = mapMoveNetPoseToFrame(moveNetPoseFromFrame(samplePoseFrames[0]), dimensions, 1234);

    expect(PoseFrameSchema.parse(frame)).toEqual(frame);
    expect(frame.timestampMs).toBe(1234);
    expect(frame.landmarks.map((landmark) => landmark.name)).toEqual(Object.keys(moveNetRequiredKeypoints));
    expect(frame.landmarks.find((landmark) => landmark.name === 'rightWrist')?.x).toBeCloseTo(
      samplePoseFrames[0].landmarks.find((landmark) => landmark.name === 'rightWrist')!.x,
      4,
    );
  });

  it('fails clearly when a required MoveNet keypoint is missing', () => {
    const pose = moveNetPoseFromFrame(samplePoseFrames[0]);
    const incompletePose = {
      keypoints: pose.keypoints.filter((keypoint) => keypoint.name !== moveNetRequiredKeypoints.leftHip),
    };

    expect(() => mapMoveNetPoseToFrame(incompletePose, dimensions, 0)).toThrow('required leftHip keypoint');
  });

  it('treats a missing keypoint score as unknown instead of fully visible', () => {
    const pose = moveNetPoseFromFrame(samplePoseFrames[0]);
    const rightAnkle = pose.keypoints.find((keypoint) => keypoint.name === moveNetRequiredKeypoints.rightAnkle);
    if (!rightAnkle) throw new Error('Missing test keypoint.');
    delete rightAnkle.score;

    const frame = mapMoveNetPoseToFrame(pose, dimensions, 0);

    expect(frame.landmarks.find((landmark) => landmark.name === 'rightAnkle')?.visibility).toBe(0);
  });

  it('retains out-of-frame evidence while clamping overlay coordinates', () => {
    const pose = moveNetPoseFromFrame(samplePoseFrames[0]);
    const leftWrist = pose.keypoints.find((keypoint) => keypoint.name === moveNetRequiredKeypoints.leftWrist);
    if (!leftWrist) throw new Error('Missing test keypoint.');
    leftWrist.x = dimensions.width * 1.12;

    const frame = mapMoveNetPoseToFrame(pose, dimensions, 0);
    const mappedWrist = frame.landmarks.find((landmark) => landmark.name === 'leftWrist');

    expect(mappedWrist?.inFrame).toBe(false);
    expect(mappedWrist?.x).toBe(1);
  });

  it('feeds mapped MoveNet frames into the local movement analyzer report contract', async () => {
    const mappedFrames = samplePoseFrames.map((frame) =>
      mapMoveNetPoseToFrame(moveNetPoseFromFrame(frame), dimensions, frame.timestampMs),
    );

    const report = await localMovementAnalyzer.analyze({
      frames: mappedFrames,
      session: sampleSession,
    });

    expect(LocalAnalysisReportSchema.parse(report)).toEqual(report);
    expect(report.engine.uploadsVideo).toBe(false);
    expect(report.engine.processedFrames).toBe(mappedFrames.length);
    expect(report.analysisQuality.score).toBeGreaterThanOrEqual(95);
    expect(report.cues.length).toBeGreaterThan(0);
  });
});
