import { describe, expect, it } from 'vitest';

import {
  assertReleaseEvidenceFreshnessIsShareSafe,
  buildReleaseEvidenceFreshness,
  buildReleaseEvidenceFreshnessArtifactInputs,
  releaseEvidenceFreshnessSchemaVersion,
  ReleaseEvidenceFreshnessSchema,
  type ReleaseEvidenceFreshness,
  type ReleaseEvidenceFreshnessReportBundle,
} from '../src/core/releaseEvidenceFreshness';

function report(generatedAt: string, extra: Record<string, unknown> = {}) {
  return {
    generatedAt,
    schemaVersion: 'movebeta.test-report.v1',
    status: 'ready',
    ...extra,
  };
}

function bundle(generatedAt = '2026-06-20T10:00:00.000Z'): ReleaseEvidenceFreshnessReportBundle {
  return {
    cueValidationDatasetReport: report(generatedAt),
    dependencyLicenseReport: report(generatedAt),
    envTemplateReport: report(generatedAt),
    featureCompletionReport: report(generatedAt),
    githubWorkflowReport: report(generatedAt),
    iosToolchainReport: report(generatedAt),
    launchReadinessReport: report(generatedAt),
    releaseBlockerIssueFilingPlan: report(generatedAt),
    releaseBlockerIssuesReport: report(generatedAt),
    modelAnalysisReplayReport: report(generatedAt),
    modelVerificationSuiteReport: report(generatedAt),
    moveNetReadinessReport: report(generatedAt),
    storeCredentialsReport: report(generatedAt),
    storeSubmissionPacket: report(generatedAt),
  };
}

describe('release evidence freshness', () => {
  it('marks tracked reports fresh when they are inside their freshness windows', () => {
    const artifacts = buildReleaseEvidenceFreshnessArtifactInputs(bundle('2026-06-20T08:00:00.000Z'));
    const freshness = buildReleaseEvidenceFreshness({
      artifacts,
      generatedAt: '2026-06-20T10:00:00.000Z',
      now: '2026-06-20T10:00:00.000Z',
    });

    expect(ReleaseEvidenceFreshnessSchema.parse(freshness)).toEqual(freshness);
    expect(freshness.schemaVersion).toBe(releaseEvidenceFreshnessSchemaVersion);
    expect(freshness.summary).toMatchObject({
      artifactCount: 14,
      freshCount: 14,
      invalidDateCount: 0,
      maxObservedAgeHours: 2,
      missingDateCount: 0,
      staleCount: 0,
      status: 'ready',
    });
    expect(freshness.summary.nextAction).toBe('All tracked release evidence artifacts are fresh.');
  });

  it('flags stale artifacts and points to the refresh command', () => {
    const artifacts = buildReleaseEvidenceFreshnessArtifactInputs(bundle('2026-06-18T09:00:00.000Z'));
    const freshness = buildReleaseEvidenceFreshness({
      artifacts,
      now: '2026-06-20T10:00:00.000Z',
    });

    expect(freshness.summary.status).toBe('stale');
    expect(freshness.summary.staleCount).toBeGreaterThan(0);
    expect(freshness.summary.nextAction).toContain('npm run release:readiness');
    expect(freshness.artifacts.find((artifact) => artifact.key === 'launch-readiness-report')).toMatchObject({
      ageHours: 49,
      status: 'stale',
    });
    expect(freshness.artifacts.find((artifact) => artifact.key === 'dependency-license-report')?.status).toBe('fresh');
  });

  it('keeps missing and invalid timestamps visible instead of accepting weak evidence', () => {
    const artifacts = buildReleaseEvidenceFreshnessArtifactInputs({
      ...bundle('2026-06-20T09:00:00.000Z'),
      featureCompletionReport: { schemaVersion: 'movebeta.feature-completion-report.v1' },
      launchReadinessReport: report('not-a-date'),
    });
    const freshness = buildReleaseEvidenceFreshness({
      artifacts,
      now: '2026-06-20T10:00:00.000Z',
    });

    expect(freshness.summary).toMatchObject({
      invalidDateCount: 1,
      missingDateCount: 1,
      status: 'stale',
    });
    expect(freshness.artifacts.find((artifact) => artifact.key === 'feature-completion-report')?.status).toBe('missing-date');
    expect(freshness.artifacts.find((artifact) => artifact.key === 'launch-readiness-report')?.status).toBe('invalid-date');
  });

  it('rejects local paths, raw video references, credentials, and token-like values before sharing', () => {
    const freshness = buildReleaseEvidenceFreshness({
      artifacts: buildReleaseEvidenceFreshnessArtifactInputs(bundle()),
      now: '2026-06-20T10:00:00.000Z',
    });
    const unsafe: ReleaseEvidenceFreshness = {
      ...freshness,
      artifacts: [
        {
          ...freshness.artifacts[0],
          detail: 'Open file:///Users/antonio/raw-beta.mov with ghp_1234567890abcdefTOKENVALUE',
          path: '/Users/antonio/raw-beta.mov',
        },
      ],
    };

    expect(() => assertReleaseEvidenceFreshnessIsShareSafe(unsafe)).toThrow('Release evidence freshness report contains credential');
  });
});
