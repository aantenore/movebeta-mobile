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
import {
  assertReleaseBlockerIssueFilingPlanIsShareSafe,
  buildReleaseBlockerIssueFilingItem,
  buildReleaseBlockerIssueFilingPlan,
  buildReleaseBlockerIssueFilingPlanFromItems,
  releaseBlockerIssueFilingPlanSchemaVersion,
  renderReleaseBlockerIssueFilingMarkdown,
  safeReleaseBlockerIssueFilingDiagnostic,
  type ReleaseBlockerIssueFilingPlan,
} from '../src/core/releaseBlockerIssueFilingPlan';

export const RELEASE_BLOCKER_ISSUE_FILING_SCHEMA_VERSION = releaseBlockerIssueFilingPlanSchemaVersion;

export {
  assertReleaseBlockerIssueFilingPlanIsShareSafe,
  buildReleaseBlockerIssueFilingPlan,
  renderReleaseBlockerIssueFilingMarkdown,
  type ReleaseBlockerIssueFilingPlan,
} from '../src/core/releaseBlockerIssueFilingPlan';

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

export function readReleaseBlockerIssuePacket(inputPath: string): ReleaseBlockerIssuePacket {
  const packet = ReleaseBlockerIssuePacketSchema.parse(JSON.parse(fs.readFileSync(inputPath, 'utf8')));
  return assertReleaseBlockerIssuePacketIsShareSafe(packet);
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
      error: safeReleaseBlockerIssueFilingDiagnostic(result.stderr.trim() || result.stdout.trim() || 'GitHub issue lookup failed.'),
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
      error: safeReleaseBlockerIssueFilingDiagnostic(result.stderr.trim() || result.stdout.trim() || 'GitHub issue creation failed.'),
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
      return buildReleaseBlockerIssueFilingItem({
        issue,
        repository,
        result: {
          error: existing.error,
          filingStatus: 'failed',
        },
      });
    }
    if (existing.issue) {
      return buildReleaseBlockerIssueFilingItem({
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
    return buildReleaseBlockerIssueFilingItem({
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

  return buildReleaseBlockerIssueFilingPlanFromItems({
    createEnabled: true,
    generatedAt,
    issues,
    packet,
    repository,
  });
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
