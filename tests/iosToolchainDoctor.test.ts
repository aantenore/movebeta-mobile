import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';

import {
  buildIosToolchainReport,
  IOS_TOOLCHAIN_REPORT_SCHEMA_VERSION,
  renderIosToolchainMarkdown,
  writeIosToolchainReport,
} from '../scripts/ios_toolchain_doctor.mjs';

const tmpRoots: string[] = [];

function makeRoot() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'movebeta-ios-toolchain-'));
  tmpRoots.push(root);
  fs.mkdirSync(path.join(root, 'ios/MoveBeta.xcworkspace'), { recursive: true });
  fs.mkdirSync(path.join(root, 'ios/Pods/Local Podspecs'), { recursive: true });
  fs.writeFileSync(path.join(root, 'ios/Pods/Manifest.lock'), 'pods');
  fs.writeFileSync(path.join(root, 'ios/Pods/Local Podspecs/MoveBetaPose.podspec.json'), '{}');
  return root;
}

afterEach(() => {
  for (const root of tmpRoots.splice(0)) {
    fs.rmSync(root, { force: true, recursive: true });
  }
});

describe('iOS toolchain doctor', () => {
  it('blocks full iOS build readiness when only Command Line Tools are selected', () => {
    const rootDir = makeRoot();
    const report = buildIosToolchainReport({
      commandRunner: (binary: string, args: string[]) => {
        const command = [binary, ...args].join(' ');
        if (command === 'xcode-select -p') return { ok: true, output: '/Library/Developer/CommandLineTools' };
        if (command === 'xcodebuild -version') return { ok: true, output: 'Xcode 16.2\nBuild version 16C5032a' };
        throw new Error(`Unexpected command: ${command}`);
      },
      fileExists: (filePath) => (filePath.toString() === '/Applications/Xcode.app' ? false : fs.existsSync(filePath)),
      generatedAt: '2026-06-20T10:00:00.000Z',
      rootDir,
    });

    expect(report.schemaVersion).toBe(IOS_TOOLCHAIN_REPORT_SCHEMA_VERSION);
    expect(report.status).toBe('blocked');
    expect(report.summary).toMatchObject({
      buildSettingsProbe: 'skipped',
      commandLineToolsOnly: true,
      fullXcode: false,
      podsInstalled: true,
      workspaceExists: true,
      xcodebuildAvailable: true,
    });
    expect(report.checks.find((check) => check.id === 'full-xcode')?.status).toBe('fail');
    expect(report.checks.find((check) => check.id === 'build-settings')?.status).toBe('warn');
  });

  it('marks the report ready when full Xcode, workspace, pods, and build settings are available', () => {
    const rootDir = makeRoot();
    const report = buildIosToolchainReport({
      commandRunner: (binary: string, args: string[]) => {
        const command = [binary, ...args].join(' ');
        if (command === 'xcode-select -p') return { ok: true, output: '/Applications/Xcode.app/Contents/Developer' };
        if (command === 'xcodebuild -version') return { ok: true, output: 'Xcode 16.2\nBuild version 16C5032a' };
        if (command.includes('-showBuildSettings')) return { ok: true, output: 'BUILD_DIR = /tmp/movebeta' };
        throw new Error(`Unexpected command: ${command}`);
      },
      fileExists: (filePath) => (filePath.toString() === '/Applications/Xcode.app' ? true : fs.existsSync(filePath)),
      generatedAt: '2026-06-20T10:05:00.000Z',
      rootDir,
    });

    expect(report.status).toBe('ready');
    expect(report.summary.buildSettingsProbe).toBe('pass');
    expect(report.summary.fullXcode).toBe(true);
    expect(renderIosToolchainMarkdown(report)).toContain('# iOS Toolchain Report');
  });

  it('writes durable JSON and Markdown artifacts', () => {
    const rootDir = makeRoot();
    const report = buildIosToolchainReport({
      commandRunner: () => ({ ok: false, error: 'not installed' }),
      fileExists: (filePath) => (filePath.toString() === '/Applications/Xcode.app' ? false : fs.existsSync(filePath)),
      generatedAt: '2026-06-20T10:10:00.000Z',
      rootDir,
    });
    const jsonPath = path.join(rootDir, 'docs/sdlc/ios-toolchain-report.json');
    const markdownPath = path.join(rootDir, 'docs/sdlc/ios-toolchain-report.md');

    writeIosToolchainReport({ jsonPath, markdownPath, report });

    expect(JSON.parse(fs.readFileSync(jsonPath, 'utf8'))).toEqual(report);
    expect(fs.readFileSync(markdownPath, 'utf8')).toContain('Next action');
  });
});
