import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { afterEach, describe, expect, it } from 'vitest';

import {
  buildReleaseGateReport,
  evaluateStepResult,
  isReleaseGateReportReady,
  RELEASE_GATE_REPORT_SCHEMA_VERSION,
  releaseGateSteps,
} from '../scripts/release_check.mjs';

const tmpRoots: string[] = [];

function step(key: string, status: 'blocked' | 'fail' | 'pass' = 'pass') {
  return {
    command: `npm run ${key}`,
    completedAt: '2026-06-20T10:01:00.000Z',
    durationMs: 123,
    exitCode: status === 'pass' ? 0 : 1,
    key,
    label: key,
    startedAt: '2026-06-20T10:00:00.000Z',
    status,
  };
}

function makeRoot() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'movebeta-release-gate-'));
  tmpRoots.push(root);
  return root;
}

function writeJson(rootDir: string, relativePath: string, value: unknown) {
  const filePath = path.join(rootDir, relativePath);
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`);
}

afterEach(() => {
  for (const root of tmpRoots.splice(0)) {
    fs.rmSync(root, { force: true, recursive: true });
  }
});

describe('release gate report', () => {
  it('marks the release ready only when every step and required evidence lane passes', () => {
    const report = buildReleaseGateReport({
      completedAt: '2026-06-20T10:05:00.000Z',
      startedAt: '2026-06-20T10:00:00.000Z',
      steps: releaseGateSteps.map((item) => step(item.key)),
    });

    expect(report.schemaVersion).toBe(RELEASE_GATE_REPORT_SCHEMA_VERSION);
    expect(report.status).toBe('pass');
    expect(report.releaseReady).toBe(true);
    expect(report.summary).toMatchObject({
      blockedStepCount: 0,
      executedStepCount: releaseGateSteps.length,
      expectedStepCount: releaseGateSteps.length,
      failedStepCount: 0,
      missingStepKeys: [],
      releaseReady: true,
    });
    expect(report.evidence.native.status).toBe('pass');
    expect(report.evidence.ci.status).toBe('pass');
    expect(isReleaseGateReportReady(report)).toBe(true);
    expect(report.steps.map((item: { key: string }) => item.key)).toEqual(
      releaseGateSteps.map((item: { key: string }) => item.key),
    );
    expect(report.steps.map((item: { key: string }) => item.key)).toContain('nativeQaEvidenceValidation');
    expect(report.steps.map((item: { key: string }) => item.key)).toContain('iosToolchainDoctor');
    expect(report.steps.map((item: { key: string }) => item.key)).toContain('githubWorkflowDoctor');
  });

  it('marks an executed technical failure as fail', () => {
    const steps = releaseGateSteps.map((item) => step(item.key));
    const qualityIndex = steps.findIndex((item) => item.key === 'quality');
    steps[qualityIndex] = step('quality', 'fail');

    const report = buildReleaseGateReport({ steps });

    expect(report.status).toBe('fail');
    expect(report.releaseReady).toBe(false);
    expect(report.summary.failedStepCount).toBe(1);
    expect(isReleaseGateReportReady(report)).toBe(false);
  });

  it('preserves blocked separately from fail and identifies the affected evidence lane', () => {
    const steps = releaseGateSteps.map((item) => step(item.key));
    const iosIndex = steps.findIndex((item) => item.key === 'iosToolchainDoctor');
    steps[iosIndex] = step('iosToolchainDoctor', 'blocked');

    const report = buildReleaseGateReport({ steps });

    expect(report.status).toBe('blocked');
    expect(report.releaseReady).toBe(false);
    expect(report.summary).toMatchObject({ blockedStepCount: 1, failedStepCount: 0 });
    expect(report.evidence.native).toMatchObject({
      blockedStepKeys: ['iosToolchainDoctor'],
      status: 'blocked',
    });
    expect(report.evidence.ci.status).toBe('pass');
  });

  it('never treats a partial execution as release ready', () => {
    const report = buildReleaseGateReport({
      steps: [step('quality')],
    });

    expect(report.status).toBe('blocked');
    expect(report.releaseReady).toBe(false);
    expect(report.summary.missingStepKeys).toContain('iosToolchainDoctor');
    expect(report.evidence.native.status).toBe('blocked');
    expect(report.evidence.ci.status).toBe('blocked');
  });

  it('uses a root report status as authoritative even when the doctor exits zero', () => {
    const rootDir = makeRoot();
    const doctor = releaseGateSteps.find((item) => item.key === 'iosToolchainDoctor');
    expect(doctor).toBeDefined();
    writeJson(rootDir, 'docs/sdlc/ios-toolchain-report.json', {
      schemaVersion: 'movebeta.ios-toolchain-report.v1',
      status: 'blocked',
    });

    const result = evaluateStepResult({ exitCode: 0, rootDir, step: doctor });

    expect(result).toMatchObject({
      evidence: {
        path: 'docs/sdlc/ios-toolchain-report.json',
        status: 'blocked',
        statusPath: 'status',
      },
      status: 'blocked',
    });
  });

  it('reads nested authoritative statuses and rejects process/report disagreement', () => {
    const rootDir = makeRoot();
    const doctor = releaseGateSteps.find((item) => item.key === 'pwaReadiness');
    expect(doctor).toBeDefined();
    writeJson(rootDir, 'docs/sdlc/pwa-readiness-report.json', {
      schemaVersion: 'movebeta.pwa-readiness.v1',
      summary: { status: 'ready' },
    });

    expect(evaluateStepResult({ exitCode: 0, rootDir, step: doctor })).toMatchObject({
      evidence: { status: 'ready', statusPath: 'summary.status' },
      status: 'pass',
    });
    expect(evaluateStepResult({ exitCode: 1, rootDir, step: doctor })).toMatchObject({
      status: 'fail',
    });
  });

  it('fails closed for missing, malformed, wrong-schema, or unsupported reports', () => {
    const rootDir = makeRoot();
    const doctor = releaseGateSteps.find((item) => item.key === 'githubWorkflowDoctor');
    expect(doctor).toBeDefined();

    expect(evaluateStepResult({ exitCode: 0, rootDir, step: doctor }).status).toBe('fail');

    const reportPath = path.join(rootDir, 'docs/sdlc/github-workflow-report.json');
    fs.mkdirSync(path.dirname(reportPath), { recursive: true });
    fs.writeFileSync(reportPath, '{not-json');
    expect(evaluateStepResult({ exitCode: 0, rootDir, step: doctor }).status).toBe('fail');

    writeJson(rootDir, 'docs/sdlc/github-workflow-report.json', {
      schemaVersion: 'movebeta.github-workflow-report.v0',
      status: 'ready',
    });
    expect(evaluateStepResult({ exitCode: 0, rootDir, step: doctor }).status).toBe('fail');

    writeJson(rootDir, 'docs/sdlc/github-workflow-report.json', {
      schemaVersion: 'movebeta.github-workflow-report.v1',
      status: 'unexpected',
    });
    expect(evaluateStepResult({ exitCode: 0, rootDir, step: doctor }).status).toBe('fail');
  });

  it('refreshes launch readiness before enforcing freshness in release:full', () => {
    const packageJson = JSON.parse(fs.readFileSync(path.resolve('package.json'), 'utf8'));
    const command = packageJson.scripts['release:full'] as string;

    expect(releaseGateSteps.some((item) => item.key === 'releaseFreshnessDoctor')).toBe(false);
    expect(command.indexOf('release:readiness')).toBeGreaterThan(command.indexOf('release:check'));
    expect(command.indexOf('release:freshness:doctor')).toBeGreaterThan(command.indexOf('release:readiness'));
    expect(command.indexOf('release:archives')).toBeGreaterThan(command.indexOf('release:freshness:doctor'));
  });
});
