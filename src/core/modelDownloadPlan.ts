import { z } from 'zod';

import { type ModelDeliveryLifecycle } from './modelDeliveryLifecycle';
import { type PwaRuntimeReadiness } from './pwaRuntimeReadiness';

export const modelDownloadPlanSchemaVersion = 'movebeta.model-download-plan.v1';

const ModelDownloadPlanRuntimeSchema = z.enum(['native', 'web']);
const ModelDownloadPlanPreferenceSchema = z.enum(['automatic', 'manual', 'wifi-only']);
const ModelDownloadPlanNetworkSchema = z.enum(['cellular', 'offline', 'online', 'unknown', 'wifi']);
const ModelDownloadPlanStatusSchema = z.enum(['action', 'blocked', 'ready']);
const ModelDownloadPlanStepKeySchema = z.enum([
  'package-delivery',
  'download-trigger',
  'cache-warmup',
  'integrity-check',
  'offline-use',
]);

export const ModelDownloadPlanStepSchema = z.object({
  action: z.string().min(1),
  detail: z.string().min(1),
  key: ModelDownloadPlanStepKeySchema,
  label: z.string().min(1),
  status: ModelDownloadPlanStatusSchema,
  timing: z.string().min(1),
});

export const ModelDownloadPlanSchema = z.object({
  generatedAt: z.string().datetime(),
  model: z.object({
    additionalDownloadBytes: z.number().int().nonnegative(),
    packagedBytes: z.number().int().nonnegative(),
    totalBytes: z.number().int().nonnegative(),
  }),
  privacy: z.object({
    credentialValuesIncluded: z.literal(false),
    localPathsIncluded: z.literal(false),
    rawArtifactsIncluded: z.literal(false),
    rawVideoIncluded: z.literal(false),
    tokenLikeValuesIncluded: z.literal(false),
  }),
  schemaVersion: z.literal(modelDownloadPlanSchemaVersion),
  steps: z.array(ModelDownloadPlanStepSchema).length(5),
  summary: z.object({
    cacheReady: z.boolean(),
    downloadRequired: z.boolean(),
    downloadTrigger: z.string().min(1),
    network: ModelDownloadPlanNetworkSchema,
    nextAction: z.string().min(1),
    offlineReady: z.boolean(),
    preference: ModelDownloadPlanPreferenceSchema,
    runtime: ModelDownloadPlanRuntimeSchema,
    status: ModelDownloadPlanStatusSchema,
    updateAvailable: z.boolean(),
  }),
});

export type ModelDownloadPlan = z.infer<typeof ModelDownloadPlanSchema>;
export type ModelDownloadPlanNetwork = z.infer<typeof ModelDownloadPlanNetworkSchema>;
export type ModelDownloadPlanPreference = z.infer<typeof ModelDownloadPlanPreferenceSchema>;
export type ModelDownloadPlanStatus = z.infer<typeof ModelDownloadPlanStatusSchema>;
export type ModelDownloadPlanStep = z.infer<typeof ModelDownloadPlanStepSchema>;

const forbiddenDownloadPlanValuePattern =
  /(file:\/\/|content:\/\/|asset:\/\/|ph:\/\/|\/Users\/|\/private\/|\/var\/mobile\/|[A-Za-z]:\\|\.mov\b|\.mp4\b|BEGIN PRIVATE KEY|ghp_[A-Za-z0-9_]+|github_pat_[A-Za-z0-9_]+|pat_[A-Za-z0-9_]+|sk_live_[A-Za-z0-9_]+|sk_test_[A-Za-z0-9_]+|bearer\s+[A-Za-z0-9._-]+|eyJ[A-Za-z0-9_-]{20,})/i;

function containsForbiddenValue(value: unknown): boolean {
  if (typeof value === 'string') return forbiddenDownloadPlanValuePattern.test(value);
  if (Array.isArray(value)) return value.some(containsForbiddenValue);
  if (value && typeof value === 'object') return Object.values(value).some(containsForbiddenValue);
  return false;
}

function downloadTriggerFor(lifecycle: ModelDeliveryLifecycle, runtime: ModelDownloadPlan['summary']['runtime']) {
  if (runtime === 'native') return 'App install or app update';
  if (lifecycle.summary.downloadStrategy === 'precache-on-install') return 'First online PWA install, app reload, or Warm model';
  if (lifecycle.summary.downloadStrategy === 'warmup-only') return 'Warm model or online Analyze';
  return 'First online Analyze';
}

