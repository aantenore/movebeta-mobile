import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { afterEach, describe, expect, it } from 'vitest';

import {
  buildMoveNetReadinessReport,
  DEFAULT_MOVENET_READINESS_BUDGET,
  MOVENET_READINESS_SCHEMA_VERSION,
  resolveLocalMoveNetModel,
} from '../scripts/movenet_readiness_report.mjs';

const tmpRoots: string[] = [];

afterEach(() => {
  for (const root of tmpRoots.splice(0)) {
    fs.rmSync(root, { force: true, recursive: true });
  }
});

describe('MoveNet readiness report', () => {
  it('marks a local model execution run ready when load and inference budgets pass', () => {
    const report = buildMoveNetReadinessReport({
      backend: 'cpu',
      generatedAt: '2026-06-20T09:00:00.000Z',
      inferenceRunsMs: [320.4, 280.1, 300.2],
      loadMs: 1_800,
      memory: { numBytes: 1024, numDataBuffers: 1, numTensors: 1, unreliable: false },
      modelSource: 'same-origin-static-assets',
      modelUrl: '/models/movenet/singlepose/lightning/4/model.json',
      output: {
        maxKeypoints: 0,
        maxPoses: 0,
        poseArrayReturned: true,
      },
      warmupMs: 410.7,
    });

    expect(report.schemaVersion).toBe(MOVENET_READINESS_SCHEMA_VERSION);
    expect(report.status).toBe('ready');
    expect(report.averageInferenceMs).toBe(300);
    expect(report.maxInferenceMs).toBe(320);
    expect(report.modelSource).toBe('same-origin-static-assets');
    expect(report.modelUrl).toBe('/models/movenet/singlepose/lightning/4/model.json');
    expect(report.checks.every((check) => check.status === 'pass')).toBe(true);
    expect(report.limitations[0]).toContain('Synthetic blank-frame');
  });

  it('resolves a local static MoveNet IOHandler from the vendored asset manifest', async () => {
    const rootDir = fs.mkdtempSync(path.join(os.tmpdir(), 'movebeta-movenet-local-'));
    tmpRoots.push(rootDir);
    const modelDir = path.join(rootDir, 'public/models/movenet/singlepose/lightning/4');
    fs.mkdirSync(modelDir, { recursive: true });
    fs.writeFileSync(path.join(modelDir, 'group1-shard1of1.bin'), Buffer.from([1, 2, 3, 4]));
    fs.writeFileSync(
      path.join(modelDir, 'model.json'),
      `${JSON.stringify({
        format: 'graph-model',
        generatedBy: 'test',
        modelTopology: { node: [] },
        weightsManifest: [
          {
            paths: ['group1-shard1of1.bin'],
            weights: [{ dtype: 'float32', name: 'weight', shape: [1] }],
          },
        ],
      })}\n`,
    );
    fs.mkdirSync(path.join(rootDir, 'public'), { recursive: true });
    fs.writeFileSync(
      path.join(rootDir, 'public/model-assets.json'),
      `${JSON.stringify({
        modelUrl: '/models/movenet/singlepose/lightning/4/model.json',
        schemaVersion: 'movebeta.static-model-assets.v1',
      })}\n`,
    );

    const localModel = resolveLocalMoveNetModel(rootDir);
    const artifacts = await localModel?.ioHandler.load();

    expect(localModel).toMatchObject({
      modelSource: 'same-origin-static-assets',
      modelUrl: '/models/movenet/singlepose/lightning/4/model.json',
    });
    expect(artifacts?.weightSpecs).toHaveLength(1);
    expect(artifacts?.weightData.byteLength).toBe(4);
  });

  it('marks the report degraded when model execution exceeds configured budgets', () => {
    const report = buildMoveNetReadinessReport({
      backend: 'cpu',
      budget: DEFAULT_MOVENET_READINESS_BUDGET,
      generatedAt: '2026-06-20T09:05:00.000Z',
      inferenceRunsMs: [4_000, 4_500],
      loadMs: 30_000,
      memory: { numBytes: 1024, numDataBuffers: 1, numTensors: 1, unreliable: false },
      output: {
        maxKeypoints: 0,
        maxPoses: 0,
        poseArrayReturned: true,
      },
      warmupMs: 5_000,
    });

    expect(report.status).toBe('degraded');
    expect(report.checks.filter((check) => check.status === 'fail').map((check) => check.key)).toEqual([
      'model-load',
      'average-inference-budget',
      'max-inference-budget',
    ]);
  });
});
