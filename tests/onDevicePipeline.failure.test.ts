import { describe, expect, it } from 'vitest';

import { LocalMovementAnalyzer } from '../src/movement/localAnalyzer';
import { createPoseEstimator } from '../src/movement/onDevicePipeline';
import { samplePoseFrames, sampleSession, sampleVideoAsset } from '../src/movement/sampleSession';

describe('on-device pipeline failure modes', () => {
  it('fails clearly when a required landmark is missing', async () => {
    const analyzer = new LocalMovementAnalyzer();
    const brokenFrame = {
      ...samplePoseFrames[0],
      landmarks: samplePoseFrames[0].landmarks.filter((landmark) => landmark.name !== 'leftHip'),
    };

    await expect(
      analyzer.analyze({
        frames: [brokenFrame, ...samplePoseFrames.slice(1)],
        session: sampleSession,
      }),
    ).rejects.toThrow('Missing pose landmark: leftHip');
  });

  it('keeps native provider failures explicit until adapters are installed', async () => {
    const estimator = createPoseEstimator('native-coreml');

    expect(await estimator.isAvailable()).toBe(false);
    await expect(estimator.estimate(sampleVideoAsset)).rejects.toThrow('reserved for a future native adapter');
  });
});
