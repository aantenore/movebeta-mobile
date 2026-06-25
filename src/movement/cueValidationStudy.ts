import { z } from 'zod';

import {
  consentRecordToPrivacyConsent,
  isCoachReviewConsentActive,
  type CoachReviewConsentRecord,
} from './coachConsentRepository';
import {
  assertCoachPacketIsPrivacySafe,
  buildCoachReviewPacket,
  CoachReviewPacketSchema,
  type CoachReviewPacket,
} from './coachReviewPacket';
import type { LocalAnalysisReport } from './contracts';
import type { DrillPracticeRecord } from './drillPracticeRepository';
import type { ReportAnnotation } from './reportAnnotationRepository';

export const CueValidationStudyAcceptanceSchema = z.object({
  maxReviewerScoreSpreadPerCriterion: z.number().min(0).max(4).default(1),
  minAverageCueScore: z.number().min(1).max(5),
  minClips: z.number().int().positive(),
  minDistinctReviewersPerCue: z.number().int().positive().default(2),
  minDistinctReviewersPerClip: z.number().int().positive(),
  minReviewsPerCue: z.number().int().positive(),
  requiredReviewModes: z.array(z.literal('packet-only')).nonempty(),
  requiredReviewerRoles: z.array(z.literal('coach')).nonempty(),
  requiredWallAngles: z.array(z.enum(['slab', 'vertical', 'overhang'])).nonempty(),
});

export const CueValidationStudyReviewTaskSchema = z.object({
  cueId: z.string(),
  cueTitle: z.string(),
  requiredScores: z.array(z.enum(['drillFit', 'relevance', 'safetyLanguage', 'timingAccuracy'])),
  reviewMode: z.literal('packet-only'),
  reviewerRole: z.literal('coach'),
  rubricIds: z.array(z.string()),
  status: z.literal('needs-review'),
});

export const CueValidationStudyClipSchema = z.object({
  clipId: z.string(),
  consentRecordId: z.string(),
  packet: CoachReviewPacketSchema,
  reviewTasks: z.array(CueValidationStudyReviewTaskSchema),
});

export const CueValidationStudySeedSchema = z.object({
  acceptance: CueValidationStudyAcceptanceSchema,
  appVersion: z.string(),
  clipCount: z.number().int().nonnegative(),
  clips: z.array(CueValidationStudyClipSchema),
  cueCount: z.number().int().nonnegative(),
  generatedAt: z.string(),
  privacy: z.object({
    keyFramesIncluded: z.literal(false),
    landmarksIncluded: z.literal(false),
    privateNotesIncluded: z.literal(false),
    rawUrisIncluded: z.literal(false),
    rawVideoIncluded: z.literal(false),
    reviewerScoresInvented: z.literal(false),
    videoLeavesDevice: z.literal(false),
  }),
  readyForValidation: z.literal(false),
  reviewerInstructions: z.array(z.string()),
  schemaVersion: z.literal('movebeta.cue-validation-study-seed.v1'),
});

export const cueValidationClipIntakeManifestSchemaVersion = 'movebeta.cue-validation-clip-intake-manifest.v1';

export const CueValidationClipIntakeManifestClipSchema = z.object({
  clipId: z.string(),
  consentRecordId: z.string(),
  cueCount: z.number().int().nonnegative(),
  durationMs: z.number().positive(),
  grade: z.string(),
  gym: z.string(),
  packetReportId: z.string(),
  requiredCoachReviewRows: z.number().int().nonnegative(),
  status: z.literal('ready-for-packet-review'),
  title: z.string(),
  wallAngle: z.enum(['slab', 'vertical', 'overhang']),
});

export const CueValidationClipIntakeManifestSchema = z.object({
  acceptance: CueValidationStudyAcceptanceSchema,
  clips: z.array(CueValidationClipIntakeManifestClipSchema),
  generatedAt: z.string(),
  instructions: z.array(z.string()),
  privacy: z.object({
    coachPacketsIncluded: z.literal(false),
    keyFramesIncluded: z.literal(false),
    landmarksIncluded: z.literal(false),
    privateNotesIncluded: z.literal(false),
    rawUrisIncluded: z.literal(false),
    rawVideoIncluded: z.literal(false),
    reviewerScoresInvented: z.literal(false),
    videoLeavesDevice: z.literal(false),
  }),
  schemaVersion: z.literal(cueValidationClipIntakeManifestSchemaVersion),
  sourceSeedGeneratedAt: z.string(),
  summary: z.object({
    clipCount: z.number().int().nonnegative(),
    cueCount: z.number().int().nonnegative(),
    missingWallAngles: z.array(z.enum(['slab', 'vertical', 'overhang'])),
    requiredCoachReviewRows: z.number().int().nonnegative(),
    status: z.enum(['needs-consent', 'needs-coverage', 'ready-for-review']),
    targetClipCount: z.number().int().positive(),
    targetWallAngles: z.array(z.enum(['slab', 'vertical', 'overhang'])),
    wallAngles: z.array(z.enum(['slab', 'vertical', 'overhang'])),
  }),
});

export const CueValidationReviewWorksheetRowSchema = z.object({
  clipId: z.string(),
  consentRecordId: z.string(),
  cueId: z.string(),
  cueTitle: z.string(),
  id: z.string(),
  packetReportId: z.string(),
  requiredScores: z.array(z.enum(['drillFit', 'relevance', 'safetyLanguage', 'timingAccuracy'])),
  reviewMode: z.literal('packet-only'),
  reviewerId: z.null(),
  reviewerRole: z.literal('coach'),
  reviewerSlot: z.number().int().positive(),
  scores: z.object({
    drillFit: z.null(),
    relevance: z.null(),
    safetyLanguage: z.null(),
    timingAccuracy: z.null(),
  }),
  status: z.literal('awaiting-real-review'),
});

export const CueValidationReviewWorksheetSchema = z.object({
  generatedAt: z.string(),
  privacy: z.object({
    keyFramesIncluded: z.literal(false),
    landmarksIncluded: z.literal(false),
    privateNotesIncluded: z.literal(false),
    rawUrisIncluded: z.literal(false),
    rawVideoIncluded: z.literal(false),
    reviewerScoresInvented: z.literal(false),
    videoLeavesDevice: z.literal(false),
  }),
  requiredReviewerCount: z.number().int().positive(),
  reviewerInstructions: z.array(z.string()),
  rowCount: z.number().int().nonnegative(),
  rows: z.array(CueValidationReviewWorksheetRowSchema),
  schemaVersion: z.literal('movebeta.cue-validation-review-worksheet.v1'),
  seedGeneratedAt: z.string(),
  sourceClipCount: z.number().int().nonnegative(),
  sourceCueCount: z.number().int().nonnegative(),
});

export const cueValidationWorksheetPreflightSchemaVersion = 'movebeta.cue-validation-worksheet-preflight.v1';

const CueValidationWorksheetPreflightStatusSchema = z.enum(['blocked', 'empty', 'ready', 'review']);
const CueValidationWorksheetPreflightCheckStatusSchema = z.enum(['blocked', 'ready', 'review']);

export const CueValidationWorksheetPreflightCheckSchema = z.object({
  action: z.string(),
  detail: z.string(),
  key: z.enum([
    'privacy-boundary',
    'csv-header',
    'row-coverage',
    'source-seed-match',
    'reviewer-identities',
    'score-completeness',
  ]),
  label: z.string(),
  status: CueValidationWorksheetPreflightCheckStatusSchema,
});

