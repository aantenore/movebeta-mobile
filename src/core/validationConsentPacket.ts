import { z } from 'zod';

import { buildEvidenceCollectionPlan, evidenceCollectionPlanSchemaVersion } from './evidenceCollectionPlan';

export const validationConsentPacketSchemaVersion = 'movebeta.validation-consent-packet.v1';

type EvidenceCollectionPlan = ReturnType<typeof buildEvidenceCollectionPlan>;

const ValidationConsentCaptureBatchSchema = z.object({
  captureFocus: z.string(),
  consentChecklist: z.array(z.string()).min(1),
  requiredMetadata: z.array(
    z.object({
      key: z.string(),
      label: z.string(),
      privacyRole: z.enum(['training-context', 'capture-quality', 'consent-proof']),
      required: z.boolean(),
    }),
  ),
  targetClipCount: z.number().int().nonnegative(),
  wallAngle: z.string(),
});

const ValidationConsentCommandSchema = z.object({
  command: z.string(),
  key: z.string(),
  label: z.string(),
  owner: z.enum(['product', 'qa', 'coach']),
  purpose: z.string(),
});

export const ValidationConsentPacketSchema = z.object({
  captureBatches: z.array(ValidationConsentCaptureBatchSchema),
  commands: z.array(ValidationConsentCommandSchema),
  consentProtocol: z.object({
    athleteScript: z.string(),
    bystanderPolicy: z.string(),
    consentChecks: z.array(z.string()).min(1),
    retentionPolicy: z.string(),
    withdrawalPolicy: z.string(),
  }),
  generatedAt: z.string(),
  planSchemaVersion: z.literal(evidenceCollectionPlanSchemaVersion),
  privacy: z.object({
    athleteIdentitiesIncluded: z.literal(false),
    bystanderIdentitiesIncluded: z.literal(false),
    coachIdentitiesIncluded: z.literal(false),
    credentialValuesIncluded: z.literal(false),
    localPathsIncluded: z.literal(false),
    rawArtifactsIncluded: z.literal(false),
    rawVideoIncluded: z.literal(false),
    reviewerScoresInvented: z.literal(false),
    tokenLikeValuesIncluded: z.literal(false),
    videoUriIncluded: z.literal(false),
  }),
  schemaVersion: z.literal(validationConsentPacketSchemaVersion),
  summary: z.object({
    batchCount: z.number().int().nonnegative(),
    consentStepCount: z.number().int().nonnegative(),
    nextAction: z.string(),
    status: z.literal('ready-for-consent-run'),
    targetClipCount: z.number().int().nonnegative(),
  }),
});

export type ValidationConsentPacket = z.infer<typeof ValidationConsentPacketSchema>;

const forbiddenValidationConsentValuePattern =
  /(file:\/\/|content:\/\/|asset:\/\/|ph:\/\/|\/Users\/|\/private\/|\/var\/mobile\/|[A-Za-z]:\\|\.mov\b|\.mp4\b|rawVideoUri|videoUri|athleteId|bystanderId|email|phone|BEGIN PRIVATE KEY|ghp_[A-Za-z0-9_]+|github_pat_[A-Za-z0-9_]+|pat_[A-Za-z0-9_]+|sk_live_[A-Za-z0-9_]+|sk_test_[A-Za-z0-9_]+|bearer\s+[A-Za-z0-9._-]+|eyJ[A-Za-z0-9_-]{20,})/i;

function containsForbiddenValue(value: unknown): boolean {
  if (typeof value === 'string') return forbiddenValidationConsentValuePattern.test(value);
  if (Array.isArray(value)) return value.some(containsForbiddenValue);
  if (value && typeof value === 'object') return Object.values(value).some(containsForbiddenValue);
  return false;
}

function captureBatchForPlanBatch(batch: EvidenceCollectionPlan['cueValidation']['collectionBatches'][number]) {
  return {
    captureFocus: batch.captureFocus,
    consentChecklist: [
      'Confirm local analysis and packet-only coach review are approved before recording.',
      'Confirm raw video remains on the capture device unless a separate explicit export consent is collected.',
      'Confirm bystanders are out of frame or their consent is handled before the attempt starts.',
      'Confirm the athlete can withdraw the clip before worksheet composition.',
    ],
    requiredMetadata: [
      {
        key: 'wallAngle',
        label: 'Wall angle bucket',
        privacyRole: 'training-context' as const,
        required: true,
      },
      {
        key: 'gradeBand',
        label: 'Grade or movement focus',
        privacyRole: 'training-context' as const,
        required: true,
      },
      {
        key: 'captureReadiness',
        label: 'Capture readiness state',
        privacyRole: 'capture-quality' as const,
        required: true,
      },
      {
        key: 'consentStatus',
        label: 'Consent granted before recording',
        privacyRole: 'consent-proof' as const,
        required: true,
      },
    ],
    targetClipCount: batch.targetClipCount,
    wallAngle: batch.wallAngle,
  };
}

