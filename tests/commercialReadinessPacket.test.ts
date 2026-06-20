import { describe, expect, it } from 'vitest';

import { buildBillingReadinessSummary } from '../src/core/billingReadiness';
import {
  assertCommercialReadinessPacketIsShareSafe,
  buildCommercialReadinessPacket,
  commercialReadinessPacketSchemaVersion,
  CommercialReadinessPacketSchema,
  type CommercialReadinessPacket,
} from '../src/core/commercialReadinessPacket';

describe('commercial readiness packet', () => {
  it('builds a versioned share-safe packet from default commercial readiness', () => {
    const packet = buildCommercialReadinessPacket({
      generatedAt: '2026-06-20T16:00:00.000Z',
    });

    expect(CommercialReadinessPacketSchema.parse(packet)).toEqual(packet);
    expect(packet.schemaVersion).toBe(commercialReadinessPacketSchemaVersion);
    expect(packet.generatedAt).toBe('2026-06-20T16:00:00.000Z');
    expect(packet.summary).toMatchObject({
      checkCount: 6,
      missingPlanCount: 2,
      paidPlanMappingRatio: '0/2',
      provider: 'Not connected',
      readyCheckCount: 2,
      status: 'review',
    });
    expect(packet.commands.map((command) => command.key)).toEqual([
      'preserve-movement-boundary',
      'select-billing-provider',
      'map-paid-plan-products',
      'select-receipt-validation',
      'run-sandbox-commerce-qa',
    ]);
    expect(packet.privacy).toEqual({
      credentialValuesIncluded: false,
      localPathsIncluded: false,
      paymentDataIncluded: false,
      rawArtifactsIncluded: false,
      rawVideoIncluded: false,
      receiptValuesIncluded: false,
      secretsIncluded: false,
    });
    expect(JSON.stringify(packet)).not.toMatch(/ghp_|pat_|BEGIN PRIVATE KEY|file:\/\/|\/Users\/|sk_live_/i);
  });

  it('keeps ready commercial packets concise when adapter proof is complete', () => {
    const readiness = buildBillingReadinessSummary({
      entitlementSource: 'provider-webhook',
      planMappings: {
        coach: 'movebeta_coach_monthly',
        pro: 'movebeta_pro_monthly',
      },
      provider: 'revenuecat',
      receiptValidation: 'provider-managed',
      sandboxReady: true,
    });
    const packet = buildCommercialReadinessPacket({
      generatedAt: '2026-06-20T16:05:00.000Z',
      readiness,
    });

    expect(packet.summary.status).toBe('ready');
    expect(packet.summary.readyCheckCount).toBe(6);
    expect(packet.summary.provider).toBe('RevenueCat');
    expect(packet.commands.map((command) => command.key)).toEqual(['preserve-movement-boundary']);
  });

  it('rejects injected credential values, receipt values, and local paths before sharing', () => {
    const packet = buildCommercialReadinessPacket({
      generatedAt: '2026-06-20T16:10:00.000Z',
    });
    const unsafe: CommercialReadinessPacket = {
      ...packet,
      commands: [
        ...packet.commands,
        {
          key: 'unsafe',
          label: 'Unsafe provider setup',
          owner: 'release',
          purpose: 'Use sk_live_1234567890 from /Users/antonio/private/billing.txt.',
        },
      ],
    };

    expect(() => assertCommercialReadinessPacketIsShareSafe(unsafe)).toThrow('Commercial readiness packet contains credential');
  });
});
