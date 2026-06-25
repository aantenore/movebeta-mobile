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
      artifactCount: 26,
      blockerCount: 5,
      commandCount: 32,
      externalEvidenceCount: 3,
      readyTracks: 1,
      status: 'needs-external-evidence',
      totalTracks: 3,
    });
    expect(packet.commands.map((command) => command.command)).toContain('npm run native:ios:doctor');
    expect(packet.commands.map((command) => command.command)).toContain('npm run native:ios:setup');
    expect(packet.commands.map((command) => command.command)).toContain('npm run native:ios:pods');
    expect(packet.commands.map((command) => command.command)).toContain('npm run release:env:doctor');
    expect(packet.commands.map((command) => command.command)).toContain('npm run validation:cue:starter');
    expect(packet.commands.map((command) => command.command)).toContain('npm run validation:cue:composition');
    expect(packet.commands.map((command) => command.command)).toContain('npm run validation:cue:composition -- --write-dataset');
    expect(packet.commands.map((command) => command.command)).toContain('npm run validation:cue:doctor');
    expect(packet.commands.map((command) => command.command)).toContain('npm run release:credentials:doctor');
    expect(packet.commands.map((command) => command.command)).toContain('npm run feature:doctor');
    expect(packet.commands.map((command) => command.command)).toContain('npm run release:blocker-issues');
    expect(packet.commands.map((command) => command.command)).toContain('npm run release:blocker-issues:file');
    expect(packet.commands.map((command) => command.command)).toContain('npm run release:evidence:intake');
    expect(packet.commands.map((command) => command.command)).toContain('npm run release:evidence:validate');
    expect(packet.commands.map((command) => command.command)).toContain('npm run release:evidence:promote');
    expect(packet.commands.map((command) => command.command)).toContain('npm run release:evidence:apply');
    expect(packet.commands.map((command) => command.command)).toContain('npm run release:freshness:doctor');
    expect(packet.commands.map((command) => command.command)).toContain('npm run web:smoke:report');
    expect(packet.commands.map((command) => command.command)).toContain('npm run web:vercel:handoff');
    expect(packet.commands.map((command) => command.command)).toContain('npm run model:verification:suite');
    expect(packet.commands.map((command) => command.command)).toContain('npm run model:movenet:assets:check');
    expect(packet.commands.map((command) => command.command)).toContain('npm run model:assets:provenance');
    expect(packet.commands.map((command) => command.command)).toContain('npm run release:license-review');
    expect(packet.commands.map((command) => command.command)).toContain('npm run model:delivery:lifecycle');
    expect(packet.commands.map((command) => command.command)).toContain('npm run model:download:plan');
    expect(packet.artifacts.map((artifact) => [artifact.key, artifact.status])).toEqual([
      ['release-gate-report', 'ready'],
      ['env-template-report', 'ready'],
      ['ios-toolchain-report', 'blocked'],
      ['ios-toolchain-setup-packet', 'blocked'],
      ['store-credentials-report', 'blocked'],
      ['native-qa-evidence', 'blocked'],
      ['cue-validation-dataset-report', 'blocked'],
      ['cue-validation-dataset-composition-packet', 'blocked'],
      ['cue-validation-dataset', 'blocked'],
      ['launch-readiness-report', 'blocked'],
      ['feature-completion-report', 'blocked'],
      ['release-blocker-issues-report', 'blocked'],
      ['release-blocker-issue-filing-plan', 'blocked'],
      ['external-evidence-intake-report', 'blocked'],
      ['external-evidence-validation-report', 'blocked'],
      ['external-evidence-promotion-report', 'blocked'],
      ['external-evidence-apply-report', 'blocked'],
      ['release-freshness-report', 'ready'],
      ['web-smoke-report', 'ready'],
      ['vercel-deployment-handoff', 'ready'],
      ['model-verification-suite-report', 'ready'],
      ['movenet-static-assets-report', 'ready'],
      ['model-asset-provenance-report', 'ready'],
      ['license-review-packet', 'ready'],
      ['model-delivery-lifecycle-report', 'ready'],
      ['model-download-plan-report', 'ready'],
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
