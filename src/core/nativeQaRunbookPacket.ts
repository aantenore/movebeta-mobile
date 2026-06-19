import { z } from 'zod';

import { buildNativeQaEvidenceKit, nativeQaEvidenceKitSchemaVersion } from './nativeQaEvidenceKit';
import {
  buildNativeQaEvidenceDraft,
  validateNativeQaEvidenceForApp,
  type NativeQaEvidencePayload,
} from './nativeQaEvidenceValidation';

export const nativeQaRunbookPacketSchemaVersion = 'movebeta.native-qa-runbook-packet.v1';

const NativeQaRunbookWorkflowSchema = z.object({
  evidence: z.string(),
  key: z.string(),
  label: z.string(),
  order: z.number().int().positive(),
});

const NativeQaRunbookPlatformSchema = z.object({
  key: z.string(),
  label: z.string(),
  requiredWorkflows: z.array(NativeQaRunbookWorkflowSchema),
});

export const NativeQaRunbookPacketSchema = z.object({
  budgets: z.object({
    maxBatteryDropPct: z.number(),
    maxLatencyByClipMs: z.array(
      z.object({
        maxAnalysisMs: z.number(),
        maxClipDurationMs: z.number(),
      }),
    ),
    passingThermalStates: z.array(z.string()),
  }),
  evidenceDraft: z.custom<NativeQaEvidencePayload>(),
  generatedAt: z.string(),
  kitSchemaVersion: z.literal(nativeQaEvidenceKitSchemaVersion),
  placeholderPolicy: z.string(),
  platforms: z.array(NativeQaRunbookPlatformSchema),
  privacy: z.object({
    credentialValuesIncluded: z.literal(false),
    localPathsIncluded: z.literal(false),
    rawVideoIncluded: z.literal(false),
    secretsIncluded: z.literal(false),
  }),
  schemaVersion: z.literal(nativeQaRunbookPacketSchemaVersion),
  summary: z.object({
    action: z.string(),
    blockingChecks: z.number().int().nonnegative(),
    readyRuns: z.number().int().nonnegative(),
    requiredRuns: z.number().int().nonnegative(),
    status: z.string(),
    totalRuns: z.number().int().nonnegative(),
    workflowCountPerPlatform: z.number().int().nonnegative(),
  }),
  validationCommand: z.string(),
});

export type NativeQaRunbookPacket = z.infer<typeof NativeQaRunbookPacketSchema>;

const forbiddenRunbookPacketValuePattern =
  /(file:\/\/|content:\/\/|ph:\/\/|\/users\/|\/private\/|\/var\/|BEGIN PRIVATE KEY|ghp_[A-Za-z0-9_]+|pat_[A-Za-z0-9_]+|sk_live_[A-Za-z0-9_]+|sk_test_[A-Za-z0-9_]+|eyJ[A-Za-z0-9_-]{20,})/i;

function containsForbiddenPacketValue(value: unknown): boolean {
  if (typeof value === 'string') return forbiddenRunbookPacketValuePattern.test(value);
  if (Array.isArray(value)) return value.some(containsForbiddenPacketValue);
  if (value && typeof value === 'object') return Object.values(value).some(containsForbiddenPacketValue);
  return false;
}

export function assertNativeQaRunbookPacketIsShareSafe(packet: NativeQaRunbookPacket) {
  if (containsForbiddenPacketValue(packet)) {
    throw new Error('Native QA runbook packet contains credential values, local paths, raw artifacts, or token-like data.');
  }
  return packet;
}

export function buildNativeQaRunbookPacket(
  options: {
    appVersion?: string;
    generatedAt?: string;
  } = {},
): NativeQaRunbookPacket {
  const generatedAt = options.generatedAt ?? new Date().toISOString();
  const kit = buildNativeQaEvidenceKit();
  const evidenceDraft = buildNativeQaEvidenceDraft({
    appVersion: options.appVersion,
    generatedAt,
  });
  const validation = validateNativeQaEvidenceForApp(evidenceDraft);
  const readyRuns = validation.runSummaries.filter((run) => run.status === 'pass').length;

  const packet = NativeQaRunbookPacketSchema.parse({
    budgets: kit.budgets,
    evidenceDraft,
    generatedAt,
    kitSchemaVersion: kit.schemaVersion,
    placeholderPolicy: kit.placeholderPolicy,
    platforms: kit.platforms,
    privacy: {
      credentialValuesIncluded: false,
      localPathsIncluded: false,
      rawVideoIncluded: false,
      secretsIncluded: false,
    },
    schemaVersion: nativeQaRunbookPacketSchemaVersion,
    summary: {
      action: kit.summary.action,
      blockingChecks: validation.failedChecks.length,
      readyRuns,
      requiredRuns: kit.summary.requiredRuns,
      status: kit.summary.status,
      totalRuns: validation.runSummaries.length,
      workflowCountPerPlatform: kit.summary.workflowCountPerPlatform,
    },
    validationCommand: kit.validationCommand,
  });

  return assertNativeQaRunbookPacketIsShareSafe(packet);
}
