import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  assertReleaseBlockerIssuePacketIsShareSafe,
  ReleaseBlockerIssuePacketSchema,
  type ReleaseBlockerIssueDraft,
  type ReleaseBlockerIssuePacket,
} from '../src/core/releaseBlockerIssuePacket';

export const RELEASE_BLOCKER_ISSUE_FILING_SCHEMA_VERSION = 'movebeta.release-blocker-issue-filing.v1';

export type ReleaseBlockerIssueFilingStatus = 'planned' | 'created' | 'existing' | 'failed';

export type ReleaseBlockerIssueFilingItem = {
  bodyPreviewLineCount: number;
  commandPreview: string;
  error?: string;
  filingStatus: ReleaseBlockerIssueFilingStatus;
  key: ReleaseBlockerIssueDraft['key'];
  labels: string[];
  number?: number;
  owner: ReleaseBlockerIssueDraft['owner'];
  title: string;
  tracks: ReleaseBlockerIssueDraft['tracks'];
  url?: string;
};

export type ReleaseBlockerIssueFilingPlan = {
  generatedAt: string;
  issues: ReleaseBlockerIssueFilingItem[];
  privacy: {
    credentialValuesIncluded: false;
    localPathsIncluded: false;
    rawArtifactsIncluded: false;
    rawVideoIncluded: false;
    secretsIncluded: false;
  };
  repository?: string;
  schemaVersion: typeof RELEASE_BLOCKER_ISSUE_FILING_SCHEMA_VERSION;
  sourcePacketSchemaVersion: ReleaseBlockerIssuePacket['schemaVersion'];
  summary: {
    createEnabled: boolean;
    createdCount: number;
    existingCount: number;
    failedCount: number;
    issueCount: number;
    nextAction: string;
    plannedCount: number;
    status: 'dry-run' | 'ready' | 'filed' | 'partial-failure';
  };
};

export type GhRunnerResult = {
  status: number | null;
  stderr: string;
  stdout: string;
};

export type GhRunner = (args: string[]) => GhRunnerResult;

type ExistingIssue = {
  number?: number;
  title?: string;
  url?: string;
};

const forbiddenFilingPlanValuePattern =
  /(file:\/\/|content:\/\/|asset:\/\/|ph:\/\/|\/Users\/|\/private\/|\/var\/mobile\/|[A-Za-z]:\\|\.mov\b|\.mp4\b|rawVideoUri|videoUri|BEGIN PRIVATE KEY|ghp_[A-Za-z0-9_]+|github_pat_[A-Za-z0-9_]+|pat_[A-Za-z0-9_]+|sk_live_[A-Za-z0-9_]+|sk_test_[A-Za-z0-9_]+|bearer\s+[A-Za-z0-9._-]+|eyJ[A-Za-z0-9_-]{20,})/i;

function containsForbiddenFilingPlanValue(value: unknown): boolean {
  if (typeof value === 'string') return forbiddenFilingPlanValuePattern.test(value);
  if (Array.isArray(value)) return value.some(containsForbiddenFilingPlanValue);
  if (value && typeof value === 'object') return Object.values(value).some(containsForbiddenFilingPlanValue);
  return false;
}

function safeDiagnostic(value: string) {
  return forbiddenFilingPlanValuePattern.test(value)
    ? 'GitHub CLI returned a diagnostic containing a local path, token-like value, raw artifact reference, or secret-like value. Inspect the local terminal output without committing it.'
    : value;
}

export function resolveProjectRoot() {
  return path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
}

export function resolveDefaultInputPath(rootDir = resolveProjectRoot()) {
  return path.join(rootDir, 'docs/sdlc/release-blocker-issues-report.json');
}

export function resolveDefaultJsonOutputPath(rootDir = resolveProjectRoot()) {
  return path.join(rootDir, 'docs/sdlc/release-blocker-issue-filing-plan.json');
}

