import { describe, expect, it } from 'vitest';

import {
  buildNativeQaEvidenceDraft,
  type NativeQaEvidencePayload,
  validateNativeQaEvidenceForApp,
} from '../src/core/nativeQaEvidenceValidation';
import { validateNativeQaEvidence } from '../scripts/native_qa_evidence_checks.mjs';

const baseRun = {
  buildId: '1.0.0-internal-42',
  clip: {
    durationMs: 10_000,
    id: 'qa-clip-001',
    source: 'camera',
  },
  deviceName: 'Pixel 9',
  osVersion: 'Android 16',
  performance: {
    analysisMs: 7_000,
    batteryDropPct: 2,
    thermalState: 'nominal',
  },
  provider: 'native-platform-pose',
  recordedAt: '2026-06-19T00:00:00.000Z',
  workflows: {
    airplaneModeAnalysis: 'pass',
    cameraPermission: 'pass',
    deleteReport: 'pass',
    importVideo: 'pass',
    metadataRead: 'pass',
    mutedRecording: 'pass',
    recordVideo: 'pass',
  },
} as const;

const readyEvidence: NativeQaEvidencePayload = {
  appVersion: '1.0.0',
  generatedAt: '2026-06-19T00:00:00.000Z',
  runs: [
    { ...baseRun, platform: 'android' },
    {
      ...baseRun,
      clip: { ...baseRun.clip, id: 'qa-clip-002' },
      deviceName: 'iPhone 16',
      osVersion: 'iOS 20',
      platform: 'ios',
    },
  ],
};

describe('native QA evidence validation for app', () => {
  it('matches the CLI validator for ready evidence', () => {
    const appValidation = validateNativeQaEvidenceForApp(readyEvidence);
    const cliValidation = validateNativeQaEvidence(readyEvidence);

    expect(appValidation.ready).toBe(true);
    expect(appValidation.checks).toEqual(cliValidation.checks);
    expect(appValidation.runSummaries).toEqual([
      { failedChecks: 0, firstIssue: undefined, passedChecks: 14, platform: 'android', status: 'pass', totalChecks: 14 },
      { failedChecks: 0, firstIssue: undefined, passedChecks: 14, platform: 'ios', status: 'pass', totalChecks: 14 },
    ]);
  });

  it('keeps generated draft evidence blocked until real device values replace placeholders', () => {
    const draft = buildNativeQaEvidenceDraft({ generatedAt: '2026-06-19T00:00:00.000Z' });
    const validation = validateNativeQaEvidenceForApp(draft);

    expect(validation.ready).toBe(false);
    expect(validation.checks).toEqual(validateNativeQaEvidence(draft).checks);
    expect(validation.failedChecks.map((check) => check.id)).toEqual(
      expect.arrayContaining(['run-1-device', 'run-1-clip', 'run-1-cameraPermission', 'run-2-latency']),
    );
  });

  it('rejects raw local video references and secret-like fields', () => {
    const evidence = {
      ...readyEvidence,
      runs: [
        {
          ...readyEvidence.runs?.[0],
          clip: { durationMs: 10_000, id: 'file:///var/mobile/Containers/Data/climb.mp4', source: 'camera' },
          videoUri: 'content://media/external/video/42',
        },
        readyEvidence.runs?.[1],
      ],
    };
    const validation = validateNativeQaEvidenceForApp(evidence as NativeQaEvidencePayload);

    expect(validation.ready).toBe(false);
    expect(validation.checks.find((check) => check.id === 'privacy-artifacts')).toMatchObject({
      status: 'fail',
    });
    expect(validateNativeQaEvidence(evidence).checks.find((check) => check.id === 'privacy-artifacts')).toMatchObject({
      status: 'fail',
    });
  });
});
