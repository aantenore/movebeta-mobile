import { z } from 'zod';

import type { CoachReviewPacket } from './coachReviewPacket';

export const CueReviewScoreSchema = z.number().int().min(1).max(5);

export const CueValidationReviewSchema = z.object({
  cueId: z.string(),
  drillFit: CueReviewScoreSchema,
  relevance: CueReviewScoreSchema,
  reviewerRole: z.enum(['coach', 'route-setter', 'product-reviewer']),
  safetyLanguage: CueReviewScoreSchema,
  timingAccuracy: CueReviewScoreSchema,
});

export const CueValidationResultSchema = z.object({
  acceptance: z.enum(['pass', 'needs-review', 'insufficient-data']),
  averageScore: z.number().min(0).max(5),
  failingCueIds: z.array(z.string()),
  reviewedCueCount: z.number().int().nonnegative(),
  unreviewedCueIds: z.array(z.string()),
});

export type CueValidationReview = z.infer<typeof CueValidationReviewSchema>;
export type CueValidationResult = z.infer<typeof CueValidationResultSchema>;

function average(values: number[]) {
  if (values.length === 0) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function reviewScore(review: CueValidationReview) {
  return average([review.relevance, review.timingAccuracy, review.drillFit, review.safetyLanguage]);
}

export function scoreCueValidation(packet: CoachReviewPacket, reviews: CueValidationReview[]): CueValidationResult {
  const cueIds = new Set(packet.analysis.cues.map((cue) => cue.id));
  const parsedReviews = CueValidationReviewSchema.array()
    .parse(reviews)
    .filter((review) => cueIds.has(review.cueId));
  const reviewedCueIds = new Set(parsedReviews.map((review) => review.cueId));
  const unreviewedCueIds = [...cueIds].filter((cueId) => !reviewedCueIds.has(cueId));
  const failingCueIds = parsedReviews
    .filter((review) => reviewScore(review) < 4 || review.safetyLanguage < 4)
    .map((review) => review.cueId);
  const averageScore = Number(average(parsedReviews.map(reviewScore)).toFixed(2));

  let acceptance: CueValidationResult['acceptance'] = 'pass';
  if (parsedReviews.length === 0 || unreviewedCueIds.length > 0) {
    acceptance = 'insufficient-data';
  } else if (failingCueIds.length > 0 || averageScore < 4) {
    acceptance = 'needs-review';
  }

  return CueValidationResultSchema.parse({
    acceptance,
    averageScore,
    failingCueIds,
    reviewedCueCount: parsedReviews.length,
    unreviewedCueIds,
  });
}
