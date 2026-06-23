import { z } from 'zod';

export const pwaModelCacheWarmupSchemaVersion = 'movebeta.pwa-model-cache-warmup.v1';

const PwaModelCacheWarmupStatusSchema = z.enum(['partial', 'ready', 'unsupported']);

export type PwaModelCacheWarmupStatus = z.infer<typeof PwaModelCacheWarmupStatusSchema>;

export const PwaModelCacheWarmupResultSchema = z.object({
  actions: z.array(z.string()).min(1),
  generatedAt: z.string().datetime(),
  privacy: z.object({
    credentialValuesIncluded: z.literal(false),
    localPathsIncluded: z.literal(false),
    rawArtifactsIncluded: z.literal(false),
    rawVideoIncluded: z.literal(false),
    tokenLikeValuesIncluded: z.literal(false),
  }),
  schemaVersion: z.literal(pwaModelCacheWarmupSchemaVersion),
  summary: z.object({
    assetsCached: z.number().int().nonnegative(),
    assetsExpected: z.number().int().nonnegative(),
    cacheApiSupported: z.boolean(),
    manifestCached: z.boolean(),
    nextAction: z.string(),
    online: z.boolean(),
    status: PwaModelCacheWarmupStatusSchema,
  }),
});

export type PwaModelCacheWarmupResult = z.infer<typeof PwaModelCacheWarmupResultSchema>;

const forbiddenPacketValuePattern =
  /(file:\/\/|content:\/\/|asset:\/\/|ph:\/\/|\/Users\/|\/private\/|\/var\/mobile\/|[A-Za-z]:\\|\.mov\b|\.mp4\b|BEGIN PRIVATE KEY|ghp_[A-Za-z0-9_]+|github_pat_[A-Za-z0-9_]+|pat_[A-Za-z0-9_]+|sk_live_[A-Za-z0-9_]+|sk_test_[A-Za-z0-9_]+|bearer\s+[A-Za-z0-9._-]+|eyJ[A-Za-z0-9_-]{20,})/i;

function containsForbiddenValue(value: unknown): boolean {
  if (typeof value === 'string') return forbiddenPacketValuePattern.test(value);
  if (Array.isArray(value)) return value.some(containsForbiddenValue);
  if (value && typeof value === 'object') return Object.values(value).some(containsForbiddenValue);
  return false;
}

function count(value: number) {
  return Math.max(0, Math.trunc(Number.isFinite(value) ? value : 0));
}

export function assertPwaModelCacheWarmupResultIsShareSafe(result: PwaModelCacheWarmupResult) {
  if (containsForbiddenValue(result)) {
    throw new Error('PWA model cache warmup result contains credential values, local paths, raw artifacts, raw video references, or token-like data.');
  }
  return result;
}

export function buildPwaModelCacheWarmupResult({
  assetsCached,
  assetsExpected,
  cacheApiSupported,
  generatedAt = new Date().toISOString(),
  manifestCached,
  online,
}: {
  assetsCached: number;
  assetsExpected: number;
  cacheApiSupported: boolean;
  generatedAt?: string;
  manifestCached: boolean;
  online: boolean;
}) {
  const nextAssetsCached = count(assetsCached);
  const nextAssetsExpected = count(assetsExpected);
  const ready = cacheApiSupported && manifestCached && nextAssetsExpected > 0 && nextAssetsCached >= nextAssetsExpected;
  const status: PwaModelCacheWarmupStatus = !cacheApiSupported ? 'unsupported' : ready ? 'ready' : 'partial';
  const nextAction =
    status === 'ready'
      ? 'Use the installed PWA offline only after one successful relaunch smoke.'
      : status === 'unsupported'
        ? 'Use a browser with Cache Storage support before relying on offline model analysis.'
        : online
          ? 'Keep the PWA open online until the service worker and model cache complete.'
          : 'Reconnect once to fetch and cache the same-origin MoveNet assets.';

  const actions = [
    nextAction,
    status === 'ready'
      ? 'Model manifest and same-origin model assets are cached.'
      : 'Warm the model cache before recording or importing climbing video offline.',
  ];

  const result = PwaModelCacheWarmupResultSchema.parse({
    actions,
    generatedAt,
    privacy: {
      credentialValuesIncluded: false,
      localPathsIncluded: false,
      rawArtifactsIncluded: false,
      rawVideoIncluded: false,
      tokenLikeValuesIncluded: false,
    },
    schemaVersion: pwaModelCacheWarmupSchemaVersion,
    summary: {
      assetsCached: nextAssetsCached,
      assetsExpected: nextAssetsExpected,
      cacheApiSupported,
      manifestCached,
      nextAction,
      online,
      status,
    },
  });

  return assertPwaModelCacheWarmupResultIsShareSafe(result);
}
