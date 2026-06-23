import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

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

export function preparePwaServiceWorker({ distDir = path.join(resolveProjectRoot(), 'dist') } = {}) {
  const serviceWorkerPath = path.join(distDir, 'sw.js');
  if (!fs.existsSync(serviceWorkerPath)) return false;

  const serviceWorker = fs.readFileSync(serviceWorkerPath, 'utf8');
  const nextDeclaration = buildExportAssetsDeclaration(discoverOfflineExportAssets({ distDir }));
  const nextServiceWorker = serviceWorker.replace(/const EXPORT_ASSETS = \[[\s\S]*?\];/, nextDeclaration);
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
  const serviceWorkerChanged = preparePwaServiceWorker({ distDir });
  if (!needsManifest && !needsServiceWorker) return serviceWorkerChanged;

  const injected = html.replace('</head>', `${buildPwaHeadMarkup()}\n</head>`);
  fs.writeFileSync(indexPath, injected);
  return true;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const changed = preparePwaDist();
  console.log(changed ? 'Prepared dist/index.html with PWA metadata.' : 'dist/index.html already contains PWA metadata.');
}
