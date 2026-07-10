import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('react-native', () => ({ Platform: { OS: 'web' } }));

import {
  resolveBrowserModelCacheState,
  warmBrowserPwaModelCache,
} from '../src/core/pwaRuntimeBrowser';

function browserCache() {
  const entries = new Map<string, Response>();
  const cache = {
    put: vi.fn(async (key: string, response: Response) => {
      entries.set(key, response.clone());
    }),
  };
  const caches = {
    match: vi.fn(async (key: string) => entries.get(key)?.clone()),
    open: vi.fn(async () => cache),
  };
  return { cache, caches, entries };
}

async function sha256(value: string) {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value));
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('');
}

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe('browser model cache binding', () => {
  it('blocks an offline cache whose manifest targets a different configured model', async () => {
    const { caches, entries } = browserCache();
    entries.set(
      '/model-assets.json',
      Response.json({
        assets: ['/models/old/model.json'],
        modelUrl: '/models/old/model.json',
      }),
    );
    vi.stubGlobal('window', { caches, crypto });
    vi.stubGlobal('navigator', { onLine: false });

    const state = await resolveBrowserModelCacheState();

    expect(state.expectedCount).toBe(0);
    expect(state.manifestCached).toBe(false);
    expect(state.integrityVerified).toBe(false);
  });

  it('replaces a cached model asset when its digest does not match the active manifest', async () => {
    const { caches, entries } = browserCache();
    const modelPath = '/models/movenet/singlepose/lightning/4/model.json';
    const goodPayload = 'trusted-model';
    const manifest = {
      assets: [modelPath],
      files: [
        {
          bytes: goodPayload.length,
          path: modelPath,
          sha256: await sha256(goodPayload),
        },
      ],
      modelUrl: modelPath,
    };
    entries.set(modelPath, new Response('tampered-model'));
    const fetchMock = vi.fn(async (input: string | URL | Request) => {
      const url = String(input);
      if (url === '/model-assets.json') return Response.json(manifest);
      if (url === modelPath) return new Response(goodPayload, { status: 200 });
      return new Response(null, { status: 404 });
    });
    vi.stubGlobal('window', { caches, crypto });
    vi.stubGlobal('navigator', { onLine: true });
    vi.stubGlobal('fetch', fetchMock);

    await warmBrowserPwaModelCache();
    const cached = await caches.match(modelPath);
    const state = await resolveBrowserModelCacheState();

    expect(await cached?.text()).toBe(goodPayload);
    expect(state.verifiedCount).toBe(1);
    expect(state.integrityVerified).toBe(true);
    expect(fetchMock).toHaveBeenCalledWith(modelPath, { cache: 'no-store' });
  });
});
