import { z } from 'zod';

import { type PwaRuntimeReadiness } from './pwaRuntimeReadiness';

export const modelDeliveryLifecycleSchemaVersion = 'movebeta.model-delivery-lifecycle.v1';

const ModelDeliveryLifecycleStatusSchema = z.enum(['action', 'blocked', 'ready']);
const ModelDeliveryLifecycleStageKeySchema = z.enum([
  'build-vendoring',
  'app-delivery',
  'first-online-launch',
  'offline-reuse',
]);

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
  stages: z.array(ModelDeliveryLifecycleStageSchema).length(4),
  summary: z.object({
    cacheReady: z.boolean(),
    deliveryMode: z.enum(['native-bundled', 'same-origin-static']),
    downloadTrigger: z.string().min(1),
    firstUseRequiresNetwork: z.boolean(),
    nextAction: z.string().min(1),
    status: ModelDeliveryLifecycleStatusSchema,
  }),
});

export type ModelDeliveryLifecycle = z.infer<typeof ModelDeliveryLifecycleSchema>;
export type ModelDeliveryLifecycleStatus = z.infer<typeof ModelDeliveryLifecycleStatusSchema>;
export type ModelDeliveryLifecycleStage = z.infer<typeof ModelDeliveryLifecycleStageSchema>;

type StaticModelAssetReport = {
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
  pwaRuntimeReadiness,
  runtime = pwaRuntimeReadiness?.summary.status === 'native' ? 'native' : 'web',
  staticAssetsReport,
}: {
  generatedAt?: string;
  pwaRuntimeReadiness?: PwaRuntimeReadiness;
  runtime?: 'native' | 'web';
  staticAssetsReport?: StaticModelAssetReport;
}): ModelDeliveryLifecycle {
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
  const nativeRuntime = runtime === 'native';
  const cacheReady = nativeRuntime || Boolean(pwaRuntimeReadiness?.summary.modelCacheReady);
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
        ? 'No browser warmup is required for native distribution.'
        : cacheReady
          ? `Cache Storage has ${cachedAssets}/${expectedCacheAssets} model asset(s) available.`
          : 'The browser fetches model-assets.json and listed /models assets on first online launch or explicit warmup.',
      key: 'first-online-launch',
      label: 'First online launch',
      nextAction: nativeRuntime
        ? 'Install the native build through the configured release channel.'
        : cacheReady
          ? 'Keep the warmup action available for cache refresh after deploys.'
          : 'Open the PWA online once or use Warm model before going offline.',
      status: nativeRuntime || cacheReady ? 'ready' : 'action',
    }),
    stage({
      detail: nativeRuntime
        ? 'Native offline analysis reuses packaged provider assets.'
        : cacheReady && (!integritySupported || integrityVerified)
          ? integrityVerified
            ? 'Offline reuse is ready with SHA-256 verified cached model assets.'
            : 'Offline reuse is ready from Cache Storage; integrity verification is not available in this browser.'
          : 'Offline analysis should wait until every model asset is cached and integrity checks pass when supported.',
      key: 'offline-reuse',
      label: 'Offline reuse',
      nextAction: nativeRuntime
        ? 'Verify native offline analysis during physical-device QA.'
        : cacheReady && (!integritySupported || integrityVerified)
          ? 'Run one offline relaunch smoke before a gym session.'
          : 'Warm and verify the model cache online before offline analysis.',
      status: nativeRuntime || (cacheReady && (!integritySupported || integrityVerified)) ? 'ready' : 'action',
    }),
  ];
  const status = summaryStatus(stages);
  const nextAction = stages.find((item) => item.status !== 'ready')?.nextAction ?? 'Model delivery is ready from build-time vendoring through offline reuse.';

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
      deliveryMode: nativeRuntime ? 'native-bundled' : 'same-origin-static',
      downloadTrigger: nativeRuntime
        ? 'The model is delivered with the native build; updates arrive with app releases.'
        : 'The model is vendored during build, then the browser downloads same-origin model assets on first online launch, service-worker install, or explicit warmup.',
      firstUseRequiresNetwork,
      nextAction,
      status,
    },
  });

  return assertModelDeliveryLifecycleIsShareSafe(lifecycle);
}
