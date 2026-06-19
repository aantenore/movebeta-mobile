import { describe, expect, it } from 'vitest';

import {
  buildNativeQaEvidenceKit,
  nativeQaEvidenceBudgets,
  nativeQaEvidenceKitSchemaVersion,
} from '../src/core/nativeQaEvidenceKit';
import { nativeQaBudgets } from '../scripts/native_qa_evidence_checks.mjs';

describe('native QA evidence kit', () => {
  it('builds a platform checklist from the native QA contract', () => {
    const kit = buildNativeQaEvidenceKit();

    expect(kit.schemaVersion).toBe(nativeQaEvidenceKitSchemaVersion);
    expect(kit.summary).toMatchObject({
      requiredRuns: 2,
      status: 'blocked-until-real-device-evidence',
      workflowCountPerPlatform: nativeQaEvidenceBudgets.requiredWorkflows.length,
    });
    expect(kit.platforms.map((platform) => platform.key)).toEqual(nativeQaEvidenceBudgets.requiredPlatforms);
    expect(kit.platforms[0].requiredWorkflows.map((workflow) => workflow.key)).toEqual(
      nativeQaEvidenceBudgets.requiredWorkflows,
    );
  });

  it('surfaces the same performance budgets used by native QA validation', () => {
    const kit = buildNativeQaEvidenceKit();

    expect(nativeQaEvidenceBudgets).toEqual(nativeQaBudgets);
    expect(kit.budgets.maxBatteryDropPct).toBe(4);
    expect(kit.budgets.passingThermalStates).toEqual(['nominal', 'fair']);
    expect(kit.budgets.maxLatencyByClipMs.map((budget) => budget.maxAnalysisMs)).toEqual([8000, 25000, 35000]);
    expect(kit.validationCommand).toBe('npm run native:qa:validate');
  });

  it('keeps the app-facing checklist privacy-safe and explicit about real evidence', () => {
    const serialized = JSON.stringify(buildNativeQaEvidenceKit());

    expect(serialized).toContain('Template placeholders are rejected');
    expect(serialized).not.toMatch(/rawVideo|videoUri|file:\/\//i);
  });
});
