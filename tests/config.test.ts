import { describe, expect, it } from 'vitest';

import appJson from '../app.json';
import {
  appConfig,
  resolveExpoExtra,
  resolveBillingReadinessConfig,
  resolveConfiguredCoachLens,
  resolveLaunchReadinessEvidence,
  resolveModelEvidence,
} from '../src/core/config';

describe('app config', () => {
  it('loads bundled launch readiness and model evidence from app extra', () => {
    expect(appConfig.launchReadinessEvidence?.releaseGate).toBe(true);
    expect(appConfig.launchReadinessEvidence?.iosBuild).toBe(false);
    expect(appConfig.modelEvidence?.modelName).toBe('MoveNet SinglePose Lightning');
    expect(appConfig.nativeVideoAnalysisProvider).toBe('native-platform-pose');
    expect(appConfig.coachLens).toBe('balanced');
    expect(appConfig.billingReadiness.provider).toBe('none');
    expect(appConfig.billingReadiness.entitlementSource).toBe('plan-catalog');
  });

  it('prefers bundled app extra when the runtime Expo manifest is stale', () => {
    const extra = resolveExpoExtra(
      {
        modelEvidence: {
          readiness: {
            loadMs: 1,
          },
        },
        runtimeOnly: true,
      },
      appJson.expo.extra,
    );

    expect(extra.runtimeOnly).toBe(true);
    expect(extra.modelEvidence).toEqual(appJson.expo.extra.modelEvidence);
    expect(appConfig.modelEvidence?.readiness.loadMs).toBe(appJson.expo.extra.modelEvidence.readiness.loadMs);
  });

  it('parses configurable coach lens values with a safe default', () => {
    expect(resolveConfiguredCoachLens('body-position')).toBe('body-position');
    expect(resolveConfiguredCoachLens('unknown-lens')).toBe('balanced');
    expect(resolveConfiguredCoachLens(undefined)).toBe('balanced');
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

  it('parses billing readiness config from environment JSON', () => {
    expect(
      resolveBillingReadinessConfig(
        '{"provider":"revenuecat","planMappings":{"pro":"movebeta_pro_monthly","coach":"movebeta_coach_monthly"},"receiptValidation":"provider-managed","sandboxReady":true,"entitlementSource":"provider-webhook"}',
      ),
    ).toEqual({
      entitlementSource: 'provider-webhook',
      planMappings: {
        coach: 'movebeta_coach_monthly',
        pro: 'movebeta_pro_monthly',
      },
      provider: 'revenuecat',
      receiptValidation: 'provider-managed',
      sandboxReady: true,
    });
  });

  it('treats empty billing readiness config as unset', () => {
    expect(resolveBillingReadinessConfig('')).toBeUndefined();
    expect(resolveBillingReadinessConfig(undefined)).toBeUndefined();
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
          averageInferenceMs: 405,
          budget: {
            averageInferenceMs: 1500,
            loadMs: 25000,
            maxInferenceMs: 3000,
          },
          loadMs: 4162,
          maxInferenceMs: 453,
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
