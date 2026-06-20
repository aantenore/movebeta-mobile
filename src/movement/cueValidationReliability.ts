import { z } from 'zod';

import {
  CueValidationCompletedDatasetSchema,
  defaultCueValidationStudyAcceptance,
  type CueValidationCompletedDataset,
  type CueValidationStudyAcceptance,
} from './cueValidationStudy';

export const cueValidationReliabilitySchemaVersion = 'movebeta.cue-validation-reliability.v1';

export const CueValidationReliabilityCueSchema = z.object({
  averageScore: z.number().min(0).max(5),
  clipId: z.string(),
  consensusScore: z.number().min(0).max(100),
  cueId: z.string(),
  cueTitle: z.string(),
  reviewCount: z.number().int().nonnegative(),
  reviewerCount: z.number().int().nonnegative(),
  scoreSpread: z.number().min(0).max(4),
  status: z.enum(['strong-consensus', 'needs-consensus', 'needs-more-review']),
});

export const CueValidationReliabilityReportSchema = z.object({
  cueFindings: z.array(CueValidationReliabilityCueSchema),
  generatedAt: z.string(),
  privacy: z.object({
    coachIdentitiesIncluded: z.literal(false),
    keyFramesIncluded: z.literal(false),
    landmarksIncluded: z.literal(false),
    rawUrisIncluded: z.literal(false),
    rawVideoIncluded: z.literal(false),
    reviewerScoresInvented: z.literal(false),
    videoLeavesDevice: z.literal(false),
  }),
  schemaVersion: z.literal(cueValidationReliabilitySchemaVersion),
  summary: z.object({
    averageConsensusScore: z.number().min(0).max(100),
    averageScore: z.number().min(0).max(5),
    averageScoreSpread: z.number().min(0).max(4),
    lowConsensusCueCount: z.number().int().nonnegative(),
    reviewCount: z.number().int().nonnegative(),
    reviewedCueCount: z.number().int().nonnegative(),
    reviewerCount: z.number().int().nonnegative(),
    status: z.enum(['ready', 'needs-consensus', 'needs-more-review']),
  }),
});

export type CueValidationReliabilityReport = z.infer<typeof CueValidationReliabilityReportSchema>;

export type CueValidationReliabilityOptions = {
  acceptance?: Partial<CueValidationStudyAcceptance>;
  generatedAt?: string;
  maxScoreSpread?: number;
  minConsensusScore?: number;
};

const forbiddenReliabilityValuePattern =
  /(file:\/\/|content:\/\/|asset:\/\/|ph:\/\/|\/Users\/|\/private\/|\/var\/mobile\/|[A-Za-z]:\\|\.mov\b|\.mp4\b|rawVideoUri|videoUri|landmarks|keyFrame)/i;

