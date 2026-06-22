import { describe, expect, it } from 'vitest';

import {
  buildPwaInstallGuidancePacket,
  buildPwaRuntimeReadiness,
  pwaRuntimeReadinessSchemaVersion,
  type PwaRuntimeProbe,
} from '../src/core/pwaRuntimeReadiness';

const readyWebProbe: PwaRuntimeProbe = {
  cacheApiSupported: true,
  installPromptAvailable: false,
  installedStandalone: false,
  online: true,
  runtime: 'web',
  serviceWorkerControlled: true,
  serviceWorkerRegistered: true,
  serviceWorkerSupported: true,
  updateAvailable: false,
};

describe('PWA runtime readiness', () => {
  it('marks standalone PWA launches as installed and offline ready', () => {
    const readiness = buildPwaRuntimeReadiness({
      ...readyWebProbe,
      installedStandalone: true,
    });

    expect(readiness.schemaVersion).toBe(pwaRuntimeReadinessSchemaVersion);
    expect(readiness.summary).toMatchObject({
      installedStandalone: true,
      offlineReady: true,
      status: 'installed',
    });
    expect(readiness.checks.find((check) => check.key === 'install-surface')?.status).toBe('ready');
  });

  it('surfaces browser install prompt availability as an action state', () => {
    const readiness = buildPwaRuntimeReadiness({
      ...readyWebProbe,
      installPromptAvailable: true,
    });

    expect(readiness.summary).toMatchObject({
      installPromptAvailable: true,
      offlineReady: true,
      status: 'installable',
    });
    expect(readiness.checks.find((check) => check.key === 'install-surface')?.action).toContain('Install app action');
  });

  it('keeps static PWA runtime ready when the browser hides the install prompt', () => {
    const readiness = buildPwaRuntimeReadiness(readyWebProbe);
    const packet = buildPwaInstallGuidancePacket(readiness);

    expect(readiness.summary.status).toBe('runtime-ready');
    expect(readiness.summary.nextAction).toContain('browser install control');
    expect(packet.schemaVersion).toBe(pwaRuntimeReadinessSchemaVersion);
    expect(packet.privacy).toMatchObject({
      credentialValuesIncluded: false,
      rawVideoIncluded: false,
    });
  });

  it('keeps native runtimes on the native install path', () => {
    const readiness = buildPwaRuntimeReadiness({
      cacheApiSupported: false,
      installPromptAvailable: false,
      installedStandalone: false,
      online: true,
      runtime: 'native',
      serviceWorkerControlled: false,
      serviceWorkerRegistered: false,
      serviceWorkerSupported: false,
      updateAvailable: false,
    });

    expect(readiness.summary.status).toBe('native');
    expect(readiness.summary.offlineReady).toBe(true);
    expect(readiness.checks.every((check) => check.status === 'ready')).toBe(true);
  });

  it('rejects unsafe guidance packet values before sharing', () => {
    const readiness = buildPwaRuntimeReadiness(readyWebProbe);

    expect(() =>
      buildPwaInstallGuidancePacket({
        ...readiness,
        checks: [
          {
            ...readiness.checks[0],
            detail: 'Open file:///Users/antonio/raw-beta.mov with ghp_1234567890abcdefTOKENVALUE',
          },
        ],
      }),
    ).toThrow('PWA install guidance packet contains credential');
  });
});
