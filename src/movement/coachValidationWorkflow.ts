import type { CoachReviewConsentRecord } from './coachConsentRepository';
import type { LocalAnalysisReport } from './contracts';
import type { CueTrustValidationEvidence } from './cueTrust';
import {
  formatCueValidationGateFailures,
  formatCueValidationGateSummary,
  validateCueValidationCompletedDataset,
  type CueValidationGateResult,
} from './cueValidationDataset';
import {
  assertCueValidationReviewWorksheetCsvIsPrivacySafe,
  assertCueValidationReviewWorksheetIsPrivacySafe,
  assertCueValidationReviewerAssignmentPacketIsPrivacySafe,
  assertCueValidationStudySeedIsPrivacySafe,
  assertCueValidationWorksheetPreflightIsPrivacySafe,
  buildCueValidationDatasetFromCompletedWorksheetCsv,
  buildCueValidationReviewerAssignmentPacket,
  buildCueValidationReviewWorksheet,
  buildCueValidationReviewWorksheetCsv,
  buildCueValidationStudySeed,
  buildCueValidationWorksheetPreflight,
  defaultCueValidationStudyAcceptance,
  formatCueValidationCompletedDatasetSummary,
  formatCueValidationReviewerAssignmentPacketSummary,
  formatCueValidationReviewWorksheetSummary,
  formatCueValidationStudySeedSummary,
  formatCueValidationWorksheetPreflightSummary,
  type CueValidationCompletedDataset,
  type CueValidationReviewerAssignmentPacket,
  type CueValidationStudyAcceptance,
  type CueValidationStudySeedOptions,
  type CueValidationWorksheetPreflight,
} from './cueValidationStudy';
import {
  assertCueValidationReliabilityReportIsPrivacySafe,
  buildCueValidationReliabilityReport,
  formatCueValidationReliabilitySummary,
  type CueValidationReliabilityReport,
} from './cueValidationReliability';
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
  reviewerAssignment: CueValidationReviewerAssignmentPacket;
  reviewerAssignmentSummary: string;
  reliabilityReport?: CueValidationReliabilityReport;
  reliabilitySummary?: string;
  schemaVersion: typeof coachValidationWorkflowSchemaVersion;
  seedSummary: string;
  shareableDatasetJson?: string;
  shareableStatusJson: string;
  status: CoachValidationWorkflowStatus;
  worksheetPreflight: CueValidationWorksheetPreflight;
  worksheetPreflightSummary: string;
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

