import { describe, expect, it } from 'vitest';

import {
  assertPwaUpdateActivationResultIsShareSafe,
  buildPwaUpdateActivationResult,
  pwaUpdateActivationSchemaVersion,
} from '../src/core/pwaUpdateActivation';

const generatedAt = '2026-06-24T08:00:00.000Z';

describe('PWA update activation result', () => {
  it('builds an activated result with post-activation cache guidance', () => {
    const result = buildPwaUpdateActivationResult({
      generatedAt,
      serviceWorkerSupported: true,
      status: 'activated',
      updateAvailableBefore: true,
      updateStillWaiting: false,
    });

    expect(result.schemaVersion).toBe(pwaUpdateActivationSchemaVersion);
    expect(result.summary).toMatchObject({
      nextAction: 'Warm the model cache again, then run one offline relaunch smoke before field use.',
      serviceWorkerSupported: true,
      status: 'activated',
      updateAvailableBefore: true,
      updateStillWaiting: false,
    });
    expect(result.actions).toContain('Run Warm model after activation so Cache Storage reflects the active app version.');
  });

  it('keeps installing updates in a requested state', () => {
    const result = buildPwaUpdateActivationResult({
      generatedAt,
      serviceWorkerSupported: true,
      status: 'requested',
      updateAvailableBefore: true,
      updateStillWaiting: true,
    });

    expect(result.summary.status).toBe('requested');
    expect(result.summary.nextAction).toContain('Keep the PWA online');
  });

  it('reports not-needed when no update is waiting', () => {
    const result = buildPwaUpdateActivationResult({
      generatedAt,
      serviceWorkerSupported: true,
      status: 'not-needed',
      updateAvailableBefore: false,
      updateStillWaiting: false,
    });

    expect(result.summary.status).toBe('not-needed');
    expect(result.actions).toContain('No waiting service worker update was found.');
  });

  it('reports unsupported runtimes without leaking local values', () => {
    const result = buildPwaUpdateActivationResult({
      generatedAt,
      serviceWorkerSupported: false,
      status: 'unsupported',
      updateAvailableBefore: false,
      updateStillWaiting: false,
    });

    expect(result.summary.status).toBe('unsupported');
    expect(result.privacy).toMatchObject({
      credentialValuesIncluded: false,
      localPathsIncluded: false,
      rawArtifactsIncluded: false,
      rawVideoIncluded: false,
      tokenLikeValuesIncluded: false,
    });
  });

  it('rejects unsafe exported values', () => {
    const result = buildPwaUpdateActivationResult({
      generatedAt,
      serviceWorkerSupported: true,
      status: 'activated',
      updateAvailableBefore: true,
      updateStillWaiting: false,
    });

    expect(() =>
      assertPwaUpdateActivationResultIsShareSafe({
        ...result,
        actions: ['Open file:///Users/antonio/raw.mov with ghp_1234567890abcdefTOKENVALUE'],
      }),
    ).toThrow('PWA update activation result contains credential');
  });
});
