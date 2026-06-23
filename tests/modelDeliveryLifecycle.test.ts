import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';

import {
  assertModelDeliveryLifecycleIsShareSafe,
  buildModelDeliveryLifecycle,
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

function warmedPwaRuntime() {
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
    updateAvailable: false,
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
      deliveryMode: 'same-origin-static',
      firstUseRequiresNetwork: true,
      status: 'action',
    });
    expect(lifecycle.model).toMatchObject({
      assetCount: 3,
      totalBytes: 4_963_342,
    });
    expect(lifecycle.summary.downloadTrigger).toContain('browser downloads same-origin model assets');
    expect(lifecycle.stages.map((stage) => [stage.key, stage.status])).toEqual([
      ['build-vendoring', 'ready'],
      ['app-delivery', 'ready'],
      ['first-online-launch', 'action'],
      ['offline-reuse', 'action'],
    ]);
  });

  it('marks offline reuse ready after the PWA cache and model integrity are verified', () => {
    const lifecycle = buildModelDeliveryLifecycle({
      generatedAt: '2026-06-20T10:00:00.000Z',
      pwaRuntimeReadiness: warmedPwaRuntime(),
      staticAssetsReport: staticAssetsReport(),
    });

    expect(lifecycle.summary).toMatchObject({
      cacheReady: true,
      firstUseRequiresNetwork: false,
      status: 'ready',
    });
    expect(lifecycle.stages.find((stage) => stage.key === 'offline-reuse')).toMatchObject({
      status: 'ready',
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
