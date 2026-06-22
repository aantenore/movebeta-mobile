import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';

import { buildReleaseBlockerIssuePacket } from '../src/core/releaseBlockerIssuePacket';
import { ReleaseBlockerIssueFilingPlanSchema } from '../src/core/releaseBlockerIssueFilingPlan';
import {
  assertReleaseBlockerIssueFilingPlanIsShareSafe,
  buildReleaseBlockerIssueFilingPlan,
  fileReleaseBlockerIssuesWithGitHub,
  RELEASE_BLOCKER_ISSUE_FILING_SCHEMA_VERSION,
  renderReleaseBlockerIssueFilingMarkdown,
  type GhRunner,
  writeReleaseBlockerIssueFilingPlan,
} from '../scripts/release_blocker_issue_filing';

const tmpRoots: string[] = [];

function makePacket() {
  return buildReleaseBlockerIssuePacket({
    evidence: {
      androidDebugBuild: true,
      cueValidationDataset: false,
      easCredentials: false,
      easProject: false,
      iosBuild: false,
      iosPods: true,
      modelAnalysisReplay: true,
      modelReadiness: true,
      nativeDeviceQa: false,
      nativeQaRunbook: true,
      privacyManifest: true,
      releaseGate: true,
      storeListing: true,
      webSmoke: true,
    },
    generatedAt: '2026-06-22T18:00:00.000Z',
  });
}

afterEach(() => {
  for (const root of tmpRoots.splice(0)) {
    fs.rmSync(root, { force: true, recursive: true });
  }
});

describe('release blocker issue filing', () => {
  it('builds a dry-run filing plan without credential values or local artifacts', () => {
    const packet = makePacket();
    const plan = buildReleaseBlockerIssueFilingPlan({
      generatedAt: '2026-06-22T18:05:00.000Z',
      packet,
      repository: 'aantenore/movebeta-mobile',
    });

    expect(plan.schemaVersion).toBe(RELEASE_BLOCKER_ISSUE_FILING_SCHEMA_VERSION);
    expect(ReleaseBlockerIssueFilingPlanSchema.parse(plan)).toEqual(plan);
    expect(plan.summary).toMatchObject({
      createEnabled: false,
      issueCount: 5,
      plannedCount: 5,
      status: 'dry-run',
    });
    expect(plan.issues.map((issue) => issue.filingStatus)).toEqual([
      'planned',
      'planned',
      'planned',
      'planned',
      'planned',
    ]);
    expect(plan.issues[0]?.commandPreview).toContain('gh issue create');
    expect(plan.issues[0]?.commandPreview).toContain('--repo aantenore/movebeta-mobile');
    expect(JSON.stringify(plan)).not.toMatch(/\/Users\/|file:\/\/|ghp_|BEGIN PRIVATE KEY|rawVideoUri|\.mp4/i);
  });

  it('writes share-safe JSON and Markdown dry-run artifacts', () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'movebeta-issue-filing-'));
    tmpRoots.push(root);
    const plan = buildReleaseBlockerIssueFilingPlan({
      generatedAt: '2026-06-22T18:10:00.000Z',
      packet: makePacket(),
    });
    const jsonOutputPath = path.join(root, 'docs/sdlc/release-blocker-issue-filing-plan.json');
    const markdownOutputPath = path.join(root, 'docs/sdlc/release-blocker-issue-filing-plan.md');

    writeReleaseBlockerIssueFilingPlan({ jsonOutputPath, markdownOutputPath, plan });

    expect(JSON.parse(fs.readFileSync(jsonOutputPath, 'utf8'))).toEqual(plan);
    expect(fs.readFileSync(markdownOutputPath, 'utf8')).toContain('Release Blocker Issue Filing Plan');
    expect(renderReleaseBlockerIssueFilingMarkdown(plan)).toContain('[Release Blocker] EAS project binding');
  });

  it('skips exact-title existing issues and creates only missing blockers', () => {
    const calls: string[][] = [];
    const runner: GhRunner = (args) => {
      calls.push(args);
      if (args[0] === '--repo') {
        const command = args.slice(2);
        if (command[0] === 'issue' && command[1] === 'list') {
          const search = command[command.indexOf('--search') + 1] ?? '';
          if (search.includes('[Release Blocker] Native device QA evidence')) {
            return {
              status: 0,
              stderr: '',
              stdout: JSON.stringify([
                {
                  number: 42,
                  title: '[Release Blocker] Native device QA evidence',
                  url: 'https://github.com/aantenore/movebeta-mobile/issues/42',
                },
              ]),
            };
          }
          return { status: 0, stderr: '', stdout: '[]' };
        }
        if (command[0] === 'issue' && command[1] === 'create') {
          return {
            status: 0,
            stderr: '',
            stdout: `https://github.com/aantenore/movebeta-mobile/issues/${100 + calls.length}\n`,
          };
        }
      }
      return { status: 1, stderr: 'unexpected gh args', stdout: '' };
    };

    const plan = fileReleaseBlockerIssuesWithGitHub({
      generatedAt: '2026-06-22T18:15:00.000Z',
      packet: makePacket(),
      repository: 'aantenore/movebeta-mobile',
      runner,
    });

    expect(plan.summary).toMatchObject({
      createEnabled: true,
      createdCount: 4,
      existingCount: 1,
      failedCount: 0,
      status: 'filed',
    });
    expect(plan.issues[0]).toMatchObject({
      filingStatus: 'existing',
      number: 42,
      url: 'https://github.com/aantenore/movebeta-mobile/issues/42',
    });
    expect(calls.filter((args) => args.includes('create'))).toHaveLength(4);
    expect(JSON.stringify(calls)).not.toMatch(/BEGIN PRIVATE KEY|ghp_|file:\/\/|\/Users\//i);
  });

  it('records GitHub CLI lookup failures without filing unsafe partial state as ready', () => {
    const runner: GhRunner = () => ({
      status: 1,
      stderr: 'gh auth required while reading /Users/antonio/.config/gh/hosts.yml with ghp_1234567890abcdefTOKENVALUE',
      stdout: '',
    });

    const plan = fileReleaseBlockerIssuesWithGitHub({
      generatedAt: '2026-06-22T18:20:00.000Z',
      packet: makePacket(),
      runner,
    });

    expect(plan.summary).toMatchObject({
      createdCount: 0,
      failedCount: 5,
      status: 'partial-failure',
    });
    expect(plan.issues.every((issue) => issue.filingStatus === 'failed')).toBe(true);
    expect(plan.issues[0]?.error).toContain('GitHub CLI returned a diagnostic');
    expect(JSON.stringify(plan)).not.toMatch(/\/Users\/|ghp_|BEGIN PRIVATE KEY|file:\/\//i);
    expect(assertReleaseBlockerIssueFilingPlanIsShareSafe(plan)).toEqual(plan);
  });
});
