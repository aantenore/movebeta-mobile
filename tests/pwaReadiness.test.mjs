import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';

import {
  PWA_READINESS_SCHEMA_VERSION,
  buildPwaReadinessReport,
  renderPwaReadinessMarkdown,
  writePwaReadinessReport,
} from '../scripts/pwa_readiness_doctor.mjs';
import { buildCacheVersion } from '../scripts/prepare_pwa_dist.mjs';

const tmpRoots = [];

function writeJson(filePath, value) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`);
}

function writeText(filePath, value) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, value);
}

function makeReadyFixture() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'movebeta-pwa-'));
  tmpRoots.push(root);
  writeJson(path.join(root, 'public/manifest.json'), {
    background_color: '#F8FAFC',
    display: 'standalone',
    icons: [
      { sizes: '192x192', src: '/pwa/icon-192.png', type: 'image/png' },
      { sizes: '512x512', src: '/pwa/icon-512.png', type: 'image/png' },
    ],
    name: 'MoveBeta On-Device Climbing Coach',
    scope: '/',
    short_name: 'MoveBeta',
    start_url: '/',
    theme_color: '#0F766E',
  });
  writeText(
    path.join(root, 'public/sw.js'),
    "const CACHE_VERSION = 'v-dev'; const EXPORT_ASSETS = []; const MODEL_ASSET_MANIFEST = '/model-assets.json'; async function cacheModelAssets() {} self.addEventListener('install', () => caches.open('movebeta-pwa-v-dev')); self.addEventListener('fetch', () => { if (url.pathname.startsWith('/models/')) {} });",
  );
  writeJson(path.join(root, 'public/model-assets.json'), {
    assets: [
      '/models/movenet/singlepose/lightning/4/model.json',
      '/models/movenet/singlepose/lightning/4/group1-shard1of1.bin',
    ],
    modelUrl: '/models/movenet/singlepose/lightning/4/model.json',
    schemaVersion: 'movebeta.static-model-assets.v1',
  });
  writeJson(path.join(root, 'vercel.json'), {
    buildCommand: 'npm run export:web',
    framework: null,
    headers: [],
    outputDirectory: 'dist',
    rewrites: [{ destination: '/index.html', source: '/(.*)' }],
  });
  writeJson(path.join(root, 'dist/manifest.json'), {});
  writeJson(path.join(root, 'dist/model-assets.json'), {
    assets: [
      '/models/movenet/singlepose/lightning/4/model.json',
      '/models/movenet/singlepose/lightning/4/group1-shard1of1.bin',
    ],
    modelUrl: '/models/movenet/singlepose/lightning/4/model.json',
    schemaVersion: 'movebeta.static-model-assets.v1',
  });
  writeText(path.join(root, 'dist/index.html'), '<link rel="manifest" href="/manifest.json"><script>navigator.serviceWorker.register("/sw.js")</script>');
  writeText(path.join(root, 'dist/metadata.json'), '{}');
  writeText(path.join(root, 'dist/_expo/static/js/web/entry-test.js'), 'js');
  writeText(path.join(root, 'dist/assets/image-test.png'), 'png');
  writeText(path.join(root, 'dist/models/movenet/singlepose/lightning/4/model.json'), '{}');
  writeText(path.join(root, 'dist/models/movenet/singlepose/lightning/4/group1-shard1of1.bin'), 'bin');
  writeText(path.join(root, 'dist/pwa/icon-192.png'), 'png');
  writeText(path.join(root, 'dist/pwa/icon-512.png'), 'png');
  writeText(
    path.join(root, 'dist/sw.js'),
    `const CACHE_VERSION = "${buildCacheVersion({ distDir: path.join(root, 'dist') })}"; const EXPORT_ASSETS = ["/_expo/static/js/web/entry-test.js", "/assets/image-test.png", "/metadata.json"];`,
  );
  return root;
}

afterEach(() => {
  for (const root of tmpRoots.splice(0)) {
    fs.rmSync(root, { force: true, recursive: true });
  }
});

describe('pwa readiness doctor', () => {
  it('marks a static Expo/Vercel PWA export ready', () => {
    const root = makeReadyFixture();
    const report = buildPwaReadinessReport({
      generatedAt: '2026-06-22T20:00:00.000Z',
      rootDir: root,
    });

    expect(report.schemaVersion).toBe(PWA_READINESS_SCHEMA_VERSION);
    expect(report.summary).toMatchObject({
      checkCount: 10,
      status: 'ready',
      verifiedCount: 10,
    });
    expect(report.privacy).toMatchObject({
      backendRequired: false,
      credentialValuesIncluded: false,
    });
    expect(renderPwaReadinessMarkdown(report)).toContain('Backend required: no');
  });

  it('keeps missing exported assets blocked', () => {
    const root = makeReadyFixture();
    fs.rmSync(path.join(root, 'dist/index.html'));
    const report = buildPwaReadinessReport({ rootDir: root });

    expect(report.summary.status).toBe('blocked');
    expect(report.checks.find((item) => item.key === 'html-registration')?.status).toBe('blocked');
  });

  it('blocks when exported offline boot assets are not pre-cached by the service worker', () => {
    const root = makeReadyFixture();
    writeText(
      path.join(root, 'dist/sw.js'),
      `const CACHE_VERSION = "${buildCacheVersion({ distDir: path.join(root, 'dist') })}"; const EXPORT_ASSETS = ["/metadata.json"];`,
    );
    const report = buildPwaReadinessReport({ rootDir: root });

    expect(report.summary.status).toBe('blocked');
    expect(report.checks.find((item) => item.key === 'exported-offline-cache-assets')?.status).toBe('blocked');
  });

  it('blocks when the exported service worker keeps a static cache version', () => {
    const root = makeReadyFixture();
    writeText(
      path.join(root, 'dist/sw.js'),
      'const CACHE_VERSION = "v1"; const EXPORT_ASSETS = ["/_expo/static/js/web/entry-test.js", "/assets/image-test.png", "/metadata.json"];',
    );
    const report = buildPwaReadinessReport({ rootDir: root });

    expect(report.summary.status).toBe('blocked');
    expect(report.checks.find((item) => item.key === 'content-addressed-cache-version')?.status).toBe('blocked');
  });

  it('blocks when the exported service worker cache version does not match current asset contents', () => {
    const root = makeReadyFixture();
    writeText(
      path.join(root, 'dist/sw.js'),
      'const CACHE_VERSION = "v-1234567890abcdef"; const EXPORT_ASSETS = ["/_expo/static/js/web/entry-test.js", "/assets/image-test.png", "/metadata.json"];',
    );
    const report = buildPwaReadinessReport({ rootDir: root });

    expect(report.summary.status).toBe('blocked');
    expect(report.checks.find((item) => item.key === 'content-addressed-cache-version')?.status).toBe('blocked');
  });

  it('writes JSON and Markdown reports', () => {
    const root = makeReadyFixture();
    const report = buildPwaReadinessReport({ rootDir: root });
    const jsonOutputPath = path.join(root, 'docs/sdlc/pwa-readiness-report.json');
    const markdownOutputPath = path.join(root, 'docs/sdlc/pwa-readiness-report.md');

    writePwaReadinessReport({ jsonOutputPath, markdownOutputPath, report });

    expect(JSON.parse(fs.readFileSync(jsonOutputPath, 'utf8'))).toEqual(report);
    expect(fs.readFileSync(markdownOutputPath, 'utf8')).toContain('PWA Readiness Report');
  });
});
