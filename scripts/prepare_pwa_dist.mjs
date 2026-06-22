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

export function preparePwaDist({
  distDir = path.join(resolveProjectRoot(), 'dist'),
} = {}) {
  const indexPath = path.join(distDir, 'index.html');
  const html = fs.readFileSync(indexPath, 'utf8');
  const needsManifest = !html.includes('href="/manifest.json"');
  const needsServiceWorker = !html.includes("register('/sw.js')") && !html.includes('register("/sw.js")');
  if (!needsManifest && !needsServiceWorker) return false;

  const injected = html.replace('</head>', `${buildPwaHeadMarkup()}\n</head>`);
  fs.writeFileSync(indexPath, injected);
  return true;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const changed = preparePwaDist();
  console.log(changed ? 'Prepared dist/index.html with PWA metadata.' : 'dist/index.html already contains PWA metadata.');
}
