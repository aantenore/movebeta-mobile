import { z } from 'zod';

import { type PwaRuntimeReadiness } from './pwaRuntimeReadiness';

export const modelDeliveryLifecycleSchemaVersion = 'movebeta.model-delivery-lifecycle.v1';
export const modelDeliveryPolicySchemaVersion = 'movebeta.model-delivery-policy.v1';

const ModelDeliveryLifecycleStatusSchema = z.enum(['action', 'blocked', 'ready']);
const ModelDownloadStrategySchema = z.enum(['precache-on-install', 'warmup-only', 'lazy-on-analysis']);
const ModelDeliveryLifecycleStageKeySchema = z.enum([
  'build-vendoring',
  'app-delivery',
  'asset-versioning',
  'first-online-launch',
  'offline-reuse',
]);

export const ModelDeliveryPolicySchema = z.object({
  native: z.object({
    deliveryMode: z.literal('platform-provider-bundled'),
  }),
  schemaVersion: z.literal(modelDeliveryPolicySchemaVersion),
  web: z.object({
    downloadStrategy: ModelDownloadStrategySchema,
    integrity: z.enum(['sha256-manifest', 'cache-presence']),
    offlineUse: z.enum(['requires-cached-assets', 'online-first']),
    userAction: z.string().min(1),
  }),
});

export const ModelDeliveryLifecycleStageSchema = z.object({
  detail: z.string().min(1),
  key: ModelDeliveryLifecycleStageKeySchema,
  label: z.string().min(1),
  nextAction: z.string().min(1),
  status: ModelDeliveryLifecycleStatusSchema,
});

export const ModelDeliveryLifecycleSchema = z.object({
  generatedAt: z.string().datetime(),
  model: z.object({
    assetCount: z.number().int().nonnegative(),
    modelUrl: z.string().min(1),
    name: z.string().min(1),
    totalBytes: z.number().int().nonnegative(),
  }),
  privacy: z.object({
    credentialValuesIncluded: z.literal(false),
    localPathsIncluded: z.literal(false),
    rawArtifactsIncluded: z.literal(false),
    rawVideoIncluded: z.literal(false),
    tokenLikeValuesIncluded: z.literal(false),
  }),
  schemaVersion: z.literal(modelDeliveryLifecycleSchemaVersion),
  stages: z.array(ModelDeliveryLifecycleStageSchema).length(5),
  summary: z.object({
    cacheReady: z.boolean(),
    contentAddressedCache: z.boolean(),
    deliveryPathVerified: z.boolean(),
    deliveryMode: z.enum(['native-bundled', 'same-origin-static']),
    downloadStrategy: ModelDownloadStrategySchema,
    downloadTrigger: z.string().min(1),
    firstUseRequiresNetwork: z.boolean(),
    nextAction: z.string().min(1),
    status: ModelDeliveryLifecycleStatusSchema,
    updateAvailable: z.boolean(),
    updateTrigger: z.string().min(1),
  }),
});

export type ModelDeliveryLifecycle = z.infer<typeof ModelDeliveryLifecycleSchema>;
export type ModelDeliveryLifecycleStatus = z.infer<typeof ModelDeliveryLifecycleStatusSchema>;
export type ModelDeliveryLifecycleStage = z.infer<typeof ModelDeliveryLifecycleStageSchema>;
export type ModelDeliveryPolicy = z.infer<typeof ModelDeliveryPolicySchema>;

type StaticModelAssetReport = {
  checks?: Array<{
    key?: unknown;
    status?: unknown;
  }>;
  modelName?: unknown;
  modelUrl?: unknown;
  summary?: {
    assetCount?: unknown;
    distAssetCount?: unknown;
    exportedAssetCount?: unknown;
    shardCount?: unknown;
    sourceAssetCount?: unknown;
    status?: unknown;
    totalBytes?: unknown;
  };
};

type PwaReadinessReport = {
  checks?: Array<{
    key?: unknown;
    status?: unknown;
  }>;
  summary?: {
    checkCount?: unknown;
    status?: unknown;
    verifiedCount?: unknown;
  };
};

type WebSmokeReport = {
  status?: unknown;
  summary?: {
    passedChecks?: unknown;
    status?: unknown;
    totalChecks?: unknown;
  };
};

