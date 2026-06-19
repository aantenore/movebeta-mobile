import { z } from 'zod';

import {
  CapabilitySchema,
  PlanKeySchema,
  defaultEntitlements,
  getEntitlement,
  type Capability,
  type PlanEntitlement,
  type PlanKey,
} from './entitlements';

export const CapabilityGroupSchema = z.enum(['Core', 'Training', 'Coach', 'Privacy']);

export const CapabilityDescriptorSchema = z.object({
  capability: CapabilitySchema,
  group: CapabilityGroupSchema,
  label: z.string(),
  summary: z.string(),
});

export const PlanCatalogItemSchema = z.object({
  capabilities: z.array(CapabilityDescriptorSchema),
  cta: z.string(),
  highlightedUnlocks: z.array(CapabilityDescriptorSchema),
  historyAccess: z.string(),
  key: PlanKeySchema,
  label: z.string(),
  status: z.enum(['current', 'upgrade', 'included']),
  summary: z.string(),
});

export const PlanRecommendationSchema = z.object({
  action: z.string(),
  currentPlan: PlanKeySchema,
  nextPlan: PlanKeySchema.nullable(),
  title: z.string(),
});

export type CapabilityDescriptor = z.infer<typeof CapabilityDescriptorSchema>;
export type PlanCatalogItem = z.infer<typeof PlanCatalogItemSchema>;
export type PlanRecommendation = z.infer<typeof PlanRecommendationSchema>;

const capabilityDescriptors: Record<Capability, CapabilityDescriptor> = {
  'advanced-drill-packs': {
    capability: 'advanced-drill-packs',
    group: 'Training',
    label: 'Advanced drill packs',
    summary: 'Coach-approved drill variants by grade, wall angle, and repeated cue patterns.',
  },
  'attempt-comparison': {
    capability: 'attempt-comparison',
    group: 'Training',
    label: 'Attempt comparison',
    summary: 'Compare latest attempts with previous movement scores and cue changes.',
  },
  'coach-library': {
    capability: 'coach-library',
    group: 'Coach',
    label: 'Coach library',
    summary: 'Organize consented athlete packets for review without raw video by default.',
  },
  'coach-packets': {
    capability: 'coach-packets',
    group: 'Coach',
    label: 'Coach packets',
    summary: 'Prepare consented, privacy-safe review packets for external coaching.',
  },
  'local-analysis': {
    capability: 'local-analysis',
    group: 'Core',
    label: 'On-device analysis',
    summary: 'Analyze climbing attempts locally with replaceable pose providers.',
  },
  'optional-encrypted-sync': {
    capability: 'optional-encrypted-sync',
    group: 'Privacy',
    label: 'Optional encrypted sync',
    summary: 'Future opt-in sync boundary for paid accounts without changing local defaults.',
  },
  'recent-history': {
    capability: 'recent-history',
    group: 'Core',
    label: 'Recent history',
    summary: 'Keep recent local reports available for trend and drill generation.',
  },
  'report-export': {
    capability: 'report-export',
    group: 'Privacy',
    label: 'Privacy-safe export',
    summary: 'Export local reports and support packets without raw video artifacts.',
  },
  'team-templates': {
    capability: 'team-templates',
    group: 'Coach',
    label: 'Team templates',
    summary: 'Reusable coach templates for gyms, teams, and athlete cohorts.',
  },
  'unlimited-history': {
    capability: 'unlimited-history',
    group: 'Training',
    label: 'Unlimited local history',
    summary: 'Use full local report history for trends, benchmarks, and repeat planning.',
  },
  'weekly-drills': {
    capability: 'weekly-drills',
    group: 'Training',
    label: 'Weekly drills',
    summary: 'Generate weekly drill plans from local coach cues.',
  },
};

function describeHistoryLimit(entitlement: PlanEntitlement) {
  return entitlement.historyLimit === null ? 'Unlimited local history' : `${entitlement.historyLimit} recent reports`;
}

function asDescriptors(capabilities: Capability[]) {
  return capabilities.map((capability) => capabilityDescriptors[capability]);
}

export function getCapabilityDescriptor(capability: Capability) {
  return capabilityDescriptors[capability];
}

export function buildPlanCatalog(
  currentPlan: PlanKey,
  entitlements: PlanEntitlement[] = defaultEntitlements,
): PlanCatalogItem[] {
  const currentIndex = Math.max(0, entitlements.findIndex((entitlement) => entitlement.key === currentPlan));
  const currentCapabilities = new Set(getEntitlement(currentPlan, entitlements).capabilities);

  return PlanCatalogItemSchema.array().parse(
    entitlements.map((entitlement, index) => {
      const highlightedUnlocks = entitlement.capabilities.filter((capability) => !currentCapabilities.has(capability));
      const status = index === currentIndex ? 'current' : index > currentIndex ? 'upgrade' : 'included';

      return {
        capabilities: asDescriptors(entitlement.capabilities),
        cta:
          status === 'current'
            ? 'Current plan'
            : status === 'upgrade'
              ? `Unlock ${highlightedUnlocks.length} more capabilities`
              : 'Included below current plan',
        highlightedUnlocks: asDescriptors(highlightedUnlocks),
        historyAccess: describeHistoryLimit(entitlement),
        key: entitlement.key,
        label: entitlement.label,
        status,
        summary: entitlement.summary,
      };
    }),
  );
}

export function buildPlanRecommendation(
  currentPlan: PlanKey,
  entitlements: PlanEntitlement[] = defaultEntitlements,
): PlanRecommendation {
  const catalog = buildPlanCatalog(currentPlan, entitlements);
  const nextUpgrade = catalog.find((item) => item.status === 'upgrade');

  return PlanRecommendationSchema.parse({
    action: nextUpgrade
      ? `${nextUpgrade.highlightedUnlocks[0]?.label ?? 'More capabilities'} is the next upgrade lever.`
      : 'Keep the local-first value clear while validating coach and team workflows.',
    currentPlan,
    nextPlan: nextUpgrade?.key ?? null,
    title: nextUpgrade ? `Next commercial step: ${nextUpgrade.label}` : 'All published capabilities enabled',
  });
}
