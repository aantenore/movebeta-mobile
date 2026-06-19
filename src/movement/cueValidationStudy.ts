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

export type CueValidationStudyAcceptance = z.infer<typeof CueValidationStudyAcceptanceSchema>;
export type CueValidationStudySeed = z.infer<typeof CueValidationStudySeedSchema>;

export type CueValidationStudySeedOptions = {
  acceptance?: Partial<CueValidationStudyAcceptance>;
  annotations?: ReportAnnotation[];
  appVersion?: string;
  drillPractice?: DrillPracticeRecord[];
  generatedAt?: string;
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
