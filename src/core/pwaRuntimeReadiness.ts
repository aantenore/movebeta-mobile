import { z } from 'zod';

export const pwaRuntimeReadinessSchemaVersion = 'movebeta.pwa-runtime-readiness.v1';

const PwaRuntimeStatusSchema = z.enum(['installable', 'installed', 'native', 'runtime-ready', 'unsupported']);
const PwaRuntimeCheckStatusSchema = z.enum(['action', 'blocked', 'ready']);
const PwaRuntimeKindSchema = z.enum(['native', 'web']);

export type PwaRuntimeStatus = z.infer<typeof PwaRuntimeStatusSchema>;
export type PwaRuntimeCheckStatus = z.infer<typeof PwaRuntimeCheckStatusSchema>;
export type PwaRuntimeKind = z.infer<typeof PwaRuntimeKindSchema>;

export type PwaRuntimeProbe = {
  cacheApiSupported: boolean;
  installPromptAvailable: boolean;
  installedStandalone: boolean;
  modelCache?: {
    cachedCount: number;
    expectedCount: number;
    manifestCached: boolean;
  };
  online: boolean;
  runtime: PwaRuntimeKind;
  serviceWorkerControlled: boolean;
  serviceWorkerRegistered: boolean;
  serviceWorkerSupported: boolean;
  updateAvailable: boolean;
};

export const PwaRuntimeReadinessCheckSchema = z.object({
  action: z.string(),
  detail: z.string(),
  key: z.string().regex(/^[a-z][a-z0-9-]*$/),
  label: z.string(),
  status: PwaRuntimeCheckStatusSchema,
});

export const PwaRuntimeReadinessSchema = z.object({
  checks: z.array(PwaRuntimeReadinessCheckSchema).min(1),
  privacy: z.object({
    credentialValuesIncluded: z.literal(false),
    localPathsIncluded: z.literal(false),
    rawArtifactsIncluded: z.literal(false),
    rawVideoIncluded: z.literal(false),
    tokenLikeValuesIncluded: z.literal(false),
  }),
  schemaVersion: z.literal(pwaRuntimeReadinessSchemaVersion),
  summary: z.object({
    installPromptAvailable: z.boolean(),
    installedStandalone: z.boolean(),
    modelAssetsCached: z.number().int().nonnegative(),
    modelAssetsExpected: z.number().int().nonnegative(),
    modelCacheReady: z.boolean(),
    nextAction: z.string(),
    offlineReady: z.boolean(),
    status: PwaRuntimeStatusSchema,
    updateAvailable: z.boolean(),
  }),
});

export type PwaRuntimeReadiness = z.infer<typeof PwaRuntimeReadinessSchema>;

export const PwaInstallGuidancePacketSchema = z.object({
  actions: z.array(z.string()).min(1),
  privacy: PwaRuntimeReadinessSchema.shape.privacy,
  readiness: PwaRuntimeReadinessSchema,
  schemaVersion: z.literal(pwaRuntimeReadinessSchemaVersion),
  summary: z.object({
    nextAction: z.string(),
    status: PwaRuntimeStatusSchema,
  }),
});

export type PwaInstallGuidancePacket = z.infer<typeof PwaInstallGuidancePacketSchema>;

const forbiddenPacketValuePattern =
  /(file:\/\/|content:\/\/|asset:\/\/|ph:\/\/|\/Users\/|\/private\/|\/var\/mobile\/|[A-Za-z]:\\|\.mov\b|\.mp4\b|BEGIN PRIVATE KEY|ghp_[A-Za-z0-9_]+|github_pat_[A-Za-z0-9_]+|pat_[A-Za-z0-9_]+|sk_live_[A-Za-z0-9_]+|sk_test_[A-Za-z0-9_]+|bearer\s+[A-Za-z0-9._-]+|eyJ[A-Za-z0-9_-]{20,})/i;

function containsForbiddenValue(value: unknown): boolean {
  if (typeof value === 'string') return forbiddenPacketValuePattern.test(value);
  if (Array.isArray(value)) return value.some(containsForbiddenValue);
  if (value && typeof value === 'object') return Object.values(value).some(containsForbiddenValue);
  return false;
}

function check({
  action,
  detail,
  key,
  label,
  status,
}: {
  action: string;
  detail: string;
  key: string;
  label: string;
  status: PwaRuntimeCheckStatus;
}) {
  return PwaRuntimeReadinessCheckSchema.parse({ action, detail, key, label, status });
}

function offlineReady(probe: PwaRuntimeProbe) {
  const cache = modelCacheState(probe);
  return browserCacheRuntimeReady(probe) && cache.ready;
}

