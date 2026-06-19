import { describe, expect, it } from 'vitest';

import {
  assertCoachPacketIsPrivacySafe,
  buildCoachReviewPacket,
  CoachReviewPacketSchema,
} from '../src/movement/coachReviewPacket';
import { PrivacyConsentSchema } from '../src/core/privacy';
import { localMovementAnalyzer } from '../src/movement/localAnalyzer';
import { samplePoseFrames, sampleSession } from '../src/movement/sampleSession';

const coachConsent = PrivacyConsentSchema.parse({
  coachReview: true,
  cueValidation: true,
});

async function buildReport() {
  return localMovementAnalyzer.analyze({
    frames: samplePoseFrames,
    session: sampleSession,
  });
}

describe('coach review packet', () => {
  it('builds a schema-valid consented packet without raw video artifacts', async () => {
    const report = await buildReport();
    const packet = buildCoachReviewPacket(report, {
      consent: coachConsent,
      consentGrantedAt: '2026-06-19T11:55:00+02:00',
      createdAt: '2026-06-19T12:00:00+02:00',
    });

    expect(CoachReviewPacketSchema.parse(packet)).toEqual(packet);
    expect(packet.schemaVersion).toBe('movebeta.coach-review.v1');
    expect(packet.reportId).toBe(report.id);
    expect(packet.consent.granted).toBe(true);
    expect(packet.consent.grantedAt).toBe('2026-06-19T11:55:00+02:00');
    expect(packet.consent.rawVideoIncluded).toBe(false);
    expect(packet.consent.videoLeavesDevice).toBe(false);
    expect(packet.analysis.performance.budgetStatus).toBe('not-measured');
    expect(packet.analysis.metrics.length).toBeGreaterThan(0);
    expect(packet.reviewRubric.map((item) => item.id)).toEqual([
      'cue-relevance',
      'timing-accuracy',
      'drill-fit',
      'safety-language',
    ]);
    expect(JSON.stringify(packet)).not.toMatch(/"keyFrame"\s*:/);
    expect(JSON.stringify(packet)).not.toMatch(/"landmarks"\s*:/);
    expect(JSON.stringify(packet)).not.toMatch(/"uri"\s*:/);
    expect(() => assertCoachPacketIsPrivacySafe(packet)).not.toThrow();
  });

  it('rejects packets that contain upload-capable or raw pose artifacts', async () => {
    const report = await buildReport();
    const packet = buildCoachReviewPacket(report, { consent: coachConsent });

    expect(() =>
      assertCoachPacketIsPrivacySafe({
        ...packet,
        analysis: {
          ...packet.analysis,
          engine: {
            ...packet.analysis.engine,
            uploadsVideo: true,
          },
        },
      }),
    ).toThrow('must not include upload-capable');
  });

  it('requires explicit consent before preparing a coach packet', async () => {
    const report = await buildReport();

    expect(() => buildCoachReviewPacket(report)).toThrow('explicit athlete consent');
  });
});
