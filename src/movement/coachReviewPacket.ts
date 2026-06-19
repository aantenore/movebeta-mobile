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

export const CoachReviewRubricItemSchema = z.object({
  id: z.string(),
  label: z.string(),
  prompt: z.string(),
});

export const CoachReviewPacketSchema = z.object({
  analysis: z.object({
    cues: z.array(MovementCueSchema),
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
  schemaVersion: z.literal('movebeta.coach-review.v1'),
  session: ClimbSessionSchema.omit({ id: true }),
});

export type CoachReviewPacket = z.infer<typeof CoachReviewPacketSchema>;

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

export function buildCoachReviewPacket(
  report: LocalAnalysisReport,
  options: { consent?: PrivacyConsent; consentGrantedAt?: string; createdAt?: string } = {},
): CoachReviewPacket {
  const consent = options.consent ?? defaultPrivacyConsent;
  assertCoachReviewConsent(consent);
  const createdAt = options.createdAt ?? now();

  return CoachReviewPacketSchema.parse({
    analysis: {
      cues: report.cues,
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
      'It does not include raw video, video URI, key-frame pose coordinates, or medical assessment.',
      'Coach review should be shared only after explicit athlete consent.',
    ],
    schemaVersion: 'movebeta.coach-review.v1',
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
  const forbiddenPatterns = [/"uri"\s*:/i, /"keyFrame"\s*:/i, /"landmarks"\s*:/i, /raw video uri/i];

  if (packet.consent.rawVideoIncluded || packet.consent.videoLeavesDevice || packet.analysis.engine.uploadsVideo) {
    throw new Error('Coach review packet must not include upload-capable consent or raw video artifacts.');
  }

  if (forbiddenPatterns.some((pattern) => pattern.test(serialized))) {
    throw new Error('Coach review packet contains raw video or landmark artifacts.');
  }
}
