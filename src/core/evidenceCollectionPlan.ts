import { defaultCueValidationStudyAcceptance } from '@/movement/cueValidationStudy';

import { nativeQaEvidenceBudgets } from './nativeQaEvidenceKit';

export const evidenceCollectionPlanSchemaVersion = 'movebeta.evidence-collection-plan.v1';

const wallAngleCaptureFocus: Record<string, string> = {
  overhang: 'Prioritize roof tension, foot-cut recovery, and lock-off timing attempts.',
  slab: 'Prioritize quiet feet, hip drift, and balance-heavy footwork attempts.',
  vertical: 'Prioritize pacing, straight-arm rests, and controlled dead-point attempts.',
};

function distributeTargets(total: number, keys: string[]) {
  if (keys.length === 0) return [];
  const base = Math.floor(total / keys.length);
  const remainder = total % keys.length;

  return keys.map((key, index) => ({
    key,
    target: base + (index < remainder ? 1 : 0),
  }));
}

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
  const collectionBatches = distributeTargets(cueAcceptance.minClips, cueAcceptance.requiredWallAngles).map(
    ({ key: wallAngle, target }) => {
      const estimatedCueRows = target * averageCuesPerClip;

      return {
        captureFocus: wallAngleCaptureFocus[wallAngle] ?? 'Prioritize representative movement quality and coach-visible beta.',
        estimatedCueRows,
        estimatedReviewRows: estimatedCueRows * reviewerSlotsPerCue,
        reviewerSlotsPerCue,
        targetClipCount: target,
        wallAngle,
      };
    },
  );

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
      maxReviewerScoreSpreadPerCriterion: cueAcceptance.maxReviewerScoreSpreadPerCriterion,
      minAverageCueScore: cueAcceptance.minAverageCueScore,
      minClips: cueAcceptance.minClips,
      minDistinctReviewersPerCue: cueAcceptance.minDistinctReviewersPerCue,
      minDistinctReviewersPerClip: cueAcceptance.minDistinctReviewersPerClip,
      minReviewsPerCue: cueAcceptance.minReviewsPerCue,
      requiredReviewModes: cueAcceptance.requiredReviewModes,
      requiredReviewerRoles: cueAcceptance.requiredReviewerRoles,
      requiredWallAngles: cueAcceptance.requiredWallAngles,
      collectionBatches,
      collectionChecklist: [
        'Capture only consented indoor climbing attempts with bystanders out of frame or consent handled.',
        'Keep raw video local; share packet-only review worksheets with coaches.',
        'Balance the first collection sprint across required wall angles before adding more clips to a single style.',
        'Adjudicate cue rows whose reviewer score spread exceeds the configured consensus threshold.',
        'Record reviewer ids and 1-5 scores only after a real coach completes the worksheet.',
      ],
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
