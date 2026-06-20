import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';

import {
  buildDependencyLicenseReport,
  classifyLicense,
  DEPENDENCY_LICENSE_REPORT_SCHEMA_VERSION,
  renderDependencyLicenseMarkdown,
  writeDependencyLicenseReport,
} from '../scripts/dependency_license_doctor.mjs';

const tmpRoots: string[] = [];

function writeJson(filePath: string, value: unknown) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`);
}

function makeRoot() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'movebeta-license-'));
  tmpRoots.push(root);
  writeJson(path.join(root, 'package.json'), {
    dependencies: {
      '@scope/direct-review': '1.0.0',
      direct: '1.0.0',
      permissive: '1.0.0',
    },
    devDependencies: {
      blocked: '1.0.0',
    },
    name: 'fixture',
    version: '1.0.0',
  });
  writeJson(path.join(root, 'package-lock.json'), {
    lockfileVersion: 3,
    packages: {
      '': {
        name: 'fixture',
        version: '1.0.0',
      },
      'node_modules/@scope/direct-review': {
        license: 'MPL-2.0',
        version: '1.0.0',
      },
      'node_modules/blocked': {
        license: 'GPL-3.0-only',
        version: '1.0.0',
      },
      'node_modules/direct': {
        license: 'MIT',
        version: '1.0.0',
      },
      'node_modules/missing': {
        version: '1.0.0',
      },
      'node_modules/movebeta-pose': {
        link: true,
        resolved: 'modules/movebeta-pose',
      },
      'node_modules/permissive': {
        license: '(BSD-3-Clause OR GPL-2.0)',
        version: '1.0.0',
      },
    },
  });
  return root;
}

afterEach(() => {
  for (const root of tmpRoots.splice(0)) {
    fs.rmSync(root, { force: true, recursive: true });
  }
});

describe('dependency license doctor', () => {
  it('classifies common, dual, review, missing, and restricted licenses', () => {
    expect(classifyLicense('MIT')).toMatchObject({ status: 'pass' });
    expect(classifyLicense('(BSD-3-Clause OR GPL-2.0)')).toMatchObject({ status: 'pass' });
    expect(classifyLicense('MPL-2.0')).toMatchObject({ status: 'review' });
    expect(classifyLicense('')).toMatchObject({ status: 'blocked' });
    expect(classifyLicense('GPL-3.0-only')).toMatchObject({ status: 'blocked' });
  });

  it('builds a report with direct package flags and privacy-safe metadata', () => {
    const rootDir = makeRoot();
    const report = buildDependencyLicenseReport({
      generatedAt: '2026-06-20T12:00:00.000Z',
      rootDir,
    });

    expect(report.schemaVersion).toBe(DEPENDENCY_LICENSE_REPORT_SCHEMA_VERSION);
    expect(report.status).toBe('blocked');
    expect(report.summary).toMatchObject({
      blockedCount: 2,
      directPackageCount: 4,
      internalPackageCount: 1,
      packageCount: 6,
      reviewCount: 1,
    });
    expect(report.packages.find((item) => item.name === 'movebeta-pose')).toMatchObject({
      internal: true,
      status: 'internal',
    });
    expect(report.packages.find((item) => item.name === 'permissive')).toMatchObject({
      license: '(BSD-3-Clause OR GPL-2.0)',
      status: 'pass',
    });
    expect(JSON.stringify(report)).not.toMatch(/\/Users\/|ghp_|pat_|BEGIN PRIVATE KEY/i);
  });

  it('renders and writes durable JSON and Markdown artifacts', () => {
    const rootDir = makeRoot();
    const report = buildDependencyLicenseReport({
      generatedAt: '2026-06-20T12:05:00.000Z',
      rootDir,
    });
    const jsonPath = path.join(rootDir, 'docs/sdlc/dependency-license-report.json');
    const markdownPath = path.join(rootDir, 'docs/sdlc/dependency-license-report.md');

    writeDependencyLicenseReport({ jsonPath, markdownPath, report } as Parameters<typeof writeDependencyLicenseReport>[0] & {
      report: typeof report;
    });

    expect(JSON.parse(fs.readFileSync(jsonPath, 'utf8'))).toEqual(report);
    expect(renderDependencyLicenseMarkdown(report)).toContain('Dependency License Report');
    expect(fs.readFileSync(markdownPath, 'utf8')).toContain('Token values included: no');
  });
});