function networkAllowsDownload({
  network,
  preference,
}: {
  network: ModelDownloadPlanNetwork;
  preference: ModelDownloadPlanPreference;
}) {
  if (network === 'offline') return false;
  if (preference === 'wifi-only' && network === 'cellular') return false;
  return true;
}

function nextActionFor({
  cacheReady,
  downloadRequired,
  lifecycle,
  network,
  preference,
  runtime,
  updateAvailable,
}: {
  cacheReady: boolean;
  downloadRequired: boolean;
  lifecycle: ModelDeliveryLifecycle;
  network: ModelDownloadPlanNetwork;
  preference: ModelDownloadPlanPreference;
  runtime: ModelDownloadPlan['summary']['runtime'];
  updateAvailable: boolean;
}) {
  if (runtime === 'native') return 'Install or update the native app; no separate model download is required.';
  if (updateAvailable) return 'Refresh the PWA online, then warm the model cache before relying on offline analysis.';
  if (!downloadRequired && cacheReady) return 'No model download is needed now; keep Warm model available after future deploys.';
  if (network === 'offline') return 'Reconnect before recording or importing a real video that needs uncached model assets.';
  if (preference === 'wifi-only' && network === 'cellular') return 'Switch to Wi-Fi before warming the model cache.';
  if (preference === 'manual') return 'Use Warm model online before the gym session or before going offline.';
  if (lifecycle.summary.downloadStrategy === 'precache-on-install') return 'Open the PWA online once or use Warm model to populate the cache.';
  if (lifecycle.summary.downloadStrategy === 'warmup-only') return 'Use Warm model or start Analyze online so the cache is prepared before local inference.';
  return 'Start Analyze online once to fetch the model, then verify offline reuse before field use.';
}

function statusFor({
  downloadAllowed,
  downloadRequired,
  offlineReady,
  runtime,
}: {
  downloadAllowed: boolean;
  downloadRequired: boolean;
  offlineReady: boolean;
  runtime: ModelDownloadPlan['summary']['runtime'];
}) {
  if (runtime === 'native' || offlineReady) return 'ready';
  if (downloadRequired && !downloadAllowed) return 'blocked';
  return 'action';
}

function step({
  action,
  detail,
  key,
  label,
  status,
  timing,
}: {
  action: string;
  detail: string;
  key: ModelDownloadPlanStep['key'];
  label: string;
  status: ModelDownloadPlanStatus;
  timing: string;
}) {
  return ModelDownloadPlanStepSchema.parse({ action, detail, key, label, status, timing });
}

export function assertModelDownloadPlanIsShareSafe(plan: ModelDownloadPlan) {
  if (containsForbiddenValue(plan)) {
    throw new Error('Model download plan contains credential values, local paths, raw artifacts, raw video references, or token-like data.');
  }
  return plan;
}

