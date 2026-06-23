const CACHE_PREFIX = 'movebeta-pwa';
const CACHE_VERSION = 'v1';
const CACHE_NAME = `${CACHE_PREFIX}-${CACHE_VERSION}`;
const APP_SHELL = ['/', '/index.html', '/manifest.json', '/favicon.ico', '/pwa/icon-192.png', '/pwa/icon-512.png'];
const EXPORT_ASSETS = [];
const MODEL_ASSET_MANIFEST = '/model-assets.json';

function uniqueAssets(...groups) {
  return [...new Set(groups.flat().filter((asset) => typeof asset === 'string' && asset.length > 0))];
}

async function cacheModelAssets(cache) {
  const response = await fetch(MODEL_ASSET_MANIFEST, { cache: 'no-store' });
  if (!response.ok) return;

  const manifest = await response.json();
  const modelAssets = Array.isArray(manifest.assets)
    ? manifest.assets.filter((asset) => typeof asset === 'string' && asset.startsWith('/models/'))
    : [];

  await cache.addAll([MODEL_ASSET_MANIFEST, ...modelAssets]);
}

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then(async (cache) => {
        await cache.addAll(uniqueAssets(APP_SHELL, EXPORT_ASSETS));
        await cacheModelAssets(cache);
      })
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => key.startsWith(CACHE_PREFIX) && key !== CACHE_NAME)
            .map((key) => caches.delete(key)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});

async function cacheFirst(request) {
  const cached = await caches.match(request);
  if (cached) return cached;
  const response = await fetch(request);
  if (response.ok) {
    const cache = await caches.open(CACHE_NAME);
    cache.put(request, response.clone());
  }
  return response;
}

async function networkFirstNavigation(request) {
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(CACHE_NAME);
      cache.put('/index.html', response.clone());
    }
    return response;
  } catch {
    return (await caches.match('/index.html')) ?? Response.error();
  }
}

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  if (request.mode === 'navigate') {
    event.respondWith(networkFirstNavigation(request));
    return;
  }

  if (
    url.pathname === MODEL_ASSET_MANIFEST ||
    url.pathname.startsWith('/models/') ||
    url.pathname.startsWith('/_expo/static/') ||
    url.pathname.startsWith('/assets/') ||
    url.pathname.startsWith('/pwa/')
  ) {
    event.respondWith(cacheFirst(request));
  }
});
