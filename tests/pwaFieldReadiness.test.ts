import { describe, expect, it } from 'vitest';

import { buildModelDeliveryLifecycle, modelDeliveryPolicySchemaVersion } from '../src/core/modelDeliveryLifecycle';
import { buildModelDownloadPlan } from '../src/core/modelDownloadPlan';
import {
  assertPwaFieldReadinessIsShareSafe,
  buildPwaFieldReadiness,
  pwaFieldReadinessSchemaVersion,
} from '../src/core/pwaFieldReadiness';
import { buildPwaRuntimeReadiness, type PwaRuntimeProbe } from '../src/core/pwaRuntimeReadiness';

const generatedAt = '2026-06-24T10:00:00.000Z';

function staticAssetsReport() {
  return {
    checks: [{ key: 'manifest-asset-list', status: 'verified' }],
    modelName: 'MoveNet SinglePose Lightning',
    modelUrl: '/models/movenet/singlepose/lightning/4/model.json',
    summary: {
      assetCount: 3,
      status: 'ready',
      totalBytes: 9000,
    },
  };
}

function pwaReadinessReport() {
  return {
    checks: [{ key: 'content-addressed-cache-version', status: 'verified' }],
    summary: {
      checkCount: 1,
      status: 'ready',
      verifiedCount: 1,
    },
  };
}

function policy(downloadStrategy: 'lazy-on-analysis' | 'precache-on-install' | 'warmup-only' = 'warmup-only') {
  return {
    native: {
      deliveryMode: 'platform-provider-bundled',
    },
    schemaVersion: modelDeliveryPolicySchemaVersion,
    web: {
      downloadStrategy,
      integrity: 'sha256-manifest',
      offlineUse: 'requires-cached-assets',
      userAction: 'warm-model-control',
    },
  };
}

function pwaProbe(patch: Partial<PwaRuntimeProbe> = {}): PwaRuntimeProbe {
  return {
    cacheApiSupported: true,
    installPromptAvailable: false,
    installedStandalone: false,
    modelCache: {
      bytesCached: 9000,
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
    ...patch,
  };
}

function buildWebPlan(probePatch: Partial<PwaRuntimeProbe> = {}) {
  const runtimeReadiness = buildPwaRuntimeReadiness(pwaProbe(probePatch));
  const lifecycle = buildModelDeliveryLifecycle({
    generatedAt,
    modelDeliveryPolicy: policy('warmup-only'),
    pwaReadinessReport: pwaReadinessReport(),
    pwaRuntimeReadiness: runtimeReadiness,
    staticAssetsReport: staticAssetsReport(),
  });

  return {
    modelDownloadPlan: buildModelDownloadPlan({
      generatedAt,
      lifecycle,
      network: 'wifi',
      preference: 'wifi-only',
      runtimeReadiness,
    }),
    runtimeReadiness,
  };
}

describe('PWA field readiness', () => {
  it('marks a verified PWA model cache as ready for offline video', () => {
    const { modelDownloadPlan, runtimeReadiness } = buildWebPlan();

    const readiness = buildPwaFieldReadiness({
      generatedAt,
      modelDownloadPlan,
      readiness: runtimeReadiness,
    });

    expect(readiness.schemaVersion).toBe(pwaFieldReadinessSchemaVersion);
    expect(readiness.summary).toMatchObject({
      blockerCount: 0,
      modelBytesCached: 9000,
      modelBytesExpected: 9000,
      modelBytesMissing: 0,
      readyForOfflineVideo: true,
      status: 'ready',
      updateAvailable: false,
    });
    expect(readiness.steps.every((step) => step.status === 'ready')).toBe(true);
    expect(readiness.privacy.rawVideoIncluded).toBe(false);
  });

  it('keeps native builds field-ready without a browser model download', () => {
    const runtimeReadiness = buildPwaRuntimeReadiness({
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
    const lifecycle = buildModelDeliveryLifecycle({
      generatedAt,
      runtime: 'native',
      staticAssetsReport: staticAssetsReport(),
    });
    const modelDownloadPlan = buildModelDownloadPlan({
      generatedAt,
      lifecycle,
      network: 'offline',
      preference: 'wifi-only',
      runtimeReadiness,
    });

    const readiness = buildPwaFieldReadiness({ generatedAt, modelDownloadPlan, readiness: runtimeReadiness });

    expect(readiness.summary).toMatchObject({
      deliveryRuntime: 'native',
      modelBytesCached: 9000,
      readyForOfflineVideo: true,
      runtimeStatus: 'native',
      status: 'ready',
    });
    expect(readiness.summary.downloadRequired).toBe(false);
  });

  it('blocks field use while a PWA update is pending', () => {
    const { modelDownloadPlan, runtimeReadiness } = buildWebPlan({
      updateAvailable: true,
    });

    const readiness = buildPwaFieldReadiness({
      generatedAt,
      modelDownloadPlan,
      readiness: runtimeReadiness,
    });

    expect(readiness.summary).toMatchObject({
      readyForOfflineVideo: false,
      status: 'blocked',
      updateAvailable: true,
    });
    expect(readiness.steps.find((step) => step.key === 'update-state')?.status).toBe('blocked');
    expect(readiness.summary.nextAction).toContain('Activate the waiting PWA update');
  });

  it('requires model cache warmup before offline video analysis', () => {
    const { modelDownloadPlan, runtimeReadiness } = buildWebPlan({
      modelCache: {
        bytesCached: 3000,
        cachedCount: 1,
        expectedCount: 3,
        integritySupported: true,
        integrityVerified: false,
        manifestCached: true,
        verifiedCount: 1,
      },
    });

    const readiness = buildPwaFieldReadiness({
      generatedAt,
      modelDownloadPlan,
      readiness: runtimeReadiness,
    });

    expect(readiness.summary.status).toBe('action');
    expect(readiness.summary.readyForOfflineVideo).toBe(false);
    expect(readiness.summary.modelBytesMissing).toBe(6000);
    expect(readiness.steps.find((step) => step.key === 'model-cache')?.status).toBe('action');
    expect(readiness.steps.find((step) => step.key === 'offline-video')?.action).toContain('Warm and verify');
  });

  it('blocks unsupported browser runtimes', () => {
    const { modelDownloadPlan, runtimeReadiness } = buildWebPlan({
      cacheApiSupported: false,
      serviceWorkerControlled: false,
      serviceWorkerRegistered: false,
      serviceWorkerSupported: false,
    });

    const readiness = buildPwaFieldReadiness({
      generatedAt,
      modelDownloadPlan,
      readiness: runtimeReadiness,
    });

    expect(readiness.summary.status).toBe('blocked');
    expect(readiness.summary.readyForOfflineVideo).toBe(false);
    expect(readiness.steps.find((step) => step.key === 'runtime-surface')?.status).toBe('blocked');
    expect(readiness.steps.find((step) => step.key === 'service-worker')?.status).toBe('blocked');
  });

  it('rejects unsafe field readiness exports', () => {
    const { modelDownloadPlan, runtimeReadiness } = buildWebPlan();
    const readiness = buildPwaFieldReadiness({ generatedAt, modelDownloadPlan, readiness: runtimeReadiness });

    expect(() =>
      assertPwaFieldReadinessIsShareSafe({
        ...readiness,
        steps: readiness.steps.map((step, index) =>
          index === 0 ? { ...step, detail: 'Do not share /Users/antonio/raw-session.mp4' } : step,
        ),
      }),
    ).toThrow('PWA field readiness contains credential');
  });
});
