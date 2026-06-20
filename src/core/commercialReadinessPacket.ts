import { z } from 'zod';

import {
  BillingReadinessSummarySchema,
  buildBillingReadinessSummary,
  type BillingReadinessSummary,
} from './billingReadiness';

export const commercialReadinessPacketSchemaVersion = 'movebeta.commercial-readiness-packet.v1';

const CommercialReadinessCommandSchema = z.object({
  key: z.string(),
  label: z.string(),
  owner: z.enum(['founder', 'product', 'release', 'engineering']),
  purpose: z.string(),
});

export const CommercialReadinessPacketSchema = z.object({
  commands: z.array(CommercialReadinessCommandSchema),
  generatedAt: z.string(),
  privacy: z.object({
    credentialValuesIncluded: z.literal(false),
    localPathsIncluded: z.literal(false),
    paymentDataIncluded: z.literal(false),
    rawArtifactsIncluded: z.literal(false),
    rawVideoIncluded: z.literal(false),
    receiptValuesIncluded: z.literal(false),
    secretsIncluded: z.literal(false),
  }),
  readiness: BillingReadinessSummarySchema,
  schemaVersion: z.literal(commercialReadinessPacketSchemaVersion),
  summary: z.object({
    checkCount: z.number().int().nonnegative(),
    missingPlanCount: z.number().int().nonnegative(),
    nextAction: z.string(),
    paidPlanMappingRatio: z.string(),
    provider: z.string(),
    readyCheckCount: z.number().int().nonnegative(),
    status: z.enum(['ready', 'review', 'blocked']),
  }),
});

export type CommercialReadinessPacket = z.infer<typeof CommercialReadinessPacketSchema>;

const forbiddenCommercialPacketValuePattern =
  /(file:\/\/|content:\/\/|asset:\/\/|ph:\/\/|\/Users\/|\/private\/|\/var\/mobile\/|[A-Za-z]:\\|BEGIN PRIVATE KEY|ghp_[A-Za-z0-9_]+|pat_[A-Za-z0-9_]+|sk_live_[A-Za-z0-9_]+|sk_test_[A-Za-z0-9_]+|api[_-]?key|secret|bearer\s+[A-Za-z0-9._-]+|eyJ[A-Za-z0-9_-]{20,})/i;

function containsForbiddenCommercialPacketValue(value: unknown): boolean {
  if (typeof value === 'string') return forbiddenCommercialPacketValuePattern.test(value);
  if (Array.isArray(value)) return value.some(containsForbiddenCommercialPacketValue);
  if (value && typeof value === 'object') return Object.values(value).some(containsForbiddenCommercialPacketValue);
  return false;
}

function commandsFor(readiness: BillingReadinessSummary) {
  const commands: Array<z.infer<typeof CommercialReadinessCommandSchema>> = [
    {
      key: 'preserve-movement-boundary',
      label: 'Preserve movement boundary',
      owner: 'engineering',
      purpose: 'Keep billing as an entitlement input so pose analysis, video intake, and cue generation remain local-first.',
    },
  ];

  if (readiness.provider === 'none') {
    commands.push({
      key: 'select-billing-provider',
      label: 'Select billing provider',
      owner: 'founder',
      purpose: 'Choose RevenueCat, Stripe, store-native commerce, or a custom adapter outside movement analysis.',
    });
  }

  if (readiness.missingPlanKeys.length > 0) {
    commands.push({
      key: 'map-paid-plan-products',
      label: 'Map paid plan products',
      owner: 'product',
      purpose: `Create external product identifiers for paid plan keys: ${readiness.missingPlanKeys.join(', ')}.`,
    });
  }

  if (readiness.receiptValidation === 'none') {
    commands.push({
      key: 'select-receipt-validation',
      label: 'Select receipt validation',
      owner: 'engineering',
      purpose: 'Choose provider-managed, server-side, store-native, or custom receipt validation before paid entitlement activation.',
    });
  }

  if (!readiness.sandboxReady) {
    commands.push({
      key: 'run-sandbox-commerce-qa',
      label: 'Run sandbox commerce QA',
      owner: 'release',
      purpose: 'Capture sandbox purchase, restore, cancellation, and entitlement refresh proof without storing receipt values in the repository.',
    });
  }

  return commands;
}

export function assertCommercialReadinessPacketIsShareSafe(packet: CommercialReadinessPacket) {
  if (containsForbiddenCommercialPacketValue(packet)) {
    throw new Error('Commercial readiness packet contains credential values, local paths, raw artifacts, payment data, or token-like data.');
  }
  return packet;
}

export function buildCommercialReadinessPacket({
  generatedAt = new Date().toISOString(),
  readiness = buildBillingReadinessSummary(),
}: {
  generatedAt?: string;
  readiness?: BillingReadinessSummary;
} = {}): CommercialReadinessPacket {
  const parsedReadiness = BillingReadinessSummarySchema.parse(readiness);
  const commands = commandsFor(parsedReadiness);
  const readyCheckCount = parsedReadiness.checks.filter((check) => check.status === 'ready').length;
  const packet = CommercialReadinessPacketSchema.parse({
    commands,
    generatedAt,
    privacy: {
      credentialValuesIncluded: false,
      localPathsIncluded: false,
      paymentDataIncluded: false,
      rawArtifactsIncluded: false,
      rawVideoIncluded: false,
      receiptValuesIncluded: false,
      secretsIncluded: false,
    },
    readiness: parsedReadiness,
    schemaVersion: commercialReadinessPacketSchemaVersion,
    summary: {
      checkCount: parsedReadiness.checks.length,
      missingPlanCount: parsedReadiness.missingPlanKeys.length,
      nextAction: parsedReadiness.action,
      paidPlanMappingRatio: parsedReadiness.planMappingRatio,
      provider: parsedReadiness.providerLabel,
      readyCheckCount,
      status: parsedReadiness.status,
    },
  });

  return assertCommercialReadinessPacketIsShareSafe(packet);
}
