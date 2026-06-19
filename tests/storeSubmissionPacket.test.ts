import { describe, expect, it } from 'vitest';

import { buildStoreReadinessManifest, type ExpoStoreConfig } from '../src/core/storeReadiness';
import {
  assertStoreSubmissionPacketIsShareSafe,
  buildStoreSubmissionPacket,
  storeSubmissionPacketSchemaVersion,
  type StoreSubmissionPacket,
} from '../src/core/storeSubmissionPacket';

const expoConfig: ExpoStoreConfig = {
  android: {
    package: 'com.movebeta.mobile',
    permissions: ['CAMERA', 'READ_MEDIA_VIDEO'],
  },
  ios: {
    bundleIdentifier: 'com.movebeta.mobile',
    infoPlist: {
      NSCameraUsageDescription: 'MoveBeta uses the camera to analyze climbing attempts on-device when you choose to record.',
      NSPhotoLibraryUsageDescription: 'MoveBeta can import a climbing video you select for on-device movement analysis.',
    },
  },
  name: 'MoveBeta',
  version: '1.0.0',
};

describe('store submission packet', () => {
  it('builds a versioned share-safe store metadata packet', () => {
    const packet = buildStoreSubmissionPacket({
      generatedAt: '2026-06-20T02:00:00.000Z',
      manifest: buildStoreReadinessManifest(expoConfig),
    });

    expect(packet.schemaVersion).toBe(storeSubmissionPacketSchemaVersion);
    expect(packet.summary).toMatchObject({
      androidPackage: 'com.movebeta.mobile',
      checkCount: 9,
      checksPassed: 9,
      copyIssueCount: 0,
      iosBundleIdentifier: 'com.movebeta.mobile',
      screenshotCount: 8,
      status: 'metadata-ready',
    });
    expect(packet.privacy).toEqual({
      credentialValuesIncluded: false,
      localPathsIncluded: false,
      rawArtifactsIncluded: false,
      rawVideoIncluded: false,
      secretsIncluded: false,
      trackingEnabled: false,
    });
    expect(packet.commands.map((command) => command.command)).toContain('npm run release:eas:strict');
    expect(JSON.stringify(packet)).not.toMatch(/ghp_|BEGIN PRIVATE KEY|file:\/\/|\/Users\//i);
  });

  it('requires review when store copy makes risky claims', () => {
    const manifest = buildStoreReadinessManifest(expoConfig);
    const packet = buildStoreSubmissionPacket({
      generatedAt: '2026-06-20T02:05:00.000Z',
      manifest: {
        ...manifest,
        listing: {
          ...manifest.listing,
          fullDescription: `${manifest.listing.fullDescription} This will prevent injuries and guarantee send success.`,
        },
      },
    });

    expect(packet.summary.status).toBe('review-required');
    expect(packet.summary.copyIssueCount).toBeGreaterThan(0);
    expect(packet.safetyLanguage.status).toBe('review');
    expect(packet.summary.nextAction).toContain('Rewrite');
  });

  it('rejects local paths, raw artifact references, and token-like values before sharing', () => {
    const packet = buildStoreSubmissionPacket({
      generatedAt: '2026-06-20T02:10:00.000Z',
      manifest: buildStoreReadinessManifest(expoConfig),
    });
    const unsafe: StoreSubmissionPacket = {
      ...packet,
      commands: [
        ...packet.commands,
        {
          command: 'open /Users/antonio/private/ghp_1234567890abcdefTOKEN',
          key: 'unsafe',
          label: 'Unsafe command',
          owner: 'release',
          purpose: 'Leaked path and token.',
        },
      ],
    };

    expect(() => assertStoreSubmissionPacketIsShareSafe(unsafe)).toThrow('Store submission packet contains credential');
  });
});
