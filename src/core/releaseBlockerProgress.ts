import { z } from 'zod';

import { LaunchReadinessCheckKeySchema, LaunchStatusSchema, LaunchTrackSchema } from './launchReadiness';
import { type ReleaseCriticalPath } from './releaseCriticalPath';
import { type ReleaseUnblockChecklist } from './releaseUnblockChecklist';
import {
  ExternalEvidenceIntakeReportSchema,
  ExternalEvidenceValidationReportSchema,
  type ExternalEvidenceIntakeReport,
  type ExternalEvidenceValidationReport,
} from './externalEvidenceIntake';

export const releaseBlockerProgressSchemaVersion = 'movebeta.release-blocker-progress.v1';

const ReleaseBlockerProgressStatusSchema = z.enum(['ready', 'needs-external-evidence']);
const ReleaseBlockerProgressItemStatusSchema = z.enum(['blocked-by-dependency', 'needs-proof', 'proof-ready']);
const ReleaseBlockerProgressLaneSchema = z.enum(['real-world-validation', 'native-build-qa', 'store-accounts']);
const ReleaseBlockerProgressReferenceTypeSchema = z.enum([
  'relative-path',
  'report-id',
  'issue-url',
  'ci-run-url',
  'store-console-state',
]);

const ReleaseBlockerProgressProofSchema = z.object({
  acceptedReferenceTypes: z.array(ReleaseBlockerProgressReferenceTypeSchema),
  expectedProof: z.string(),
  status: z.enum(['accepted', 'missing']),
});

const ReleaseBlockerProgressItemSchema = z.object({
  acceptedProofCount: z.number().int().nonnegative(),
  action: z.string(),
  blockedBy: z.array(LaunchReadinessCheckKeySchema),
  commandCount: z.number().int().nonnegative(),
  currentCommand: z.string(),
  key: LaunchReadinessCheckKeySchema,
  label: z.string(),
  lane: ReleaseBlockerProgressLaneSchema,
  missingProofCount: z.number().int().nonnegative(),
  owner: z.enum(['engineering', 'qa', 'product', 'release']),
  proof: z.array(ReleaseBlockerProgressProofSchema),
  sourceStatus: LaunchStatusSchema,
  status: ReleaseBlockerProgressItemStatusSchema,
  tracks: z.array(LaunchTrackSchema).min(1),
});

export const ReleaseBlockerProgressSchema = z.object({
  generatedAt: z.string(),
  items: z.array(ReleaseBlockerProgressItemSchema),
  privacy: z.object({
    credentialValuesIncluded: z.literal(false),
    localPathsIncluded: z.literal(false),
    rawArtifactsIncluded: z.literal(false),
    rawVideoIncluded: z.literal(false),
    tokenLikeValuesIncluded: z.literal(false),
  }),
  schemaVersion: z.literal(releaseBlockerProgressSchemaVersion),
  summary: z.object({
    acceptedProofCount: z.number().int().nonnegative(),
    blockerCount: z.number().int().nonnegative(),
    commandCount: z.number().int().nonnegative(),
    dependencyBlockedCount: z.number().int().nonnegative(),
    missingProofCount: z.number().int().nonnegative(),
    needsProofCount: z.number().int().nonnegative(),
    nextAction: z.string(),
    proofReadyCount: z.number().int().nonnegative(),
    status: ReleaseBlockerProgressStatusSchema,
  }),
});

export type ReleaseBlockerProgress = z.infer<typeof ReleaseBlockerProgressSchema>;
export type ReleaseBlockerProgressItem = z.infer<typeof ReleaseBlockerProgressItemSchema>;

export type ReleaseBlockerProgressInput = {
  checklist: ReleaseUnblockChecklist;
  criticalPath: ReleaseCriticalPath;
  generatedAt?: string;
  intakeReport?: unknown;
  validationReport?: unknown;
};

const forbiddenReleaseBlockerProgressValuePattern =
  /(file:\/\/|content:\/\/|asset:\/\/|ph:\/\/|\/Users\/|\/private\/|\/var\/mobile\/|[A-Za-z]:\\|\.mov\b|\.mp4\b|rawVideoUri|videoUri|BEGIN PRIVATE KEY|ghp_[A-Za-z0-9_]+|github_pat_[A-Za-z0-9_]+|pat_[A-Za-z0-9_]+|sk_live_[A-Za-z0-9_]+|sk_test_[A-Za-z0-9_]+|bearer\s+[A-Za-z0-9._-]+|eyJ[A-Za-z0-9_-]{20,}|"private_key"\s*:|"client_email"\s*:)/i;

function containsForbiddenReleaseBlockerProgressValue(value: unknown): boolean {
  if (typeof value === 'string') return forbiddenReleaseBlockerProgressValuePattern.test(value);
  if (Array.isArray(value)) return value.some(containsForbiddenReleaseBlockerProgressValue);
  if (value && typeof value === 'object') return Object.values(value).some(containsForbiddenReleaseBlockerProgressValue);
  return false;
}

function intakeByKey(intakeReport?: ExternalEvidenceIntakeReport) {
  return new Map((intakeReport?.intakeTemplate.items ?? []).map((item) => [item.key, item]));
}

function criticalPathByKey(criticalPath: ReleaseCriticalPath) {
  return new Map(criticalPath.steps.map((step) => [step.key, step]));
}

