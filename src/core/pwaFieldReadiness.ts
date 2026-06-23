import { z } from 'zod';

import { type ModelDownloadPlan } from './modelDownloadPlan';
import { type PwaRuntimeReadiness } from './pwaRuntimeReadiness';

export const pwaFieldReadinessSchemaVersion = 'movebeta.pwa-field-readiness.v1';

const PwaFieldReadinessStatusSchema = z.enum(['action', 'blocked', 'ready']);
const PwaFieldReadinessStepKeySchema = z.enum([
  'runtime-surface',
  'service-worker',
  'model-cache',
  'update-state',
  'offline-video',
]);

export const PwaFieldReadinessStepSchema = z.object({
  action: z.string().min(1),
  detail: z.string().min(1),
  key: PwaFieldReadinessStepKeySchema,
  label: z.string().min(1),
  status: PwaFieldReadinessStatusSchema,
});

export const PwaFieldReadinessSchema = z.object({
  generatedAt: z.string().datetime(),
  privacy: z.object({
    credentialValuesIncluded: z.literal(false),
    localPathsIncluded: z.literal(false),
    rawArtifactsIncluded: z.literal(false),
    rawVideoIncluded: z.literal(false),
    tokenLikeValuesIncluded: z.literal(false),
  }),
  schemaVersion: z.literal(pwaFieldReadinessSchemaVersion),
  steps: z.array(PwaFieldReadinessStepSchema).length(5),
  summary: z.object({
    actionCount: z.number().int().nonnegative(),
    blockerCount: z.number().int().nonnegative(),
    deliveryRuntime: z.enum(['native', 'web']),
    downloadRequired: z.boolean(),
    modelBytesCached: z.number().int().nonnegative(),
    modelBytesExpected: z.number().int().nonnegative(),
    modelBytesMissing: z.number().int().nonnegative(),
    nextAction: z.string().min(1),
    readyForOfflineVideo: z.boolean(),
    runtimeStatus: z.enum(['installable', 'installed', 'native', 'runtime-ready', 'unsupported']),
    status: PwaFieldReadinessStatusSchema,
    updateAvailable: z.boolean(),
  }),
});

export type PwaFieldReadiness = z.infer<typeof PwaFieldReadinessSchema>;
export type PwaFieldReadinessStatus = z.infer<typeof PwaFieldReadinessStatusSchema>;
export type PwaFieldReadinessStep = z.infer<typeof PwaFieldReadinessStepSchema>;

const forbiddenPwaFieldReadinessValuePattern =
  /(file:\/\/|content:\/\/|asset:\/\/|ph:\/\/|\/Users\/|\/private\/|\/var\/mobile\/|[A-Za-z]:\\|\.mov\b|\.mp4\b|BEGIN PRIVATE KEY|ghp_[A-Za-z0-9_]+|github_pat_[A-Za-z0-9_]+|pat_[A-Za-z0-9_]+|sk_live_[A-Za-z0-9_]+|sk_test_[A-Za-z0-9_]+|bearer\s+[A-Za-z0-9._-]+|eyJ[A-Za-z0-9_-]{20,})/i;

function containsForbiddenValue(value: unknown): boolean {
  if (typeof value === 'string') return forbiddenPwaFieldReadinessValuePattern.test(value);
  if (Array.isArray(value)) return value.some(containsForbiddenValue);
  if (value && typeof value === 'object') return Object.values(value).some(containsForbiddenValue);
  return false;
}

function fieldStep({
  action,
  detail,
  key,
  label,
  status,
}: {
  action: string;
  detail: string;
  key: PwaFieldReadinessStep['key'];
  label: string;
  status: PwaFieldReadinessStatus;
}) {
  return PwaFieldReadinessStepSchema.parse({ action, detail, key, label, status });
}

function runtimeCheck(readiness: PwaRuntimeReadiness, key: string) {
  return readiness.checks.find((check) => check.key === key);
}

function aggregateStatus(steps: PwaFieldReadinessStep[]): PwaFieldReadinessStatus {
  if (steps.some((step) => step.status === 'blocked')) return 'blocked';
  if (steps.some((step) => step.status === 'action')) return 'action';
  return 'ready';
}

function cachedBytesFor(readiness: PwaRuntimeReadiness, modelDownloadPlan: ModelDownloadPlan) {
  if (modelDownloadPlan.summary.runtime === 'native') return modelDownloadPlan.model.packagedBytes;
  return readiness.summary.modelBytesCached;
}

export function assertPwaFieldReadinessIsShareSafe(readiness: PwaFieldReadiness) {
  if (containsForbiddenValue(readiness)) {
    throw new Error('PWA field readiness contains credential values, local paths, raw artifacts, raw video references, or token-like data.');
  }
  return readiness;
}

