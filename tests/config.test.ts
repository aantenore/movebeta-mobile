import { describe, expect, it } from 'vitest';

import { appConfig, resolveLaunchReadinessEvidence } from '../src/core/config';

describe('app config', () => {
  it('keeps launch readiness evidence optional by default', () => {
    expect(appConfig.launchReadinessEvidence).toBeUndefined();
  });

  it('parses launch readiness evidence from Expo extra objects', () => {
    expect(
      resolveLaunchReadinessEvidence({
        androidDebugBuild: true,
        modelReadiness: true,
        nativeDeviceQa: false,
        releaseGate: true,
      }),
    ).toEqual({
      androidDebugBuild: true,
      modelReadiness: true,
      nativeDeviceQa: false,
      releaseGate: true,
    });
  });

  it('parses launch readiness evidence from environment JSON', () => {
    expect(resolveLaunchReadinessEvidence('{"releaseGate":true,"webSmoke":true,"modelReadiness":true,"iosBuild":false}')).toEqual({
      iosBuild: false,
      modelReadiness: true,
      releaseGate: true,
      webSmoke: true,
    });
  });

  it('treats empty launch readiness evidence as unset', () => {
    expect(resolveLaunchReadinessEvidence('')).toBeUndefined();
    expect(resolveLaunchReadinessEvidence(undefined)).toBeUndefined();
  });
});
