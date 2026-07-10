import { Platform } from 'react-native';

import { appConfig } from './config';
import { buildPwaModelCacheWarmupResult, type PwaModelCacheWarmupResult } from './pwaModelCacheWarmup';
import type { PwaRuntimeProbe } from './pwaRuntimeReadiness';
import { buildPwaUpdateActivationResult, type PwaUpdateActivationResult } from './pwaUpdateActivation';

export const pwaModelWarmupCacheName = 'movebeta-pwa-model-cache-warmup-v1';

export type BeforeInstallPromptEventLike = Event & {
  prompt?: () => Promise<void>;
  userChoice?: Promise<{ outcome?: string }>;
};

export type BrowserModelCacheState = NonNullable<PwaRuntimeProbe['modelCache']>;

type BrowserModelAssetFile = {
  bytes?: number;
  path: string;
  sha256?: string;
};

type BrowserModelCacheVerification = {
  assetsVerified: number;
  bytesCached: number;
  integritySupported: boolean;
};

export function emptyModelCacheState(): BrowserModelCacheState {
  return {
    bytesCached: 0,
    cachedCount: 0,
    expectedCount: 0,
    integritySupported: false,
    integrityVerified: false,
    manifestCached: false,
    verifiedCount: 0,
  };
}

export function nativePwaProbe(): PwaRuntimeProbe {
  return {
    cacheApiSupported: false,
    installPromptAvailable: false,
    installedStandalone: false,
    modelCache: emptyModelCacheState(),
    online: true,
    runtime: 'native',
    serviceWorkerControlled: false,
    serviceWorkerRegistered: false,
    serviceWorkerSupported: false,
    updateAvailable: false,
  };
}

export function browserPwaProbe(patch: Partial<PwaRuntimeProbe> = {}): PwaRuntimeProbe {
  if (Platform.OS !== 'web' || typeof window === 'undefined' || typeof navigator === 'undefined') {
    return nativePwaProbe();
  }

  const navigatorWithStandalone = navigator as Navigator & { standalone?: boolean };
  const serviceWorkerContainer = navigator.serviceWorker;

  return {
    cacheApiSupported: 'caches' in window,
    installPromptAvailable: false,
    installedStandalone:
      window.matchMedia?.('(display-mode: standalone)')?.matches === true || navigatorWithStandalone.standalone === true,
    modelCache: emptyModelCacheState(),
    online: navigator.onLine !== false,
    runtime: 'web',
    serviceWorkerControlled: Boolean(serviceWorkerContainer?.controller),
    serviceWorkerRegistered: false,
    serviceWorkerSupported: 'serviceWorker' in navigator,
    updateAvailable: false,
    ...patch,
  };
}

export function sameOriginModelAssets(manifest: unknown): string[] {
  const assets = (manifest as { assets?: unknown[] } | undefined)?.assets;
  return Array.isArray(assets)
    ? assets.filter((asset): asset is string => typeof asset === 'string' && asset.startsWith('/models/'))
    : [];
}

function sameOriginModelAssetFiles(manifest: unknown): BrowserModelAssetFile[] {
  const files = (manifest as { files?: unknown[] } | undefined)?.files;
  return Array.isArray(files)
    ? files.flatMap((file) => {
        const asset = file as Partial<BrowserModelAssetFile> | undefined;
        if (!asset || typeof asset.path !== 'string' || !asset.path.startsWith('/models/')) return [];
        return [
          {
            bytes: typeof asset.bytes === 'number' && Number.isFinite(asset.bytes) ? asset.bytes : undefined,
            path: asset.path,
            sha256: typeof asset.sha256 === 'string' ? asset.sha256.toLowerCase() : undefined,
          },
        ];
      })
    : [];
}

function digestToHex(buffer: ArrayBuffer) {
  return Array.from(new Uint8Array(buffer))
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('');
}

