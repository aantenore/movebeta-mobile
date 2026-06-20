import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';

import {
  buildReleaseHandoffPacket,
  RELEASE_HANDOFF_PACKET_SCHEMA_VERSION,
  renderReleaseHandoffMarkdown,
  writeReleaseHandoffPacket,
} from '../scripts/release_handoff_packet.mjs';

const tmpRoots: string[] = [];

function writeJson(filePath: string, value: unknown) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`);
}

function writeText(filePath: string, value: string) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, value);
}

function makeProjectRoot() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'movebeta-handoff-'));
  tmpRoots.push(root);
  writeJson(path.join(root, 'package.json'), { name: 'movebeta-mobile', version: '1.0.0' });
  writeJson(path.join(root, 'app.json'), {
    expo: {
      android: { package: 'com.movebeta.mobile' },
      ios: { bundleIdentifier: 'com.movebeta.mobile' },
      name: 'MoveBeta',
      slug: 'movebeta-mobile',
      version: '1.0.0',
    },
  });
  writeJson(path.join(root, 'docs/sdlc/release-gate-report.json'), {
    schemaVersion: 'movebeta.release-gate-report.v1',
    status: 'pass',
    steps: [],
  });
  writeJson(path.join(root, 'docs/sdlc/launch-readiness-report.json'), {
    checks: [
      {
        action: 'Capture docs/sdlc/native-qa-evidence.json from physical iOS and Android runs.',
        key: 'nativeDeviceQa',
        label: 'Native device QA evidence',
        owner: 'qa',
        status: 'missing',
      },
      {
        action: 'Run npm run release:check and refresh the release readiness report.',
        key: 'releaseGate',
        label: 'Release gate',
        owner: 'engineering',
        status: 'verified',
      },
    ],
    schemaVersion: 'movebeta.launch-readiness-report.v1',
    summary: {
      nextAction: 'Capture docs/sdlc/native-qa-evidence.json from physical iOS and Android runs.',
      readyTracks: 1,
      status: 'blocked',
      totalTracks: 3,
    },
  });
  writeJson(path.join(root, 'docs/sdlc/movenet-readiness-report.json'), {
    averageInferenceMs: 349,
    loadMs: 3887,
    schemaVersion: 'movebeta.movenet-readiness-report.v1',
    status: 'ready',
  });
  writeJson(path.join(root, 'docs/sdlc/github-workflow-report.json'), {
    schemaVersion: 'movebeta.github-workflow-report.v1',
    status: 'blocked',
  });
  writeJson(path.join(root, 'docs/sdlc/dependency-license-report.json'), {
    schemaVersion: 'movebeta.dependency-license-report.v1',
    status: 'review',
  });
  writeJson(path.join(root, 'docs/store/store-manifest.json'), {
    screenshots: [
      { fileName: '01-analyze.png', label: 'Analyze' },
      { fileName: '07-release-unblock.png', label: 'Release unblock checklist' },
    ],
  });
  writeText(path.join(root, 'docs/store/screenshots/01-analyze.png'), 'png');
  writeText(path.join(root, 'docs/sdlc/release-readiness-report.md'), '# Release');
  writeText(path.join(root, 'docs/sdlc/native-qa-runbook.json'), '{}');
  writeText(path.join(root, 'docs/screenshots.md'), '# Screenshots');
  return root;
}

function initializeGitRepo(rootDir: string) {
  execFileSync('git', ['init'], { cwd: rootDir, stdio: 'ignore' });
  execFileSync('git', ['config', 'user.email', 'test@example.com'], { cwd: rootDir, stdio: 'ignore' });
  execFileSync('git', ['config', 'user.name', 'MoveBeta Test'], { cwd: rootDir, stdio: 'ignore' });
  execFileSync('git', ['add', '.'], { cwd: rootDir, stdio: 'ignore' });
  execFileSync('git', ['commit', '-m', 'baseline'], { cwd: rootDir, stdio: 'ignore' });
}

afterEach(() => {
  for (const root of tmpRoots.splice(0)) {
    fs.rmSync(root, { force: true, recursive: true });
  }
});

describe('release handoff packet', () => {
  it('summarizes release gates, blockers, screenshots, and commands', () => {
    const rootDir = makeProjectRoot();
    const packet = buildReleaseHandoffPacket({
      commitSha: 'abc123',
      generatedAt: '2026-06-20T10:00:00.000Z',
      remoteUrl: 'https://github.com/aantenore/movebeta-mobile.git',
      rootDir,
    });

    expect(packet.schemaVersion).toBe(RELEASE_HANDOFF_PACKET_SCHEMA_VERSION);
    expect(packet.repository.commitSha).toBe('abc123');
    expect(packet.summary).toMatchObject({
      blockerCount: 1,
      existingScreenshots: 1,
      expectedScreenshots: 2,
      launchStatus: 'blocked',
      moveNetStatus: 'ready',
      releaseGateStatus: 'pass',
    });
    expect(packet.blockers[0]).toMatchObject({
      key: 'nativeDeviceQa',
      tracks: ['internal', 'store'],
    });
    expect(packet.commands.map((item) => item.key)).toContain('eas-strict');
    expect(packet.commands.map((item) => item.key)).toContain('github-workflow');
    expect(packet.commands.map((item) => item.key)).toContain('dependency-licenses');
    expect(packet.artifacts.map((item) => item.label)).toContain('GitHub workflow report');
    expect(packet.artifacts.map((item) => item.label)).toContain('Dependency license report');
  });

  it('renders a markdown handoff without leaking secret values', () => {
    const rootDir = makeProjectRoot();
    const packet = buildReleaseHandoffPacket({
      commitSha: 'abc123',
      generatedAt: '2026-06-20T10:00:00.000Z',
      remoteUrl: 'https://github.com/aantenore/movebeta-mobile.git',
      rootDir,
    });
    const markdown = renderReleaseHandoffMarkdown(packet);

    expect(markdown).toContain('MoveBeta Release Handoff Packet');
    expect(markdown).toContain('Native device QA evidence');
    expect(markdown).toContain('GitHub workflow doctor');
    expect(markdown).toContain('Dependency license report');
    expect(markdown).toContain('npm run release:eas:strict');
    expect(markdown).not.toMatch(/BEGIN PRIVATE KEY|ghp_|pat_|eyJ/i);
  });

  it('writes durable JSON and Markdown artifacts', () => {
    const rootDir = makeProjectRoot();
    const jsonOutputPath = path.join(rootDir, 'docs/sdlc/release-handoff-packet.json');
    const markdownOutputPath = path.join(rootDir, 'docs/sdlc/release-handoff-packet.md');
    const { jsonTarget, markdownTarget, packet } = writeReleaseHandoffPacket({
      generatedAt: '2026-06-20T10:00:00.000Z',
      jsonOutputPath,
      markdownOutputPath,
      rootDir,
    });

    expect(jsonTarget).toBe(jsonOutputPath);
    expect(markdownTarget).toBe(markdownOutputPath);
    expect(JSON.parse(fs.readFileSync(jsonOutputPath, 'utf8'))).toEqual(packet);
    expect(fs.readFileSync(markdownOutputPath, 'utf8')).toContain('## Verification Commands');
  });

  it('ignores generated packet files but reports real source changes in repository state', () => {
    const rootDir = makeProjectRoot();
    initializeGitRepo(rootDir);
    writeReleaseHandoffPacket({
      generatedAt: '2026-06-20T10:00:00.000Z',
      rootDir,
    });

    const cleanPacket = buildReleaseHandoffPacket({
      generatedAt: '2026-06-20T10:01:00.000Z',
      rootDir,
    });

    expect(cleanPacket.repository.worktreeDirty).toBe(false);
    expect(cleanPacket.repository.changedPaths).toEqual([]);

    execFileSync('git', ['add', 'docs/sdlc/release-handoff-packet.json', 'docs/sdlc/release-handoff-packet.md'], {
      cwd: rootDir,
      stdio: 'ignore',
    });
    execFileSync('git', ['commit', '-m', 'add generated packet'], { cwd: rootDir, stdio: 'ignore' });
    writeText(path.join(rootDir, 'docs/sdlc/release-handoff-packet.md'), '# regenerated packet');
    const modifiedPacketOnly = buildReleaseHandoffPacket({
      generatedAt: '2026-06-20T10:01:30.000Z',
      rootDir,
    });

    expect(modifiedPacketOnly.repository.worktreeDirty).toBe(false);
    expect(modifiedPacketOnly.repository.changedPaths).toEqual([]);

    writeText(path.join(rootDir, 'README.md'), '# changed');
    const dirtyPacket = buildReleaseHandoffPacket({
      generatedAt: '2026-06-20T10:02:00.000Z',
      rootDir,
    });

    expect(dirtyPacket.repository.worktreeDirty).toBe(true);
    expect(dirtyPacket.repository.changedPaths.join('\n')).toContain('README.md');
  });
});
