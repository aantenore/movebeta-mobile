import { z } from 'zod';

import { type buildEvidenceCollectionPlan } from './evidenceCollectionPlan';
import { type ReleaseUnblockChecklist } from './releaseUnblockChecklist';
import { type ValidationPilotKit } from './validationPilotKit';

export const fieldValidationOpsPacketSchemaVersion = 'movebeta.field-validation-ops-packet.v1';

type EvidenceCollectionPlan = ReturnType<typeof buildEvidenceCollectionPlan>;

const FieldValidationOpsCommandSchema = z.object({
  command: z.string(),
  key: z.string(),
  label: z.string(),
  owner: z.enum(['product', 'coach', 'qa', 'release', 'engineering']),
  purpose: z.string(),
});

const FieldValidationOpsArtifactSchema = z.object({
  key: z.string(),
  label: z.string(),
  path: z.string(),
  requiredFor: z.array(z.enum(['technical-validation', 'internal-beta', 'store-submission'])),
});

const FieldValidationOpsPhaseSchema = z.object({
  acceptance: z.array(z.string()).min(1),
  commands: z.array(FieldValidationOpsCommandSchema).min(1),
  duration: z.string(),
  key: z.enum(['prepare', 'collect', 'validate', 'promote']),
  label: z.string(),
  owner: z.enum(['product', 'qa', 'release']),
  outputs: z.array(FieldValidationOpsArtifactSchema).min(1),
  status: z.enum(['ready-to-run', 'needs-real-world-input']),
});

export const FieldValidationOpsPacketSchema = z.object({
  artifacts: z.array(FieldValidationOpsArtifactSchema),
  generatedAt: z.string(),
  phases: z.array(FieldValidationOpsPhaseSchema),
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
  schemaVersion: z.literal(fieldValidationOpsPacketSchemaVersion),
  summary: z.object({
    blockerCount: z.number().int().nonnegative(),
    coachReviewRows: z.number().int().nonnegative(),
    deviceRuns: z.number().int().nonnegative(),
    nextAction: z.string(),
    ownerCount: z.number().int().nonnegative(),
    phaseCount: z.number().int().positive(),
    status: z.literal('ready-to-coordinate'),
    targetClips: z.number().int().nonnegative(),
  }),
});

export type FieldValidationOpsPacket = z.infer<typeof FieldValidationOpsPacketSchema>;

const forbiddenOpsPacketValuePattern =
  /(file:\/\/|content:\/\/|asset:\/\/|ph:\/\/|\/Users\/|\/private\/|\/var\/mobile\/|[A-Za-z]:\\|\.mov\b|\.mp4\b|rawVideoUri|videoUri|BEGIN PRIVATE KEY|ghp_[A-Za-z0-9_]+|github_pat_[A-Za-z0-9_]+|pat_[A-Za-z0-9_]+|sk_live_[A-Za-z0-9_]+|sk_test_[A-Za-z0-9_]+|bearer\s+[A-Za-z0-9._-]+|eyJ[A-Za-z0-9_-]{20,})/i;

function containsForbiddenValue(value: unknown): boolean {
  if (typeof value === 'string') return forbiddenOpsPacketValuePattern.test(value);
  if (Array.isArray(value)) return value.some(containsForbiddenValue);
  if (value && typeof value === 'object') return Object.values(value).some(containsForbiddenValue);
  return false;
}

function uniqueArtifacts(phases: Array<z.infer<typeof FieldValidationOpsPhaseSchema>>) {
  const seen = new Set<string>();
  return phases.flatMap((phase) => phase.outputs).filter((artifact) => {
    if (seen.has(artifact.key)) return false;
    seen.add(artifact.key);
    return true;
  });
}

export function assertFieldValidationOpsPacketIsShareSafe(packet: FieldValidationOpsPacket) {
  if (containsForbiddenValue(packet)) {
    throw new Error('Field validation ops packet contains credential values, local paths, raw artifacts, raw video references, or token-like data.');
  }
  return packet;
}

