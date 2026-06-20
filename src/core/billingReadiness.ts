import { z } from 'zod';

import { defaultEntitlements, type PlanEntitlement, type PlanKey } from './entitlements';

export const BillingProviderSchema = z.enum([
  'none',
  'revenuecat',
  'stripe',
  'app-store-connect',
  'google-play',
  'custom',
]);

export const ReceiptValidationModeSchema = z.enum([
  'none',
  'provider-managed',
  'server-side',
  'store-native',
  'custom',
]);

export const BillingReadinessStatusSchema = z.enum(['ready', 'review', 'blocked']);

export const BillingReadinessConfigSchema = z.object({
  entitlementSource: z.enum(['plan-catalog', 'provider-webhook', 'store-receipt', 'custom']).default('plan-catalog'),
  planMappings: z.record(z.string(), z.string().min(1)).default({}),
  provider: BillingProviderSchema.default('none'),
  receiptValidation: ReceiptValidationModeSchema.default('none'),
  sandboxReady: z.boolean().default(false),
});

export type BillingProvider = z.infer<typeof BillingProviderSchema>;
export type ReceiptValidationMode = z.infer<typeof ReceiptValidationModeSchema>;
export type BillingReadinessStatus = z.infer<typeof BillingReadinessStatusSchema>;
export type BillingReadinessConfig = z.infer<typeof BillingReadinessConfigSchema>;

export type BillingReadinessCheck = {
  detail: string;
  id: string;
  label: string;
  status: BillingReadinessStatus;
};

export type BillingReadinessSummary = {
  action: string;
  badge: string;
  checks: BillingReadinessCheck[];
  mappedPlanKeys: PlanKey[];
  missingPlanKeys: PlanKey[];
  paidPlanKeys: PlanKey[];
  planMappingRatio: string;
  provider: BillingProvider;
  providerLabel: string;
  receiptValidation: ReceiptValidationMode;
  receiptValidationLabel: string;
  sandboxReady: boolean;
  status: BillingReadinessStatus;
  title: string;
};

export const defaultBillingReadinessConfig = BillingReadinessConfigSchema.parse({});

const providerLabels: Record<BillingProvider, string> = {
  custom: 'Custom',
  'app-store-connect': 'App Store',
  'google-play': 'Google Play',
  none: 'Not connected',
  revenuecat: 'RevenueCat',
  stripe: 'Stripe',
};

const receiptValidationLabels: Record<ReceiptValidationMode, string> = {
  custom: 'Custom',
  none: 'None',
  'provider-managed': 'Provider managed',
  'server-side': 'Server-side',
  'store-native': 'Store native',
};

const sensitiveValuePattern =
  /\b(?:api[_-]?key|bearer\s+[a-z0-9._-]+|private[_-]?key|secret|sk_(?:live|test)_[a-z0-9]+|token)\b/i;
const localArtifactPattern = /(?:file:\/\/|\/Users\/|\/var\/folders\/|[A-Za-z]:\\|\.mov\b|\.mp4\b|raw[-\s]?video)/i;

function paidPlanKeysFrom(entitlements: PlanEntitlement[]) {
  return entitlements.filter((entitlement) => entitlement.key !== 'free').map((entitlement) => entitlement.key);
}

function checkStatus(statuses: BillingReadinessStatus[]) {
  if (statuses.includes('blocked')) return 'blocked';
  if (statuses.includes('review')) return 'review';
  return 'ready';
}

function configuredPlanKeys(config: BillingReadinessConfig, paidPlanKeys: PlanKey[]) {
  return paidPlanKeys.filter((key) => Boolean(config.planMappings[key]?.trim()));
}

function invalidMappingValues(config: BillingReadinessConfig) {
  return Object.entries(config.planMappings).filter(([, value]) => (
    sensitiveValuePattern.test(value) || localArtifactPattern.test(value)
  ));
}

function providerCheck(config: BillingReadinessConfig): BillingReadinessCheck {
  const isConfigured = config.provider !== 'none';

  return {
    detail: isConfigured
      ? `${providerLabels[config.provider]} can be used as a replaceable billing adapter outside movement analysis.`
      : 'Select a billing adapter later without changing local video, cue, or entitlement contracts.',
    id: 'provider-configured',
    label: 'Billing provider adapter',
    status: isConfigured ? 'ready' : 'review',
  };
}

function planMappingCheck(config: BillingReadinessConfig, paidPlanKeys: PlanKey[], mappedPlanKeys: PlanKey[]): BillingReadinessCheck {
  const missingPlanKeys = paidPlanKeys.filter((key) => !mappedPlanKeys.includes(key));
  const hasProvider = config.provider !== 'none';

  return {
    detail:
      missingPlanKeys.length === 0
        ? `Paid plan keys mapped: ${mappedPlanKeys.join(', ')}.`
        : `Missing product mapping for: ${missingPlanKeys.join(', ')}.`,
    id: 'plan-mapping',
    label: 'Paid plan product mappings',
    status: missingPlanKeys.length === 0 ? 'ready' : hasProvider ? 'blocked' : 'review',
  };
}

