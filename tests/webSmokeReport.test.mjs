import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';

import {
  assertWebSmokeReportIsShareSafe,
  buildWebSmokeReport,
  renderWebSmokeReportMarkdown,
  WEB_SMOKE_REPORT_SCHEMA_VERSION,
  writeWebSmokeReport,
} from '../scripts/web_smoke_report.mjs';

const tmpRoots = [];

afterEach(() => {
  for (const root of tmpRoots.splice(0)) {
    fs.rmSync(root, { force: true, recursive: true });
  }
});

function makeRoot() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'movebeta-web-smoke-'));
  tmpRoots.push(root);
  return root;
}

describe('web smoke report', () => {
  it('builds a share-safe pass report for the exported bundle smoke', () => {
    const report = buildWebSmokeReport({
      command: 'MOVEBETA_SMOKE_URL=http://127.0.0.1:8083/ python3 scripts/smoke_web_video.py',
      completedAt: '2026-06-23T10:01:00.000Z',
      durationMs: 1234,
      generatedAt: '2026-06-23T10:01:00.000Z',
      mode: 'local-static-dist',
      smokeUrl: 'http://127.0.0.1:8083/',
      startedAt: '2026-06-23T10:00:00.000Z',
      status: 'pass',
    });

    expect(report.schemaVersion).toBe(WEB_SMOKE_REPORT_SCHEMA_VERSION);
    expect(report.status).toBe('pass');
    expect(report.summary).toMatchObject({
      failedChecks: 0,
      passedChecks: 4,
      status: 'pass',
      totalChecks: 4,
    });
    expect(report.checks.map((check) => check.key)).toContain('pwa-offline-model-cache');
    expect(report.diagnostics).toBeUndefined();
    expect(JSON.stringify(report)).not.toMatch(/\/Users\/|file:\/\/|ghp_|\.mov|\.mp4/i);
  });

  it('sanitizes failure diagnostics before writing shareable evidence', () => {
    const report = buildWebSmokeReport({
      errorMessage: 'Failed on /Users/antonio/private/raw-beta.mov with ghp_1234567890abcdefTOKENVALUE',
      exitCode: 1,
      smokeUrl: 'http://127.0.0.1:8083/?token=secret',
      status: 'fail',
      stderr: 'Trace at /Users/antonio/app/raw-beta.mp4 with bearer abc.def.ghi',
      stdout: 'See file:///Users/antonio/app/raw-beta.mov',
    });

    expect(report.status).toBe('fail');
    expect(report.target.url).toBe('http://127.0.0.1:8083/?redacted=true');
    expect(JSON.stringify(report)).not.toMatch(/\/Users\/|file:\/\/\/Users|ghp_|bearer abc|\.mov|\.mp4/i);
    expect(report.diagnostics.error).toContain('<local-path>');
  });

  it('rejects unsafe report mutations', () => {
    const report = buildWebSmokeReport();
    const unsafe = {
      ...report,
      target: {
        ...report.target,
        url: 'file:///Users/antonio/raw-beta.mov',
      },
    };

    expect(() => assertWebSmokeReportIsShareSafe(unsafe)).toThrow('Web smoke report contains credential');
  });

  it('renders and writes durable JSON and Markdown artifacts', () => {
    const root = makeRoot();
    const report = buildWebSmokeReport({
      completedAt: '2026-06-23T10:01:00.000Z',
      generatedAt: '2026-06-23T10:01:00.000Z',
      smokeUrl: 'http://127.0.0.1:8083/',
    });
    const jsonOutputPath = path.join(root, 'docs/sdlc/web-smoke-report.json');
    const markdownOutputPath = path.join(root, 'docs/sdlc/web-smoke-report.md');
    const result = writeWebSmokeReport({ jsonOutputPath, markdownOutputPath, report });
    const markdown = renderWebSmokeReportMarkdown(report);

    expect(result.jsonOutputPath).toBe(jsonOutputPath);
    expect(JSON.parse(fs.readFileSync(jsonOutputPath, 'utf8'))).toEqual(report);
    expect(fs.readFileSync(markdownOutputPath, 'utf8')).toBe(markdown);
    expect(markdown).toContain('Web Smoke Report');
    expect(markdown).toContain('Playwright exported-bundle smoke');
  });
});
