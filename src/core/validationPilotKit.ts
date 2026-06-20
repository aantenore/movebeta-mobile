import { z } from 'zod';

import { buildEvidenceCollectionPlan, evidenceCollectionPlanSchemaVersion } from './evidenceCollectionPlan';

export const validationPilotKitSchemaVersion = 'movebeta.validation-pilot-kit.v1';

type EvidenceCollectionPlan = ReturnType<typeof buildEvidenceCollectionPlan>;

const ValidationPilotKitSprintSchema = z.object({
  captureFocus: z.string(),
  coachReviewRows: z.number().int().nonnegative(),
  consentScript: z.string(),
  coordinatorChecklist: z.array(z.string()),
  targetClips: z.number().int().nonnegative(),
  wallAngle: z.string(),
});

const ValidationPilotKitCommandSchema = z.object({
  command: z.string(),
  key: z.string(),
  label: z.string(),
  owner: z.enum(['product', 'coach', 'qa']),
  purpose: z.string(),
});

export const ValidationPilotKitSchema = z.object({
  commands: z.array(ValidationPilotKitCommandSchema),
  generatedAt: z.string(),
  planSchemaVersion: z.literal(evidenceCollectionPlanSchemaVersion),
  privacy: z.object({
    athleteIdentitiesIncluded: z.literal(false),
    coachIdentitiesIncluded: z.literal(false),
    credentialValuesIncluded: z.literal(false),
    localPathsIncluded: z.literal(false),
    rawArtifactsIncluded: z.literal(false),
    rawVideoIncluded: z.literal(false),
    reviewerScoresInvented: z.literal(false),
    videoLeavesDevice: z.literal(false),
  }),
  protocol: z.object({
    closeout: z.array(z.string()),
    consentPrinciples: z.array(z.string()),
    captureSetup: z.array(z.string()),
    reviewRules: z.array(z.string()),
  }),
  schemaVersion: z.literal(validationPilotKitSchemaVersion),
  sprints: z.array(ValidationPilotKitSprintSchema),
  summary: z.object({
    coachReviewRows: z.number().int().nonnegative(),
    nextAction: z.string(),
    pilotSprintCount: z.number().int().nonnegative(),
    status: z.literal('ready-to-run-pilot'),
    targetClips: z.number().int().nonnegative(),
  }),
});

export type ValidationPilotKit = z.infer<typeof ValidationPilotKitSchema>;

const forbiddenValidationPilotValuePattern =
  /(file:\/\/|content:\/\/|asset:\/\/|ph:\/\/|\/Users\/|\/private\/|\/var\/mobile\/|[A-Za-z]:\\|\.mov\b|\.mp4\b|rawVideoUri|videoUri|BEGIN PRIVATE KEY|ghp_[A-Za-z0-9_]+|pat_[A-Za-z0-9_]+|sk_live_[A-Za-z0-9_]+|sk_test_[A-Za-z0-9_]+|eyJ[A-Za-z0-9_-]{20,})/i;

function containsForbiddenValue(value: unknown): boolean {
  if (typeof value === 'string') return forbiddenValidationPilotValuePattern.test(value);
  if (Array.isArray(value)) return value.some(containsForbiddenValue);
  if (value && typeof value === 'object') return Object.values(value).some(containsForbiddenValue);
  return false;
}

function sprintForBatch(batch: EvidenceCollectionPlan['cueValidation']['collectionBatches'][number]) {
  return {
    captureFocus: batch.captureFocus,
    coachReviewRows: batch.estimatedReviewRows,
    consentScript:
      'Ask the athlete to approve local analysis and packet-only coach review before recording; keep raw video on the device.',
    coordinatorChecklist: [
      `Collect ${batch.targetClipCount} consented ${batch.wallAngle} attempts before moving extra clips into another angle bucket.`,
      'Confirm bystanders are out of frame or have consented before recording starts.',
      'Run the local analysis and prepare packet-only worksheet rows; do not export raw video.',
      `Assign ${batch.reviewerSlotsPerCue} coach reviewer slots per cue after packets are prepared.`,
    ],
    targetClips: batch.targetClipCount,
    wallAngle: batch.wallAngle,
  };
}

