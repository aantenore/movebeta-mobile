import { describe, expect, it } from 'vitest';

import {
  assertIosToolchainSetupPacketIsShareSafe,
  buildIosToolchainSetupPacket,
  iosToolchainSetupPacketSchemaVersion,
  IosToolchainSetupPacketSchema,
  type IosToolchainSetupPacket,
} from '../src/core/iosToolchainSetupPacket';

describe('iOS toolchain setup packet', () => {
  it('builds a blocked share-safe packet from a Command Line Tools-only report', () => {
    const packet = buildIosToolchainSetupPacket({
      report: {
        generatedAt: '2026-06-22T17:40:00.000Z',
        schemaVersion: 'movebeta.ios-toolchain-report.v1',
        status: 'blocked',
        summary: {
          buildSettingsProbe: 'skipped',
          commandLineToolsOnly: true,
          fullXcode: false,
          podsInstalled: true,
          workspaceExists: true,
          xcodebuildAvailable: false,
        },
      },
    });

    expect(IosToolchainSetupPacketSchema.parse(packet)).toEqual(packet);
    expect(packet.schemaVersion).toBe(iosToolchainSetupPacketSchemaVersion);
    expect(packet.summary).toMatchObject({
      blockedCheckCount: 3,
      readyCheckCount: 2,
      status: 'needs-full-xcode',
      totalCheckCount: 6,
    });
    expect(packet.checks.map((check) => [check.key, check.status])).toEqual([
      ['full-xcode', 'blocked'],
      ['developer-directory', 'blocked'],
      ['workspace', 'ready'],
      ['pods', 'ready'],
      ['build-settings', 'review'],
      ['ios-build-log', 'blocked'],
    ]);
    expect(packet.privacy).toEqual({
      credentialValuesIncluded: false,
      localPathsIncluded: false,
      rawArtifactsIncluded: false,
      rawVideoIncluded: false,
      tokenLikeValuesIncluded: false,
    });
    expect(JSON.stringify(packet)).not.toMatch(/\/Library\/|\/Applications\/|\/Users\/|file:\/\/|ghp_|BEGIN PRIVATE KEY/i);
  });

  it('marks the packet ready when the toolchain report is ready', () => {
    const packet = buildIosToolchainSetupPacket({
      generatedAt: '2026-06-22T17:45:00.000Z',
      report: {
        schemaVersion: 'movebeta.ios-toolchain-report.v1',
        status: 'ready',
        summary: {
          buildSettingsProbe: 'pass',
          commandLineToolsOnly: false,
          fullXcode: true,
          podsInstalled: true,
          workspaceExists: true,
          xcodebuildAvailable: true,
        },
      },
    });

    expect(packet.summary).toMatchObject({
      blockedCheckCount: 0,
      readyCheckCount: 6,
      status: 'ready-for-ios-build',
    });
    expect(packet.summary.nextAction).toContain('share-safe build log');
  });

  it('rejects local paths, raw artifacts, credentials, and token-like values before sharing', () => {
    const packet = buildIosToolchainSetupPacket();
    const unsafe: IosToolchainSetupPacket = {
      ...packet,
      checks: [
        {
          ...packet.checks[0],
          action: 'Attach /Users/antonio/build.log and ghp_1234567890abcdefTOKENVALUE to the release note.',
        },
      ],
    };

    expect(() => assertIosToolchainSetupPacketIsShareSafe(unsafe)).toThrow('iOS toolchain setup packet contains credential');
  });
});
