import type { CoachReviewConsentRecord } from './coachConsentRepository';
import type { LocalAnalysisReport } from './contracts';
import {
  formatCueValidationGateFailures,
  formatCueValidationGateSummary,
  validateCueValidationCompletedDataset,
  type CueValidationGateResult,
} from './cueValidationDataset';
import {
  assertCueValidationReviewWorksheetCsvIsPrivacySafe,
  assertCueValidationReviewWorksheetIsPrivacySafe,
  assertCueValidationStudySeedIsPrivacySafe,
  buildCueValidationDatasetFromCompletedWorksheetCsv,
  buildCueValidationReviewWorksheet,
  buildCueValidationReviewWorksheetCsv,
  buildCueValidationStudySeed,
  defaultCueValidationStudyAcceptance,
  formatCueValidationCompletedDatasetSummary,
  formatCueValidationReviewWorksheetSummary,
  formatCueValidationStudySeedSummary,
  type CueValidationCompletedDataset,
  type CueValidationStudyAcceptance,
  type CueValidationStudySeedOptions,
} from './cueValidationStudy';
import type { DrillPracticeRecord } from './drillPracticeRepository';
import type { ReportAnnotation } from './reportAnnotationRepository';

export const coachValidationWorkflowSchemaVersion = 'movebeta.coach-validation-workflow.v1';

export type CoachValidationWorkflowStatus = 'blocked' | 'needs-consent' | 'needs-review' | 'ready';

export type CoachValidationWorkflowProgress = {
  averageScore: number;
  consentedClipCount: number;
  cueCount: number;
  estimatedTargetReviewRows: number;
  missingWallAngles: CueValidationStudyAcceptance['requiredWallAngles'];
  reviewCount: number;
  targetClipCount: number;
  targetWallAngles: CueValidationStudyAcceptance['requiredWallAngles'];
  wallAngles: CueValidationStudyAcceptance['requiredWallAngles'];
  worksheetRowCount: number;
};

export type CoachValidationWorkflow = {
  action: string;
  completedDataset?: CueValidationCompletedDataset;
  datasetGate?: CueValidationGateResult;
  errors: string[];
  progress: CoachValidationWorkflowProgress;
  schemaVersion: typeof coachValidationWorkflowSchemaVersion;
  seedSummary: string;
  shareableDatasetJson?: string;
  shareableStatusJson: string;
  status: CoachValidationWorkflowStatus;
  worksheetCsv: string;
  worksheetSummary: string;
};

export type CoachValidationWorkflowOptions = {
  acceptance?: Partial<CueValidationStudyAcceptance>;
  annotations?: ReportAnnotation[];
  appVersion?: string;
  completedWorksheetCsv?: string;
  drillPractice?: DrillPracticeRecord[];
  generatedAt?: string;
};

function sortWallAngles(wallAngles: Array<'overhang' | 'slab' | 'vertical'>) {
  const order = ['slab', 'vertical', 'overhang'];
  return [...wallAngles].sort((a, b) => order.indexOf(a) - order.indexOf(b));
}

function buildProgress({
  acceptance,
  gate,
  reviewCount = 0,
  seed,
  worksheetRowCount,
}: {
  acceptance: CueValidationStudyAcceptance;
  gate?: CueValidationGateResult;
  reviewCount?: number;
  seed: ReturnType<typeof buildCueValidationStudySeed>;
  worksheetRowCount: number;
}): CoachValidationWorkflowProgress {
  const wallAngles = sortWallAngles([
    ...new Set(seed.clips.map((clip) => clip.packet.session.wallAngle)),
  ] as Array<'overhang' | 'slab' | 'vertical'>);
  const missingWallAngles = sortWallAngles(acceptance.requiredWallAngles.filter((wallAngle) => !wallAngles.includes(wallAngle)));
  const reviewerSlotsPerCue = Math.max(acceptance.minDistinctReviewersPerClip, acceptance.minReviewsPerCue);

  return {
    averageScore: gate?.summary.averageScore ?? 0,
    consentedClipCount: seed.clipCount,
    cueCount: seed.cueCount,
    estimatedTargetReviewRows: acceptance.minClips * reviewerSlotsPerCue,
    missingWallAngles,
    reviewCount,
    targetClipCount: acceptance.minClips,
    targetWallAngles: acceptance.requiredWallAngles,
    wallAngles,
    worksheetRowCount,
  };
}

function buildStatusExport({
  action,
  errors,
  progress,
  status,
}: {
  action: string;
  errors: string[];
  progress: CoachValidationWorkflowProgress;
  status: CoachValidationWorkflowStatus;
}) {
  return JSON.stringify(
    {
      action,
      errors,
      privacy: {
        keyFramesIncluded: false,
        landmarksIncluded: false,
        rawUrisIncluded: false,
        rawVideoIncluded: false,
        videoLeavesDevice: false,
      },
      progress,
      schemaVersion: coachValidationWorkflowSchemaVersion,
      status,
    },
    null,
    2,
  );
}

