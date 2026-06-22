import { z } from 'zod';

import { LaunchReadinessCheckKeySchema, LaunchTrackSchema } from './launchReadiness';
import {
  assertReleaseBlockerIssuePacketIsShareSafe,
  releaseBlockerIssuePacketSchemaVersion,
  type ReleaseBlockerIssueDraft,
  type ReleaseBlockerIssuePacket,
} from './releaseBlockerIssuePacket';

export const releaseBlockerIssueFilingPlanSchemaVersion = 'movebeta.release-blocker-issue-filing.v1';

const ReleaseBlockerIssueFilingStatusSchema = z.enum(['planned', 'created', 'existing', 'failed']);

const ReleaseBlockerIssueFilingItemSchema = z.object({
  bodyPreviewLineCount: z.number().int().nonnegative(),
  commandPreview: z.string(),
  error: z.string().optional(),
  filingStatus: ReleaseBlockerIssueFilingStatusSchema,
  key: LaunchReadinessCheckKeySchema,
  labels: z.array(z.string()),
  number: z.number().int().positive().optional(),
  owner: z.enum(['engineering', 'qa', 'product', 'release']),
  title: z.string(),
  tracks: z.array(LaunchTrackSchema).min(1),
  url: z.string().optional(),
});

export const ReleaseBlockerIssueFilingPlanSchema = z.object({
  generatedAt: z.string(),
  issues: z.array(ReleaseBlockerIssueFilingItemSchema),
  privacy: z.object({
    credentialValuesIncluded: z.literal(false),
    localPathsIncluded: z.literal(false),
    rawArtifactsIncluded: z.literal(false),
    rawVideoIncluded: z.literal(false),
    secretsIncluded: z.literal(false),
  }),
  repository: z.string().optional(),
  schemaVersion: z.literal(releaseBlockerIssueFilingPlanSchemaVersion),
  sourcePacketSchemaVersion: z.literal(releaseBlockerIssuePacketSchemaVersion),
  summary: z.object({
    createEnabled: z.boolean(),
    createdCount: z.number().int().nonnegative(),
    existingCount: z.number().int().nonnegative(),
    failedCount: z.number().int().nonnegative(),
    issueCount: z.number().int().nonnegative(),
    nextAction: z.string(),
    plannedCount: z.number().int().nonnegative(),
    status: z.enum(['dry-run', 'ready', 'filed', 'partial-failure']),
  }),
});

export type ReleaseBlockerIssueFilingStatus = z.infer<typeof ReleaseBlockerIssueFilingStatusSchema>;
export type ReleaseBlockerIssueFilingItem = z.infer<typeof ReleaseBlockerIssueFilingItemSchema>;
export type ReleaseBlockerIssueFilingPlan = z.infer<typeof ReleaseBlockerIssueFilingPlanSchema>;

const forbiddenFilingPlanValuePattern =
  /(file:\/\/|content:\/\/|asset:\/\/|ph:\/\/|\/Users\/|\/private\/|\/var\/mobile\/|[A-Za-z]:\\|\.mov\b|\.mp4\b|rawVideoUri|videoUri|BEGIN PRIVATE KEY|ghp_[A-Za-z0-9_]+|github_pat_[A-Za-z0-9_]+|pat_[A-Za-z0-9_]+|sk_live_[A-Za-z0-9_]+|sk_test_[A-Za-z0-9_]+|bearer\s+[A-Za-z0-9._-]+|eyJ[A-Za-z0-9_-]{20,})/i;

function containsForbiddenFilingPlanValue(value: unknown): boolean {
  if (typeof value === 'string') return forbiddenFilingPlanValuePattern.test(value);
  if (Array.isArray(value)) return value.some(containsForbiddenFilingPlanValue);
  if (value && typeof value === 'object') return Object.values(value).some(containsForbiddenFilingPlanValue);
  return false;
}

function commandPreview(issue: ReleaseBlockerIssueDraft, repository?: string) {
  const args = [
    'gh issue create',
    repository ? `--repo ${repository}` : undefined,
    `--title ${JSON.stringify(issue.title)}`,
    '--body-file <generated-release-blocker-body.md>',
    `--label ${JSON.stringify(issue.labels.join(','))}`,
  ].filter(Boolean);
  return args.join(' ');
}

function countLines(value: string) {
  if (value.length === 0) return 0;
  return value.split('\n').length;
}

function nextActionFor({
  createEnabled,
  createdCount,
  existingCount,
  failedCount,
  issueCount,
  plannedCount,
}: ReleaseBlockerIssueFilingPlan['summary']) {
  if (issueCount === 0) return 'No external release blocker issues need filing.';
  if (failedCount > 0) return 'Review failed GitHub issue operations, rerun the filing command, then attach proof to every issue.';
  if (createdCount + existingCount === issueCount) {
    return 'Attach the required proof to each release blocker issue, then rerun release readiness checks.';
  }
  if (!createEnabled && plannedCount > 0) {
    return 'Review the dry-run plan, then rerun with --create and MOVEBETA_RELEASE_ISSUE_CREATE=1 when ready to file GitHub issues.';
  }
  return 'Run the filing command after release blocker issue drafts are generated.';
}

export function safeReleaseBlockerIssueFilingDiagnostic(value: string) {
  return forbiddenFilingPlanValuePattern.test(value)
    ? 'GitHub CLI returned a diagnostic containing a local path, token-like value, raw artifact reference, or secret-like value. Inspect the local terminal output without committing it.'
    : value;
}

