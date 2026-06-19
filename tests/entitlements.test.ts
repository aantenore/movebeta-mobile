import { describe, expect, it } from 'vitest';

import {
  describeHistoryAccess,
  getEntitlement,
  hasCapability,
  limitHistoryForPlan,
  summarizeUpgradePath,
} from '../src/core/entitlements';

describe('freemium entitlements', () => {
  it('keeps free local analysis useful without enabling Pro history', () => {
    expect(hasCapability('free', 'local-analysis')).toBe(true);
    expect(hasCapability('free', 'weekly-drills')).toBe(true);
    expect(hasCapability('free', 'unlimited-history')).toBe(false);
    expect(describeHistoryAccess('free')).toBe('5 recent reports included');
  });

  it('unlocks advanced history and coach packets for Pro users', () => {
    expect(hasCapability('pro', 'unlimited-history')).toBe(true);
    expect(hasCapability('pro', 'coach-packets')).toBe(true);
    expect(hasCapability('pro', 'coach-library')).toBe(false);
    expect(describeHistoryAccess('pro')).toBe('Unlimited local history');
  });

  it('reserves coach workspace capabilities for the Coach plan', () => {
    expect(getEntitlement('coach').capabilities).toContain('coach-library');
    expect(getEntitlement('coach').capabilities).toContain('team-templates');
  });

  it('describes upgrade path without hard-coded pricing', () => {
    expect(summarizeUpgradePath('free', 'advanced-drill-packs')).toBe('Unlocks with Pro');
    expect(summarizeUpgradePath('pro', 'coach-library')).toBe('Unlocks with Coach');
    expect(summarizeUpgradePath('coach', 'coach-library')).toBe('Included in current plan');
  });

  it('limits free history while keeping Pro history unlimited', () => {
    const reports = ['r1', 'r2', 'r3', 'r4', 'r5', 'r6'];

    expect(limitHistoryForPlan(reports, 'free')).toEqual(['r1', 'r2', 'r3', 'r4', 'r5']);
    expect(limitHistoryForPlan(reports, 'pro')).toEqual(reports);
  });
});
