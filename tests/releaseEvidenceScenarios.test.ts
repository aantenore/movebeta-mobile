import { describe, expect, it } from 'vitest';

import { defaultLaunchReadinessEvidence, type LaunchReadinessEvidence } from '../src/core/launchReadiness';
import {
  assertReleaseEvidenceScenarioPlannerIsShareSafe,
  buildReleaseEvidenceScenarioPlanner,
  releaseEvidenceScenarioPlannerSchemaVersion,
  ReleaseEvidenceScenarioPlannerSchema,
  type ReleaseEvidenceScenarioPlanner,
} from '../src/core/releaseEvidenceScenarios';

describe('release evidence scenario planner', () => {
  it('plans default external-proof scenarios without mutating current launch evidence', () => {
    const planner = buildReleaseEvidenceScenarioPlanner({
      generatedAt: '2026-06-20T23:00:00.000Z',
    });

    expect(ReleaseEvidenceScenarioPlannerSchema.parse(planner)).toEqual(planner);
    expect(planner.schemaVersion).toBe(releaseEvidenceScenarioPlannerSchemaVersion);
    expect(planner.summary).toMatchObject({
      bestScenarioKey: 'store-submission-proof',
      currentReadyTracks: 1,
      maxClearedBlockers: 5,
      maxProjectedReadyTracks: 3,
      readyScenarioCount: 1,
      scenarioCount: 4,
      status: 'scenario-ready',
      totalTracks: 3,
    });
    expect(planner.scenarios.map((scenario) => [scenario.key, scenario.status, scenario.summary.projectedReadyTracks])).toEqual([
      ['validation-pilot', 'would-improve', 1],
      ['native-beta-proof', 'would-improve', 2],
      ['store-account-setup', 'would-improve', 1],
      ['store-submission-proof', 'ready', 3],
    ]);
    expect(defaultLaunchReadinessEvidence.nativeDeviceQa).toBe(false);
    expect(JSON.stringify(planner)).not.toMatch(/file:\/\/|\/Users\/|ghp_|BEGIN PRIVATE KEY/i);
  });

  it('surfaces missing prerequisites when a scenario skips upstream critical-path proof', () => {
    const planner = buildReleaseEvidenceScenarioPlanner({
      scenarios: [
        {
          candidateKeys: ['nativeDeviceQa'],
          description: 'Try to collect device QA without first proving the iOS build path.',
          key: 'device-qa-only',
          label: 'Device QA only',
        },
      ],
    });
    const scenario = planner.scenarios[0];

    expect(scenario.status).toBe('needs-prerequisite');
    expect(scenario.missingPrerequisites).toEqual([
      {
        key: 'iosBuild',
        label: 'iOS build verification',
        requiredFor: 'nativeDeviceQa',
      },
    ]);
    expect(scenario.summary.nextAction).toContain('iOS build verification');
    expect(planner.summary).toMatchObject({
      prerequisiteScenarioCount: 1,
      status: 'blocked',
    });
  });

  it('marks the planner ready when current launch evidence is already complete', () => {
    const allReady = Object.fromEntries(
      Object.keys(defaultLaunchReadinessEvidence).map((key) => [key, true]),
    ) as LaunchReadinessEvidence;
    const planner = buildReleaseEvidenceScenarioPlanner({ currentEvidence: allReady });

    expect(planner.summary).toMatchObject({
      currentReadyTracks: 3,
      status: 'ready',
    });
    expect(planner.summary.nextAction).toBe('All launch tracks are ready; preserve evidence and refresh handoff artifacts.');
    expect(planner.scenarios.every((scenario) => scenario.summary.clearedBlockerCount === 0)).toBe(true);
  });

  it('rejects unsafe scenario packet values before sharing', () => {
    const planner = buildReleaseEvidenceScenarioPlanner();
    const unsafe: ReleaseEvidenceScenarioPlanner = {
      ...planner,
      scenarios: [
        {
          ...planner.scenarios[0],
          proof: ['/Users/antonio/raw-beta.mov'],
          summary: {
            ...planner.scenarios[0].summary,
            nextAction: 'Upload file:///Users/antonio/raw-beta.mov with ghp_1234567890abcdefTOKENVALUE',
          },
        },
      ],
    };

    expect(() => assertReleaseEvidenceScenarioPlannerIsShareSafe(unsafe)).toThrow('Release evidence scenario planner contains credential');
  });
});
