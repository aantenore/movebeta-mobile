import { describe, expect, it } from 'vitest';

import { buildLaunchReadinessSummary, defaultLaunchReadinessEvidence } from '../src/core/launchReadiness';
import {
  buildReleaseUnblockChecklist,
  releaseUnblockChecklistSchemaVersion,
} from '../src/core/releaseUnblockChecklist';

describe('release unblock checklist', () => {
  it('derives the default external blockers from launch readiness', () => {
    const checklist = buildReleaseUnblockChecklist();

    expect(checklist.schemaVersion).toBe(releaseUnblockChecklistSchemaVersion);
    expect(checklist.summary.status).toBe('needs-external-access');
    expect(checklist.summary.blockedItems).toBe(5);
    expect(checklist.items.map((item) => item.key)).toEqual([
      'nativeDeviceQa',
      'iosBuild',
      'cueValidationDataset',
      'easProject',
      'easCredentials',
    ]);
  });

  it('keeps labels and actions aligned with the launch readiness contract', () => {
    const launchReadiness = buildLaunchReadinessSummary();
    const checklist = buildReleaseUnblockChecklist();
    const readinessChecks = launchReadiness.tracks.flatMap((track) => track.checks);

    checklist.items.forEach((item) => {
      const readinessCheck = readinessChecks.find((check) => check.key === item.key);

      expect(readinessCheck).toBeDefined();
      expect(item.label).toBe(readinessCheck?.label);
      expect(item.action).toBe(readinessCheck?.action);
      expect(item.owner).toBe(readinessCheck?.owner);
      expect(item.status).toBe(readinessCheck?.status);
      expect(item.tracks.length).toBeGreaterThan(0);
    });
  });

  it('lists commands, proof artifacts, and secret key names without secret values', () => {
    const checklist = buildReleaseUnblockChecklist();
    const credentials = checklist.items.find((item) => item.key === 'easCredentials');
    const cueValidation = checklist.items.find((item) => item.key === 'cueValidationDataset');
    const iosBuild = checklist.items.find((item) => item.key === 'iosBuild');

    expect(credentials?.commands).toContain('npm run release:eas:strict');
    expect(cueValidation?.commands).toEqual([
      'npm run validation:cue:starter',
      'npm run validation:cue:composition',
      'npm run validation:cue:composition -- --write-dataset',
      'npm run validation:cue',
      'npm run validation:cue:doctor',
    ]);
    expect(iosBuild?.commands).toContain('npm run toolchain:ios');
    expect(iosBuild?.commands).toContain('npm run native:ios:pods');
    expect(iosBuild?.proof).toContain('docs/sdlc/ios-toolchain-report.json');
    expect(credentials?.proof).toContain('CI/EAS secret configuration');
    expect(credentials?.envKeys).toContain('EXPO_TOKEN');
    expect(credentials?.envKeys.join(' ')).not.toMatch(/eyJ|BEGIN PRIVATE KEY|ghp_|pat_/i);
    expect(credentials?.secretPolicy).toContain('outside the repository');
  });

  it('returns an empty ready checklist when every external evidence item is verified', () => {
    const checklist = buildReleaseUnblockChecklist({
      ...defaultLaunchReadinessEvidence,
      cueValidationDataset: true,
      easCredentials: true,
      easProject: true,
      iosBuild: true,
      nativeDeviceQa: true,
    });

    expect(checklist.items).toEqual([]);
    expect(checklist.summary.blockedItems).toBe(0);
    expect(checklist.summary.commandCount).toBe(0);
    expect(checklist.summary.status).toBe('ready');
    expect(checklist.summary.nextAction).toBe('All configured external release blockers are cleared.');
  });
});