export function buildReleaseBlockerIssueFilingItem({
  issue,
  repository,
  result,
}: {
  issue: ReleaseBlockerIssueDraft;
  repository?: string;
  result?: Partial<ReleaseBlockerIssueFilingItem>;
}): ReleaseBlockerIssueFilingItem {
  return ReleaseBlockerIssueFilingItemSchema.parse({
    bodyPreviewLineCount: countLines(issue.body),
    commandPreview: commandPreview(issue, repository),
    filingStatus: result?.filingStatus ?? 'planned',
    key: issue.key,
    labels: issue.labels,
    number: result?.number,
    owner: issue.owner,
    title: issue.title,
    tracks: issue.tracks,
    url: result?.url,
    ...(result?.error ? { error: result.error } : {}),
  });
}

export function assertReleaseBlockerIssueFilingPlanIsShareSafe(plan: ReleaseBlockerIssueFilingPlan) {
  if (containsForbiddenFilingPlanValue(plan)) {
    throw new Error('Release blocker issue filing plan contains credential values, local paths, raw artifacts, raw video references, or token-like data.');
  }
  return plan;
}

export function buildReleaseBlockerIssueFilingPlanFromItems({
  createEnabled,
  generatedAt,
  issues,
  packet,
  repository,
}: {
  createEnabled: boolean;
  generatedAt: string;
  issues: ReleaseBlockerIssueFilingItem[];
  packet: ReleaseBlockerIssuePacket;
  repository?: string;
}): ReleaseBlockerIssueFilingPlan {
  assertReleaseBlockerIssuePacketIsShareSafe(packet);
  const createdCount = issues.filter((issue) => issue.filingStatus === 'created').length;
  const existingCount = issues.filter((issue) => issue.filingStatus === 'existing').length;
  const failedCount = issues.filter((issue) => issue.filingStatus === 'failed').length;
  const plannedCount = issues.filter((issue) => issue.filingStatus === 'planned').length;
  const status: ReleaseBlockerIssueFilingPlan['summary']['status'] =
    failedCount > 0
      ? 'partial-failure'
      : !createEnabled
        ? 'dry-run'
        : issues.length === 0 || createdCount + existingCount === issues.length
          ? 'filed'
          : 'ready';
  const summaryWithoutAction = {
    createEnabled,
    createdCount,
    existingCount,
    failedCount,
    issueCount: issues.length,
    nextAction: '',
    plannedCount,
    status,
  };

  const plan = ReleaseBlockerIssueFilingPlanSchema.parse({
    generatedAt,
    issues,
    privacy: {
      credentialValuesIncluded: false,
      localPathsIncluded: false,
      rawArtifactsIncluded: false,
      rawVideoIncluded: false,
      secretsIncluded: false,
    },
    ...(repository ? { repository } : {}),
    schemaVersion: releaseBlockerIssueFilingPlanSchemaVersion,
    sourcePacketSchemaVersion: packet.schemaVersion,
    summary: {
      ...summaryWithoutAction,
      nextAction: nextActionFor(summaryWithoutAction),
    },
  });

  return assertReleaseBlockerIssueFilingPlanIsShareSafe(plan);
}

export function buildReleaseBlockerIssueFilingPlan({
  createEnabled = false,
  generatedAt = new Date().toISOString(),
  packet,
  repository,
}: {
  createEnabled?: boolean;
  generatedAt?: string;
  packet: ReleaseBlockerIssuePacket;
  repository?: string;
}): ReleaseBlockerIssueFilingPlan {
  return buildReleaseBlockerIssueFilingPlanFromItems({
    createEnabled,
    generatedAt,
    issues: packet.issues.map((issue) => buildReleaseBlockerIssueFilingItem({ issue, repository })),
    packet,
    repository,
  });
}

export function renderReleaseBlockerIssueFilingMarkdown(plan: ReleaseBlockerIssueFilingPlan) {
  assertReleaseBlockerIssueFilingPlanIsShareSafe(plan);
  const issueRows = plan.issues
    .map((issue) => {
      const labels = issue.labels.map((label) => `\`${label}\``).join(', ');
      const link = issue.url ? `[${issue.filingStatus}](${issue.url})` : issue.filingStatus;
      const number = issue.number ? `#${issue.number}` : '-';
      return `| ${issue.title} | ${issue.owner} | ${issue.tracks.join(', ')} | ${labels} | ${link} | ${number} |`;
    })
    .join('\n');

  return `# Release Blocker Issue Filing Plan

Generated: ${plan.generatedAt}

- Status: ${plan.summary.status}
- Create enabled: ${plan.summary.createEnabled ? 'yes' : 'no'}
- Repository: ${plan.repository ?? 'current gh repository context'}
- Issues: ${plan.summary.issueCount}
- Planned: ${plan.summary.plannedCount}
- Existing: ${plan.summary.existingCount}
- Created: ${plan.summary.createdCount}
- Failed: ${plan.summary.failedCount}
- Next action: ${plan.summary.nextAction}
- Credential values included: no
- Local paths included: no
- Raw artifacts included: no
- Raw video included: no

| Issue | Owner | Tracks | Labels | Filing | Number |
| --- | --- | --- | --- | --- | --- |
${issueRows || '| None | - | - | - | - | - |'}
`;
}
