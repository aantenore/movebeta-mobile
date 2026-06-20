import { describe, expect, it } from 'vitest';

import { buildLaunchReadinessSummary, defaultLaunchReadinessEvidence } from '../src/core/launchReadiness';
import { buildNativeQaEvidenceComposerPreview, type NativeQaEvidenceComposerRun } from '../src/core/nativeQaEvidenceComposer';
import {
  assertReleaseEvidenceReconciliationIsShareSafe,
  buildReleaseEvidenceReconciliation,
  parseReleaseEvidenceReconciliationInput,
  releaseEvidenceReconciliationSchemaVersion,
} from '../src/core/releaseEvidenceReconciliation';

const readyComposerRun = {
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

function cueValidationReadyReport() {
  return {
    generatedAt: '2026-06-20T12:00:00.000Z',
    privacy: {
      datasetIncluded: false,
      rawArtifactsIncluded: false,
      reviewerIdentitiesIncluded: false,
    },
    schemaVersion: 'movebeta.cue-validation-dataset-report.v1',
    status: 'ready',
    summary: {
      clipCount: 20,
      failedChecks: 0,
      ready: true,
      reviewCount: 40,
    },
  };
}

function iosToolchainReadyReport() {
  return {
    generatedAt: '2026-06-20T12:00:00.000Z',
    schemaVersion: 'movebeta.ios-toolchain-report.v1',
    status: 'ready',
    summary: {
      buildSettingsProbe: 'pass',
      fullXcode: true,
      podsInstalled: true,
      workspaceExists: true,
      xcodebuildAvailable: true,
    },
  };
}

function storeCredentialsReadyReport() {
  return {
    generatedAt: '2026-06-20T12:00:00.000Z',
    privacy: {
      checkedEnvKeys: ['EXPO_TOKEN'],
      credentialValuesIncluded: false,
      localPathsIncluded: false,
      secretsIncluded: false,
    },
    schemaVersion: 'movebeta.store-credentials-report.v1',
    status: 'ready',
    summary: {
      easCredentialsReady: true,
      easProjectReady: true,
    },
  };
}

function nativeQaReadyEvidence() {
  return buildNativeQaEvidenceComposerPreview({
    generatedAt: '2026-06-20T12:00:00.000Z',
    runs: [
      readyComposerRun,
      {
        ...readyComposerRun,
        clipId: 'qa-clip-002',
        deviceName: 'iPhone 16',
        osVersion: 'iOS 20',
        platform: 'ios',
      },
    ],
  }).payload;
}

describe('release evidence reconciliation', () => {
  it('summarizes the default external blockers without imported evidence', () => {
    const reconciliation = buildReleaseEvidenceReconciliation({
      generatedAt: '2026-06-20T12:00:00.000Z',
    });

    expect(reconciliation.schemaVersion).toBe(releaseEvidenceReconciliationSchemaVersion);
    expect(reconciliation.summary).toMatchObject({
      blockerCount: 5,
      clearedBlockerCount: 0,
      currentReadyTracks: 1,
      missingProofCount: 5,
      projectedReadyTracks: 1,
      status: 'blocked',
      totalTracks: 3,
    });
    expect(reconciliation.items.map((item) => [item.key, item.importedStatus])).toEqual([
      ['iosBuild', 'missing'],
      ['nativeDeviceQa', 'missing'],
      ['cueValidationDataset', 'missing'],
      ['easProject', 'missing'],
      ['easCredentials', 'missing'],
    ]);
  });

  it('projects launch readiness from pasted report evidence without mutating current evidence', () => {
    const reconciliation = buildReleaseEvidenceReconciliation({
      generatedAt: '2026-06-20T12:05:00.000Z',
      importedEvidence: {
        cueValidationDatasetReport: cueValidationReadyReport(),
        iosToolchainReport: iosToolchainReadyReport(),
        nativeQaEvidence: nativeQaReadyEvidence(),
        storeCredentialsReport: storeCredentialsReadyReport(),
      },
    });

    expect(reconciliation.summary).toMatchObject({
      blockerCount: 5,
      clearedBlockerCount: 5,
      currentReadyTracks: 1,
      missingProofCount: 0,
      projectedReadyTracks: 3,
      status: 'ready',
    });
    expect(reconciliation.items.every((item) => item.wouldClear)).toBe(true);
    expect(buildLaunchReadinessSummary(defaultLaunchReadinessEvidence).readyTracks).toBe(1);
    expect(assertReleaseEvidenceReconciliationIsShareSafe(reconciliation)).toBe(reconciliation);
  });

  it('clears store project and credential blockers independently from the same share-safe report', () => {
    const reconciliation = buildReleaseEvidenceReconciliation({
      importedEvidence: {
        storeCredentialsReport: {
          ...storeCredentialsReadyReport(),
          status: 'blocked',
          summary: {
            easCredentialsReady: false,
            easProjectReady: true,
          },
        },
      },
    });

    expect(reconciliation.items.find((item) => item.key === 'easProject')).toMatchObject({
      importedStatus: 'ready',
      wouldClear: true,
    });
    expect(reconciliation.items.find((item) => item.key === 'easCredentials')).toMatchObject({
      importedStatus: 'blocked',
      wouldClear: false,
    });
    expect(reconciliation.summary).toMatchObject({
      clearedBlockerCount: 1,
      missingProofCount: 4,
      status: 'would-improve',
    });
  });

  it('infers a single pasted report and blocks unsafe raw artifact values', () => {
    const parsed = parseReleaseEvidenceReconciliationInput(JSON.stringify(cueValidationReadyReport()));
    const unsafe = parseReleaseEvidenceReconciliationInput(
      JSON.stringify({
        nativeQaEvidence: {
          appVersion: '1.0.0',
          generatedAt: '2026-06-20T12:10:00.000Z',
          runs: [{ clip: { id: 'file:///var/mobile/private.mov' }, platform: 'ios' }],
        },
      }),
    );

    expect(parsed.status).toBe('parsed');
    expect(parsed.bundle.cueValidationDatasetReport).toBeTruthy();
    expect(unsafe.status).toBe('parsed');

    const reconciliation = buildReleaseEvidenceReconciliation({
      importedEvidence: unsafe.bundle,
    });

    expect(reconciliation.summary.status).toBe('invalid-evidence');
    expect(reconciliation.summary.invalidEvidenceCount).toBe(5);
    expect(JSON.stringify(reconciliation)).not.toContain('private.mov');
  });

  it('turns malformed JSON into an invalid evidence preview', () => {
    const parsed = parseReleaseEvidenceReconciliationInput('{not-json');
    const reconciliation = buildReleaseEvidenceReconciliation({
      importedEvidence: parsed.bundle,
      parseError: parsed.parseError,
    });

    expect(parsed.status).toBe('invalid-json');
    expect(reconciliation.parseError).toContain('JSON');
    expect(reconciliation.summary).toMatchObject({
      invalidEvidenceCount: 5,
      status: 'invalid-evidence',
    });
  });
});
