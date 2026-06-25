import { describe, expect, it } from 'vitest';

import { buildAnalysisDeviceReadiness } from '../src/core/analysisDeviceReadiness';
import { buildAnalysisRunLoad, createAnalysisRunLoadRecord } from '../src/core/analysisRunLoad';
import { assertCoachSessionLaunchIsShareSafe, buildCoachSessionLaunch } from '../src/core/coachSessionLaunch';
import { buildModelDeliveryLifecycle, modelDeliveryPolicySchemaVersion } from '../src/core/modelDeliveryLifecycle';
import { buildModelDownloadPlan } from '../src/core/modelDownloadPlan';
import { buildPwaAnalysisPreflight } from '../src/core/pwaAnalysisPreflight';
import { buildPwaFieldReadiness } from '../src/core/pwaFieldReadiness';
import { buildPwaRuntimeReadiness, type PwaRuntimeProbe } from '../src/core/pwaRuntimeReadiness';
import { assessCaptureCalibration, defaultCaptureCalibrationInput } from '../src/video/captureCalibration';

const generatedAt = '2026-06-25T10:00:00.000Z';

function pwaProbe(patch: Partial<PwaRuntimeProbe> = {}): PwaRuntimeProbe {
  return {
    cacheApiSupported: true,
    installPromptAvailable: true,
    installedStandalone: false,
    modelCache: {
      bytesCached: 9000,
      cachedCount: 3,
      expectedCount: 3,
      integritySupported: true,
      integrityVerified: true,
      manifestCached: true,
      verifiedCount: 3,
    },
    online: true,
    runtime: 'web',
    serviceWorkerControlled: true,
    serviceWorkerRegistered: true,
    serviceWorkerSupported: true,
    updateAvailable: false,
    ...patch,
  };
}

function staticAssetsReport() {
  return {
    checks: [{ key: 'manifest-asset-list', status: 'verified' }],
    modelName: 'MoveNet SinglePose Lightning',
    modelUrl: '/models/movenet/singlepose/lightning/4/model.json',
    summary: {
      assetCount: 3,
      status: 'ready',
      totalBytes: 9000,
    },
  };
}

function pwaReadinessReport() {
  return {
    checks: [{ key: 'content-addressed-cache-version', status: 'verified' }],
    summary: {
      checkCount: 1,
      status: 'ready',
      verifiedCount: 1,
    },
  };
}

function deliveryPolicy() {
  return {
    native: {
      deliveryMode: 'platform-provider-bundled',
    },
    schemaVersion: modelDeliveryPolicySchemaVersion,
    web: {
      downloadStrategy: 'precache-on-install',
      integrity: 'sha256-manifest',
      offlineUse: 'requires-cached-assets',
      userAction: 'warm-model-control',
    },
  };
}

function deviceReadiness() {
  return buildAnalysisDeviceReadiness({
    generatedAt,
    probe: {
      batteryCharging: false,
      batteryLevel: 0.9,
      batterySupported: true,
      deviceMemoryGb: 8,
      freeStorageBytes: 8_000_000_000,
      hardwareConcurrency: 8,
      online: true,
      runtime: 'web',
      storageEstimateSupported: true,
    },
  });
}

function runLoad() {
  return buildAnalysisRunLoad({
    currentBudgetMs: 20_000,
    generatedAt,
    records: [],
  });
}

function runtimeBundle(probePatch: Partial<PwaRuntimeProbe> = {}) {
  const probe = pwaProbe(probePatch);
  const readiness = buildPwaRuntimeReadiness(probe);
  const lifecycle = buildModelDeliveryLifecycle({
    generatedAt,
    modelDeliveryPolicy: deliveryPolicy(),
    pwaReadinessReport: pwaReadinessReport(),
    pwaRuntimeReadiness: readiness,
    staticAssetsReport: staticAssetsReport(),
  });
  const modelDownloadPlan = buildModelDownloadPlan({
    generatedAt,
    lifecycle,
    network: probe.online ? 'online' : 'offline',
    preference: 'wifi-only',
    runtimeReadiness: readiness,
  });

  return {
    fieldReadiness: buildPwaFieldReadiness({
      generatedAt,
      modelDownloadPlan,
      readiness,
    }),
    modelPreflight: buildPwaAnalysisPreflight({
      hasLocalVideo: false,
      online: probe.online,
      readiness,
    }),
  };
}

