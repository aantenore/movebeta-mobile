import { z } from 'zod';

import {
  assertReleaseBlockerIssuePacketIsShareSafe,
  releaseBlockerIssuePacketSchemaVersion,
  type ReleaseBlockerIssueDraft,
  type ReleaseBlockerIssuePacket,
} from './releaseBlockerIssuePacket';
import { LaunchReadinessCheckKeySchema, LaunchTrackSchema } from './launchReadiness';

export const releaseBlockerIssueWebLinksSchemaVersion = 'movebeta.release-blocker-issue-web-links.v1';

const ReleaseBlockerIssueWebLinkStatusSchema = z.enum(['ready', 'missing-repository', 'url-too-long']);

const ReleaseBlockerIssueWebLinkSchema = z.object({
  bodyPreviewLineCount: z.number().int().nonnegative(),
  key: LaunchReadinessCheckKeySchema,
  labels: z.array(z.string()),
  owner: z.enum(['engineering', 'qa', 'product', 'release']),
  status: ReleaseBlockerIssueWebLinkStatusSchema,
  title: z.string(),
  tracks: z.array(LaunchTrackSchema).min(1),
  urlLength: z.number().int().nonnegative(),
  webUrl: z.string().url().startsWith('https://github.com/').optional(),
});

export const ReleaseBlockerIssueWebLinksPacketSchema = z.object({
  generatedAt: z.string(),
  issues: z.array(ReleaseBlockerIssueWebLinkSchema),
  privacy: z.object({
    credentialValuesIncluded: z.literal(false),
    localPathsIncluded: z.literal(false),
    rawArtifactsIncluded: z.literal(false),
    rawVideoIncluded: z.literal(false),
    secretsIncluded: z.literal(false),
  }),
  repository: z.string().regex(/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/).optional(),
  schemaVersion: z.literal(releaseBlockerIssueWebLinksSchemaVersion),
  sourcePacketSchemaVersion: z.literal(releaseBlockerIssuePacketSchemaVersion),
  summary: z.object({
    blockedLinkCount: z.number().int().nonnegative(),
    issueCount: z.number().int().nonnegative(),
    maxUrlLength: z.number().int().nonnegative(),
    nextAction: z.string(),
    readyLinkCount: z.number().int().nonnegative(),
    status: z.enum(['ready', 'needs-repository', 'review']),
    urlLengthBudget: z.number().int().positive(),
  }),
});

export type ReleaseBlockerIssueWebLinkStatus = z.infer<typeof ReleaseBlockerIssueWebLinkStatusSchema>;
export type ReleaseBlockerIssueWebLink = z.infer<typeof ReleaseBlockerIssueWebLinkSchema>;
export type ReleaseBlockerIssueWebLinksPacket = z.infer<typeof ReleaseBlockerIssueWebLinksPacketSchema>;

const forbiddenWebLinkValuePattern =
  /(file:\/\/|content:\/\/|asset:\/\/|ph:\/\/|\/Users\/|\/private\/|\/var\/mobile\/|[A-Za-z]:\\|\.mov\b|\.mp4\b|rawVideoUri|videoUri|BEGIN PRIVATE KEY|ghp_[A-Za-z0-9_]+|github_pat_[A-Za-z0-9_]+|pat_[A-Za-z0-9_]+|sk_live_[A-Za-z0-9_]+|sk_test_[A-Za-z0-9_]+|bearer\s+[A-Za-z0-9._-]+|eyJ[A-Za-z0-9_-]{20,})/i;

function containsForbiddenValue(value: unknown): boolean {
  if (typeof value === 'string') return forbiddenWebLinkValuePattern.test(value);
  if (Array.isArray(value)) return value.some(containsForbiddenValue);
  if (value && typeof value === 'object') return Object.values(value).some(containsForbiddenValue);
  return false;
}

function normalizeRepositoryName(value: string) {
  return value.replace(/\.git$/i, '').trim();
}