export const CueValidationWorksheetPreflightSchema = z.object({
  checks: z.array(CueValidationWorksheetPreflightCheckSchema).length(6),
  generatedAt: z.string(),
  privacy: z.object({
    credentialValuesIncluded: z.literal(false),
    localPathsIncluded: z.literal(false),
    rawArtifactsIncluded: z.literal(false),
    rawWorksheetIncluded: z.literal(false),
    rawVideoIncluded: z.literal(false),
    reportIdsIncluded: z.literal(false),
    reviewerIdentitiesIncluded: z.literal(false),
    reviewerScoresIncluded: z.literal(false),
    tokenLikeValuesIncluded: z.literal(false),
  }),
  schemaVersion: z.literal(cueValidationWorksheetPreflightSchemaVersion),
  summary: z.object({
    completeRows: z.number().int().nonnegative(),
    distinctReviewerCount: z.number().int().nonnegative(),
    duplicateRowCount: z.number().int().nonnegative(),
    expectedRows: z.number().int().nonnegative(),
    invalidScoreCount: z.number().int().nonnegative(),
    mismatchedRowCount: z.number().int().nonnegative(),
    missingReviewerIdCount: z.number().int().nonnegative(),
    missingRowCount: z.number().int().nonnegative(),
    missingScoreCount: z.number().int().nonnegative(),
    nextAction: z.string(),
    receivedRows: z.number().int().nonnegative(),
    status: CueValidationWorksheetPreflightStatusSchema,
    unknownRowCount: z.number().int().nonnegative(),
  }),
});

export const cueValidationReviewerOnboardingPacketSchemaVersion = 'movebeta.cue-validation-reviewer-onboarding.v1';

export const cueValidationReviewerAssignmentPacketSchemaVersion = 'movebeta.cue-validation-reviewer-assignment.v1';

export const CueValidationReviewerOnboardingPacketSchema = z.object({
  acceptance: CueValidationStudyAcceptanceSchema,
  commands: z.array(
    z.object({
      key: z.string(),
      label: z.string(),
      owner: z.enum(['product', 'coach', 'qa']),
      purpose: z.string(),
    }),
  ),
  generatedAt: z.string(),
  instructions: z.array(z.string()),
  privacy: z.object({
    coachPacketsIncluded: z.literal(false),
    credentialValuesIncluded: z.literal(false),
    keyFramesIncluded: z.literal(false),
    landmarksIncluded: z.literal(false),
    localPathsIncluded: z.literal(false),
    privateNotesIncluded: z.literal(false),
    rawArtifactsIncluded: z.literal(false),
    rawUrisIncluded: z.literal(false),
    rawVideoIncluded: z.literal(false),
    reviewerIdentitiesIncluded: z.literal(false),
    reviewerScoresInvented: z.literal(false),
    videoLeavesDevice: z.literal(false),
  }),
  reviewCriteria: z.array(
    z.object({
      id: z.enum(['drillFit', 'relevance', 'safetyLanguage', 'timingAccuracy']),
      passingScore: z.number().min(1).max(5),
      prompt: z.string(),
    }),
  ),
  schemaVersion: z.literal(cueValidationReviewerOnboardingPacketSchemaVersion),
  sourceSeedGeneratedAt: z.string(),
  summary: z.object({
    estimatedReviewRows: z.number().int().nonnegative(),
    missingWallAngles: z.array(z.enum(['slab', 'vertical', 'overhang'])),
    reviewerSlotsNeeded: z.number().int().nonnegative(),
    sourceClipCount: z.number().int().nonnegative(),
    sourceCueCount: z.number().int().nonnegative(),
    status: z.enum(['needs-consent', 'needs-coverage', 'ready-for-review']),
    targetClipCount: z.number().int().positive(),
  }),
});

export const CueValidationReviewerAssignmentSchema = z.object({
  assignmentKey: z.string(),
  clipCount: z.number().int().nonnegative(),
  cueCount: z.number().int().nonnegative(),
  expectedScoreCells: z.number().int().nonnegative(),
  packetOnly: z.literal(true),
  reviewMode: z.literal('packet-only'),
  reviewerRole: z.literal('coach'),
  reviewerSlot: z.number().int().positive(),
  rowCount: z.number().int().nonnegative(),
  wallAngles: z.array(z.enum(['slab', 'vertical', 'overhang'])),
  worksheetFilter: z.string(),
});

export const CueValidationReviewerAssignmentPacketSchema = z.object({
  acceptance: CueValidationStudyAcceptanceSchema,
  assignments: z.array(CueValidationReviewerAssignmentSchema),
  generatedAt: z.string(),
  instructions: z.array(z.string()),
  privacy: z.object({
    coachPacketsIncluded: z.literal(false),
    credentialValuesIncluded: z.literal(false),
    keyFramesIncluded: z.literal(false),
    landmarksIncluded: z.literal(false),
    localPathsIncluded: z.literal(false),
    privateNotesIncluded: z.literal(false),
    rawArtifactsIncluded: z.literal(false),
    rawUrisIncluded: z.literal(false),
    rawVideoIncluded: z.literal(false),
    rawWorksheetIncluded: z.literal(false),
    reportIdsIncluded: z.literal(false),
    reviewerIdentitiesIncluded: z.literal(false),
    reviewerScoresIncluded: z.literal(false),
    reviewerScoresInvented: z.literal(false),
    videoLeavesDevice: z.literal(false),
  }),
  schemaVersion: z.literal(cueValidationReviewerAssignmentPacketSchemaVersion),
  sourceSeedGeneratedAt: z.string(),
  summary: z.object({
    assignmentCount: z.number().int().nonnegative(),
    estimatedScoreCells: z.number().int().nonnegative(),
    estimatedWorksheetRows: z.number().int().nonnegative(),
    maxRowsPerReviewerSlot: z.number().int().nonnegative(),
    missingWallAngles: z.array(z.enum(['slab', 'vertical', 'overhang'])),
    rowsPerReviewerSlot: z.number().int().nonnegative(),
    reviewerSlots: z.number().int().nonnegative(),
    sourceClipCount: z.number().int().nonnegative(),
    sourceCueCount: z.number().int().nonnegative(),
    status: z.enum(['needs-consent', 'needs-coverage', 'ready-for-assignment']),
    targetClipCount: z.number().int().positive(),
  }),
});

const CueValidationCompletedReviewSchema = z.object({
  cueId: z.string(),
  drillFit: z.number().int().min(1).max(5),
  relevance: z.number().int().min(1).max(5),
  reviewMode: z.literal('packet-only'),
  reviewerId: z.string().min(1),
  reviewerRole: z.literal('coach'),
  safetyLanguage: z.number().int().min(1).max(5),
  timingAccuracy: z.number().int().min(1).max(5),
});

export const CueValidationCompletedDatasetSchema = z.object({
  acceptance: CueValidationStudyAcceptanceSchema,
  appVersion: z.string(),
  clips: z.array(
    z.object({
      clipId: z.string(),
      consentRecordId: z.string(),
      packet: CoachReviewPacketSchema,
      reviews: z.array(CueValidationCompletedReviewSchema),
    }),
  ),
  generatedAt: z.string(),
  schemaVersion: z.literal('movebeta.cue-validation-dataset.v1'),
});

export type CueValidationStudyAcceptance = z.infer<typeof CueValidationStudyAcceptanceSchema>;
export type CueValidationStudySeed = z.infer<typeof CueValidationStudySeedSchema>;
export type CueValidationClipIntakeManifest = z.infer<typeof CueValidationClipIntakeManifestSchema>;
export type CueValidationReviewerOnboardingPacket = z.infer<typeof CueValidationReviewerOnboardingPacketSchema>;
export type CueValidationReviewerAssignmentPacket = z.infer<typeof CueValidationReviewerAssignmentPacketSchema>;
export type CueValidationReviewWorksheet = z.infer<typeof CueValidationReviewWorksheetSchema>;
export type CueValidationWorksheetPreflight = z.infer<typeof CueValidationWorksheetPreflightSchema>;
export type CueValidationCompletedDataset = z.infer<typeof CueValidationCompletedDatasetSchema>;

export type CueValidationStudySeedOptions = {
  acceptance?: Partial<CueValidationStudyAcceptance>;
  annotations?: ReportAnnotation[];
  appVersion?: string;
  drillPractice?: DrillPracticeRecord[];
  generatedAt?: string;
};

export type CueValidationReviewWorksheetOptions = {
  generatedAt?: string;
  reviewerCount?: number;
};

