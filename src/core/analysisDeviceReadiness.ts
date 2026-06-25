import { z } from 'zod';

import { videoAnalysisConfig } from '@/video/videoConfig';

export const analysisDeviceReadinessSchemaVersion = 'movebeta.analysis-device-readiness.v1';

const AnalysisDeviceRuntimeSchema = z.enum(['native', 'web']);
const AnalysisDeviceReadinessStatusSchema = z.enum(['blocked', 'ready', 'review']);
const AnalysisDeviceReadinessStepKeySchema = z.enum(['runtime', 'power', 'compute', 'storage', 'privacy-boundary']);

export type AnalysisDeviceProbe = {
  batteryCharging?: boolean;
  batteryLevel?: number;
  batterySupported: boolean;
  deviceMemoryGb?: number;
  freeStorageBytes?: number;
  hardwareConcurrency?: number;
  online: boolean;
  powerSaveMode?: boolean;
  runtime: z.infer<typeof AnalysisDeviceRuntimeSchema>;
  saveData?: boolean;
  storageEstimateSupported: boolean;
};

export const AnalysisDeviceReadinessStepSchema = z.object({
  action: z.string().min(1),
  detail: z.string().min(1),
  key: AnalysisDeviceReadinessStepKeySchema,
  label: z.string().min(1),
  status: AnalysisDeviceReadinessStatusSchema,
});

export const AnalysisDeviceReadinessSchema = z.object({
  generatedAt: z.string().datetime(),
  privacy: z.object({
    credentialValuesIncluded: z.literal(false),
    localPathsIncluded: z.literal(false),
    rawArtifactsIncluded: z.literal(false),
    rawVideoIncluded: z.literal(false),
    tokenLikeValuesIncluded: z.literal(false),
    videoUriIncluded: z.literal(false),
  }),
  schemaVersion: z.literal(analysisDeviceReadinessSchemaVersion),
  signals: z.object({
    batteryCharging: z.boolean().optional(),
    batteryLevel: z.number().min(0).max(1).optional(),
    batterySupported: z.boolean(),
    deviceMemoryGb: z.number().positive().optional(),
    freeStorageBytes: z.number().int().nonnegative().optional(),
    hardwareConcurrency: z.number().int().positive().optional(),
    online: z.boolean(),
    powerSaveMode: z.boolean().optional(),
    runtime: AnalysisDeviceRuntimeSchema,
    saveData: z.boolean().optional(),
    storageEstimateSupported: z.boolean(),
  }),
  steps: z.array(AnalysisDeviceReadinessStepSchema).length(5),
  summary: z.object({
    blockedCount: z.number().int().nonnegative(),
    canAnalyze: z.boolean(),
    nextAction: z.string().min(1),
    readyCount: z.number().int().nonnegative(),
    reviewCount: z.number().int().nonnegative(),
    status: AnalysisDeviceReadinessStatusSchema,
  }),
});

export type AnalysisDeviceReadiness = z.infer<typeof AnalysisDeviceReadinessSchema>;
export type AnalysisDeviceReadinessStatus = z.infer<typeof AnalysisDeviceReadinessStatusSchema>;
export type AnalysisDeviceReadinessStep = z.infer<typeof AnalysisDeviceReadinessStepSchema>;

const forbiddenAnalysisDeviceValuePattern =
  /(file:\/\/|content:\/\/|asset:\/\/|ph:\/\/|\/Users\/|\/private\/|\/var\/mobile\/|[A-Za-z]:\\|\.mov\b|\.mp4\b|BEGIN PRIVATE KEY|ghp_[A-Za-z0-9_]+|github_pat_[A-Za-z0-9_]+|pat_[A-Za-z0-9_]+|sk_live_[A-Za-z0-9_]+|sk_test_[A-Za-z0-9_]+|bearer\s+[A-Za-z0-9._-]+|eyJ[A-Za-z0-9_-]{20,})/i;

function containsForbiddenValue(value: unknown): boolean {
  if (typeof value === 'string') return forbiddenAnalysisDeviceValuePattern.test(value);
  if (Array.isArray(value)) return value.some(containsForbiddenValue);
  if (value && typeof value === 'object') return Object.values(value).some(containsForbiddenValue);
  return false;
}

