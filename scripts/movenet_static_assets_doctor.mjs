import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  MOVENET_STATIC_ASSET_SCHEMA_VERSION,
  movenetStaticAssetConfig,
} from './download_movenet_static_assets.mjs';

export const MOVENET_STATIC_ASSETS_REPORT_SCHEMA_VERSION = 'movebeta.movenet-static-assets-report.v1';

const forbiddenValuePattern =
  /(file:\/\/|content:\/\/|asset:\/\/|ph:\/\/|\/Users\/|\/private\/|\/var\/mobile\/|[A-Za-z]:\\|\.mov\b|\.mp4\b|BEGIN PRIVATE KEY|ghp_[A-Za-z0-9_]+|github_pat_[A-Za-z0-9_]+|pat_[A-Za-z0-9_]+|sk_live_[A-Za-z0-9_]+|sk_test_[A-Za-z0-9_]+|bearer\s+[A-Za-z0-9._-]+|eyJ[A-Za-z0-9_-]{20,})/i;

export function resolveProjectRoot() {
  return path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
}

export function resolveDefaultJsonPath(rootDir = resolveProjectRoot()) {
  return path.join(rootDir, 'docs/sdlc/movenet-static-assets-report.json');
}

export function resolveDefaultMarkdownPath(rootDir = resolveProjectRoot()) {
  return path.join(rootDir, 'docs/sdlc/movenet-static-assets-report.md');
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

function existsAndNonEmpty(filePath) {
  return fs.existsSync(filePath) && fs.statSync(filePath).size > 0;
}

function check({ action, detail, key, label, status }) {
  return { action, detail, key, label, status };
}

function containsForbiddenValue(value) {
  if (typeof value === 'string') return forbiddenValuePattern.test(value);
  if (Array.isArray(value)) return value.some(containsForbiddenValue);
  if (value && typeof value === 'object') return Object.values(value).some(containsForbiddenValue);
  return false;
}

function assetFilePath(rootDir, publicAssetPath) {
  return path.join(rootDir, 'public', publicAssetPath.replace(/^\//, ''));
}

function distAssetFilePath(rootDir, publicAssetPath) {
  return path.join(rootDir, 'dist', publicAssetPath.replace(/^\//, ''));
}

function weightShardAssets(modelJson, modelUrl) {
  const modelDir = path.posix.dirname(modelUrl);
  if (!Array.isArray(modelJson?.weightsManifest)) return [];
  return modelJson.weightsManifest.flatMap((group) =>
    Array.isArray(group?.paths)
      ? group.paths.map((assetPath) => `${modelDir}/${String(assetPath).replace(/^\.\//, '')}`)
      : [],
  );
}

export function assertMoveNetStaticAssetsReportIsShareSafe(report) {
  if (containsForbiddenValue(report)) {
    throw new Error('MoveNet static assets report contains credential values, local paths, raw artifacts, raw video references, or token-like data.');
  }
  return report;
}

export function buildMoveNetStaticAssetsReport({
  generatedAt = new Date().toISOString(),
  rootDir = resolveProjectRoot(),
} = {}) {
  const appConfig = readJsonIfExists(path.join(rootDir, 'app.json'))?.expo?.extra ?? {};
  const publicManifest = readJsonIfExists(path.join(rootDir, movenetStaticAssetConfig.publicManifestPath));
  const sourceModelJson = readJsonIfExists(assetFilePath(rootDir, movenetStaticAssetConfig.modelUrl));
  const distManifest = readJsonIfExists(path.join(rootDir, 'dist/model-assets.json'));
  const distModelJson = readJsonIfExists(distAssetFilePath(rootDir, movenetStaticAssetConfig.modelUrl));
  const serviceWorker = readTextIfExists(path.join(rootDir, 'public/sw.js')) ?? '';
  const modelUrl = publicManifest?.modelUrl ?? movenetStaticAssetConfig.modelUrl;
  const sourceShards = weightShardAssets(sourceModelJson, modelUrl);
  const manifestAssets = Array.isArray(publicManifest?.assets) ? publicManifest.assets : [];
  const expectedAssets = [modelUrl, ...sourceShards];
  const sourceAssetsPresent =
    expectedAssets.length > 1 && expectedAssets.every((assetPath) => existsAndNonEmpty(assetFilePath(rootDir, assetPath)));
  const distAssetsPresent =
    expectedAssets.length > 1 &&
    fs.existsSync(path.join(rootDir, 'dist/model-assets.json')) &&
    expectedAssets.every((assetPath) => existsAndNonEmpty(distAssetFilePath(rootDir, assetPath)));
  const appModelUrl = appConfig.tfjsMoveNetModelUrl;

  const checks = [
    check({
      action: 'Run npm run model:movenet:assets:download to refresh public/model-assets.json and model files.',
      detail:
        publicManifest?.schemaVersion === MOVENET_STATIC_ASSET_SCHEMA_VERSION
          ? 'Static model asset manifest exists with the expected schema version.'
          : 'Static model asset manifest is missing or has an unexpected schema version.',
      key: 'asset-manifest',
      label: 'Static asset manifest',
      status: publicManifest?.schemaVersion === MOVENET_STATIC_ASSET_SCHEMA_VERSION ? 'verified' : 'blocked',
    }),
    check({
      action: 'Keep app.json expo.extra.tfjsMoveNetModelUrl aligned with the static manifest modelUrl.',
      detail:
        appModelUrl === modelUrl
          ? `App config points TensorFlow.js MoveNet at ${modelUrl}.`
          : `App config model URL is ${String(appModelUrl || 'missing')} but expected ${modelUrl}.`,
      key: 'app-model-url',
      label: 'App model URL',
      status: appModelUrl === modelUrl ? 'verified' : 'blocked',
    }),
    check({
      action: 'Download a valid TFJS graph model JSON before exporting the PWA.',
      detail:
        Array.isArray(sourceModelJson?.weightsManifest) && sourceModelJson.weightsManifest.length > 0
          ? 'Source model.json includes a TensorFlow.js weights manifest.'
          : 'Source model.json is missing or does not include a weights manifest.',
      key: 'source-model-json',
      label: 'Source model JSON',
      status: Array.isArray(sourceModelJson?.weightsManifest) && sourceModelJson.weightsManifest.length > 0 ? 'verified' : 'blocked',
    }),
    check({
      action: 'Keep every weight shard referenced by model.json present under public/models.',
      detail: sourceAssetsPresent
        ? `Source model graph and ${sourceShards.length} weight shard(s) are present and non-empty.`
        : 'One or more source model graph or weight shard files are missing or empty.',
      key: 'source-weight-shards',
      label: 'Source weight shards',
      status: sourceAssetsPresent ? 'verified' : 'blocked',
    }),
    check({
      action: 'Keep public/sw.js loading /model-assets.json and pre-caching listed model files.',
      detail:
        serviceWorker.includes('/model-assets.json') &&
        serviceWorker.includes('cacheModelAssets') &&
        serviceWorker.includes("url.pathname.startsWith('/models/')")
          ? 'Service worker pre-caches the static model asset manifest and serves model files cache-first.'
          : 'Service worker does not yet pre-cache the static model asset manifest and model file path.',
      key: 'service-worker-model-cache',
      label: 'Service worker model cache',
      status:
        serviceWorker.includes('/model-assets.json') &&
        serviceWorker.includes('cacheModelAssets') &&
        serviceWorker.includes("url.pathname.startsWith('/models/')")
          ? 'verified'
          : 'blocked',
    }),
    check({
      action: 'Run npm run export:web after refreshing model assets so dist contains the same static model files.',
      detail: distAssetsPresent
        ? `Exported dist contains model-assets.json, model.json, and ${sourceShards.length} weight shard(s).`
        : 'Exported dist is missing model-assets.json, model.json, or one or more weight shard files.',
      key: 'exported-model-assets',
      label: 'Exported model assets',
      status: distAssetsPresent ? 'verified' : 'blocked',
    }),
    check({
      action: 'Keep public/model-assets.json asset list aligned with model.json weight references.',
      detail:
        expectedAssets.length > 1 && expectedAssets.every((assetPath) => manifestAssets.includes(assetPath))
          ? 'Static asset manifest lists every model graph and weight shard path.'
          : 'Static asset manifest does not list every model graph and weight shard path.',
      key: 'manifest-asset-list',
      label: 'Manifest asset list',
      status:
        expectedAssets.length > 1 && expectedAssets.every((assetPath) => manifestAssets.includes(assetPath))
          ? 'verified'
          : 'blocked',
    }),
  ];
  const verifiedCount = checks.filter((item) => item.status === 'verified').length;
  const status = verifiedCount === checks.length ? 'ready' : 'blocked';
  const report = {
    checks,
    generatedAt,
    modelName: publicManifest?.modelName ?? movenetStaticAssetConfig.modelName,
    modelUrl,
    privacy: {
      credentialValuesIncluded: false,
      localPathsIncluded: false,
      rawArtifactsIncluded: false,
      rawVideoIncluded: false,
      tokenLikeValuesIncluded: false,
    },
    schemaVersion: MOVENET_STATIC_ASSETS_REPORT_SCHEMA_VERSION,
    summary: {
      checkCount: checks.length,
      distAssetCount: distAssetsPresent ? expectedAssets.length + 1 : 0,
      nextAction:
        status === 'ready'
          ? 'Keep static MoveNet assets versioned and rerun web smoke after model updates.'
          : 'Run npm run model:movenet:assets:download, npm run export:web, then rerun this doctor.',
      shardCount: sourceShards.length,
      sourceAssetCount: sourceAssetsPresent ? expectedAssets.length : 0,
      status,
      totalBytes: Number(publicManifest?.summary?.totalBytes ?? 0),
      verifiedCount,
    },
  };

  return assertMoveNetStaticAssetsReportIsShareSafe(report);
}

export function renderMoveNetStaticAssetsMarkdown(report) {
  const rows = report.checks
    .map((item) => `| ${item.label} | ${item.status} | ${item.detail.replace(/\n/g, ' ')} | ${item.action} |`)
    .join('\n');

  return `# MoveNet Static Assets Report

Generated: ${report.generatedAt}

- Status: ${report.summary.status}
- Checks: ${report.summary.verifiedCount}/${report.summary.checkCount}
- Model: ${report.modelName}
- Model URL: ${report.modelUrl}
- Source assets: ${report.summary.sourceAssetCount}
- Exported assets: ${report.summary.distAssetCount}
- Weight shards: ${report.summary.shardCount}
- Total bytes: ${report.summary.totalBytes}
- Credential values included: no
- Local paths included: no
- Raw video included: no
- Next action: ${report.summary.nextAction}

| Check | Status | Detail | Action |
| --- | --- | --- | --- |
${rows}
`;
}

export function writeMoveNetStaticAssetsReport({
  jsonPath = resolveDefaultJsonPath(),
  markdownPath = resolveDefaultMarkdownPath(),
  report,
} = {}) {
  const rootDir = path.resolve(path.dirname(jsonPath), '../..');
  const nextReport = report ?? buildMoveNetStaticAssetsReport({ rootDir });
  fs.mkdirSync(path.dirname(jsonPath), { recursive: true });
  fs.writeFileSync(jsonPath, `${JSON.stringify(nextReport, null, 2)}\n`);
  fs.writeFileSync(markdownPath, renderMoveNetStaticAssetsMarkdown(nextReport));
  return { jsonPath, markdownPath, report: nextReport };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const { jsonPath, markdownPath, report } = writeMoveNetStaticAssetsReport();
  console.log(`Wrote MoveNet static assets report to ${jsonPath}`);
  console.log(`Wrote MoveNet static assets summary to ${markdownPath}`);
  console.log(`Status: ${report.summary.status}; checks: ${report.summary.verifiedCount}/${report.summary.checkCount}; assets: ${report.summary.sourceAssetCount}`);
  if (report.summary.status !== 'ready') {
    process.exitCode = 1;
  }
}
