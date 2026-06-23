import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { afterEach, describe, expect, it } from 'vitest';

import {
  MOVENET_STATIC_ASSETS_REPORT_SCHEMA_VERSION,
  assertMoveNetStaticAssetsReportIsShareSafe,
  buildMoveNetStaticAssetsReport,
  renderMoveNetStaticAssetsMarkdown,
  writeMoveNetStaticAssetsReport,
} from '../scripts/movenet_static_assets_doctor.mjs';

const tmpRoots = [];

function writeJson(filePath, value) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`);
}

function writeText(filePath, value) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, value);
}

function makeReadyFixture() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'movebeta-movenet-static-'));
  tmpRoots.push(root);
  const modelUrl = '/models/movenet/singlepose/lightning/4/model.json';
  const shardUrl = '/models/movenet/singlepose/lightning/4/group1-shard1of1.bin';
  const modelJson = {
    format: 'graph-model',
    weightsManifest: [{ paths: ['group1-shard1of1.bin'], weights: [{ dtype: 'float32', name: 'fixture', shape: [1] }] }],
  };
  const manifest = {
    assets: [modelUrl, shardUrl],
    generatedAt: '2026-06-22T22:00:00.000Z',
    modelName: 'MoveNet SinglePose Lightning',
    modelUrl,
    schemaVersion: 'movebeta.static-model-assets.v1',
    summary: {
      fileCount: 2,
      shardCount: 1,
      totalBytes: 123,
    },
  };

  writeJson(path.join(root, 'app.json'), {
    expo: {
      extra: {
        tfjsMoveNetModelUrl: modelUrl,
      },
    },
  });
  writeJson(path.join(root, 'public/model-assets.json'), manifest);
  writeJson(path.join(root, 'public/models/movenet/singlepose/lightning/4/model.json'), modelJson);
  writeText(path.join(root, 'public/models/movenet/singlepose/lightning/4/group1-shard1of1.bin'), 'bin');
  writeText(
    path.join(root, 'public/sw.js'),
    "const MODEL_ASSET_MANIFEST = '/model-assets.json'; async function cacheModelAssets() {} if (url.pathname.startsWith('/models/')) {}",
  );
  writeJson(path.join(root, 'dist/model-assets.json'), manifest);
  writeJson(path.join(root, 'dist/models/movenet/singlepose/lightning/4/model.json'), modelJson);
  writeText(path.join(root, 'dist/models/movenet/singlepose/lightning/4/group1-shard1of1.bin'), 'bin');
  return root;
}

afterEach(() => {
  for (const root of tmpRoots.splice(0)) {
    fs.rmSync(root, { force: true, recursive: true });
  }
});

describe('MoveNet static assets doctor', () => {
  it('marks static same-origin model assets ready', () => {
    const rootDir = makeReadyFixture();
    const report = buildMoveNetStaticAssetsReport({
      generatedAt: '2026-06-22T22:05:00.000Z',
      rootDir,
    });

    expect(report.schemaVersion).toBe(MOVENET_STATIC_ASSETS_REPORT_SCHEMA_VERSION);
    expect(report.summary).toMatchObject({
      checkCount: 7,
      shardCount: 1,
      sourceAssetCount: 2,
      status: 'ready',
      verifiedCount: 7,
    });
    expect(renderMoveNetStaticAssetsMarkdown(report)).toContain('MoveNet Static Assets Report');
    expect(report.privacy).toMatchObject({
      credentialValuesIncluded: false,
      rawVideoIncluded: false,
      tokenLikeValuesIncluded: false,
    });
  });

  it('blocks when a weight shard is missing', () => {
    const rootDir = makeReadyFixture();
    fs.rmSync(path.join(rootDir, 'public/models/movenet/singlepose/lightning/4/group1-shard1of1.bin'));
    const report = buildMoveNetStaticAssetsReport({ rootDir });

    expect(report.summary.status).toBe('blocked');
    expect(report.checks.find((item) => item.key === 'source-weight-shards')?.status).toBe('blocked');
  });

  it('blocks when a weight shard contains an HTML redirect response', () => {
    const rootDir = makeReadyFixture();
    writeText(path.join(rootDir, 'public/models/movenet/singlepose/lightning/4/group1-shard1of1.bin'), '<!DOCTYPE html><html></html>');
    const report = buildMoveNetStaticAssetsReport({ rootDir });

    expect(report.summary.status).toBe('blocked');
    expect(report.checks.find((item) => item.key === 'source-weight-shards')?.detail).toContain('HTML response');
  });

  it('blocks when exported model shards contain an HTML redirect response', () => {
    const rootDir = makeReadyFixture();
    writeText(path.join(rootDir, 'dist/models/movenet/singlepose/lightning/4/group1-shard1of1.bin'), '<html></html>');
    const report = buildMoveNetStaticAssetsReport({ rootDir });

    expect(report.summary.status).toBe('blocked');
    expect(report.checks.find((item) => item.key === 'exported-model-assets')?.detail).toContain('valid weight shard');
  });

  it('blocks when app config points to a different model URL', () => {
    const rootDir = makeReadyFixture();
    writeJson(path.join(rootDir, 'app.json'), {
      expo: {
        extra: {
          tfjsMoveNetModelUrl: '/remote/model.json',
        },
      },
    });
    const report = buildMoveNetStaticAssetsReport({ rootDir });

    expect(report.summary.status).toBe('blocked');
    expect(report.checks.find((item) => item.key === 'app-model-url')?.status).toBe('blocked');
  });

  it('writes durable JSON and Markdown artifacts', () => {
    const rootDir = makeReadyFixture();
    const report = buildMoveNetStaticAssetsReport({ rootDir });
    const jsonPath = path.join(rootDir, 'docs/sdlc/movenet-static-assets-report.json');
    const markdownPath = path.join(rootDir, 'docs/sdlc/movenet-static-assets-report.md');

    writeMoveNetStaticAssetsReport({ jsonPath, markdownPath, report });

    expect(JSON.parse(fs.readFileSync(jsonPath, 'utf8'))).toEqual(report);
    expect(fs.readFileSync(markdownPath, 'utf8')).toContain('MoveNet Static Assets Report');
  });

  it('rejects local paths, raw videos, credentials, and token-like values before sharing', () => {
    const rootDir = makeReadyFixture();
    const report = buildMoveNetStaticAssetsReport({ rootDir });

    expect(() =>
      assertMoveNetStaticAssetsReportIsShareSafe({
        ...report,
        checks: [
          ...report.checks,
          {
            action: 'Remove leaked value.',
            detail: 'Open file:///Users/antonio/raw-beta.mov with ghp_1234567890abcdefTOKENVALUE.',
            key: 'unsafe',
            label: 'Unsafe',
            status: 'blocked',
          },
        ],
      }),
    ).toThrow('MoveNet static assets report contains credential values');
  });
});
