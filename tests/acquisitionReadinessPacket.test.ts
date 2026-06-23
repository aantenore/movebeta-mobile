import { describe, expect, it } from 'vitest';

import {
  acquisitionReadinessPacketSchemaVersion,
  AcquisitionReadinessPacketSchema,
  assertAcquisitionReadinessPacketIsShareSafe,
  buildAcquisitionReadinessPacket,
  type AcquisitionReadinessPacket,
} from '../src/core/acquisitionReadinessPacket';
import { buildBillingReadinessSummary } from '../src/core/billingReadiness';
import { buildCommercialReadinessPacket } from '../src/core/commercialReadinessPacket';

const generatedAt = '2026-06-23T12:00:00.000Z';

function readyReports() {
  const commercialReadinessPacket = buildCommercialReadinessPacket({
    generatedAt,
    readiness: buildBillingReadinessSummary({
      entitlementSource: 'provider-webhook',
      planMappings: {
        coach: 'movebeta_coach_monthly',
        pro: 'movebeta_pro_monthly',
      },
      provider: 'revenuecat',
      receiptValidation: 'provider-managed',
      sandboxReady: true,
    }),
  });

  return {
    commercialReadinessPacket,
    dependencyLicenseReport: {
      generatedAt,
      schemaVersion: 'movebeta.dependency-license-report.v1',
      summary: { status: 'ready' },
    },
    featureCompletionReport: {
      generatedAt,
      schemaVersion: 'movebeta.feature-completion-report.v1',
      status: 'ready',
      summary: {
        externalBlockerCount: 0,
        internalGapCount: 0,
        traceabilityCoveredCount: 168,
        traceabilityItemCount: 168,
      },
    },
    launchReadinessReport: {
      generatedAt,
      schemaVersion: 'movebeta.launch-readiness-report.v1',
      summary: {
        nextAction: 'All launch tracks are ready.',
        readyTracks: 3,
        status: 'ready',
        totalTracks: 3,
      },
    },
    licenseReviewPacket: {
      generatedAt,
      schemaVersion: 'movebeta.license-review-packet.v1',
      summary: { status: 'ready' },
    },
    modelAssetProvenanceReport: {
      generatedAt,
      schemaVersion: 'movebeta.model-asset-provenance-report.v1',
      summary: { status: 'ready' },
    },
    modelDeliveryLifecycleReport: {
      generatedAt,
      schemaVersion: 'movebeta.model-delivery-lifecycle.v1',
      summary: { status: 'ready' },
    },
    pwaReadinessReport: {
      generatedAt,
      schemaVersion: 'movebeta.pwa-readiness-report.v1',
      summary: { status: 'ready' },
    },
    releaseGateReport: {
      completedAt: generatedAt,
      schemaVersion: 'movebeta.release-gate-report.v1',
      status: 'pass',
    },
    releaseHandoffPacket: {
      generatedAt,
      schemaVersion: 'movebeta.release-handoff-packet.v1',
      summary: {
        existingScreenshots: 12,
        expectedScreenshots: 12,
      },
    },
    storeSubmissionPacket: {
      generatedAt,
      schemaVersion: 'movebeta.store-submission-packet.v1',
      summary: { status: 'metadata-ready' },
    },
    vercelDeploymentHandoff: {
      generatedAt,
      schemaVersion: 'movebeta.vercel-deployment-handoff.v1',
      summary: { status: 'handoff-ready' },
    },
    vercelDeploymentReport: {
      generatedAt,
      schemaVersion: 'movebeta.vercel-deployment-readiness.v1',
      summary: { status: 'ready' },
    },
    webSmokeReport: {
      generatedAt,
      schemaVersion: 'movebeta.web-smoke-report.v1',
      status: 'pass',
      summary: { status: 'pass' },
    },
  };
}

function allArtifactsAvailable() {
  return {
    '../movebeta-mobile-source.zip': true,
    '../movebeta-mobile-web-dist.zip': true,
    'docs/screenshots.md': true,
    'docs/sdlc/acquisition-readiness-packet.json': true,
    'docs/sdlc/dependency-license-report.json': true,
    'docs/sdlc/feature-completion-report.json': true,
    'docs/sdlc/launch-readiness-report.json': true,
    'docs/sdlc/license-review-packet.json': true,
    'docs/sdlc/model-asset-provenance-report.json': true,
    'docs/sdlc/model-delivery-lifecycle-report.json': true,
    'docs/sdlc/pwa-readiness-report.json': true,
    'docs/sdlc/release-gate-report.json': true,
    'docs/sdlc/release-handoff-packet.json': true,
    'docs/sdlc/vercel-deployment-report.json': true,
    'docs/sdlc/vercel-deployment-handoff.json': true,
    'docs/sdlc/web-smoke-report.json': true,
    'docs/store/store-submission-packet.json': true,
    'docs/legal/THIRD_PARTY_NOTICES.md': true,
  };
}

