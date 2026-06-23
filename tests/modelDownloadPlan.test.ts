import { describe, expect, it } from 'vitest';

import { buildModelDeliveryLifecycle, modelDeliveryPolicySchemaVersion } from '../src/core/modelDeliveryLifecycle';
import { assertModelDownloadPlanIsShareSafe, buildModelDownloadPlan } from '../src/core/modelDownloadPlan';
import { buildPwaRuntimeReadiness, type PwaRuntimeProbe } from '../src/core/pwaRuntimeReadiness';

const generatedAt = '2026-06-24T08:00:00.000Z';

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

function pwaProbe(patch: Partial<PwaRuntimeProbe> = {}): PwaRuntimeProbe {
  return {
    cacheApiSupported: true,
    installPromptAvailable: true,
    installedStandalone: false,
    modelCache: {
      bytesCached: 0,
      cachedCount: 0,
      expectedCount: 3,
      integritySupported: true,
      integrityVerified: false,
      manifestCached: false,
      verifiedCount: 0,
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

describe('model download plan', () => {
  it('treats native bundled models as ready without a separate download', () => {
    const lifecycle = buildModelDeliveryLifecycle({
      generatedAt,
      runtime: 'native',
      staticAssetsReport: staticAssetsReport(),
    });

    const plan = buildModelDownloadPlan({
      generatedAt,
      lifecycle,
      network: 'offline',
      preference: 'wifi-only',
    });

    expect(plan.summary.runtime).toBe('native');
    expect(plan.summary.status).toBe('ready');
    expect(plan.summary.downloadRequired).toBe(false);
    expect(plan.model.additionalDownloadBytes).toBe(0);
    expect(plan.model.packagedBytes).toBe(9000);
    expect(plan.summary.nextAction).toContain('native app');
  });

  it('reports a cached PWA model as offline ready', () => {
    const runtimeReadiness = buildPwaRuntimeReadiness(
      pwaProbe({
        modelCache: {
          bytesCached: 9000,
          cachedCount: 3,
          expectedCount: 3,
          integritySupported: true,
          integrityVerified: true,
          manifestCached: true,
          verifiedCount: 3,
        },
      }),
    );
    const lifecycle = buildModelDeliveryLifecycle({
      generatedAt,
      modelDeliveryPolicy: policy('precache-on-install'),
      pwaReadinessReport: pwaReadinessReport(),
      pwaRuntimeReadiness: runtimeReadiness,
      staticAssetsReport: staticAssetsReport(),
    });

    const plan = buildModelDownloadPlan({
      generatedAt,
      lifecycle,
      network: 'offline',
      preference: 'wifi-only',
      runtimeReadiness,
    });

    expect(plan.summary.status).toBe('ready');
    expect(plan.summary.offlineReady).toBe(true);
    expect(plan.summary.downloadRequired).toBe(false);
    expect(plan.steps.find((step) => step.key === 'integrity-check')?.status).toBe('ready');
  });

  it('blocks offline PWA real-video use until uncached model assets are warmed', () => {
    const runtimeReadiness = buildPwaRuntimeReadiness(pwaProbe({ online: false }));
    const lifecycle = buildModelDeliveryLifecycle({
      generatedAt,
      modelDeliveryPolicy: policy('warmup-only'),
      pwaReadinessReport: pwaReadinessReport(),
      pwaRuntimeReadiness: runtimeReadiness,
      staticAssetsReport: staticAssetsReport(),
    });

    const plan = buildModelDownloadPlan({
      generatedAt,
      lifecycle,
      network: 'offline',
      preference: 'manual',
      runtimeReadiness,
    });

    expect(plan.summary.status).toBe('blocked');
    expect(plan.summary.downloadTrigger).toBe('Warm model or online Analyze');
    expect(plan.model.additionalDownloadBytes).toBe(9000);
    expect(plan.steps.find((step) => step.key === 'cache-warmup')?.status).toBe('blocked');
    expect(plan.summary.nextAction).toContain('Reconnect');
  });

  it('surfaces update activation before offline reuse', () => {
    const runtimeReadiness = buildPwaRuntimeReadiness(
      pwaProbe({
        modelCache: {
          bytesCached: 9000,
          cachedCount: 3,
          expectedCount: 3,
          integritySupported: true,
          integrityVerified: true,
          manifestCached: true,
          verifiedCount: 3,
        },
        updateAvailable: true,
      }),
    );
    const lifecycle = buildModelDeliveryLifecycle({
      generatedAt,
      modelDeliveryPolicy: policy('precache-on-install'),
      pwaReadinessReport: pwaReadinessReport(),
      pwaRuntimeReadiness: runtimeReadiness,
      staticAssetsReport: staticAssetsReport(),
    });

    const plan = buildModelDownloadPlan({
      generatedAt,
      lifecycle,
      network: 'wifi',
      preference: 'wifi-only',
      runtimeReadiness,
    });

    expect(plan.summary.status).toBe('action');
    expect(plan.summary.updateAvailable).toBe(true);
    expect(plan.summary.nextAction).toContain('Refresh the PWA');
  });

  it('rejects unsafe exported values', () => {
    const lifecycle = buildModelDeliveryLifecycle({
      generatedAt,
      runtime: 'native',
      staticAssetsReport: staticAssetsReport(),
    });
    const plan = buildModelDownloadPlan({ generatedAt, lifecycle });

    expect(() =>
      assertModelDownloadPlanIsShareSafe({
        ...plan,
        steps: plan.steps.map((step, index) => (index === 0 ? { ...step, detail: 'file:///tmp/private.mp4' } : step)),
      }),
    ).toThrow('Model download plan contains credential');
  });
});