const forbiddenLifecycleValuePattern =
  /(file:\/\/|content:\/\/|asset:\/\/|ph:\/\/|\/Users\/|\/private\/|\/var\/mobile\/|[A-Za-z]:\\|\.mov\b|\.mp4\b|BEGIN PRIVATE KEY|ghp_[A-Za-z0-9_]+|github_pat_[A-Za-z0-9_]+|pat_[A-Za-z0-9_]+|sk_live_[A-Za-z0-9_]+|sk_test_[A-Za-z0-9_]+|bearer\s+[A-Za-z0-9._-]+|eyJ[A-Za-z0-9_-]{20,})/i;

function containsForbiddenValue(value: unknown): boolean {
  if (typeof value === 'string') return forbiddenLifecycleValuePattern.test(value);
  if (Array.isArray(value)) return value.some(containsForbiddenValue);
  if (value && typeof value === 'object') return Object.values(value).some(containsForbiddenValue);
  return false;
}

function count(value: unknown) {
  const numberValue = Number(value);
  return Math.max(0, Math.trunc(Number.isFinite(numberValue) ? numberValue : 0));
}

function text(value: unknown, fallback: string) {
  return typeof value === 'string' && value.trim().length > 0 ? value : fallback;
}

function parseModelDeliveryPolicy(value: unknown): ModelDeliveryPolicy {
  const parsed = ModelDeliveryPolicySchema.safeParse(value);
  if (parsed.success) return parsed.data;

  return {
    native: {
      deliveryMode: 'platform-provider-bundled',
    },
    schemaVersion: modelDeliveryPolicySchemaVersion,
    web: {
      downloadStrategy: 'precache-on-install',
      integrity: 'sha256-manifest',
      offlineUse: 'requires-cached-assets',
      userAction: 'warm-model-control',
    },
  };
}

function hasVerifiedCheck(report: { checks?: Array<{ key?: unknown; status?: unknown }> } | undefined, key: string) {
  return Boolean(report?.checks?.some((check) => check.key === key && check.status === 'verified'));
}

function webDownloadTrigger(strategy: z.infer<typeof ModelDownloadStrategySchema>) {
  if (strategy === 'precache-on-install') {
    return 'The model is vendored during build, then the service worker downloads same-origin model assets on first online install or explicit warmup.';
  }
  if (strategy === 'warmup-only') {
    return 'The model is vendored during build, then the browser downloads same-origin model assets only when the Warm model action or analysis path requests them.';
  }
  return 'The model is vendored during build, then the browser downloads same-origin model assets lazily when local video analysis starts.';
}

function updateTriggerFor({
  contentAddressedCache,
  nativeRuntime,
}: {
  contentAddressedCache: boolean;
  nativeRuntime: boolean;
}) {
  if (nativeRuntime) return 'Model updates ship with native app releases and provider-bundle updates.';
  if (contentAddressedCache) {
    return 'Model updates ship with a new static deploy; the content-addressed service-worker cache version invalidates old app and model assets.';
  }
  return 'Model updates require a new static export and PWA readiness proof before automatic cache invalidation can be claimed.';
}

function stage({
  detail,
  key,
  label,
  nextAction,
  status,
}: {
  detail: string;
  key: ModelDeliveryLifecycleStage['key'];
  label: string;
  nextAction: string;
  status: ModelDeliveryLifecycleStatus;
}) {
  return ModelDeliveryLifecycleStageSchema.parse({ detail, key, label, nextAction, status });
}

function summaryStatus(stages: ModelDeliveryLifecycleStage[]): ModelDeliveryLifecycleStatus {
  if (stages.some((item) => item.status === 'blocked')) return 'blocked';
  if (stages.some((item) => item.status === 'action')) return 'action';
  return 'ready';
}

export function assertModelDeliveryLifecycleIsShareSafe(lifecycle: ModelDeliveryLifecycle) {
  if (containsForbiddenValue(lifecycle)) {
    throw new Error('Model delivery lifecycle contains credential values, local paths, raw artifacts, raw video references, or token-like data.');
  }
  return lifecycle;
}

