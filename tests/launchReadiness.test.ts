import { describe, expect, it } from 'vitest';

import { buildLaunchReadinessSummary, defaultLaunchReadinessEvidence } from '../src/core/launchReadiness';

describe('launch readiness', () => {
  it('summarizes the current local-first launch state', () => {
    const summary = buildLaunchReadinessSummary();

    expect(summary.status).toBe('blocked');
    expect(summary.readyTracks).toBe(1);
    expect(summary.tracks.map((track) => [track.key, track.status])).toEqual([
      ['demo', 'ready'],
      ['internal', 'blocked'],
      ['store', 'blocked'],
    ]);
    expect(summary.tracks.find((track) => track.key === 'store')?.checks.map((check) => [check.key, check.status])).toEqual(
      expect.arrayContaining([
        ['iosBuild', 'blocked'],
        ['nativeDeviceQa', 'blocked'],
        ['cueValidationDataset', 'blocked'],
        ['easProject', 'blocked'],
        ['easCredentials', 'blocked'],
      ]),
    );
  });

  it('marks all launch tracks ready when all configured evidence is present', () => {
    const summary = buildLaunchReadinessSummary({
      androidDebugBuild: true,
      cueValidationDataset: true,
      easCredentials: true,
      easProject: true,
      iosBuild: true,
      iosPods: true,
      modelReadiness: true,
      nativeDeviceQa: true,
      privacyManifest: true,
      releaseGate: true,
      storeListing: true,
      webSmoke: true,
    });

    expect(summary.status).toBe('ready');
    expect(summary.readyTracks).toBe(3);
    expect(summary.nextAction).toBe('All configured launch tracks are ready.');
  });

  it('accepts partial evidence overrides without changing the checklist contract', () => {
    const summary = buildLaunchReadinessSummary({
      ...defaultLaunchReadinessEvidence,
      nativeDeviceQa: true,
    });
    const internal = summary.tracks.find((track) => track.key === 'internal');

    expect(internal?.status).toBe('ready');
    expect(internal?.readyChecks).toBe(internal?.requiredChecks);
    expect(summary.tracks.find((track) => track.key === 'store')?.status).toBe('blocked');
  });
});