export function assertValidationConsentPacketIsShareSafe(packet: ValidationConsentPacket) {
  if (containsForbiddenValue(packet)) {
    throw new Error('Validation consent packet contains identity, credential, local path, raw artifact, raw video, or token-like data.');
  }
  return packet;
}

export function buildValidationConsentPacket({
  generatedAt = new Date().toISOString(),
  plan = buildEvidenceCollectionPlan(),
}: {
  generatedAt?: string;
  plan?: EvidenceCollectionPlan;
} = {}): ValidationConsentPacket {
  const captureBatches = plan.cueValidation.collectionBatches.map(captureBatchForPlanBatch);
  const consentChecks = [
    'State that the app performs local movement analysis and does not need cloud upload for this validation run.',
    'State that coaches receive packet-only evidence and blank worksheets, not raw video files.',
    'State that reviewer scores are entered only after real coach review.',
    'State that the athlete may withdraw a clip before it is included in the validation dataset.',
  ];
  const packet = ValidationConsentPacketSchema.parse({
    captureBatches,
    commands: [
      {
        command: 'Use Analyze capture prep before recording each validation clip',
        key: 'capture-prep',
        label: 'Run capture prep',
        owner: 'product',
        purpose: 'Confirm framing, privacy blockers, and movement visibility before a validation attempt is recorded.',
      },
      {
        command: 'Prepare cue-validation study seed in Sessions only from consented reports',
        key: 'prepare-consented-seed',
        label: 'Prepare consented seed',
        owner: 'product',
        purpose: 'Keep validation rows tied to consented packet-only reports before coach worksheets are exported.',
      },
      {
        command: 'Run npm run validation:cue:doctor after completed coach worksheets are composed',
        key: 'validate-consent-output',
        label: 'Validate dataset output',
        owner: 'qa',
        purpose: 'Verify the real-review dataset is present, complete, and privacy-safe before release evidence is promoted.',
      },
    ],
    consentProtocol: {
      athleteScript:
        'This validation run keeps raw video on this device and shares only packet-only movement evidence with coach reviewers. You can withdraw the clip before dataset composition.',
      bystanderPolicy: 'Record only when bystanders are out of frame or their consent has been handled before the attempt.',
      consentChecks,
      retentionPolicy: 'Keep raw video local and exclude video URIs, local paths, faces, names, and contact details from shared packets.',
      withdrawalPolicy: 'Remove withdrawn clips before study seed, worksheet, dataset, model-evidence sync, or release-handoff steps.',
    },
    generatedAt,
    planSchemaVersion: plan.schemaVersion,
    privacy: {
      athleteIdentitiesIncluded: false,
      bystanderIdentitiesIncluded: false,
      coachIdentitiesIncluded: false,
      credentialValuesIncluded: false,
      localPathsIncluded: false,
      rawArtifactsIncluded: false,
      rawVideoIncluded: false,
      reviewerScoresInvented: false,
      tokenLikeValuesIncluded: false,
      videoUriIncluded: false,
    },
    schemaVersion: validationConsentPacketSchemaVersion,
    summary: {
      batchCount: captureBatches.length,
      consentStepCount: consentChecks.length,
      nextAction: 'Run the consent script before each validation clip, then prepare only consented packet evidence for coach review.',
      status: 'ready-for-consent-run',
      targetClipCount: plan.cueValidation.minClips,
    },
  });

  return assertValidationConsentPacketIsShareSafe(packet);
}

export function formatValidationConsentPacketSummary(packet: ValidationConsentPacket) {
  return [
    `Validation consent: ${packet.summary.status}`,
    `Targets: ${packet.summary.targetClipCount} clips across ${packet.summary.batchCount} batches`,
    `Consent checks: ${packet.summary.consentStepCount}`,
    `Privacy: raw video no - URI no - identities no - tokens no`,
  ].join('\n');
}