export function buildModelDeliveryLifecycle({
  generatedAt = new Date().toISOString(),
  modelDeliveryPolicy,
  pwaReadinessReport,
  pwaRuntimeReadiness,
  runtime = pwaRuntimeReadiness?.summary.status === 'native' ? 'native' : 'web',
  staticAssetsReport,
  webSmokeReport,
}: {
  generatedAt?: string;
  modelDeliveryPolicy?: unknown;
  pwaReadinessReport?: PwaReadinessReport;
  pwaRuntimeReadiness?: PwaRuntimeReadiness;
  runtime?: 'native' | 'web';
  staticAssetsReport?: StaticModelAssetReport;
  webSmokeReport?: WebSmokeReport;
}): ModelDeliveryLifecycle {
  const deliveryPolicy = parseModelDeliveryPolicy(modelDeliveryPolicy);
  const downloadStrategy = deliveryPolicy.web.downloadStrategy;
  const staticSummary = staticAssetsReport?.summary;
  const modelName = text(staticAssetsReport?.modelName, 'MoveNet SinglePose Lightning');
  const modelUrl = text(staticAssetsReport?.modelUrl, '/models/movenet/singlepose/lightning/4/model.json');
  const assetCount = count(
    staticSummary?.assetCount ??
      staticSummary?.sourceAssetCount ??
      staticSummary?.distAssetCount ??
      staticSummary?.exportedAssetCount ??
      staticSummary?.shardCount,
  );
  const totalBytes = count(staticSummary?.totalBytes);
  const staticReady = staticSummary?.status === 'ready' && modelUrl.startsWith('/models/') && totalBytes > 0;
  const pwaReady =
    pwaReadinessReport?.summary?.status === 'ready' &&
    count(pwaReadinessReport.summary.verifiedCount) > 0 &&
    count(pwaReadinessReport.summary.verifiedCount) === count(pwaReadinessReport.summary.checkCount);
  const webSmokeReady =
    webSmokeReport?.status === 'pass' &&
    webSmokeReport.summary?.status === 'pass' &&
    count(webSmokeReport.summary.passedChecks) > 0 &&
    count(webSmokeReport.summary.passedChecks) === count(webSmokeReport.summary.totalChecks);
  const nativeRuntime = runtime === 'native';
  const cacheReady = nativeRuntime || Boolean(pwaRuntimeReadiness?.summary.modelCacheReady);
  const updateAvailable = !nativeRuntime && Boolean(pwaRuntimeReadiness?.summary.updateAvailable);
  const contentAddressedCache =
    nativeRuntime ||
    (hasVerifiedCheck(pwaReadinessReport, 'content-addressed-cache-version') &&
      hasVerifiedCheck(staticAssetsReport, 'manifest-asset-list'));
  const deliveryPathVerified = nativeRuntime || cacheReady || (staticReady && (pwaReady || webSmokeReady));
  const expectedCacheAssets = pwaRuntimeReadiness?.summary.modelAssetsExpected ?? assetCount;
  const cachedAssets = pwaRuntimeReadiness?.summary.modelAssetsCached ?? 0;
  const integrityVerified = nativeRuntime || Boolean(pwaRuntimeReadiness?.summary.modelIntegrityVerified);
  const integritySupported = Boolean(pwaRuntimeReadiness?.summary.modelIntegritySupported);
  const firstUseRequiresNetwork = !nativeRuntime && !cacheReady;

  const stages = [
    stage({
      detail: staticReady
        ? `${modelName} is vendored as same-origin static assets before release.`
        : 'Static model assets are not ready for same-origin delivery.',
      key: 'build-vendoring',
      label: 'Build-time vendoring',
      nextAction: staticReady ? 'Refresh assets only when the model version changes.' : 'Run npm run model:movenet:assets:download and npm run model:movenet:assets:check.',
      status: staticReady ? 'ready' : 'blocked',
    }),
    stage({
      detail: nativeRuntime
        ? 'Native builds receive model assets through the app package or native provider bundle.'
        : staticReady
          ? `The exported app serves ${modelUrl} and weight shards from the app origin.`
          : 'The app package cannot safely claim static model delivery yet.',
      key: 'app-delivery',
      label: 'App delivery',
      nextAction: nativeRuntime ? 'Keep native provider assets tied to app versioning.' : 'Deploy the exported PWA after static asset checks pass.',
      status: staticReady || nativeRuntime ? 'ready' : 'blocked',
    }),
    stage({
      detail: nativeRuntime
        ? 'Model updates are coupled to native app releases and provider bundle changes.'
        : contentAddressedCache
          ? 'Service-worker cache versioning is derived from app shell, metadata, exported assets, and static model assets.'
          : staticReady
            ? 'Static model assets are versioned, but exported service-worker cache invalidation still needs PWA readiness evidence.'
            : 'Model update handling cannot be claimed until static model assets are ready.',
      key: 'asset-versioning',
      label: 'Asset versioning',
      nextAction: nativeRuntime
        ? 'Keep native model/provider changes tied to app release notes and physical-device QA.'
        : updateAvailable
          ? 'Refresh the PWA to activate the waiting service worker before offline analysis.'
          : contentAddressedCache
            ? 'Rerun export, PWA check, and web smoke whenever the model graph or weight shards change.'
            : staticReady
              ? 'Run npm run export:web and npm run web:pwa:check to verify content-addressed cache invalidation.'
              : 'Run npm run model:movenet:assets:download before export.',
      status: nativeRuntime || contentAddressedCache ? (updateAvailable ? 'action' : 'ready') : staticReady ? 'action' : 'blocked',
    }),
    stage({
      detail: nativeRuntime
        ? 'No browser warmup is required for native distribution.'
        : cacheReady
          ? `Cache Storage has ${cachedAssets}/${expectedCacheAssets} model asset(s) available.`
          : deliveryPathVerified
            ? 'The exported PWA delivery path verifies service-worker model caching; each installed browser still downloads assets on first online launch or explicit warmup.'
          : downloadStrategy === 'precache-on-install'
            ? 'The service worker fetches model-assets.json and listed /models assets during first online install; Warm model can refresh the cache explicitly.'
            : downloadStrategy === 'warmup-only'
              ? 'The browser waits for the explicit Warm model action or the analysis path before fetching model-assets.json and listed /models assets.'
              : 'The browser waits until local video analysis starts before fetching model-assets.json and listed /models assets.',
      key: 'first-online-launch',
      label: 'First online launch',
      nextAction: nativeRuntime
        ? 'Install the native build through the configured release channel.'
        : cacheReady
          ? 'Keep the warmup action available for cache refresh after deploys.'
          : deliveryPathVerified
            ? 'Keep web smoke and PWA readiness evidence fresh after model or service-worker changes.'
          : downloadStrategy === 'precache-on-install'
            ? 'Open the PWA online once or use Warm model before going offline.'
            : 'Use Warm model online before going offline.',
      status: nativeRuntime || cacheReady || deliveryPathVerified ? 'ready' : 'action',
    }),
    stage({
      detail: nativeRuntime
        ? 'Native offline analysis reuses packaged provider assets.'
        : cacheReady && (!integritySupported || integrityVerified)
          ? integrityVerified
            ? 'Offline reuse is ready with SHA-256 verified cached model assets.'
            : 'Offline reuse is ready from Cache Storage; integrity verification is not available in this browser.'
          : deliveryPathVerified
            ? 'Offline reuse is verified as an app delivery path; each browser must warm and keep model assets cached before offline analysis.'
          : 'Offline analysis should wait until every model asset is cached and integrity checks pass when supported.',
      key: 'offline-reuse',
      label: 'Offline reuse',
      nextAction: nativeRuntime
        ? 'Verify native offline analysis during physical-device QA.'
        : cacheReady && (!integritySupported || integrityVerified)
          ? 'Run one offline relaunch smoke before a gym session.'
          : deliveryPathVerified
            ? 'Warm the model cache online on each target browser before offline gym use.'
          : 'Warm and verify the model cache online before offline analysis.',
      status: nativeRuntime || (cacheReady && (!integritySupported || integrityVerified)) || deliveryPathVerified ? 'ready' : 'action',
    }),
  ];
  const status = summaryStatus(stages);
  const nextAction =
    stages.find((item) => item.status !== 'ready')?.nextAction ??
    (!nativeRuntime && deliveryPathVerified && !cacheReady
      ? 'Model delivery path is verified; warm the model cache on each target browser before offline gym use.'
      : 'Model delivery is ready from build-time vendoring through offline reuse.');

  const lifecycle = ModelDeliveryLifecycleSchema.parse({
    generatedAt,
    model: {
      assetCount,
      modelUrl,
      name: modelName,
      totalBytes,
    },
    privacy: {
      credentialValuesIncluded: false,
      localPathsIncluded: false,
      rawArtifactsIncluded: false,
      rawVideoIncluded: false,
      tokenLikeValuesIncluded: false,
    },
    schemaVersion: modelDeliveryLifecycleSchemaVersion,
    stages,
    summary: {
      cacheReady,
      contentAddressedCache,
      deliveryPathVerified,
      deliveryMode: nativeRuntime ? 'native-bundled' : 'same-origin-static',
      downloadStrategy,
      downloadTrigger: nativeRuntime
        ? 'The model is delivered with the native build; updates arrive with app releases.'
        : webDownloadTrigger(downloadStrategy),
      firstUseRequiresNetwork,
      nextAction,
      status,
      updateAvailable,
      updateTrigger: updateTriggerFor({ contentAddressedCache, nativeRuntime }),
    },
  });

  return assertModelDeliveryLifecycleIsShareSafe(lifecycle);
}
