import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';

import {
  buildReleaseBlockerIssueReportFromConfig,
  renderReleaseBlockerIssueMarkdown,
  writeReleaseBlockerIssueReport,
} from '../scripts/release_blocker_issue_report';

const tmpRoots: string[] = [];

function makeRoot() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'movebeta-blocker-issues-'));
  tmpRoots.push(root);
  fs.writeFileSync(
    path.join(root, 'app.json'),
    `${JSON.stringify(
      {
        expo: {
          extra: {
            launchReadinessEvidence: {
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
          },
        },
      },
      null,
      2,
    )}\n`,
  );
  return root;
}

afterEach(() => {
  for (const root of tmpRoots.splice(0)) {
    fs.rmSync(root, { force: true, recursive: true });
  }
});

describe('release blocker issue report', () => {
  it('builds a durable issue-ready report from app launch evidence', () => {
    const root = makeRoot();
    const packet = buildReleaseBlockerIssueReportFromConfig({
      appConfigPath: path.join(root, 'app.json'),
      generatedAt: '2026-06-20T10:00:00.000Z',
    });

    expect(packet.summary).toMatchObject({
      issueCount: 5,
      ownerCount: 4,
      status: 'ready-to-file',
    });
    expect(packet.issues.map((issue) => issue.key)).toEqual([
      'nativeDeviceQa',
      'iosBuild',
      'cueValidationDataset',
      'easProject',
      'easCredentials',
    ]);
    expect(JSON.stringify(packet)).not.toMatch(/\/Users\/|file:\/\/|ghp_|BEGIN PRIVATE KEY|rawVideoUri/i);
  });

  it('renders and writes share-safe JSON and Markdown summaries', () => {
    const root = makeRoot();
    const packet = buildReleaseBlockerIssueReportFromConfig({
      appConfigPath: path.join(root, 'app.json'),
      generatedAt: '2026-06-20T10:00:00.000Z',
    });
    const jsonOutputPath = path.join(root, 'docs/sdlc/release-blocker-issues-report.json');
    const markdownOutputPath = path.join(root, 'docs/sdlc/release-blocker-issues-report.md');

    writeReleaseBlockerIssueReport({ jsonOutputPath, markdownOutputPath, packet });

    expect(JSON.parse(fs.readFileSync(jsonOutputPath, 'utf8'))).toEqual(packet);
    expect(fs.readFileSync(markdownOutputPath, 'utf8')).toContain('Release Blocker Issues Report');
    expect(renderReleaseBlockerIssueMarkdown(packet)).toContain('[Release Blocker] Native device QA evidence');
  });
});
