import { describe, expect, it } from 'vitest';

import {
  assertDataRoomIndexIsShareSafe,
  buildDataRoomIndex,
  dataRoomIndexArtifactLocations,
  dataRoomIndexSchemaVersion,
  DataRoomIndexSchema,
  type DataRoomIndex,
  type DataRoomReportBundle,
} from '../src/core/dataRoomIndex';

const generatedAt = '2026-06-23T15:00:00.000Z';

function allArtifactsAvailable(overrides: Record<string, boolean> = {}) {
  return Object.fromEntries(dataRoomIndexArtifactLocations.map((location) => [location, overrides[location] ?? true]));
}

function readyReports(): DataRoomReportBundle {
  return {
    acquisitionReadinessPacket: report('ready'),
    cueValidationDatasetReport: report('ready'),
    dependencyLicenseReport: report('ready'),
    externalEvidenceIntakeReport: report('ready'),
    featureCompletionReport: report('ready'),
    githubWorkflowReport: report('ready'),
    iosToolchainSetupPacket: report('ready-for-ios-build'),
    iosToolchainReport: report('ready'),
    licenseReviewPacket: report('ready'),
    launchReadinessReport: {
      checks: [
        { key: 'nativeDeviceQa', label: 'Native device QA evidence', owner: 'qa', status: 'verified' },
      ],
      generatedAt,
      schemaVersion: 'movebeta.launch-readiness-report.v1',
      summary: {
        nextAction: 'All launch tracks are ready.',
        readyTracks: 3,
        status: 'ready',
        totalTracks: 3,
      },
    },
    modelAssetProvenanceReport: report('ready'),
    modelDeliveryLifecycleReport: report('ready'),
    modelDownloadPlanReport: report('action'),
    modelVerificationSuiteReport: report('technical-ready'),
    moveNetReadinessReport: report('ready'),
    nativeQaEvidenceStarterReport: report('ready'),
    pwaReadinessReport: report('ready'),
    releaseBlockerIssueWebLinks: report('ready'),
    releaseBlockerProgressReport: report('ready'),
    releaseFreshnessReport: report('ready'),
    releaseGateReport: { completedAt: generatedAt, schemaVersion: 'movebeta.release-gate-report.v1', status: 'pass' },
    releaseHandoffPacket: report('ready'),
    storeReleaseAccountRunbook: report('ready-for-submission'),
    storeCredentialsSetupPacket: report('ready'),
    storeSubmissionPacket: report('metadata-ready'),
    vercelDeploymentHandoff: report('handoff-ready'),
    vercelDeploymentReport: report('static-ready'),
    vercelWorkflowReport: report('template-ready'),
    webSmokeReport: report('pass'),
  };
}

function report(status: string) {
  return {
    generatedAt,
    schemaVersion: 'movebeta.test-report.v1',
    status,
  };
}

describe('data room index', () => {
  it('builds a ready share-safe data-room index from complete evidence', () => {
    const index = buildDataRoomIndex({
      artifactAvailability: allArtifactsAvailable(),
      generatedAt,
      reports: readyReports(),
    });

    expect(DataRoomIndexSchema.parse(index)).toEqual(index);
    expect(index.schemaVersion).toBe(dataRoomIndexSchemaVersion);
    expect(index.summary).toMatchObject({
      blockedCount: 0,
      externalRequiredCount: 0,
      itemCount: 33,
      missingCount: 0,
      readyCount: 33,
      reviewCount: 0,
      status: 'ready',
    });
    expect(index.commands.map((command) => command.key)).toContain('data-room-index');
    expect(index.items.map((item) => item.key)).toContain('source-archive');
    expect(index.items.map((item) => item.key)).toContain('ios-toolchain-setup-packet');
    expect(index.items.map((item) => item.key)).toContain('vercel-deployment-handoff');
    expect(index.items.map((item) => item.key)).toContain('license-review-packet');
    expect(index.items.map((item) => item.key)).toContain('model-download-plan');
    expect(index.items.map((item) => item.key)).toContain('third-party-notices');
    expect(JSON.stringify(index)).not.toMatch(/BEGIN PRIVATE KEY|ghp_|github_pat_|pat_|sk_live_|file:\/\/|\/Users\//i);
  });

  it('separates external proof requirements from missing internal artifacts', () => {
    const reports = readyReports();
    const index = buildDataRoomIndex({
      artifactAvailability: allArtifactsAvailable(),
      generatedAt,
      reports: {
        ...reports,
        acquisitionReadinessPacket: report('needs-external-clearance'),
        cueValidationDatasetReport: report('blocked'),
        featureCompletionReport: report('external-blocked'),
        launchReadinessReport: {
          checks: [
            {
              action: 'Create docs/validation/cue-validation-dataset.json from real consented coach reviews.',
              key: 'cueValidationDataset',
              label: 'Cue-validation dataset',
              owner: 'product',
              status: 'missing',
            },
            {
              action: 'Capture docs/sdlc/native-qa-evidence.json from physical iOS and Android runs.',
              key: 'nativeDeviceQa',
              label: 'Native device QA evidence',
              owner: 'qa',
              status: 'missing',
            },
          ],
          generatedAt,
          schemaVersion: 'movebeta.launch-readiness-report.v1',
          summary: {
            nextAction: 'Create docs/validation/cue-validation-dataset.json from real consented coach reviews.',
            readyTracks: 1,
            status: 'blocked',
            totalTracks: 3,
          },
        },
        nativeQaEvidenceStarterReport: report('needs-device-evidence'),
      },
    });

    expect(index.summary.status).toBe('needs-external-evidence');
    expect(index.summary.externalRequiredCount).toBeGreaterThanOrEqual(5);
    expect(index.items.find((item) => item.key === 'external-cueValidationDataset')).toMatchObject({
      location: 'docs/validation/cue-validation-dataset.json',
      status: 'external-required',
    });
    expect(index.items.find((item) => item.key === 'external-nativeDeviceQa')).toMatchObject({
      location: 'docs/sdlc/native-qa-evidence.json',
      status: 'external-required',
    });
    expect(index.summary.nextAction).toBe('Create docs/validation/cue-validation-dataset.json from real consented coach reviews.');
  });

  it('blocks the index when an internal data-room artifact is missing', () => {
    const index = buildDataRoomIndex({
      artifactAvailability: allArtifactsAvailable({ 'docs/sdlc/release-gate-report.json': false }),
      generatedAt,
      reports: {
        ...readyReports(),
        releaseGateReport: undefined,
      },
    });

    expect(index.summary.status).toBe('blocked');
    expect(index.summary.missingCount).toBe(1);
    expect(index.summary.nextAction).toContain('Release gate report');
  });

  it('rejects local paths, raw media references, credentials, and token-like values before sharing', () => {
    const index = buildDataRoomIndex({
      artifactAvailability: allArtifactsAvailable(),
      generatedAt,
      reports: readyReports(),
    });
    const unsafe: DataRoomIndex = {
      ...index,
      items: [
        {
          ...index.items[0],
          purpose: 'Review file:///Users/antonio/private/raw-beta.mov with ghp_1234567890abcdefTOKENVALUE.',
        },
      ],
    };

    expect(() => assertDataRoomIndexIsShareSafe(unsafe)).toThrow('Data-room index contains credential');
  });
});
