import { describe, expect, it } from 'vitest';

import {
  assertLicenseReviewPacketIsShareSafe,
  buildLicenseReviewPacket,
  licenseReviewPacketSchemaVersion,
  LicenseReviewPacketSchema,
  type LicenseReviewPacket,
} from '../src/core/licenseReviewPacket';

const generatedAt = '2026-06-23T16:00:00.000Z';

function dependencyReport(status = 'review') {
  return {
    generatedAt,
    packages: [
      {
        direct: false,
        license: 'MPL-2.0',
        name: 'review-package',
        reason: 'License has notice or file-level obligations that should be reviewed before distribution.',
        status,
        version: '1.2.3',
      },
      {
        direct: true,
        license: 'MIT',
        name: 'ready-package',
        reason: 'At least one permissive license option is available.',
        status: 'pass',
        version: '2.0.0',
      },
    ],
    schemaVersion: 'movebeta.dependency-license-report.v1',
    status,
    summary: {
      blockedCount: status === 'blocked' ? 1 : 0,
      reviewCount: status === 'review' ? 1 : 0,
      status,
    },
  };
}

function modelReport(status = 'review') {
  return {
    checks: [
      {
        action: 'Review upstream model terms from the source catalog before commercial distribution.',
        key: 'license-review',
        label: 'License review',
        status,
      },
    ],
    generatedAt,
    schemaVersion: 'movebeta.model-asset-provenance-report.v1',
    summary: { status },
  };
}

const modelAttribution = [
  '# Model Asset Attribution',
  '',
  '- Model: MoveNet SinglePose Lightning',
  '- Source: TensorFlow Hub',
].join('\n');

describe('license review packet', () => {
  it('builds a share-safe legal due-diligence packet without claiming clearance', () => {
    const packet = buildLicenseReviewPacket({
      dependencyLicenseReport: dependencyReport(),
      generatedAt,
      modelAssetAttributionNotice: modelAttribution,
      modelAssetProvenanceReport: modelReport(),
    });

    expect(LicenseReviewPacketSchema.parse(packet)).toEqual(packet);
    expect(packet.schemaVersion).toBe(licenseReviewPacketSchemaVersion);
    expect(packet.summary).toMatchObject({
      blockedObligationCount: 0,
      dependencyStatus: 'review',
      modelStatus: 'review',
      obligationCount: 3,
      reviewObligationCount: 2,
      status: 'review',
    });
    expect(packet.legalReview).toMatchObject({
      clearanceClaimed: false,
      externalApprovalRequired: true,
      requiredApprovalReference: 'external:commercial-legal-approval',
    });
    expect(packet.commands.map((command) => command.command)).toContain('npm run release:license-review');
    expect(packet.notices.map((notice) => notice.path)).toContain('docs/legal/THIRD_PARTY_NOTICES.md');
    expect(JSON.stringify(packet)).not.toMatch(/BEGIN PRIVATE KEY|ghp_|github_pat_|file:\/\/|\/Users\//i);
  });

  it('blocks commercial handoff when a dependency or model obligation is blocked', () => {
    const packet = buildLicenseReviewPacket({
      dependencyLicenseReport: dependencyReport('blocked'),
      generatedAt,
      modelAssetAttributionNotice: modelAttribution,
      modelAssetProvenanceReport: modelReport('review'),
    });

    expect(packet.summary.status).toBe('blocked');
    expect(packet.summary.blockedObligationCount).toBe(1);
    expect(packet.summary.nextAction).toBe('Resolve or replace this dependency before commercial distribution.');
  });

  it('rejects local paths, raw media references, credentials, and token-like values before sharing', () => {
    const packet = buildLicenseReviewPacket({
      dependencyLicenseReport: dependencyReport(),
      generatedAt,
      modelAssetAttributionNotice: modelAttribution,
      modelAssetProvenanceReport: modelReport(),
    });
    const unsafe: LicenseReviewPacket = {
      ...packet,
      obligations: [
        {
          ...packet.obligations[0],
          action: 'Review file:///Users/antonio/private/raw-beta.mov with ghp_1234567890abcdefTOKENVALUE.',
        },
      ],
    };

    expect(() => assertLicenseReviewPacketIsShareSafe(unsafe)).toThrow('License review packet contains credential');
  });
});
