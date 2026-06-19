import { describe, expect, it } from 'vitest';

import { buildEvidenceCollectionPlan } from '../src/core/evidenceCollectionPlan';
import { buildLaunchReadinessSummary, defaultLaunchReadinessEvidence, type LaunchReadinessEvidence } from '../src/core/launchReadiness';
import { buildModelEvidenceSummary } from '../src/core/modelEvidence';
import { buildNativeQaRunbookPacket } from '../src/core/nativeQaRunbookPacket';
import { buildProviderReadinessSummary } from '../src/core/providerReadiness';
import {
  assertReleaseEvidencePacketIsShareSafe,
  buildReleaseEvidencePacket,
  releaseEvidencePacketSchemaVersion,
  type ReleaseEvidencePacket,
} from '../src/core/releaseEvidencePacket';
import { buildReleaseUnblockPacket } from '../src/core/releaseUnblockPacket';

function buildPacket(evidence: LaunchReadinessEvidence = defaultLaunchReadinessEvidence) {
  const launchReadiness = buildLaunchReadinessSummary(evidence);
  const releaseUnblockPacket = buildReleaseUnblockPacket({
    evidence,
    generatedAt: '2026-06-20T11:00:00.000Z',
  });

  return buildReleaseEvidencePacket({
    evidenceCollectionPlan: buildEvidenceCollectionPlan(),
    generatedAt: '2026-06-20T11:05:00.000Z',
    launchReadiness,
    modelEvidence: buildModelEvidenceSummary(),
    nativeQaRunbookPacket: buildNativeQaRunbookPacket({ generatedAt: '2026-06-20T11:00:00.000Z' }),
    providerReadiness: buildProviderReadinessSummary({
      nativeVideoAnalysisProvider: 'native-platform-pose',
      privacyMode: 'on-device',
      videoAnalysisProvider: 'web-tfjs-movenet',
    }),
    releaseUnblockPacket,
  });
}

describe('release evidence packet', () => {
  it('aggregates launch, model, provider, native QA, and release blocker evidence', () => {
    const packet = buildPacket();

    expect(packet.schemaVersion).toBe(releaseEvidencePacketSchemaVersion);
    expect(packet.summary).toMatchObject({
      artifactCount: 5,
      blockerCount: 5,
      commandCount: 6,
      externalEvidenceCount: 3,
      readyTracks: 1,
      status: 'needs-external-evidence',
      totalTracks: 3,
    });
    expect(packet.commands.map((command) => command.command)).toContain('npm run native:ios:doctor');
    expect(packet.artifacts.map((artifact) => [artifact.key, artifact.status])).toEqual([
      ['release-gate-report', 'ready'],
      ['ios-toolchain-report', 'blocked'],
      ['native-qa-evidence', 'blocked'],
      ['cue-validation-dataset', 'blocked'],
      ['launch-readiness-report', 'blocked'],
    ]);
    expect(JSON.stringify(packet)).not.toMatch(/rawVideoIncluded":true|\/Users\/|ghp_/i);
  });

  it('marks the packet ready when launch tracks and release blockers are clear', () => {
    const allReadyEvidence = Object.fromEntries(
      Object.keys(defaultLaunchReadinessEvidence).map((key) => [key, true]),
    ) as LaunchReadinessEvidence;
    const packet = buildPacket(allReadyEvidence);

    expect(packet.summary.status).toBe('ready');
    expect(packet.summary.blockerCount).toBe(0);
    expect(packet.artifacts.every((artifact) => artifact.status === 'ready')).toBe(true);
  });

  it('rejects credential values, local paths, and raw artifact references before sharing', () => {
    const packet = buildPacket();
    const unsafe: ReleaseEvidencePacket = {
      ...packet,
      commands: [
        ...packet.commands,
        {
          command: 'open /Users/antonio/private-token-ghp_1234567890abcdef',
          key: 'unsafe',
          label: 'Unsafe command',
          owner: 'release',
          purpose: 'Leaked local path and token.',
        },
      ],
    };

    expect(() => assertReleaseEvidencePacketIsShareSafe(unsafe)).toThrow('Release evidence packet contains credential');
  });
});
