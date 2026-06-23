import { describe, expect, it } from 'vitest';

import { defaultLaunchReadinessEvidence, type LaunchReadinessEvidence } from '../src/core/launchReadiness';
import {
  assertReleaseCriticalPathIsShareSafe,
  buildReleaseCriticalPath,
  releaseCriticalPathSchemaVersion,
  ReleaseCriticalPathSchema,
  type ReleaseCriticalPath,
} from '../src/core/releaseCriticalPath';

describe('release critical path', () => {
  it('orders external release blockers into parallel critical-path lanes', () => {
    const path = buildReleaseCriticalPath({
      generatedAt: '2026-06-20T22:00:00.000Z',
    });

    expect(ReleaseCriticalPathSchema.parse(path)).toEqual(path);
    expect(path.schemaVersion).toBe(releaseCriticalPathSchemaVersion);
    expect(path.summary).toMatchObject({
      blockedSteps: 2,
      criticalChainLength: 2,
      laneCount: 3,
      readySteps: 0,
      readyToStartSteps: 3,
      status: 'blocked',
      stepCount: 5,
      trackCount: 3,
    });
    expect(path.steps.map((step) => [step.key, step.lane, step.status, step.blockedBy])).toEqual([
      ['cueValidationDataset', 'real-world-validation', 'ready-to-start', []],
      ['iosBuild', 'native-build-qa', 'ready-to-start', []],
      ['nativeDeviceQa', 'native-build-qa', 'blocked', ['iosBuild']],
      ['easProject', 'store-accounts', 'ready-to-start', []],
      ['easCredentials', 'store-accounts', 'blocked', ['easProject']],
    ]);
    expect(path.steps.find((step) => step.key === 'nativeDeviceQa')?.dependencyKeys).toEqual(['iosBuild']);
    expect(path.steps.find((step) => step.key === 'easCredentials')?.dependencyKeys).toEqual(['easProject']);
    expect(path.steps.find((step) => step.key === 'cueValidationDataset')?.commands).toEqual([
      'npm run validation:cue:starter',
      'npm run validation:cue',
      'npm run validation:cue:doctor',
    ]);
    expect(path.steps.find((step) => step.key === 'iosBuild')?.commands).toContain('npm run native:ios:pods');
    expect(JSON.stringify(path)).not.toMatch(/file:\/\/|\/Users\/|ghp_|BEGIN PRIVATE KEY/i);
  });

  it('updates dependent steps when upstream evidence is ready', () => {
    const evidence: LaunchReadinessEvidence = {
      ...defaultLaunchReadinessEvidence,
      easProject: true,
      iosBuild: true,
    };
    const path = buildReleaseCriticalPath({ evidence });

    expect(path.steps.find((step) => step.key === 'iosBuild')?.status).toBe('ready');
    expect(path.steps.find((step) => step.key === 'nativeDeviceQa')?.status).toBe('ready-to-start');
    expect(path.steps.find((step) => step.key === 'easProject')?.status).toBe('ready');
    expect(path.steps.find((step) => step.key === 'easCredentials')?.status).toBe('ready-to-start');
    expect(path.summary).toMatchObject({
      blockedSteps: 0,
      readySteps: 2,
      readyToStartSteps: 3,
      status: 'blocked',
    });
  });

  it('marks the path ready when every external blocker is cleared', () => {
    const allReady = Object.fromEntries(
      Object.keys(defaultLaunchReadinessEvidence).map((key) => [key, true]),
    ) as LaunchReadinessEvidence;
    const path = buildReleaseCriticalPath({ evidence: allReady });

    expect(path.summary).toMatchObject({
      blockedSteps: 0,
      readySteps: 5,
      readyToStartSteps: 0,
      status: 'ready',
    });
    expect(path.summary.nextAction).toBe('All release critical-path steps are ready.');
  });

  it('rejects unsafe paths, videos, credentials, and token-like values before sharing', () => {
    const path = buildReleaseCriticalPath();
    const unsafe: ReleaseCriticalPath = {
      ...path,
      steps: [
        ...path.steps,
        {
          ...path.steps[0],
          acceptance: ['Open file:///Users/antonio/raw-beta.mov with ghp_1234567890abcdefTOKENVALUE'],
          key: 'cueValidationDataset',
          proof: ['/Users/antonio/raw-beta.mov'],
          sequence: 99,
        },
      ],
    };

    expect(() => assertReleaseCriticalPathIsShareSafe(unsafe)).toThrow('Release critical path contains credential');
  });
});
