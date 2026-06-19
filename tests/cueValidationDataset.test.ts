import { describe, expect, it } from 'vitest';

import { validateCueValidationDataset } from '../scripts/cue_validation_dataset_checks.mjs';

function clip(wallAngle: 'slab' | 'vertical' | 'overhang', index: number, overrides: Record<string, unknown> = {}) {
  const cueId = `cue-${index}`;
  return {
    clipId: `clip-${index}`,
    consentRecordId: `consent-${index}`,
    packet: {
      analysis: {
        cues: [
          {
            id: cueId,
            title: `Cue ${index}`,
          },
        ],
      },
      consent: {
        rawVideoIncluded: false,
        videoLeavesDevice: false,
      },
      reportId: `analysis-${index}`,
      session: {
        wallAngle,
      },
    },
    reviews: [
      {
        cueId,
        drillFit: 5,
        relevance: 5,
        reviewMode: 'packet-only',
        reviewerId: `coach-${index}-a`,
        reviewerRole: 'coach',
        safetyLanguage: 5,
        timingAccuracy: 5,
      },
      {
        cueId,
        drillFit: 4,
        relevance: 4,
        reviewMode: 'packet-only',
        reviewerId: `coach-${index}-b`,
        reviewerRole: 'coach',
        safetyLanguage: 5,
        timingAccuracy: 4,
      },
    ],
    ...overrides,
  };
}

describe('cue validation dataset readiness', () => {
  it('passes when consented packets cover required angles, reviewers, modes, and scores', () => {
    const validation = validateCueValidationDataset({
      acceptance: {
        minClips: 3,
        minDistinctReviewersPerClip: 2,
        minReviewsPerCue: 2,
      },
      appVersion: '1.0.0',
      clips: [clip('slab', 1), clip('vertical', 2), clip('overhang', 3)],
      generatedAt: '2026-06-19T00:00:00.000Z',
    });

    expect(validation.ready).toBe(true);
    expect(validation.summary).toMatchObject({
      clipCount: 3,
      cueCount: 3,
      reviewCount: 6,
      wallAngles: ['overhang', 'slab', 'vertical'],
    });
  });

  it('fails when raw artifacts, missing wall angles, or weak scores are present', () => {
    const badClip = clip('vertical', 1, {
      packet: {
        analysis: {
          cues: [{ id: 'cue-1', title: 'Cue 1' }],
        },
        consent: {
          rawVideoIncluded: false,
          videoLeavesDevice: false,
        },
        rawVideoUri: 'file:///private/local-video.mov',
        reportId: 'analysis-1',
        session: {
          wallAngle: 'vertical',
        },
      },
      reviews: [
        {
          cueId: 'cue-1',
          drillFit: 2,
          relevance: 2,
          reviewMode: 'packet-only',
          reviewerId: 'coach-1-a',
          reviewerRole: 'coach',
          safetyLanguage: 3,
          timingAccuracy: 2,
        },
      ],
    });
    const validation = validateCueValidationDataset({
      acceptance: {
        minClips: 3,
        minDistinctReviewersPerClip: 2,
      },
      appVersion: '1.0.0',
      clips: [badClip],
      generatedAt: '2026-06-19T00:00:00.000Z',
    });

    expect(validation.ready).toBe(false);
    expect(validation.checks.filter((check) => check.status === 'fail').map((check) => check.id)).toEqual(
      expect.arrayContaining([
        'dataset-size',
        'wall-angle-slab',
        'wall-angle-overhang',
        'clip-1-raw-artifacts',
        'clip-1-reviewers',
        'clip-1-scores',
        'dataset-average-score',
      ]),
    );
  });

  it('keeps production defaults strict enough for real validation studies', () => {
    const validation = validateCueValidationDataset({
      appVersion: '1.0.0',
      clips: [clip('vertical', 1)],
      generatedAt: '2026-06-19T00:00:00.000Z',
    });

    expect(validation.ready).toBe(false);
    expect(validation.checks.find((check) => check.id === 'dataset-size')?.detail).toContain('20');
  });
});
