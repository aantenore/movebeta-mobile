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
          nativeQaRunbook: true,
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
  writeJson(path.join(root, 'docs/sdlc/release-gate-report.json'), {
    completedAt: '2026-06-20T08:00:00.000Z',
    schemaVersion: 'movebeta.release-gate-report.v1',
    startedAt: '2026-06-20T07:59:00.000Z',
    status: 'pass',
    steps: [
      'quality',
      'modelReadiness',
      'modelAnalysisReplay',
      'nativeQaRunbook',
      'iosToolchainDoctor',
      'webExport',
      'easStandard',
      'securityAudit',
    ].map((key) => ({
      command: `npm run ${key}`,
      completedAt: '2026-06-20T08:00:00.000Z',
      durationMs: 100,
      exitCode: 0,
      key,
      label: key,
      startedAt: '2026-06-20T07:59:00.000Z',
      status: 'pass',
    })),
  });
  writeJson(path.join(root, 'docs/sdlc/ios-toolchain-report.json'), {
    schemaVersion: 'movebeta.ios-toolchain-report.v1',
    status: 'blocked',
  });
  writeText(path.join(root, 'dist/index.html'), '<!doctype html>');
  writeText(path.join(root, 'docs/store/privacy-declarations.md'), '# Privacy');
  writeJson(path.join(root, 'docs/store/store-manifest.json'), { ok: true });
  writeText(path.join(root, 'docs/store/store-listing.md'), '# Store');
  writeJson(path.join(root, 'docs/sdlc/movenet-readiness-report.json'), {
    schemaVersion: 'movebeta.movenet-readiness-report.v1',
    status: 'ready',
  });
  writeJson(path.join(root, 'docs/sdlc/model-analysis-replay-report.json'), {
    attempts: [
      {
        analysisQualityScore: 100,
        cueIds: ['cue-pause'],
        frameCount: 35,
        metricIds: ['flow', 'pause-time', 'lock-off', 'hip-drift', 'foot-cuts'],
        passed: true,
        privacySafe: true,
        provider: 'web-tfjs-movenet',
        sessionId: 'session-board-001',
        title: 'Overhang board attempt',
        wallAngle: 'overhang',
      },
    ],
    generatedAt: '2026-06-20T08:00:00.000Z',
    minQualityScore: 90,
    schemaVersion: 'movebeta.model-analysis-replay-report.v1',
    status: 'pass',
    summary: {
      failedAttempts: 0,
      passedAttempts: 1,
      totalAttempts: 1,
    },
  });
  writeJson(path.join(root, 'docs/sdlc/native-qa-runbook.json'), {
    schemaVersion: 'movebeta.native-qa-runbook.v1',
  });
  for (const fileName of ['01-analyze.png', '02-drills.png', '03-progress.png', '04-sessions.png', '05-plan.png', '06-privacy.png']) {
    writeText(path.join(root, 'docs/store/screenshots', fileName), 'png');
  }
  writeText(path.join(root, 'android/app/build/outputs/apk/debug/app-debug.apk'), 'apk');
  writeText(path.join(root, 'ios/Pods/Manifest.lock'), 'pods');
  writeText(path.join(root, 'ios/Pods/Local Podspecs/MoveBetaPose.podspec.json'), '{}');
  return root;
}

const nativeQaRun = {
  buildId: '1.0.0-qa-android-20260619',
  clip: {
    durationMs: 10_000,
    id: 'qa-clip-001',
    source: 'camera',
  },
  deviceName: 'Pixel 8',
  osVersion: 'Android 16',
  performance: {
    analysisMs: 7_000,
    batteryDropPct: 2,
    thermalState: 'nominal',
  },
  provider: 'native-platform-pose',
  workflows: {
    airplaneModeAnalysis: 'pass',
    cameraPermission: 'pass',
    deleteReport: 'pass',
    importVideo: 'pass',
    metadataRead: 'pass',
    mutedRecording: 'pass',
    recordVideo: 'pass',
  },
};

function writeValidNativeQaEvidence(rootDir: string) {
  writeJson(path.join(rootDir, 'docs/sdlc/native-qa-evidence.json'), {
    appVersion: '1.0.0',
    generatedAt: '2026-06-20T09:00:00.000Z',
    runs: [
      { ...nativeQaRun, platform: 'android' },
      {
        ...nativeQaRun,
        buildId: '1.0.0-qa-ios-20260619',
        clip: { ...nativeQaRun.clip, id: 'qa-clip-002' },
        deviceName: 'iPhone 15',
        osVersion: 'iOS 20',
        platform: 'ios',
      },
    ],
  });
}

