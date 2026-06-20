import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';

import {
  buildFeatureCompletionReport,
  FEATURE_COMPLETION_REPORT_SCHEMA_VERSION,
  renderFeatureCompletionMarkdown,
  writeFeatureCompletionReport,
} from '../scripts/feature_completion_doctor.mjs';

type Finding = { id: string; finding: string };

const tmpRoots: string[] = [];

function writeText(filePath: string, value: string) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, value);
}

function writeJson(filePath: string, value: unknown) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`);
}

function makeRoot() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'movebeta-feature-doctor-'));
  tmpRoots.push(root);
  writeText(
    path.join(root, 'docs/task-plan.md'),
    `# Task Plan

| ID | Task | Status |
| --- | --- | --- |
| T01 | Build local analyzer | Done |
| T02 | Validate physical device flows | Next |
| T03 | Validate cue quality with real climbing clips | External data needed |
`,
  );
  writeText(
    path.join(root, 'docs/sdlc/backlog.md'),
    `# Product Backlog

| ID | Epic | User story | Priority | Acceptance notes |
| --- | --- | --- | --- | --- |
| MB-001 | Native inference | Analyze clips locally | Done | Local provider returns frames |
| MB-002 | Real clip validation | Measure cue quality | Must | Needs real consented coach review data |
| MB-003 | Native release | Submit stores | Should | Strict gate needs Expo, Apple, and Google credentials |
`,
  );
  writeText(
    path.join(root, 'docs/sdlc/traceability-matrix.md'),
    `# Traceability Matrix

| Requirement | Source | Automated verification | Manual verification | Current status |
| --- | --- | --- | --- | --- |
| R1 local analysis | docs | tests | smoke | Covered |
| R2 native QA | docs | tests | device | Covered; physical device evidence still needed |
`,
  );
  writeJson(path.join(root, 'docs/sdlc/launch-readiness-report.json'), {
    checks: [
      {
        action: 'Capture docs/sdlc/native-qa-evidence.json from physical iOS and Android runs.',
        key: 'nativeDeviceQa',
        label: 'Native device QA evidence',
        owner: 'qa',
        status: 'missing',
      },
    ],
    generatedAt: '2026-06-20T12:00:00.000Z',
    schemaVersion: 'movebeta.launch-readiness-report.v1',
    summary: {
      nextAction: 'Capture physical-device QA evidence.',
      readyTracks: 1,
      status: 'blocked',
      totalTracks: 3,
    },
  });
  return root;
}

afterEach(() => {
  for (const root of tmpRoots.splice(0)) {
    fs.rmSync(root, { force: true, recursive: true });
  }
});

describe('feature completion doctor', () => {
  it('marks tracked work external-blocked when only real data, devices, or credentials remain', () => {
    const report = buildFeatureCompletionReport({
      generatedAt: '2026-06-20T12:00:00.000Z',
      rootDir: makeRoot(),
    });

    expect(report.schemaVersion).toBe(FEATURE_COMPLETION_REPORT_SCHEMA_VERSION);
    expect(report.status).toBe('external-blocked');
    expect(report.summary).toMatchObject({
      backlogDoneCount: 1,
      backlogItemCount: 3,
      internalGapCount: 0,
      taskDoneCount: 1,
      taskItemCount: 3,
    });
    expect(report.findings.tasks.map((item: Finding) => [item.id, item.finding])).toEqual([
      ['T02', 'external-blocked'],
      ['T03', 'external-blocked'],
    ]);
    expect(report.launchReadiness.openChecks[0]).toMatchObject({
      key: 'nativeDeviceQa',
      status: 'missing',
    });
    expect(JSON.stringify(report)).not.toMatch(/\/Users\/|ghp_|pat_|BEGIN PRIVATE KEY|rawVideoUri/i);
  });

  it('flags internal gaps when a task or backlog row is open without an external blocker reason', () => {
    const root = makeRoot();
    writeText(
      path.join(root, 'docs/task-plan.md'),
      `# Task Plan

| ID | Task | Status |
| --- | --- | --- |
| T01 | Build local analyzer | Done |
| T02 | Add another local feature | Next |
`,
    );
    writeText(
      path.join(root, 'docs/sdlc/backlog.md'),
      `# Product Backlog

| ID | Epic | User story | Priority | Acceptance notes |
| --- | --- | --- | --- | --- |
| MB-001 | Native inference | Analyze clips locally | Done | Local provider returns frames |
| MB-002 | Local planner | Plan next attempts | Must | Planner screen is not implemented |
`,
    );

    const report = buildFeatureCompletionReport({
      generatedAt: '2026-06-20T12:05:00.000Z',
      rootDir: root,
    });

    expect(report.status).toBe('internal-gaps');
    expect(report.summary.internalGapCount).toBe(2);
    expect(report.summary.nextAction).toContain('T02');
    expect(report.findings.backlog.find((item: Finding) => item.id === 'MB-002')?.finding).toBe('internal-gap');
  });

  it('writes durable JSON and Markdown feature completion reports', () => {
    const root = makeRoot();
    const report = buildFeatureCompletionReport({
      generatedAt: '2026-06-20T12:10:00.000Z',
      rootDir: root,
    });
    const jsonPath = path.join(root, 'docs/sdlc/feature-completion-report.json');
    const markdownPath = path.join(root, 'docs/sdlc/feature-completion-report.md');

    writeFeatureCompletionReport({ jsonPath, markdownPath, report });

    expect(JSON.parse(fs.readFileSync(jsonPath, 'utf8'))).toEqual(report);
    expect(renderFeatureCompletionMarkdown(report)).toContain('Feature Completion Report');
    expect(fs.readFileSync(markdownPath, 'utf8')).toContain('Credential values included: no');
  });
});
