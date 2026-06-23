import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';

import {
  assertModelDeliveryLifecycleIsShareSafe,
  buildModelDeliveryLifecycle,
  modelDeliveryPolicySchemaVersion,
  modelDeliveryLifecycleSchemaVersion,
  type ModelDeliveryLifecycle,
} from '../src/core/modelDeliveryLifecycle';
import { buildPwaRuntimeReadiness } from '../src/core/pwaRuntimeReadiness';
import {
  renderModelDeliveryLifecycleMarkdown,
  writeModelDeliveryLifecycleReport,
} from '../scripts/model_delivery_lifecycle_report';

const tmpRoots: string[] = [];

function staticAssetsReport(status: 'blocked' | 'ready' = 'ready') {
  return {
    checks: [
      {
        key: 'manifest-asset-list',
        status: status === 'ready' ? 'verified' : 'blocked',
      },
    ],
    generatedAt: '2026-06-20T10:00:00.000Z',
    modelName: 'MoveNet SinglePose Lightning',
    modelUrl: '/models/movenet/singlepose/lightning/4/model.json',
    schemaVersion: 'movebeta.movenet-static-assets-report.v1',
    summary: {
      checkCount: 7,
      nextAction: 'Keep static MoveNet assets versioned.',
      shardCount: 2,
      sourceAssetCount: 3,
      status,
      totalBytes: status === 'ready' ? 4_963_342 : 0,
      verifiedCount: status === 'ready' ? 7 : 4,
    },
  };
}

function modelDeliveryPolicy(downloadStrategy: 'precache-on-install' | 'warmup-only' | 'lazy-on-analysis' = 'precache-on-install') {
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

function pwaReadinessReport() {
  return {
    checks: [
      {
        key: 'content-addressed-cache-version',
        status: 'verified',
      },
    ],
    generatedAt: '2026-06-20T10:00:00.000Z',
    schemaVersion: 'movebeta.pwa-readiness.v1',
    summary: {
      checkCount: 11,
      status: 'ready',
      verifiedCount: 11,
    },
  };
}

function webSmokeReport() {
  return {
    generatedAt: '2026-06-20T10:00:00.000Z',
    schemaVersion: 'movebeta.web-smoke-report.v1',
    status: 'pass',
    summary: {
      passedChecks: 4,
      status: 'pass',
      totalChecks: 4,
    },
  };
}

function warmedPwaRuntime({ updateAvailable = false }: { updateAvailable?: boolean } = {}) {
  return buildPwaRuntimeReadiness({
    cacheApiSupported: true,
    installPromptAvailable: false,
    installedStandalone: true,
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
    updateAvailable,
  });
}

function makeProjectRoot() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'movebeta-model-delivery-'));
  tmpRoots.push(root);
  fs.mkdirSync(path.join(root, 'docs/sdlc'), { recursive: true });
  fs.writeFileSync(
    path.join(root, 'docs/sdlc/movenet-static-assets-report.json'),
    `${JSON.stringify(staticAssetsReport(), null, 2)}\n`,
  );
  fs.mkdirSync(path.join(root, 'public'), { recursive: true });
  fs.writeFileSync(
    path.join(root, 'public/model-delivery-policy.json'),
    `${JSON.stringify(modelDeliveryPolicy(), null, 2)}\n`,
  );
  fs.writeFileSync(
    path.join(root, 'docs/sdlc/pwa-readiness-report.json'),
    `${JSON.stringify(pwaReadinessReport(), null, 2)}\n`,
  );
  fs.writeFileSync(
    path.join(root, 'docs/sdlc/web-smoke-report.json'),
    `${JSON.stringify(webSmokeReport(), null, 2)}\n`,
  );
  return root;
}

afterEach(() => {
  for (const root of tmpRoots.splice(0)) {
    fs.rmSync(root, { force: true, recursive: true });
  }
});

