import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const APP_SHELL = [
  '/',
  '/index.html',
  '/manifest.json',
  '/favicon.ico',
  '/pwa/icon-192.png',
  '/pwa/icon-512.png',
  '/model-delivery-policy.json',
];
const MODEL_ASSET_MANIFEST = '/model-assets.json';
const MODEL_DELIVERY_POLICY = '/model-delivery-policy.json';

export function resolveProjectRoot() {
  return path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
}

export function buildPwaHeadMarkup() {
  return [
    '<meta name="theme-color" content="#0F766E" />',
    '<meta name="description" content="MoveBeta keeps climbing video analysis local-first and installable on supported browsers." />',
    '<link rel="manifest" href="/manifest.json" />',
    '<link rel="apple-touch-icon" href="/pwa/icon-192.png" />',
    '<script>',
    "if ('serviceWorker' in navigator) {",
    "  window.addEventListener('load', function () {",
    "    navigator.serviceWorker.register('/sw.js').catch(function () {});",
    '  });',
    '}',
    '</script>',
  ].join('\n');
}

function walkFiles(dir) {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const filePath = path.join(dir, entry.name);
    if (entry.isDirectory()) return walkFiles(filePath);
    if (entry.isFile()) return [filePath];
    return [];
  });
}

export function discoverOfflineExportAssets({ distDir = path.join(resolveProjectRoot(), 'dist') } = {}) {
  return walkFiles(distDir)
    .map((filePath) => `/${path.relative(distDir, filePath).split(path.sep).join('/')}`)
    .filter(
      (assetPath) =>
        assetPath === '/metadata.json' ||
        assetPath.startsWith('/_expo/static/') ||
        assetPath.startsWith('/assets/'),
    )
    .sort((a, b) => a.localeCompare(b));
}

export function buildExportAssetsDeclaration(assetPaths) {
  return `const EXPORT_ASSETS = ${JSON.stringify(assetPaths, null, 2)};`;
}

function readJsonIfExists(filePath) {
  if (!fs.existsSync(filePath)) return undefined;
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function uniqueAssetPaths(assetPaths) {
  return [...new Set(assetPaths.filter((assetPath) => typeof assetPath === 'string' && assetPath.startsWith('/')))].sort((a, b) =>
    a.localeCompare(b),
  );
}

function publicPathToDistPath(distDir, assetPath) {
  if (assetPath === '/') return path.join(distDir, 'index.html');
  return path.join(distDir, assetPath.replace(/^\//, ''));
}

export function discoverCacheVersionAssetPaths({ distDir = path.join(resolveProjectRoot(), 'dist') } = {}) {
  const modelAssetManifest = readJsonIfExists(path.join(distDir, MODEL_ASSET_MANIFEST.replace(/^\//, '')));
  const modelAssets = Array.isArray(modelAssetManifest?.assets) ? modelAssetManifest.assets : [];

  return uniqueAssetPaths([
    ...APP_SHELL,
    ...discoverOfflineExportAssets({ distDir }),
    MODEL_DELIVERY_POLICY,
    MODEL_ASSET_MANIFEST,
    ...modelAssets,
  ]);
}

export function buildCacheVersion({ distDir = path.join(resolveProjectRoot(), 'dist'), assetPaths } = {}) {
  const hash = crypto.createHash('sha256');
  const versionAssetPaths = uniqueAssetPaths(assetPaths ?? discoverCacheVersionAssetPaths({ distDir }));

  for (const assetPath of versionAssetPaths) {
    const filePath = publicPathToDistPath(distDir, assetPath);
    hash.update(assetPath);
    hash.update('\0');
    if (fs.existsSync(filePath)) {
      hash.update(fs.readFileSync(filePath));
    } else {
      hash.update('__missing__');
    }
    hash.update('\0');
  }

  return `v-${hash.digest('hex').slice(0, 16)}`;
}

export function buildCacheVersionDeclaration(cacheVersion) {
  return `const CACHE_VERSION = '${cacheVersion}';`;
}

export function preparePwaServiceWorker({ distDir = path.join(resolveProjectRoot(), 'dist') } = {}) {
  const serviceWorkerPath = path.join(distDir, 'sw.js');
  if (!fs.existsSync(serviceWorkerPath)) return false;

  const serviceWorker = fs.readFileSync(serviceWorkerPath, 'utf8');
  const offlineAssetsDeclaration = buildExportAssetsDeclaration(discoverOfflineExportAssets({ distDir }));
  const cacheVersionDeclaration = buildCacheVersionDeclaration(buildCacheVersion({ distDir }));
  const nextServiceWorker = serviceWorker
    .replace(/const CACHE_VERSION = ['"][^'"]+['"];/, cacheVersionDeclaration)
    .replace(/const EXPORT_ASSETS = \[[\s\S]*?\];/, offlineAssetsDeclaration);
  if (nextServiceWorker === serviceWorker) return false;

  fs.writeFileSync(serviceWorkerPath, nextServiceWorker);
  return true;
}

export function preparePwaDist({
  distDir = path.join(resolveProjectRoot(), 'dist'),
} = {}) {
  const indexPath = path.join(distDir, 'index.html');
  const html = fs.readFileSync(indexPath, 'utf8');
  const needsManifest = !html.includes('href="/manifest.json"');
  const needsServiceWorker = !html.includes("register('/sw.js')") && !html.includes('register("/sw.js")');

  let htmlChanged = false;
  if (needsManifest || needsServiceWorker) {
    const injected = html.replace('</head>', `${buildPwaHeadMarkup()}\n</head>`);
    fs.writeFileSync(indexPath, injected);
    htmlChanged = true;
  }

  const serviceWorkerChanged = preparePwaServiceWorker({ distDir });
  return htmlChanged || serviceWorkerChanged;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const changed = preparePwaDist();
  console.log(changed ? 'Prepared dist/index.html with PWA metadata.' : 'dist/index.html already contains PWA metadata.');
}
