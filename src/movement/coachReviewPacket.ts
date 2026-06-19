import { z } from 'zod';

import { assertCoachReviewConsent, defaultPrivacyConsent, type PrivacyConsent } from '@/core/privacy';

import {
  AnalysisQualitySchema,
  ClimbSessionSchema,
  MovementCueSchema,
  MovementMetricSchema,
  TimelineEventSchema,
  type LocalAnalysisReport,
} from './contracts';
import { buildCueTrustReport, CueTrustReportSchema } from './cueTrust';
import { drillPracticeStatuses, type DrillPracticeRecord } from './drillPracticeRepository';
import { cueFeedbackRatings, reportProjectStatuses, type ReportAnnotation } from './reportAnnotationRepository';

export const CoachReviewRubricItemSchema = z.object({
  id: z.string(),
  label: z.string(),
  prompt: z.string(),
});

export const CoachAthleteContextSchema = z.object({
  drillPractice: z.object({
    blockedCueIds: z.array(z.string()),
    completedCount: z.number().int().nonnegative(),
    latestStatus: z.enum(drillPracticeStatuses).nullable(),
    practicedCueIds: z.array(z.string()),
    skippedCount: z.number().int().nonnegative(),
    totalCount: z.number().int().nonnegative(),
    updatedAt: z.string().nullable(),
  }),
  trainingLog: z.object({
    confidence: z.number().int().min(1).max(5).nullable(),
    cueFeedback: z.array(
      z.object({
        cueId: z.string(),
        noteIncluded: z.literal(false),
        rating: z.enum(cueFeedbackRatings),
        updatedAt: z.string(),
      }),
    ),
    perceivedEffort: z.number().int().min(1).max(5).nullable(),
    privateNoteIncluded: z.literal(false),
    projectStatus: z.enum(reportProjectStatuses).nullable(),
    tags: z.array(z.string()),
    updatedAt: z.string().nullable(),
  }),
});

export const CoachReviewPacketSchema = z.object({
  analysis: z.object({
    cues: z.array(MovementCueSchema),
    cueTrust: CueTrustReportSchema,
    engine: z.object({
      model: z.string(),
      processedFrames: z.number().int().nonnegative(),
      provider: z.string(),
      runsOnDevice: z.boolean(),
      uploadsVideo: z.boolean(),
    }),
    metrics: z.array(MovementMetricSchema),
    performance: z.object({
      analysisMs: z.number().nonnegative(),
      budgetMs: z.number().nonnegative(),
      budgetStatus: z.enum(['within-budget', 'over-budget', 'not-measured']),
      framesPerSecond: z.number().nonnegative(),
    }),
    quality: AnalysisQualitySchema,
    timeline: z.array(TimelineEventSchema),
  }),
  athleteContext: CoachAthleteContextSchema,
  consent: z.object({
    granted: z.boolean(),
    grantedAt: z.string(),
    policyVersion: z.string(),
    rawVideoIncluded: z.literal(false),
    scope: z.array(z.enum(['coach-review', 'cue-validation'])),
    videoLeavesDevice: z.literal(false),
  }),
  createdAt: z.string(),
  reportId: z.string(),
  reviewRubric: z.array(CoachReviewRubricItemSchema),
  safetyNotes: z.array(z.string()),
  schemaVersion: z.literal('movebeta.coach-review.v2'),
  session: ClimbSessionSchema.omit({ id: true }),
});

export type CoachReviewPacket = z.infer<typeof CoachReviewPacketSchema>;
export type CoachAthleteContext = z.infer<typeof CoachAthleteContextSchema>;

const reviewRubric = [
  {
    id: 'cue-relevance',
    label: 'Cue relevance',
    prompt: 'Does each cue match an observable movement pattern in this attempt?',
  },
  {
    id: 'timing-accuracy',
    label: 'Timing accuracy',
    prompt: 'Are timestamps close enough for the climber to find the movement window?',
  },
  {
    id: 'drill-fit',
    label: 'Drill fit',
    prompt: 'Is the suggested drill specific, repeatable, and appropriate for the grade and wall angle?',
  },
  {
    id: 'safety-language',
    label: 'Safety language',
    prompt: 'Does the feedback avoid medical, injury-prevention, or route-safety claims?',
  },
] satisfies z.infer<typeof CoachReviewRubricItemSchema>[];

function now() {
  return new Date().toISOString();
}

function uniqueSorted(values: string[]) {
  return [...new Set(values.filter(Boolean))].sort((a, b) => a.localeCompare(b));
}

