import { describe, expect, it } from 'vitest';

import {
  buildPwaInstallGuidancePacket,
  buildPwaRuntimeReadiness,
  pwaRuntimeReadinessSchemaVersion,
  type PwaRuntimeProbe,
} from '../src/core/pwaRuntimeReadiness';

const readyWebProbe: PwaRuntimeProbe = {
  cacheApiSupported: true,
  installPromptAvailable: false,
  installedStandalone: false,
  modelCache: {
    bytesCached: 324508,
    cachedCount: 3,
    expectedCount: 3,
    integritySupported: true,
    integrityVerified: true,
    manifestCached: true,
    verifiedCount: 3,
  },
  online: true,
  runtime: 'web',
  serviceWorkerControlled: true,
  serviceWorkerRegistered: true,
  serviceWorkerSupported: true,
  updateAvailable: false,
};

describe('PWA runtime readiness', () => {
  it('marks standalone PWA launches as installed and offline ready', () => {
    const readiness = buildPwaRuntimeReadiness({
      ...readyWebProbe,
      installedStandalone: true,
    });

    expect(readiness.schemaVersion).toBe(pwaRuntimeReadinessSchemaVersion);
    expect(readiness.summary).toMatchObject({
      installedStandalone: true,
      modelCacheReady: true,
      offlineReady: true,
      status: 'installed',
    });
    expect(readiness.checks.find((check) => check.key === 'install-surface')?.status).toBe('ready');
    expect(readiness.checks.find((check) => check.key === 'model-cache')?.status).toBe('ready');
  });

  it('surfaces browser install prompt availability as an action state', () => {
    const readiness = buildPwaRuntimeReadiness({
      ...readyWebProbe,
      installPromptAvailable: true,
    });

    expect(readiness.summary).toMatchObject({
      installPromptAvailable: true,
      modelAssetsCached: 3,
      modelAssetsExpected: 3,
      modelAssetsVerified: 3,
      modelBytesCached: 324508,
      offlineReady: true,
      status: 'installable',
    });
    expect(readiness.checks.find((check) => check.key === 'install-surface')?.action).toContain('Install app action');
  });

  it('keeps static PWA runtime ready when the browser hides the install prompt', () => {
    const readiness = buildPwaRuntimeReadiness(readyWebProbe);
    const packet = buildPwaInstallGuidancePacket(readiness);

    expect(readiness.summary.status).toBe('runtime-ready');
    expect(readiness.summary.nextAction).toContain('browser install control');
    expect(packet.actions).toContain('The same-origin model cache is ready and SHA-256 verified for offline analysis.');
    expect(packet.schemaVersion).toBe(pwaRuntimeReadinessSchemaVersion);
    expect(packet.privacy).toMatchObject({
      credentialValuesIncluded: false,
      rawVideoIncluded: false,
    });
  });

  it('keeps native runtimes on the native install path', () => {
    const readiness = buildPwaRuntimeReadiness({
      cacheApiSupported: false,
      installPromptAvailable: false,
      installedStandalone: false,
      modelCache: {
        bytesCached: 0,
        cachedCount: 0,
        expectedCount: 0,
        integritySupported: false,
        integrityVerified: false,
        manifestCached: false,
        verifiedCount: 0,
      },
      online: true,
      runtime: 'native',
      serviceWorkerControlled: false,
      serviceWorkerRegistered: false,
      serviceWorkerSupported: false,
      updateAvailable: false,
    });

    expect(readiness.summary.status).toBe('native');
    expect(readiness.summary.modelCacheReady).toBe(true);
    expect(readiness.summary.offlineReady).toBe(true);
    expect(readiness.checks.every((check) => check.status === 'ready')).toBe(true);
  });

  it('keeps offline analysis pending until model assets are cached', () => {
    const readiness = buildPwaRuntimeReadiness({
      ...readyWebProbe,
      modelCache: {
        bytesCached: 5691,
        cachedCount: 1,
        expectedCount: 3,
        integritySupported: true,
        integrityVerified: false,
        manifestCached: true,
        verifiedCount: 1,
      },
    });
    const packet = buildPwaInstallGuidancePacket(readiness);

    expect(readiness.summary).toMatchObject({
      modelAssetsCached: 1,
      modelAssetsExpected: 3,
      modelAssetsVerified: 1,
      modelCacheReady: false,
      modelIntegritySupported: true,
      modelIntegrityVerified: false,
      offlineReady: false,
      status: 'runtime-ready',
    });
    expect(readiness.checks.find((check) => check.key === 'model-cache')?.status).toBe('action');
    expect(packet.actions).toContain('Open once online before a gym session to warm and verify the same-origin model cache.');
  });

  it('keeps offline analysis pending when cached assets fail integrity verification', () => {
    const readiness = buildPwaRuntimeReadiness({
      ...readyWebProbe,
      modelCache: {
        bytesCached: 324508,
        cachedCount: 3,
        expectedCount: 3,
        integritySupported: true,
        integrityVerified: false,
        manifestCached: true,
        verifiedCount: 2,
      },
    });

    expect(readiness.summary).toMatchObject({
      modelAssetsCached: 3,
      modelAssetsExpected: 3,
      modelAssetsVerified: 2,
      modelCacheReady: false,
      modelIntegritySupported: true,
      modelIntegrityVerified: false,
      offlineReady: false,
    });
    expect(readiness.checks.find((check) => check.key === 'model-cache')?.status).toBe('action');
    expect(readiness.checks.find((check) => check.key === 'model-integrity')?.status).toBe('action');
    expect(readiness.checks.find((check) => check.key === 'model-integrity')?.detail).toContain('2/3');
  });

  it('rejects unsafe guidance packet values before sharing', () => {
    const readiness = buildPwaRuntimeReadiness(readyWebProbe);

    expect(() =>
      buildPwaInstallGuidancePacket({
        ...readiness,
        checks: [
          {
            ...readiness.checks[0],
            detail: 'Open file:///Users/antonio/raw-beta.mov with ghp_1234567890abcdefTOKENVALUE',
          },
        ],
      }),
    ).toThrow('PWA install guidance packet contains credential');
  });
});
