import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';

import { buildModelDeliveryLifecycle, modelDeliveryPolicySchemaVersion } from '../src/core/modelDeliveryLifecycle';
import {
  renderModelDownloadPlanMarkdown,
  writeModelDownloadPlanReport,
} from '../scripts/model_download_plan_report';

const generatedAt = '2026-06-25T08:00:00.000Z';
const tmpRoots: string[] = [];

function writeJson(filePath: string, value: unknown) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`);
}

function makeProjectRoot() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'movebeta-model-download-plan-'));
  tmpRoots.push(root);
  const lifecycle = buildModelDeliveryLifecycle({
    generatedAt,
    modelDeliveryPolicy: {
      native: {
        deliveryMode: 'platform-provider-bundled',
      },
      schemaVersion: modelDeliveryPolicySchemaVersion,
      web: {
        downloadStrategy: 'precache-on-install',
        integrity: 'sha256-manifest',
        offlineUse: 'requires-cached-assets',
        userAction: 'warm-model-control',
      },
    },
    staticAssetsReport: {
      checks: [{ key: 'manifest-asset-list', status: 'verified' }],
      modelName: 'MoveNet SinglePose Lightning',
      modelUrl: '/models/movenet/singlepose/lightning/4/model.json',
      summary: {
        assetCount: 3,
        status: 'ready',
        totalBytes: 4963342,
      },
    },
    webSmokeReport: {
      status: 'pass',
      summary: {
        passedChecks: 1,
        status: 'pass',
        totalChecks: 1,
      },
    },
  });
  writeJson(path.join(root, 'docs/sdlc/model-delivery-lifecycle-report.json'), lifecycle);
  return root;
}

afterEach(() => {
  for (const root of tmpRoots.splice(0)) {
    fs.rmSync(root, { force: true, recursive: true });
  }
});

describe('model download plan report', () => {
  it('writes a durable share-safe JSON and Markdown report from lifecycle evidence', () => {
    const rootDir = makeProjectRoot();
    const { jsonTarget, markdownTarget, plan } = writeModelDownloadPlanReport({
      generatedAt,
      network: 'wifi',
      preference: 'manual',
      rootDir,
    });

    expect(jsonTarget).toBe(path.join(rootDir, 'docs/sdlc/model-download-plan-report.json'));
    expect(markdownTarget).toBe(path.join(rootDir, 'docs/sdlc/model-download-plan-report.md'));
    expect(plan.schemaVersion).toBe('movebeta.model-download-plan.v1');
    expect(plan.summary).toMatchObject({
      downloadRequired: true,
      downloadTrigger: 'First online PWA install, app reload, or Warm model',
      network: 'wifi',
      preference: 'manual',
      runtime: 'web',
      status: 'action',
    });
    expect(plan.model.additionalDownloadBytes).toBe(4963342);
    expect(JSON.parse(fs.readFileSync(jsonTarget, 'utf8'))).toEqual(plan);

    const markdown = fs.readFileSync(markdownTarget, 'utf8');
    expect(markdown).toContain('Model Download Plan Report');
    expect(markdown).toContain('Warm model');
    expect(markdown).not.toMatch(/file:\/\/|\/Users\/|BEGIN PRIVATE KEY|ghp_|github_pat_|pat_/i);
  });

  it('renders all timing steps for reviewer handoff', () => {
    const rootDir = makeProjectRoot();
    const { plan } = writeModelDownloadPlanReport({ generatedAt, rootDir });
    const markdown = renderModelDownloadPlanMarkdown(plan);

    expect(markdown).toContain('| Package delivery |');
    expect(markdown).toContain('| Download trigger |');
    expect(markdown).toContain('| Cache warmup |');
    expect(markdown).toContain('| Integrity check |');
    expect(markdown).toContain('| Offline use |');
  });
});
