import { describe, expect, it } from 'vitest';

import { buildEvidenceCollectionPlan } from '../src/core/evidenceCollectionPlan';
import {
  assertValidationConsentPacketIsShareSafe,
  buildValidationConsentPacket,
  formatValidationConsentPacketSummary,
  validationConsentPacketSchemaVersion,
  ValidationConsentPacketSchema,
  type ValidationConsentPacket,
} from '../src/core/validationConsentPacket';
import { defaultCueValidationStudyAcceptance } from '../src/movement/cueValidationStudy';

describe('validation consent packet', () => {
  it('builds a versioned share-safe consent packet for validation capture', () => {
    const packet = buildValidationConsentPacket({
      generatedAt: '2026-06-22T17:10:00.000Z',
    });

    expect(ValidationConsentPacketSchema.parse(packet)).toEqual(packet);
    expect(packet.schemaVersion).toBe(validationConsentPacketSchemaVersion);
    expect(packet.generatedAt).toBe('2026-06-22T17:10:00.000Z');
    expect(packet.summary).toMatchObject({
      batchCount: 3,
      consentStepCount: 4,
      status: 'ready-for-consent-run',
      targetClipCount: 20,
    });
    expect(packet.captureBatches.map((batch) => [batch.wallAngle, batch.targetClipCount])).toEqual([
      ['slab', 7],
      ['vertical', 7],
      ['overhang', 6],
    ]);
    expect(packet.captureBatches.every((batch) => batch.requiredMetadata.some((field) => field.key === 'consentStatus'))).toBe(true);
    expect(packet.consentProtocol.athleteScript).toContain('raw video on this device');
    expect(packet.privacy).toEqual({
      athleteIdentitiesIncluded: false,
      bystanderIdentitiesIncluded: false,
      coachIdentitiesIncluded: false,
      credentialValuesIncluded: false,
      localPathsIncluded: false,
      rawArtifactsIncluded: false,
      rawVideoIncluded: false,
      reviewerScoresInvented: false,
      tokenLikeValuesIncluded: false,
      videoUriIncluded: false,
    });
    expect(formatValidationConsentPacketSummary(packet)).toContain('Validation consent:');
    expect(JSON.stringify(packet)).not.toMatch(/file:\/\/|content:\/\/|ph:\/\/|\/Users\/|ghp_|pat_|BEGIN PRIVATE KEY|"athleteId"\s*:|rawVideoUri/i);
  });

  it('derives batch counts from replaceable evidence thresholds', () => {
    const plan = buildEvidenceCollectionPlan({
      averageCuesPerClip: 2,
      cueAcceptance: {
        ...defaultCueValidationStudyAcceptance,
        minClips: 5,
        minDistinctReviewersPerClip: 3,
        minReviewsPerCue: 1,
        requiredWallAngles: ['vertical', 'overhang'],
      },
    });
    const packet = buildValidationConsentPacket({
      generatedAt: '2026-06-22T17:15:00.000Z',
      plan,
    });

    expect(packet.summary).toMatchObject({
      batchCount: 2,
      targetClipCount: 5,
    });
    expect(packet.captureBatches.map((batch) => [batch.wallAngle, batch.targetClipCount])).toEqual([
      ['vertical', 3],
      ['overhang', 2],
    ]);
  });

  it('rejects identity values, raw artifact references, local paths, and token-like values before sharing', () => {
    const packet = buildValidationConsentPacket({
      generatedAt: '2026-06-22T17:20:00.000Z',
    });
    const unsafe: ValidationConsentPacket = {
      ...packet,
      consentProtocol: {
        ...packet.consentProtocol,
        athleteScript: 'Send athleteId 123 with file:///private/raw.mov and ghp_1234567890abcdefTOKENVALUE.',
      },
    };

    expect(() => assertValidationConsentPacketIsShareSafe(unsafe)).toThrow('Validation consent packet contains identity');
  });
});