function acceptedProofKeys(validationReport?: ExternalEvidenceValidationReport) {
  return new Set(
    (validationReport?.checks ?? [])
      .filter((check) => check.status === 'pass')
      .map((check) => `${check.itemKey}:${check.expectedProof}`),
  );
}

function itemStatus({
  acceptedProofCount,
  blockedBy,
  proofCount,
}: {
  acceptedProofCount: number;
  blockedBy: string[];
  proofCount: number;
}): ReleaseBlockerProgressItem['status'] {
  if (blockedBy.length > 0) return 'blocked-by-dependency';
  if (proofCount > 0 && acceptedProofCount === proofCount) return 'proof-ready';
  return 'needs-proof';
}

function nextActionFor(items: ReleaseBlockerProgressItem[]) {
  const needsProof = items.find((item) => item.status === 'needs-proof');
  if (needsProof) return `${needsProof.owner}: ${needsProof.action}`;

  const blocked = items.find((item) => item.status === 'blocked-by-dependency');
  if (blocked) return `${blocked.owner}: clear ${blocked.blockedBy.join(', ')} before ${blocked.label}.`;

  return 'All release blocker proof references are accepted; rerun release readiness and handoff gates.';
}

export function assertReleaseBlockerProgressIsShareSafe(packet: ReleaseBlockerProgress) {
  if (containsForbiddenReleaseBlockerProgressValue(packet)) {
    throw new Error('Release blocker progress contains credential values, local paths, raw artifacts, raw video references, or token-like data.');
  }
  return packet;
}

export function buildReleaseBlockerProgress({
  checklist,
  criticalPath,
  generatedAt = new Date().toISOString(),
  intakeReport,
  validationReport,
}: ReleaseBlockerProgressInput): ReleaseBlockerProgress {
  const parsedIntakeReport = intakeReport ? ExternalEvidenceIntakeReportSchema.parse(intakeReport) : undefined;
  const parsedValidationReport = validationReport ? ExternalEvidenceValidationReportSchema.parse(validationReport) : undefined;
  const intakeItems = intakeByKey(parsedIntakeReport);
  const criticalSteps = criticalPathByKey(criticalPath);
  const acceptedProofs = acceptedProofKeys(parsedValidationReport);
  const items = checklist.items.map((checklistItem) => {
    const criticalStep = criticalSteps.get(checklistItem.key);
    const intakeItem = intakeItems.get(checklistItem.key);
    const proofSource = intakeItem?.proof.length ? intakeItem.proof : checklistItem.proof.map((expectedProof) => ({
      acceptedReferenceTypes: ['relative-path', 'report-id', 'issue-url'] as const,
      expectedProof,
    }));
    const proof = proofSource.map((entry) => {
      const accepted = acceptedProofs.has(`${checklistItem.key}:${entry.expectedProof}`);

      return {
        acceptedReferenceTypes: [...entry.acceptedReferenceTypes],
        expectedProof: entry.expectedProof,
        status: accepted ? ('accepted' as const) : ('missing' as const),
      };
    });
    const acceptedProofCount = proof.filter((entry) => entry.status === 'accepted').length;
    const missingProofCount = proof.length - acceptedProofCount;
    const blockedBy = criticalStep?.blockedBy ?? [];

    return ReleaseBlockerProgressItemSchema.parse({
      acceptedProofCount,
      action: criticalStep?.action ?? checklistItem.action,
      blockedBy,
      commandCount: checklistItem.commands.length,
      currentCommand: criticalStep?.commands[0] ?? checklistItem.commands[0] ?? 'Review release blocker commands.',
      key: checklistItem.key,
      label: checklistItem.label,
      lane: criticalStep?.lane ?? 'real-world-validation',
      missingProofCount,
      owner: checklistItem.owner,
      proof,
      sourceStatus: checklistItem.status,
      status: itemStatus({
        acceptedProofCount,
        blockedBy,
        proofCount: proof.length,
      }),
      tracks: checklistItem.tracks,
    });
  });
  const acceptedProofCount = items.reduce((total, item) => total + item.acceptedProofCount, 0);
  const missingProofCount = items.reduce((total, item) => total + item.missingProofCount, 0);
  const commandCount = items.reduce((total, item) => total + item.commandCount, 0);
  const dependencyBlockedCount = items.filter((item) => item.status === 'blocked-by-dependency').length;
  const needsProofCount = items.filter((item) => item.status === 'needs-proof').length;
  const proofReadyCount = items.filter((item) => item.status === 'proof-ready').length;
  const status = items.length === 0 || (missingProofCount === 0 && dependencyBlockedCount === 0) ? 'ready' : 'needs-external-evidence';
  const packet = ReleaseBlockerProgressSchema.parse({
    generatedAt,
    items,
    privacy: {
      credentialValuesIncluded: false,
      localPathsIncluded: false,
      rawArtifactsIncluded: false,
      rawVideoIncluded: false,
      tokenLikeValuesIncluded: false,
    },
    schemaVersion: releaseBlockerProgressSchemaVersion,
    summary: {
      acceptedProofCount,
      blockerCount: items.length,
      commandCount,
      dependencyBlockedCount,
      missingProofCount,
      needsProofCount,
      nextAction: nextActionFor(items),
      proofReadyCount,
      status,
    },
  });

  return assertReleaseBlockerProgressIsShareSafe(packet);
}