function receiptValidationCheck(config: BillingReadinessConfig): BillingReadinessCheck {
  const configured = config.receiptValidation !== 'none';

  return {
    detail: configured
      ? `${receiptValidationLabels[config.receiptValidation]} receipt validation is selected for entitlement activation.`
      : 'Receipt validation must be selected before paid entitlements can be activated.',
    id: 'receipt-validation',
    label: 'Receipt validation',
    status: configured ? 'ready' : config.provider === 'none' ? 'review' : 'blocked',
  };
}

function sandboxCheck(config: BillingReadinessConfig): BillingReadinessCheck {
  return {
    detail: config.sandboxReady
      ? 'Sandbox purchase, restore, and cancellation paths are marked ready for validation.'
      : 'Sandbox purchase, restore, and cancellation paths still need commercial QA evidence.',
    id: 'sandbox-ready',
    label: 'Sandbox commerce QA',
    status: config.sandboxReady ? 'ready' : 'review',
  };
}

function boundaryCheck(config: BillingReadinessConfig): BillingReadinessCheck {
  return {
    detail: `${config.entitlementSource} keeps billing as an entitlement input instead of a dependency of pose analysis.`,
    id: 'entitlement-boundary',
    label: 'Movement domain isolation',
    status: 'ready',
  };
}

function hygieneCheck(config: BillingReadinessConfig): BillingReadinessCheck {
  const invalidValues = invalidMappingValues(config);

  return {
    detail:
      invalidValues.length === 0
        ? 'Plan mappings contain product identifiers only; credential values and local artifact paths stay out of app config.'
        : `Remove sensitive or local-artifact-like values from mappings: ${invalidValues.map(([key]) => key).join(', ')}.`,
    id: 'configuration-hygiene',
    label: 'No credential values in config',
    status: invalidValues.length === 0 ? 'ready' : 'blocked',
  };
}

function titleFor(config: BillingReadinessConfig, status: BillingReadinessStatus) {
  if (config.provider === 'none') return 'Commercial checkout not connected';
  if (status === 'ready') return 'Commercial path ready';
  if (status === 'blocked') return 'Commercial path blocked';
  return 'Commercial path needs sandbox proof';
}

function actionFor(config: BillingReadinessConfig, status: BillingReadinessStatus, missingPlanKeys: PlanKey[]) {
  if (config.provider === 'none') {
    return 'Choose a billing adapter and map paid plan keys when subscriptions enter scope.';
  }
  if (status === 'ready') {
    return 'Billing adapter, paid mappings, receipt validation, and sandbox proof are ready for subscription implementation.';
  }
  if (missingPlanKeys.length > 0) {
    return `Map ${missingPlanKeys.join(', ')} products before enabling paid entitlement activation.`;
  }
  return 'Collect sandbox purchase, restore, cancellation, and receipt-validation proof before commercial launch.';
}

function badgeFor(config: BillingReadinessConfig, status: BillingReadinessStatus) {
  if (config.provider === 'none') return 'Not connected';
  if (status === 'ready') return 'Ready';
  if (status === 'blocked') return 'Blocked';
  return 'Review';
}

export function parseBillingReadinessConfig(value: unknown): BillingReadinessConfig | undefined {
  if (value === undefined || value === null || value === '') return undefined;
  const parsed = typeof value === 'string' ? JSON.parse(value) : value;
  return BillingReadinessConfigSchema.parse(parsed);
}

export function buildBillingReadinessSummary(
  config: BillingReadinessConfig = defaultBillingReadinessConfig,
  entitlements: PlanEntitlement[] = defaultEntitlements,
): BillingReadinessSummary {
  const parsedConfig = BillingReadinessConfigSchema.parse(config);
  const paidPlanKeys = paidPlanKeysFrom(entitlements);
  const mappedPlanKeys = configuredPlanKeys(parsedConfig, paidPlanKeys);
  const missingPlanKeys = paidPlanKeys.filter((key) => !mappedPlanKeys.includes(key));
  const checks = [
    providerCheck(parsedConfig),
    planMappingCheck(parsedConfig, paidPlanKeys, mappedPlanKeys),
    receiptValidationCheck(parsedConfig),
    sandboxCheck(parsedConfig),
    boundaryCheck(parsedConfig),
    hygieneCheck(parsedConfig),
  ];
  const status = checkStatus(checks.map((check) => check.status));

  return {
    action: actionFor(parsedConfig, status, missingPlanKeys),
    badge: badgeFor(parsedConfig, status),
    checks,
    mappedPlanKeys,
    missingPlanKeys,
    paidPlanKeys,
    planMappingRatio: `${mappedPlanKeys.length}/${paidPlanKeys.length}`,
    provider: parsedConfig.provider,
    providerLabel: providerLabels[parsedConfig.provider],
    receiptValidation: parsedConfig.receiptValidation,
    receiptValidationLabel: receiptValidationLabels[parsedConfig.receiptValidation],
    sandboxReady: parsedConfig.sandboxReady,
    status,
    title: titleFor(parsedConfig, status),
  };
}