function average(values: number[]) {
  if (values.length === 0) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function round(value: number, precision = 2) {
  return Number(value.toFixed(precision));
}

function reviewScore(review: CueValidationCompletedDataset['clips'][number]['reviews'][number]) {
  return average([review.drillFit, review.relevance, review.safetyLanguage, review.timingAccuracy]);
}

function consensusScore(scoreSpread: number) {
  return Math.max(0, Math.min(100, Math.round(100 - (scoreSpread / 4) * 100)));
}

function containsForbiddenValue(value: unknown): boolean {
  if (typeof value === 'string') return forbiddenReliabilityValuePattern.test(value);
  if (Array.isArray(value)) return value.some(containsForbiddenValue);
  if (value && typeof value === 'object') return Object.values(value).some(containsForbiddenValue);
  return false;
}

export function buildCueValidationReliabilityReport(
  dataset: CueValidationCompletedDataset,
  options: CueValidationReliabilityOptions = {},
): CueValidationReliabilityReport {
  const parsed = CueValidationCompletedDatasetSchema.parse(dataset);
  const acceptance = {
    ...defaultCueValidationStudyAcceptance,
    ...parsed.acceptance,
    ...(options.acceptance ?? {}),
  };
  const maxScoreSpread = options.maxScoreSpread ?? acceptance.maxReviewerScoreSpreadPerCriterion;
  const minConsensusScore = options.minConsensusScore ?? 75;
  const cueFindings = parsed.clips.flatMap((clip) =>
    clip.packet.analysis.cues.map((cue) => {
      const reviews = clip.reviews.filter((review) => review.cueId === cue.id);
      const scores = reviews.map(reviewScore);
      const scoreSpread = scores.length > 0 ? Math.max(...scores) - Math.min(...scores) : 0;
      const cueConsensusScore = consensusScore(scoreSpread);
      const reviewerCount = new Set(reviews.map((review) => review.reviewerId)).size;
      const needsMoreReview =
        reviews.length < acceptance.minReviewsPerCue || reviewerCount < acceptance.minDistinctReviewersPerCue;
      const needsConsensus =
        !needsMoreReview &&
        (scoreSpread > maxScoreSpread ||
          cueConsensusScore < minConsensusScore ||
          average(scores) < acceptance.minAverageCueScore ||
          reviews.some((review) => review.safetyLanguage < 4));

      return CueValidationReliabilityCueSchema.parse({
        averageScore: round(average(scores)),
        clipId: clip.clipId,
        consensusScore: cueConsensusScore,
        cueId: cue.id,
        cueTitle: cue.title,
        reviewCount: reviews.length,
        reviewerCount,
        scoreSpread: round(scoreSpread),
        status: needsMoreReview ? 'needs-more-review' : needsConsensus ? 'needs-consensus' : 'strong-consensus',
      });
    }),
  );
  const reviewedCueFindings = cueFindings.filter((cue) => cue.reviewCount > 0);
  const reviewerIds = new Set(parsed.clips.flatMap((clip) => clip.reviews.map((review) => review.reviewerId)));
  const lowConsensusCueCount = cueFindings.filter((cue) => cue.status !== 'strong-consensus').length;
  const hasMoreReviewGap = cueFindings.some((cue) => cue.status === 'needs-more-review');
  const status = hasMoreReviewGap ? 'needs-more-review' : lowConsensusCueCount > 0 ? 'needs-consensus' : 'ready';

  return CueValidationReliabilityReportSchema.parse({
    cueFindings,
    generatedAt: options.generatedAt ?? new Date().toISOString(),
    privacy: {
      coachIdentitiesIncluded: false,
      keyFramesIncluded: false,
      landmarksIncluded: false,
      rawUrisIncluded: false,
      rawVideoIncluded: false,
      reviewerScoresInvented: false,
      videoLeavesDevice: false,
    },
    schemaVersion: cueValidationReliabilitySchemaVersion,
    summary: {
      averageConsensusScore: Math.round(average(cueFindings.map((cue) => cue.consensusScore))),
      averageScore: round(average(reviewedCueFindings.map((cue) => cue.averageScore))),
      averageScoreSpread: round(average(cueFindings.map((cue) => cue.scoreSpread))),
      lowConsensusCueCount,
      reviewCount: parsed.clips.reduce((sum, clip) => sum + clip.reviews.length, 0),
      reviewedCueCount: reviewedCueFindings.length,
      reviewerCount: reviewerIds.size,
      status,
    },
  });
}

export function assertCueValidationReliabilityReportIsPrivacySafe(report: CueValidationReliabilityReport) {
  const parsed = CueValidationReliabilityReportSchema.parse(report);
  if (containsForbiddenValue(parsed)) {
    throw new Error('Cue validation reliability report contains raw artifact, local path, or video reference text.');
  }
  if (Object.values(parsed.privacy).some(Boolean)) {
    throw new Error('Cue validation reliability report failed privacy validation: a forbidden artifact flag is enabled.');
  }
}

export function formatCueValidationReliabilitySummary(report: CueValidationReliabilityReport) {
  const parsed = CueValidationReliabilityReportSchema.parse(report);
  return [
    `Reliability: ${parsed.summary.status}`,
    `${parsed.summary.reviewedCueCount} reviewed cues`,
    `${parsed.summary.reviewerCount} reviewers`,
    `consensus ${parsed.summary.averageConsensusScore}/100`,
    `${parsed.summary.lowConsensusCueCount} cue${parsed.summary.lowConsensusCueCount === 1 ? '' : 's'} need review`,
  ].join(' · ');
}
