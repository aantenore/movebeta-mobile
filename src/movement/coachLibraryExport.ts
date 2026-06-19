import { z } from 'zod';

import type { CoachLibrary } from './coachLibrary';
import { buildCoachTeamTemplates, CoachTeamTemplateSchema, type CoachTeamTemplatePlan } from './coachTeamTemplates';

export const CoachLibraryExportPrivacySchema = z.object({
  drillNotesIncluded: z.literal(false),
  keyFramesIncluded: z.literal(false),
  landmarksIncluded: z.literal(false),
  privateNotesIncluded: z.literal(false),
  rawUrisIncluded: z.literal(false),
  rawVideoIncluded: z.literal(false),
  videoLeavesDevice: z.literal(false),
});

export const CoachLibraryExportEntrySchema = z.object({
  athleteContextIncluded: z.literal(true),
  cueFeedbackCount: z.number().int().nonnegative(),
  drillPracticeCount: z.number().int().nonnegative(),
  fixCueCount: z.number().int().nonnegative(),
  grade: z.string(),
  grantedAt: z.string(),
  gym: z.string(),
  lastActivityAt: z.string(),
  packetReady: z.boolean(),
  policyVersion: z.string(),
  priority: z.enum(['high', 'medium', 'low']),
  rawVideoIncluded: z.literal(false),
  reportId: z.string(),
  reviewFocus: z.string(),
  signalStatus: z.enum(['ready', 'review-signal']),
  title: z.string(),
  videoLeavesDevice: z.literal(false),
  wallAngle: z.string(),
});

export const CoachLibraryExportSchema = z.object({
  entries: z.array(CoachLibraryExportEntrySchema),
  generatedAt: z.string(),
  privacy: CoachLibraryExportPrivacySchema,
  safetyNotes: z.array(z.string()),
  schemaVersion: z.literal('movebeta.coach-library-export.v1'),
  summary: z.object({
    activeConsentCount: z.number().int().nonnegative(),
    highPriorityCount: z.number().int().nonnegative(),
    readyPacketCount: z.number().int().nonnegative(),
    revokedConsentCount: z.number().int().nonnegative(),
    sourceEntryCount: z.number().int().nonnegative(),
    templateCount: z.number().int().nonnegative(),
    totalReports: z.number().int().nonnegative(),
  }),
  templates: z.array(CoachTeamTemplateSchema),
});

export type CoachLibraryExport = z.infer<typeof CoachLibraryExportSchema>;

export type CoachLibraryExportOptions = {
  generatedAt?: string;
  templatePlan?: CoachTeamTemplatePlan;
};

const forbiddenExportKeyPattern =
  /"(?:drillNote|fileUri|frames|keyFrame|landmarkFrames|landmarks|localUri|privateNote|rawVideoUri|uri|videoUri)"\s*:/i;

export function buildCoachLibraryExport(
  library: CoachLibrary,
  options: CoachLibraryExportOptions = {},
): CoachLibraryExport {
  const templatePlan = options.templatePlan ?? buildCoachTeamTemplates(library);

  return CoachLibraryExportSchema.parse({
    entries: library.entries.map((entry) => ({
      athleteContextIncluded: entry.athleteContextIncluded,
      cueFeedbackCount: entry.cueFeedbackCount,
      drillPracticeCount: entry.drillPracticeCount,
      fixCueCount: entry.fixCueCount,
      grade: entry.grade,
      grantedAt: entry.grantedAt,
      gym: entry.gym,
      lastActivityAt: entry.lastActivityAt,
      packetReady: entry.packetReady,
      policyVersion: entry.policyVersion,
      priority: entry.priority,
      rawVideoIncluded: entry.rawVideoIncluded,
      reportId: entry.reportId,
      reviewFocus: entry.reviewFocus,
      signalStatus: entry.signalStatus,
      title: entry.title,
      videoLeavesDevice: entry.videoLeavesDevice,
      wallAngle: entry.wallAngle,
    })),
    generatedAt: options.generatedAt ?? new Date().toISOString(),
    privacy: {
      drillNotesIncluded: false,
      keyFramesIncluded: false,
      landmarksIncluded: false,
      privateNotesIncluded: false,
      rawUrisIncluded: false,
      rawVideoIncluded: false,
      videoLeavesDevice: false,
    },
    safetyNotes: [
      'Export is built from active consent records only.',
      'Raw video, file URIs, pose frames, landmarks, and key frames are excluded.',
      'Private training notes and drill notes are excluded.',
      'Coach review output is movement education, not medical advice.',
    ],
    schemaVersion: 'movebeta.coach-library-export.v1',
    summary: {
      activeConsentCount: library.activeConsentCount,
      highPriorityCount: library.highPriorityCount,
      readyPacketCount: library.readyPacketCount,
      revokedConsentCount: library.revokedConsentCount,
      sourceEntryCount: library.entries.length,
      templateCount: templatePlan.templates.length,
      totalReports: library.totalReports,
    },
    templates: templatePlan.templates,
  });
}

export function assertCoachLibraryExportIsPrivacySafe(exportBundle: CoachLibraryExport) {
  if (forbiddenExportKeyPattern.test(JSON.stringify(exportBundle))) {
    throw new Error('Coach library export failed privacy validation: forbidden raw artifact keys are present.');
  }

  const parsed = CoachLibraryExportSchema.parse(exportBundle);
  const privacyFlags = Object.values(parsed.privacy);

  if (privacyFlags.some(Boolean)) {
    throw new Error('Coach library export failed privacy validation: a forbidden artifact flag is enabled.');
  }

  if (parsed.entries.some((entry) => entry.rawVideoIncluded || entry.videoLeavesDevice)) {
    throw new Error('Coach library export failed privacy validation: a video artifact would leave the device.');
  }

  if (forbiddenExportKeyPattern.test(JSON.stringify(parsed))) {
    throw new Error('Coach library export failed privacy validation: forbidden raw artifact keys are present.');
  }
}

export function formatCoachLibraryExportSummary(exportBundle: CoachLibraryExport) {
  const parsed = CoachLibraryExportSchema.parse(exportBundle);
  return [
    `${parsed.summary.sourceEntryCount} consented packets`,
    `${parsed.summary.templateCount} team templates`,
    'raw video: no',
    'private notes: no',
  ].join(' · ');
}
