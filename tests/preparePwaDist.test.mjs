import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';

import {
  buildCacheVersion,
  buildCacheVersionDeclaration,
  buildExportAssetsDeclaration,
  discoverCacheVersionAssetPaths,
  discoverOfflineExportAssets,
  preparePwaDist,
  preparePwaServiceWorker,
} from '../scripts/prepare_pwa_dist.mjs';

const tmpRoots = [];

function makeDist(html = '<html><head><title>MoveBeta</title></head><body><div id="root"></div></body></html>') {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'movebeta-pwa-dist-'));
  tmpRoots.push(root);
  const distDir = path.join(root, 'dist');
  fs.mkdirSync(distDir, { recursive: true });
  fs.mkdirSync(path.join(distDir, '_expo/static/js/web'), { recursive: true });
  fs.mkdirSync(path.join(distDir, 'assets'), { recursive: true });
  fs.writeFileSync(path.join(distDir, 'index.html'), html);
  fs.writeFileSync(path.join(distDir, 'metadata.json'), '{}');
  fs.writeFileSync(path.join(distDir, '_expo/static/js/web/entry-test.js'), 'js');
  fs.writeFileSync(path.join(distDir, 'assets/image-test.png'), 'png');
  fs.writeFileSync(path.join(distDir, 'model-delivery-policy.json'), JSON.stringify({
    native: {
      deliveryMode: 'platform-provider-bundled',
    },
    schemaVersion: 'movebeta.model-delivery-policy.v1',
    web: {
      downloadStrategy: 'precache-on-install',
      integrity: 'sha256-manifest',
      offlineUse: 'requires-cached-assets',
      userAction: 'warm-model-control',
    },
  }));
  fs.writeFileSync(path.join(distDir, 'model-assets.json'), JSON.stringify({
    assets: ['/models/movenet/singlepose/lightning/4/model.json'],
    schemaVersion: 'movebeta.static-model-assets.v1',
  }));
  fs.mkdirSync(path.join(distDir, 'models/movenet/singlepose/lightning/4'), { recursive: true });
  fs.writeFileSync(path.join(distDir, 'models/movenet/singlepose/lightning/4/model.json'), '{"weightsManifest":[]}');
  fs.writeFileSync(path.join(distDir, 'sw.js'), "const CACHE_VERSION = 'v-dev';\nconst EXPORT_ASSETS = [];");
  return distDir;
}

afterEach(() => {
  for (const root of tmpRoots.splice(0)) {
    fs.rmSync(root, { force: true, recursive: true });
  }
});

describe('prepare PWA dist', () => {
  it('injects manifest and service worker registration into exported HTML', () => {
    const distDir = makeDist();

    expect(preparePwaDist({ distDir })).toBe(true);
    const html = fs.readFileSync(path.join(distDir, 'index.html'), 'utf8');

    expect(html).toContain('href="/manifest.json"');
    expect(html).toContain("navigator.serviceWorker.register('/sw.js')");
    expect(html).toContain('name="theme-color"');
    const serviceWorker = fs.readFileSync(path.join(distDir, 'sw.js'), 'utf8');
    expect(serviceWorker).toContain('/_expo/static/js/web/entry-test.js');
    expect(serviceWorker).toMatch(/const CACHE_VERSION = 'v-[a-f0-9]{16}';/);
  });

  it('is idempotent after PWA metadata is present', () => {
    const distDir = makeDist();
    expect(preparePwaDist({ distDir })).toBe(true);
    expect(preparePwaDist({ distDir })).toBe(false);
  });

  it('discovers and injects offline export assets into the service worker', () => {
    const distDir = makeDist('<html><head><link rel="manifest" href="/manifest.json"><script>navigator.serviceWorker.register("/sw.js")</script></head><body></body></html>');

    expect(discoverOfflineExportAssets({ distDir })).toEqual([
      '/_expo/static/js/web/entry-test.js',
      '/assets/image-test.png',
      '/metadata.json',
    ]);
    expect(discoverCacheVersionAssetPaths({ distDir })).toContain('/model-delivery-policy.json');
    expect(discoverCacheVersionAssetPaths({ distDir })).toContain('/models/movenet/singlepose/lightning/4/model.json');
    expect(buildExportAssetsDeclaration(['/metadata.json'])).toContain('"/metadata.json"');
    expect(buildCacheVersionDeclaration('v-1234567890abcdef')).toBe("const CACHE_VERSION = 'v-1234567890abcdef';");
    expect(preparePwaServiceWorker({ distDir })).toBe(true);
    expect(preparePwaServiceWorker({ distDir })).toBe(false);
  });

  it('changes the cache version when exported assets change', () => {
    const distDir = makeDist();
    const firstVersion = buildCacheVersion({ distDir });

    fs.writeFileSync(path.join(distDir, '_expo/static/js/web/entry-test.js'), 'changed-js');
    const nextVersion = buildCacheVersion({ distDir });

    expect(firstVersion).toMatch(/^v-[a-f0-9]{16}$/);
    expect(nextVersion).toMatch(/^v-[a-f0-9]{16}$/);
    expect(nextVersion).not.toBe(firstVersion);
  });
});
