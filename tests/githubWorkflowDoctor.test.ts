import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';

import {
  buildGithubWorkflowReport,
  GITHUB_WORKFLOW_REPORT_SCHEMA_VERSION,
  parseGhAuthScopes,
  renderGithubWorkflowMarkdown,
  writeGithubWorkflowReport,
} from '../scripts/github_workflow_doctor.mjs';

const tmpRoots: string[] = [];
const workflowText = 'name: Quality\non:\n  push:\n    branches:\n      - main\n';

function makeRoot({ activeWorkflow = false } = {}) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'movebeta-github-workflow-'));
  tmpRoots.push(root);
  fs.mkdirSync(path.join(root, 'docs/sdlc/ci-templates'), { recursive: true });
  fs.writeFileSync(path.join(root, 'docs/sdlc/ci-templates/github-actions-quality.yml'), workflowText);
  if (activeWorkflow) {
    fs.mkdirSync(path.join(root, '.github/workflows'), { recursive: true });
    fs.writeFileSync(path.join(root, '.github/workflows/quality.yml'), workflowText);
  }
  return root;
}

function commandRunnerWithScopes(scopes: string[]) {
  return (binary: string, args: string[]) => {
    if (binary !== 'gh') return { ok: false, error: `${binary} not found` };
    if (args[0] === '--version') return { ok: true, output: 'gh version 2.99.0' };
    if (args[0] === 'auth') {
      return {
        ok: true,
        output: `github.com\n  ✓ Logged in\n  - Token scopes: ${scopes.map((scope) => `'${scope}'`).join(', ')}`,
      };
    }
    return { ok: false, error: `unexpected gh ${args.join(' ')}` };
  };
}

afterEach(() => {
  for (const root of tmpRoots.splice(0)) {
    fs.rmSync(root, { force: true, recursive: true });
  }
});

describe('GitHub workflow doctor', () => {
  it('parses GitHub auth scopes without exposing token values', () => {
    expect(parseGhAuthScopes("  - Token scopes: 'gist', 'read:org', 'repo', 'workflow'")).toEqual([
      'gist',
      'read:org',
      'repo',
      'workflow',
    ]);
    expect(parseGhAuthScopes('no scope line')).toEqual([]);
  });

  it('reports workflow activation blockers when OAuth scope or active workflow is missing', () => {
    const rootDir = makeRoot();
    const report = buildGithubWorkflowReport({
      commandRunner: commandRunnerWithScopes(['gist', 'read:org', 'repo']),
      generatedAt: '2026-06-20T12:00:00.000Z',
      rootDir,
    });

    expect(report.schemaVersion).toBe(GITHUB_WORKFLOW_REPORT_SCHEMA_VERSION);
    expect(report.status).toBe('blocked');
    expect(report.summary).toMatchObject({
      activeWorkflowExists: false,
      ghCliAvailable: true,
      templateExists: true,
      workflowScopeReady: false,
    });
    expect(report.nextAction).toContain('.github/workflows/quality.yml');
    expect(JSON.stringify(report)).not.toMatch(/gho_|ghp_|pat_|BEGIN PRIVATE KEY/i);
  });

  it('marks workflow activation ready when scope and active workflow parity are present', () => {
    const rootDir = makeRoot({ activeWorkflow: true });
    const report = buildGithubWorkflowReport({
      commandRunner: commandRunnerWithScopes(['repo', 'workflow']),
      generatedAt: '2026-06-20T12:05:00.000Z',
      rootDir,
    });

    expect(report.status).toBe('ready');
    expect(report.summary).toMatchObject({
      activeMatchesTemplate: true,
      activeWorkflowExists: true,
      workflowScopeReady: true,
    });
    expect(renderGithubWorkflowMarkdown(report)).toContain('GitHub Workflow Report');
  });

  it('writes durable JSON and Markdown artifacts', () => {
    const rootDir = makeRoot();
    const report = buildGithubWorkflowReport({
      commandRunner: commandRunnerWithScopes(['repo']),
      generatedAt: '2026-06-20T12:10:00.000Z',
      rootDir,
    });
    const jsonPath = path.join(rootDir, 'docs/sdlc/github-workflow-report.json');
    const markdownPath = path.join(rootDir, 'docs/sdlc/github-workflow-report.md');

    writeGithubWorkflowReport({ jsonPath, markdownPath, report } as Parameters<typeof writeGithubWorkflowReport>[0] & {
      report: typeof report;
    });

    expect(JSON.parse(fs.readFileSync(jsonPath, 'utf8'))).toEqual(report);
    expect(fs.readFileSync(markdownPath, 'utf8')).toContain('Token included: no');
  });
});