export function buildPwaFieldReadiness({
  generatedAt = new Date().toISOString(),
  modelDownloadPlan,
  readiness,
}: {
  generatedAt?: string;
  modelDownloadPlan: ModelDownloadPlan;
  readiness: PwaRuntimeReadiness;
}): PwaFieldReadiness {
  const nativeRuntime = modelDownloadPlan.summary.runtime === 'native' || readiness.summary.status === 'native';
  const unsupportedRuntime = readiness.summary.status === 'unsupported';
  const serviceWorker = runtimeCheck(readiness, 'service-worker');
  const updatePending = readiness.summary.updateAvailable || modelDownloadPlan.summary.updateAvailable;
  const modelReady =
    nativeRuntime ||
    (readiness.summary.offlineReady &&
      readiness.summary.modelCacheReady &&
      modelDownloadPlan.summary.offlineReady &&
      (!readiness.summary.modelIntegritySupported || readiness.summary.modelIntegrityVerified));
  const serviceWorkerReady = nativeRuntime || serviceWorker?.status === 'ready';
  const runtimeReady = nativeRuntime || !unsupportedRuntime;

  const steps = [
    fieldStep({
      action: nativeRuntime
        ? 'Use the native installed app; model assets are delivered with the app bundle or native provider.'
        : unsupportedRuntime
          ? 'Use a browser with service worker and Cache API support before claiming PWA field readiness.'
          : 'Keep the PWA install path available, then use Warm model before leaving the network.',
      detail: nativeRuntime
        ? 'Native builds do not depend on browser PWA installation for local video analysis.'
        : `Current browser runtime status is ${readiness.summary.status}.`,
      key: 'runtime-surface',
      label: 'Runtime surface',
      status: runtimeReady ? 'ready' : 'blocked',
    }),
    fieldStep({
      action: nativeRuntime
        ? 'Use native bundle startup and local storage.'
        : serviceWorkerReady
          ? 'Keep the exported service worker registered and controlled after every deploy.'
          : serviceWorker?.action ?? 'Reload online once so the service worker can register and control the page.',
      detail: nativeRuntime
        ? 'Browser service worker readiness does not apply to native builds.'
        : serviceWorker?.detail ?? 'No service worker check was available in the runtime readiness packet.',
      key: 'service-worker',
      label: 'Service worker',
      status: nativeRuntime ? 'ready' : serviceWorker?.status ?? 'blocked',
    }),
    fieldStep({
      action: modelReady
        ? 'Keep Warm model available after future deploys or model upgrades.'
        : updatePending
          ? 'Activate the waiting PWA update online, then warm and verify the model cache again.'
          : modelDownloadPlan.summary.nextAction,
      detail: modelReady
        ? `${readiness.summary.modelAssetsCached}/${readiness.summary.modelAssetsExpected} model asset(s) are ready for offline analysis.`
        : `${Math.max(0, readiness.summary.modelAssetsExpected - readiness.summary.modelAssetsCached)}/${readiness.summary.modelAssetsExpected} model asset(s) still need cache or integrity proof.`,
      key: 'model-cache',
      label: 'Model cache',
      status: modelReady ? 'ready' : updatePending ? 'blocked' : 'action',
    }),
    fieldStep({
      action: updatePending
        ? 'Refresh or activate the pending PWA update while online before recording or importing real videos offline.'
        : 'No pending PWA update is blocking offline analysis.',
      detail: updatePending
        ? 'A pending service worker or model delivery update can invalidate the current offline runtime.'
        : 'Runtime and model delivery packets report no waiting update.',
      key: 'update-state',
      label: 'Update state',
      status: updatePending ? 'blocked' : 'ready',
    }),
    fieldStep({
      action:
        runtimeReady && serviceWorkerReady && modelReady && !updatePending
          ? 'Field use is ready: launch once online, then record or import videos with on-device inference.'
          : updatePending
            ? 'Resolve the pending PWA update before relying on offline video analysis.'
            : modelReady
              ? 'Resolve the runtime or service worker readiness action before field use.'
              : 'Warm and verify the model cache online before going offline.',
      detail:
        runtimeReady && serviceWorkerReady && modelReady && !updatePending
          ? 'The runtime, service worker, model cache, integrity state, and update state are aligned.'
          : 'Offline video analysis still has at least one unresolved readiness dependency.',
      key: 'offline-video',
      label: 'Offline video',
      status:
        runtimeReady && serviceWorkerReady && modelReady && !updatePending
          ? 'ready'
          : updatePending || !runtimeReady || serviceWorker?.status === 'blocked'
            ? 'blocked'
            : 'action',
    }),
  ];

  const status = aggregateStatus(steps);
  const blockerCount = steps.filter((step) => step.status === 'blocked').length;
  const actionCount = steps.filter((step) => step.status === 'action').length;
  const modelBytesCached = cachedBytesFor(readiness, modelDownloadPlan);
  const modelBytesExpected = modelDownloadPlan.model.totalBytes;
  const packet = PwaFieldReadinessSchema.parse({
    generatedAt,
    privacy: {
      credentialValuesIncluded: false,
      localPathsIncluded: false,
      rawArtifactsIncluded: false,
      rawVideoIncluded: false,
      tokenLikeValuesIncluded: false,
    },
    schemaVersion: pwaFieldReadinessSchemaVersion,
    steps,
    summary: {
      actionCount,
      blockerCount,
      deliveryRuntime: modelDownloadPlan.summary.runtime,
      downloadRequired: modelDownloadPlan.summary.downloadRequired,
      modelBytesCached,
      modelBytesExpected,
      modelBytesMissing: Math.max(0, modelBytesExpected - modelBytesCached),
      nextAction:
        steps.find((step) => step.status === 'blocked')?.action ??
        steps.find((step) => step.status === 'action')?.action ??
        'PWA field readiness is ready for offline real-video analysis.',
      readyForOfflineVideo: status === 'ready',
      runtimeStatus: readiness.summary.status,
      status,
      updateAvailable: updatePending,
    },
  });

  return assertPwaFieldReadinessIsShareSafe(packet);
}
