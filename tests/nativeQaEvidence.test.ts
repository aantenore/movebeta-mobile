import { describe, expect, it } from 'vitest';

import { validateNativeQaEvidence } from '../scripts/native_qa_evidence_checks.mjs';

const baseRun = {
  buildId: '1.0.0-internal',
  clip: {
    durationMs: 10_000,
    id: 'clip-001',
    source: 'camera',
  },
  deviceName: 'Device',
  osVersion: 'OS 1',
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

describe('native QA evidence', () => {
  it('passes when Android and iOS device runs meet workflow and performance budgets', () => {
    const validation = validateNativeQaEvidence({
      appVersion: '1.0.0',
      generatedAt: '2026-06-19T00:00:00.000Z',
      runs: [
        { ...baseRun, platform: 'android' },
        { ...baseRun, platform: 'ios' },
      ],
    });

    expect(validation.ready).toBe(true);
    expect(validation.checks.every((check) => check.status === 'pass')).toBe(true);
  });

  it('fails when platform coverage, workflows, latency, battery, or thermal evidence is missing', () => {
    const validation = validateNativeQaEvidence({
      appVersion: '1.0.0',
      generatedAt: '2026-06-19T00:00:00.000Z',
      runs: [
        {
          ...baseRun,
          performance: {
            analysisMs: 42_000,
            batteryDropPct: 8,
            thermalState: 'serious',
          },
          platform: 'android',
          workflows: {
            ...baseRun.workflows,
            airplaneModeAnalysis: 'fail',
            metadataRead: 'fail',
            mutedRecording: 'fail',
          },
        },
      ],
    });

    expect(validation.ready).toBe(false);
    expect(validation.checks.filter((check) => check.status === 'fail').map((check) => check.id)).toEqual([
      'platform-ios',
      'run-1-mutedRecording',
      'run-1-metadataRead',
      'run-1-airplaneModeAnalysis',
      'run-1-latency',
      'run-1-battery',
      'run-1-thermal',
    ]);
  });

  it('rejects placeholder device and clip identifiers even when workflows are marked pass', () => {
    const validation = validateNativeQaEvidence({
      appVersion: '1.0.0',
      generatedAt: '2026-06-19T00:00:00.000Z',
      runs: [
        {
          ...baseRun,
          buildId: 'internal-build-id',
          clip: {
            ...baseRun.clip,
            id: 'real-climbing-clip-id',
          },
          deviceName: 'Pixel device name',
          osVersion: 'Android version',
          platform: 'android',
        },
        {
          ...baseRun,
          buildId: 'replace-with-internal-build-id',
          clip: {
            ...baseRun.clip,
            id: 'ios-real-climbing-clip-id',
          },
          deviceName: 'replace-with-ios-device-name',
          osVersion: 'replace-with-ios-os-version',
          platform: 'ios',
        },
      ],
    });

    expect(validation.ready).toBe(false);
    expect(validation.checks.filter((check) => check.status === 'fail').map((check) => check.id)).toEqual([
      'run-1-device',
      'run-1-clip',
      'run-2-device',
      'run-2-clip',
    ]);
  });

  it('rejects raw local video references and secret-like evidence fields', () => {
    const validation = validateNativeQaEvidence({
      appVersion: '1.0.0',
      generatedAt: '2026-06-19T00:00:00.000Z',
      runs: [
        {
          ...baseRun,
          clip: {
            ...baseRun.clip,
            id: 'file:///var/mobile/Containers/Data/Application/climb.mp4',
          },
          platform: 'android',
          videoUri: 'content://media/external/video/42',
        },
        { ...baseRun, clip: { ...baseRun.clip, id: 'qa-clip-002' }, platform: 'ios' },
      ],
    });

    expect(validation.ready).toBe(false);
    expect(validation.checks.find((check) => check.id === 'privacy-artifacts')).toMatchObject({
      status: 'fail',
    });
  });
});
