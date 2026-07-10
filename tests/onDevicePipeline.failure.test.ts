import { describe, expect, it } from 'vitest';

import { LocalMovementAnalyzer } from '../src/movement/localAnalyzer';
import { createPoseEstimator } from '../src/movement/onDevicePipeline';
import { samplePoseFrames, sampleSession, sampleVideoAsset } from '../src/movement/sampleSession';

describe('on-device pipeline failure modes', () => {
  it('marks affected metrics unavailable when required landmarks are repeatedly missing', async () => {
    const analyzer = new LocalMovementAnalyzer();
    const brokenFrames = samplePoseFrames.map((frame, index) =>
      index < 25
        ? {
            ...frame,
            landmarks: frame.landmarks.filter((landmark) => landmark.name !== 'leftHip'),
          }
        : frame,
    );

    const report = await analyzer.analyze({
      frames: brokenFrames,
      session: sampleSession,
    });

    expect(report.metrics.find((metric) => metric.id === 'flow')?.status).toBe('insufficient-data');
    expect(report.metrics.find((metric) => metric.id === 'hip-drift')?.status).toBe('insufficient-data');
    expect(report.analysisQuality.warnings.join(' ')).toContain('leftHip');
  });

  it('keeps native provider failures explicit until adapters are installed', async () => {
    const estimator = createPoseEstimator('native-coreml');

    expect(await estimator.isAvailable()).toBe(false);
    await expect(estimator.estimate(sampleVideoAsset)).rejects.toThrow('reserved for a future native adapter');
  });
});