export function assertValidationPilotKitIsShareSafe(kit: ValidationPilotKit) {
  if (containsForbiddenValue(kit)) {
    throw new Error('Validation pilot kit contains credential values, local paths, raw artifacts, raw video references, or token-like data.');
  }
  return kit;
}

export function buildValidationPilotKit({
  generatedAt = new Date().toISOString(),
  plan = buildEvidenceCollectionPlan(),
}: {
  generatedAt?: string;
  plan?: EvidenceCollectionPlan;
} = {}): ValidationPilotKit {
  const sprints = plan.cueValidation.collectionBatches.map(sprintForBatch);
  const kit = ValidationPilotKitSchema.parse({
    commands: [
      {
        command: 'Prepare cue-validation study seed in Sessions',
        key: 'prepare-study-seed',
        label: 'Prepare study seed',
        owner: 'product',
        purpose: 'Create packet-only review tasks from active cue-validation consent records.',
      },
      {
        command: 'Export cue-validation worksheet CSV in Sessions',
        key: 'export-review-worksheet',
        label: 'Export worksheet',
        owner: 'product',
        purpose: 'Give coaches blank reviewer and score cells after consented packets are ready.',
      },
      {
        command: 'npm run validation:cue:doctor',
        key: 'cue-validation-doctor',
        label: 'Refresh dataset doctor',
        owner: 'qa',
        purpose: 'Check whether the completed real-review dataset is present and ready without embedding dataset rows.',
      },
      {
        command: 'npm run model:evidence:sync',
        key: 'model-evidence-sync',
        label: 'Sync model evidence',
        owner: 'qa',
        purpose: 'Promote real-world model validation only after the cue-validation dataset doctor reports ready.',
      },
    ],
    generatedAt,
    planSchemaVersion: plan.schemaVersion,
    privacy: {
      athleteIdentitiesIncluded: false,
      coachIdentitiesIncluded: false,
      credentialValuesIncluded: false,
      localPathsIncluded: false,
      rawArtifactsIncluded: false,
      rawVideoIncluded: false,
      reviewerScoresInvented: false,
      videoLeavesDevice: false,
    },
    protocol: {
      captureSetup: [
        'Use stable side-angle framing with the climber fully visible before the first move starts.',
        'Prefer well-lit indoor attempts and keep route grade, gym or wall, and wall angle filled in session metadata.',
        'Retake clips when capture readiness reports privacy blockers or weak pose signal.',
      ],
      closeout: [
        'Compose the completed worksheet into cue-validation dataset JSON only after real coach scores are present.',
        'Run npm run validation:cue and npm run validation:cue:doctor before claiming real-world validation.',
        'Run npm run model:evidence:sync after the doctor is ready to update in-app model evidence.',
      ],
      consentPrinciples: [
        'Capture only athletes who explicitly consent to local analysis and packet-only coach review.',
        'Keep raw video on the device and share only privacy-safe packets or blank worksheets.',
        'Do not record bystanders unless consent is handled before the attempt.',
      ],
      reviewRules: [
        'Coach reviewers score packet-only rows; reviewer identities and 1-5 scores are entered only after real review.',
        'Scores must cover relevance, timing accuracy, drill fit, and safety language.',
        'No reviewer score may be invented to satisfy a release gate.',
      ],
    },
    schemaVersion: validationPilotKitSchemaVersion,
    sprints,
    summary: {
      coachReviewRows: plan.summary.estimatedReviewRows,
      nextAction: 'Run the pilot sprints, collect real coach worksheet scores, then compose and validate the cue-validation dataset.',
      pilotSprintCount: sprints.length,
      status: 'ready-to-run-pilot',
      targetClips: plan.cueValidation.minClips,
    },
  });

  return assertValidationPilotKitIsShareSafe(kit);
}