export function buildModelDownloadPlan({
  generatedAt = new Date().toISOString(),
  lifecycle,
  network = 'unknown',
  preference = 'wifi-only',
  runtimeReadiness,
}: {
  generatedAt?: string;
  lifecycle: ModelDeliveryLifecycle;
  network?: ModelDownloadPlanNetwork;
  preference?: ModelDownloadPlanPreference;
  runtimeReadiness?: PwaRuntimeReadiness;
}): ModelDownloadPlan {
  const runtime = lifecycle.summary.deliveryMode === 'native-bundled' ? 'native' : 'web';
  const cacheReady = runtime === 'native' || lifecycle.summary.cacheReady;
  const updateAvailable = runtime === 'web' && lifecycle.summary.updateAvailable;
  const offlineReady = runtime === 'native' || (cacheReady && !updateAvailable);
  const downloadRequired = runtime === 'web' && (!cacheReady || updateAvailable);
  const downloadAllowed = networkAllowsDownload({ network, preference });
  const status = statusFor({ downloadAllowed, downloadRequired, offlineReady, runtime });
  const trigger = downloadTriggerFor(lifecycle, runtime);
  const integritySupported = Boolean(runtimeReadiness?.summary.modelIntegritySupported);
  const integrityVerified = Boolean(runtimeReadiness?.summary.modelIntegrityVerified);
  const cachedCount = runtimeReadiness?.summary.modelAssetsCached ?? 0;
  const expectedCount = runtimeReadiness?.summary.modelAssetsExpected ?? lifecycle.model.assetCount;
  const verifiedCount = runtimeReadiness?.summary.modelAssetsVerified ?? 0;

  const steps = [
    step({
      action:
        runtime === 'native'
          ? 'Keep model/provider changes tied to app release notes.'
          : 'Keep /model-assets.json and listed /models files in the exported static build.',
      detail:
        runtime === 'native'
          ? 'The model is delivered with the native build or native provider bundle.'
          : `${lifecycle.model.name} is shipped as same-origin static assets before deployment.`,
      key: 'package-delivery',
      label: 'Package delivery',
      status: lifecycle.summary.deliveryPathVerified || runtime === 'native' ? 'ready' : 'action',
      timing: runtime === 'native' ? 'During app install' : 'During build/export',
    }),
    step({
      action:
        runtime === 'native'
          ? 'Install the native build from the configured release channel.'
          : lifecycle.summary.downloadStrategy === 'lazy-on-analysis'
            ? 'Prefer Warm model before a gym session so first analysis does not wait on network.'
            : 'Use the configured trigger while online before relying on offline analysis.',
      detail: lifecycle.summary.downloadTrigger,
      key: 'download-trigger',
      label: 'Download trigger',
      status: runtime === 'native' || lifecycle.summary.deliveryPathVerified ? 'ready' : 'action',
      timing: trigger,
    }),
    step({
      action:
        runtime === 'native'
          ? 'No browser cache warmup is required.'
          : cacheReady
            ? 'Keep Warm model available for refresh after deploys.'
            : network === 'offline'
              ? 'Reconnect and warm the model cache before real-video analysis.'
              : preference === 'manual'
                ? 'Tap Warm model before leaving the network.'
                : 'Warm the model cache while online.',
      detail:
        runtime === 'native'
          ? 'Native analysis uses packaged provider assets.'
          : cacheReady
            ? `Cache Storage already has ${cachedCount}/${expectedCount} model asset(s).`
            : `Cache Storage still needs ${Math.max(0, expectedCount - cachedCount)}/${expectedCount} model asset(s).`,
      key: 'cache-warmup',
      label: 'Cache warmup',
      status: runtime === 'native' || cacheReady ? 'ready' : network === 'offline' ? 'blocked' : 'action',
      timing: runtime === 'native' ? 'At install time' : 'Before offline use',
    }),
    step({
      action:
        runtime === 'native'
          ? 'Use app signing and native store distribution integrity.'
          : integritySupported
            ? 'Warm again until cached byte counts and SHA-256 digests match the manifest.'
            : 'Use browser Web Crypto SHA-256 support when available; otherwise rely on cache presence.',
      detail:
        runtime === 'native'
          ? 'Browser SHA-256 cache verification does not apply to native bundled delivery.'
          : integritySupported
            ? `Runtime verification has ${verifiedCount}/${expectedCount} model asset(s) verified.`
            : 'Runtime integrity verification is not available in this environment.',
      key: 'integrity-check',
      label: 'Integrity check',
      status: runtime === 'native' || integrityVerified || !integritySupported ? 'ready' : cacheReady ? 'action' : 'action',
      timing: runtime === 'native' ? 'During app distribution' : 'After cache warmup',
    }),
    step({
      action:
        offlineReady
          ? 'Run one offline relaunch and local analysis smoke before a field session.'
          : network === 'offline'
            ? 'Do not start uncached real-video analysis until the model cache is warmed online.'
            : 'Warm the model online, then switch offline and run a local smoke.',
      detail:
        offlineReady
          ? 'The current runtime can reuse local model assets without a cloud call.'
          : 'Offline analysis depends on cached model assets being available on this device/browser.',
      key: 'offline-use',
      label: 'Offline use',
      status: offlineReady ? 'ready' : network === 'offline' ? 'blocked' : 'action',
      timing: 'Before the climbing session',
    }),
  ];

  const plan = ModelDownloadPlanSchema.parse({
    generatedAt,
    model: {
      additionalDownloadBytes: downloadRequired ? lifecycle.model.totalBytes : 0,
      packagedBytes: runtime === 'native' ? lifecycle.model.totalBytes : 0,
      totalBytes: lifecycle.model.totalBytes,
    },
    privacy: {
      credentialValuesIncluded: false,
      localPathsIncluded: false,
      rawArtifactsIncluded: false,
      rawVideoIncluded: false,
      tokenLikeValuesIncluded: false,
    },
    schemaVersion: modelDownloadPlanSchemaVersion,
    steps,
    summary: {
      cacheReady,
      downloadRequired,
      downloadTrigger: trigger,
      network,
      nextAction: nextActionFor({
        cacheReady,
        downloadRequired,
        lifecycle,
        network,
        preference,
        runtime,
        updateAvailable,
      }),
      offlineReady,
      preference,
      runtime,
      status,
      updateAvailable,
    },
  });

  return assertModelDownloadPlanIsShareSafe(plan);
}