export function normalizeGitHubRepository(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined;
  const trimmed = value.trim();
  if (!trimmed) return undefined;

  const httpsMatch = trimmed.match(/^https:\/\/github\.com\/([^/\s]+)\/([^/\s?#]+)(?:[?#].*)?$/i);
  const sshMatch = trimmed.match(/^git@github\.com:([^/\s]+)\/([^/\s]+)$/i);
  const directMatch = trimmed.match(/^([^/\s]+)\/([^/\s]+)$/);
  const candidate = httpsMatch
    ? `${httpsMatch[1]}/${normalizeRepositoryName(httpsMatch[2] ?? '')}`
    : sshMatch
      ? `${sshMatch[1]}/${normalizeRepositoryName(sshMatch[2] ?? '')}`
      : directMatch
        ? `${directMatch[1]}/${normalizeRepositoryName(directMatch[2] ?? '')}`
        : undefined;

  return candidate && /^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(candidate) ? candidate : undefined;
}

function countLines(value: string) {
  if (value.length === 0) return 0;
  return value.split('\n').length;
}

function encodedQuery(params: Record<string, string>) {
  return Object.entries(params)
    .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(value)}`)
    .join('&');
}

export function buildGitHubIssueWebUrl({
  issue,
  repository,
}: {
  issue: ReleaseBlockerIssueDraft;
  repository: string;
}) {
  return `https://github.com/${repository}/issues/new?${encodedQuery({
    body: issue.body,
    labels: issue.labels.join(','),
    title: issue.title,
  })}`;
}

function buildIssueWebLink({
  issue,
  repository,
  urlLengthBudget,
}: {
  issue: ReleaseBlockerIssueDraft;
  repository?: string;
  urlLengthBudget: number;
}): ReleaseBlockerIssueWebLink {
  const webUrl = repository ? buildGitHubIssueWebUrl({ issue, repository }) : undefined;
  const urlLength = webUrl?.length ?? 0;
  const status: ReleaseBlockerIssueWebLinkStatus = !repository
    ? 'missing-repository'
    : urlLength > urlLengthBudget
      ? 'url-too-long'
      : 'ready';

  return ReleaseBlockerIssueWebLinkSchema.parse({
    bodyPreviewLineCount: countLines(issue.body),
    key: issue.key,
    labels: issue.labels,
    owner: issue.owner,
    status,
    title: issue.title,
    tracks: issue.tracks,
    urlLength,
    ...(webUrl ? { webUrl } : {}),
  });
}

function nextActionFor({
  blockedLinkCount,
  issueCount,
  readyLinkCount,
  repository,
}: {
  blockedLinkCount: number;
  issueCount: number;
  readyLinkCount: number;
  repository?: string;
}) {
  if (issueCount === 0) return 'No external release blocker issues need filing.';
  if (!repository) return 'Configure extra.releaseRepository or pass --repo so prefilled GitHub issue links can be generated.';
  if (blockedLinkCount > 0) return 'Use the CLI filing plan for oversized issue bodies, or shorten issue body text before opening web links.';
  return `Open ${readyLinkCount} prefilled GitHub issue links, submit each issue, attach proof, then rerun release readiness checks.`;
}

export function assertReleaseBlockerIssueWebLinksPacketIsShareSafe(packet: ReleaseBlockerIssueWebLinksPacket) {
  if (containsForbiddenValue(packet)) {
    throw new Error('Release blocker issue web links packet contains credential values, local paths, raw artifacts, raw video references, or token-like data.');
  }
  return packet;
}

export function buildReleaseBlockerIssueWebLinksPacket({
  generatedAt = new Date().toISOString(),
  packet,
  repository,
  urlLengthBudget = 8192,
}: {
  generatedAt?: string;
  packet: ReleaseBlockerIssuePacket;
  repository?: string;
  urlLengthBudget?: number;
}): ReleaseBlockerIssueWebLinksPacket {
  assertReleaseBlockerIssuePacketIsShareSafe(packet);
  const normalizedRepository = normalizeGitHubRepository(repository);
  const parsedUrlLengthBudget = z.number().int().positive().parse(urlLengthBudget);
  const issues = packet.issues.map((issue) =>
    buildIssueWebLink({
      issue,
      repository: normalizedRepository,
      urlLengthBudget: parsedUrlLengthBudget,
    }),
  );
  const readyLinkCount = issues.filter((issue) => issue.status === 'ready').length;
  const blockedLinkCount = issues.length - readyLinkCount;
  const status: ReleaseBlockerIssueWebLinksPacket['summary']['status'] =
    issues.length === 0 || readyLinkCount === issues.length
      ? 'ready'
      : normalizedRepository
        ? 'review'
        : 'needs-repository';

  const webLinksPacket = ReleaseBlockerIssueWebLinksPacketSchema.parse({
    generatedAt,
    issues,
    privacy: {
      credentialValuesIncluded: false,
      localPathsIncluded: false,
      rawArtifactsIncluded: false,
      rawVideoIncluded: false,
      secretsIncluded: false,
    },
    ...(normalizedRepository ? { repository: normalizedRepository } : {}),
    schemaVersion: releaseBlockerIssueWebLinksSchemaVersion,
    sourcePacketSchemaVersion: packet.schemaVersion,
    summary: {
      blockedLinkCount,
      issueCount: issues.length,
      maxUrlLength: Math.max(0, ...issues.map((issue) => issue.urlLength)),
      nextAction: nextActionFor({
        blockedLinkCount,
        issueCount: issues.length,
        readyLinkCount,
        repository: normalizedRepository,
      }),
      readyLinkCount,
      status,
      urlLengthBudget: parsedUrlLengthBudget,
    },
  });

  return assertReleaseBlockerIssueWebLinksPacketIsShareSafe(webLinksPacket);
}

export function renderReleaseBlockerIssueWebLinksMarkdown(packet: ReleaseBlockerIssueWebLinksPacket) {
  assertReleaseBlockerIssueWebLinksPacketIsShareSafe(packet);
  const issueRows = packet.issues
    .map((issue) => {
      const labels = issue.labels.map((label) => `\`${label}\``).join(', ');
      const link = issue.webUrl ? `[open link](${issue.webUrl})` : '-';
      return `| ${issue.title} | ${issue.owner} | ${issue.tracks.join(', ')} | ${labels} | ${issue.status} | ${issue.urlLength} | ${link} |`;
    })
    .join('\n');

  return `# Release Blocker Issue Web Links

Generated: ${packet.generatedAt}

- Status: ${packet.summary.status}
- Repository: ${packet.repository ?? 'not configured'}
- Issues: ${packet.summary.issueCount}
- Ready links: ${packet.summary.readyLinkCount}
- Blocked links: ${packet.summary.blockedLinkCount}
- URL length budget: ${packet.summary.urlLengthBudget}
- Max URL length: ${packet.summary.maxUrlLength}
- Next action: ${packet.summary.nextAction}
- Credential values included: no
- Local paths included: no
- Raw artifacts included: no
- Raw video included: no

| Issue | Owner | Tracks | Labels | Link status | URL length | Link |
| --- | --- | --- | --- | --- | ---: | --- |
${issueRows || '| None | - | - | - | - | - | - |'}
`;
}
