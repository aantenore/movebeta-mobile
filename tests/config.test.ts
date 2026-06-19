import { describe, expect, it } from 'vitest';

import { appConfig, resolveLaunchReadinessEvidence, resolveModelEvidence } from '../src/core/config';

describe('app config', () => {
  it('keeps launch readiness optional while exposing default model evidence', () => {
    expect(appConfig.launchReadinessEvidence).toBeUndefined();
    expect(appConfig.modelEvidence?.modelName).toBe('MoveNet SinglePose Lightning');
  });

  it('parses launch readiness evidence from Expo extra objects', () => {
    expect(
      resolveLaunchReadinessEvidence({
        androidDebugBuild: true,
        modelReadiness: true,
        nativeDeviceQa: false,
        nativeQaRunbook: true,
        releaseGate: true,
      }),
    ).toEqual({
      androidDebugBuild: true,
      modelReadiness: true,
      nativeDeviceQa: false,
      nativeQaRunbook: true,
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

  it('parses model evidence from environment JSON', () => {
    const evidence = resolveModelEvidence(
      JSON.stringify({
        analysisReplay: {
          passedAttempts: 3,
          privacySafe: true,
          status: 'pass',
          totalAttempts: 3,
        },
        modelName: 'MoveNet SinglePose Lightning',
        provider: 'web-tfjs-movenet',
        readiness: {
          averageInferenceMs: 326,
          budget: {
            averageInferenceMs: 1500,
            loadMs: 25000,
            maxInferenceMs: 3000,
          },
          loadMs: 4433,
          maxInferenceMs: 331,
          status: 'ready',
        },
        realWorldValidation: {
          estimatedReviewRows: 40,
          nextAction: 'Collect real clips.',
          requiredClips: 20,
          requiredWallAngles: ['slab', 'vertical', 'overhang'],
          status: 'needs-real-video',
        },
      }),
    );

    expect(evidence?.modelName).toBe('MoveNet SinglePose Lightning');
    expect(evidence?.analysisReplay.passedAttempts).toBe(3);
  });
});
