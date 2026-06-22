import { describe, expect, it } from 'vitest';

import {
  buildReleaseGateReport,
  RELEASE_GATE_REPORT_SCHEMA_VERSION,
  releaseGateSteps,
} from '../scripts/release_check.mjs';

function step(key: string, status: 'pass' | 'fail' = 'pass') {
  return {
    command: `npm run ${key}`,
    completedAt: '2026-06-20T10:01:00.000Z',
    durationMs: 123,
    exitCode: status === 'pass' ? 0 : 1,
    key,
    label: key,
    startedAt: '2026-06-20T10:00:00.000Z',
    status,
  };
}

describe('release gate report', () => {
  it('marks the release gate pass only when every gate step passes', () => {
    const report = buildReleaseGateReport({
      completedAt: '2026-06-20T10:05:00.000Z',
      startedAt: '2026-06-20T10:00:00.000Z',
      steps: releaseGateSteps.map((item) => step(item.key)),
    });

    expect(report.schemaVersion).toBe(RELEASE_GATE_REPORT_SCHEMA_VERSION);
    expect(report.status).toBe('pass');
    expect(report.steps.map((item: { key: string }) => item.key)).toEqual(
      releaseGateSteps.map((item: { key: string }) => item.key),
    );
    expect(report.steps.map((item: { key: string }) => item.key)).toContain('iosToolchainDoctor');
    expect(report.steps.map((item: { key: string }) => item.key)).toContain('modelVerificationSuite');
    expect(report.steps.map((item: { key: string }) => item.key)).toContain('cueValidationDatasetDoctor');
    expect(report.steps.map((item: { key: string }) => item.key)).toContain('envTemplateDoctor');
    expect(report.steps.map((item: { key: string }) => item.key)).toContain('storeCredentialsDoctor');
    expect(report.steps.map((item: { key: string }) => item.key)).toContain('githubWorkflowDoctor');
    expect(report.steps.map((item: { key: string }) => item.key)).toContain('featureCompletionDoctor');
    expect(report.steps.map((item: { key: string }) => item.key)).toContain('releaseBlockerIssues');
    expect(report.steps.map((item: { key: string }) => item.key)).toContain('releaseBlockerIssueFiling');
    expect(report.steps.map((item: { key: string }) => item.key)).toContain('releaseBlockerIssueLinks');
    expect(report.steps.map((item: { key: string }) => item.key)).toContain('storeSubmissionPacket');
    expect(report.steps.map((item: { key: string }) => item.key)).toContain('pwaReadiness');
    expect(report.steps.map((item: { key: string }) => item.key)).toContain('dependencyLicenses');
    expect(report.steps.map((item: { key: string }) => item.key)).toContain('releaseFreshnessDoctor');
  });

  it('marks the release gate fail when any executed step fails', () => {
    const report = buildReleaseGateReport({
      completedAt: '2026-06-20T10:05:00.000Z',
      startedAt: '2026-06-20T10:00:00.000Z',
      steps: [step('quality'), step('modelReadiness', 'fail')],
    });

    expect(report.status).toBe('fail');
    expect(report.steps.filter((item: { status: string }) => item.status === 'fail')).toHaveLength(1);
  });
});
