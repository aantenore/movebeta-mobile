import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { afterEach, describe, expect, it } from 'vitest';

import {
  MOVENET_STATIC_ASSET_SCHEMA_VERSION,
  downloadMoveNetStaticAssets,
  movenetStaticAssetConfig,
} from '../scripts/download_movenet_static_assets.mjs';

const tmpRoots = [];
const originalFetch = globalThis.fetch;

function makeRoot() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'movebeta-movenet-download-'));
  tmpRoots.push(root);
  return root;
}

function arrayBufferFrom(value) {
  const buffer = Buffer.isBuffer(value) ? value : Buffer.from(value);
  return buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength);
}

function response(value) {
  return {
    ok: true,
    status: 200,
    statusText: 'OK',
    arrayBuffer: async () => arrayBufferFrom(value),
  };
}

afterEach(() => {
  globalThis.fetch = originalFetch;
  for (const root of tmpRoots.splice(0)) {
    fs.rmSync(root, { force: true, recursive: true });
  }
});

describe('MoveNet static asset downloader', () => {
  it('downloads graph and shards into public static assets with local model references', async () => {
    const rootDir = makeRoot();
    const absoluteShardUrl = 'https://storage.googleapis.com/tfhub-modules/movenet/group1-shard2of2.bin?download=1';
    const modelJson = {
      format: 'graph-model',
      generatedBy: 'fixture',
      weightsManifest: [
        {
          paths: ['group1-shard1of2.bin', absoluteShardUrl],
          weights: [{ dtype: 'float32', name: 'fixture', shape: [1] }],
        },
      ],
    };
    const fetchCalls = [];
    globalThis.fetch = async (url) => {
      fetchCalls.push(String(url));
      if (String(url) === movenetStaticAssetConfig.sourceModelUrl) return response(JSON.stringify(modelJson));
      if (String(url).endsWith('/group1-shard1of2.bin')) return response(Buffer.from([1, 2, 3]));
      if (String(url) === absoluteShardUrl) return response(Buffer.from([4, 5, 6, 7]));
      return { ok: false, status: 404, statusText: 'Not Found', arrayBuffer: async () => arrayBufferFrom('') };
    };

    const manifest = await downloadMoveNetStaticAssets({
      generatedAt: '2026-06-22T22:00:00.000Z',
      rootDir,
    });

    expect(fetchCalls).toContain(movenetStaticAssetConfig.sourceModelUrl);
    expect(manifest.schemaVersion).toBe(MOVENET_STATIC_ASSET_SCHEMA_VERSION);
    expect(manifest.modelUrl).toBe('/models/movenet/singlepose/lightning/4/model.json');
    expect(manifest.summary).toMatchObject({
      fileCount: 3,
      shardCount: 2,
    });
    expect(manifest.assets).toEqual([
      '/models/movenet/singlepose/lightning/4/model.json',
      '/models/movenet/singlepose/lightning/4/group1-shard1of2.bin',
      '/models/movenet/singlepose/lightning/4/group1-shard2of2.bin',
    ]);
    expect(manifest.files.every((file) => typeof file.sha256 === 'string' && file.sha256.length === 64)).toBe(true);

    const writtenModelJson = JSON.parse(
      fs.readFileSync(path.join(rootDir, 'public/models/movenet/singlepose/lightning/4/model.json'), 'utf8'),
    );
    expect(writtenModelJson.weightsManifest[0].paths).toEqual(['group1-shard1of2.bin', 'group1-shard2of2.bin']);
    expect(JSON.stringify(writtenModelJson)).not.toContain('https://');
    expect(fs.existsSync(path.join(rootDir, 'public/models/movenet/singlepose/lightning/4/group1-shard1of2.bin'))).toBe(true);
    expect(fs.existsSync(path.join(rootDir, 'public/models/movenet/singlepose/lightning/4/group1-shard2of2.bin'))).toBe(true);
    expect(JSON.parse(fs.readFileSync(path.join(rootDir, 'public/model-assets.json'), 'utf8'))).toEqual(manifest);
  });

  it('rejects model manifests without weight shards', async () => {
    const rootDir = makeRoot();
    globalThis.fetch = async () => response(JSON.stringify({ weightsManifest: [] }));

    await expect(downloadMoveNetStaticAssets({ rootDir })).rejects.toThrow('does not include weight shard paths');
  });
});
