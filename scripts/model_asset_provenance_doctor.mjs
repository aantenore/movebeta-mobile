import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  MOVENET_STATIC_ASSET_SCHEMA_VERSION,
  movenetStaticAssetConfig,
} from './download_movenet_static_assets.mjs';

export const MODEL_ASSET_PROVENANCE_REPORT_SCHEMA_VERSION = 'movebeta.model-asset-provenance-report.v1';

const attributionNoticePath = 'docs/sdlc/model-asset-attribution.md';

const forbiddenValuePattern =
  /(file:\/\/|content:\/\/|asset:\/\/|ph:\/\/|\/Users\/|\/private\/|\/var\/mobile\/|[A-Za-z]:\\|\.mov\b|\.mp4\b|BEGIN PRIVATE KEY|ghp_[A-Za-z0-9_]+|github_pat_[A-Za-z0-9_]+|pat_[A-Za-z0-9_]+|sk_live_[A-Za-z0-9_]+|sk_test_[A-Za-z0-9_]+|bearer\s+[A-Za-z0-9._-]+|eyJ[A-Za-z0-9_-]{20,})/i;

export function resolveProjectRoot() {
  return path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
}

export function resolveDefaultJsonPath(rootDir = resolveProjectRoot()) {
  return path.join(rootDir, 'docs/sdlc/model-asset-provenance-report.json');
}