function buildAthleteContext(
  report: LocalAnalysisReport,
  annotation?: ReportAnnotation | null,
  drillPractice: DrillPracticeRecord[] = [],
): CoachAthleteContext {
  const reportCueIds = new Set(report.cues.map((cue) => cue.id));
  const trainingLog = annotation?.reportId === report.id ? annotation : null;
  const reportDrillPractice = drillPractice
    .filter((record) => record.reportId === report.id && reportCueIds.has(record.cueId))
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));

  const completed = reportDrillPractice.filter((record) => record.status === 'completed');
  const skipped = reportDrillPractice.filter((record) => record.status === 'skipped');

  return CoachAthleteContextSchema.parse({
    drillPractice: {
      blockedCueIds: uniqueSorted(skipped.map((record) => record.cueId)),
      completedCount: completed.length,
      latestStatus: reportDrillPractice[0]?.status ?? null,
      practicedCueIds: uniqueSorted(completed.map((record) => record.cueId)),
      skippedCount: skipped.length,
      totalCount: reportDrillPractice.length,
      updatedAt: reportDrillPractice[0]?.updatedAt ?? null,
    },
    trainingLog: {
      confidence: trainingLog?.confidence ?? null,
      cueFeedback:
        trainingLog?.cueFeedback
          .filter((feedback) => reportCueIds.has(feedback.cueId))
          .map((feedback) => ({
            cueId: feedback.cueId,
            noteIncluded: false,
            rating: feedback.rating,
            updatedAt: feedback.updatedAt,
          })) ?? [],
      perceivedEffort: trainingLog?.perceivedEffort ?? null,
      privateNoteIncluded: false,
      projectStatus: trainingLog?.projectStatus ?? null,
      tags: trainingLog?.tags ?? [],
      updatedAt: trainingLog?.updatedAt ?? null,
    },
  });
}

export function buildCoachReviewPacket(
  report: LocalAnalysisReport,
  options: {
    annotation?: ReportAnnotation | null;
    consent?: PrivacyConsent;
    consentGrantedAt?: string;
    createdAt?: string;
    drillPractice?: DrillPracticeRecord[];
  } = {},
): CoachReviewPacket {
  const consent = options.consent ?? defaultPrivacyConsent;
  assertCoachReviewConsent(consent);
  const createdAt = options.createdAt ?? now();

  return CoachReviewPacketSchema.parse({
    analysis: {
      cues: report.cues,
      cueTrust: buildCueTrustReport(report, { generatedAt: createdAt }),
      engine: {
        model: report.engine.model,
        processedFrames: report.engine.processedFrames,
        provider: report.engine.provider,
        runsOnDevice: report.engine.runsOnDevice,
        uploadsVideo: false,
      },
      metrics: report.metrics,
      performance: {
        analysisMs: report.performance.analysisMs,
        budgetMs: report.performance.budgetMs,
        budgetStatus: report.performance.budgetStatus,
        framesPerSecond: report.performance.framesPerSecond,
      },
      quality: report.analysisQuality,
      timeline: report.timeline,
    },
    athleteContext: buildAthleteContext(report, options.annotation, options.drillPractice),
    consent: {
      granted: true,
      grantedAt: options.consentGrantedAt ?? createdAt,
      policyVersion: consent.policyVersion,
      rawVideoIncluded: false,
      scope: ['coach-review', 'cue-validation'],
      videoLeavesDevice: false,
    },
    createdAt,
    reportId: report.id,
    reviewRubric,
    safetyNotes: [
      'This packet contains movement education signals only.',
      'Cue trust summarizes local signal quality and validation readiness; it is not a guarantee of coaching correctness.',
      'It does not include raw video, video URI, key-frame pose coordinates, or medical assessment.',
      'Coach review should be shared only after explicit athlete consent.',
    ],
    schemaVersion: 'movebeta.coach-review.v2',
    session: {
      createdAt: report.session.createdAt,
      durationMs: report.session.durationMs,
      grade: report.session.grade,
      gym: report.session.gym,
      source: report.session.source,
      title: report.session.title,
      wallAngle: report.session.wallAngle,
    },
  });
}

export function assertCoachPacketIsPrivacySafe(packet: CoachReviewPacket) {
  const serialized = JSON.stringify(packet);
  const forbiddenPatterns = [
    /"keyFrame"\s*:/i,
    /"landmarks"\s*:/i,
    /"note"\s*:/i,
    /"privateNote"\s*:/i,
    /"uri"\s*:/i,
    /raw video uri/i,
  ];

  if (packet.consent.rawVideoIncluded || packet.consent.videoLeavesDevice || packet.analysis.engine.uploadsVideo) {
    throw new Error('Coach review packet must not include upload-capable consent or raw video artifacts.');
  }

  if (forbiddenPatterns.some((pattern) => pattern.test(serialized))) {
    throw new Error('Coach review packet contains raw video or landmark artifacts.');
  }
}
