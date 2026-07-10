import { describe, expect, it } from 'vitest';

import {
  activeVideoAnalysisDurationMs,
  buildVideoAnalysisWindow,
  formatVideoAnalysisWindow,
  resolveVideoAnalysisSamplingPlan,
  withVideoAnalysisWindow,
} from '../src/video/analysisWindow';

const baseVideo = {
  capturedAt: '2026-06-23T10:00:00.000Z',
  durationMs: 80_000,
  height: 1920,
  id: 'long-clip',
  source: 'import' as const,
  uri: 'ph://library-long-clip',
  width: 1080,
};

describe('analysis window', () => {
  it('keeps short clips on the full source duration', () => {
    const window = buildVideoAnalysisWindow({ ...baseVideo, durationMs: 12_000 }, 'middle');

    expect(window).toMatchObject({
      durationMs: 12_000,
      endMs: 12_000,
      mode: 'full',
      startMs: 0,
    });
    expect(formatVideoAnalysisWindow(window)).toBe('Full clip · 0:12');
  });

  it('builds deterministic early, middle, and late windows for long clips', () => {
    expect(buildVideoAnalysisWindow(baseVideo, 'early')).toMatchObject({
      durationMs: 45_000,
      endMs: 45_000,
      mode: 'early',
      startMs: 0,
    });
    expect(buildVideoAnalysisWindow(baseVideo, 'middle')).toMatchObject({
      durationMs: 45_000,
      endMs: 62_500,
      mode: 'middle',
      startMs: 17_500,
    });
    expect(buildVideoAnalysisWindow(baseVideo, 'late')).toMatchObject({
      durationMs: 45_000,
      endMs: 80_000,
      mode: 'late',
      startMs: 35_000,
    });
  });

  it('attaches active windows without changing source duration or raw URI', () => {
    const windowed = withVideoAnalysisWindow(baseVideo, 'late');

    expect(windowed.durationMs).toBe(80_000);
    expect(windowed.uri).toBe(baseVideo.uri);
    expect(windowed.analysisWindow).toMatchObject({
      durationMs: 45_000,
      mode: 'late',
    });
    expect(activeVideoAnalysisDurationMs(windowed)).toBe(45_000);
  });

  it('omits the optional window when full-clip analysis is selected', () => {
    const windowed = withVideoAnalysisWindow(baseVideo, 'full');

    expect(windowed.analysisWindow).toBeUndefined();
    expect(activeVideoAnalysisDurationMs(windowed)).toBe(80_000);
  });

  it('caps the expected sample count for long analysis windows', () => {
    expect(resolveVideoAnalysisSamplingPlan(withVideoAnalysisWindow(baseVideo, 'middle'))).toMatchObject({
      durationMs: 45_000,
      expectedFrameCount: 96,
      referenceIntervalMs: 350,
      samplingIntervalMs: 45_000 / 95,
    });
  });
});
