import { z } from 'zod';

import {
  buildReleaseUnblockChecklist,
  ReleaseUnblockChecklistSchema,
  type ReleaseUnblockChecklist,
  type ReleaseUnblockChecklistItem,
} from './releaseUnblockChecklist';
import {
  LaunchReadinessCheckKeySchema,
  LaunchStatusSchema,
  LaunchTrackSchema,
  type LaunchReadinessEvidence,
} from './launchReadiness';

export const releaseBlockerIssuePacketSchemaVersion = 'movebeta.release-blocker-issue-packet.v1';

const ReleaseBlockerIssueDraftSchema = z.object({
  acceptance: z.array(z.string()).min(1),
  body: z.string(),
  commands: z.array(z.string()),
  envKeys: z.array(z.string()),
  key: LaunchReadinessCheckKeySchema,
  labels: z.array(z.string()).min(1),
  owner: z.enum(['engineering', 'qa', 'product', 'release']),
  proof: z.array(z.string()).min(1),
  secretPolicy: z.string(),
  status: LaunchStatusSchema,
  title: z.string(),
  tracks: z.array(LaunchTrackSchema).min(1),
});

export const ReleaseBlockerIssuePacketSchema = z.object({
  generatedAt: z.string(),
  issueTemplatePath: z.literal('.github/ISSUE_TEMPLATE/release_blocker.md'),
  issues: z.array(ReleaseBlockerIssueDraftSchema),
  privacy: z.object({
    credentialValuesIncluded: z.literal(false),
    localPathsIncluded: z.literal(false),
    rawArtifactsIncluded: z.literal(false),
    rawVideoIncluded: z.literal(false),
    secretsIncluded: z.literal(false),
  }),
  schemaVersion: z.literal(releaseBlockerIssuePacketSchemaVersion),
  sourceChecklist: ReleaseUnblockChecklistSchema,
  summary: z.object({
    commandCount: z.number().int().nonnegative(),
    credentialKeyNameCount: z.number().int().nonnegative(),
    issueCount: z.number().int().nonnegative(),
    nextAction: z.string(),
    ownerCount: z.number().int().nonnegative(),
    proofCount: z.number().int().nonnegative(),
    status: z.enum(['ready', 'ready-to-file']),
  }),
});

export type ReleaseBlockerIssueDraft = z.infer<typeof ReleaseBlockerIssueDraftSchema>;
export type ReleaseBlockerIssuePacket = z.infer<typeof ReleaseBlockerIssuePacketSchema>;

const forbiddenIssuePacketValuePattern =
  /(file:\/\/|content:\/\/|asset:\/\/|ph:\/\/|\/Users\/|\/private\/|\/var\/|[A-Za-z]:\\|\.mov\b|\.mp4\b|rawVideoUri|videoUri|BEGIN PRIVATE KEY|ghp_[A-Za-z0-9_]+|github_pat_[A-Za-z0-9_]+|pat_[A-Za-z0-9_]+|sk_live_[A-Za-z0-9_]+|sk_test_[A-Za-z0-9_]+|bearer\s+[A-Za-z0-9._-]+|eyJ[A-Za-z0-9_-]{20,})/i;

function containsForbiddenValue(value: unknown): boolean {
  if (typeof value === 'string') return forbiddenIssuePacketValuePattern.test(value);
  if (Array.isArray(value)) return value.some(containsForbiddenValue);
  if (value && typeof value === 'object') return Object.values(value).some(containsForbiddenValue);
  return false;
}

function checkboxRows(values: string[]) {
  return values.map((value) => `- [ ] ${value}`).join('\n');
}

function bulletRows(values: string[]) {
  return values.length > 0 ? values.map((value) => `- ${value}`).join('\n') : '- None';
}

function codeRows(values: string[]) {
  return values.length > 0 ? values.map((value) => `- \`${value}\``).join('\n') : '- None';
}

function issueLabels(item: ReleaseUnblockChecklistItem) {
  return [
    'release-blocker',
    `owner:${item.owner}`,
    ...item.tracks.map((track) => `track:${track}`),
    `check:${item.key}`,
  ];
}

function issueBody(item: ReleaseUnblockChecklistItem) {
  return [
    '## Release Blocker',
    item.action,
    '',
    `Owner: \`${item.owner}\``,
    `Tracks: ${item.tracks.map((track) => `\`${track}\``).join(', ')}`,
    `Status: \`${item.status}\``,
    '',
    '## Acceptance',
    checkboxRows(item.acceptance),
    '',
    '## Required Proof',
    bulletRows(item.proof),
    '',
    '## Commands',
    codeRows(item.commands),
    '',
    '## Environment Key Names',
    codeRows(item.envKeys),
    '',
    '## Secret Policy',
    item.secretPolicy,
    '',
    'Do not attach credential values, private keys, raw video, absolute local paths, or raw local artifacts to this issue.',
  ].join('\n');
}

function buildIssueDraft(item: ReleaseUnblockChecklistItem): ReleaseBlockerIssueDraft {
  return ReleaseBlockerIssueDraftSchema.parse({
    acceptance: item.acceptance,
    body: issueBody(item),
    commands: item.commands,
    envKeys: item.envKeys,
    key: item.key,
    labels: issueLabels(item),
    owner: item.owner,
    proof: item.proof,
    secretPolicy: item.secretPolicy,
    status: item.status,
    title: `[Release Blocker] ${item.label}`,
    tracks: item.tracks,
  });
}

export function assertReleaseBlockerIssuePacketIsShareSafe(packet: ReleaseBlockerIssuePacket) {
  if (containsForbiddenValue(packet)) {
    throw new Error('Release blocker issue packet contains credential values, local paths, raw artifacts, raw video references, or token-like data.');
  }
  return packet;
}

export function buildReleaseBlockerIssuePacket(
  options: {
    checklist?: ReleaseUnblockChecklist;
    evidence?: LaunchReadinessEvidence;
    generatedAt?: string;
  } = {},
): ReleaseBlockerIssuePacket {
  const checklist = options.checklist ?? buildReleaseUnblockChecklist(options.evidence);
  const issues = checklist.items.map(buildIssueDraft);
  const packet = ReleaseBlockerIssuePacketSchema.parse({
    generatedAt: options.generatedAt ?? new Date().toISOString(),
    issueTemplatePath: '.github/ISSUE_TEMPLATE/release_blocker.md',
    issues,
    privacy: {
      credentialValuesIncluded: false,
      localPathsIncluded: false,
      rawArtifactsIncluded: false,
      rawVideoIncluded: false,
      secretsIncluded: false,
    },
    schemaVersion: releaseBlockerIssuePacketSchemaVersion,
    sourceChecklist: checklist,
    summary: {
      commandCount: issues.reduce((total, issue) => total + issue.commands.length, 0),
      credentialKeyNameCount: issues.reduce((total, issue) => total + issue.envKeys.length, 0),
      issueCount: issues.length,
      nextAction:
        issues.length > 0
          ? 'File one issue per external blocker, attach the required proof, then rerun release readiness checks.'
          : 'All configured external release blockers are cleared.',
      ownerCount: new Set(issues.map((issue) => issue.owner)).size,
      proofCount: issues.reduce((total, issue) => total + issue.proof.length, 0),
      status: issues.length > 0 ? 'ready-to-file' : 'ready',
    },
  });

  return assertReleaseBlockerIssuePacketIsShareSafe(packet);
}
