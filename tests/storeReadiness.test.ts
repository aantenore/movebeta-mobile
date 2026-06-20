import { describe, expect, it } from 'vitest';

import {
  buildStoreReadinessManifest,
  validateStoreReadinessManifest,
  type ExpoStoreConfig,
} from '../src/core/storeReadiness';

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

describe('store readiness', () => {
  it('builds a store manifest from Expo config', () => {
    const manifest = buildStoreReadinessManifest(expoConfig);

    expect(manifest.iosBundleIdentifier).toBe('com.movebeta.mobile');
    expect(manifest.androidPackage).toBe('com.movebeta.mobile');
    expect(manifest.listing.appName).toBe('MoveBeta');
    expect(manifest.privacy.rawVideoUploadDefault).toBe(false);
    expect(manifest.screenshots.map((item) => item.route)).toEqual([
      'analyze',
      'drills',
      'progress',
      'sessions',
      'plan',
      'privacy',
      'plan',
      'plan',
      'plan',
      'plan',
      'privacy',
    ]);
  });

  it('validates current store metadata, permissions, privacy, and screenshots', () => {
    const validation = validateStoreReadinessManifest(buildStoreReadinessManifest(expoConfig));

    expect(validation.ready).toBe(true);
    expect(validation.checks.every((check) => check.status === 'pass')).toBe(true);
  });

  it('fails when identifiers or platform permissions drift from release config', () => {
    const validation = validateStoreReadinessManifest(
      buildStoreReadinessManifest({
        ...expoConfig,
        android: { package: 'MoveBeta', permissions: ['CAMERA'] },
        ios: { ...expoConfig.ios, bundleIdentifier: 'MoveBeta' },
      }),
    );

    expect(validation.ready).toBe(false);
    expect(validation.checks.filter((check) => check.status === 'fail').map((check) => check.id)).toEqual([
      'ios-bundle',
      'android-package',
      'android-permissions',
    ]);
  });

  it('fails when privacy copy stops matching on-device behavior', () => {
    const validation = validateStoreReadinessManifest(
      buildStoreReadinessManifest({
        ...expoConfig,
        ios: {
          ...expoConfig.ios,
          infoPlist: {
            NSCameraUsageDescription: 'MoveBeta uses the camera.',
            NSMicrophoneUsageDescription: 'MoveBeta uses the microphone.',
            NSPhotoLibraryUsageDescription: 'MoveBeta reads photos.',
          },
        },
      }),
    );

    expect(validation.ready).toBe(false);
    expect(validation.checks.filter((check) => check.status === 'fail').map((check) => check.id)).toEqual([
      'ios-camera-copy',
      'ios-library-copy',
      'ios-microphone-absent',
    ]);
  });
});
