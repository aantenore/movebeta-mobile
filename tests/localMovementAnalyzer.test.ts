import { describe, expect, it } from 'vitest';

import { LocalAnalysisReportSchema, PoseFrameSchema } from '../src/movement/contracts';
import { localMovementAnalyzer } from '../src/movement/localAnalyzer';
import { OnDeviceMovementPipeline, createPoseEstimator } from '../src/movement/onDevicePipeline';
import { analyzeDemoAttempt, analyzeSampleSession, listDemoAttempts } from '../src/movement/repository';
import { sampleAttempts, samplePoseFrames, sampleSession, sampleVideoAsset } from '../src/movement/sampleSession';

const expectedLandmarks = [
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

describe('sample pose session', () => {
  it('contains normalized landmark frames for local analysis', () => {
    expect(samplePoseFrames).toHaveLength(35);

    for (const frame of samplePoseFrames) {
      expect(PoseFrameSchema.parse(frame)).toEqual(frame);
      expect(frame.landmarks.map((landmark) => landmark.name)).toEqual(expectedLandmarks);
    }
  });

  it('exposes multiple selectable local attempts for the app workflow', () => {
    const attempts = listDemoAttempts();

    expect(attempts).toHaveLength(3);
    expect(attempts.map((attempt) => attempt.session.id)).toEqual(sampleAttempts.map((attempt) => attempt.session.id));
    expect(new Set(attempts.map((attempt) => attempt.session.wallAngle))).toEqual(
      new Set(['overhang', 'vertical', 'slab']),
    );
  });
});

describe('local movement analyzer', () => {
  it('returns a valid on-device report with metrics, cues, and a sorted timeline', async () => {
    const report = await analyzeSampleSession();
    const parsed = LocalAnalysisReportSchema.parse(report);

    expect(parsed).toEqual(report);
    expect(report.engine.runsOnDevice).toBe(true);
    expect(report.engine.uploadsVideo).toBe(false);
    expect(report.privacy.videoLeavesDevice).toBe(false);
    expect(report.engine.processedFrames).toBe(samplePoseFrames.length);
    expect(report.analysisQuality.score).toBeGreaterThanOrEqual(95);
    expect(report.analysisQuality.warnings).toEqual([]);
    expect(report.metrics.map((metric) => metric.id)).toEqual([
      'flow',
      'pause-time',
      'lock-off',
      'hip-drift',
      'foot-cuts',
    ]);
    expect(report.cues.length).toBeGreaterThan(0);

    const sortedTimestamps = [...report.timeline].sort((a, b) => a.timestampMs - b.timestampMs);
    expect(report.timeline).toEqual(sortedTimestamps);
  });

  it('analyzes the selected local attempt instead of always using the first fixture', async () => {
    const verticalAttempt = sampleAttempts.find((attempt) => attempt.session.wallAngle === 'vertical');
    expect(verticalAttempt).toBeDefined();

    const report = await analyzeDemoAttempt(verticalAttempt!.session.id);

    expect(LocalAnalysisReportSchema.parse(report)).toEqual(report);
    expect(report.session.id).toBe(verticalAttempt!.session.id);
    expect(report.session.title).toBe('Vertical sequence repeat');
    expect(report.engine.processedFrames).toBe(verticalAttempt!.frames.length);
  });

  it('supports stricter thresholds without changing the public report contract', async () => {
    const report = await localMovementAnalyzer.analyze({
      frames: samplePoseFrames,
      session: sampleSession,
      thresholds: {
        footCutVelocity: 0.5,
        hipDrift: 0.2,
        lockOffAngle: 80,
        pauseVelocity: 0.001,
      },
    });

    expect(LocalAnalysisReportSchema.parse(report)).toEqual(report);
    expect(report.metrics).toHaveLength(5);
  });

  it('flags low-confidence analysis when landmark visibility is poor', async () => {
    const lowVisibilityFrames = samplePoseFrames.map((frame) => ({
      ...frame,
      landmarks: frame.landmarks.map((landmark) => ({
        ...landmark,
        visibility: landmark.name.includes('Ankle') || landmark.name.includes('Wrist') ? 0.18 : 0.42,
      })),
    }));

    const report = await localMovementAnalyzer.analyze({
      frames: lowVisibilityFrames,
      session: sampleSession,
    });

    expect(LocalAnalysisReportSchema.parse(report)).toEqual(report);
    expect(report.analysisQuality.score).toBeLessThan(85);
    expect(report.analysisQuality.averageVisibility).toBeLessThan(0.5);
    expect(report.analysisQuality.warnings).toContain(
      'Pose visibility is low; improve lighting and avoid occluding hands or feet.',
    );
  });
});

describe('on-device provider pipeline', () => {
  it('uses the local fixture provider without uploading video', async () => {
    const pipeline = new OnDeviceMovementPipeline({
      poseEstimator: createPoseEstimator('local-fixture'),
    });

    expect(await pipeline.canAnalyzeLocally()).toBe(true);

    const report = await pipeline.analyze(sampleVideoAsset, sampleSession);
    expect(report.engine.provider).toBe('local-fixture');
    expect(report.engine.uploadsVideo).toBe(false);
    expect(report.privacy.videoLeavesDevice).toBe(false);
  });

  it('keeps native providers explicit until a custom native bridge is installed', async () => {
    const estimator = createPoseEstimator('native-mediapipe');

    expect(await estimator.isAvailable()).toBe(false);
    await expect(estimator.estimate(sampleVideoAsset)).rejects.toThrow('reserved for a future native adapter');
  });

  it('exposes the native platform pose provider for custom development builds', async () => {
    const estimator = createPoseEstimator('native-platform-pose');

    expect(await estimator.isAvailable()).toBe(false);
    await expect(estimator.estimate(sampleVideoAsset)).rejects.toThrow('MoveBetaPose native module');
  });
});
