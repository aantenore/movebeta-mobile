import { describe, expect, it } from 'vitest';

import {
  buildNativeQaEvidenceComposerPreview,
  composeNativeQaEvidence,
  nativeQaEvidenceComposerSchemaVersion,
  type NativeQaEvidenceComposerRun,
} from '../src/core/nativeQaEvidenceComposer';
import { validateNativeQaEvidenceForApp } from '../src/core/nativeQaEvidenceValidation';

const readyRun = {
  allWorkflowsPassed: true,
  analysisSeconds: '7',
  batteryDropPct: '2',
  buildId: '1.0.0-internal-42',
  clipDurationSeconds: '10',
  clipId: 'qa-clip-001',
  deviceName: 'Pixel 9',
  osVersion: 'Android 16',
  platform: 'android',
  recordedAt: '2026-06-20T00:00:00.000Z',
  thermalState: 'nominal',
} satisfies NativeQaEvidenceComposerRun;

describe('native QA evidence composer', () => {
  it('composes structured physical-device inputs into validator-ready evidence', () => {
    const preview = buildNativeQaEvidenceComposerPreview({
      appVersion: '1.0.0',
      generatedAt: '2026-06-20T00:00:00.000Z',
      runs: [
        readyRun,
        {
          ...readyRun,
          clipId: 'qa-clip-002',
          deviceName: 'iPhone 16',
          osVersion: 'iOS 20',
          platform: 'ios',
        },
      ],
    });

    expect(preview).toMatchObject({
      badge: 'Ready',
      blockingChecks: 0,
      readyRuns: 2,
      schemaVersion: nativeQaEvidenceComposerSchemaVersion,
      status: 'ready',
      totalRuns: 2,
    });
    expect(preview.payload.runs?.[0]?.clip?.durationMs).toBe(10_000);
    expect(preview.payload.runs?.[0]?.performance?.analysisMs).toBe(7_000);
    expect(validateNativeQaEvidenceForApp(preview.payload).ready).toBe(true);
  });

  it('keeps incomplete or unpassed workflow evidence blocked', () => {
    const payload = composeNativeQaEvidence({
      generatedAt: '2026-06-20T00:00:00.000Z',
      runs: [
        {
          ...readyRun,
          allWorkflowsPassed: false,
          buildId: '',
          clipId: 'qa-clip-001',
          platform: 'android',
        },
      ],
    });
    const validation = validateNativeQaEvidenceForApp(payload);

    expect(validation.ready).toBe(false);
    expect(validation.failedChecks.map((check) => check.id)).toEqual(
      expect.arrayContaining(['platform-ios', 'run-1-device', 'run-1-cameraPermission']),
    );
  });

  it('does not hide raw artifact references composed from user input', () => {
    const preview = buildNativeQaEvidenceComposerPreview({
      generatedAt: '2026-06-20T00:00:00.000Z',
      runs: [
        {
          ...readyRun,
          clipId: 'file:///var/mobile/Containers/Data/climb.mp4',
        },
      ],
    });

    expect(preview.status).toBe('blocked');
    expect(validateNativeQaEvidenceForApp(preview.payload).failedChecks.map((check) => check.id)).toContain(
      'privacy-artifacts',
    );
  });
});
