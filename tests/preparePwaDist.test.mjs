import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';

import {
  buildExportAssetsDeclaration,
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
  fs.writeFileSync(path.join(distDir, 'sw.js'), 'const EXPORT_ASSETS = [];');
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
    expect(fs.readFileSync(path.join(distDir, 'sw.js'), 'utf8')).toContain('/_expo/static/js/web/entry-test.js');
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
    expect(buildExportAssetsDeclaration(['/metadata.json'])).toContain('"/metadata.json"');
    expect(preparePwaServiceWorker({ distDir })).toBe(true);
    expect(preparePwaServiceWorker({ distDir })).toBe(false);
  });
});
