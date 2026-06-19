import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';

import {
  buildLaunchReadinessDoctorReport,
  detectLaunchReadinessEvidence,
  writeLaunchReadinessDoctorReport,
} from '../scripts/launch_readiness_doctor.mjs';

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
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'movebeta-readiness-'));
  tmpRoots.push(root);
  writeJson(path.join(root, 'app.json'), {
    expo: {
      extra: {
        launchReadinessEvidence: {
          androidDebugBuild: true,
          iosPods: true,
          nativeDeviceQa: false,
          releaseGate: true,
          webSmoke: true,
        },
      },
    },
  });
  writeJson(path.join(root, 'package.json'), {
    scripts: {
      'release:check': 'npm run quality',
    },
  });
  writeText(path.join(root, 'docs/sdlc/release-readiness-report.md'), [
    '- `npm run release:check`: passed.',
    '- Playwright exported-bundle smoke: passed with `scripts/smoke_web_video.py`.',
  ].join('\n'));
  writeText(path.join(root, 'dist/index.html'), '<!doctype html>');
  writeText(path.join(root, 'docs/store/privacy-declarations.md'), '# Privacy');
  writeJson(path.join(root, 'docs/store/store-manifest.json'), { ok: true });
  writeText(path.join(root, 'docs/store/store-listing.md'), '# Store');
  for (const fileName of ['01-analyze.png', '02-drills.png', '03-progress.png', '04-sessions.png', '05-plan.png', '06-privacy.png']) {
    writeText(path.join(root, 'docs/store/screenshots', fileName), 'png');
  }
  writeText(path.join(root, 'android/app/build/outputs/apk/debug/app-debug.apk'), 'apk');
  writeText(path.join(root, 'ios/Pods/Manifest.lock'), 'pods');
  writeText(path.join(root, 'ios/Pods/Local Podspecs/MoveBetaPose.podspec.json'), '{}');
  return root;
}

afterEach(() => {
  for (const root of tmpRoots.splice(0)) {
    fs.rmSync(root, { force: true, recursive: true });
  }
});

describe('launch readiness doctor', () => {
  it('detects local release evidence from project artifacts', () => {
    const rootDir = makeProjectRoot();

    expect(detectLaunchReadinessEvidence(rootDir, { NODE_ENV: 'test' })).toMatchObject({
      androidDebugBuild: true,
      iosPods: true,
      privacyManifest: true,
      releaseGate: true,
      storeListing: true,
      webSmoke: true,
    });
  });

  it('marks configured-but-missing evidence as drift', () => {
    const rootDir = makeProjectRoot();
    const report = buildLaunchReadinessDoctorReport({
      env: { NODE_ENV: 'test' },
      generatedAt: '2026-06-20T08:00:00.000Z',
      rootDir,
    });

    expect(report.schemaVersion).toBe('movebeta.launch-readiness-report.v1');
    expect(report.checks.find((check) => check.key === 'androidDebugBuild')?.status).toBe('verified');
    expect(report.checks.find((check) => check.key === 'nativeDeviceQa')?.status).toBe('missing');
    expect(report.summary.status).toBe('blocked');
    expect(report.tracks.find((track) => track.key === 'demo')?.status).toBe('ready');
  });

  it('writes a durable launch readiness report', () => {
    const rootDir = makeProjectRoot();
    const outputPath = path.join(rootDir, 'docs/sdlc/launch-readiness-report.json');

    const { report, targetPath } = writeLaunchReadinessDoctorReport({
      env: { NODE_ENV: 'test' },
      generatedAt: '2026-06-20T08:30:00.000Z',
      outputPath,
      rootDir,
    });

    expect(targetPath).toBe(outputPath);
    expect(JSON.parse(fs.readFileSync(outputPath, 'utf8'))).toEqual(report);
  });
});
