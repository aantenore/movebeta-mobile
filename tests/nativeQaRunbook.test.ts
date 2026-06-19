import { describe, expect, it } from 'vitest';

import { nativeQaBudgets, validateNativeQaEvidence } from '../scripts/native_qa_evidence_checks.mjs';
import { buildNativeQaRunbook, NATIVE_QA_RUNBOOK_SCHEMA_VERSION } from '../scripts/native_qa_packet.mjs';

describe('native QA runbook', () => {
  it('generates platform-specific workflow instructions and evidence draft', () => {
    const runbook = buildNativeQaRunbook({
      appVersion: '1.0.0',
      generatedAt: '2026-06-19T00:00:00.000Z',
    });

    expect(runbook.schemaVersion).toBe(NATIVE_QA_RUNBOOK_SCHEMA_VERSION);
    expect(runbook.runbooks.map((item) => item.platform)).toEqual(nativeQaBudgets.requiredPlatforms);
    expect(runbook.evidenceDraft.runs.map((item) => item.platform)).toEqual(nativeQaBudgets.requiredPlatforms);

    for (const platformRunbook of runbook.runbooks) {
      expect(platformRunbook.workflows.map((workflow) => workflow.id)).toEqual(
        nativeQaBudgets.requiredWorkflows.map((workflow) => `${platformRunbook.platform}-${workflow}`),
      );
      expect(platformRunbook.performance.clipLatencyBudgets).toEqual(nativeQaBudgets.maxLatencyByClipMs);
      expect(platformRunbook.setup.join(' ')).toContain('custom native build');
    }
  });

  it('keeps generated evidence drafts blocked until real device values are entered', () => {
    const runbook = buildNativeQaRunbook({
      appVersion: '1.0.0',
      generatedAt: '2026-06-19T00:00:00.000Z',
    });

    const validation = validateNativeQaEvidence(runbook.evidenceDraft);

    expect(validation.ready).toBe(false);
    expect(validation.checks.filter((check) => check.status === 'fail').map((check) => check.id)).toEqual(
      expect.arrayContaining([
        'run-1-cameraPermission',
        'run-1-latency',
        'run-2-recordVideo',
        'run-2-battery',
      ]),
    );
  });
});
