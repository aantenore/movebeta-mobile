import { describe, expect, it } from 'vitest';

import { buildEvidenceCollectionPlan } from '../src/core/evidenceCollectionPlan';
import {
  assertValidationPilotKitIsShareSafe,
  buildValidationPilotKit,
  validationPilotKitSchemaVersion,
  ValidationPilotKitSchema,
  type ValidationPilotKit,
} from '../src/core/validationPilotKit';
import { defaultCueValidationStudyAcceptance } from '../src/movement/cueValidationStudy';

describe('validation pilot kit', () => {
  it('builds a share-safe pilot protocol from the default evidence collection plan', () => {
    const kit = buildValidationPilotKit({
      generatedAt: '2026-06-20T19:00:00.000Z',
    });

    expect(ValidationPilotKitSchema.parse(kit)).toEqual(kit);
    expect(kit.schemaVersion).toBe(validationPilotKitSchemaVersion);
    expect(kit.summary).toMatchObject({
      coachReviewRows: 40,
      pilotSprintCount: 3,
      status: 'ready-to-run-pilot',
      targetClips: 20,
    });
    expect(kit.sprints.map((sprint) => [sprint.wallAngle, sprint.targetClips, sprint.coachReviewRows])).toEqual([
      ['slab', 7, 14],
      ['vertical', 7, 14],
      ['overhang', 6, 12],
    ]);
    expect(kit.protocol.consentPrinciples.join(' ')).toContain('explicitly consent');
    expect(kit.commands.map((command) => command.command)).toContain('npm run validation:cue:doctor');
    expect(kit.privacy).toEqual({
      athleteIdentitiesIncluded: false,
      coachIdentitiesIncluded: false,
      credentialValuesIncluded: false,
      localPathsIncluded: false,
      rawArtifactsIncluded: false,
      rawVideoIncluded: false,
      reviewerScoresInvented: false,
      videoLeavesDevice: false,
    });
    expect(JSON.stringify(kit)).not.toMatch(/file:\/\/|content:\/\/|ph:\/\/|\/Users\/|ghp_|pat_|BEGIN PRIVATE KEY|reviewerId/i);
  });

  it('derives pilot sprint counts from replaceable acceptance thresholds', () => {
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
    const kit = buildValidationPilotKit({
      generatedAt: '2026-06-20T19:05:00.000Z',
      plan,
    });

    expect(kit.summary).toMatchObject({
      coachReviewRows: 30,
      pilotSprintCount: 2,
      targetClips: 5,
    });
    expect(kit.sprints.map((sprint) => [sprint.wallAngle, sprint.targetClips, sprint.coachReviewRows])).toEqual([
      ['vertical', 3, 18],
      ['overhang', 2, 12],
    ]);
  });

  it('rejects injected local paths, raw video references, and token-like values before sharing', () => {
    const kit = buildValidationPilotKit({
      generatedAt: '2026-06-20T19:10:00.000Z',
    });
    const unsafe: ValidationPilotKit = {
      ...kit,
      protocol: {
        ...kit.protocol,
        closeout: ['Open file:///private/video.mov with ghp_1234567890abcdefTOKENVALUE before review.'],
      },
    };

    expect(() => assertValidationPilotKitIsShareSafe(unsafe)).toThrow('Validation pilot kit contains credential');
  });
});