function step({
  action,
  detail,
  key,
  label,
  status,
}: {
  action: string;
  detail: string;
  key: AnalysisDeviceReadinessStep['key'];
  label: string;
  status: AnalysisDeviceReadinessStatus;
}) {
  return AnalysisDeviceReadinessStepSchema.parse({ action, detail, key, label, status });
}

function aggregateStatus(steps: AnalysisDeviceReadinessStep[]): AnalysisDeviceReadinessStatus {
  if (steps.some((item) => item.status === 'blocked')) return 'blocked';
  if (steps.some((item) => item.status === 'review')) return 'review';
  return 'ready';
}

function formatBytes(value: number) {
  if (value >= 1_000_000_000) return `${Math.round(value / 100_000_000) / 10} GB`;
  if (value >= 1_000_000) return `${Math.round(value / 100_000) / 10} MB`;
  return `${Math.round(value / 1_000)} KB`;
}

function normalizeProbe(probe: AnalysisDeviceProbe): AnalysisDeviceProbe {
  return {
    ...probe,
    batteryLevel:
      typeof probe.batteryLevel === 'number' && Number.isFinite(probe.batteryLevel)
        ? Math.max(0, Math.min(1, probe.batteryLevel))
        : undefined,
    deviceMemoryGb:
      typeof probe.deviceMemoryGb === 'number' && Number.isFinite(probe.deviceMemoryGb) && probe.deviceMemoryGb > 0
        ? probe.deviceMemoryGb
        : undefined,
    freeStorageBytes:
      typeof probe.freeStorageBytes === 'number' && Number.isFinite(probe.freeStorageBytes) && probe.freeStorageBytes >= 0
        ? Math.trunc(probe.freeStorageBytes)
        : undefined,
    hardwareConcurrency:
      typeof probe.hardwareConcurrency === 'number' && Number.isFinite(probe.hardwareConcurrency) && probe.hardwareConcurrency > 0
        ? Math.trunc(probe.hardwareConcurrency)
        : undefined,
  };
}

function powerStatus(probe: AnalysisDeviceProbe): AnalysisDeviceReadinessStatus {
  if (probe.powerSaveMode) return 'review';
  if (!probe.batterySupported || typeof probe.batteryLevel !== 'number') return 'review';
  if (!probe.batteryCharging && probe.batteryLevel < videoAnalysisConfig.deviceReadiness.lowBatteryLevel) return 'review';
  return 'ready';
}

function computeStatus(probe: AnalysisDeviceProbe): AnalysisDeviceReadinessStatus {
  const lowConcurrency =
    typeof probe.hardwareConcurrency === 'number' &&
    probe.hardwareConcurrency < videoAnalysisConfig.deviceReadiness.minimumHardwareConcurrency;
  const lowMemory =
    typeof probe.deviceMemoryGb === 'number' &&
    probe.deviceMemoryGb < videoAnalysisConfig.deviceReadiness.minimumDeviceMemoryGb;

  if (lowConcurrency || lowMemory || typeof probe.hardwareConcurrency !== 'number') return 'review';
  return 'ready';
}

function storageStatus(probe: AnalysisDeviceProbe): AnalysisDeviceReadinessStatus {
  if (!probe.storageEstimateSupported || typeof probe.freeStorageBytes !== 'number') return 'review';
  return probe.freeStorageBytes < videoAnalysisConfig.deviceReadiness.minimumFreeStorageBytes ? 'review' : 'ready';
}

export function assertAnalysisDeviceReadinessIsShareSafe(readiness: AnalysisDeviceReadiness) {
  if (containsForbiddenValue(readiness)) {
    throw new Error('Analysis device readiness contains credential values, local paths, raw artifacts, raw video references, or token-like data.');
  }
  return readiness;
}

