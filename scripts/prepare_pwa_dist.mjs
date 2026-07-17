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
  '/pwa-register.js',
  '/pwa.css',
  '/model-delivery-policy.json',
];
const MODEL_ASSET_MANIFEST = '/model-assets.json';
const MODEL_DELIVERY_POLICY = '/model-delivery-policy.json';
const SERVICE_WORKER_REGISTRATION_ASSET = '/pwa-register.js';
const PWA_STYLE_ASSET = '/pwa.css';
const SERVICE_WORKER_URL = '/sw.js';
const LEGACY_INLINE_REGISTRATION_PATTERN =
  /<script(?:\s[^>]*)?>(?:(?!<\/script>)[\s\S])*navigator\.serviceWorker\.register\((['"])\/sw\.js\1\)(?:(?!<\/script>)[\s\S])*<\/script>/gi;

export function resolveProjectRoot() {
  return path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
}

export function buildPwaHeadMarkup({ includeMetadata = true, includeRegistration = true, includeStyle = true } = {}) {
  const markup = [];

  if (includeMetadata) {
    markup.push(
      '<meta name="theme-color" content="#0F766E" />',
      '<meta name="description" content="MoveBeta keeps climbing video analysis local-first and installable on supported browsers." />',
      '<link rel="manifest" href="/manifest.json" />',
      '<link rel="apple-touch-icon" href="/pwa/icon-192.png" />',
    );
  }

  if (includeStyle) {
    markup.push(`<link rel="stylesheet" href="${PWA_STYLE_ASSET}" />`);
  }

  if (includeRegistration) {
    markup.push(
      `<script defer src="${SERVICE_WORKER_REGISTRATION_ASSET}" data-service-worker="${SERVICE_WORKER_URL}"></script>`,
    );
  }

  return markup.join('\n');
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

function atomicWriteTextFile(filePath, contents) {
  const temporaryPath = path.join(
    path.dirname(filePath),
    `.${path.basename(filePath)}.${process.pid}.${crypto.randomUUID()}.tmp`,
  );
  const flags = fs.constants.O_WRONLY | fs.constants.O_CREAT | fs.constants.O_EXCL | (fs.constants.O_NOFOLLOW ?? 0);
  let descriptor;

  try {
    descriptor = fs.openSync(temporaryPath, flags, 0o644);
    fs.writeFileSync(descriptor, contents, 'utf8');
    fs.fsyncSync(descriptor);
    fs.closeSync(descriptor);
    descriptor = undefined;
    fs.renameSync(temporaryPath, filePath);
  } finally {
    if (descriptor !== undefined) fs.closeSync(descriptor);
    try {
      fs.unlinkSync(temporaryPath);
    } catch (error) {
      if (error?.code !== 'ENOENT') throw error;
    }
  }
}

export function preparePwaServiceWorker({ distDir = path.join(resolveProjectRoot(), 'dist') } = {}) {
  const serviceWorkerPath = path.join(distDir, 'sw.js');
  let serviceWorker;
  try {
    serviceWorker = fs.readFileSync(serviceWorkerPath, 'utf8');
  } catch (error) {
    if (error?.code === 'ENOENT') return false;
    throw error;
  }
  const offlineAssetsDeclaration = buildExportAssetsDeclaration(discoverOfflineExportAssets({ distDir }));
  const cacheVersionDeclaration = buildCacheVersionDeclaration(buildCacheVersion({ distDir }));
  const nextServiceWorker = serviceWorker
    .replace(/const CACHE_VERSION = ['"][^'"]+['"];/, cacheVersionDeclaration)
    .replace(/const EXPORT_ASSETS = \[[\s\S]*?\];/, offlineAssetsDeclaration);
  if (nextServiceWorker === serviceWorker) return false;

  atomicWriteTextFile(serviceWorkerPath, nextServiceWorker);
  return true;
}

export function preparePwaDist({
  distDir = path.join(resolveProjectRoot(), 'dist'),
} = {}) {
  const indexPath = path.join(distDir, 'index.html');
  const originalHtml = fs.readFileSync(indexPath, 'utf8');
  const html = originalHtml.replace(LEGACY_INLINE_REGISTRATION_PATTERN, '');
  const needsManifest = !html.includes('href="/manifest.json"');
  const needsServiceWorker = !html.includes(`src="${SERVICE_WORKER_REGISTRATION_ASSET}"`);
  const needsStyle = !html.includes(`href="${PWA_STYLE_ASSET}"`);

  let htmlChanged = html !== originalHtml;
  if (needsManifest || needsServiceWorker || needsStyle) {
    const headMarkup = buildPwaHeadMarkup({
      includeMetadata: needsManifest,
      includeRegistration: needsServiceWorker,
      includeStyle: needsStyle,
    });
    const injected = html.replace('</head>', `${headMarkup}\n</head>`);
    atomicWriteTextFile(indexPath, injected);
    htmlChanged = true;
  } else if (htmlChanged) {
    atomicWriteTextFile(indexPath, html);
  }

  const serviceWorkerChanged = preparePwaServiceWorker({ distDir });
  return htmlChanged || serviceWorkerChanged;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const changed = preparePwaDist();
  console.log(changed ? 'Prepared dist/index.html with PWA metadata.' : 'dist/index.html already contains PWA metadata.');
}
