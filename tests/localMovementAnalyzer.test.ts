import { describe, expect, it } from 'vitest';

import { LocalAnalysisReportSchema, PoseFrameSchema } from '../src/movement/contracts';
import { localMovementAnalyzer } from '../src/movement/localAnalyzer';
import { OnDeviceMovementPipeline, createPoseEstimator } from '../src/movement/onDevicePipeline';
import { analyzeDemoAttempt, analyzeSampleSession, listDemoAttempts, listReports } from '../src/movement/repository';
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
    expect(report.engine.coachLens.key).toBe('balanced');
    expect(report.privacy.videoLeavesDevice).toBe(false);
    expect(report.engine.processedFrames).toBe(samplePoseFrames.length);
    expect(report.analysisQuality.score).toBeGreaterThanOrEqual(95);
    expect(report.analysisQuality.warnings).toEqual([]);
    expect(report.analysisEvidence.schemaVersion).toBe('movebeta.analysis-evidence.v1');
    expect(report.analysisEvidence.steps.map((step) => step.id)).toContain('privacy-boundary');
    expect(report.analysisEvidence.steps.find((step) => step.id === 'privacy-boundary')?.status).toBe('pass');
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

  it('keeps demo analysis transient instead of adding fixtures to local history', async () => {
    const before = await listReports();
    await analyzeDemoAttempt(sampleAttempts[1].session.id);
    const after = await listReports();

    expect(after).toEqual(before);
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

  it('applies the selected coach lens to thresholds, metadata, and cue ordering', async () => {
    const balancedReport = await localMovementAnalyzer.analyze({
      frames: samplePoseFrames,
      session: sampleSession,
    });
    const footworkReport = await localMovementAnalyzer.analyze({
      coachLens: 'footwork',
      frames: samplePoseFrames,
      session: sampleSession,
    });
    const balancedFootCuts = balancedReport.metrics.find((metric) => metric.id === 'foot-cuts');
    const footworkFootCuts = footworkReport.metrics.find((metric) => metric.id === 'foot-cuts');

    expect(LocalAnalysisReportSchema.parse(footworkReport)).toEqual(footworkReport);
    expect(footworkReport.engine.coachLens.key).toBe('footwork');
    expect(footworkReport.engine.coachLens.label).toBe('Footwork');
    expect(footworkReport.cues[0].id).toBe('cue-foot-cut');
    expect(footworkFootCuts?.score).toBeLessThan(balancedFootCuts?.score ?? 0);
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

  it('does not let a low-confidence ankle create a foot-cut cue', async () => {
    const unreliableAnkleFrames = samplePoseFrames.map((frame, index) => ({
      ...frame,
      landmarks: frame.landmarks.map((landmark) =>
        landmark.name === 'leftAnkle'
          ? {
              ...landmark,
              visibility: 0.01,
              x: index % 2 === 0 ? 0.05 : 0.95,
            }
          : landmark,
      ),
    }));

    const report = await localMovementAnalyzer.analyze({
      frames: unreliableAnkleFrames,
      session: sampleSession,
    });
    const footMetric = report.metrics.find((metric) => metric.id === 'foot-cuts');

    expect(footMetric?.status).toBe('insufficient-data');
    expect(report.cues.map((cue) => cue.id)).not.toContain('cue-foot-cut');
    expect(report.analysisQuality.warnings.join(' ')).toContain('leftAnkle');
    expect(report.analysisQuality.score).toBeLessThan(95);
  });

  it('keeps geometry invariant across source aspect ratio and athlete scale', async () => {
    const canonicalLongSide = 800;
    const dimensions = [
      { height: 1920, width: 1080 },
      { height: 1080, width: 1920 },
    ] as const;
    const reports = await Promise.all(
      dimensions.map((video) =>
        localMovementAnalyzer.analyze({
          frames: samplePoseFrames.map((frame) => ({
            ...frame,
            landmarks: frame.landmarks.map((landmark) => ({
              ...landmark,
              x: (landmark.x * canonicalLongSide) / video.width,
              y: (landmark.y * canonicalLongSide) / video.height,
            })),
          })),
          session: sampleSession,
          video,
        }),
      ),
    );

    expect(reports[1].metrics).toEqual(reports[0].metrics);
    expect(reports[1].cues).toEqual(reports[0].cues);
  });

  it('marks timing metrics unavailable instead of claiming clean movement from sparse samples', async () => {
    const report = await localMovementAnalyzer.analyze({
      frames: samplePoseFrames,
      sample: {
        durationMs: 45_000,
        expectedFrameCount: samplePoseFrames.length,
        referenceIntervalMs: 350,
        samplingIntervalMs: 950,
      },
      session: sampleSession,
    });

    expect(report.metrics.find((metric) => metric.id === 'flow')?.status).toBe('insufficient-data');
    expect(report.metrics.find((metric) => metric.id === 'foot-cuts')?.status).toBe('insufficient-data');
    expect(report.analysisQuality.warnings.join(' ')).toContain('temporal sampling was too sparse');
    expect(report.timeline.map((event) => event.label)).not.toContain('Clean movement window');
  });

  it('locates the lock-off cue at the detected event instead of a fixed clip percentage', async () => {
    const eventStartIndex = 24;
    const lockOffFrames = samplePoseFrames.map((frame, index) => ({
      ...frame,
      landmarks: frame.landmarks.map((landmark) => {
        const leftSide = landmark.name.startsWith('left');
        if (landmark.name.endsWith('Shoulder')) return { ...landmark, x: leftSide ? 0.3 : 0.7, y: 0.3 };
        if (landmark.name.endsWith('Elbow')) return { ...landmark, x: leftSide ? 0.3 : 0.7, y: 0.45 };
        if (landmark.name.endsWith('Wrist')) {
          return {
            ...landmark,
            x: index >= eventStartIndex ? (leftSide ? 0.42 : 0.58) : leftSide ? 0.3 : 0.7,
            y: index >= eventStartIndex ? 0.45 : 0.6,
          };
        }
        return landmark;
      }),
    }));

    const report = await localMovementAnalyzer.analyze({ frames: lockOffFrames, session: sampleSession });

    expect(report.cues.find((cue) => cue.id === 'cue-lockoff')?.timestampMs).toBe(
      lockOffFrames[eventStartIndex].timestampMs,
    );
  });

  it('derives temporal metrics from pose timestamps instead of the source session duration', async () => {
    const shortSession = { ...sampleSession, durationMs: 6_200 };
    const longSourceSession = { ...sampleSession, durationMs: 90_000 };

    const shortReport = await localMovementAnalyzer.analyze({ frames: samplePoseFrames, session: shortSession });
    const longSourceReport = await localMovementAnalyzer.analyze({ frames: samplePoseFrames, session: longSourceSession });

    expect(longSourceReport.metrics).toEqual(shortReport.metrics);
    expect(longSourceReport.cues).toEqual(shortReport.cues);
    expect(longSourceReport.analysisQuality).toEqual(shortReport.analysisQuality);
  });

  it('rejects unordered timestamps before calculating velocities', async () => {
    const unorderedFrames = samplePoseFrames.map((frame, index) =>
      index === 2 ? { ...frame, timestampMs: samplePoseFrames[1].timestampMs } : frame,
    );

    await expect(localMovementAnalyzer.analyze({ frames: unorderedFrames, session: sampleSession })).rejects.toThrow(
      'Pose frame timestamps must be strictly increasing.',
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
