import { describe, expect, it } from 'vitest';

import {
  buildBillingReadinessSummary,
  defaultBillingReadinessConfig,
  parseBillingReadinessConfig,
} from '../src/core/billingReadiness';

describe('billing readiness', () => {
  it('keeps commercial checkout out of scope until a provider is configured', () => {
    const summary = buildBillingReadinessSummary(defaultBillingReadinessConfig);

    expect(summary.status).toBe('review');
    expect(summary.title).toBe('Commercial checkout not connected');
    expect(summary.badge).toBe('Not connected');
    expect(summary.providerLabel).toBe('Not connected');
    expect(summary.planMappingRatio).toBe('0/2');
    expect(summary.paidPlanKeys).toEqual(['pro', 'coach']);
    expect(summary.checks.map((check) => [check.id, check.status])).toEqual([
      ['provider-configured', 'review'],
      ['plan-mapping', 'review'],
      ['receipt-validation', 'review'],
      ['sandbox-ready', 'review'],
      ['entitlement-boundary', 'ready'],
      ['configuration-hygiene', 'ready'],
    ]);
  });

  it('marks the commercial path ready when adapter, paid mappings, receipts, and sandbox proof are configured', () => {
    const summary = buildBillingReadinessSummary({
      entitlementSource: 'provider-webhook',
      planMappings: {
        coach: 'movebeta_coach_monthly',
        pro: 'movebeta_pro_monthly',
      },
      provider: 'revenuecat',
      receiptValidation: 'provider-managed',
      sandboxReady: true,
    });

    expect(summary.status).toBe('ready');
    expect(summary.title).toBe('Commercial path ready');
    expect(summary.providerLabel).toBe('RevenueCat');
    expect(summary.planMappingRatio).toBe('2/2');
    expect(summary.missingPlanKeys).toEqual([]);
    expect(summary.checks.every((check) => check.status === 'ready')).toBe(true);
  });

  it('blocks configured providers when paid plan mappings or receipt validation are incomplete', () => {
    const summary = buildBillingReadinessSummary({
      entitlementSource: 'store-receipt',
      planMappings: {
        pro: 'movebeta_pro_monthly',
      },
      provider: 'app-store-connect',
      receiptValidation: 'none',
      sandboxReady: false,
    });

    expect(summary.status).toBe('blocked');
    expect(summary.missingPlanKeys).toEqual(['coach']);
    expect(summary.checks.filter((check) => check.status === 'blocked').map((check) => check.id)).toEqual([
      'plan-mapping',
      'receipt-validation',
    ]);
    expect(summary.action).toContain('coach');
  });

  it('keeps credential values and local artifacts out of billing config', () => {
    const summary = buildBillingReadinessSummary({
      entitlementSource: 'custom',
      planMappings: {
        coach: '/Users/antonio/private/coach.mp4',
        pro: 'sk_live_1234567890',
      },
      provider: 'custom',
      receiptValidation: 'custom',
      sandboxReady: true,
    });

    expect(summary.status).toBe('blocked');
    expect(summary.checks.find((check) => check.id === 'configuration-hygiene')).toMatchObject({
      status: 'blocked',
    });
    expect(JSON.stringify(summary)).not.toMatch(/bearer /i);
  });

  it('parses billing readiness config from environment JSON', () => {
    expect(
      parseBillingReadinessConfig(
        JSON.stringify({
          entitlementSource: 'provider-webhook',
          planMappings: {
            coach: 'coach_annual',
            pro: 'pro_monthly',
          },
          provider: 'stripe',
          receiptValidation: 'server-side',
          sandboxReady: true,
        }),
      ),
    ).toEqual({
      entitlementSource: 'provider-webhook',
      planMappings: {
        coach: 'coach_annual',
        pro: 'pro_monthly',
      },
      provider: 'stripe',
      receiptValidation: 'server-side',
      sandboxReady: true,
    });
  });

  it('treats empty billing readiness config as unset', () => {
    expect(parseBillingReadinessConfig('')).toBeUndefined();
    expect(parseBillingReadinessConfig(undefined)).toBeUndefined();
  });
});