async function readBrowserModelAssetManifest() {
  const matchesConfiguredModel = (manifest: unknown) =>
    (manifest as { modelUrl?: unknown } | undefined)?.modelUrl === appConfig.tfjsMoveNetModelUrl;

  if (navigator.onLine !== false) {
    const response = await fetch('/model-assets.json', { cache: 'no-store' }).catch(() => undefined);
    if (response?.ok) {
      const manifest = await response.json().catch(() => undefined);
      if (matchesConfiguredModel(manifest)) return manifest;
    }
  }

  const cached = await window.caches?.match?.('/model-assets.json');
  if (!cached?.ok) return undefined;
  const manifest = await cached.json().catch(() => undefined);
  return matchesConfiguredModel(manifest) ? manifest : undefined;
}

export async function resolveBrowserModelCacheState(): Promise<BrowserModelCacheState> {
  if (Platform.OS !== 'web' || typeof window === 'undefined' || typeof navigator === 'undefined' || !('caches' in window)) {
    return emptyModelCacheState();
  }

  const manifest = await readBrowserModelAssetManifest();
  const modelAssets = sameOriginModelAssets(manifest);
  const cachedManifest = await window.caches.match('/model-assets.json');
  const cachedAssets = await Promise.all(modelAssets.map((asset) => window.caches.match(asset)));
  const verification = await verifyCachedBrowserModelAssets(manifest);

  return {
    bytesCached: verification.bytesCached,
    cachedCount: cachedAssets.filter(Boolean).length,
    expectedCount: modelAssets.length,
    integritySupported: verification.integritySupported,
    integrityVerified: verification.integritySupported && modelAssets.length > 0 && verification.assetsVerified >= modelAssets.length,
    manifestCached: Boolean(cachedManifest && manifest),
    verifiedCount: verification.assetsVerified,
  };
}

async function verifyCachedBrowserModelAssets(manifest: unknown): Promise<BrowserModelCacheVerification> {
  if (Platform.OS !== 'web' || typeof window === 'undefined' || !('caches' in window)) {
    return { assetsVerified: 0, bytesCached: 0, integritySupported: false };
  }

  const modelFiles = sameOriginModelAssetFiles(manifest);
  const integritySupported = typeof window.crypto?.subtle?.digest === 'function';
  let assetsVerified = 0;
  let bytesCached = 0;

  await Promise.all(
    modelFiles.map(async (file) => {
      const result = await verifyCachedBrowserModelAsset(file, integritySupported);
      bytesCached += result.bytes;
      if (result.verified) assetsVerified += 1;
    }),
  );

  return { assetsVerified, bytesCached, integritySupported };
}

async function verifyCachedBrowserModelAsset(file: BrowserModelAssetFile, integritySupported: boolean) {
  const cached = await window.caches.match(file.path);
  if (!cached?.ok) return { bytes: 0, verified: false };

  const buffer = await cached.arrayBuffer().catch(() => undefined);
  if (!buffer) return { bytes: 0, verified: false };
  if (!integritySupported || !file.sha256) return { bytes: buffer.byteLength, verified: false };

  const digest = await window.crypto.subtle.digest('SHA-256', buffer);
  const byteCountMatches = typeof file.bytes === 'number' ? buffer.byteLength === file.bytes : true;
  return {
    bytes: buffer.byteLength,
    verified: byteCountMatches && digestToHex(digest) === file.sha256,
  };
}

async function deleteBrowserAssetFromEveryCache(asset: string) {
  if (typeof window.caches.keys !== 'function') return;
  const cacheNames = await window.caches.keys().catch(() => [] as string[]);
  await Promise.all(
    cacheNames.map(async (cacheName) => {
      const cache = await window.caches.open(cacheName);
      await cache.delete(asset).catch(() => false);
    }),
  );
}