function average(values: number[]) {
  if (values.length === 0) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function reviewAverage(review: CueValidationCompletedDataset['clips'][number]['reviews'][number]) {
  return average([review.drillFit, review.relevance, review.safetyLanguage, review.timingAccuracy]);
}

export function buildCueTrustValidationEvidenceForReport(
  workflow: Pick<CoachValidationWorkflow, 'completedDataset' | 'datasetGate'>,
  report: LocalAnalysisReport,
): CueTrustValidationEvidence | undefined {
  if (!workflow.completedDataset) return undefined;

  const datasetGate = workflow.datasetGate ?? validateCueValidationCompletedDataset(workflow.completedDataset);
  const acceptance = {
    ...defaultCueValidationStudyAcceptance,
    ...workflow.completedDataset.acceptance,
  };
  const reportCueIds = report.cues.map((cue) => cue.id);
  const clip = workflow.completedDataset.clips.find(
    (item) => item.clipId === report.id || item.packet.reportId === report.id,
  );

  if (!clip) {
    return {
      acceptance: 'insufficient-data',
      averageScore: 0,
      failingCueIds: [],
      reviewedCueCount: 0,
      unreviewedCueIds: reportCueIds,
    };
  }

  const failingCueIds: string[] = [];
  const unreviewedCueIds: string[] = [];
  const reviewedCueIds: string[] = [];
  const scoredReviews = clip.reviews.filter((review) => reportCueIds.includes(review.cueId));

  for (const cueId of reportCueIds) {
    const reviews = scoredReviews.filter((review) => review.cueId === cueId);
    const reviewerCount = new Set(reviews.map((review) => review.reviewerId)).size;
    const cueAverage = average(reviews.map(reviewAverage));

    if (reviews.length < acceptance.minReviewsPerCue || reviewerCount < acceptance.minDistinctReviewersPerClip) {
      unreviewedCueIds.push(cueId);
      continue;
    }

    reviewedCueIds.push(cueId);
    if (cueAverage < acceptance.minAverageCueScore || reviews.some((review) => review.safetyLanguage < 4)) {
      failingCueIds.push(cueId);
    }
  }

  const averageScore = Number(average(scoredReviews.map(reviewAverage)).toFixed(2));

  return {
    acceptance: datasetGate.ready ? 'pass' : reviewedCueIds.length > 0 ? 'needs-review' : 'insufficient-data',
    averageScore,
    failingCueIds,
    reviewedCueCount: reviewedCueIds.length,
    unreviewedCueIds,
  };
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
  const reviewerAssignment = buildCueValidationReviewerAssignmentPacket(seed, { generatedAt: options.generatedAt });
  assertCueValidationReviewerAssignmentPacketIsPrivacySafe(reviewerAssignment);
  const reviewerAssignmentSummary = formatCueValidationReviewerAssignmentPacketSummary(reviewerAssignment);
  const completedWorksheetCsv = options.completedWorksheetCsv?.trim() ?? '';
  const worksheetPreflight = buildCueValidationWorksheetPreflight(seed, completedWorksheetCsv, {
    generatedAt: options.generatedAt,
  });
  assertCueValidationWorksheetPreflightIsPrivacySafe(worksheetPreflight);
  const worksheetPreflightSummary = formatCueValidationWorksheetPreflightSummary(worksheetPreflight);

  if (seed.clipCount === 0) {
    const action = 'Grant cue-validation consent on real local reports before building reviewer worksheets.';
    const progress = buildProgress({ acceptance, seed, worksheetRowCount: worksheet.rowCount });

    return {
      action,
      errors: [],
      progress,
      reviewerAssignment,
      reviewerAssignmentSummary,
      schemaVersion: coachValidationWorkflowSchemaVersion,
      seedSummary: formatCueValidationStudySeedSummary(seed),
      shareableStatusJson: buildStatusExport({ action, errors: [], progress, status: 'needs-consent' }),
      status: 'needs-consent',
      worksheetPreflight,
      worksheetPreflightSummary,
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
      reviewerAssignment,
      reviewerAssignmentSummary,
      schemaVersion: coachValidationWorkflowSchemaVersion,
      seedSummary: formatCueValidationStudySeedSummary(seed),
      shareableStatusJson: buildStatusExport({ action, errors: [], progress, status: 'needs-review' }),
      status: 'needs-review',
      worksheetPreflight,
      worksheetPreflightSummary,
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
    const reliabilityReport = buildCueValidationReliabilityReport(completedDataset, { generatedAt: options.generatedAt });
    assertCueValidationReliabilityReportIsPrivacySafe(reliabilityReport);
    const reviewCount = completedDataset.clips.reduce((sum, clip) => sum + clip.reviews.length, 0);
    const status = datasetGate.ready && reliabilityReport.summary.status === 'ready' ? 'ready' : 'blocked';
    const action = datasetGate.ready
      ? reliabilityReport.summary.status === 'ready'
        ? 'Commit the completed dataset JSON and run npm run validation:cue before production claims.'
        : 'Resolve low-consensus cue reviews before promoting real-world validation evidence.'
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
    const reliabilitySummary = formatCueValidationReliabilitySummary(reliabilityReport);

    return {
      action,
      completedDataset,
      datasetGate,
      errors: [],
      progress,
      reliabilityReport,
      reliabilitySummary,
      reviewerAssignment,
      reviewerAssignmentSummary,
      schemaVersion: coachValidationWorkflowSchemaVersion,
      seedSummary: formatCueValidationStudySeedSummary(seed),
      shareableDatasetJson: JSON.stringify(completedDataset, null, 2),
      shareableStatusJson: buildStatusExport({ action, errors: [], progress, status }),
      status,
      worksheetPreflight,
      worksheetPreflightSummary,
      worksheetCsv,
      worksheetSummary: `${datasetSummary} · ${gateSummary} · ${reliabilitySummary}`,
    };
  } catch (error) {
    const errors = [error instanceof Error ? error.message : 'Completed validation worksheet could not be parsed.'];
    const action = 'Fix the completed worksheet CSV, then rebuild the validation dataset locally.';
    const progress = buildProgress({ acceptance, seed, worksheetRowCount: worksheet.rowCount });

    return {
      action,
      errors,
      progress,
      reviewerAssignment,
      reviewerAssignmentSummary,
      schemaVersion: coachValidationWorkflowSchemaVersion,
      seedSummary: formatCueValidationStudySeedSummary(seed),
      shareableStatusJson: buildStatusExport({ action, errors, progress, status: 'blocked' }),
      status: 'blocked',
      worksheetPreflight,
      worksheetPreflightSummary,
      worksheetCsv,
      worksheetSummary: formatCueValidationReviewWorksheetSummary(worksheet),
    };
  }
}
