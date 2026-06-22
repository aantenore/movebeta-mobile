import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';

import { preparePwaDist } from '../scripts/prepare_pwa_dist.mjs';

const tmpRoots = [];

function makeDist(html = '<html><head><title>MoveBeta</title></head><body><div id="root"></div></body></html>') {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'movebeta-pwa-dist-'));
  tmpRoots.push(root);
  const distDir = path.join(root, 'dist');
  fs.mkdirSync(distDir, { recursive: true });
  fs.writeFileSync(path.join(distDir, 'index.html'), html);
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
  });

  it('is idempotent after PWA metadata is present', () => {
    const distDir = makeDist();
    expect(preparePwaDist({ distDir })).toBe(true);
    expect(preparePwaDist({ distDir })).toBe(false);
  });
});
