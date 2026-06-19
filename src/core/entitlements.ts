import { z } from 'zod';

export const PlanKeySchema = z.enum(['free', 'pro', 'coach']);

export const CapabilitySchema = z.enum([
  'local-analysis',
  'recent-history',
  'unlimited-history',
  'attempt-comparison',
  'weekly-drills',
  'advanced-drill-packs',
  'report-export',
  'coach-packets',
  'coach-library',
  'team-templates',
  'optional-encrypted-sync',
]);

export const PlanEntitlementSchema = z.object({
  capabilities: z.array(CapabilitySchema),
  historyLimit: z.number().int().positive().nullable(),
  key: PlanKeySchema,
  label: z.string(),
  summary: z.string(),
});

export type PlanKey = z.infer<typeof PlanKeySchema>;
export type Capability = z.infer<typeof CapabilitySchema>;
export type PlanEntitlement = z.infer<typeof PlanEntitlementSchema>;

export const defaultEntitlements = PlanEntitlementSchema.array().parse([
  {
    capabilities: ['local-analysis', 'recent-history', 'weekly-drills', 'report-export'],
    historyLimit: 5,
    key: 'free',
    label: 'Free',
    summary: 'Local analysis, recent report history, weekly drills, and privacy-safe exports.',
  },
  {
    capabilities: [
      'local-analysis',
      'recent-history',
      'unlimited-history',
      'attempt-comparison',
      'weekly-drills',
      'advanced-drill-packs',
      'report-export',
      'coach-packets',
      'optional-encrypted-sync',
    ],
    historyLimit: null,
    key: 'pro',
    label: 'Pro',
    summary: 'Unlimited local history, comparison, advanced drills, coach packets, and opt-in encrypted sync.',
  },
  {
    capabilities: [
      'local-analysis',
      'recent-history',
      'unlimited-history',
      'attempt-comparison',
      'weekly-drills',
      'advanced-drill-packs',
      'report-export',
      'coach-packets',
      'coach-library',
      'team-templates',
      'optional-encrypted-sync',
    ],
    historyLimit: null,
    key: 'coach',
    label: 'Coach',
    summary: 'Coach review library, team templates, and athlete consent workflows on top of Pro.',
  },
]);

export function getEntitlement(plan: PlanKey, entitlements: PlanEntitlement[] = defaultEntitlements) {
  return entitlements.find((item) => item.key === plan) ?? entitlements[0];
}

export function hasCapability(plan: PlanKey, capability: Capability, entitlements: PlanEntitlement[] = defaultEntitlements) {
  return getEntitlement(plan, entitlements).capabilities.includes(capability);
}

export function describeHistoryAccess(plan: PlanKey, entitlements: PlanEntitlement[] = defaultEntitlements) {
  const entitlement = getEntitlement(plan, entitlements);
  if (entitlement.historyLimit === null) return 'Unlimited local history';
  return `${entitlement.historyLimit} recent reports included`;
}

export function limitHistoryForPlan<T>(items: T[], plan: PlanKey, entitlements: PlanEntitlement[] = defaultEntitlements) {
  const entitlement = getEntitlement(plan, entitlements);
  if (entitlement.historyLimit === null) return items;
  return items.slice(0, entitlement.historyLimit);
}

export function summarizeUpgradePath(currentPlan: PlanKey, capability: Capability) {
  if (hasCapability(currentPlan, capability)) {
    return 'Included in current plan';
  }

  const unlockPlan = defaultEntitlements.find((plan) => plan.capabilities.includes(capability));
  return unlockPlan ? `Unlocks with ${unlockPlan.label}` : 'Not available in current roadmap';
}
