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
  trustedFiles: {
    '/models/movenet/singlepose/lightning/4/group1-shard1of2.bin': {
      bytes: 4194304,
      sha256: 'b42c3232bf13b0efc691d3f0693dd3fc74404f709b1deee0a271828af6dbbea2',
    },
    '/models/movenet/singlepose/lightning/4/group1-shard2of2.bin': {
      bytes: 455912,
      sha256: '8253ab965aa3122c08f331777ca395ce9ca19bb9e7cb278b99de1c46dbdeb6dc',
    },
    '/models/movenet/singlepose/lightning/4/model.json': {
      bytes: 313126,
      sha256: '99a7389bb5fdf9bdba119efaca4cfdec254663143c35debc2477d75a8f480204',
    },
  },
};

const trustedModelHosts = new Set(['tfhub.dev', 'storage.googleapis.com']);
const maxModelAssetBytes = 12 * 1024 * 1024;

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

function assertTrustedRemoteUrl(value) {
  const url = new URL(value);
  if (url.protocol !== 'https:' || !trustedModelHosts.has(url.hostname)) {
    throw new Error(`Untrusted model asset URL: ${value}`);
  }
}

function withTfhubFormatFile(url) {
  if (!url.startsWith('https://tfhub.dev/')) return url;
  const parsed = new URL(url);
  parsed.searchParams.set('tfjs-format', 'file');
  return parsed.toString();
}

async function fetchBuffer(url, { allowTfhubFormatRetry = false } = {}) {
  assertTrustedRemoteUrl(url);
  const response = await fetch(url);
  if (response.ok) {
    if (response.url) assertTrustedRemoteUrl(response.url);
    const buffer = Buffer.from(await response.arrayBuffer());
    if (buffer.byteLength > maxModelAssetBytes) throw new Error(`Model asset exceeds size limit: ${url}`);
    if (allowTfhubFormatRetry && url.startsWith('https://tfhub.dev/') && !url.includes('tfjs-format=file') && isHtmlPayload(buffer)) {
      const retryResponse = await fetch(withTfhubFormatFile(url));
      if (retryResponse.ok) {
        if (retryResponse.url) assertTrustedRemoteUrl(retryResponse.url);
        const retryBuffer = Buffer.from(await retryResponse.arrayBuffer());
        if (retryBuffer.byteLength > maxModelAssetBytes) throw new Error(`Model asset exceeds size limit: ${url}`);
        return retryBuffer;
      }
    }
    return buffer;
  }

  if (allowTfhubFormatRetry && url.startsWith('https://tfhub.dev/') && !url.includes('?')) {
    const retryUrl = withTfhubFormatFile(url);
    const retryResponse = await fetch(retryUrl);
    if (retryResponse.ok) {
      if (retryResponse.url) assertTrustedRemoteUrl(retryResponse.url);
      const retryBuffer = Buffer.from(await retryResponse.arrayBuffer());
      if (retryBuffer.byteLength > maxModelAssetBytes) throw new Error(`Model asset exceeds size limit: ${retryUrl}`);
      return retryBuffer;
    }
  }

  throw new Error(`Failed to download ${url}: ${response.status} ${response.statusText}`);
}

function assertTrustedDownloads(downloads, trustedFiles) {
  if (!trustedFiles) return;
  const expectedPaths = Object.keys(trustedFiles).sort();
  const actualPaths = downloads.map((download) => download.publicPath).sort();
  if (JSON.stringify(actualPaths) !== JSON.stringify(expectedPaths)) {
    throw new Error('Downloaded MoveNet asset inventory does not match the reviewed trust manifest.');
  }

  for (const download of downloads) {
    const expected = trustedFiles[download.publicPath];
    const actualSha256 = sha256(download.buffer);
    if (download.buffer.byteLength !== expected.bytes || actualSha256 !== expected.sha256) {
      throw new Error(`Downloaded MoveNet asset failed trusted digest verification: ${download.publicPath}`);
    }
  }
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
  trustedFiles = movenetStaticAssetConfig.trustedFiles,
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

  const downloads = [
    {
      buffer: modelBuffer,
      publicPath: movenetStaticAssetConfig.modelUrl,
      targetPath: path.join(modelDir, 'model.json'),
    },
  ];

  for (const asset of weightFiles) {
    const buffer = await fetchBuffer(asset.sourceUrl, { allowTfhubFormatRetry: true });
    downloads.push({
      buffer,
      publicPath: `/models/movenet/singlepose/lightning/4/${asset.localPath}`,
      targetPath: path.join(modelDir, asset.localPath),
    });
  }

  assertTrustedDownloads(downloads, trustedFiles);
  const files = downloads.map((download) => {
    const target = writeBuffer(download.targetPath, download.buffer);
    return {
      bytes: target.bytes,
      path: download.publicPath,
      sha256: target.sha256,
    };
  });

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
