import { describe, expect, it } from 'vitest';

import { buildEvidenceCollectionPlan } from '../src/core/evidenceCollectionPlan';
import {
  assertValidationCollectionPacketIsShareSafe,
  buildValidationCollectionPacket,
  validationCollectionPacketSchemaVersion,
  ValidationCollectionPacketSchema,
} from '../src/core/validationCollectionPacket';
import { defaultCueValidationStudyAcceptance } from '../src/movement/cueValidationStudy';

describe('validation collection packet', () => {
  it('builds a versioned share-safe packet from the evidence collection plan', () => {
    const packet = buildValidationCollectionPacket({
      generatedAt: '2026-06-20T18:00:00.000Z',
    });

    expect(ValidationCollectionPacketSchema.parse(packet)).toEqual(packet);
    expect(packet.schemaVersion).toBe(validationCollectionPacketSchemaVersion);
    expect(packet.generatedAt).toBe('2026-06-20T18:00:00.000Z');
    expect(packet.summary).toMatchObject({
      batchCount: 3,
      estimatedReviewRows: 40,
      reviewerSlotCount: 6,
      status: 'needs-real-world-evidence',
      targetClipCount: 20,
    });
    expect(packet.batches.map((batch) => [batch.wallAngle, batch.targetClipCount, batch.estimatedReviewRows])).toEqual([
      ['slab', 7, 14],
      ['vertical', 7, 14],
      ['overhang', 6, 12],
    ]);
    expect(packet.reviewerRosterTemplate.every((slot) => slot.reviewerId === null)).toBe(true);
    expect(packet.privacy).toEqual({
      credentialValuesIncluded: false,
      localPathsIncluded: false,
      rawArtifactsIncluded: false,
      rawVideoIncluded: false,
      reviewerIdentitiesIncluded: false,
    });
    expect(JSON.stringify(packet)).not.toMatch(/file:\/\/|content:\/\/|ph:\/\/|\/Users\/|ghp_|pat_|BEGIN PRIVATE KEY/i);
  });

  it('derives batch and reviewer slots from replaceable acceptance thresholds', () => {
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
    const packet = buildValidationCollectionPacket({
      generatedAt: '2026-06-20T18:05:00.000Z',
      plan,
    });

    expect(packet.summary).toMatchObject({
      batchCount: 2,
      estimatedReviewRows: 30,
      reviewerSlotCount: 6,
      targetClipCount: 5,
    });
    expect(packet.batches.map((batch) => [batch.wallAngle, batch.targetClipCount, batch.estimatedReviewRows])).toEqual([
      ['vertical', 3, 18],
      ['overhang', 2, 12],
    ]);
    expect(packet.reviewerRosterTemplate.map((slot) => slot.slotId)).toEqual([
      'vertical-coach-slot-1',
      'vertical-coach-slot-2',
      'vertical-coach-slot-3',
      'overhang-coach-slot-1',
      'overhang-coach-slot-2',
      'overhang-coach-slot-3',
    ]);
  });

  it('rejects injected credential values or local paths before sharing', () => {
    const packet = buildValidationCollectionPacket({
      generatedAt: '2026-06-20T18:10:00.000Z',
    });
    const unsafe = {
      ...packet,
      batches: [
        {
          ...packet.batches[0],
          collectionSteps: ['Open file:///private/video.mov with token ghp_1234567890abcdefTOKENVALUE'],
        },
      ],
    };

    expect(() => assertValidationCollectionPacketIsShareSafe(unsafe)).toThrow('Validation collection packet contains credential');
  });
});
