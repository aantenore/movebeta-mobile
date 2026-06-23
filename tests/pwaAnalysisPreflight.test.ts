import { describe, expect, it } from 'vitest';

import { buildPwaAnalysisPreflight } from '../src/core/pwaAnalysisPreflight';
import { buildPwaRuntimeReadiness, type PwaRuntimeProbe } from '../src/core/pwaRuntimeReadiness';

const readyWebProbe: PwaRuntimeProbe = {
  cacheApiSupported: true,
  installPromptAvailable: false,
  installedStandalone: false,
  modelCache: {
    bytesCached: 4_963_342,
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

describe('PWA analysis preflight', () => {
  it('allows cached web model analysis and surfaces cache counts', () => {
    const preflight = buildPwaAnalysisPreflight({
      hasLocalVideo: true,
      online: true,
      readiness: buildPwaRuntimeReadiness(readyWebProbe),
    });

    expect(preflight).toMatchObject({
      badge: 'ready',
      canAnalyze: true,
      status: 'ready',
      title: 'Model cache ready',
    });
    expect(preflight.detail).toContain('3/3');
  });

  it('allows demo attempts while asking users to warm before real field use', () => {
    const preflight = buildPwaAnalysisPreflight({
      hasLocalVideo: false,
      online: false,
      readiness: buildPwaRuntimeReadiness({
        ...readyWebProbe,
        modelCache: {
          bytesCached: 0,
          cachedCount: 0,
          expectedCount: 0,
          integritySupported: false,
          integrityVerified: false,
          manifestCached: false,
          verifiedCount: 0,
        },
        online: false,
      }),
    });

    expect(preflight).toMatchObject({
      badge: 'warm',
      canAnalyze: true,
      status: 'action',
    });
  });

  it('allows online real-video analysis while recommending explicit warmup', () => {
    const preflight = buildPwaAnalysisPreflight({
      hasLocalVideo: true,
      online: true,
      readiness: buildPwaRuntimeReadiness({
        ...readyWebProbe,
        modelCache: {
          bytesCached: 0,
          cachedCount: 0,
          expectedCount: 0,
          integritySupported: false,
          integrityVerified: false,
          manifestCached: false,
          verifiedCount: 0,
        },
      }),
    });

    expect(preflight).toMatchObject({
      badge: 'online',
      canAnalyze: true,
      status: 'action',
    });
  });

  it('blocks offline real-video analysis until the web model cache is warm', () => {
    const preflight = buildPwaAnalysisPreflight({
      hasLocalVideo: true,
      online: false,
      readiness: buildPwaRuntimeReadiness({
        ...readyWebProbe,
        modelCache: {
          bytesCached: 1_024,
          cachedCount: 1,
          expectedCount: 3,
          integritySupported: true,
          integrityVerified: false,
          manifestCached: true,
          verifiedCount: 1,
        },
        online: false,
      }),
    });

    expect(preflight).toMatchObject({
      badge: 'blocked',
      canAnalyze: false,
      status: 'blocked',
      title: 'Offline model cache missing',
    });
    expect(preflight.action).toContain('Reconnect');
  });

  it('keeps native builds on the native provider path', () => {
    const preflight = buildPwaAnalysisPreflight({
      hasLocalVideo: true,
      online: false,
      readiness: buildPwaRuntimeReadiness({
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
        online: false,
        runtime: 'native',
        serviceWorkerControlled: false,
        serviceWorkerRegistered: false,
        serviceWorkerSupported: false,
        updateAvailable: false,
      }),
    });

    expect(preflight).toMatchObject({
      badge: 'native',
      canAnalyze: true,
      status: 'native',
    });
  });
});
