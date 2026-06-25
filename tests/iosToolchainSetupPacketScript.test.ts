import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';

import {
  renderIosToolchainSetupMarkdown,
  writeIosToolchainSetupPacket,
} from '../scripts/ios_toolchain_setup_packet';

const generatedAt = '2026-06-25T09:00:00.000Z';
const tmpRoots: string[] = [];

function writeJson(filePath: string, value: unknown) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`);
}

function makeProjectRoot(reportStatus: 'blocked' | 'ready' = 'blocked') {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'movebeta-ios-setup-'));
  tmpRoots.push(root);
  writeJson(path.join(root, 'docs/sdlc/ios-toolchain-report.json'), {
    generatedAt,
    schemaVersion: 'movebeta.ios-toolchain-report.v1',
    status: reportStatus,
    summary:
      reportStatus === 'ready'
        ? {
            buildSettingsProbe: 'pass',
            commandLineToolsOnly: false,
            fullXcode: true,
            podsInstalled: true,
            workspaceExists: true,
            xcodebuildAvailable: true,
          }
        : {
            buildSettingsProbe: 'skipped',
            commandLineToolsOnly: true,
            fullXcode: false,
            podsInstalled: true,
            workspaceExists: true,
            xcodebuildAvailable: false,
          },
  });
  return root;
}

afterEach(() => {
  for (const root of tmpRoots.splice(0)) {
    fs.rmSync(root, { force: true, recursive: true });
  }
});

describe('iOS toolchain setup packet script', () => {
  it('writes blocked JSON and Markdown evidence without leaking local machine paths', () => {
    const rootDir = makeProjectRoot('blocked');
    const { jsonTarget, markdownTarget, packet } = writeIosToolchainSetupPacket({ generatedAt, rootDir });

    expect(jsonTarget).toBe(path.join(rootDir, 'docs/sdlc/ios-toolchain-setup-packet.json'));
    expect(markdownTarget).toBe(path.join(rootDir, 'docs/sdlc/ios-toolchain-setup-packet.md'));
    expect(packet.schemaVersion).toBe('movebeta.ios-toolchain-setup-packet.v1');
    expect(packet.summary).toMatchObject({
      blockedCheckCount: 3,
      readyCheckCount: 2,
      status: 'needs-full-xcode',
      totalCheckCount: 6,
    });
    expect(JSON.parse(fs.readFileSync(jsonTarget, 'utf8'))).toEqual(packet);

    const markdown = fs.readFileSync(markdownTarget, 'utf8');
    expect(markdown).toContain('iOS Toolchain Setup Packet');
    expect(markdown).toContain('Full Xcode installed');
    expect(markdown).toContain('npm run native:ios:doctor');
    expect(markdown).not.toMatch(/\/Library\/|\/Applications\/|\/Users\/|file:\/\/|ghp_|github_pat_|pat_/i);
  });

  it('marks the persisted packet ready when the doctor report is ready', () => {
    const rootDir = makeProjectRoot('ready');
    const { packet } = writeIosToolchainSetupPacket({ generatedAt, rootDir });

    expect(packet.summary.status).toBe('ready-for-ios-build');
    expect(packet.summary.blockedCheckCount).toBe(0);
    expect(renderIosToolchainSetupMarkdown(packet)).toContain('iOS build log captured');
  });
});
