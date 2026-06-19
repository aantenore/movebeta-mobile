import { defaultCueValidationStudyAcceptance } from '@/movement/cueValidationStudy';

import { nativeQaEvidenceBudgets } from './nativeQaEvidenceKit';

export const evidenceCollectionPlanSchemaVersion = 'movebeta.evidence-collection-plan.v1';

export function buildEvidenceCollectionPlan({
  averageCuesPerClip = 1,
  cueAcceptance = defaultCueValidationStudyAcceptance,
  nativeBudgets = nativeQaEvidenceBudgets,
}: {
  averageCuesPerClip?: number;
  cueAcceptance?: typeof defaultCueValidationStudyAcceptance;
  nativeBudgets?: typeof nativeQaEvidenceBudgets;
} = {}) {
  const reviewerSlotsPerCue = Math.max(cueAcceptance.minDistinctReviewersPerClip, cueAcceptance.minReviewsPerCue);
  const estimatedReviewRows = cueAcceptance.minClips * averageCuesPerClip * reviewerSlotsPerCue;
  const nativeWorkflowChecks = nativeBudgets.requiredPlatforms.length * nativeBudgets.requiredWorkflows.length;

  return {
    schemaVersion: evidenceCollectionPlanSchemaVersion,
    summary: {
      action: 'Collect real coach-reviewed clips and physical-device QA runs before movement-quality claims or store submission.',
      estimatedReviewRows,
      nativeWorkflowChecks,
      status: 'needs-real-world-evidence',
    },
    cueValidation: {
      averageCuesPerClip,
      estimatedReviewRows,
      minAverageCueScore: cueAcceptance.minAverageCueScore,
      minClips: cueAcceptance.minClips,
      minDistinctReviewersPerClip: cueAcceptance.minDistinctReviewersPerClip,
      minReviewsPerCue: cueAcceptance.minReviewsPerCue,
      requiredReviewModes: cueAcceptance.requiredReviewModes,
      requiredReviewerRoles: cueAcceptance.requiredReviewerRoles,
      requiredWallAngles: cueAcceptance.requiredWallAngles,
    },
    nativeQa: {
      maxBatteryDropPct: nativeBudgets.maxBatteryDropPct,
      nativeWorkflowChecks,
      requiredPlatforms: nativeBudgets.requiredPlatforms,
      requiredRuns: nativeBudgets.requiredPlatforms.length,
      requiredWorkflows: nativeBudgets.requiredWorkflows,
    },
    externalEvidence: [
      {
        key: 'physical-devices',
        label: 'Physical iOS and Android devices',
        owner: 'QA',
      },
      {
        key: 'coach-reviewers',
        label: 'Real coach reviewers',
        owner: 'Product',
      },
      {
        key: 'consented-clips',
        label: 'Consented climbing clips across wall angles',
        owner: 'Product',
      },
    ],
  };
}