export function resolveDefaultMarkdownOutputPath(rootDir = resolveProjectRoot()) {
  return path.join(rootDir, 'docs/sdlc/release-blocker-issue-filing-plan.md');
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

function issueToPlanItem({
  issue,
  repository,
  result,
}: {
  issue: ReleaseBlockerIssueDraft;
  repository?: string;
  result?: Partial<ReleaseBlockerIssueFilingItem>;
}): ReleaseBlockerIssueFilingItem {
  return {
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
  };
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

function summarize({
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

  return {
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
    schemaVersion: RELEASE_BLOCKER_ISSUE_FILING_SCHEMA_VERSION,
    sourcePacketSchemaVersion: packet.schemaVersion,
    summary: {
      ...summaryWithoutAction,
      nextAction: nextActionFor(summaryWithoutAction),
    },
  };
}

export function readReleaseBlockerIssuePacket(inputPath: string): ReleaseBlockerIssuePacket {
  const packet = ReleaseBlockerIssuePacketSchema.parse(JSON.parse(fs.readFileSync(inputPath, 'utf8')));
  return assertReleaseBlockerIssuePacketIsShareSafe(packet);
}

export function assertReleaseBlockerIssueFilingPlanIsShareSafe(plan: ReleaseBlockerIssueFilingPlan) {
  if (containsForbiddenFilingPlanValue(plan)) {
    throw new Error('Release blocker issue filing plan contains credential values, local paths, raw artifacts, raw video references, or token-like data.');
  }
  return plan;
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
  assertReleaseBlockerIssuePacketIsShareSafe(packet);
  return assertReleaseBlockerIssueFilingPlanIsShareSafe(summarize({
    createEnabled,
    generatedAt,
    issues: packet.issues.map((issue) => issueToPlanItem({ issue, repository })),
    packet,
    repository,
  }));
}

function defaultGhRunner(args: string[]): GhRunnerResult {
  const result = spawnSync('gh', args, { encoding: 'utf8' });
  return {
    status: result.status,
    stderr: result.stderr ?? '',
    stdout: result.stdout ?? '',
  };
}

function ghArgsWithRepository(args: string[], repository?: string) {
  return repository ? ['--repo', repository, ...args] : args;
}

function parseExistingIssues(stdout: string): ExistingIssue[] {
  try {
    const parsed = JSON.parse(stdout) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((item): item is ExistingIssue => Boolean(item) && typeof item === 'object');
  } catch {
    return [];
  }
}

function findExistingIssue({
  issue,
  repository,
  runner,
}: {
  issue: ReleaseBlockerIssueDraft;
  repository?: string;
  runner: GhRunner;
}) {
  const args = ghArgsWithRepository(
    [
      'issue',
      'list',
      '--state',
      'open',
      '--search',
      `${issue.title} in:title`,
      '--json',
      'number,title,url',
      '--limit',
      '20',
    ],
    repository,
  );
  const result = runner(args);
  if (result.status !== 0) {
    return {
      error: safeDiagnostic(result.stderr.trim() || result.stdout.trim() || 'GitHub issue lookup failed.'),
      issue: undefined,
    };
  }

  const existing = parseExistingIssues(result.stdout).find((candidate) => candidate.title === issue.title);
  return {
    error: undefined,
    issue: existing,
  };
}

function createIssue({
  issue,
  repository,
  runner,
}: {
  issue: ReleaseBlockerIssueDraft;
  repository?: string;
  runner: GhRunner;
}) {
  const args = ghArgsWithRepository(
    ['issue', 'create', '--title', issue.title, '--body', issue.body, '--label', issue.labels.join(',')],
    repository,
  );
  const result = runner(args);
  if (result.status !== 0) {
    return {
      error: safeDiagnostic(result.stderr.trim() || result.stdout.trim() || 'GitHub issue creation failed.'),
      url: undefined,
    };
  }
  return {
    error: undefined,
    url: result.stdout.trim() || undefined,
  };
}

export function fileReleaseBlockerIssuesWithGitHub({
  generatedAt = new Date().toISOString(),
  packet,
  repository,
  runner = defaultGhRunner,
}: {
  generatedAt?: string;
  packet: ReleaseBlockerIssuePacket;
  repository?: string;
  runner?: GhRunner;
}): ReleaseBlockerIssueFilingPlan {
  assertReleaseBlockerIssuePacketIsShareSafe(packet);
  const issues = packet.issues.map((issue) => {
    const existing = findExistingIssue({ issue, repository, runner });
    if (existing.error) {
      return issueToPlanItem({
        issue,
        repository,
        result: {
          error: existing.error,
          filingStatus: 'failed',
        },
      });
    }
    if (existing.issue) {
      return issueToPlanItem({
        issue,
        repository,
        result: {
          filingStatus: 'existing',
          number: existing.issue.number,
          url: existing.issue.url,
        },
      });
    }

    const created = createIssue({ issue, repository, runner });
    return issueToPlanItem({
      issue,
      repository,
      result: created.error
        ? {
            error: created.error,
            filingStatus: 'failed',
          }
        : {
            filingStatus: 'created',
            url: created.url,
          },
    });
  });

  return assertReleaseBlockerIssueFilingPlanIsShareSafe(summarize({
    createEnabled: true,
    generatedAt,
    issues,
    packet,
    repository,
  }));
}

export function renderReleaseBlockerIssueFilingMarkdown(plan: ReleaseBlockerIssueFilingPlan) {
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

export function writeReleaseBlockerIssueFilingPlan({
  jsonOutputPath,
  markdownOutputPath,
  plan,
}: {
  jsonOutputPath: string;
  markdownOutputPath: string;
  plan: ReleaseBlockerIssueFilingPlan;
}) {
  assertReleaseBlockerIssueFilingPlanIsShareSafe(plan);
  fs.mkdirSync(path.dirname(jsonOutputPath), { recursive: true });
  fs.mkdirSync(path.dirname(markdownOutputPath), { recursive: true });
  fs.writeFileSync(jsonOutputPath, `${JSON.stringify(plan, null, 2)}\n`);
  fs.writeFileSync(markdownOutputPath, renderReleaseBlockerIssueFilingMarkdown(plan));
}

function readCliOptions(argv: string[], rootDir = resolveProjectRoot()) {
  const optionValue = (name: string, fallback: string | undefined = undefined) => {
    const index = argv.indexOf(name);
    const value = index >= 0 ? argv[index + 1] : undefined;
    return value && !value.startsWith('--') ? value : fallback;
  };

  return {
    createRequested: argv.includes('--create'),
    inputPath: optionValue('--input', resolveDefaultInputPath(rootDir)) ?? resolveDefaultInputPath(rootDir),
    jsonOutputPath: optionValue('--output', resolveDefaultJsonOutputPath(rootDir)) ?? resolveDefaultJsonOutputPath(rootDir),
    markdownOutputPath:
      optionValue('--markdown-output', resolveDefaultMarkdownOutputPath(rootDir)) ?? resolveDefaultMarkdownOutputPath(rootDir),
    repository: optionValue('--repo'),
  };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const options = readCliOptions(process.argv.slice(2));
  const packet = readReleaseBlockerIssuePacket(options.inputPath);
  const createEnabled = options.createRequested && process.env.MOVEBETA_RELEASE_ISSUE_CREATE === '1';
  const plan = createEnabled
    ? fileReleaseBlockerIssuesWithGitHub({
        packet,
        repository: options.repository,
      })
    : buildReleaseBlockerIssueFilingPlan({
        createEnabled: false,
        packet,
        repository: options.repository,
      });

  writeReleaseBlockerIssueFilingPlan({
    jsonOutputPath: options.jsonOutputPath,
    markdownOutputPath: options.markdownOutputPath,
    plan,
  });

  if (options.createRequested && !createEnabled) {
    console.log('Creation not enabled: set MOVEBETA_RELEASE_ISSUE_CREATE=1 together with --create to file GitHub issues.');
  }
  console.log(`Wrote release blocker issue filing plan to ${options.jsonOutputPath}`);
  console.log(`Wrote release blocker issue filing summary to ${options.markdownOutputPath}`);
  console.log(`Status: ${plan.summary.status}; issues: ${plan.summary.issueCount}; created: ${plan.summary.createdCount}; existing: ${plan.summary.existingCount}`);
}
