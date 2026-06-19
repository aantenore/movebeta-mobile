import { describe, expect, it } from 'vitest';

import {
  ModelAnalysisReplayReportSchema,
  moveNetPoseFromFrame,
  runModelAnalysisReplay,
} from '../src/movement/modelAnalysisReplay';
import { mapMoveNetPoseToFrame, moveNetRequiredKeypoints } from '../src/movement/movenetPoseMapper';
import { sampleAttempts, samplePoseFrames } from '../src/movement/sampleSession';

const dimensions = {
  height: 1920,
  width: 1080,
};

describe('model analysis replay', () => {
  it('converts fixture pose frames into MoveNet-shaped keypoints', () => {
    const pose = moveNetPoseFromFrame(samplePoseFrames[0], dimensions);
    const frame = mapMoveNetPoseToFrame(pose, dimensions, samplePoseFrames[0].timestampMs);

    expect(pose.keypoints.map((keypoint) => keypoint.name)).toEqual(Object.values(moveNetRequiredKeypoints));
    expect(frame.landmarks).toHaveLength(Object.keys(moveNetRequiredKeypoints).length);
    expect(frame.landmarks.find((landmark) => landmark.name === 'leftHip')?.x).toBeCloseTo(
      samplePoseFrames[0].landmarks.find((landmark) => landmark.name === 'leftHip')!.x,
      4,
    );
  });

  it('replays every bundled attempt through the model-shaped analysis contract', async () => {
    const report = await runModelAnalysisReplay({
      generatedAt: '2026-06-20T10:00:00.000Z',
      minQualityScore: 90,
    });

    expect(ModelAnalysisReplayReportSchema.parse(report)).toEqual(report);
    expect(report.status).toBe('pass');
    expect(report.summary.totalAttempts).toBe(sampleAttempts.length);
    expect(report.summary.failedAttempts).toBe(0);
    expect(report.summary.minQualityScore).toBeGreaterThanOrEqual(90);
    expect(new Set(report.attempts.map((attempt) => attempt.wallAngle))).toEqual(
      new Set(['overhang', 'vertical', 'slab']),
    );

    for (const attempt of report.attempts) {
      expect(attempt.provider).toBe('web-tfjs-movenet');
      expect(attempt.privacySafe).toBe(true);
      expect(attempt.frameCount).toBe(35);
      expect(attempt.metricIds).toEqual(['flow', 'pause-time', 'lock-off', 'hip-drift', 'foot-cuts']);
      expect(attempt.cueIds.length).toBeGreaterThan(0);
    }
  });

  it('fails the replay report when the configured quality bar is not met', async () => {
    const degradedAttempt = {
      ...sampleAttempts[0],
      frames: sampleAttempts[0].frames.map((frame) => ({
        ...frame,
        landmarks: frame.landmarks.map((landmark) => ({
          ...landmark,
          visibility: 0.2,
        })),
      })),
    };
    const report = await runModelAnalysisReplay({
      attempts: [degradedAttempt],
      generatedAt: '2026-06-20T10:00:00.000Z',
      minQualityScore: 90,
    });

    expect(report.status).toBe('fail');
    expect(report.summary.failedAttempts).toBe(1);
  });
});