export type CueValidationReviewerOnboardingPacketOptions = {
  generatedAt?: string;
  reviewerCount?: number;
};

export type CueValidationReviewerAssignmentPacketOptions = {
  generatedAt?: string;
  reviewerCount?: number;
};

export type CueValidationClipIntakeManifestOptions = {
  generatedAt?: string;
  reviewerCount?: number;
};

export type CueValidationCompletedDatasetOptions = {
  appVersion?: string;
  generatedAt?: string;
};

export const defaultCueValidationStudyAcceptance: CueValidationStudyAcceptance = CueValidationStudyAcceptanceSchema.parse({
  maxReviewerScoreSpreadPerCriterion: 1,
  minAverageCueScore: 4,
  minClips: 20,
  minDistinctReviewersPerCue: 2,
  minDistinctReviewersPerClip: 2,
  minReviewsPerCue: 1,
  requiredReviewModes: ['packet-only'],
  requiredReviewerRoles: ['coach'],
  requiredWallAngles: ['slab', 'vertical', 'overhang'],
});

const forbiddenStudyKeyPattern =
  /"(?:fileUri|frames|keyFrame|landmarkFrames|landmarks|localUri|privateNote|rawVideo|rawVideoUri|uri|videoPath|videoUri)"\s*:/i;
const forbiddenCsvArtifactPattern =
  /\b(?:fileUri|frames|keyFrame|landmarkFrames|landmarks|localUri|privateNote|rawVideo|rawVideoUri|videoPath|videoUri)\b|file:\/\//i;
const forbiddenManifestValuePattern =
  /(file:\/\/|content:\/\/|asset:\/\/|ph:\/\/|\/Users\/|\/private\/|\/var\/mobile\/|[A-Za-z]:\\|\.mov\b|\.mp4\b|rawVideoUri|videoUri)/i;
const forbiddenOnboardingPacketValuePattern =
  /(file:\/\/|content:\/\/|asset:\/\/|ph:\/\/|\/Users\/|\/private\/|\/var\/mobile\/|[A-Za-z]:\\|\.mov\b|\.mp4\b|rawVideoUri|videoUri|BEGIN PRIVATE KEY|ghp_[A-Za-z0-9_]+|pat_[A-Za-z0-9_]+|sk_live_[A-Za-z0-9_]+|sk_test_[A-Za-z0-9_]+|eyJ[A-Za-z0-9_-]{20,})/i;

const wallAngleOrder = ['slab', 'vertical', 'overhang'] as const;

const worksheetCsvHeaders = [
  'worksheetRowId',
  'clipId',
  'packetReportId',
  'consentRecordId',
  'cueId',
  'cueTitle',
  'reviewerSlot',
  'reviewerId',
  'reviewerRole',
  'reviewMode',
  'relevance',
  'timingAccuracy',
  'drillFit',
  'safetyLanguage',
  'status',
] as const;

function byReportId<T extends { reportId: string }>(records: T[]) {
  const grouped = new Map<string, T[]>();

  for (const record of records) {
    grouped.set(record.reportId, [...(grouped.get(record.reportId) ?? []), record]);
  }

  return grouped;
}

function buildReviewTasks(packet: CoachReviewPacket) {
  const rubricIds = packet.reviewRubric.map((item) => item.id);

  return packet.analysis.cues.map((cue) =>
    CueValidationStudyReviewTaskSchema.parse({
      cueId: cue.id,
      cueTitle: cue.title,
      requiredScores: ['relevance', 'timingAccuracy', 'drillFit', 'safetyLanguage'],
      reviewMode: 'packet-only',
      reviewerRole: 'coach',
      rubricIds,
      status: 'needs-review',
    }),
  );
}

