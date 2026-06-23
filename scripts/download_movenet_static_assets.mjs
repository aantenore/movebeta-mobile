import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const MOVENET_STATIC_ASSET_SCHEMA_VERSION = 'movebeta.static-model-assets.v1';

export const movenetStaticAssetConfig = {
  modelName: 'MoveNet SinglePose Lightning',
  modelUrl: '/models/movenet/singlepose/lightning/4/model.json',
  publicManifestPath: 'public/model-assets.json',
  publicModelDir: 'public/models/movenet/singlepose/lightning/4',
  sourceBaseUrl: 'https://tfhub.dev/google/tfjs-model/movenet/singlepose/lightning/4/',
  sourceModelUrl: 'https://tfhub.dev/google/tfjs-model/movenet/singlepose/lightning/4/model.json?tfjs-format=file',
};

export function resolveProjectRoot() {
  return path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
}

function sha256(buffer) {
  return crypto.createHash('sha256').update(buffer).digest('hex');
}

function assertSafeRelativeAsset(assetPath) {
  if (assetPath.includes('..') || path.isAbsolute(assetPath) || assetPath.startsWith('file:') || assetPath.length === 0) {
    throw new Error(`Unsafe model asset path: ${assetPath}`);
  }
  return assetPath.replace(/^\.\//, '');
}

function isHtmlPayload(buffer) {
  return buffer.subarray(0, 256).toString('utf8').trimStart().toLowerCase().startsWith('<!doctype html') ||
    buffer.subarray(0, 256).toString('utf8').trimStart().toLowerCase().startsWith('<html');
}

function withTfhubFormatFile(url) {
  if (!url.startsWith('https://tfhub.dev/')) return url;
  const parsed = new URL(url);
  parsed.searchParams.set('tfjs-format', 'file');
  return parsed.toString();
}

async function fetchBuffer(url, { allowTfhubFormatRetry = false } = {}) {
  const response = await fetch(url);
  if (response.ok) {
    const buffer = Buffer.from(await response.arrayBuffer());
    if (allowTfhubFormatRetry && url.startsWith('https://tfhub.dev/') && !url.includes('tfjs-format=file') && isHtmlPayload(buffer)) {
      const retryResponse = await fetch(withTfhubFormatFile(url));
      if (retryResponse.ok) {
        return Buffer.from(await retryResponse.arrayBuffer());
      }
    }
    return buffer;
  }

  if (allowTfhubFormatRetry && url.startsWith('https://tfhub.dev/') && !url.includes('?')) {
    const retryUrl = withTfhubFormatFile(url);
    const retryResponse = await fetch(retryUrl);
    if (retryResponse.ok) {
      return Buffer.from(await retryResponse.arrayBuffer());
    }
  }

  throw new Error(`Failed to download ${url}: ${response.status} ${response.statusText}`);
}

function writeBuffer(filePath, buffer) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, buffer);
  return {
    bytes: buffer.byteLength,
    path: filePath,
    sha256: sha256(buffer),
  };
}

function normalizeWeightPath(assetPath) {
  const rawPath = String(assetPath);
  if (/^https?:\/\//i.test(rawPath)) {
    const url = new URL(rawPath);
    return assertSafeRelativeAsset(path.posix.basename(url.pathname));
  }
  return assertSafeRelativeAsset(rawPath);
}

function sourceUrlForWeightPath(assetPath) {
  const rawPath = String(assetPath);
  const sourceUrl = /^https?:\/\//i.test(rawPath) ? rawPath : new URL(rawPath, movenetStaticAssetConfig.sourceBaseUrl).toString();
  return withTfhubFormatFile(sourceUrl);
}

function normalizeModelJson(modelJson) {
  if (!Array.isArray(modelJson.weightsManifest)) {
    throw new Error('Downloaded MoveNet model.json does not include a TensorFlow.js weights manifest.');
  }
  const seenLocalPaths = new Set();
  const weightFiles = [];
  const nextModelJson = {
    ...modelJson,
    weightsManifest: modelJson.weightsManifest.map((group) => {
      const paths = Array.isArray(group?.paths) ? group.paths : [];
      const localPaths = paths.map((assetPath) => {
        const localPath = normalizeWeightPath(assetPath);
        if (seenLocalPaths.has(localPath)) {
          throw new Error(`Duplicate normalized model asset path: ${localPath}`);
        }
        seenLocalPaths.add(localPath);
        weightFiles.push({
          localPath,
          sourceUrl: sourceUrlForWeightPath(assetPath),
        });
        return localPath;
      });
      return {
        ...group,
        paths: localPaths,
      };
    }),
  };

  return { modelJson: nextModelJson, weightFiles };
}

export async function downloadMoveNetStaticAssets({
  generatedAt = new Date().toISOString(),
  rootDir = resolveProjectRoot(),
} = {}) {
  const modelDir = path.join(rootDir, movenetStaticAssetConfig.publicModelDir);
  const publicManifestPath = path.join(rootDir, movenetStaticAssetConfig.publicManifestPath);
  const sourceModelBuffer = await fetchBuffer(movenetStaticAssetConfig.sourceModelUrl, { allowTfhubFormatRetry: true });
  const sourceModelJson = JSON.parse(sourceModelBuffer.toString('utf8'));
  const { modelJson, weightFiles } = normalizeModelJson(sourceModelJson);
  const modelBuffer = Buffer.from(`${JSON.stringify(modelJson, null, 2)}\n`, 'utf8');
  if (weightFiles.length === 0) {
    throw new Error('Downloaded MoveNet model.json does not include weight shard paths.');
  }

  const files = [];
  const modelFile = writeBuffer(path.join(modelDir, 'model.json'), modelBuffer);
  files.push({
    bytes: modelFile.bytes,
    path: movenetStaticAssetConfig.modelUrl,
    sha256: modelFile.sha256,
  });

  for (const asset of weightFiles) {
    const buffer = await fetchBuffer(asset.sourceUrl, { allowTfhubFormatRetry: true });
    const target = writeBuffer(path.join(modelDir, asset.localPath), buffer);
    files.push({
      bytes: target.bytes,
      path: `/models/movenet/singlepose/lightning/4/${asset.localPath}`,
      sha256: target.sha256,
    });
  }

  const manifest = {
    assets: files.map((file) => file.path),
    files,
    generatedAt,
    modelName: movenetStaticAssetConfig.modelName,
    modelUrl: movenetStaticAssetConfig.modelUrl,
    schemaVersion: MOVENET_STATIC_ASSET_SCHEMA_VERSION,
    source: {
      baseUrl: movenetStaticAssetConfig.sourceBaseUrl,
      modelUrl: movenetStaticAssetConfig.sourceModelUrl,
    },
    summary: {
      fileCount: files.length,
      shardCount: weightFiles.length,
      totalBytes: files.reduce((total, file) => total + file.bytes, 0),
    },
  };

  fs.mkdirSync(path.dirname(publicManifestPath), { recursive: true });
  fs.writeFileSync(publicManifestPath, `${JSON.stringify(manifest, null, 2)}\n`);

  return manifest;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const manifest = await downloadMoveNetStaticAssets();
  console.log(`Wrote ${movenetStaticAssetConfig.publicManifestPath}`);
  console.log(`Model assets: ${manifest.summary.fileCount}; shards: ${manifest.summary.shardCount}; bytes: ${manifest.summary.totalBytes}`);
}
