import { describe, expect, it } from 'vitest';

import { buildEvidenceCollectionPlan, evidenceCollectionPlanSchemaVersion } from '../src/core/evidenceCollectionPlan';
import { nativeQaEvidenceBudgets } from '../src/core/nativeQaEvidenceKit';
import { defaultCueValidationStudyAcceptance } from '../src/movement/cueValidationStudy';

describe('evidence collection plan', () => {
  it('derives default validation and native QA targets from shared contracts', () => {
    const plan = buildEvidenceCollectionPlan();

    expect(plan.schemaVersion).toBe(evidenceCollectionPlanSchemaVersion);
    expect(plan.cueValidation).toMatchObject({
      estimatedReviewRows: 40,
      minAverageCueScore: 4,
      minClips: 20,
      minDistinctReviewersPerClip: 2,
      requiredWallAngles: ['slab', 'vertical', 'overhang'],
    });
    expect(plan.nativeQa).toMatchObject({
      maxBatteryDropPct: 4,
      nativeWorkflowChecks: 14,
      requiredRuns: 2,
    });
    expect(plan.nativeQa.requiredWorkflows).toEqual(nativeQaEvidenceBudgets.requiredWorkflows);
  });

  it('updates review row estimates from configurable acceptance thresholds', () => {
    const plan = buildEvidenceCollectionPlan({
      averageCuesPerClip: 3,
      cueAcceptance: {
        ...defaultCueValidationStudyAcceptance,
        minClips: 12,
        minDistinctReviewersPerClip: 3,
        minReviewsPerCue: 2,
      },
    });

    expect(plan.cueValidation.estimatedReviewRows).toBe(108);
    expect(plan.summary.estimatedReviewRows).toBe(108);
  });

  it('keeps the plan privacy-safe and explicit about external evidence', () => {
    const serialized = JSON.stringify(buildEvidenceCollectionPlan());

    expect(serialized).toContain('Consented climbing clips');
    expect(serialized).not.toMatch(/rawVideo|videoUri|file:\/\//i);
  });
});