function readyLaunch() {
  const runtime = runtimeBundle();
  return buildCoachSessionLaunch({
    capture: assessCaptureCalibration(defaultCaptureCalibrationInput),
    deviceReadiness: deviceReadiness(),
    fieldReadiness: runtime.fieldReadiness,
    generatedAt,
    modelPreflight: runtime.modelPreflight,
    runLoad: runLoad(),
  });
}

describe('coach session launch', () => {
  it('marks a fully prepared local coaching session as ready', () => {
    const launch = readyLaunch();

    expect(launch.schemaVersion).toBe('movebeta.coach-session-launch.v1');
    expect(launch.summary.status).toBe('ready');
    expect(launch.summary.canStartCapture).toBe(true);
    expect(launch.summary.readyForSession).toBe(true);
    expect(launch.summary.blockedCount).toBe(0);
    expect(launch.steps.map((step) => step.key)).toEqual([
      'capture-setup',
      'model-readiness',
      'field-readiness',
      'device-readiness',
      'run-load',
      'privacy-boundary',
    ]);
  });

  it('blocks launch when capture setup has a privacy or framing blocker', () => {
    const runtime = runtimeBundle();
    const launch = buildCoachSessionLaunch({
      capture: assessCaptureCalibration({
        ...defaultCaptureCalibrationInput,
        bystanderState: 'visible',
      }),
      deviceReadiness: deviceReadiness(),
      fieldReadiness: runtime.fieldReadiness,
      generatedAt,
      modelPreflight: runtime.modelPreflight,
      runLoad: runLoad(),
    });

    expect(launch.summary.status).toBe('blocked');
    expect(launch.summary.canStartCapture).toBe(false);
    expect(launch.steps.find((step) => step.key === 'capture-setup')?.status).toBe('blocked');
    expect(launch.summary.nextAction).toContain('Fix setup blockers');
  });

  it('uses review status when the session can start but still has readiness actions', () => {
    const runtime = runtimeBundle({
      modelCache: {
        bytesCached: 0,
        cachedCount: 0,
        expectedCount: 3,
        integritySupported: true,
        integrityVerified: false,
        manifestCached: false,
        verifiedCount: 0,
      },
    });
    const launch = buildCoachSessionLaunch({
      capture: assessCaptureCalibration(defaultCaptureCalibrationInput),
      deviceReadiness: deviceReadiness(),
      fieldReadiness: runtime.fieldReadiness,
      generatedAt,
      modelPreflight: runtime.modelPreflight,
      runLoad: runLoad(),
    });

    expect(launch.summary.status).toBe('review');
    expect(launch.summary.canStartCapture).toBe(true);
    expect(launch.summary.readyForSession).toBe(false);
    expect(launch.steps.find((step) => step.key === 'field-readiness')?.status).toBe('review');
  });

  it('blocks launch during a repeated-analysis cooldown', () => {
    const runtime = runtimeBundle();
    const load = buildAnalysisRunLoad({
      currentBudgetMs: 20_000,
      generatedAt,
      records: [0, 1, 2].map((index) =>
        createAnalysisRunLoadRecord({
          activeDurationMs: 15_000,
          analysisMs: 10_000,
          budgetMs: 20_000,
          completedAt: new Date(Date.parse(generatedAt) - index * 20_000).toISOString(),
          provider: 'local-fixture',
          sourceType: 'fixture',
        }),
      ),
    });
    const launch = buildCoachSessionLaunch({
      capture: assessCaptureCalibration(defaultCaptureCalibrationInput),
      deviceReadiness: deviceReadiness(),
      fieldReadiness: runtime.fieldReadiness,
      generatedAt,
      modelPreflight: runtime.modelPreflight,
      runLoad: load,
    });

    expect(launch.summary.status).toBe('blocked');
    expect(launch.steps.find((step) => step.key === 'run-load')?.status).toBe('blocked');
    expect(launch.summary.nextAction).toContain('Pause');
  });

  it('rejects unsafe exported values', () => {
    const launch = readyLaunch();

    expect(() =>
      assertCoachSessionLaunchIsShareSafe({
        ...launch,
        steps: launch.steps.map((step, index) => (index === 0 ? { ...step, detail: 'file:///tmp/private.mp4' } : step)),
      }),
    ).toThrow('Coach session launch contains credential');
  });
});
