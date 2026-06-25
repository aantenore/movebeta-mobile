import { describe, expect, it } from 'vitest';

import { buildExternalEvidenceIntakeReport, buildExternalEvidenceValidationReport } from '../src/core/externalEvidenceIntake';
import { defaultLaunchReadinessEvidence, type LaunchReadinessEvidence } from '../src/core/launchReadiness';
import {
  ReleaseBlockerProgressSchema,
  assertReleaseBlockerProgressIsShareSafe,
  buildReleaseBlockerProgress,
  releaseBlockerProgressSchemaVersion,
  type ReleaseBlockerProgress,
} from '../src/core/releaseBlockerProgress';
import { buildReleaseCriticalPath } from '../src/core/releaseCriticalPath';
import { buildReleaseUnblockChecklist } from '../src/core/releaseUnblockChecklist';

function referenceFor(type: string) {
  if (type === 'issue-url') return 'https://github.com/aantenore/movebeta-mobile/issues/123';
  if (type === 'ci-run-url') return 'https://github.com/aantenore/movebeta-mobile/actions/runs/123456';
  if (type === 'store-console-state') return 'App Store Connect ready for submit profile';
  if (type === 'report-id') return 'release-proof:accepted';
  return 'docs/sdlc/accepted-proof.json';
}

function buildProgress(evidence: LaunchReadinessEvidence = defaultLaunchReadinessEvidence, withAcceptedProofs = false) {
  const checklist = buildReleaseUnblockChecklist(evidence);
  const criticalPath = buildReleaseCriticalPath({
    checklist,
    evidence,
    generatedAt: '2026-06-25T13:00:00.000Z',
  });
  const intakeReport = buildExternalEvidenceIntakeReport({
    checklist,
    evidence,
    generatedAt: '2026-06-25T13:00:00.000Z',
  });
  const validationReport = withAcceptedProofs
    ? buildExternalEvidenceValidationReport({
        generatedAt: '2026-06-25T13:00:00.000Z',
        input: {
          ...intakeReport.intakeTemplate,
          items: intakeReport.intakeTemplate.items.map((item) => ({
            ...item,
            proof: item.proof.map((proof) => {
              const evidenceReferenceType = proof.acceptedReferenceTypes[0];

              return {
                ...proof,
                evidenceReference: referenceFor(evidenceReferenceType),
                evidenceReferenceType,
                notes: 'Accepted share-safe reference.',
                status: 'provided' as const,
              };
            }),
          })),
          schemaVersion: 'movebeta.external-evidence-filled-intake.v1' as const,
        },
      })
    : undefined;

  return buildReleaseBlockerProgress({
    checklist,
    criticalPath,
    generatedAt: '2026-06-25T13:00:00.000Z',
    intakeReport,
    validationReport,
  });
}

describe('release blocker progress', () => {
  it('aggregates external blocker dependencies, commands, and missing proof counts', () => {
    const progress = buildProgress();

    expect(ReleaseBlockerProgressSchema.parse(progress)).toEqual(progress);
    expect(progress.schemaVersion).toBe(releaseBlockerProgressSchemaVersion);
    expect(progress.summary).toMatchObject({
      acceptedProofCount: 0,
      blockerCount: 5,
      commandCount: 17,
      dependencyBlockedCount: 2,
      missingProofCount: 8,
      needsProofCount: 3,
      proofReadyCount: 0,
      status: 'needs-external-evidence',
    });
    expect(progress.items.map((item) => [item.key, item.status, item.missingProofCount, item.blockedBy])).toEqual([
      ['nativeDeviceQa', 'blocked-by-dependency', 1, ['iosBuild']],
      ['iosBuild', 'needs-proof', 2, []],
      ['cueValidationDataset', 'needs-proof', 2, []],
      ['easProject', 'needs-proof', 1, []],
      ['easCredentials', 'blocked-by-dependency', 2, ['easProject']],
    ]);
    expect(progress.items.find((item) => item.key === 'iosBuild')?.currentCommand).toBe('npm run toolchain:ios');
    expect(JSON.stringify(progress)).not.toMatch(/file:\/\/|\/Users\/|ghp_|BEGIN PRIVATE KEY|rawVideoUri/i);
  });

  it('marks remaining blockers proof-ready when dependencies and proof references are accepted', () => {
    const evidence: LaunchReadinessEvidence = {
      ...defaultLaunchReadinessEvidence,
      easProject: true,
      iosBuild: true,
    };
    const progress = buildProgress(evidence, true);

    expect(progress.summary).toMatchObject({
      dependencyBlockedCount: 0,
      missingProofCount: 0,
      proofReadyCount: 3,
      status: 'ready',
    });
    expect(progress.items.map((item) => [item.key, item.status])).toEqual([
      ['nativeDeviceQa', 'proof-ready'],
      ['cueValidationDataset', 'proof-ready'],
      ['easCredentials', 'proof-ready'],
    ]);
    expect(progress.summary.nextAction).toContain('rerun release readiness');
  });

  it('rejects unsafe local artifacts, raw video references, credentials, and token-like values', () => {
    const progress = buildProgress();
    const unsafe: ReleaseBlockerProgress = {
      ...progress,
      items: [
        ...progress.items,
        {
          ...progress.items[0],
          action: 'Open /Users/antonio/raw-video.mp4 with ghp_1234567890abcdefTOKEN.',
          key: 'cueValidationDataset',
          proof: [
            {
              acceptedReferenceTypes: ['relative-path'],
              expectedProof: 'file:///Users/antonio/raw-video.mp4',
              status: 'missing',
            },
          ],
        },
      ],
    };

    expect(() => assertReleaseBlockerProgressIsShareSafe(unsafe)).toThrow('Release blocker progress contains credential');
  });
});