describe('acquisition readiness packet', () => {
  it('builds a ready share-safe buyer packet from complete evidence', () => {
    const packet = buildAcquisitionReadinessPacket({
      ...readyReports(),
      artifactAvailability: allArtifactsAvailable(),
      generatedAt,
    });

    expect(AcquisitionReadinessPacketSchema.parse(packet)).toEqual(packet);
    expect(packet.schemaVersion).toBe(acquisitionReadinessPacketSchemaVersion);
    expect(packet.summary).toMatchObject({
      blockedSignalCount: 0,
      dueDiligenceArtifactCount: 18,
      externalBlockerCount: 0,
      readySignalCount: 9,
      reviewSignalCount: 0,
      signalCount: 9,
      status: 'ready',
    });
    expect(packet.commands.map((command) => command.key)).toContain('acquisition-readiness');
    expect(packet.artifacts.map((artifact) => artifact.label)).toContain('Acquisition readiness packet');
    expect(packet.artifacts.map((artifact) => artifact.label)).toContain('License review packet');
    expect(packet.artifacts.map((artifact) => artifact.label)).toContain('Third-party notices');
    expect(packet.artifacts.map((artifact) => artifact.label)).toContain('Web smoke report');
    expect(packet.artifacts.map((artifact) => artifact.label)).toContain('Vercel deployment handoff');
    expect(JSON.stringify(packet)).not.toMatch(/BEGIN PRIVATE KEY|ghp_|github_pat_|pat_|sk_live_|file:\/\/|\/Users\//i);
  });

  it('keeps external clearance separate from internal completion', () => {
    const reports = readyReports();
    const packet = buildAcquisitionReadinessPacket({
      ...reports,
      featureCompletionReport: {
        ...reports.featureCompletionReport,
        status: 'external-blocked',
        summary: {
          externalBlockerCount: 5,
          internalGapCount: 0,
          traceabilityCoveredCount: 168,
          traceabilityItemCount: 168,
        },
      },
      launchReadinessReport: {
        ...reports.launchReadinessReport,
        summary: {
          nextAction: 'Collect external launch evidence.',
          readyTracks: 1,
          status: 'blocked',
          totalTracks: 3,
        },
      },
      artifactAvailability: allArtifactsAvailable(),
      generatedAt,
    });

    expect(packet.summary.status).toBe('needs-external-clearance');
    expect(packet.summary.externalBlockerCount).toBe(5);
    expect(packet.signals.find((signal) => signal.key === 'launch-clearance')?.status).toBe('external-required');
    expect(packet.summary.nextAction).toBe('Collect external launch evidence.');
  });

  it('blocks buyer readiness when internal delivery evidence fails', () => {
    const reports = readyReports();
    const packet = buildAcquisitionReadinessPacket({
      ...reports,
      featureCompletionReport: {
        ...reports.featureCompletionReport,
        summary: {
          externalBlockerCount: 0,
          internalGapCount: 2,
          traceabilityCoveredCount: 166,
          traceabilityItemCount: 168,
        },
      },
      releaseGateReport: {
        completedAt: generatedAt,
        schemaVersion: 'movebeta.release-gate-report.v1',
        status: 'fail',
      },
      artifactAvailability: allArtifactsAvailable(),
      generatedAt,
    });

    expect(packet.summary.status).toBe('blocked');
    expect(packet.summary.blockedSignalCount).toBe(2);
    expect(packet.summary.nextAction).toBe('Resolve internal feature gaps before acquisition handoff.');
  });

  it('rejects local paths, raw media references, credentials, and token-like values before sharing', () => {
    const packet = buildAcquisitionReadinessPacket({
      ...readyReports(),
      artifactAvailability: allArtifactsAvailable(),
      generatedAt,
    });
    const unsafe: AcquisitionReadinessPacket = {
      ...packet,
      signals: [
        {
          ...packet.signals[0],
          detail: 'Review file:///Users/antonio/private/beta.mov with ghp_1234567890abcdefTOKENVALUE.',
        },
      ],
    };

    expect(() => assertAcquisitionReadinessPacketIsShareSafe(unsafe)).toThrow('Acquisition readiness packet contains credential');
  });
});
