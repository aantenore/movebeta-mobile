import { z } from 'zod';

import {
  buildReleaseUnblockChecklist,
  ReleaseUnblockChecklistSchema,
  type ReleaseUnblockChecklist,
  type ReleaseUnblockChecklistItem,
} from './releaseUnblockChecklist';
import { LaunchReadinessEvidenceSchema, LaunchStatusSchema, LaunchTrackSchema, type LaunchReadinessEvidence } from './launchReadiness';

export const externalEvidenceIntakeSchemaVersion = 'movebeta.external-evidence-intake.v1';
export const externalEvidenceIntakeTemplateSchemaVersion = 'movebeta.external-evidence-intake-template.v1';

const IntakeOwnerSchema = z.enum(['engineering', 'qa', 'product', 'release']);
const IntakeStatusSchema = z.enum(['ready', 'needs-evidence']);

const ExternalEvidenceIntakeProofSchema = z.object({
  acceptedReferenceTypes: z.array(z.enum(['relative-path', 'report-id', 'issue-url', 'ci-run-url', 'store-console-state'])),
  evidenceReference: z.literal(''),
  expectedProof: z.string().min(1),
  notes: z.literal(''),
  status: z.literal('missing'),
});

const ExternalEvidenceIntakeItemSchema = z.object({
  acceptance: z.array(z.string()).min(1),
  commands: z.array(z.string()).min(1),
  envKeys: z.array(z.string()),
  key: z.string().min(1),
  label: z.string().min(1),
  owner: IntakeOwnerSchema,
  proof: z.array(ExternalEvidenceIntakeProofSchema).min(1),
  secretPolicy: z.string().min(1),
  sourceStatus: LaunchStatusSchema,
  tracks: z.array(LaunchTrackSchema).min(1),
});

export const ExternalEvidenceIntakeTemplateSchema = z.object({
  generatedAt: z.string(),
  instructions: z.array(z.string()).min(1),
  items: z.array(ExternalEvidenceIntakeItemSchema),
  privacy: z.object({
    credentialValuesIncluded: z.literal(false),
    localPathsIncluded: z.literal(false),
    rawArtifactsIncluded: z.literal(false),
    rawVideoIncluded: z.literal(false),
    tokenLikeValuesIncluded: z.literal(false),
  }),
  schemaVersion: z.literal(externalEvidenceIntakeTemplateSchemaVersion),
});

export const ExternalEvidenceIntakeReportSchema = z.object({
  generatedAt: z.string(),
  intakeTemplate: ExternalEvidenceIntakeTemplateSchema,
  privacy: z.object({
    credentialValuesIncluded: z.literal(false),
    localPathsIncluded: z.literal(false),
    rawArtifactsIncluded: z.literal(false),
    rawVideoIncluded: z.literal(false),
    tokenLikeValuesIncluded: z.literal(false),
  }),
  schemaVersion: z.literal(externalEvidenceIntakeSchemaVersion),
  sourceChecklist: ReleaseUnblockChecklistSchema,
  summary: z.object({
    commandCount: z.number().int().nonnegative(),
    intakeItemCount: z.number().int().nonnegative(),
    nextAction: z.string(),
    ownerCount: z.number().int().nonnegative(),
    proofReferenceCount: z.number().int().nonnegative(),
    status: IntakeStatusSchema,
  }),
});

export type ExternalEvidenceIntakeReport = z.infer<typeof ExternalEvidenceIntakeReportSchema>;
export type ExternalEvidenceIntakeTemplate = z.infer<typeof ExternalEvidenceIntakeTemplateSchema>;

const forbiddenExternalEvidenceValuePattern =
  /(file:\/\/|content:\/\/|asset:\/\/|ph:\/\/|\/Users\/|\/private\/|\/var\/mobile\/|[A-Za-z]:\\|\.mov\b|\.mp4\b|rawVideoUri|videoUri|BEGIN PRIVATE KEY|ghp_[A-Za-z0-9_]+|github_pat_[A-Za-z0-9_]+|pat_[A-Za-z0-9_]+|sk_live_[A-Za-z0-9_]+|sk_test_[A-Za-z0-9_]+|bearer\s+[A-Za-z0-9._-]+|eyJ[A-Za-z0-9_-]{20,}|"private_key"\s*:|"client_email"\s*:)/i;

