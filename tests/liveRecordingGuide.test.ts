import { describe, expect, it } from 'vitest';

import { buildLiveRecordingGuide } from '../src/video/liveRecordingGuide';

const readyCalibration = {
  advice: [],
  canRecord: true,
  status: 'ready' as const,
};

describe('live recording guide', () => {
  it('shows setup advice before recording when calibration is review-grade', () => {
    const guide = buildLiveRecordingGuide({
      calibration: {
        advice: ['Use stronger wall contrast before recording.'],
        canRecord: true,
        status: 'review',
      },
      coachLens: 'balanced',
      elapsedMs: 0,
      maxDurationMs: 20_000,
      minimumDurationMs: 5_000,
      recording: false,
    });

    expect(guide.prompt).toMatchObject({
      body: 'Use stronger wall contrast before recording.',
      id: 'setup-review',
      phase: 'setup',
      tone: 'action',
    });
    expect(guide.canStopForAnalysis).toBe(false);
  });

  it('uses coach-lens specific prompts while recording', () => {
    const guide = buildLiveRecordingGuide({
      calibration: readyCalibration,
      coachLens: 'footwork',
      elapsedMs: 4_500,
      maxDurationMs: 20_000,
      minimumDurationMs: 5_000,
      recording: true,
    });

    expect(guide.prompt).toMatchObject({
      id: 'footwork-middle',
      phase: 'middle',
      title: 'Capture foot pressure',
    });
    expect(guide.minimumDurationMet).toBe(false);
    expect(guide.nextMilestoneMs).toBe(5_000);
  });

  it('marks the clip stoppable after the minimum analysis duration', () => {
    const guide = buildLiveRecordingGuide({
      calibration: readyCalibration,
      coachLens: 'power-conservation',
      elapsedMs: 7_000,
      maxDurationMs: 20_000,
      minimumDurationMs: 5_000,
      recording: true,
    });

    expect(guide.canStopForAnalysis).toBe(true);
    expect(guide.minimumDurationMet).toBe(true);
    expect(guide.nextMilestoneMs).toBe(20_000);
    expect(guide.progress).toBe(0.35);
  });

  it('warns near the configured recording limit and clamps elapsed time', () => {
    const guide = buildLiveRecordingGuide({
      calibration: readyCalibration,
      coachLens: 'body-position',
      elapsedMs: 25_000,
      maxDurationMs: 20_000,
      minimumDurationMs: 5_000,
      recording: true,
    });

    expect(guide.elapsedMs).toBe(20_000);
    expect(guide.remainingMs).toBe(0);
    expect(guide.prompt).toMatchObject({
      id: 'near-limit',
      phase: 'near-limit',
      tone: 'warning',
    });
  });
});