function modelCacheState(probe: PwaRuntimeProbe) {
  const cachedCount = Math.max(0, Math.trunc(Number(probe.modelCache?.cachedCount ?? 0)));
  const expectedCount = Math.max(0, Math.trunc(Number(probe.modelCache?.expectedCount ?? 0)));
  const manifestCached = Boolean(probe.modelCache?.manifestCached);

  return {
    cachedCount,
    expectedCount,
    manifestCached,
    ready: expectedCount > 0 && manifestCached && cachedCount >= expectedCount,
  };
}

function browserCacheRuntimeReady(probe: PwaRuntimeProbe) {
  return (
    probe.runtime === 'web' &&
    probe.cacheApiSupported &&
    probe.serviceWorkerSupported &&
    (probe.serviceWorkerControlled || probe.serviceWorkerRegistered)
  );
}

function summaryStatus(probe: PwaRuntimeProbe, hasBlockedChecks: boolean): PwaRuntimeStatus {
  if (probe.runtime === 'native') return 'native';
  if (probe.installedStandalone) return 'installed';
  if (hasBlockedChecks) return 'unsupported';
  if (probe.installPromptAvailable) return 'installable';
  return 'runtime-ready';
}

function nextActionFor(status: PwaRuntimeStatus, updateAvailable: boolean) {
  if (updateAvailable) return 'Refresh the PWA to activate the waiting service worker update.';
  if (status === 'installed') return 'Open MoveBeta from the installed app surface for the standalone experience.';
  if (status === 'installable') return 'Use the Install app action to add MoveBeta to the device home screen or app launcher.';
  if (status === 'runtime-ready') return 'Use the browser install control if available; the static PWA runtime is ready.';
  if (status === 'native') return 'Use the native store or internal build path for device installation.';
  return 'Open the exported PWA in a browser with service worker and Cache API support.';
}

export function assertPwaInstallGuidancePacketIsShareSafe(packet: PwaInstallGuidancePacket) {
  if (containsForbiddenValue(packet)) {
    throw new Error('PWA install guidance packet contains credential values, local paths, raw artifacts, raw video references, or token-like data.');
  }
  return packet;
}

