import { describe, expect, it } from 'vitest';

import { assessVideoIntake, estimateSampledFrameCount, formatVideoDuration, isLocalVideoUri } from '../src/video/videoIntake';

describe('video intake', () => {
  it('accepts local camera clips that can be sampled on-device', () => {
    const assessment = assessVideoIntake({
      capturedAt: '2026-06-19T10:00:00.000Z',
      durationMs: 12_000,
      height: 1920,
      id: 'local-video',
      source: 'camera',
      uri: 'file:///cache/movebeta/local.mov',
      width: 1080,
    });

    expect(assessment.status).toBe('ready');
    expect(assessment.canAnalyze).toBe(true);
    expect(assessment.expectedFrames).toBeGreaterThanOrEqual(10);
    expect(assessment.issues).toEqual([]);
  });

  it('blocks clips that are too short for reliable local analysis', () => {
    const assessment = assessVideoIntake({
      capturedAt: '2026-06-19T10:00:00.000Z',
      durationMs: 900,
      height: 1920,
      id: 'short-video',
      source: 'camera',
      uri: 'file:///cache/movebeta/short.mov',
      width: 1080,
    });

    expect(assessment.status).toBe('blocked');
    expect(assessment.canAnalyze).toBe(false);
    expect(assessment.issues.map((issue) => issue.id)).toContain('too-short');
  });

  it('rejects remote video sources in the default privacy mode', () => {
    const assessment = assessVideoIntake({
      capturedAt: '2026-06-19T10:00:00.000Z',
      durationMs: 10_000,
      height: 1920,
      id: 'remote-video',
      source: 'import',
      uri: 'https://cdn.example.com/private/beta.mov',
      width: 1080,
    });

    expect(assessment.status).toBe('blocked');
    expect(assessment.canAnalyze).toBe(false);
    expect(assessment.issues.map((issue) => issue.id)).toContain('remote-uri');
  });

  it('warns on low-resolution or long clips without blocking analysis', () => {
    const assessment = assessVideoIntake({
      capturedAt: '2026-06-19T10:00:00.000Z',
      durationMs: 80_000,
      height: 480,
      id: 'review-video',
      source: 'import',
      uri: 'ph://library-123',
      width: 270,
    });

    expect(assessment.status).toBe('review');
    expect(assessment.canAnalyze).toBe(true);
    expect(assessment.issues.map((issue) => issue.id)).toEqual(['review-duration', 'low-resolution']);
  });

  it('keeps URI and frame helpers deterministic', () => {
    expect(isLocalVideoUri('blob:http://localhost/video')).toBe(true);
    expect(isLocalVideoUri('http://127.0.0.1:8082/video.mov')).toBe(true);
    expect(isLocalVideoUri('https://example.com/video.mov')).toBe(false);
    expect(estimateSampledFrameCount(12_000)).toBe(35);
    expect(formatVideoDuration(65_400)).toBe('1:05');
  });
});