function containsForbiddenValue(value: unknown): boolean {
  if (typeof value === 'string') return forbiddenExternalEvidenceValuePattern.test(value);
  if (Array.isArray(value)) return value.some(containsForbiddenValue);
  if (value && typeof value === 'object') return Object.values(value).some(containsForbiddenValue);
  return false;
}

function acceptedReferenceTypes(item: ReleaseUnblockChecklistItem) {
  if (item.key === 'easProject' || item.key === 'easCredentials') {
    return ['report-id', 'ci-run-url', 'store-console-state'] as const;
  }

  if (item.key === 'iosBuild') {
    return ['relative-path', 'ci-run-url'] as const;
  }

  return ['relative-path', 'report-id'] as const;
}

function buildTemplateItem(item: ReleaseUnblockChecklistItem): z.infer<typeof ExternalEvidenceIntakeItemSchema> {
  return ExternalEvidenceIntakeItemSchema.parse({
    acceptance: item.acceptance,
    commands: item.commands,
    envKeys: item.envKeys,
    key: item.key,
    label: item.label,
    owner: item.owner,
    proof: item.proof.map((expectedProof) => ({
      acceptedReferenceTypes: [...acceptedReferenceTypes(item)],
      evidenceReference: '',
      expectedProof,
      notes: '',
      status: 'missing',
    })),
    secretPolicy: item.secretPolicy,
    sourceStatus: item.status,
    tracks: item.tracks,
  });
}

export function assertExternalEvidenceIntakeIsShareSafe<T extends ExternalEvidenceIntakeReport | ExternalEvidenceIntakeTemplate>(value: T) {
  if (containsForbiddenValue(value)) {
    throw new Error('External evidence intake contains credential values, local paths, raw artifacts, raw video references, or token-like data.');
  }
  return value;
}

export function buildExternalEvidenceIntakeReport({
  checklist,
  evidence,
  generatedAt = new Date().toISOString(),
}: {
  checklist?: ReleaseUnblockChecklist;
  evidence?: LaunchReadinessEvidence;
  generatedAt?: string;
} = {}): ExternalEvidenceIntakeReport {
  const sourceChecklist =
    checklist ?? buildReleaseUnblockChecklist(evidence ? LaunchReadinessEvidenceSchema.parse(evidence) : undefined);
  const items = sourceChecklist.items.map(buildTemplateItem);
  const proofReferenceCount = items.reduce((total, item) => total + item.proof.length, 0);
  const commandCount = items.reduce((total, item) => total + item.commands.length, 0);
  const ownerCount = new Set(items.map((item) => item.owner)).size;
  const status = items.length === 0 ? 'ready' : 'needs-evidence';
  const nextAction =
    status === 'ready'
      ? 'All external evidence intake items are cleared.'
      : 'Fill the template with share-safe references to real proof artifacts, then rerun release readiness checks.';

  const intakeTemplate = ExternalEvidenceIntakeTemplateSchema.parse({
    generatedAt,
    instructions: [
      'Use relative repository paths, issue URLs, CI run URLs, or provider-console state references only.',
      'Do not paste credential values, private keys, raw video paths, absolute local paths, reviewer identities, or raw local artifacts.',
      'After proof is collected, run the listed commands and regenerate release readiness, freshness, blocker issues, and handoff reports.',
    ],
    items,
    privacy: {
      credentialValuesIncluded: false,
      localPathsIncluded: false,
      rawArtifactsIncluded: false,
      rawVideoIncluded: false,
      tokenLikeValuesIncluded: false,
    },
    schemaVersion: externalEvidenceIntakeTemplateSchemaVersion,
  });

  const report = ExternalEvidenceIntakeReportSchema.parse({
    generatedAt,
    intakeTemplate,
    privacy: {
      credentialValuesIncluded: false,
      localPathsIncluded: false,
      rawArtifactsIncluded: false,
      rawVideoIncluded: false,
      tokenLikeValuesIncluded: false,
    },
    schemaVersion: externalEvidenceIntakeSchemaVersion,
    sourceChecklist,
    summary: {
      commandCount,
      intakeItemCount: items.length,
      nextAction,
      ownerCount,
      proofReferenceCount,
      status,
    },
  });

  return assertExternalEvidenceIntakeIsShareSafe(report);
}