export function buildFieldValidationOpsPacket({
  evidencePlan,
  generatedAt = new Date().toISOString(),
  releaseUnblockChecklist,
  validationPilotKit,
}: {
  evidencePlan: EvidenceCollectionPlan;
  generatedAt?: string;
  releaseUnblockChecklist: ReleaseUnblockChecklist;
  validationPilotKit: ValidationPilotKit;
}): FieldValidationOpsPacket {
  const phases = [
    {
      acceptance: [
        'Cue-validation study seed is prepared only from active consented coach packets.',
        'Blank worksheet and pilot kit are ready without raw video, reviewer identities, or invented scores.',
      ],
      commands: [
        {
          command: 'Prepare cue-validation study seed in Sessions',
          key: 'prepare-study-seed',
          label: 'Prepare study seed',
          owner: 'product',
          purpose: 'Create packet-only review tasks from active consent records before recruiting reviewers.',
        },
        {
          command: 'Export cue-validation worksheet CSV in Sessions',
          key: 'export-review-worksheet',
          label: 'Export worksheet',
          owner: 'product',
          purpose: 'Create blank reviewer and score cells for real coach review.',
        },
      ],
      duration: 'Day 0',
      key: 'prepare',
      label: 'Prepare consented packets',
      owner: 'product',
      outputs: [
        {
          key: 'study-seed',
          label: 'Cue-validation study seed',
          path: 'Prepared Sessions study seed export',
          requiredFor: ['technical-validation', 'store-submission'],
        },
        {
          key: 'review-worksheet',
          label: 'Blank coach worksheet CSV',
          path: 'Prepared Sessions worksheet CSV export',
          requiredFor: ['technical-validation', 'store-submission'],
        },
      ],
      status: 'ready-to-run',
    },
    {
      acceptance: [
        `${evidencePlan.cueValidation.minClips} consented clips cover ${evidencePlan.cueValidation.requiredWallAngles.join(', ')} wall angles.`,
        `${validationPilotKit.summary.coachReviewRows} real coach review rows are completed without fabricated reviewer scores.`,
        `${evidencePlan.nativeQa.requiredRuns} physical-device QA runs cover every native workflow.`,
      ],
      commands: [
        {
          command: 'Run validation pilot sprints from the Plan tab',
          key: 'run-pilot-sprints',
          label: 'Run pilot sprints',
          owner: 'product',
          purpose: 'Collect consented clip coverage across the required wall angles.',
        },
        {
          command: 'npm run native:qa:runbook',
          key: 'native-qa-runbook',
          label: 'Prepare native QA runbook',
          owner: 'qa',
          purpose: 'Generate the physical-device workflow checklist before measuring device runs.',
        },
        {
          command: 'npm run native:qa:starter',
          key: 'native-qa-starter',
          label: 'Prepare native QA evidence input',
          owner: 'qa',
          purpose: 'Generate the structured input template before composing measured device evidence.',
        },
      ],
      duration: 'Days 1-7',
      key: 'collect',
      label: 'Collect real evidence',
      owner: 'product',
      outputs: [
        {
          key: 'completed-worksheet',
          label: 'Completed coach worksheet CSV',
          path: 'Completed worksheet CSV from real coach review',
          requiredFor: ['technical-validation', 'store-submission'],
        },
        {
          key: 'native-qa-evidence',
          label: 'Native QA evidence JSON',
          path: 'docs/sdlc/native-qa-evidence.json',
          requiredFor: ['internal-beta', 'store-submission'],
        },
      ],
      status: 'needs-real-world-input',
    },
    {
      acceptance: [
        'Cue-validation dataset gate passes from completed worksheet data.',
        'Native QA validator passes with measured physical-device values.',
        'Release readiness detects the new evidence without configured/detected drift.',
      ],
      commands: [
        {
          command: 'Compose cue-validation dataset JSON in Sessions',
          key: 'compose-validation-dataset',
          label: 'Compose dataset',
          owner: 'product',
          purpose: 'Convert completed worksheet rows into the versioned dataset JSON.',
        },
        {
          command: 'npm run validation:cue && npm run validation:cue:doctor',
          key: 'validate-cue-dataset',
          label: 'Validate cue dataset',
          owner: 'qa',
          purpose: 'Prove real-review cue data is complete and share-safe.',
        },
        {
          command: 'npm run native:qa:validate',
          key: 'validate-native-qa',
          label: 'Validate native QA',
          owner: 'qa',
          purpose: 'Prove physical-device QA evidence is complete and privacy-safe.',
        },
      ],
      duration: 'Day 8',
      key: 'validate',
      label: 'Validate release evidence',
      owner: 'qa',
      outputs: [
        {
          key: 'cue-validation-dataset',
          label: 'Cue-validation dataset JSON',
          path: 'docs/validation/cue-validation-dataset.json',
          requiredFor: ['technical-validation', 'store-submission'],
        },
        {
          key: 'launch-readiness-report',
          label: 'Launch readiness report',
          path: 'docs/sdlc/launch-readiness-report.json',
          requiredFor: ['internal-beta', 'store-submission'],
        },
      ],
      status: 'needs-real-world-input',
    },
    {
      acceptance: [
        'Model evidence is synced only after real-world validation reports ready.',
        'Strict EAS gate passes with account-bound values stored outside the repository.',
        'Release handoff and archives are regenerated from a clean worktree.',
      ],
      commands: [
        {
          command: 'npm run model:evidence:sync',
          key: 'model-evidence-sync',
          label: 'Sync model evidence',
          owner: 'engineering',
          purpose: 'Promote real-world model validation into app config after validation reports ready.',
        },
        {
          command: 'npm run release:eas:strict',
          key: 'strict-eas-gate',
          label: 'Run strict EAS gate',
          owner: 'release',
          purpose: 'Verify account-bound Expo, Apple, and Google prerequisites without committing values.',
        },
        {
          command: 'npm run release:handoff && npm run release:archives',
          key: 'handoff-archives',
          label: 'Refresh handoff',
          owner: 'release',
          purpose: 'Refresh stakeholder packet, source archive, web archive, and checksums.',
        },
      ],
      duration: 'Day 9',
      key: 'promote',
      label: 'Promote release evidence',
      owner: 'release',
      outputs: [
        {
          key: 'release-handoff',
          label: 'Release handoff packet',
          path: 'docs/sdlc/release-handoff-packet.json',
          requiredFor: ['internal-beta', 'store-submission'],
        },
        {
          key: 'release-archives',
          label: 'Release archive manifest',
          path: '../movebeta-mobile-release-archives.json',
          requiredFor: ['store-submission'],
        },
      ],
      status: releaseUnblockChecklist.summary.status === 'ready' ? 'ready-to-run' : 'needs-real-world-input',
    },
  ] satisfies Array<z.infer<typeof FieldValidationOpsPhaseSchema>>;
  const artifacts = uniqueArtifacts(phases);
  const owners = new Set(phases.map((phase) => phase.owner));
  const packet = FieldValidationOpsPacketSchema.parse({
    artifacts,
    generatedAt,
    phases,
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
    schemaVersion: fieldValidationOpsPacketSchemaVersion,
    summary: {
      blockerCount: releaseUnblockChecklist.summary.blockedItems,
      coachReviewRows: validationPilotKit.summary.coachReviewRows,
      deviceRuns: evidencePlan.nativeQa.requiredRuns,
      nextAction:
        'Coordinate the field validation run: prepare consented packets, collect real clips and device runs, validate evidence, then promote release artifacts.',
      ownerCount: owners.size,
      phaseCount: phases.length,
      status: 'ready-to-coordinate',
      targetClips: evidencePlan.cueValidation.minClips,
    },
  });

  return assertFieldValidationOpsPacketIsShareSafe(packet);
}
