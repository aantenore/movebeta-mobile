import { describe, expect, it } from 'vitest';

import { buildEvidenceCollectionPlan } from '../src/core/evidenceCollectionPlan';
import {
  assertFieldValidationOpsPacketIsShareSafe,
  buildFieldValidationOpsPacket,
  fieldValidationOpsPacketSchemaVersion,
  FieldValidationOpsPacketSchema,
  type FieldValidationOpsPacket,
} from '../src/core/fieldValidationOpsPacket';
import { buildReleaseUnblockChecklist } from '../src/core/releaseUnblockChecklist';
import { buildValidationPilotKit } from '../src/core/validationPilotKit';
import { defaultCueValidationStudyAcceptance } from '../src/movement/cueValidationStudy';

function buildPacket(plan = buildEvidenceCollectionPlan()) {
  return buildFieldValidationOpsPacket({
    evidencePlan: plan,
    generatedAt: '2026-06-20T21:00:00.000Z',
    releaseUnblockChecklist: buildReleaseUnblockChecklist(),
    validationPilotKit: buildValidationPilotKit({ generatedAt: '2026-06-20T21:00:00.000Z', plan }),
  });
}

describe('field validation ops packet', () => {
  it('coordinates real evidence collection without embedding raw artifacts or identities', () => {
    const packet = buildPacket();

    expect(FieldValidationOpsPacketSchema.parse(packet)).toEqual(packet);
    expect(packet.schemaVersion).toBe(fieldValidationOpsPacketSchemaVersion);
    expect(packet.summary).toMatchObject({
      blockerCount: 5,
      coachReviewRows: 40,
      deviceRuns: 2,
      ownerCount: 3,
      phaseCount: 4,
      status: 'ready-to-coordinate',
      targetClips: 20,
    });
    expect(packet.phases.map((phase) => phase.key)).toEqual(['prepare', 'collect', 'validate', 'promote']);
    expect(packet.phases.find((phase) => phase.key === 'collect')?.acceptance.join(' ')).toContain('20 consented clips');
    expect(packet.phases.find((phase) => phase.key === 'validate')?.commands.map((command) => command.command)).toContain(
      'npm run validation:cue && npm run validation:cue:doctor',
    );
    expect(packet.privacy).toEqual({
      athleteIdentitiesIncluded: false,
      coachIdentitiesIncluded: false,
      credentialValuesIncluded: false,
      localPathsIncluded: false,
      rawArtifactsIncluded: false,
      rawVideoIncluded: false,
      reviewerScoresInvented: false,
      videoLeavesDevice: false,
    });
    expect(JSON.stringify(packet)).not.toMatch(/file:\/\/|content:\/\/|\/Users\/|rawVideoUri|videoUri|ghp_|pat_|reviewerId/i);
  });

  it('derives clip and review targets from replaceable evidence thresholds', () => {
    const plan = buildEvidenceCollectionPlan({
      averageCuesPerClip: 2,
      cueAcceptance: {
        ...defaultCueValidationStudyAcceptance,
        minClips: 6,
        minDistinctReviewersPerClip: 3,
        minReviewsPerCue: 1,
        requiredWallAngles: ['vertical', 'overhang'],
      },
    });
    const packet = buildPacket(plan);

    expect(packet.summary).toMatchObject({
      coachReviewRows: 36,
      targetClips: 6,
    });
    expect(packet.phases.find((phase) => phase.key === 'collect')?.acceptance.join(' ')).toContain('6 consented clips');
    expect(packet.phases.find((phase) => phase.key === 'collect')?.acceptance.join(' ')).toContain('36 real coach review rows');
  });

  it('rejects local paths, raw video references, credentials, and token-like values before sharing', () => {
    const packet = buildPacket();
    const unsafe: FieldValidationOpsPacket = {
      ...packet,
      phases: [
        ...packet.phases,
        {
          acceptance: ['Upload file:///Users/antonio/private-video.mov with ghp_1234567890abcdefTOKENVALUE.'],
          commands: [
            {
              command: 'open /Users/antonio/private-video.mov',
              key: 'unsafe',
              label: 'Unsafe',
              owner: 'product',
              purpose: 'Leaked local path.',
            },
          ],
          duration: 'Never',
          key: 'collect',
          label: 'Unsafe phase',
          owner: 'product',
          outputs: [
            {
              key: 'unsafe-video',
              label: 'Unsafe video',
              path: 'file:///Users/antonio/private-video.mov',
              requiredFor: ['store-submission'],
            },
          ],
          status: 'needs-real-world-input',
        },
      ],
    };

    expect(() => assertFieldValidationOpsPacketIsShareSafe(unsafe)).toThrow('Field validation ops packet contains credential');
  });
});
