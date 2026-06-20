import { describe, expect, it } from 'vitest';

import { defaultLaunchReadinessEvidence } from '../src/core/launchReadiness';
import {
  assertReleaseBlockerIssuePacketIsShareSafe,
  buildReleaseBlockerIssuePacket,
  releaseBlockerIssuePacketSchemaVersion,
  ReleaseBlockerIssuePacketSchema,
  type ReleaseBlockerIssuePacket,
} from '../src/core/releaseBlockerIssuePacket';

describe('release blocker issue packet', () => {
  it('builds share-safe issue drafts for every external release blocker', () => {
    const packet = buildReleaseBlockerIssuePacket({
      generatedAt: '2026-06-20T22:00:00.000Z',
    });

    expect(ReleaseBlockerIssuePacketSchema.parse(packet)).toEqual(packet);
    expect(packet.schemaVersion).toBe(releaseBlockerIssuePacketSchemaVersion);
    expect(packet.generatedAt).toBe('2026-06-20T22:00:00.000Z');
    expect(packet.issueTemplatePath).toBe('.github/ISSUE_TEMPLATE/release_blocker.md');
    expect(packet.summary).toMatchObject({
      issueCount: 5,
      ownerCount: 4,
      status: 'ready-to-file',
    });
    expect(packet.privacy).toEqual({
      credentialValuesIncluded: false,
      localPathsIncluded: false,
      rawArtifactsIncluded: false,
      rawVideoIncluded: false,
      secretsIncluded: false,
    });
    expect(packet.issues.map((issue) => issue.key)).toContain('easCredentials');
    expect(packet.issues.find((issue) => issue.key === 'easCredentials')?.body).toContain('## Environment Key Names');
    expect(packet.issues.find((issue) => issue.key === 'easCredentials')?.body).toContain('`EXPO_TOKEN`');
    expect(packet.issues.flatMap((issue) => issue.labels)).toContain('release-blocker');
    expect(JSON.stringify(packet)).not.toMatch(/ghp_|github_pat_|BEGIN PRIVATE KEY|file:\/\/|\/Users\//i);
  });

  it('returns a ready packet when no external release blocker remains', () => {
    const packet = buildReleaseBlockerIssuePacket({
      evidence: {
        ...defaultLaunchReadinessEvidence,
        cueValidationDataset: true,
        easCredentials: true,
        easProject: true,
        iosBuild: true,
        nativeDeviceQa: true,
      },
      generatedAt: '2026-06-20T22:00:00.000Z',
    });

    expect(packet.summary.status).toBe('ready');
    expect(packet.issues).toEqual([]);
  });

  it('rejects injected local paths, raw video names, credentials, and token-like values', () => {
    const packet = buildReleaseBlockerIssuePacket({
      generatedAt: '2026-06-20T22:00:00.000Z',
    });
    const unsafe: ReleaseBlockerIssuePacket = {
      ...packet,
      issues: [
        {
          ...packet.issues[0],
          body: 'Attach file:///Users/antonio/raw-video.mp4 with ghp_1234567890abcdefTOKENVALUE.',
        },
      ],
    };

    expect(() => assertReleaseBlockerIssuePacketIsShareSafe(unsafe)).toThrow('Release blocker issue packet contains credential');
  });
});