export function buildPwaRuntimeReadiness(probe: PwaRuntimeProbe): PwaRuntimeReadiness {
  const runtime = PwaRuntimeKindSchema.parse(probe.runtime);
  const nativeRuntime = runtime === 'native';
  const modelCache = modelCacheState(probe);
  const browserRuntimeReady = browserCacheRuntimeReady({ ...probe, runtime });
  const nextOfflineReady = offlineReady(probe);
  const checks = [
    check({
      action: nativeRuntime
        ? 'Install native builds through the store, TestFlight, Play internal testing, or EAS internal distribution.'
        : probe.installedStandalone
          ? 'Keep using the standalone installed app surface.'
          : probe.installPromptAvailable
            ? 'Trigger the browser install prompt from the Install app action.'
            : 'Use the browser install menu when the install prompt is not exposed to the page.',
      detail: nativeRuntime
        ? 'Native runtimes use the mobile build distribution path instead of browser PWA installation.'
        : probe.installedStandalone
          ? 'MoveBeta is already running in standalone display mode.'
          : probe.installPromptAvailable
            ? 'The browser exposed beforeinstallprompt, so the app can start installation from the page.'
            : 'The page is not currently receiving beforeinstallprompt; supported browsers may still show install in browser UI.',
      key: 'install-surface',
      label: 'Install surface',
      status: nativeRuntime || probe.installedStandalone ? 'ready' : probe.installPromptAvailable ? 'action' : 'action',
    }),
    check({
      action: nativeRuntime
        ? 'Use native bundle caching and local report storage.'
        : probe.serviceWorkerSupported
          ? 'Reload once after first visit if the current page is not yet controlled by the service worker.'
          : 'Use a browser with service worker support before claiming installable offline readiness.',
      detail: nativeRuntime
        ? 'Native app shells do not use the browser service worker lifecycle.'
        : probe.serviceWorkerControlled
          ? 'The current page is controlled by the registered service worker.'
          : probe.serviceWorkerRegistered
            ? 'A service worker registration exists; the current page may need one reload to become controlled.'
            : probe.serviceWorkerSupported
              ? 'Service workers are supported, but no registration was observed yet.'
              : 'Service workers are not supported in this runtime.',
      key: 'service-worker',
      label: 'Service worker',
      status: nativeRuntime || probe.serviceWorkerControlled || probe.serviceWorkerRegistered ? 'ready' : probe.serviceWorkerSupported ? 'action' : 'blocked',
    }),
    check({
      action: nativeRuntime
        ? 'Use local native storage and bundled assets for offline review.'
        : nextOfflineReady
          ? 'Keep manifest, service worker, app shell, and model assets in the exported dist.'
          : 'Verify Cache API, service worker registration, and model cache readiness before relying on offline launch.',
      detail: nativeRuntime
        ? 'Offline support is handled by native bundles and local storage.'
        : nextOfflineReady
          ? 'Cache API, service worker registration, and model assets are available for static offline startup.'
          : browserRuntimeReady
            ? 'Cache API and service worker registration are ready, but the same-origin model cache still needs warming.'
          : probe.cacheApiSupported
            ? 'Cache API is available, but the service worker lifecycle is not ready yet.'
            : 'Cache API is not available in this runtime.',
      key: 'offline-cache',
      label: 'Offline cache',
      status: nativeRuntime || nextOfflineReady ? 'ready' : probe.cacheApiSupported ? 'action' : 'blocked',
    }),
    check({
      action: nativeRuntime
        ? 'Use the native pose-provider bundle or development client assets for model execution.'
        : modelCache.ready
          ? 'Keep /model-assets.json and every listed /models asset cached before offline gym use.'
          : probe.online
            ? 'Open the exported PWA online once so the service worker can cache the same-origin MoveNet assets.'
            : 'Reconnect once to warm the same-origin MoveNet model cache before offline analysis.',
      detail: nativeRuntime
        ? 'Native pose providers do not depend on browser Cache Storage.'
        : modelCache.ready
          ? `Cache Storage contains /model-assets.json and ${modelCache.cachedCount}/${modelCache.expectedCount} model asset(s).`
          : modelCache.expectedCount > 0
            ? `Cache Storage has ${modelCache.cachedCount}/${modelCache.expectedCount} model asset(s); manifest cached: ${modelCache.manifestCached ? 'yes' : 'no'}.`
            : 'No cached MoveNet model asset manifest was observed yet.',
      key: 'model-cache',
      label: 'Model cache',
      status: nativeRuntime || modelCache.ready ? 'ready' : probe.cacheApiSupported ? 'action' : 'blocked',
    }),
    check({
      action: probe.online ? 'Run deployed smoke while online, then verify offline relaunch after first load.' : 'Reconnect before fetching any uncached deployment assets.',
      detail: probe.online ? 'The browser reports network access for deployment smoke.' : 'The browser reports offline mode; cached surfaces can still be reviewed.',
      key: 'network-state',
      label: 'Network state',
      status: 'ready',
    }),
    check({
      action: probe.updateAvailable ? 'Refresh after saving local work to activate the waiting PWA update.' : 'No update activation is pending.',
      detail: probe.updateAvailable ? 'A waiting or installing service worker update was observed.' : 'No waiting service worker update is currently visible.',
      key: 'update-state',
      label: 'Update state',
      status: probe.updateAvailable ? 'action' : 'ready',
    }),
  ];
  const status = summaryStatus(
    {
      ...probe,
      runtime,
    },
    checks.some((item) => item.status === 'blocked'),
  );

  return PwaRuntimeReadinessSchema.parse({
    checks,
    privacy: {
      credentialValuesIncluded: false,
      localPathsIncluded: false,
      rawArtifactsIncluded: false,
      rawVideoIncluded: false,
      tokenLikeValuesIncluded: false,
    },
    schemaVersion: pwaRuntimeReadinessSchemaVersion,
    summary: {
      installPromptAvailable: probe.installPromptAvailable,
      installedStandalone: probe.installedStandalone,
      modelAssetsCached: nativeRuntime ? 0 : modelCache.cachedCount,
      modelAssetsExpected: nativeRuntime ? 0 : modelCache.expectedCount,
      modelCacheReady: nativeRuntime || modelCache.ready,
      nextAction: nextActionFor(status, probe.updateAvailable),
      offlineReady: nativeRuntime || nextOfflineReady,
      status,
      updateAvailable: probe.updateAvailable,
    },
  });
}

export function buildPwaInstallGuidancePacket(readiness: PwaRuntimeReadiness): PwaInstallGuidancePacket {
  const actions = [
    readiness.summary.nextAction,
    readiness.summary.installPromptAvailable
      ? 'Use the in-app Install app action when the browser prompt is available.'
      : 'Use the browser install menu when the prompt is not exposed to the page.',
    readiness.summary.offlineReady
      ? 'After first load, relaunch once from the installed app surface to verify offline startup.'
      : 'Reload after service worker registration before claiming offline startup.',
    readiness.summary.modelCacheReady
      ? 'The same-origin model cache is ready for offline analysis.'
      : 'Open once online before a gym session to warm the same-origin model cache.',
  ];
  const packet = PwaInstallGuidancePacketSchema.parse({
    actions,
    privacy: readiness.privacy,
    readiness,
    schemaVersion: pwaRuntimeReadinessSchemaVersion,
    summary: {
      nextAction: readiness.summary.nextAction,
      status: readiness.summary.status,
    },
  });

  return assertPwaInstallGuidancePacketIsShareSafe(packet);
}