export function resolveDefaultMarkdownPath(rootDir = resolveProjectRoot()) {
  return path.join(rootDir, 'docs/sdlc/model-asset-provenance-report.md');
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

function sha256File(filePath) {
  return crypto.createHash('sha256').update(fs.readFileSync(filePath)).digest('hex');
}

function containsForbiddenValue(value) {
  if (typeof value === 'string') return forbiddenValuePattern.test(value);
  if (Array.isArray(value)) return value.some(containsForbiddenValue);
  if (value && typeof value === 'object') return Object.values(value).some(containsForbiddenValue);
  return false;
}

function check({ action, detail, key, label, status }) {
  return { action, detail, key, label, status };
}

function isSafePublicModelPath(value) {
  return (
    typeof value === 'string' &&
    value.startsWith('/models/') &&
    !value.includes('..') &&
    !/^https?:\/\//i.test(value) &&
    !forbiddenValuePattern.test(value)
  );
}

function manifestFilePath(rootDir, publicPath) {
  return path.join(rootDir, 'public', publicPath.replace(/^\//, ''));
}

function isKnownSourceUrl(value) {
  if (typeof value !== 'string') return false;
  try {
    const parsed = new URL(value);
    return (
      parsed.protocol === 'https:' &&
      parsed.hostname === 'tfhub.dev' &&
      parsed.pathname.includes('/google/tfjs-model/movenet/singlepose/lightning/4')
    );
  } catch {
    return false;
  }
}

function attributionNoticeIsComplete(text = '', sourceModelUrl = movenetStaticAssetConfig.sourceModelUrl) {
  const requiredSnippets = [
    'MoveNet SinglePose Lightning',
    'TensorFlow Hub',
    sourceModelUrl,
    'public/model-assets.json',
    'npm run model:assets:provenance',
  ];
  return requiredSnippets.every((snippet) => text.includes(snippet));
}

function integrityResults(rootDir, files) {
  return files.map((file) => {
    const filePath = isSafePublicModelPath(file.path) ? manifestFilePath(rootDir, file.path) : '';
    const exists = filePath.length > 0 && fs.existsSync(filePath) && fs.statSync(filePath).size > 0;
    const actualSha256 = exists ? sha256File(filePath) : '';
    return {
      bytes: Number(file.bytes ?? 0),
      exists,
      path: file.path,
      sha256: file.sha256,
      sha256Matches: exists && typeof file.sha256 === 'string' && actualSha256 === file.sha256,
    };
  });
}

export function assertModelAssetProvenanceReportIsShareSafe(report) {
  if (containsForbiddenValue(report)) {
    throw new Error('Model asset provenance report contains credential values, local paths, raw artifacts, raw video references, or token-like data.');
  }
  return report;
}

export function buildModelAssetProvenanceReport({
  generatedAt = new Date().toISOString(),
  rootDir = resolveProjectRoot(),
} = {}) {
  const manifest = readJsonIfExists(path.join(rootDir, movenetStaticAssetConfig.publicManifestPath));
  const notice = readTextIfExists(path.join(rootDir, attributionNoticePath)) ?? '';
  const files = Array.isArray(manifest?.files) ? manifest.files : [];
  const assets = Array.isArray(manifest?.assets) ? manifest.assets : [];
  const sourceModelUrl = manifest?.source?.modelUrl;
  const sourceBaseUrl = manifest?.source?.baseUrl;
  const safeAssetPaths = assets.every(isSafePublicModelPath) && files.every((file) => isSafePublicModelPath(file.path));
  const filesMatchAssets =
    files.length > 0 && assets.length === files.length && files.every((file) => assets.includes(file.path));
  const hashesRecorded = files.every(
    (file) => Number(file.bytes) > 0 && typeof file.sha256 === 'string' && /^[a-f0-9]{64}$/i.test(file.sha256),
  );
  const integrity = integrityResults(rootDir, files);
  const localFilesVerified =
    integrity.length > 0 && integrity.every((file) => file.exists && file.bytes > 0 && file.sha256Matches);
  const noticeComplete = attributionNoticeIsComplete(notice, sourceModelUrl ?? movenetStaticAssetConfig.sourceModelUrl);

  const checks = [
    check({
      action: 'Run npm run model:movenet:assets:download before provenance review.',
      detail:
        manifest?.schemaVersion === MOVENET_STATIC_ASSET_SCHEMA_VERSION
          ? 'Static model asset manifest uses the expected schema.'
          : 'Static model asset manifest is missing or has an unexpected schema.',
      key: 'manifest-schema',
      label: 'Manifest schema',
      status: manifest?.schemaVersion === MOVENET_STATIC_ASSET_SCHEMA_VERSION ? 'verified' : 'blocked',
    }),
    check({
      action: 'Keep MoveNet source URLs pinned to the official TensorFlow Hub model path.',
      detail:
        isKnownSourceUrl(sourceModelUrl) && isKnownSourceUrl(sourceBaseUrl)
          ? 'Manifest source URLs point to the TensorFlow Hub MoveNet SinglePose Lightning model path.'
          : 'Manifest source URLs are missing or do not point to the expected TensorFlow Hub model path.',
      key: 'official-source-url',
      label: 'Official source URL',
      status: isKnownSourceUrl(sourceModelUrl) && isKnownSourceUrl(sourceBaseUrl) ? 'verified' : 'blocked',
    }),
    check({
      action: 'Keep model asset paths same-origin under /models and aligned with the file inventory.',
      detail:
        safeAssetPaths && filesMatchAssets
          ? `Manifest lists ${files.length} same-origin model asset file(s).`
          : 'Manifest asset paths are unsafe or do not match the file inventory.',
      key: 'asset-inventory',
      label: 'Asset inventory',
      status: safeAssetPaths && filesMatchAssets ? 'verified' : 'blocked',
    }),
    check({
      action: 'Regenerate public/model-assets.json whenever a model graph or shard changes.',
      detail:
        hashesRecorded && localFilesVerified
          ? 'Every model file exists locally and matches its recorded SHA-256 digest.'
          : 'One or more model files are missing, empty, missing digests, or no longer match the manifest hash.',
      key: 'hash-integrity',
      label: 'Hash integrity',
      status: hashesRecorded && localFilesVerified ? 'verified' : 'blocked',
    }),
    check({
      action: `Keep ${attributionNoticePath} with release evidence and shipped documentation.`,
      detail: noticeComplete
        ? 'Attribution notice names the model, source, manifest, and provenance refresh command.'
        : 'Attribution notice is missing required model/source/manifest/provenance details.',
      key: 'attribution-notice',
      label: 'Attribution notice',
      status: noticeComplete ? 'verified' : 'blocked',
    }),
    check({
      action: 'Review upstream model terms from the source catalog before commercial distribution.',
      detail:
        'The doctor tracks provenance and attribution evidence, but it does not infer final commercial legal clearance from the downloaded files.',
      key: 'license-review',
      label: 'License review',
      status: 'review',
    }),
  ];
  const blockedCount = checks.filter((item) => item.status === 'blocked').length;
  const reviewCount = checks.filter((item) => item.status === 'review').length;
  const verifiedCount = checks.filter((item) => item.status === 'verified').length;
  const status = blockedCount > 0 ? 'blocked' : reviewCount > 0 ? 'review' : 'ready';
  const report = {
    checks,
    generatedAt,
    modelName: manifest?.modelName ?? movenetStaticAssetConfig.modelName,
    privacy: {
      credentialValuesIncluded: false,
      localPathsIncluded: false,
      rawArtifactsIncluded: false,
      rawVideoIncluded: false,
      tokenLikeValuesIncluded: false,
    },
    schemaVersion: MODEL_ASSET_PROVENANCE_REPORT_SCHEMA_VERSION,
    source: {
      baseUrl: sourceBaseUrl ?? movenetStaticAssetConfig.sourceBaseUrl,
      modelUrl: sourceModelUrl ?? movenetStaticAssetConfig.sourceModelUrl,
      provider: 'TensorFlow Hub',
    },
    summary: {
      blockedCount,
      checkCount: checks.length,
      fileCount: files.length,
      nextAction:
        status === 'blocked'
          ? checks.find((item) => item.status === 'blocked')?.action
          : status === 'review'
            ? 'Review upstream model terms before commercial distribution and keep the attribution notice in release evidence.'
            : 'Keep model provenance, hashes, and attribution notice refreshed when model assets change.',
      reviewCount,
      status,
      totalBytes: Number(manifest?.summary?.totalBytes ?? files.reduce((total, file) => total + Number(file.bytes ?? 0), 0)),
      verifiedCount,
    },
  };

  return assertModelAssetProvenanceReportIsShareSafe(report);
}

export function renderModelAssetProvenanceMarkdown(report) {
  const rows = report.checks
    .map((item) => `| ${item.label} | ${item.status} | ${item.detail.replace(/\n/g, ' ')} | ${item.action} |`)
    .join('\n');

  return `# Model Asset Provenance Report

Generated: ${report.generatedAt}

- Status: ${report.summary.status}
- Checks: ${report.summary.verifiedCount}/${report.summary.checkCount} verified
- Review checks: ${report.summary.reviewCount}
- Blocked checks: ${report.summary.blockedCount}
- Model: ${report.modelName}
- Source provider: ${report.source.provider}
- Source model URL: ${report.source.modelUrl}
- Files: ${report.summary.fileCount}
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

export function writeModelAssetProvenanceReport({
  jsonPath = resolveDefaultJsonPath(),
  markdownPath = resolveDefaultMarkdownPath(),
  report,
} = {}) {
  const rootDir = path.resolve(path.dirname(jsonPath), '../..');
  const nextReport = report ?? buildModelAssetProvenanceReport({ rootDir });
  fs.mkdirSync(path.dirname(jsonPath), { recursive: true });
  fs.writeFileSync(jsonPath, `${JSON.stringify(nextReport, null, 2)}\n`);
  fs.writeFileSync(markdownPath, renderModelAssetProvenanceMarkdown(nextReport));
  return { jsonPath, markdownPath, report: nextReport };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const { jsonPath, markdownPath, report } = writeModelAssetProvenanceReport();
  console.log(`Wrote model asset provenance report to ${jsonPath}`);
  console.log(`Wrote model asset provenance summary to ${markdownPath}`);
  console.log(
    `Status: ${report.summary.status}; verified: ${report.summary.verifiedCount}/${report.summary.checkCount}; review: ${report.summary.reviewCount}; blocked: ${report.summary.blockedCount}`,
  );
  if (report.summary.status === 'blocked') {
    process.exitCode = 1;
  }
}
