import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';

import {
  VERCEL_WORKFLOW_REPORT_SCHEMA_VERSION,
  assertVercelWorkflowReportIsShareSafe,
  buildVercelWorkflowReport,
  renderVercelWorkflowMarkdown,
  writeVercelWorkflowReport,
} from '../scripts/vercel_workflow_doctor.mjs';

const tmpRoots = [];

const workflowTemplate = `name: Deploy Static PWA to Vercel

on:
  push:
    branches:
      - main
  workflow_dispatch:

permissions:
  contents: read

concurrency:
  group: vercel-static-\${{ github.ref }}
  cancel-in-progress: true

jobs:
  deploy-static-pwa:
    runs-on: ubuntu-latest
    env:
      VERCEL_ORG_ID: \${{ secrets.VERCEL_ORG_ID }}
      VERCEL_PROJECT_ID: \${{ secrets.VERCEL_PROJECT_ID }}
      VERCEL_TOKEN: \${{ secrets.VERCEL_TOKEN }}
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version-file: package.json
          cache: npm
      - run: npm ci
      - run: npm run release:check
      - run: npm run export:web
      - run: npm run model:movenet:assets:check
      - run: npm run web:pwa:check
      - run: npm run web:vercel:check
      - run: npx vercel pull --yes --environment=production --token=\${{ secrets.VERCEL_TOKEN }}
      - run: npx vercel build --prod --token=\${{ secrets.VERCEL_TOKEN }}
      - id: deploy
        run: |
          url=$(npx vercel deploy --prebuilt --prod --token=\${{ secrets.VERCEL_TOKEN }})
          echo "url=$url" >> "$GITHUB_OUTPUT"
      - run: python3 scripts/smoke_web_video.py
        env:
          MOVEBETA_SMOKE_URL: \${{ steps.deploy.outputs.url }}
      - uses: actions/upload-artifact@v4
        if: always()
        with:
          name: vercel-static-pwa-evidence
          path: |
            docs/sdlc/vercel-deployment-report.json
            docs/sdlc/movenet-static-assets-report.json
            dist/model-assets.json
            dist/sw.js
`;

function writeText(filePath, value) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, value);
}

function makeRoot({ activeWorkflow = false, template = workflowTemplate } = {}) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'movebeta-vercel-workflow-'));
  tmpRoots.push(root);
  writeText(path.join(root, 'docs/sdlc/ci-templates/vercel-static-deploy.yml'), template);
  if (activeWorkflow) {
    writeText(path.join(root, '.github/workflows/vercel-static-deploy.yml'), template);
  }
  return root;
}

afterEach(() => {
  for (const root of tmpRoots.splice(0)) {
    fs.rmSync(root, { force: true, recursive: true });
  }
});

describe('Vercel workflow doctor', () => {
  it('marks the committed template ready while workflow activation is deferred', () => {
    const rootDir = makeRoot();
    const report = buildVercelWorkflowReport({
      generatedAt: '2026-06-22T21:00:00.000Z',
      rootDir,
    });

    expect(report.schemaVersion).toBe(VERCEL_WORKFLOW_REPORT_SCHEMA_VERSION);
    expect(report.summary).toMatchObject({
      actionNeededCount: 2,
      activeWorkflowExists: false,
      blockedCount: 0,
      checkCount: 5,
      status: 'template-ready',
      templateExists: true,
      verifiedCount: 3,
    });
    expect(report.checks.find((item) => item.key === 'active-workflow')?.status).toBe('action-needed');
    expect(report.privacy).toMatchObject({
      credentialValuesIncluded: false,
      secretValuesIncluded: false,
      tokenLikeValuesIncluded: false,
    });
    expect(renderVercelWorkflowMarkdown(report)).toContain('Secret values included: no');
  });

  it('marks the Vercel workflow active-ready when the active workflow matches the template', () => {
    const rootDir = makeRoot({ activeWorkflow: true });
    const report = buildVercelWorkflowReport({
      generatedAt: '2026-06-22T21:05:00.000Z',
      rootDir,
    });

    expect(report.summary).toMatchObject({
      actionNeededCount: 0,
      activeMatchesTemplate: true,
      activeWorkflowExists: true,
      blockedCount: 0,
      status: 'active-ready',
      verifiedCount: 5,
    });
  });

  it('blocks missing deployment contract snippets and missing secret references', () => {
    const rootDir = makeRoot({
      template: 'name: Deploy Static PWA to Vercel\non:\n  push:\n',
    });
    const report = buildVercelWorkflowReport({ rootDir });

    expect(report.summary.status).toBe('blocked');
    expect(report.checks.find((item) => item.key === 'template-contract')?.status).toBe('blocked');
    expect(report.checks.find((item) => item.key === 'secret-references')?.status).toBe('blocked');
  });

  it('blocks when the active workflow drifts from the documented template', () => {
    const rootDir = makeRoot();
    writeText(path.join(rootDir, '.github/workflows/vercel-static-deploy.yml'), `${workflowTemplate}\n# drift\n`);
    const report = buildVercelWorkflowReport({ rootDir });

    expect(report.summary.status).toBe('blocked');
    expect(report.summary.activeWorkflowExists).toBe(true);
    expect(report.checks.find((item) => item.key === 'active-template-parity')?.status).toBe('blocked');
  });

  it('writes durable JSON and Markdown artifacts', () => {
    const rootDir = makeRoot();
    const report = buildVercelWorkflowReport({ rootDir });
    const jsonPath = path.join(rootDir, 'docs/sdlc/vercel-workflow-report.json');
    const markdownPath = path.join(rootDir, 'docs/sdlc/vercel-workflow-report.md');

    writeVercelWorkflowReport({ jsonPath, markdownPath, report });

    expect(JSON.parse(fs.readFileSync(jsonPath, 'utf8'))).toEqual(report);
    expect(fs.readFileSync(markdownPath, 'utf8')).toContain('Vercel Workflow Report');
  });

  it('rejects reports that include credential-like values before sharing', () => {
    const rootDir = makeRoot();
    const report = buildVercelWorkflowReport({ rootDir });

    expect(() =>
      assertVercelWorkflowReportIsShareSafe({
        ...report,
        checks: [
          ...report.checks,
          {
            action: 'Remove leaked token.',
            detail: 'ghp_1234567890abcdefTOKENVALUE',
            key: 'unsafe',
            label: 'Unsafe',
            status: 'blocked',
          },
        ],
      }),
    ).toThrow('Vercel workflow report contains credential values');
  });
});