function validationClip(wallAngle: 'slab' | 'vertical' | 'overhang') {
  return {
    clipId: `clip-${wallAngle}`,
    consentRecordId: `consent-${wallAngle}`,
    packet: {
      analysis: {
        cues: [{ id: `cue-${wallAngle}`, title: `Cue ${wallAngle}` }],
      },
      consent: {
        rawVideoIncluded: false,
        videoLeavesDevice: false,
      },
      reportId: `analysis-${wallAngle}`,
      session: { wallAngle },
    },
    reviews: [
      {
        cueId: `cue-${wallAngle}`,
        drillFit: 5,
        relevance: 5,
        reviewMode: 'packet-only',
        reviewerId: `coach-${wallAngle}-a`,
        reviewerRole: 'coach',
        safetyLanguage: 5,
        timingAccuracy: 5,
      },
    ],
  };
}

function writeValidCueValidationDataset(rootDir: string) {
  writeJson(path.join(rootDir, 'docs/validation/cue-validation-dataset.json'), {
    acceptance: {
      minClips: 3,
      minDistinctReviewersPerClip: 1,
      minReviewsPerCue: 1,
    },
    appVersion: '1.0.0',
    clips: [validationClip('slab'), validationClip('vertical'), validationClip('overhang')],
    generatedAt: '2026-06-20T09:05:00.000Z',
    schemaVersion: 'movebeta.cue-validation-dataset.v1',
  });
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
      iosBuild: false,
      iosPods: true,
      modelAnalysisReplay: true,
      modelReadiness: true,
      privacyManifest: true,
      releaseGate: true,
      storeListing: true,
      webSmoke: true,
      nativeQaRunbook: true,
    });
  });

  it('requires every screenshot declared by the store manifest', () => {
    const rootDir = makeProjectRoot();
    writeJson(path.join(rootDir, 'docs/store/store-manifest.json'), {
      screenshots: [
        { fileName: '01-analyze.png' },
        { fileName: '02-drills.png' },
        { fileName: '07-release-unblock.png' },
      ],
    });

    expect(detectLaunchReadinessEvidence(rootDir, { NODE_ENV: 'test' }).storeListing).toBe(false);

    writeText(path.join(rootDir, 'docs/store/screenshots/07-release-unblock.png'), 'png');

    expect(detectLaunchReadinessEvidence(rootDir, { NODE_ENV: 'test' }).storeListing).toBe(true);
  });

  it('uses the iOS toolchain report status for iOS build evidence', () => {
    const rootDir = makeProjectRoot();

    expect(detectLaunchReadinessEvidence(rootDir, { NODE_ENV: 'test' }).iosBuild).toBe(false);

    writeJson(path.join(rootDir, 'docs/sdlc/ios-toolchain-report.json'), {
      schemaVersion: 'movebeta.ios-toolchain-report.v1',
      status: 'ready',
    });

    expect(detectLaunchReadinessEvidence(rootDir, { NODE_ENV: 'test' }).iosBuild).toBe(true);
  });

  it('validates native QA evidence content instead of only checking file presence', () => {
    const rootDir = makeProjectRoot();
    writeJson(path.join(rootDir, 'docs/sdlc/native-qa-evidence.json'), {
      appVersion: '1.0.0',
      generatedAt: '2026-06-20T09:00:00.000Z',
      runs: [
        {
          ...nativeQaRun,
          buildId: 'internal-build-id',
          clip: { ...nativeQaRun.clip, id: 'real-climbing-clip-id' },
          deviceName: 'Pixel device name',
          platform: 'android',
        },
      ],
    });

    expect(detectLaunchReadinessEvidence(rootDir, { NODE_ENV: 'test' }).nativeDeviceQa).toBe(false);

    writeValidNativeQaEvidence(rootDir);

    expect(detectLaunchReadinessEvidence(rootDir, { NODE_ENV: 'test' }).nativeDeviceQa).toBe(true);
  });

  it('validates cue-validation dataset content instead of only checking file presence', () => {
    const rootDir = makeProjectRoot();
    writeJson(path.join(rootDir, 'docs/validation/cue-validation-dataset.json'), {
      appVersion: '1.0.0',
      clips: [validationClip('vertical')],
      generatedAt: '2026-06-20T09:05:00.000Z',
      schemaVersion: 'movebeta.cue-validation-dataset.v1',
    });

    expect(detectLaunchReadinessEvidence(rootDir, { NODE_ENV: 'test' }).cueValidationDataset).toBe(false);

    writeValidCueValidationDataset(rootDir);

    expect(detectLaunchReadinessEvidence(rootDir, { NODE_ENV: 'test' }).cueValidationDataset).toBe(true);
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
    expect(report.checks.find((check) => check.key === 'modelReadiness')?.status).toBe('verified');
    expect(report.checks.find((check) => check.key === 'modelAnalysisReplay')?.status).toBe('verified');
    expect(report.checks.find((check) => check.key === 'nativeQaRunbook')?.status).toBe('verified');
    expect(report.summary.status).toBe('blocked');
    expect(report.tracks.find((track) => track.key === 'demo')?.status).toBe('ready');
  });

  it('uses the machine release gate report instead of trusting stale release markdown', () => {
    const rootDir = makeProjectRoot();
    writeJson(path.join(rootDir, 'docs/sdlc/release-gate-report.json'), {
      completedAt: '2026-06-20T08:00:00.000Z',
      schemaVersion: 'movebeta.release-gate-report.v1',
      startedAt: '2026-06-20T07:59:00.000Z',
      status: 'fail',
      steps: [
        {
          command: 'npm run quality',
          completedAt: '2026-06-20T08:00:00.000Z',
          durationMs: 100,
          exitCode: 1,
          key: 'quality',
          label: 'quality',
          startedAt: '2026-06-20T07:59:00.000Z',
          status: 'fail',
        },
      ],
    });

    const report = buildLaunchReadinessDoctorReport({
      env: { NODE_ENV: 'test' },
      generatedAt: '2026-06-20T08:05:00.000Z',
      rootDir,
    });

    expect(report.checks.find((check) => check.key === 'releaseGate')?.status).toBe('drift');
    expect(report.tracks.find((track) => track.key === 'demo')?.status).toBe('drift');
  });

  it('blocks demo readiness when the MoveNet model report is missing', () => {
    const rootDir = makeProjectRoot();
    fs.rmSync(path.join(rootDir, 'docs/sdlc/movenet-readiness-report.json'));

    const report = buildLaunchReadinessDoctorReport({
      env: { NODE_ENV: 'test' },
      generatedAt: '2026-06-20T08:10:00.000Z',
      rootDir,
    });

    expect(report.checks.find((check) => check.key === 'modelReadiness')?.status).toBe('missing');
    expect(report.tracks.find((track) => track.key === 'demo')?.status).toBe('blocked');
  });

  it('blocks demo readiness when the model-analysis replay report is missing or failing', () => {
    const rootDir = makeProjectRoot();
    fs.rmSync(path.join(rootDir, 'docs/sdlc/model-analysis-replay-report.json'));

    const missingReport = buildLaunchReadinessDoctorReport({
      env: { NODE_ENV: 'test' },
      generatedAt: '2026-06-20T08:12:00.000Z',
      rootDir,
    });

    expect(missingReport.checks.find((check) => check.key === 'modelAnalysisReplay')?.status).toBe('missing');
    expect(missingReport.tracks.find((track) => track.key === 'demo')?.status).toBe('blocked');

    writeJson(path.join(rootDir, 'docs/sdlc/model-analysis-replay-report.json'), {
      attempts: [
        {
          analysisQualityScore: 44,
          cueIds: [],
          frameCount: 35,
          metricIds: [],
          passed: false,
          privacySafe: true,
          provider: 'web-tfjs-movenet',
          sessionId: 'session-board-001',
          title: 'Overhang board attempt',
          wallAngle: 'overhang',
        },
      ],
      generatedAt: '2026-06-20T08:13:00.000Z',
      minQualityScore: 90,
      schemaVersion: 'movebeta.model-analysis-replay-report.v1',
      status: 'fail',
      summary: {
        failedAttempts: 1,
        passedAttempts: 0,
        totalAttempts: 1,
      },
    });

    const failingReport = buildLaunchReadinessDoctorReport({
      env: { NODE_ENV: 'test' },
      generatedAt: '2026-06-20T08:14:00.000Z',
      rootDir,
    });

    expect(failingReport.checks.find((check) => check.key === 'modelAnalysisReplay')?.status).toBe('missing');
    expect(failingReport.tracks.find((track) => track.key === 'demo')?.status).toBe('blocked');
  });

  it('reports missing native QA runbook separately from missing device evidence', () => {
    const rootDir = makeProjectRoot();
    fs.rmSync(path.join(rootDir, 'docs/sdlc/native-qa-runbook.json'));

    const report = buildLaunchReadinessDoctorReport({
      env: { NODE_ENV: 'test' },
      generatedAt: '2026-06-20T08:20:00.000Z',
      rootDir,
    });

    expect(report.checks.find((check) => check.key === 'nativeQaRunbook')?.status).toBe('drift');
    expect(report.checks.find((check) => check.key === 'nativeDeviceQa')?.status).toBe('missing');
    expect(report.tracks.find((track) => track.key === 'internal')?.driftChecks).toBe(1);
    expect(report.tracks.find((track) => track.key === 'internal')?.missingChecks).toBe(1);
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
