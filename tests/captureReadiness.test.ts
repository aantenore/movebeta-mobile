import { describe, expect, it } from 'vitest';

import { assessCaptureReadiness } from '../src/movement/captureReadiness';
import type { AnalysisQuality } from '../src/movement/contracts';

function quality(overrides: Partial<AnalysisQuality>): AnalysisQuality {
  return {
    averageVisibility: 0.96,
    frameCoverage: 1,
    landmarkCoverage: 1,
    score: 98,
    warnings: [],
    ...overrides,
  };
}

describe('capture readiness', () => {
  it('accepts high-quality clips as coaching baselines', () => {
    const readiness = assessCaptureReadiness(quality({}));

    expect(readiness.status).toBe('ready');
    expect(readiness.title).toBe('Ready for coaching');
    expect(readiness.checks.every((check) => check.status === 'pass')).toBe(true);
    expect(readiness.action).toContain('baseline');
  });

  it('keeps borderline clips usable but cautious', () => {
    const readiness = assessCaptureReadiness(
      quality({
        averageVisibility: 0.61,
        frameCoverage: 0.73,
        landmarkCoverage: 0.86,
        score: 76,
      }),
    );

    expect(readiness.status).toBe('review');
    expect(readiness.checks.some((check) => check.status === 'watch')).toBe(true);
    expect(readiness.advice).toContain('Film side-on with hands, hips, knees, and feet visible for the full attempt.');
  });

  it('recommends retakes when signal quality is too weak', () => {
    const readiness = assessCaptureReadiness(
      quality({
        averageVisibility: 0.38,
        frameCoverage: 0.46,
        landmarkCoverage: 0.52,
        score: 49,
      }),
    );

    expect(readiness.status).toBe('retake');
    expect(readiness.action).toBe('Retake before trusting technique cues.');
    expect(readiness.checks.filter((check) => check.status === 'fail')).toHaveLength(3);
  });
});
