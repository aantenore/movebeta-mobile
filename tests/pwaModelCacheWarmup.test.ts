import { describe, expect, it } from 'vitest';

import {
  assertPwaModelCacheWarmupResultIsShareSafe,
  buildPwaModelCacheWarmupResult,
  pwaModelCacheWarmupSchemaVersion,
  type PwaModelCacheWarmupResult,
} from '../src/core/pwaModelCacheWarmup';

describe('PWA model cache warmup', () => {
  it('marks the model cache ready when manifest and all assets are cached', () => {
    const result = buildPwaModelCacheWarmupResult({
      assetsCached: 3,
      assetsExpected: 3,
      assetsVerified: 3,
      bytesCached: 324508,
      cacheApiSupported: true,
      generatedAt: '2026-06-23T08:00:00.000Z',
      integritySupported: true,
      manifestCached: true,
      online: true,
    });

    expect(result.schemaVersion).toBe(pwaModelCacheWarmupSchemaVersion);
    expect(result.summary).toMatchObject({
      assetsCached: 3,
      assetsExpected: 3,
      assetsVerified: 3,
      bytesCached: 324508,
      integritySupported: true,
      integrityVerified: true,
      manifestCached: true,
      status: 'ready',
    });
    expect(result.privacy.rawVideoIncluded).toBe(false);
  });

  it('keeps warmup partial when cached assets fail integrity verification', () => {
    const result = buildPwaModelCacheWarmupResult({
      assetsCached: 3,
      assetsExpected: 3,
      assetsVerified: 2,
      bytesCached: 324508,
      cacheApiSupported: true,
      generatedAt: '2026-06-23T08:00:00.000Z',
      integritySupported: true,
      manifestCached: true,
      online: true,
    });

    expect(result.summary).toMatchObject({
      assetsCached: 3,
      assetsExpected: 3,
      assetsVerified: 2,
      integritySupported: true,
      integrityVerified: false,
      status: 'partial',
    });
    expect(result.summary.nextAction).toContain('SHA-256');
  });

  it('keeps warmup partial while same-origin model assets are missing', () => {
    const result = buildPwaModelCacheWarmupResult({
      assetsCached: 1,
      assetsExpected: 3,
      cacheApiSupported: true,
      generatedAt: '2026-06-23T08:00:00.000Z',
      manifestCached: true,
      online: false,
    });

    expect(result.summary.status).toBe('partial');
    expect(result.summary.nextAction).toContain('Reconnect');
    expect(result.actions).toContain('Warm the model cache before recording or importing climbing video offline.');
  });

  it('marks unsupported browsers without Cache Storage as unsupported', () => {
    const result = buildPwaModelCacheWarmupResult({
      assetsCached: 0,
      assetsExpected: 0,
      cacheApiSupported: false,
      generatedAt: '2026-06-23T08:00:00.000Z',
      manifestCached: false,
      online: true,
    });

    expect(result.summary.status).toBe('unsupported');
    expect(result.summary.nextAction).toContain('Cache Storage');
  });

  it('rejects unsafe values before sharing', () => {
    const result = buildPwaModelCacheWarmupResult({
      assetsCached: 3,
      assetsExpected: 3,
      assetsVerified: 3,
      bytesCached: 324508,
      cacheApiSupported: true,
      generatedAt: '2026-06-23T08:00:00.000Z',
      integritySupported: true,
      manifestCached: true,
      online: true,
    });

    const unsafe: PwaModelCacheWarmupResult = {
      ...result,
      actions: ['Use bearer TOKEN_VALUE_THAT_SHOULD_NOT_BE_SHARED'],
    };

    expect(() => assertPwaModelCacheWarmupResultIsShareSafe(unsafe)).toThrow('PWA model cache warmup result contains credential');
  });
});
