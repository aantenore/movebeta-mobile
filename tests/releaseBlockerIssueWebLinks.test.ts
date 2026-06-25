import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';

import { buildReleaseBlockerIssuePacket } from '../src/core/releaseBlockerIssuePacket';
import { ReleaseBlockerIssueWebLinksPacketSchema } from '../src/core/releaseBlockerIssueWebLinks';
import {
  assertReleaseBlockerIssueWebLinksPacketIsShareSafe,
  buildReleaseBlockerIssueWebLinksPacket,
  normalizeGitHubRepository,
  RELEASE_BLOCKER_ISSUE_WEB_LINKS_SCHEMA_VERSION,
  renderReleaseBlockerIssueWebLinksMarkdown,
  writeReleaseBlockerIssueWebLinksPacket,
} from '../scripts/release_blocker_issue_links';

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
    generatedAt: '2026-06-22T19:00:00.000Z',
  });
}

afterEach(() => {
  for (const root of tmpRoots.splice(0)) {
    fs.rmSync(root, { force: true, recursive: true });
  }
});

describe('release blocker issue web links', () => {
  it('normalizes supported GitHub repository formats', () => {
    expect(normalizeGitHubRepository('aantenore/movebeta-mobile')).toBe('aantenore/movebeta-mobile');
    expect(normalizeGitHubRepository('https://github.com/aantenore/movebeta-mobile.git')).toBe('aantenore/movebeta-mobile');
    expect(normalizeGitHubRepository('git@github.com:aantenore/movebeta-mobile.git')).toBe('aantenore/movebeta-mobile');
    expect(normalizeGitHubRepository('https://example.com/aantenore/movebeta-mobile')).toBeUndefined();
  });

  it('builds share-safe prefilled GitHub issue links', () => {
    const packet = buildReleaseBlockerIssueWebLinksPacket({
      generatedAt: '2026-06-22T19:05:00.000Z',
      packet: makePacket(),
      repository: 'https://github.com/aantenore/movebeta-mobile.git',
    });

    expect(packet.schemaVersion).toBe(RELEASE_BLOCKER_ISSUE_WEB_LINKS_SCHEMA_VERSION);
    expect(ReleaseBlockerIssueWebLinksPacketSchema.parse(packet)).toEqual(packet);
    expect(packet.repository).toBe('aantenore/movebeta-mobile');
    expect(packet.summary).toMatchObject({
      blockedLinkCount: 0,
      issueCount: 5,
      readyLinkCount: 5,
      status: 'ready',
    });
    expect(packet.issues[0]?.webUrl).toContain('https://github.com/aantenore/movebeta-mobile/issues/new?');
    expect(packet.issues[0]?.webUrl).toContain('title=%5BRelease%20Blocker%5D');
    expect(packet.issues.find((issue) => issue.key === 'cueValidationDataset')?.webUrl).toContain(
      'validation%3Acue%3Acomposition',
    );
    expect(packet.issues.every((issue) => issue.status === 'ready')).toBe(true);
    expect(JSON.stringify(packet)).not.toMatch(/\/Users\/|file:\/\/|ghp_|BEGIN PRIVATE KEY|rawVideoUri|\.mp4/i);
  });

  it('keeps packet blocked when no repository is configured', () => {
    const packet = buildReleaseBlockerIssueWebLinksPacket({
      generatedAt: '2026-06-22T19:10:00.000Z',
      packet: makePacket(),
    });

    expect(packet.summary).toMatchObject({
      blockedLinkCount: 5,
      readyLinkCount: 0,
      status: 'needs-repository',
    });
    expect(packet.issues.every((issue) => issue.status === 'missing-repository')).toBe(true);
    expect(packet.issues.every((issue) => issue.webUrl === undefined)).toBe(true);
  });

  it('flags generated URLs that exceed the configured budget', () => {
    const packet = buildReleaseBlockerIssueWebLinksPacket({
      generatedAt: '2026-06-22T19:15:00.000Z',
      packet: makePacket(),
      repository: 'aantenore/movebeta-mobile',
      urlLengthBudget: 64,
    });

    expect(packet.summary).toMatchObject({
      blockedLinkCount: 5,
      readyLinkCount: 0,
      status: 'review',
    });
    expect(packet.issues.every((issue) => issue.status === 'url-too-long')).toBe(true);
    expect(packet.issues.every((issue) => Boolean(issue.webUrl))).toBe(true);
  });

  it('writes share-safe JSON and Markdown link artifacts', () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'movebeta-issue-links-'));
    tmpRoots.push(root);
    const packet = buildReleaseBlockerIssueWebLinksPacket({
      generatedAt: '2026-06-22T19:20:00.000Z',
      packet: makePacket(),
      repository: 'aantenore/movebeta-mobile',
    });
    const jsonOutputPath = path.join(root, 'docs/sdlc/release-blocker-issue-web-links.json');
    const markdownOutputPath = path.join(root, 'docs/sdlc/release-blocker-issue-web-links.md');

    writeReleaseBlockerIssueWebLinksPacket({ jsonOutputPath, markdownOutputPath, packet });

    expect(JSON.parse(fs.readFileSync(jsonOutputPath, 'utf8'))).toEqual(packet);
    expect(fs.readFileSync(markdownOutputPath, 'utf8')).toContain('Release Blocker Issue Web Links');
    expect(renderReleaseBlockerIssueWebLinksMarkdown(packet)).toContain('[open link]');
    expect(assertReleaseBlockerIssueWebLinksPacketIsShareSafe(packet)).toBe(packet);
  });
});
