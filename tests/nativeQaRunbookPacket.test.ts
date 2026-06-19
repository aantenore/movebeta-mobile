import { describe, expect, it } from 'vitest';

import {
  assertNativeQaRunbookPacketIsShareSafe,
  buildNativeQaRunbookPacket,
  nativeQaRunbookPacketSchemaVersion,
  NativeQaRunbookPacketSchema,
} from '../src/core/nativeQaRunbookPacket';
import { nativeQaEvidenceBudgets } from '../src/core/nativeQaEvidenceKit';

describe('native QA runbook packet', () => {
  it('builds a share-safe native QA packet from the app evidence kit and validator draft', () => {
    const packet = buildNativeQaRunbookPacket({
      appVersion: '1.0.0',
      generatedAt: '2026-06-20T15:00:00.000Z',
    });

    expect(NativeQaRunbookPacketSchema.parse(packet)).toEqual(packet);
    expect(packet.schemaVersion).toBe(nativeQaRunbookPacketSchemaVersion);
    expect(packet.generatedAt).toBe('2026-06-20T15:00:00.000Z');
    expect(packet.summary.requiredRuns).toBe(2);
    expect(packet.summary.workflowCountPerPlatform).toBe(nativeQaEvidenceBudgets.requiredWorkflows.length);
    expect(packet.summary.blockingChecks).toBeGreaterThan(0);
    expect(packet.platforms.map((platform) => platform.key)).toEqual(nativeQaEvidenceBudgets.requiredPlatforms);
    expect(packet.evidenceDraft.runs?.map((run) => run.platform)).toEqual(nativeQaEvidenceBudgets.requiredPlatforms);
    expect(packet.privacy).toEqual({
      credentialValuesIncluded: false,
      localPathsIncluded: false,
      rawVideoIncluded: false,
      secretsIncluded: false,
    });
    expect(JSON.stringify(packet)).not.toMatch(/file:\/\/|content:\/\/|ph:\/\/|\/Users\/|ghp_|pat_|BEGIN PRIVATE KEY/i);
  });

  it('keeps placeholder evidence intentionally blocked until real devices replace it', () => {
    const packet = buildNativeQaRunbookPacket({
      generatedAt: '2026-06-20T15:00:00.000Z',
    });

    expect(packet.summary.status).toBe('blocked-until-real-device-evidence');
    expect(packet.evidenceDraft.generatedAt).toBe('2026-06-20T15:00:00.000Z');
    expect(packet.evidenceDraft.runs?.[0]?.workflows?.cameraPermission).toBe('pending');
  });

  it('rejects injected token-like values before sharing', () => {
    const packet = buildNativeQaRunbookPacket({
      generatedAt: '2026-06-20T15:00:00.000Z',
    });
    const unsafe = {
      ...packet,
      evidenceDraft: {
        ...packet.evidenceDraft,
        runs: [
          {
            ...packet.evidenceDraft.runs?.[0],
            notes: 'Use token ghp_1234567890abcdefTOKENVALUE',
          },
        ],
      },
    };

    expect(() => assertNativeQaRunbookPacketIsShareSafe(unsafe)).toThrow('Native QA runbook packet contains credential');
  });
});