describe('model delivery lifecycle', () => {
  it('explains build-time vendoring and first online browser download before cache warmup', () => {
    const lifecycle = buildModelDeliveryLifecycle({
      generatedAt: '2026-06-20T10:00:00.000Z',
      staticAssetsReport: staticAssetsReport(),
    });

    expect(lifecycle.schemaVersion).toBe(modelDeliveryLifecycleSchemaVersion);
    expect(lifecycle.summary).toMatchObject({
      cacheReady: false,
      contentAddressedCache: false,
      deliveryPathVerified: false,
      deliveryMode: 'same-origin-static',
      downloadStrategy: 'precache-on-install',
      firstUseRequiresNetwork: true,
      status: 'action',
    });
    expect(lifecycle.model).toMatchObject({
      assetCount: 3,
      totalBytes: 4_963_342,
    });
    expect(lifecycle.summary.downloadTrigger).toContain('service worker downloads same-origin model assets');
    expect(lifecycle.stages.map((stage) => [stage.key, stage.status])).toEqual([
      ['build-vendoring', 'ready'],
      ['app-delivery', 'ready'],
      ['asset-versioning', 'action'],
      ['first-online-launch', 'action'],
      ['offline-reuse', 'action'],
    ]);
  });

  it('marks the delivery path ready when PWA readiness or web smoke proves exported model caching', () => {
    const lifecycle = buildModelDeliveryLifecycle({
      generatedAt: '2026-06-20T10:00:00.000Z',
      pwaReadinessReport: pwaReadinessReport(),
      staticAssetsReport: staticAssetsReport(),
      webSmokeReport: webSmokeReport(),
    });

    expect(lifecycle.summary).toMatchObject({
      cacheReady: false,
      contentAddressedCache: true,
      deliveryPathVerified: true,
      firstUseRequiresNetwork: true,
      status: 'ready',
    });
    expect(lifecycle.summary.nextAction).toContain('warm the model cache on each target browser');
    expect(lifecycle.stages.find((stage) => stage.key === 'first-online-launch')).toMatchObject({
      status: 'ready',
    });
    expect(lifecycle.stages.find((stage) => stage.key === 'asset-versioning')).toMatchObject({
      status: 'ready',
    });
    expect(lifecycle.stages.find((stage) => stage.key === 'offline-reuse')?.detail).toContain('each browser must warm');
  });

  it('explains explicit warmup-only delivery when the static policy disables install precache', () => {
    const lifecycle = buildModelDeliveryLifecycle({
      generatedAt: '2026-06-20T10:00:00.000Z',
      modelDeliveryPolicy: modelDeliveryPolicy('warmup-only'),
      staticAssetsReport: staticAssetsReport(),
    });

    expect(lifecycle.summary.downloadStrategy).toBe('warmup-only');
    expect(lifecycle.summary.downloadTrigger).toContain('only when the Warm model action');
    expect(lifecycle.stages.find((stage) => stage.key === 'first-online-launch')?.detail).toContain('explicit Warm model action');
  });

  it('marks offline reuse ready after the PWA cache and model integrity are verified', () => {
    const lifecycle = buildModelDeliveryLifecycle({
      generatedAt: '2026-06-20T10:00:00.000Z',
      pwaRuntimeReadiness: warmedPwaRuntime(),
      staticAssetsReport: staticAssetsReport(),
    });

    expect(lifecycle.summary).toMatchObject({
      cacheReady: true,
      deliveryPathVerified: true,
      firstUseRequiresNetwork: false,
      status: 'action',
    });
    expect(lifecycle.stages.find((stage) => stage.key === 'asset-versioning')).toMatchObject({
      status: 'action',
    });
    expect(lifecycle.stages.find((stage) => stage.key === 'offline-reuse')).toMatchObject({
      status: 'ready',
    });
  });

  it('surfaces waiting service-worker updates before offline model analysis', () => {
    const lifecycle = buildModelDeliveryLifecycle({
      generatedAt: '2026-06-20T10:00:00.000Z',
      pwaReadinessReport: pwaReadinessReport(),
      pwaRuntimeReadiness: warmedPwaRuntime({ updateAvailable: true }),
      staticAssetsReport: staticAssetsReport(),
    });

    expect(lifecycle.summary).toMatchObject({
      contentAddressedCache: true,
      updateAvailable: true,
      status: 'action',
    });
    expect(lifecycle.stages.find((stage) => stage.key === 'asset-versioning')).toMatchObject({
      nextAction: 'Refresh the PWA to activate the waiting service worker before offline analysis.',
      status: 'action',
    });
  });

  it('uses native bundled delivery when the runtime is native', () => {
    const lifecycle = buildModelDeliveryLifecycle({
      generatedAt: '2026-06-20T10:00:00.000Z',
      runtime: 'native',
      staticAssetsReport: staticAssetsReport(),
    });

    expect(lifecycle.summary.deliveryMode).toBe('native-bundled');
    expect(lifecycle.summary.firstUseRequiresNetwork).toBe(false);
    expect(lifecycle.summary.contentAddressedCache).toBe(true);
    expect(lifecycle.stages.find((stage) => stage.key === 'first-online-launch')?.detail).toContain('No browser warmup');
  });

  it('blocks lifecycle claims when static model assets are not ready', () => {
    const lifecycle = buildModelDeliveryLifecycle({
      generatedAt: '2026-06-20T10:00:00.000Z',
      staticAssetsReport: staticAssetsReport('blocked'),
    });

    expect(lifecycle.summary.status).toBe('blocked');
    expect(lifecycle.stages.find((stage) => stage.key === 'build-vendoring')).toMatchObject({
      status: 'blocked',
    });
  });

  it('writes JSON and Markdown reports without private values', () => {
    const rootDir = makeProjectRoot();
    const { jsonTarget, lifecycle, markdownTarget } = writeModelDeliveryLifecycleReport({
      generatedAt: '2026-06-20T10:00:00.000Z',
      rootDir,
    });

    expect(fs.existsSync(jsonTarget)).toBe(true);
    expect(fs.existsSync(markdownTarget)).toBe(true);
    expect(lifecycle.schemaVersion).toBe(modelDeliveryLifecycleSchemaVersion);
    expect(renderModelDeliveryLifecycleMarkdown(lifecycle)).toContain('First online launch');
    expect(renderModelDeliveryLifecycleMarkdown(lifecycle)).toContain('Delivery path verified: yes');
    expect(renderModelDeliveryLifecycleMarkdown(lifecycle)).toContain('Download strategy: precache-on-install');
    expect(renderModelDeliveryLifecycleMarkdown(lifecycle)).toContain('Content-addressed cache: yes');
    expect(renderModelDeliveryLifecycleMarkdown(lifecycle)).toContain('Update trigger: Model updates ship with a new static deploy');
    expect(fs.readFileSync(markdownTarget, 'utf8')).toContain('Model Delivery Lifecycle Report');
  });

  it('rejects credentials, local paths, and raw artifacts before sharing', () => {
    const lifecycle = buildModelDeliveryLifecycle({
      generatedAt: '2026-06-20T10:00:00.000Z',
      staticAssetsReport: staticAssetsReport(),
    });
    const unsafe: ModelDeliveryLifecycle = {
      ...lifecycle,
      summary: {
        ...lifecycle.summary,
        nextAction: 'Open /Users/antonio/raw.mov with ghp_1234567890abcdefTOKENVALUE',
      },
    };

    expect(() => assertModelDeliveryLifecycleIsShareSafe(unsafe)).toThrow('Model delivery lifecycle contains credential');
  });
});
