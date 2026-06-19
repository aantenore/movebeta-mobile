import { describe, expect, it } from 'vitest';

import {
  buildNativeQaEvidenceImportPreview,
  nativeQaEvidenceImportSchemaVersion,
} from '../src/core/nativeQaEvidenceImport';
import type { NativeQaEvidencePayload } from '../src/core/nativeQaEvidenceValidation';

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

describe('native QA evidence import preview', () => {
  it('returns an empty local preview before evidence JSON is pasted', () => {
    const preview = buildNativeQaEvidenceImportPreview('  ');

    expect(preview).toMatchObject({
      action: expect.stringContaining('Paste native QA evidence JSON'),
      badge: 'Paste JSON',
      blockingChecks: 0,
      readyRuns: 0,
      schemaVersion: nativeQaEvidenceImportSchemaVersion,
      status: 'empty',
      totalRuns: 0,
    });
  });

  it('reports invalid JSON without throwing', () => {
    const preview = buildNativeQaEvidenceImportPreview('{bad');

    expect(preview).toMatchObject({
      badge: 'Invalid',
      blockingChecks: 1,
      status: 'invalid-json',
    });
    expect(preview.parseError).toBeTruthy();
  });

  it('summarizes ready physical-device evidence', () => {
    const preview = buildNativeQaEvidenceImportPreview(JSON.stringify(readyEvidence));

    expect(preview).toMatchObject({
      badge: 'Ready',
      blockingChecks: 0,
      readyRuns: 2,
      status: 'ready',
      totalRuns: 2,
    });
    expect(preview.runSummaries.map((run) => run.platform)).toEqual(['android', 'ios']);
  });

  it('keeps placeholder or raw-artifact evidence blocked', () => {
    const preview = buildNativeQaEvidenceImportPreview(
      JSON.stringify({
        ...readyEvidence,
        runs: [
          {
            ...readyEvidence.runs?.[0],
            clip: {
              durationMs: 10_000,
              id: 'file:///var/mobile/Containers/Data/climb.mp4',
              source: 'camera',
            },
            videoUri: 'content://media/external/video/42',
          },
          readyEvidence.runs?.[1],
        ],
      }),
    );

    expect(preview).toMatchObject({
      badge: 'Blocked',
      blockingChecks: 1,
      readyRuns: 2,
      status: 'blocked',
      totalRuns: 2,
    });
    expect(preview.failedChecks.map((check) => check.id)).toContain('privacy-artifacts');
  });
});
