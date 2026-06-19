import { describe, expect, it } from 'vitest';

import { LocalAnalysisReportSchema, PoseFrameSchema } from '../src/movement/contracts';
import { createPoseEstimator } from '../src/movement/onDevicePipeline';
import { analyzeVideoAttempt } from '../src/movement/repository';
import { assessVideoIntake } from '../src/video/videoIntake';
import {
  createCameraVideoSource,
  createImportedVideoSource,
  createImportedVideoSourceWithSession,
  updateVideoSourceSession,
} from '../src/video/videoSource';

describe('video source workflow', () => {
  it('normalizes recorded camera videos into climb sessions', () => {
    const source = createCameraVideoSource({
      capturedAt: '2026-06-19T10:00:00.000Z',
      durationMs: 8_450,
      uri: 'file:///cache/movebeta/camera-attempt.mov',
    });

    expect(source.video.source).toBe('camera');
    expect(source.video.durationMs).toBe(8_450);
    expect(source.video.width).toBe(1080);
    expect(source.video.height).toBe(1920);
    expect(source.session.id).toBe(`session-${source.video.id}`);
    expect(source.session.source).toBe('camera');
    expect(assessVideoIntake(source.video).status).toBe('ready');
  });

  it('normalizes imported videos while preserving picker metadata', () => {
    const source = createImportedVideoSource({
      assetId: 'library-123',
      duration: 16_200,
      fileName: 'board-project.mp4',
      height: 1280,
      type: 'video',
      uri: 'ph://library-123',
      width: 720,
    });

    expect(source.video.id).toBe('video-import-library-123');
    expect(source.session.title).toBe('board-project');
    expect(source.label).toContain('16.2s');
  });

  it('applies editable session metadata to recorded and imported videos', () => {
    const cameraSource = createCameraVideoSource({
      capturedAt: '2026-06-19T10:00:00.000Z',
      durationMs: 8_450,
      session: {
        grade: '7a',
        gym: 'MoonBoard Room',
        title: 'Left-hand crux burn',
        wallAngle: 'overhang',
      },
      uri: 'file:///cache/movebeta/camera-attempt.mov',
    });
    const importedSource = createImportedVideoSourceWithSession(
      {
        assetId: 'library-456',
        duration: 18_000,
        fileName: 'ignored-when-title-set.mp4',
        height: 1280,
        type: 'video',
        uri: 'ph://library-456',
        width: 720,
      },
      {
        grade: '6c',
        gym: 'Training wall',
        title: 'Foot swap drill',
        wallAngle: 'vertical',
      },
    );

    expect(cameraSource.session).toMatchObject({
      grade: '7a',
      gym: 'MoonBoard Room',
      title: 'Left-hand crux burn',
      wallAngle: 'overhang',
    });
    expect(importedSource.session).toMatchObject({
      grade: '6c',
      gym: 'Training wall',
      title: 'Foot swap drill',
      wallAngle: 'vertical',
    });
  });

  it('updates selected video session metadata without changing the media asset', () => {
    const source = createCameraVideoSource({
      capturedAt: '2026-06-19T10:00:00.000Z',
      durationMs: 8_450,
      uri: 'file:///cache/movebeta/camera-attempt.mov',
    });

    const updated = updateVideoSourceSession(source, {
      grade: 'Limit boulder',
      gym: 'Spray wall',
      title: 'Third go',
      wallAngle: 'slab',
    });

    expect(updated.video).toEqual(source.video);
    expect(updated.session).toMatchObject({
      grade: 'Limit boulder',
      gym: 'Spray wall',
      title: 'Third go',
      wallAngle: 'slab',
    });
  });

  it('preserves short clip duration so intake can block it before analysis', () => {
    const source = createCameraVideoSource({
      capturedAt: '2026-06-19T10:00:00.000Z',
      durationMs: 700,
      uri: 'file:///cache/movebeta/accidental-tap.mov',
    });

    expect(source.video.durationMs).toBe(700);
    expect(assessVideoIntake(source.video).canAnalyze).toBe(false);
  });

  it('generates deterministic on-device pose frames for local videos', async () => {
    const source = createCameraVideoSource({
      capturedAt: '2026-06-19T10:00:00.000Z',
      durationMs: 9_000,
      uri: 'file:///cache/movebeta/deterministic.mov',
    });
    const estimator = createPoseEstimator('local-video-fallback');

    const frames = await estimator.estimate(source.video);
    const repeatedFrames = await estimator.estimate(source.video);

    expect(await estimator.isAvailable()).toBe(true);
    expect(frames.length).toBeGreaterThanOrEqual(36);
    expect(repeatedFrames).toEqual(frames);
    expect(PoseFrameSchema.parse(frames[0])).toEqual(frames[0]);
  });

  it('keeps the TensorFlow.js MoveNet provider explicit outside browser runtimes', async () => {
    const source = createCameraVideoSource({
      capturedAt: '2026-06-19T10:00:00.000Z',
      durationMs: 9_000,
      uri: 'file:///cache/movebeta/movenet.mov',
    });
    const estimator = createPoseEstimator('web-tfjs-movenet');

    expect(await estimator.isAvailable()).toBe(false);
    await expect(estimator.estimate(source.video)).rejects.toThrow('browser video runtime');
  });

  it('analyzes imported videos without uploading the source asset', async () => {
    const source = createImportedVideoSource({
      duration: 12_500,
      fileName: 'vertical-repeat.mov',
      height: 1920,
      type: 'video',
      uri: 'file:///library/vertical-repeat.mov',
      width: 1080,
    });

    const report = await analyzeVideoAttempt(source.video, source.session);

    expect(LocalAnalysisReportSchema.parse(report)).toEqual(report);
    expect(report.engine.provider).toBe('local-video-fallback');
    expect(report.engine.runsOnDevice).toBe(true);
    expect(report.engine.uploadsVideo).toBe(false);
    expect(report.privacy.videoLeavesDevice).toBe(false);
    expect(report.session.id).toBe(source.session.id);
  });

  it('persists editable session metadata into local analysis reports', async () => {
    const source = createCameraVideoSource({
      capturedAt: '2026-06-19T10:00:00.000Z',
      durationMs: 12_500,
      session: {
        grade: '6b coordination',
        gym: 'Comp wall',
        title: 'Volume sequence',
        wallAngle: 'slab',
      },
      uri: 'file:///library/volume-sequence.mov',
    });

    const report = await analyzeVideoAttempt(source.video, source.session);

    expect(report.session).toMatchObject({
      grade: '6b coordination',
      gym: 'Comp wall',
      title: 'Volume sequence',
      wallAngle: 'slab',
    });
  });
});