export function buildAnalysisDeviceReadiness({
  generatedAt = new Date().toISOString(),
  probe,
}: {
  generatedAt?: string;
  probe: AnalysisDeviceProbe;
}): AnalysisDeviceReadiness {
  const nextProbe = normalizeProbe(probe);
  const runtime = AnalysisDeviceRuntimeSchema.parse(nextProbe.runtime);
  const batteryPercent =
    typeof nextProbe.batteryLevel === 'number' ? `${Math.round(nextProbe.batteryLevel * 100)}%` : 'unknown';
  const powerStepStatus = powerStatus(nextProbe);
  const computeStepStatus = computeStatus(nextProbe);
  const storageStepStatus = storageStatus(nextProbe);
  const steps = [
    step({
      action: runtime === 'native' ? 'Use the native bundled pose provider path.' : 'Keep the browser tab active during local analysis.',
      detail:
        runtime === 'native'
          ? 'Native runtime does not depend on browser-only device APIs.'
          : `Web runtime is ${nextProbe.online ? 'online' : 'offline'}; local analysis can reuse cached assets when ready.`,
      key: 'runtime',
      label: 'Runtime',
      status: 'ready',
    }),
    step({
      action:
        powerStepStatus === 'ready'
          ? 'Battery state is suitable for local analysis.'
          : 'Plug in power or keep the analysis window short if battery or power-save signals are limited.',
      detail: nextProbe.batterySupported
        ? `Battery ${batteryPercent}${nextProbe.batteryCharging ? ', charging' : ''}${nextProbe.powerSaveMode ? ', power save mode' : ''}.`
        : 'Battery API is not available in this runtime.',
      key: 'power',
      label: 'Power',
      status: powerStepStatus,
    }),
    step({
      action:
        computeStepStatus === 'ready'
          ? 'Device compute signals fit the configured local model threshold.'
          : 'Prefer a shorter clip or selected analysis window on low or unknown compute devices.',
      detail: `${nextProbe.hardwareConcurrency ?? 'unknown'} logical core(s), ${nextProbe.deviceMemoryGb ?? 'unknown'} GB memory signal.`,
      key: 'compute',
      label: 'Compute',
      status: computeStepStatus,
    }),
    step({
      action:
        storageStepStatus === 'ready'
          ? 'Free storage estimate is above the configured local analysis threshold.'
          : 'Free storage is low or unavailable; avoid long imports and keep model cache warmed intentionally.',
      detail:
        typeof nextProbe.freeStorageBytes === 'number'
          ? `${formatBytes(nextProbe.freeStorageBytes)} estimated free storage.`
          : 'Storage estimate API is not available in this runtime.',
      key: 'storage',
      label: 'Storage',
      status: storageStepStatus,
    }),
    step({
      action: 'Keep device readiness exports limited to coarse runtime signals and derived statuses.',
      detail: 'The packet excludes video URI, raw media, local paths, credentials, and token-like values.',
      key: 'privacy-boundary',
      label: 'Privacy boundary',
      status: 'ready',
    }),
  ];

  const status = aggregateStatus(steps);
  const blockedCount = steps.filter((item) => item.status === 'blocked').length;
  const readyCount = steps.filter((item) => item.status === 'ready').length;
  const reviewCount = steps.filter((item) => item.status === 'review').length;
  const packet = AnalysisDeviceReadinessSchema.parse({
    generatedAt,
    privacy: {
      credentialValuesIncluded: false,
      localPathsIncluded: false,
      rawArtifactsIncluded: false,
      rawVideoIncluded: false,
      tokenLikeValuesIncluded: false,
      videoUriIncluded: false,
    },
    schemaVersion: analysisDeviceReadinessSchemaVersion,
    signals: {
      batteryCharging: nextProbe.batteryCharging,
      batteryLevel: nextProbe.batteryLevel,
      batterySupported: nextProbe.batterySupported,
      deviceMemoryGb: nextProbe.deviceMemoryGb,
      freeStorageBytes: nextProbe.freeStorageBytes,
      hardwareConcurrency: nextProbe.hardwareConcurrency,
      online: nextProbe.online,
      powerSaveMode: nextProbe.powerSaveMode,
      runtime,
      saveData: nextProbe.saveData,
      storageEstimateSupported: nextProbe.storageEstimateSupported,
    },
    steps,
    summary: {
      blockedCount,
      canAnalyze: blockedCount === 0,
      nextAction:
        steps.find((item) => item.status === 'blocked')?.action ??
        steps.find((item) => item.status === 'review')?.action ??
        'Device readiness is suitable for local analysis.',
      readyCount,
      reviewCount,
      status,
    },
  });

  return assertAnalysisDeviceReadinessIsShareSafe(packet);
}
