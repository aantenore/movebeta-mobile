import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const PWA_READINESS_SCHEMA_VERSION = 'movebeta.pwa-readiness.v1';

export function resolveProjectRoot() {
  return path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
}

export function resolveDefaultJsonOutputPath(rootDir = resolveProjectRoot()) {
  return path.join(rootDir, 'docs/sdlc/pwa-readiness-report.json');
}

export function resolveDefaultMarkdownOutputPath(rootDir = resolveProjectRoot()) {
  return path.join(rootDir, 'docs/sdlc/pwa-readiness-report.md');
}

function readTextIfExists(filePath) {
  if (!fs.existsSync(filePath)) return undefined;
  return fs.readFileSync(filePath, 'utf8');
}

function readJsonIfExists(filePath) {
  const text = readTextIfExists(filePath);
  if (!text) return undefined;
  return JSON.parse(text);
}

function check(key, label, passed, detail) {
  return {
    detail,
    key,
    label,
    status: passed ? 'verified' : 'blocked',
  };
}

function manifestHasIcon(manifest, size) {
  return Array.isArray(manifest?.icons) && manifest.icons.some((icon) => String(icon?.sizes ?? '').includes(size));
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

function exportedOfflineAssetPaths(rootDir) {
  const distDir = path.join(rootDir, 'dist');
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

export function buildPwaReadinessReport({
  generatedAt = new Date().toISOString(),
  rootDir = resolveProjectRoot(),
} = {}) {
  const manifestPath = path.join(rootDir, 'public/manifest.json');
  const serviceWorkerPath = path.join(rootDir, 'public/sw.js');
  const vercelConfigPath = path.join(rootDir, 'vercel.json');
  const distManifestPath = path.join(rootDir, 'dist/manifest.json');
  const distServiceWorkerPath = path.join(rootDir, 'dist/sw.js');
  const distModelAssetManifestPath = path.join(rootDir, 'dist/model-assets.json');
  const distIndexPath = path.join(rootDir, 'dist/index.html');
  const manifest = readJsonIfExists(manifestPath);
  const modelAssetManifest = readJsonIfExists(path.join(rootDir, 'public/model-assets.json'));
  const distModelAssetManifest = readJsonIfExists(distModelAssetManifestPath);
  const vercelConfig = readJsonIfExists(vercelConfigPath);
  const serviceWorker = readTextIfExists(serviceWorkerPath) ?? '';
  const distServiceWorker = readTextIfExists(distServiceWorkerPath) ?? '';
  const distIndex = readTextIfExists(distIndexPath) ?? '';
  const modelAssets = Array.isArray(modelAssetManifest?.assets) ? modelAssetManifest.assets : [];
  const offlineExportAssets = exportedOfflineAssetPaths(rootDir);
  const exportedModelAssetsPresent =
    fs.existsSync(distModelAssetManifestPath) &&
    distModelAssetManifest?.schemaVersion === 'movebeta.static-model-assets.v1' &&
    modelAssets.length > 0 &&
    modelAssets.every(
      (assetPath) =>
        typeof assetPath === 'string' &&
        assetPath.startsWith('/models/') &&
        fs.existsSync(path.join(rootDir, 'dist', assetPath.replace(/^\//, ''))),
    );

  const checks = [
    check(
      'manifest-source',
      'Source web manifest',
      Boolean(manifest),
      'public/manifest.json exists and is valid JSON.',
    ),
    check(
      'manifest-installability',
      'Manifest installability fields',
      manifest?.name === 'MoveBeta On-Device Climbing Coach' &&
        manifest?.short_name === 'MoveBeta' &&
        manifest?.start_url === '/' &&
        manifest?.scope === '/' &&
        manifest?.display === 'standalone' &&
        manifestHasIcon(manifest, '192x192') &&
        manifestHasIcon(manifest, '512x512'),
      'Manifest includes name, short name, start URL, scope, standalone display, and 192/512 icons.',
    ),
    check(
      'service-worker-source',
      'Source service worker',
      serviceWorker.includes("self.addEventListener('install'") &&
        serviceWorker.includes("self.addEventListener('fetch'") &&
        serviceWorker.includes('caches.open'),
      'public/sw.js registers install/fetch handlers and uses Cache Storage.',
    ),
    check(
      'html-registration',
      'HTML manifest and service worker registration',
      distIndex.includes('/manifest.json') && distIndex.includes('/sw.js'),
      'Exported dist/index.html links the manifest and registers the service worker.',
    ),
    check(
      'exported-static-assets',
      'Exported PWA static assets',
      fs.existsSync(distManifestPath) &&
        fs.existsSync(distServiceWorkerPath) &&
        fs.existsSync(path.join(rootDir, 'dist/pwa/icon-192.png')) &&
        fs.existsSync(path.join(rootDir, 'dist/pwa/icon-512.png')),
      'Expo web export copied manifest, service worker, and PWA icons into dist.',
    ),
    check(
      'exported-model-cache-assets',
      'Exported static model cache assets',
      serviceWorker.includes('/model-assets.json') &&
        serviceWorker.includes('cacheModelAssets') &&
        serviceWorker.includes("url.pathname.startsWith('/models/')") &&
        exportedModelAssetsPresent,
      'Exported dist includes the static MoveNet manifest and every listed model file, and the service worker cache path covers them.',
    ),
    check(
      'exported-offline-cache-assets',
      'Exported offline app cache assets',
      offlineExportAssets.length > 0 &&
        distServiceWorker.includes('const EXPORT_ASSETS = [') &&
        offlineExportAssets.every((assetPath) => distServiceWorker.includes(`"${assetPath}"`)),
      'Exported service worker pre-caches Expo JS bundles, router assets, and metadata needed for offline app boot.',
    ),
    check(
      'vercel-static-config',
      'Vercel static deployment config',
      vercelConfig?.framework === null &&
        vercelConfig?.buildCommand === 'npm run export:web' &&
        vercelConfig?.outputDirectory === 'dist' &&
        Array.isArray(vercelConfig?.headers) &&
        Array.isArray(vercelConfig?.rewrites),
      'vercel.json deploys the Expo web export from dist with static headers and SPA fallback.',
    ),
    check(
      'no-backend-surface',
      'No backend surface required',
      !fs.existsSync(path.join(rootDir, 'api')) && !fs.existsSync(path.join(rootDir, 'pages/api')),
      'Repository does not include Vercel API routes or a backend directory for the PWA path.',
    ),
  ];
  const verifiedCount = checks.filter((item) => item.status === 'verified').length;
  const status = verifiedCount === checks.length ? 'ready' : 'blocked';

  return {
    checks,
    generatedAt,
    privacy: {
      backendRequired: false,
      credentialValuesIncluded: false,
      localPathsIncluded: false,
      rawArtifactsIncluded: false,
      rawVideoIncluded: false,
    },
    schemaVersion: PWA_READINESS_SCHEMA_VERSION,
    summary: {
      checkCount: checks.length,
      nextAction:
        status === 'ready'
          ? 'Deploy the static dist output to Vercel, then run the web smoke against the deployment URL.'
          : 'Run npm run export:web, then rerun npm run web:pwa:check before deploying.',
      status,
      verifiedCount,
    },
  };
}

export function renderPwaReadinessMarkdown(report) {
  const rows = report.checks
    .map((item) => `| ${item.label} | ${item.status} | ${item.detail} |`)
    .join('\n');

  return `# PWA Readiness Report

Generated: ${report.generatedAt}

- Status: ${report.summary.status}
- Checks: ${report.summary.verifiedCount}/${report.summary.checkCount}
- Backend required: no
- Credential values included: no
- Local paths included: no
- Raw artifacts included: no
- Raw video included: no
- Next action: ${report.summary.nextAction}

| Check | Status | Detail |
| --- | --- | --- |
${rows}
`;
}

export function writePwaReadinessReport({
  jsonOutputPath,
  markdownOutputPath,
  report,
}) {
  fs.mkdirSync(path.dirname(jsonOutputPath), { recursive: true });
  fs.mkdirSync(path.dirname(markdownOutputPath), { recursive: true });
  fs.writeFileSync(jsonOutputPath, `${JSON.stringify(report, null, 2)}\n`);
  fs.writeFileSync(markdownOutputPath, renderPwaReadinessMarkdown(report));
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const rootDir = resolveProjectRoot();
  const report = buildPwaReadinessReport({ rootDir });
  const jsonOutputPath = resolveDefaultJsonOutputPath(rootDir);
  const markdownOutputPath = resolveDefaultMarkdownOutputPath(rootDir);

  writePwaReadinessReport({ jsonOutputPath, markdownOutputPath, report });

  console.log(`Wrote PWA readiness report to ${jsonOutputPath}`);
  console.log(`Wrote PWA readiness summary to ${markdownOutputPath}`);
  console.log(`Status: ${report.summary.status}; checks: ${report.summary.verifiedCount}/${report.summary.checkCount}`);

  if (report.summary.status !== 'ready') {
    process.exitCode = 1;
  }
}
