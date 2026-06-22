import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';

import {
  VERCEL_DEPLOYMENT_REPORT_SCHEMA_VERSION,
  buildVercelDeploymentReport,
  renderVercelDeploymentMarkdown,
  writeVercelDeploymentReport,
} from '../scripts/vercel_deployment_doctor.mjs';

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
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'movebeta-vercel-'));
  tmpRoots.push(root);
  writeJson(path.join(root, 'vercel.json'), {
    buildCommand: 'npm run export:web',
    framework: null,
    headers: [],
    outputDirectory: 'dist',
    rewrites: [{ destination: '/index.html', source: '/(.*)' }],
  });
  writeJson(path.join(root, 'docs/sdlc/pwa-readiness-report.json'), {
    generatedAt: '2026-06-22T20:00:00.000Z',
    schemaVersion: 'movebeta.pwa-readiness.v1',
    summary: {
      status: 'ready',
    },
  });
  writeText(
    path.join(root, '.env.example'),
    ['VERCEL_TOKEN=', 'VERCEL_ORG_ID=', 'VERCEL_PROJECT_ID=', 'EXPO_PUBLIC_MOVEBETA_ACTIVE_PLAN=free'].join('\n'),
  );
  return root;
}

afterEach(() => {
  for (const root of tmpRoots.splice(0)) {
    fs.rmSync(root, { force: true, recursive: true });
  }
});

describe('vercel deployment doctor', () => {
  it('marks an unlinked static PWA as deployable after account binding', () => {
    const root = makeReadyFixture();
    const report = buildVercelDeploymentReport({
      env: {},
      generatedAt: '2026-06-22T21:00:00.000Z',
      rootDir: root,
    });

    expect(report.schemaVersion).toBe(VERCEL_DEPLOYMENT_REPORT_SCHEMA_VERSION);
    expect(report.summary).toMatchObject({
      actionNeededCount: 2,
      blockedCount: 0,
      checkCount: 6,
      projectBinding: 'missing',
      status: 'static-ready',
      verifiedCount: 4,
    });
    expect(report.checks.find((item) => item.key === 'project-binding')?.status).toBe('action-needed');
    expect(report.checks.find((item) => item.key === 'deployment-secrets')?.status).toBe('action-needed');
    expect(report.privacy).toMatchObject({
      backendRequired: false,
      credentialValuesIncluded: false,
      projectIdValuesIncluded: false,
    });
    expect(report.commands.map((item) => item.command)).toEqual(
      expect.arrayContaining([
        'npx vercel deploy --prebuilt --prod --token=$VERCEL_TOKEN',
        'MOVEBETA_SMOKE_URL=<deployment-url> python3 scripts/smoke_web_video.py',
      ]),
    );
    expect(renderVercelDeploymentMarkdown(report)).toContain('Backend required: no');
  });

  it('marks linked static deployment ready without exposing secrets or ids', () => {
    const root = makeReadyFixture();
    writeJson(path.join(root, '.vercel/project.json'), {
      orgId: 'org_123',
      projectId: 'prj_456',
    });
    const report = buildVercelDeploymentReport({
      env: {
        VERCEL_ORG_ID: 'org_123',
        VERCEL_PROJECT_ID: 'prj_456',
        VERCEL_TOKEN: 'secret-token',
      },
      rootDir: root,
    });
    const serialized = JSON.stringify(report);

    expect(report.summary.status).toBe('linked');
    expect(report.summary.envKeysPresent).toEqual(['VERCEL_TOKEN', 'VERCEL_ORG_ID', 'VERCEL_PROJECT_ID']);
    expect(report.summary.projectBinding).toBe('present');
    expect(serialized).not.toContain('secret-token');
    expect(serialized).not.toContain('org_123');
    expect(serialized).not.toContain('prj_456');
  });

  it('blocks when the static config or PWA readiness proof is missing', () => {
    const root = makeReadyFixture();
    writeJson(path.join(root, 'vercel.json'), {
      buildCommand: 'npm run dev',
      framework: null,
      headers: [],
      outputDirectory: 'dist',
      rewrites: [],
    });
    writeJson(path.join(root, 'docs/sdlc/pwa-readiness-report.json'), {
      schemaVersion: 'movebeta.pwa-readiness.v1',
      summary: {
        status: 'blocked',
      },
    });
    const report = buildVercelDeploymentReport({ rootDir: root });

    expect(report.summary.status).toBe('blocked');
    expect(report.checks.find((item) => item.key === 'vercel-static-config')?.status).toBe('blocked');
    expect(report.checks.find((item) => item.key === 'pwa-readiness')?.status).toBe('blocked');
  });

  it('writes durable JSON and Markdown reports', () => {
    const root = makeReadyFixture();
    const report = buildVercelDeploymentReport({ rootDir: root });
    const jsonOutputPath = path.join(root, 'docs/sdlc/vercel-deployment-report.json');
    const markdownOutputPath = path.join(root, 'docs/sdlc/vercel-deployment-report.md');

    writeVercelDeploymentReport({ jsonOutputPath, markdownOutputPath, report });

    expect(JSON.parse(fs.readFileSync(jsonOutputPath, 'utf8'))).toEqual(report);
    expect(fs.readFileSync(markdownOutputPath, 'utf8')).toContain('Vercel Deployment Readiness Report');
  });
});
