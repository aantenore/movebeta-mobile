import { describe, expect, it } from 'vitest';

import { PrivacyConsentSchema } from '../src/core/privacy';
import { buildCoachReviewPacket } from '../src/movement/coachReviewPacket';
import { scoreCueValidation, type CueValidationReview } from '../src/movement/cueValidation';
import { localMovementAnalyzer } from '../src/movement/localAnalyzer';
import { samplePoseFrames, sampleSession } from '../src/movement/sampleSession';

async function buildPacket() {
  const report = await localMovementAnalyzer.analyze({
    frames: samplePoseFrames,
    session: sampleSession,
  });

  return buildCoachReviewPacket(report, {
    consent: PrivacyConsentSchema.parse({ coachReview: true, cueValidation: true }),
    createdAt: '2026-06-19T12:10:00+02:00',
  });
}

function reviewFor(cueId: string, overrides: Partial<CueValidationReview> = {}): CueValidationReview {
  return {
    cueId,
    drillFit: 5,
    relevance: 5,
    reviewerRole: 'coach',
    safetyLanguage: 5,
    timingAccuracy: 5,
    ...overrides,
  };
}

describe('cue validation scoring', () => {
  it('passes when every cue receives strong coach review scores', async () => {
    const packet = await buildPacket();
    const reviews = packet.analysis.cues.map((cue) => reviewFor(cue.id));
    const result = scoreCueValidation(packet, reviews);

    expect(result.acceptance).toBe('pass');
    expect(result.averageScore).toBe(5);
    expect(result.reviewedCueCount).toBe(packet.analysis.cues.length);
    expect(result.failingCueIds).toEqual([]);
    expect(result.unreviewedCueIds).toEqual([]);
  });

  it('requires review when a cue fails usefulness or safety language thresholds', async () => {
    const packet = await buildPacket();
    const reviews = packet.analysis.cues.map((cue, index) =>
      reviewFor(cue.id, index === 0 ? { relevance: 2, safetyLanguage: 3 } : {}),
    );
    const result = scoreCueValidation(packet, reviews);

    expect(result.acceptance).toBe('needs-review');
    expect(result.failingCueIds).toEqual([packet.analysis.cues[0].id]);
  });

  it('reports insufficient data when cues are not reviewed', async () => {
    const packet = await buildPacket();
    const result = scoreCueValidation(packet, [reviewFor(packet.analysis.cues[0].id)]);

    expect(result.acceptance).toBe('insufficient-data');
    expect(result.unreviewedCueIds.length).toBe(packet.analysis.cues.length - 1);
  });
});