export async function warmBrowserPwaModelCache(): Promise<PwaModelCacheWarmupResult> {
  if (Platform.OS !== 'web' || typeof window === 'undefined' || typeof navigator === 'undefined' || !('caches' in window)) {
    return buildPwaModelCacheWarmupResult({
      assetsCached: 0,
      assetsExpected: 0,
      cacheApiSupported: false,
      manifestCached: false,
      online: true,
    });
  }

  const cache = await window.caches.open(pwaModelWarmupCacheName);
  let manifest = await readBrowserModelAssetManifest();

  if (navigator.onLine !== false) {
    const response = await fetch('/model-assets.json', { cache: 'no-store' }).catch(() => undefined);
    if (response?.ok) {
      await cache.put('/model-assets.json', response.clone());
      manifest = await response.clone().json().catch(() => manifest);
    }
  }

  const modelAssets = sameOriginModelAssets(manifest);
  const modelFiles = new Map(sameOriginModelAssetFiles(manifest).map((file) => [file.path, file]));
  const integritySupported = typeof window.crypto?.subtle?.digest === 'function';
  await Promise.all(
    modelAssets.map(async (asset) => {
      const cached = await window.caches.match(asset);
      const expectedFile = modelFiles.get(asset);
      if (cached && expectedFile) {
        const verification = await verifyCachedBrowserModelAsset(expectedFile, integritySupported);
        if (verification.verified) return;
        await deleteBrowserAssetFromEveryCache(asset);
      } else if (cached) {
        return;
      }
      const response = await fetch(asset, { cache: 'no-store' }).catch(() => undefined);
      if (response?.ok) {
        await cache.put(asset, response.clone());
      }
    }),
  );

  const modelCache = await resolveBrowserModelCacheState();
  return buildPwaModelCacheWarmupResult({
    assetsCached: modelCache.cachedCount,
    assetsExpected: modelCache.expectedCount,
    assetsVerified: modelCache.verifiedCount,
    bytesCached: modelCache.bytesCached,
    cacheApiSupported: true,
    integritySupported: modelCache.integritySupported,
    manifestCached: modelCache.manifestCached,
    online: navigator.onLine !== false,
  });
}

function waitForControllerChange(timeoutMs = 1200): Promise<boolean> {
  if (typeof navigator === 'undefined' || !navigator.serviceWorker?.addEventListener) return Promise.resolve(false);

  return new Promise((resolve) => {
    const timer = window.setTimeout(() => {
      navigator.serviceWorker.removeEventListener('controllerchange', handleControllerChange);
      resolve(false);
    }, timeoutMs);
    const handleControllerChange = () => {
      window.clearTimeout(timer);
      navigator.serviceWorker.removeEventListener('controllerchange', handleControllerChange);
      resolve(true);
    };

    navigator.serviceWorker.addEventListener('controllerchange', handleControllerChange);
  });
}

export async function activateBrowserPwaUpdate(): Promise<PwaUpdateActivationResult> {
  if (Platform.OS !== 'web' || typeof window === 'undefined' || typeof navigator === 'undefined' || !('serviceWorker' in navigator)) {
    return buildPwaUpdateActivationResult({
      serviceWorkerSupported: false,
      status: 'unsupported',
      updateAvailableBefore: false,
      updateStillWaiting: false,
    });
  }

  const registration = await navigator.serviceWorker.getRegistration?.();
  const waiting = registration?.waiting;
  const installing = registration?.installing;
  const updateAvailableBefore = Boolean(waiting || installing);

  if (!waiting && !installing) {
    return buildPwaUpdateActivationResult({
      serviceWorkerSupported: true,
      status: 'not-needed',
      updateAvailableBefore,
      updateStillWaiting: false,
    });
  }

  if (waiting) {
    waiting.postMessage({ type: 'MOVEBETA_SKIP_WAITING' });
    const activated = await waitForControllerChange();
    const refreshedRegistration = await navigator.serviceWorker.getRegistration?.();

    return buildPwaUpdateActivationResult({
      serviceWorkerSupported: true,
      status: activated || !refreshedRegistration?.waiting ? 'activated' : 'requested',
      updateAvailableBefore,
      updateStillWaiting: Boolean(refreshedRegistration?.waiting || refreshedRegistration?.installing),
    });
  }

  return buildPwaUpdateActivationResult({
    serviceWorkerSupported: true,
    status: 'requested',
    updateAvailableBefore,
    updateStillWaiting: true,
  });
}
