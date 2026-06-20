import { z } from 'zod';

import { buildEvidenceCollectionPlan, evidenceCollectionPlanSchemaVersion } from './evidenceCollectionPlan';

export const validationCollectionPacketSchemaVersion = 'movebeta.validation-collection-packet.v1';

type EvidenceCollectionPlan = ReturnType<typeof buildEvidenceCollectionPlan>;

const ValidationCollectionBatchSchema = z.object({
  captureFocus: z.string(),
  collectionSteps: z.array(z.string()),
  estimatedCueRows: z.number().int().nonnegative(),
  estimatedReviewRows: z.number().int().nonnegative(),
  reviewerSlotsPerCue: z.number().int().positive(),
  targetClipCount: z.number().int().nonnegative(),
  wallAngle: z.string(),
});

const ValidationCollectionReviewerSlotSchema = z.object({
  assignment: z.string(),
  reviewerId: z.null(),
  reviewerRole: z.literal('coach'),
  slotId: z.string(),
  status: z.literal('awaiting-real-reviewer'),
  wallAngle: z.string(),
});

export const ValidationCollectionPacketSchema = z.object({
  batches: z.array(ValidationCollectionBatchSchema),
  checklist: z.array(z.string()),
  commands: z.array(
    z.object({
      key: z.string(),
      label: z.string(),
      owner: z.enum(['product', 'coach', 'qa']),
      purpose: z.string(),
    }),
  ),
  generatedAt: z.string(),
  planSchemaVersion: z.literal(evidenceCollectionPlanSchemaVersion),
  privacy: z.object({
    credentialValuesIncluded: z.literal(false),
    localPathsIncluded: z.literal(false),
    rawArtifactsIncluded: z.literal(false),
    rawVideoIncluded: z.literal(false),
    reviewerIdentitiesIncluded: z.literal(false),
  }),
  reviewerRosterTemplate: z.array(ValidationCollectionReviewerSlotSchema),
  schemaVersion: z.literal(validationCollectionPacketSchemaVersion),
  summary: z.object({
    batchCount: z.number().int().nonnegative(),
    estimatedReviewRows: z.number().int().nonnegative(),
    nextAction: z.string(),
    reviewerSlotCount: z.number().int().nonnegative(),
    status: z.literal('needs-real-world-evidence'),
    targetClipCount: z.number().int().nonnegative(),
  }),
});

export type ValidationCollectionPacket = z.infer<typeof ValidationCollectionPacketSchema>;

const forbiddenValidationCollectionValuePattern =
  /(file:\/\/|content:\/\/|ph:\/\/|\/users\/|\/private\/|\/var\/|BEGIN PRIVATE KEY|ghp_[A-Za-z0-9_]+|pat_[A-Za-z0-9_]+|sk_live_[A-Za-z0-9_]+|sk_test_[A-Za-z0-9_]+|eyJ[A-Za-z0-9_-]{20,})/i;

function containsForbiddenValue(value: unknown): boolean {
  if (typeof value === 'string') return forbiddenValidationCollectionValuePattern.test(value);
  if (Array.isArray(value)) return value.some(containsForbiddenValue);
  if (value && typeof value === 'object') return Object.values(value).some(containsForbiddenValue);
  return false;
}

function reviewerSlotsForPlan(plan: EvidenceCollectionPlan) {
  return plan.cueValidation.collectionBatches.flatMap((batch) =>
    Array.from({ length: batch.reviewerSlotsPerCue }, (_, index) => {
      const slotNumber = index + 1;
      return {
        assignment: `Review packet-only worksheet rows for ${batch.wallAngle} clips, slot ${slotNumber}.`,
        reviewerId: null,
        reviewerRole: 'coach' as const,
        slotId: `${batch.wallAngle}-coach-slot-${slotNumber}`,
        status: 'awaiting-real-reviewer' as const,
        wallAngle: batch.wallAngle,
      };
    }),
  );
}

function batchesForPlan(plan: EvidenceCollectionPlan) {
  return plan.cueValidation.collectionBatches.map((batch) => ({
    ...batch,
    collectionSteps: [
      `Capture ${batch.targetClipCount} consented ${batch.wallAngle} clips with bystanders out of frame or consent handled.`,
      'Prepare packet-only coach review worksheets from consented local reports.',
      `Assign ${batch.reviewerSlotsPerCue} real coach reviewer slots per cue before scores are entered.`,
      'Compose the completed worksheet into cue-validation dataset JSON and run npm run validation:cue.',
    ],
  }));
}

export function assertValidationCollectionPacketIsShareSafe(packet: ValidationCollectionPacket) {
  if (containsForbiddenValue(packet)) {
    throw new Error('Validation collection packet contains credential values, local paths, raw artifacts, or token-like data.');
  }
  return packet;
}

export function buildValidationCollectionPacket({
  generatedAt = new Date().toISOString(),
  plan = buildEvidenceCollectionPlan(),
}: {
  generatedAt?: string;
  plan?: EvidenceCollectionPlan;
} = {}): ValidationCollectionPacket {
  const reviewerRosterTemplate = reviewerSlotsForPlan(plan);
  const batches = batchesForPlan(plan);
  const packet = ValidationCollectionPacketSchema.parse({
    batches,
    checklist: plan.cueValidation.collectionChecklist,
    commands: [
      {
        key: 'sessions-study-seed',
        label: 'Prepare study seed in Sessions',
        owner: 'product',
        purpose: 'Build packet-only review tasks from active cue-validation consent records.',
      },
      {
        key: 'sessions-worksheet-csv',
        label: 'Export blank worksheet CSV',
        owner: 'product',
        purpose: 'Give coaches a spreadsheet with empty reviewer and score cells.',
      },
      {
        key: 'coach-review',
        label: 'Collect real coach scores',
        owner: 'coach',
        purpose: 'Fill reviewer ids and 1-5 relevance, timing, drill-fit, and safety-language scores.',
      },
      {
        key: 'validation-gate',
        label: 'Run cue validation gate',
        owner: 'qa',
        purpose: 'Validate the completed dataset locally with npm run validation:cue.',
      },
    ],
    generatedAt,
    planSchemaVersion: plan.schemaVersion,
    privacy: {
      credentialValuesIncluded: false,
      localPathsIncluded: false,
      rawArtifactsIncluded: false,
      rawVideoIncluded: false,
      reviewerIdentitiesIncluded: false,
    },
    reviewerRosterTemplate,
    schemaVersion: validationCollectionPacketSchemaVersion,
    summary: {
      batchCount: batches.length,
      estimatedReviewRows: plan.summary.estimatedReviewRows,
      nextAction: 'Share this packet with product and coach reviewers, then collect real worksheet scores before dataset validation.',
      reviewerSlotCount: reviewerRosterTemplate.length,
      status: 'needs-real-world-evidence',
      targetClipCount: plan.cueValidation.minClips,
    },
  });

  return assertValidationCollectionPacketIsShareSafe(packet);
}
