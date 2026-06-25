import { describe, expect, it } from 'vitest';

import {
  analysisDeviceReadinessSchemaVersion,
  assertAnalysisDeviceReadinessIsShareSafe,
  buildAnalysisDeviceReadiness,
  type AnalysisDeviceProbe,
} from '../src/core/analysisDeviceReadiness';

const readyProbe: AnalysisDeviceProbe = {
  batteryCharging: false,
  batteryLevel: 0.72,
  batterySupported: true,
  deviceMemoryGb: 8,
  freeStorageBytes: 4_000_000_000,
  hardwareConcurrency: 8,
  online: true,
  runtime: 'web',
  storageEstimateSupported: true,
};

describe('analysis device readiness', () => {
  it('marks strong browser device signals as ready', () => {
    const readiness = buildAnalysisDeviceReadiness({
      generatedAt: '2026-06-25T09:00:00.000Z',
      probe: readyProbe,
    });

    expect(readiness.schemaVersion).toBe(analysisDeviceReadinessSchemaVersion);
    expect(readiness.summary).toMatchObject({
      blockedCount: 0,
      canAnalyze: true,
      reviewCount: 0,
      status: 'ready',
    });
    expect(readiness.signals).toMatchObject({
      batteryLevel: 0.72,
      deviceMemoryGb: 8,
      hardwareConcurrency: 8,
      runtime: 'web',
    });
  });

  it('keeps low unplugged battery as review without blocking local analysis', () => {
    const readiness = buildAnalysisDeviceReadiness({
      generatedAt: '2026-06-25T09:00:00.000Z',
      probe: {
        ...readyProbe,
        batteryCharging: false,
        batteryLevel: 0.12,
      },
    });

    expect(readiness.summary.status).toBe('review');
    expect(readiness.summary.canAnalyze).toBe(true);
    expect(readiness.steps.find((step) => step.key === 'power')?.status).toBe('review');
    expect(readiness.summary.nextAction).toContain('Plug in power');
  });

  it('reviews weak or unknown compute signals', () => {
    const readiness = buildAnalysisDeviceReadiness({
      generatedAt: '2026-06-25T09:00:00.000Z',
      probe: {
        ...readyProbe,
        deviceMemoryGb: 2,
        hardwareConcurrency: 2,
      },
    });

    expect(readiness.summary.status).toBe('review');
    expect(readiness.steps.find((step) => step.key === 'compute')?.status).toBe('review');
  });

  it('reviews low free storage estimates', () => {
    const readiness = buildAnalysisDeviceReadiness({
      generatedAt: '2026-06-25T09:00:00.000Z',
      probe: {
        ...readyProbe,
        freeStorageBytes: 120_000_000,
      },
    });

    expect(readiness.summary.status).toBe('review');
    expect(readiness.steps.find((step) => step.key === 'storage')?.status).toBe('review');
  });

  it('uses native fallback signals without browser-only assumptions', () => {
    const readiness = buildAnalysisDeviceReadiness({
      generatedAt: '2026-06-25T09:00:00.000Z',
      probe: {
        batterySupported: false,
        online: true,
        runtime: 'native',
        storageEstimateSupported: false,
      },
    });

    expect(readiness.signals.runtime).toBe('native');
    expect(readiness.summary.status).toBe('review');
    expect(readiness.steps.find((step) => step.key === 'runtime')?.status).toBe('ready');
  });

  it('rejects unsafe exported device readiness values', () => {
    const readiness = buildAnalysisDeviceReadiness({
      generatedAt: '2026-06-25T09:00:00.000Z',
      probe: readyProbe,
    });

    expect(() =>
      assertAnalysisDeviceReadinessIsShareSafe({
        ...readiness,
        steps: readiness.steps.map((step, index) =>
          index === 0 ? { ...step, detail: 'Review /Users/antonio/session.mp4 before export.' } : step,
        ),
      }),
    ).toThrow('Analysis device readiness contains credential');
  });
});
