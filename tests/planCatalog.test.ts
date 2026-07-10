import { describe, expect, it } from 'vitest';

import { buildPlanCatalog, buildPlanRecommendation, getCapabilityDescriptor } from '../src/core/planCatalog';

describe('plan catalog', () => {
  it('builds a freemium catalog from capability entitlements', () => {
    const catalog = buildPlanCatalog('free');

    expect(catalog.map((plan) => plan.key)).toEqual(['free', 'pro', 'coach']);
    expect(catalog[0]).toMatchObject({
      cta: 'Current plan',
      historyAccess: '5 recent reports',
      label: 'Free',
      status: 'current',
    });
    expect(catalog[1].status).toBe('upgrade');
    expect(catalog[1].highlightedUnlocks.map((item) => item.capability)).toEqual([
      'unlimited-history',
      'advanced-drill-packs',
      'coach-packets',
      'optional-encrypted-sync',
    ]);
    expect(catalog[2].highlightedUnlocks.map((item) => item.capability)).toContain('coach-library');
  });

  it('marks lower tiers as included when the current plan is upgraded', () => {
    const catalog = buildPlanCatalog('pro');

    expect(catalog.find((plan) => plan.key === 'free')?.status).toBe('included');
    expect(catalog.find((plan) => plan.key === 'pro')?.status).toBe('current');
    expect(catalog.find((plan) => plan.key === 'coach')?.highlightedUnlocks.map((item) => item.capability)).toEqual([
      'coach-library',
      'team-templates',
    ]);
  });

  it('summarizes the next upgrade lever without pricing or checkout assumptions', () => {
    expect(buildPlanRecommendation('free')).toEqual({
      action: 'Unlimited local history is the next upgrade lever.',
      currentPlan: 'free',
      nextPlan: 'pro',
      title: 'Next commercial step: Pro',
    });
    expect(buildPlanRecommendation('coach')).toEqual({
      action: 'Keep the local-first value clear while validating coach and team workflows.',
      currentPlan: 'coach',
      nextPlan: null,
      title: 'All published capabilities enabled',
    });
  });

  it('keeps user-facing capability copy centralized', () => {
    expect(getCapabilityDescriptor('coach-packets')).toMatchObject({
      group: 'Coach',
      label: 'Coach packets',
    });
  });
});
