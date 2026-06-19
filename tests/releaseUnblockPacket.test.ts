import { describe, expect, it } from 'vitest';

import {
  assertReleaseUnblockPacketIsShareSafe,
  buildReleaseUnblockPacket,
  releaseUnblockPacketSchemaVersion,
  ReleaseUnblockPacketSchema,
} from '../src/core/releaseUnblockPacket';
import { defaultLaunchReadinessEvidence } from '../src/core/launchReadiness';

describe('release unblock packet', () => {
  it('builds a versioned share-safe packet from the external blocker checklist', () => {
    const packet = buildReleaseUnblockPacket({
      generatedAt: '2026-06-20T14:00:00.000Z',
    });

    expect(ReleaseUnblockPacketSchema.parse(packet)).toEqual(packet);
    expect(packet.schemaVersion).toBe(releaseUnblockPacketSchemaVersion);
    expect(packet.generatedAt).toBe('2026-06-20T14:00:00.000Z');
    expect(packet.summary.blockedItems).toBe(5);
    expect(packet.privacy).toEqual({
      credentialValuesIncluded: false,
      localPathsIncluded: false,
      rawArtifactsIncluded: false,
    });
    expect(packet.checklist.items.map((item) => item.key)).toContain('easCredentials');
    expect(JSON.stringify(packet)).not.toMatch(/ghp_|pat_|BEGIN PRIVATE KEY|file:\/\/|\/Users\//i);
  });

  it('returns a ready packet when every external blocker is cleared', () => {
    const packet = buildReleaseUnblockPacket({
      evidence: {
        ...defaultLaunchReadinessEvidence,
        cueValidationDataset: true,
        easCredentials: true,
        easProject: true,
        iosBuild: true,
        nativeDeviceQa: true,
      },
      generatedAt: '2026-06-20T14:00:00.000Z',
    });

    expect(packet.summary.status).toBe('ready');
    expect(packet.checklist.items).toEqual([]);
  });

  it('rejects injected credential values and local paths', () => {
    const packet = buildReleaseUnblockPacket({
      generatedAt: '2026-06-20T14:00:00.000Z',
    });
    const unsafe = {
      ...packet,
      checklist: {
        ...packet.checklist,
        items: [
          {
            ...packet.checklist.items[0],
            proof: ['ghp_1234567890abcdefTOKENVALUE'],
          },
        ],
      },
    };

    expect(() => assertReleaseUnblockPacketIsShareSafe(unsafe)).toThrow('Release unblock packet contains credential');
  });
});