export function buildCoachValidationWorkflow(
  reports: LocalAnalysisReport[],
  consents: CoachReviewConsentRecord[],
  options: CoachValidationWorkflowOptions = {},
): CoachValidationWorkflow {
  const acceptance = {
    ...defaultCueValidationStudyAcceptance,
    ...(options.acceptance ?? {}),
  };
  const seedOptions: CueValidationStudySeedOptions = {
    acceptance,
    annotations: options.annotations,
    appVersion: options.appVersion,
    drillPractice: options.drillPractice,
    generatedAt: options.generatedAt,
  };
  const seed = buildCueValidationStudySeed(reports, consents, seedOptions);
  assertCueValidationStudySeedIsPrivacySafe(seed);
  const worksheet = buildCueValidationReviewWorksheet(seed, { generatedAt: options.generatedAt });
  assertCueValidationReviewWorksheetIsPrivacySafe(worksheet);
  const worksheetCsv = buildCueValidationReviewWorksheetCsv(worksheet);
  assertCueValidationReviewWorksheetCsvIsPrivacySafe(worksheetCsv);
  const completedWorksheetCsv = options.completedWorksheetCsv?.trim() ?? '';

  if (seed.clipCount === 0) {
    const action = 'Grant cue-validation consent on real local reports before building reviewer worksheets.';
    const progress = buildProgress({ acceptance, seed, worksheetRowCount: worksheet.rowCount });

    return {
      action,
      errors: [],
      progress,
      schemaVersion: coachValidationWorkflowSchemaVersion,
      seedSummary: formatCueValidationStudySeedSummary(seed),
      shareableStatusJson: buildStatusExport({ action, errors: [], progress, status: 'needs-consent' }),
      status: 'needs-consent',
      worksheetCsv,
      worksheetSummary: formatCueValidationReviewWorksheetSummary(worksheet),
    };
  }

  if (completedWorksheetCsv.length === 0) {
    const action = 'Complete the reviewer worksheet with real coach identities and 1-5 scores.';
    const progress = buildProgress({ acceptance, seed, worksheetRowCount: worksheet.rowCount });

    return {
      action,
      errors: [],
      progress,
      schemaVersion: coachValidationWorkflowSchemaVersion,
      seedSummary: formatCueValidationStudySeedSummary(seed),
      shareableStatusJson: buildStatusExport({ action, errors: [], progress, status: 'needs-review' }),
      status: 'needs-review',
      worksheetCsv,
      worksheetSummary: formatCueValidationReviewWorksheetSummary(worksheet),
    };
  }

  try {
    const completedDataset = buildCueValidationDatasetFromCompletedWorksheetCsv(seed, completedWorksheetCsv, {
      appVersion: options.appVersion,
      generatedAt: options.generatedAt,
    });
    const datasetGate = validateCueValidationCompletedDataset(completedDataset);
    const reviewCount = completedDataset.clips.reduce((sum, clip) => sum + clip.reviews.length, 0);
    const status = datasetGate.ready ? 'ready' : 'blocked';
    const action = datasetGate.ready
      ? 'Commit the completed dataset JSON and run npm run validation:cue before production claims.'
      : formatCueValidationGateFailures(datasetGate, 1);
    const progress = buildProgress({
      acceptance,
      gate: datasetGate,
      reviewCount,
      seed,
      worksheetRowCount: worksheet.rowCount,
    });
    const datasetSummary = formatCueValidationCompletedDatasetSummary(completedDataset);
    const gateSummary = formatCueValidationGateSummary(datasetGate);

    return {
      action,
      completedDataset,
      datasetGate,
      errors: [],
      progress,
      schemaVersion: coachValidationWorkflowSchemaVersion,
      seedSummary: formatCueValidationStudySeedSummary(seed),
      shareableDatasetJson: JSON.stringify(completedDataset, null, 2),
      shareableStatusJson: buildStatusExport({ action, errors: [], progress, status }),
      status,
      worksheetCsv,
      worksheetSummary: `${datasetSummary} · ${gateSummary}`,
    };
  } catch (error) {
    const errors = [error instanceof Error ? error.message : 'Completed validation worksheet could not be parsed.'];
    const action = 'Fix the completed worksheet CSV, then rebuild the validation dataset locally.';
    const progress = buildProgress({ acceptance, seed, worksheetRowCount: worksheet.rowCount });

    return {
      action,
      errors,
      progress,
      schemaVersion: coachValidationWorkflowSchemaVersion,
      seedSummary: formatCueValidationStudySeedSummary(seed),
      shareableStatusJson: buildStatusExport({ action, errors, progress, status: 'blocked' }),
      status: 'blocked',
      worksheetCsv,
      worksheetSummary: formatCueValidationReviewWorksheetSummary(worksheet),
    };
  }
}
