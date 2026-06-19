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
  minAverageCueScore: z.number().min(1).max(5),
  minClips: z.number().int().positive(),
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

export type CueValidationStudyAcceptance = z.infer<typeof CueValidationStudyAcceptanceSchema>;
export type CueValidationStudySeed = z.infer<typeof CueValidationStudySeedSchema>;
export type CueValidationReviewWorksheet = z.infer<typeof CueValidationReviewWorksheetSchema>;

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

export const defaultCueValidationStudyAcceptance: CueValidationStudyAcceptance = CueValidationStudyAcceptanceSchema.parse({
  minAverageCueScore: 4,
  minClips: 20,
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