function csvCell(value: string | number | null) {
  if (value === null) return '';
  const text = String(value);
  if (!/[",\n\r]/.test(text)) return text;
  return `"${text.replaceAll('"', '""')}"`;
}

function parseCsv(csv: string) {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = '';
  let inQuotes = false;

  for (let index = 0; index < csv.length; index += 1) {
    const char = csv[index];
    const next = csv[index + 1];

    if (inQuotes) {
      if (char === '"' && next === '"') {
        cell += '"';
        index += 1;
      } else if (char === '"') {
        inQuotes = false;
      } else {
        cell += char;
      }
      continue;
    }

    if (char === '"') {
      inQuotes = true;
      continue;
    }

    if (char === ',') {
      row.push(cell);
      cell = '';
      continue;
    }

    if (char === '\n') {
      row.push(cell);
      rows.push(row);
      row = [];
      cell = '';
      continue;
    }

    if (char === '\r') {
      continue;
    }

    cell += char;
  }

  if (inQuotes) {
    throw new Error('Cue validation worksheet CSV has an unterminated quoted cell.');
  }

  if (cell.length > 0 || row.length > 0) {
    row.push(cell);
    rows.push(row);
  }

  return rows.filter((csvRow) => csvRow.some((value) => value.trim().length > 0));
}

function parseScore(value: string, rowId: string, field: string) {
  const score = Number(value);
  if (!Number.isInteger(score) || score < 1 || score > 5) {
    throw new Error(`Cue validation worksheet row ${rowId} requires a ${field} score from 1 to 5.`);
  }
  return score;
}

function sortWallAngles(values: Array<'slab' | 'vertical' | 'overhang'>) {
  return [...values].sort((a, b) => wallAngleOrder.indexOf(a) - wallAngleOrder.indexOf(b));
}

function parseCompletedWorksheetCsv(csv: string) {
  assertCueValidationReviewWorksheetCsvIsPrivacySafe(csv);
  const [headerRow, ...rows] = parseCsv(csv);

  if (!headerRow) {
    throw new Error('Cue validation worksheet CSV is empty.');
  }

  if (headerRow.join(',') !== worksheetCsvHeaders.join(',')) {
    throw new Error('Cue validation worksheet CSV header does not match the expected worksheet format.');
  }

  return rows.map((row) => {
    const record = Object.fromEntries(worksheetCsvHeaders.map((header, index) => [header, row[index] ?? '']));
    const rowId = record.worksheetRowId;

    if (!rowId) {
      throw new Error('Cue validation worksheet row is missing worksheetRowId.');
    }

    if (!record.reviewerId) {
      throw new Error(`Cue validation worksheet row ${rowId} requires a real reviewerId.`);
    }

    return {
      clipId: record.clipId,
      consentRecordId: record.consentRecordId,
      cueId: record.cueId,
      cueTitle: record.cueTitle,
      packetReportId: record.packetReportId,
      reviewMode: record.reviewMode,
      reviewerId: record.reviewerId,
      reviewerRole: record.reviewerRole,
      reviewerSlot: Number(record.reviewerSlot),
      scores: {
        drillFit: parseScore(record.drillFit, rowId, 'drillFit'),
        relevance: parseScore(record.relevance, rowId, 'relevance'),
        safetyLanguage: parseScore(record.safetyLanguage, rowId, 'safetyLanguage'),
        timingAccuracy: parseScore(record.timingAccuracy, rowId, 'timingAccuracy'),
      },
      status: record.status,
      worksheetRowId: rowId,
    };
  });
}

function preflightCheck({
  action,
  detail,
  key,
  label,
  status,
}: {
  action: string;
  detail: string;
  key: z.infer<typeof CueValidationWorksheetPreflightCheckSchema>['key'];
  label: string;
  status: z.infer<typeof CueValidationWorksheetPreflightCheckStatusSchema>;
}) {
  return CueValidationWorksheetPreflightCheckSchema.parse({ action, detail, key, label, status });
}

function scoreState(value: string) {
  if (value.trim().length === 0) return 'missing';
  const score = Number(value);
  return Number.isInteger(score) && score >= 1 && score <= 5 ? 'valid' : 'invalid';
}

function worksheetPreflightNextAction({
  duplicateRowCount,
  expectedRows,
  headerValid,
  invalidScoreCount,
  mismatchedRowCount,
  missingReviewerIdCount,
  missingRowCount,
  missingScoreCount,
  parseError,
  privacyBlocked,
  status,
  unknownRowCount,
}: {
  duplicateRowCount: number;
  expectedRows: number;
  headerValid: boolean;
  invalidScoreCount: number;
  mismatchedRowCount: number;
  missingReviewerIdCount: number;
  missingRowCount: number;
  missingScoreCount: number;
  parseError: boolean;
  privacyBlocked: boolean;
  status: z.infer<typeof CueValidationWorksheetPreflightStatusSchema>;
  unknownRowCount: number;
}) {
  if (expectedRows === 0) return 'Grant cue-validation consent on local reports, then export a fresh worksheet CSV.';
  if (status === 'empty') return 'Paste the completed coach worksheet CSV before building the validation dataset.';
  if (privacyBlocked) return 'Remove raw artifact, local path, credential, or token-like text from the worksheet CSV.';
  if (parseError || !headerValid) return 'Export a fresh worksheet CSV from the same Sessions seed and preserve the header row.';
  if (unknownRowCount > 0 || duplicateRowCount > 0 || mismatchedRowCount > 0) {
    return 'Use the worksheet CSV generated from the current Sessions seed; do not add, duplicate, or rewrite row identity columns.';
  }
  if (missingRowCount > 0) return 'Complete every expected worksheet row before composing the dataset JSON.';
  if (missingReviewerIdCount > 0) return 'Fill every reviewerId cell with real coach reviewer identifiers.';
  if (missingScoreCount > 0) return 'Fill relevance, timingAccuracy, drillFit, and safetyLanguage scores from 1 to 5 for every row.';
  if (invalidScoreCount > 0) return 'Fix score cells so every score is an integer from 1 to 5.';
  return 'Worksheet CSV is ready for local dataset composition and validation.';
}

export function assertCueValidationWorksheetPreflightIsPrivacySafe(preflight: CueValidationWorksheetPreflight) {
  const text = JSON.stringify(preflight);
  if (forbiddenCsvArtifactPattern.test(text)) {
    throw new Error('Cue validation worksheet preflight contains raw artifact, local path, credential, or token-like text.');
  }
  return preflight;
}

export function buildCueValidationWorksheetPreflight(
  seed: CueValidationStudySeed,
  csv: string,
  { generatedAt = new Date().toISOString() }: { generatedAt?: string } = {},
): CueValidationWorksheetPreflight {
  assertCueValidationStudySeedIsPrivacySafe(seed);
  const parsedSeed = CueValidationStudySeedSchema.parse(seed);
  const expectedWorksheet = buildCueValidationReviewWorksheet(parsedSeed, { generatedAt });
  const expectedRows = new Map(expectedWorksheet.rows.map((row) => [row.id, row]));
  const trimmedCsv = csv.trim();
  const expectedRowCount = expectedWorksheet.rows.length;

  let privacyBlocked = false;
  let parseError = false;
  let headerValid = false;
  let receivedRows = 0;
  let completeRows = 0;
  let missingRowCount = expectedRowCount;
  let unknownRowCount = 0;
  let duplicateRowCount = 0;
  let mismatchedRowCount = 0;
  let missingReviewerIdCount = 0;
  let missingScoreCount = 0;
  let invalidScoreCount = 0;
  const seenRowIds = new Set<string>();
  const distinctReviewerIds = new Set<string>();

  if (trimmedCsv.length > 0) {
    try {
      assertCueValidationReviewWorksheetCsvIsPrivacySafe(csv);
    } catch {
      privacyBlocked = true;
    }
  }

  if (!privacyBlocked && trimmedCsv.length > 0) {
    try {
      const [headerRow, ...rows] = parseCsv(csv);
      headerValid = Boolean(headerRow) && headerRow.join(',') === worksheetCsvHeaders.join(',');
      receivedRows = rows.length;

      if (headerValid) {
        for (const row of rows) {
          const record = Object.fromEntries(worksheetCsvHeaders.map((header, index) => [header, row[index] ?? '']));
          const rowId = record.worksheetRowId;
          const expected = expectedRows.get(rowId);
          const duplicate = seenRowIds.has(rowId);
          const reviewerId = record.reviewerId.trim();
          const scoreStates = (['relevance', 'timingAccuracy', 'drillFit', 'safetyLanguage'] as const).map((field) =>
            scoreState(record[field]),
          );
          const missingScores = scoreStates.filter((state) => state === 'missing').length;
          const invalidScores = scoreStates.filter((state) => state === 'invalid').length;
          const reviewerMissing = reviewerId.length === 0;
          const matchesSeed =
            Boolean(expected) &&
            record.clipId === expected?.clipId &&
            record.packetReportId === expected?.packetReportId &&
            record.consentRecordId === expected?.consentRecordId &&
            record.cueId === expected?.cueId &&
            Number(record.reviewerSlot) === expected?.reviewerSlot &&
            record.reviewerRole === expected?.reviewerRole &&
            record.reviewMode === expected?.reviewMode;

          if (!rowId || !expected) unknownRowCount += 1;
          if (duplicate) duplicateRowCount += 1;
          if (expected && !duplicate && !matchesSeed) mismatchedRowCount += 1;
          if (reviewerMissing) missingReviewerIdCount += 1;
          if (!reviewerMissing) distinctReviewerIds.add(reviewerId);
          missingScoreCount += missingScores;
          invalidScoreCount += invalidScores;
          if (expected && !duplicate && matchesSeed && !reviewerMissing && missingScores === 0 && invalidScores === 0) {
            completeRows += 1;
          }
          if (rowId) seenRowIds.add(rowId);
        }

        missingRowCount = [...expectedRows.keys()].filter((rowId) => !seenRowIds.has(rowId)).length;
      }
    } catch {
      parseError = true;
    }
  }

  const status: z.infer<typeof CueValidationWorksheetPreflightStatusSchema> =
    expectedRowCount === 0 || trimmedCsv.length === 0
      ? 'empty'
      : privacyBlocked || parseError || !headerValid || unknownRowCount > 0 || duplicateRowCount > 0 || mismatchedRowCount > 0 || invalidScoreCount > 0
        ? 'blocked'
        : missingRowCount > 0 || missingReviewerIdCount > 0 || missingScoreCount > 0 || completeRows < expectedRowCount
          ? 'review'
          : 'ready';
  const nextAction = worksheetPreflightNextAction({
    duplicateRowCount,
    expectedRows: expectedRowCount,
    headerValid,
    invalidScoreCount,
    mismatchedRowCount,
    missingReviewerIdCount,
    missingRowCount,
    missingScoreCount,
    parseError,
    privacyBlocked,
    status,
    unknownRowCount,
  });
  const rowShapeBlocked = privacyBlocked || parseError || !headerValid || unknownRowCount > 0 || duplicateRowCount > 0;
  const packet = CueValidationWorksheetPreflightSchema.parse({
    checks: [
      preflightCheck({
        action: privacyBlocked ? 'Remove forbidden text before sharing or composing dataset evidence.' : 'Keep the CSV free of raw video, local paths, credentials, and token-like values.',
        detail: privacyBlocked ? 'Forbidden raw artifact-like text was rejected without echoing it.' : 'No forbidden raw artifact text is present in the preflight output.',
        key: 'privacy-boundary',
        label: 'Privacy boundary',
        status: privacyBlocked ? 'blocked' : 'ready',
      }),
      preflightCheck({
        action: headerValid ? 'Keep the exported worksheet header unchanged.' : 'Export a fresh worksheet CSV from Sessions and preserve the header row.',
        detail: headerValid ? 'Worksheet header matches the expected format.' : trimmedCsv.length === 0 ? 'No worksheet CSV has been pasted yet.' : 'Worksheet header is missing, malformed, or from a different format.',
        key: 'csv-header',
        label: 'CSV header',
        status: headerValid ? 'ready' : trimmedCsv.length === 0 ? 'review' : 'blocked',
      }),
      preflightCheck({
        action: rowShapeBlocked || missingRowCount > 0 ? 'Use the complete worksheet generated from the current Sessions seed.' : 'All expected worksheet rows are present.',
        detail: `${receivedRows}/${expectedRowCount} row(s) received; ${missingRowCount} missing, ${unknownRowCount} unknown, ${duplicateRowCount} duplicate.`,
        key: 'row-coverage',
        label: 'Row coverage',
        status: rowShapeBlocked ? 'blocked' : missingRowCount > 0 || expectedRowCount === 0 ? 'review' : 'ready',
      }),
      preflightCheck({
        action: mismatchedRowCount > 0 ? 'Do not edit clip, packet, consent, cue, reviewer slot, role, or review-mode columns.' : 'Keep row identity columns tied to the current seed.',
        detail: `${mismatchedRowCount} row(s) do not match the source study seed.`,
        key: 'source-seed-match',
        label: 'Seed match',
        status: rowShapeBlocked || mismatchedRowCount > 0 ? 'blocked' : expectedRowCount === 0 ? 'review' : 'ready',
      }),
      preflightCheck({
        action: missingReviewerIdCount > 0 ? 'Fill every reviewerId cell after a real coach completes review.' : 'Reviewer identities are present in the CSV and withheld from this preflight packet.',
        detail: `${missingReviewerIdCount} row(s) missing reviewerId; ${distinctReviewerIds.size} distinct reviewer(s) counted.`,
        key: 'reviewer-identities',
        label: 'Reviewer identities',
        status: rowShapeBlocked ? 'blocked' : missingReviewerIdCount > 0 || expectedRowCount === 0 ? 'review' : 'ready',
      }),
      preflightCheck({
        action:
          invalidScoreCount > 0
            ? 'Fix invalid score cells to integers from 1 to 5.'
            : missingScoreCount > 0
              ? 'Fill every 1-5 score cell after real coach review.'
              : 'Score cells are complete and withheld from this preflight packet.',
        detail: `${missingScoreCount} score cell(s) missing; ${invalidScoreCount} invalid score cell(s).`,
        key: 'score-completeness',
        label: 'Score completeness',
        status: rowShapeBlocked || invalidScoreCount > 0 ? 'blocked' : missingScoreCount > 0 || expectedRowCount === 0 ? 'review' : 'ready',
      }),
    ],
    generatedAt,
    privacy: {
      credentialValuesIncluded: false,
      localPathsIncluded: false,
      rawArtifactsIncluded: false,
      rawWorksheetIncluded: false,
      rawVideoIncluded: false,
      reportIdsIncluded: false,
      reviewerIdentitiesIncluded: false,
      reviewerScoresIncluded: false,
      tokenLikeValuesIncluded: false,
    },
    schemaVersion: cueValidationWorksheetPreflightSchemaVersion,
    summary: {
      completeRows,
      distinctReviewerCount: distinctReviewerIds.size,
      duplicateRowCount,
      expectedRows: expectedRowCount,
      invalidScoreCount,
      mismatchedRowCount,
      missingReviewerIdCount,
      missingRowCount,
      missingScoreCount,
      nextAction,
      receivedRows,
      status,
      unknownRowCount,
    },
  });

  return assertCueValidationWorksheetPreflightIsPrivacySafe(packet);
}

export function buildCueValidationStudySeed(
  reports: LocalAnalysisReport[],
  consents: CoachReviewConsentRecord[],
  options: CueValidationStudySeedOptions = {},
): CueValidationStudySeed {
  const reportsById = new Map(reports.map((report) => [report.id, report]));
  const annotationsByReport = new Map((options.annotations ?? []).map((annotation) => [annotation.reportId, annotation]));
  const drillPracticeByReport = byReportId(options.drillPractice ?? []);
  const acceptance = CueValidationStudyAcceptanceSchema.parse({
    ...defaultCueValidationStudyAcceptance,
    ...(options.acceptance ?? {}),
  });

  const clips = consents.flatMap((consent) => {
    if (!isCoachReviewConsentActive(consent) || !consent.scope.includes('cue-validation')) return [];

    const report = reportsById.get(consent.reportId);
    if (!report || report.cues.length === 0) return [];

    const packet = buildCoachReviewPacket(report, {
      annotation: annotationsByReport.get(report.id),
      consent: consentRecordToPrivacyConsent(consent),
      consentGrantedAt: consent.grantedAt,
      createdAt: options.generatedAt,
      drillPractice: drillPracticeByReport.get(report.id) ?? [],
    });
    assertCoachPacketIsPrivacySafe(packet);

    return [
      CueValidationStudyClipSchema.parse({
        clipId: report.id,
        consentRecordId: `${consent.reportId}:${consent.grantedAt}`,
        packet,
        reviewTasks: buildReviewTasks(packet),
      }),
    ];
  });

  clips.sort((a, b) => a.clipId.localeCompare(b.clipId));

  return CueValidationStudySeedSchema.parse({
    acceptance,
    appVersion: options.appVersion ?? '1.0.0',
    clipCount: clips.length,
    clips,
    cueCount: clips.reduce((sum, clip) => sum + clip.reviewTasks.length, 0),
    generatedAt: options.generatedAt ?? new Date().toISOString(),
    privacy: {
      keyFramesIncluded: false,
      landmarksIncluded: false,
      privateNotesIncluded: false,
      rawUrisIncluded: false,
      rawVideoIncluded: false,
      reviewerScoresInvented: false,
      videoLeavesDevice: false,
    },
    readyForValidation: false,
    reviewerInstructions: [
      'Review each generated cue from the packet only; do not request or attach raw video.',
      'Two distinct coach reviewers should score every cue before running the validation gate.',
      'Adjudicate cue rows when reviewer score spread exceeds the configured consensus threshold.',
      'Scores must be real coach judgments, not generated defaults.',
      'Use the final filled dataset with npm run validation:cue before making production movement-quality claims.',
    ],
    schemaVersion: 'movebeta.cue-validation-study-seed.v1',
  });
}

export function assertCueValidationStudySeedIsPrivacySafe(seed: CueValidationStudySeed) {
  if (forbiddenStudyKeyPattern.test(JSON.stringify(seed))) {
    throw new Error('Cue validation study seed failed privacy validation: forbidden raw artifact keys are present.');
  }

  const parsed = CueValidationStudySeedSchema.parse(seed);
  const privacyFlags = Object.values(parsed.privacy);

  if (privacyFlags.some(Boolean)) {
    throw new Error('Cue validation study seed failed privacy validation: a forbidden artifact flag is enabled.');
  }

  for (const clip of parsed.clips) {
    assertCoachPacketIsPrivacySafe(clip.packet);
  }
}

export function buildCueValidationClipIntakeManifest(
  seed: CueValidationStudySeed,
  options: CueValidationClipIntakeManifestOptions = {},
): CueValidationClipIntakeManifest {
  assertCueValidationStudySeedIsPrivacySafe(seed);
  const parsedSeed = CueValidationStudySeedSchema.parse(seed);
  const requiredReviewerCount = options.reviewerCount ?? parsedSeed.acceptance.minDistinctReviewersPerClip;
  const wallAngles = sortWallAngles([
    ...new Set(parsedSeed.clips.map((clip) => clip.packet.session.wallAngle)),
  ] as Array<'slab' | 'vertical' | 'overhang'>);
  const missingWallAngles = sortWallAngles(
    parsedSeed.acceptance.requiredWallAngles.filter((wallAngle) => !wallAngles.includes(wallAngle)),
  );
  const clips = parsedSeed.clips.map((clip) => {
    const requiredCoachReviewRows = clip.reviewTasks.length * requiredReviewerCount;

    return CueValidationClipIntakeManifestClipSchema.parse({
      clipId: clip.clipId,
      consentRecordId: clip.consentRecordId,
      cueCount: clip.reviewTasks.length,
      durationMs: clip.packet.session.durationMs,
      grade: clip.packet.session.grade,
      gym: clip.packet.session.gym,
      packetReportId: clip.packet.reportId,
      requiredCoachReviewRows,
      status: 'ready-for-packet-review',
      title: clip.packet.session.title,
      wallAngle: clip.packet.session.wallAngle,
    });
  });
  const requiredCoachReviewRows = clips.reduce((sum, clip) => sum + clip.requiredCoachReviewRows, 0);
  const status =
    parsedSeed.clipCount === 0
      ? 'needs-consent'
      : parsedSeed.clipCount < parsedSeed.acceptance.minClips || missingWallAngles.length > 0
        ? 'needs-coverage'
        : 'ready-for-review';

  return CueValidationClipIntakeManifestSchema.parse({
    acceptance: parsedSeed.acceptance,
    clips,
    generatedAt: options.generatedAt ?? new Date().toISOString(),
    instructions: [
      'Use this manifest to verify consented local reports before coach worksheet collection.',
      'Keep raw video, local file paths, frame data, landmarks, screenshots, and private notes outside this manifest.',
      'Share packet-only review materials separately from the local device after consent is granted.',
      'Collect real coach worksheet scores before composing the final validation dataset.',
    ],
    privacy: {
      coachPacketsIncluded: false,
      keyFramesIncluded: false,
      landmarksIncluded: false,
      privateNotesIncluded: false,
      rawUrisIncluded: false,
      rawVideoIncluded: false,
      reviewerScoresInvented: false,
      videoLeavesDevice: false,
    },
    schemaVersion: cueValidationClipIntakeManifestSchemaVersion,
    sourceSeedGeneratedAt: parsedSeed.generatedAt,
    summary: {
      clipCount: parsedSeed.clipCount,
      cueCount: parsedSeed.cueCount,
      missingWallAngles,
      requiredCoachReviewRows,
      status,
      targetClipCount: parsedSeed.acceptance.minClips,
      targetWallAngles: parsedSeed.acceptance.requiredWallAngles,
      wallAngles,
    },
  });
}

export function assertCueValidationClipIntakeManifestIsPrivacySafe(manifest: CueValidationClipIntakeManifest) {
  const serialized = JSON.stringify(manifest);

  if (forbiddenStudyKeyPattern.test(serialized) || forbiddenManifestValuePattern.test(serialized)) {
    throw new Error('Cue validation clip intake manifest failed privacy validation: raw artifact text is present.');
  }

  const parsed = CueValidationClipIntakeManifestSchema.parse(manifest);
  const privacyFlags = Object.values(parsed.privacy);

  if (privacyFlags.some(Boolean)) {
    throw new Error('Cue validation clip intake manifest failed privacy validation: a forbidden artifact flag is enabled.');
  }
}

export function buildCueValidationReviewerOnboardingPacket(
  seed: CueValidationStudySeed,
  options: CueValidationReviewerOnboardingPacketOptions = {},
): CueValidationReviewerOnboardingPacket {
  assertCueValidationStudySeedIsPrivacySafe(seed);
  const manifest = buildCueValidationClipIntakeManifest(seed, options);
  const parsedSeed = CueValidationStudySeedSchema.parse(seed);
  const reviewerCount = options.reviewerCount ?? parsedSeed.acceptance.minDistinctReviewersPerClip;
  const reviewerSlotsNeeded = Math.max(0, manifest.summary.targetClipCount * reviewerCount);

  return CueValidationReviewerOnboardingPacketSchema.parse({
    acceptance: parsedSeed.acceptance,
    commands: [
      {
        key: 'prepare-seed',
        label: 'Prepare consented study seed',
        owner: 'product',
        purpose: 'Collect athlete consent and prepare packet-only cue review tasks from Sessions.',
      },
      {
        key: 'review-packet-only',
        label: 'Review packet-only cues',
        owner: 'coach',
        purpose: 'Score each generated cue from the packet context without requesting raw video or private notes.',
      },
      {
        key: 'complete-worksheet',
        label: 'Complete worksheet rows',
        owner: 'coach',
        purpose: 'Fill reviewer id and 1-5 scores only after a real coach review.',
      },
      {
        key: 'run-validation-gate',
        label: 'Run validation gate',
        owner: 'qa',
        purpose: 'Compose the completed worksheet into dataset JSON and run npm run validation:cue.',
      },
    ],
    generatedAt: options.generatedAt ?? new Date().toISOString(),
    instructions: [
      'Review only the packet context: session metadata, quality, metrics, cues, cue trust, timeline, and privacy evidence.',
      'Do not ask for raw video, screenshots, landmarks, local file paths, private notes, or account identifiers.',
      'Use a 1-5 score for relevance, timing accuracy, drill fit, and safety language.',
      `A passing cue needs an average score of at least ${parsedSeed.acceptance.minAverageCueScore}/5 and no unsafe safety-language score.`,
      `Reviewer spread on each criterion should stay within ${parsedSeed.acceptance.maxReviewerScoreSpreadPerCriterion} point.`,
      'Reviewer IDs must identify real coach reviewers in the completed worksheet; this onboarding packet intentionally leaves them out.',
    ],
    privacy: {
      coachPacketsIncluded: false,
      credentialValuesIncluded: false,
      keyFramesIncluded: false,
      landmarksIncluded: false,
      localPathsIncluded: false,
      privateNotesIncluded: false,
      rawArtifactsIncluded: false,
      rawUrisIncluded: false,
      rawVideoIncluded: false,
      reviewerIdentitiesIncluded: false,
      reviewerScoresInvented: false,
      videoLeavesDevice: false,
    },
    reviewCriteria: [
      {
        id: 'relevance',
        passingScore: parsedSeed.acceptance.minAverageCueScore,
        prompt: 'Does the cue match an observable movement pattern in the packet?',
      },
      {
        id: 'timingAccuracy',
        passingScore: parsedSeed.acceptance.minAverageCueScore,
        prompt: 'Is the timestamp close enough for a climber to find the movement window?',
      },
      {
        id: 'drillFit',
        passingScore: parsedSeed.acceptance.minAverageCueScore,
        prompt: 'Is the drill specific, repeatable, and appropriate for the grade and wall angle?',
      },
      {
        id: 'safetyLanguage',
        passingScore: parsedSeed.acceptance.minAverageCueScore,
        prompt: 'Does the feedback avoid medical, injury-prevention, or route-safety claims?',
      },
    ],
    schemaVersion: cueValidationReviewerOnboardingPacketSchemaVersion,
    sourceSeedGeneratedAt: parsedSeed.generatedAt,
    summary: {
      estimatedReviewRows: manifest.summary.requiredCoachReviewRows,
      missingWallAngles: manifest.summary.missingWallAngles,
      reviewerSlotsNeeded,
      sourceClipCount: parsedSeed.clipCount,
      sourceCueCount: parsedSeed.cueCount,
      status: manifest.summary.status,
      targetClipCount: parsedSeed.acceptance.minClips,
    },
  });
}

export function assertCueValidationReviewerOnboardingPacketIsPrivacySafe(packet: CueValidationReviewerOnboardingPacket) {
  const serialized = JSON.stringify(packet);

  if (forbiddenStudyKeyPattern.test(serialized) || forbiddenOnboardingPacketValuePattern.test(serialized)) {
    throw new Error('Cue validation reviewer onboarding packet failed privacy validation: raw artifact or credential text is present.');
  }

  const parsed = CueValidationReviewerOnboardingPacketSchema.parse(packet);
  const privacyFlags = Object.values(parsed.privacy);

  if (privacyFlags.some(Boolean)) {
    throw new Error('Cue validation reviewer onboarding packet failed privacy validation: a forbidden artifact flag is enabled.');
  }
}

export function buildCueValidationReviewerAssignmentPacket(
  seed: CueValidationStudySeed,
  options: CueValidationReviewerAssignmentPacketOptions = {},
): CueValidationReviewerAssignmentPacket {
  assertCueValidationStudySeedIsPrivacySafe(seed);
  const parsedSeed = CueValidationStudySeedSchema.parse(seed);
  const manifest = buildCueValidationClipIntakeManifest(seed, options);
  const reviewerCount = options.reviewerCount ?? parsedSeed.acceptance.minDistinctReviewersPerClip;
  const worksheet = buildCueValidationReviewWorksheet(seed, {
    generatedAt: options.generatedAt,
    reviewerCount,
  });
  const rowsBySlot = new Map<number, typeof worksheet.rows>();

  for (const row of worksheet.rows) {
    rowsBySlot.set(row.reviewerSlot, [...(rowsBySlot.get(row.reviewerSlot) ?? []), row]);
  }

  const assignments = Array.from({ length: reviewerCount }, (_, index) => {
    const reviewerSlot = index + 1;
    const rows = rowsBySlot.get(reviewerSlot) ?? [];
    const clipsForSlot = new Set(rows.map((row) => row.clipId));
    const cuesForSlot = new Set(rows.map((row) => row.cueId));
    const wallAngles = sortWallAngles([
      ...new Set(
        parsedSeed.clips
          .filter((clip) => clipsForSlot.has(clip.clipId))
          .map((clip) => clip.packet.session.wallAngle),
      ),
    ] as Array<'slab' | 'vertical' | 'overhang'>);

    return CueValidationReviewerAssignmentSchema.parse({
      assignmentKey: `reviewer-slot-${reviewerSlot}`,
      clipCount: clipsForSlot.size,
      cueCount: cuesForSlot.size,
      expectedScoreCells: rows.reduce((sum, row) => sum + row.requiredScores.length, 0),
      packetOnly: true,
      reviewMode: 'packet-only',
      reviewerRole: 'coach',
      reviewerSlot,
      rowCount: rows.length,
      wallAngles,
      worksheetFilter: `reviewerSlot=${reviewerSlot}`,
    });
  });
  const estimatedScoreCells = assignments.reduce((sum, assignment) => sum + assignment.expectedScoreCells, 0);
  const maxRowsPerReviewerSlot = assignments.reduce((max, assignment) => Math.max(max, assignment.rowCount), 0);
  const status =
    manifest.summary.status === 'needs-consent'
      ? 'needs-consent'
      : manifest.summary.status === 'needs-coverage'
        ? 'needs-coverage'
        : 'ready-for-assignment';

  return CueValidationReviewerAssignmentPacketSchema.parse({
    acceptance: parsedSeed.acceptance,
    assignments,
    generatedAt: options.generatedAt ?? new Date().toISOString(),
    instructions: [
      'Use one reviewer slot per real coach reviewer; do not put coach names or contact details in this packet.',
      'Filter the worksheet by reviewerSlot and send only packet-only review materials for that slot.',
      'Do not attach raw video, screenshots, landmarks, local file paths, private notes, or account identifiers.',
      'Coaches fill reviewerId and 1-5 scores only in the completed worksheet after real review.',
      'Run the worksheet preflight before composing the final validation dataset.',
    ],
    privacy: {
      coachPacketsIncluded: false,
      credentialValuesIncluded: false,
      keyFramesIncluded: false,
      landmarksIncluded: false,
      localPathsIncluded: false,
      privateNotesIncluded: false,
      rawArtifactsIncluded: false,
      rawUrisIncluded: false,
      rawVideoIncluded: false,
      rawWorksheetIncluded: false,
      reportIdsIncluded: false,
      reviewerIdentitiesIncluded: false,
      reviewerScoresIncluded: false,
      reviewerScoresInvented: false,
      videoLeavesDevice: false,
    },
    schemaVersion: cueValidationReviewerAssignmentPacketSchemaVersion,
    sourceSeedGeneratedAt: parsedSeed.generatedAt,
    summary: {
      assignmentCount: assignments.length,
      estimatedScoreCells,
      estimatedWorksheetRows: worksheet.rowCount,
      maxRowsPerReviewerSlot,
      missingWallAngles: manifest.summary.missingWallAngles,
      rowsPerReviewerSlot: parsedSeed.cueCount,
      reviewerSlots: reviewerCount,
      sourceClipCount: parsedSeed.clipCount,
      sourceCueCount: parsedSeed.cueCount,
      status,
      targetClipCount: parsedSeed.acceptance.minClips,
    },
  });
}

export function assertCueValidationReviewerAssignmentPacketIsPrivacySafe(packet: CueValidationReviewerAssignmentPacket) {
  const serialized = JSON.stringify(packet);

  if (forbiddenStudyKeyPattern.test(serialized) || forbiddenOnboardingPacketValuePattern.test(serialized)) {
    throw new Error('Cue validation reviewer assignment packet failed privacy validation: raw artifact or credential text is present.');
  }

  const parsed = CueValidationReviewerAssignmentPacketSchema.parse(packet);
  const privacyFlags = Object.values(parsed.privacy);

  if (privacyFlags.some(Boolean)) {
    throw new Error('Cue validation reviewer assignment packet failed privacy validation: a forbidden artifact flag is enabled.');
  }
}

export function buildCueValidationReviewWorksheet(
  seed: CueValidationStudySeed,
  options: CueValidationReviewWorksheetOptions = {},
): CueValidationReviewWorksheet {
  assertCueValidationStudySeedIsPrivacySafe(seed);
  const parsedSeed = CueValidationStudySeedSchema.parse(seed);
  const requiredReviewerCount = options.reviewerCount ?? parsedSeed.acceptance.minDistinctReviewersPerClip;

  const rows = parsedSeed.clips.flatMap((clip) =>
    clip.reviewTasks.flatMap((task) =>
      Array.from({ length: requiredReviewerCount }, (_, index) => {
        const reviewerSlot = index + 1;
        return CueValidationReviewWorksheetRowSchema.parse({
          clipId: clip.clipId,
          consentRecordId: clip.consentRecordId,
          cueId: task.cueId,
          cueTitle: task.cueTitle,
          id: `${clip.clipId}:${task.cueId}:coach-${reviewerSlot}`,
          packetReportId: clip.packet.reportId,
          requiredScores: task.requiredScores,
          reviewMode: task.reviewMode,
          reviewerId: null,
          reviewerRole: task.reviewerRole,
          reviewerSlot,
          scores: {
            drillFit: null,
            relevance: null,
            safetyLanguage: null,
            timingAccuracy: null,
          },
          status: 'awaiting-real-review',
        });
      }),
    ),
  );

  return CueValidationReviewWorksheetSchema.parse({
    generatedAt: options.generatedAt ?? new Date().toISOString(),
    privacy: {
      keyFramesIncluded: false,
      landmarksIncluded: false,
      privateNotesIncluded: false,
      rawUrisIncluded: false,
      rawVideoIncluded: false,
      reviewerScoresInvented: false,
      videoLeavesDevice: false,
    },
    requiredReviewerCount,
    reviewerInstructions: [
      ...parsedSeed.reviewerInstructions,
      'Fill reviewerId and all 1-5 score fields only after a real coach review.',
      'Do not attach raw video, local file paths, frame data, landmarks, screenshots, or private notes to this worksheet.',
    ],
    rowCount: rows.length,
    rows,
    schemaVersion: 'movebeta.cue-validation-review-worksheet.v1',
    seedGeneratedAt: parsedSeed.generatedAt,
    sourceClipCount: parsedSeed.clipCount,
    sourceCueCount: parsedSeed.cueCount,
  });
}

export function assertCueValidationReviewWorksheetIsPrivacySafe(worksheet: CueValidationReviewWorksheet) {
  if (forbiddenStudyKeyPattern.test(JSON.stringify(worksheet))) {
    throw new Error('Cue validation review worksheet failed privacy validation: forbidden raw artifact keys are present.');
  }

  const rawRows = Array.isArray((worksheet as { rows?: unknown }).rows) ? (worksheet as { rows: unknown[] }).rows : [];
  const hasInventedReviewEvidence = rawRows.some((row) => {
    if (!row || typeof row !== 'object') return false;
    const record = row as { reviewerId?: unknown; scores?: Record<string, unknown> };
    return record.reviewerId !== null || Object.values(record.scores ?? {}).some((score) => score !== null);
  });

  if (hasInventedReviewEvidence) {
    throw new Error('Cue validation review worksheet must not contain invented reviewer identities or scores.');
  }

  const parsed = CueValidationReviewWorksheetSchema.parse(worksheet);
  const privacyFlags = Object.values(parsed.privacy);

  if (privacyFlags.some(Boolean)) {
    throw new Error('Cue validation review worksheet failed privacy validation: a forbidden artifact flag is enabled.');
  }

}

export function buildCueValidationReviewWorksheetCsv(worksheet: CueValidationReviewWorksheet) {
  assertCueValidationReviewWorksheetIsPrivacySafe(worksheet);
  const parsed = CueValidationReviewWorksheetSchema.parse(worksheet);
  const lines = [
    worksheetCsvHeaders.join(','),
    ...parsed.rows.map((row) =>
      [
        row.id,
        row.clipId,
        row.packetReportId,
        row.consentRecordId,
        row.cueId,
        row.cueTitle,
        row.reviewerSlot,
        row.reviewerId,
        row.reviewerRole,
        row.reviewMode,
        row.scores.relevance,
        row.scores.timingAccuracy,
        row.scores.drillFit,
        row.scores.safetyLanguage,
        row.status,
      ]
        .map(csvCell)
        .join(','),
    ),
  ];
  const csv = `${lines.join('\n')}\n`;
  assertCueValidationReviewWorksheetCsvIsPrivacySafe(csv);
  return csv;
}

export function assertCueValidationReviewWorksheetCsvIsPrivacySafe(csv: string) {
  if (forbiddenCsvArtifactPattern.test(csv)) {
    throw new Error('Cue validation review worksheet CSV failed privacy validation: forbidden raw artifact text is present.');
  }
}

export function buildCueValidationDatasetFromCompletedWorksheetCsv(
  seed: CueValidationStudySeed,
  csv: string,
  options: CueValidationCompletedDatasetOptions = {},
): CueValidationCompletedDataset {
  assertCueValidationStudySeedIsPrivacySafe(seed);
  const parsedSeed = CueValidationStudySeedSchema.parse(seed);
  const expectedWorksheet = buildCueValidationReviewWorksheet(parsedSeed);
  const expectedRows = new Map(expectedWorksheet.rows.map((row) => [row.id, row]));
  const completedRows = parseCompletedWorksheetCsv(csv);
  const seenRowIds = new Set<string>();

  if (completedRows.length !== expectedWorksheet.rows.length) {
    throw new Error(
      `Cue validation worksheet CSV must include ${expectedWorksheet.rows.length} completed review rows; received ${completedRows.length}.`,
    );
  }

  for (const row of completedRows) {
    const expected = expectedRows.get(row.worksheetRowId);
    if (!expected) {
      throw new Error(`Cue validation worksheet row ${row.worksheetRowId} is not part of this study seed.`);
    }
    if (seenRowIds.has(row.worksheetRowId)) {
      throw new Error(`Cue validation worksheet row ${row.worksheetRowId} is duplicated.`);
    }
    seenRowIds.add(row.worksheetRowId);

    if (
      row.clipId !== expected.clipId ||
      row.packetReportId !== expected.packetReportId ||
      row.consentRecordId !== expected.consentRecordId ||
      row.cueId !== expected.cueId ||
      row.reviewerSlot !== expected.reviewerSlot ||
      row.reviewerRole !== expected.reviewerRole ||
      row.reviewMode !== expected.reviewMode
    ) {
      throw new Error(`Cue validation worksheet row ${row.worksheetRowId} does not match the source study seed.`);
    }
  }

  return CueValidationCompletedDatasetSchema.parse({
    acceptance: parsedSeed.acceptance,
    appVersion: options.appVersion ?? parsedSeed.appVersion,
    clips: parsedSeed.clips.map((clip) => ({
      clipId: clip.clipId,
      consentRecordId: clip.consentRecordId,
      packet: clip.packet,
      reviews: completedRows
        .filter((row) => row.clipId === clip.clipId)
        .map((row) =>
          CueValidationCompletedReviewSchema.parse({
            cueId: row.cueId,
            drillFit: row.scores.drillFit,
            relevance: row.scores.relevance,
            reviewMode: 'packet-only',
            reviewerId: row.reviewerId,
            reviewerRole: 'coach',
            safetyLanguage: row.scores.safetyLanguage,
            timingAccuracy: row.scores.timingAccuracy,
          }),
        ),
    })),
    generatedAt: options.generatedAt ?? new Date().toISOString(),
    schemaVersion: 'movebeta.cue-validation-dataset.v1',
  });
}

export function formatCueValidationStudySeedSummary(seed: CueValidationStudySeed) {
  const parsed = CueValidationStudySeedSchema.parse(seed);
  return [
    `${parsed.clipCount} consented clips`,
    `${parsed.cueCount} review tasks`,
    `target ${parsed.acceptance.minClips} clips`,
    'raw video: no',
    'scores invented: no',
  ].join(' · ');
}

export function formatCueValidationClipIntakeManifestSummary(manifest: CueValidationClipIntakeManifest) {
  const parsed = CueValidationClipIntakeManifestSchema.parse(manifest);

  return [
    `${parsed.summary.clipCount}/${parsed.summary.targetClipCount} consented clips`,
    `${parsed.summary.wallAngles.length}/${parsed.summary.targetWallAngles.length} wall angles`,
    `${parsed.summary.requiredCoachReviewRows} coach review rows`,
    `status ${parsed.summary.status}`,
    'raw video: no',
  ].join(' · ');
}

export function formatCueValidationCompletedDatasetSummary(dataset: CueValidationCompletedDataset) {
  const parsed = CueValidationCompletedDatasetSchema.parse(dataset);
  const reviewCount = parsed.clips.reduce((sum, clip) => sum + clip.reviews.length, 0);
  return [
    `${parsed.clips.length} consented clips`,
    `${reviewCount} real reviews`,
    `target ${parsed.acceptance.minClips} clips`,
    'ready for validation gate',
  ].join(' · ');
}

export function formatCueValidationWorksheetPreflightSummary(preflight: CueValidationWorksheetPreflight) {
  const parsed = CueValidationWorksheetPreflightSchema.parse(preflight);

  return [
    `Worksheet preflight: ${parsed.summary.status}`,
    `${parsed.summary.completeRows}/${parsed.summary.expectedRows} rows complete`,
    `${parsed.summary.distinctReviewerCount} reviewer(s) counted`,
    `${parsed.summary.missingScoreCount} missing score(s)`,
    `${parsed.summary.invalidScoreCount} invalid score(s)`,
  ].join(' · ');
}

export function formatCueValidationReviewerOnboardingPacketSummary(packet: CueValidationReviewerOnboardingPacket) {
  const parsed = CueValidationReviewerOnboardingPacketSchema.parse(packet);
  return [
    `${parsed.summary.sourceClipCount}/${parsed.summary.targetClipCount} consented clips`,
    `${parsed.summary.estimatedReviewRows} expected review rows`,
    `${parsed.summary.reviewerSlotsNeeded} coach slots target`,
    `status ${parsed.summary.status}`,
    'raw video: no',
  ].join(' · ');
}

export function formatCueValidationReviewerAssignmentPacketSummary(packet: CueValidationReviewerAssignmentPacket) {
  const parsed = CueValidationReviewerAssignmentPacketSchema.parse(packet);
  return [
    `${parsed.summary.assignmentCount} reviewer slot assignments`,
    `${parsed.summary.estimatedWorksheetRows} worksheet rows`,
    `${parsed.summary.estimatedScoreCells} score cells`,
    `status ${parsed.summary.status}`,
    'reviewer identities: no',
  ].join(' · ');
}

export function formatCueValidationReviewWorksheetSummary(worksheet: CueValidationReviewWorksheet) {
  const parsed = CueValidationReviewWorksheetSchema.parse(worksheet);
  return [
    `${parsed.sourceClipCount} consented clips`,
    `${parsed.sourceCueCount} cues`,
    `${parsed.rowCount} review rows`,
    `${parsed.requiredReviewerCount} coach slots`,
    'scores invented: no',
  ].join(' · ');
}
