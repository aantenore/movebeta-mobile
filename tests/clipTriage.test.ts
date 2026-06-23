import { describe, expect, it } from 'vitest';

import { buildClipTriagePlan } from '../src/video/clipTriage';

const baseVideo = {
  capturedAt: '2026-06-23T10:00:00.000Z',
  durationMs: 12_000,
  height: 1920,
  id: 'clip',
  source: 'camera' as const,
  uri: 'file:///cache/movebeta/clip.mov',
  width: 1080,
};

describe('clip triage', () => {
  it('recommends direct local analysis for clean clips', () => {
    const triage = buildClipTriagePlan(baseVideo);

    expect(triage.decision).toBe('analyze');
    expect(triage.canAnalyze).toBe(true);
    expect(triage.score).toBe(100);
    expect(triage.reasons).toEqual([]);
    expect(triage.privacyNote).toContain('No upload');
  });

  it('recommends trimming when duration is the main local processing issue', () => {
    const triage = buildClipTriagePlan({
      ...baseVideo,
      durationMs: 80_000,
      source: 'import',
      uri: 'ph://library-clip',
    });

    expect(triage.decision).toBe('trim');
    expect(triage.canAnalyze).toBe(true);
    expect(triage.reasons.map((reason) => reason.id)).toContain('review-duration');
    expect(triage.primaryAction).toContain('Trim');
  });

  it('recommends retaking when capture quality is weak but analysis is still possible', () => {
    const triage = buildClipTriagePlan({
      ...baseVideo,
      height: 480,
      width: 270,
    });

    expect(triage.decision).toBe('retake');
    expect(triage.canAnalyze).toBe(true);
    expect(triage.reasons.map((reason) => reason.id)).toContain('low-resolution');
    expect(triage.secondaryAction).toContain('quick check');
  });

  it('blocks remote sources without leaking the raw URI into the triage packet', () => {
    const triage = buildClipTriagePlan({
      ...baseVideo,
      source: 'import',
      uri: 'https://cdn.example.com/private/attempt.mov',
    });

    expect(triage.decision).toBe('blocked');
    expect(triage.canAnalyze).toBe(false);
    expect(triage.reasons.map((reason) => reason.id)).toContain('remote-uri');
    expect(JSON.stringify(triage)).not.toContain('cdn.example.com');
  });

  it('requires a retake when the clip is too short for model sampling', () => {
    const triage = buildClipTriagePlan({
      ...baseVideo,
      durationMs: 900,
    });

    expect(triage.decision).toBe('retake');
    expect(triage.canAnalyze).toBe(false);
    expect(triage.score).toBe(0);
    expect(triage.primaryAction).toContain('Record');
  });
});
