import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { afterEach, describe, expect, it } from 'vitest';

import {
  MODEL_ASSET_PROVENANCE_REPORT_SCHEMA_VERSION,
  assertModelAssetProvenanceReportIsShareSafe,
  buildModelAssetProvenanceReport,
  renderModelAssetProvenanceMarkdown,
  writeModelAssetProvenanceReport,
} from '../scripts/model_asset_provenance_doctor.mjs';

const tmpRoots = [];

function sha256(value) {
  return crypto.createHash('sha256').update(value).digest('hex');
}

function writeJson(filePath, value) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`);
}

function writeText(filePath, value) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, value);
}

function makeReadyFixture() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'movebeta-model-provenance-'));
  tmpRoots.push(root);
  const modelUrl = '/models/movenet/singlepose/lightning/4/model.json';
  const shardUrl = '/models/movenet/singlepose/lightning/4/group1-shard1of1.bin';
  const modelText = '{"format":"graph-model"}\n';
  const shardText = 'fixture-binary';
  writeText(path.join(root, 'public/models/movenet/singlepose/lightning/4/model.json'), modelText);
  writeText(path.join(root, 'public/models/movenet/singlepose/lightning/4/group1-shard1of1.bin'), shardText);
  writeJson(path.join(root, 'public/model-assets.json'), {
    assets: [modelUrl, shardUrl],
    files: [
      { bytes: Buffer.byteLength(modelText), path: modelUrl, sha256: sha256(modelText) },
      { bytes: Buffer.byteLength(shardText), path: shardUrl, sha256: sha256(shardText) },
    ],
    generatedAt: '2026-06-22T22:00:00.000Z',
    modelName: 'MoveNet SinglePose Lightning',
    modelUrl,
    schemaVersion: 'movebeta.static-model-assets.v1',
    source: {
      baseUrl: 'https://tfhub.dev/google/tfjs-model/movenet/singlepose/lightning/4/',
      modelUrl: 'https://tfhub.dev/google/tfjs-model/movenet/singlepose/lightning/4/model.json?tfjs-format=file',
    },
    summary: {
      fileCount: 2,
      shardCount: 1,
      totalBytes: Buffer.byteLength(modelText) + Buffer.byteLength(shardText),
    },
  });
  writeText(
    path.join(root, 'docs/sdlc/model-asset-attribution.md'),
    [
      '# Model Asset Attribution',
      'MoveNet SinglePose Lightning',
      'TensorFlow Hub',
      'https://tfhub.dev/google/tfjs-model/movenet/singlepose/lightning/4/model.json?tfjs-format=file',
      'public/model-assets.json',
      'npm run model:assets:provenance',
    ].join('\n'),
  );
  return root;
}

afterEach(() => {
  for (const root of tmpRoots.splice(0)) {
    fs.rmSync(root, { force: true, recursive: true });
  }
});

describe('model asset provenance doctor', () => {
  it('marks model provenance review-ready when source, hashes, and attribution are present', () => {
    const rootDir = makeReadyFixture();
    const report = buildModelAssetProvenanceReport({
      generatedAt: '2026-06-22T22:05:00.000Z',
      rootDir,
    });

    expect(report.schemaVersion).toBe(MODEL_ASSET_PROVENANCE_REPORT_SCHEMA_VERSION);
    expect(report.summary).toMatchObject({
      blockedCount: 0,
      checkCount: 6,
      fileCount: 2,
      reviewCount: 1,
      status: 'review',
      verifiedCount: 5,
    });
    expect(report.source.provider).toBe('TensorFlow Hub');
    expect(renderModelAssetProvenanceMarkdown(report)).toContain('Model Asset Provenance Report');
    expect(report.privacy).toMatchObject({
      credentialValuesIncluded: false,
      rawVideoIncluded: false,
      tokenLikeValuesIncluded: false,
    });
  });

  it('blocks when the attribution notice is missing required provenance details', () => {
    const rootDir = makeReadyFixture();
    writeText(path.join(rootDir, 'docs/sdlc/model-asset-attribution.md'), 'MoveNet');
    const report = buildModelAssetProvenanceReport({ rootDir });

    expect(report.summary.status).toBe('blocked');
    expect(report.checks.find((item) => item.key === 'attribution-notice')?.status).toBe('blocked');
  });

  it('blocks when a local model file no longer matches its manifest digest', () => {
    const rootDir = makeReadyFixture();
    writeText(path.join(rootDir, 'public/models/movenet/singlepose/lightning/4/group1-shard1of1.bin'), 'changed');
    const report = buildModelAssetProvenanceReport({ rootDir });

    expect(report.summary.status).toBe('blocked');
    expect(report.checks.find((item) => item.key === 'hash-integrity')?.status).toBe('blocked');
  });

  it('writes durable JSON and Markdown artifacts', () => {
    const rootDir = makeReadyFixture();
    const report = buildModelAssetProvenanceReport({ rootDir });
    const jsonPath = path.join(rootDir, 'docs/sdlc/model-asset-provenance-report.json');
    const markdownPath = path.join(rootDir, 'docs/sdlc/model-asset-provenance-report.md');

    writeModelAssetProvenanceReport({ jsonPath, markdownPath, report });

    expect(JSON.parse(fs.readFileSync(jsonPath, 'utf8'))).toEqual(report);
    expect(fs.readFileSync(markdownPath, 'utf8')).toContain('Model Asset Provenance Report');
  });

  it('rejects local paths, raw videos, credentials, and token-like values before sharing', () => {
    const rootDir = makeReadyFixture();
    const report = buildModelAssetProvenanceReport({ rootDir });

    expect(() =>
      assertModelAssetProvenanceReportIsShareSafe({
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
    ).toThrow('Model asset provenance report contains credential values');
  });
});
