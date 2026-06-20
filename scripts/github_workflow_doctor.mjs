import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const GITHUB_WORKFLOW_REPORT_SCHEMA_VERSION = 'movebeta.github-workflow-report.v1';

function resolveProjectRoot() {
  return path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
}

export function resolveDefaultJsonPath(rootDir = resolveProjectRoot()) {
  return path.join(rootDir, 'docs/sdlc/github-workflow-report.json');
}

export function resolveDefaultMarkdownPath(rootDir = resolveProjectRoot()) {
  return path.join(rootDir, 'docs/sdlc/github-workflow-report.md');
}

function runCommand(binary, args, options = {}) {
  try {
    return {
      ok: true,
      output: execFileSync(binary, args, {
        cwd: options.cwd,
        encoding: 'utf8',
        stdio: ['ignore', 'pipe', 'pipe'],
        timeout: options.timeoutMs ?? 15_000,
      }).trim(),
    };
  } catch (error) {
    const output = [error?.stdout, error?.stderr]
      .filter((value) => typeof value === 'string' && value.trim().length > 0)
      .join('\n')
      .trim();

    return {
      error: output || (error instanceof Error ? error.message : String(error)),
      ok: false,
    };
  }
}

function check(status, id, label, detail, action) {
  return { action, detail, id, label, status };
}

function statusFromChecks(checks) {
  if (checks.some((item) => item.status === 'fail')) return 'blocked';
  if (checks.some((item) => item.status === 'warn')) return 'review';
  return 'ready';
}

function readTextIfExists(filePath, fileExists, readText) {
  return fileExists(filePath) ? readText(filePath) : undefined;
}

export function parseGhAuthScopes(output) {
  const match = output.match(/Token scopes:\s*(.+)$/im);
  if (!match) return [];

  return match[1]
    .split(',')
    .map((scope) => scope.trim().replace(/^['"]|['"]$/g, ''))
    .filter(Boolean)
    .sort();
}

/**
 * @param {{
 *   commandRunner?: typeof runCommand,
 *   fileExists?: (filePath: string) => boolean,
 *   generatedAt?: string,
 *   readText?: (filePath: string) => string,
 *   rootDir?: string
 * }} [options]
 */
export function buildGithubWorkflowReport({
  commandRunner = runCommand,
  fileExists = fs.existsSync,
  generatedAt = new Date().toISOString(),
  readText = (filePath) => fs.readFileSync(filePath, 'utf8'),
  rootDir = resolveProjectRoot(),
} = {}) {
  const templatePath = path.join(rootDir, 'docs/sdlc/ci-templates/github-actions-quality.yml');
  const workflowPath = path.join(rootDir, '.github/workflows/quality.yml');
  const template = readTextIfExists(templatePath, fileExists, readText);
  const activeWorkflow = readTextIfExists(workflowPath, fileExists, readText);
  const templateExists = typeof template === 'string';
  const activeWorkflowExists = typeof activeWorkflow === 'string';
  const activeMatchesTemplate = templateExists && activeWorkflowExists && template === activeWorkflow;
  const ghVersion = commandRunner('gh', ['--version'], { cwd: rootDir });
  const ghAuth = ghVersion.ok ? commandRunner('gh', ['auth', 'status'], { cwd: rootDir }) : { ok: false, error: 'gh CLI is not available.' };
  const scopes = ghAuth.ok ? parseGhAuthScopes(ghAuth.output ?? '') : [];
  const workflowScopeReady = scopes.includes('workflow');
  const checks = [
    check(
      templateExists ? 'pass' : 'fail',
      'workflow-template',
      'Workflow template',
      templateExists ? 'docs/sdlc/ci-templates/github-actions-quality.yml exists.' : 'GitHub Actions quality template is missing.',
      'Restore docs/sdlc/ci-templates/github-actions-quality.yml before CI activation.',
    ),
    check(
      activeWorkflowExists ? 'pass' : 'fail',
      'active-workflow',
      'Active workflow file',
      activeWorkflowExists ? '.github/workflows/quality.yml exists.' : '.github/workflows/quality.yml is not committed.',
      'Copy the quality workflow template to .github/workflows/quality.yml after the GitHub token has workflow scope.',
    ),
    check(
      activeWorkflowExists ? (activeMatchesTemplate ? 'pass' : 'fail') : 'warn',
      'workflow-template-parity',
      'Workflow/template parity',
      activeWorkflowExists
        ? activeMatchesTemplate
          ? 'Active workflow matches the documented template.'
          : 'Active workflow differs from the documented template.'
        : 'Skipped until the active workflow file is committed.',
      'Keep .github/workflows/quality.yml byte-for-byte aligned with docs/sdlc/ci-templates/github-actions-quality.yml.',
    ),
    check(
      ghVersion.ok ? 'pass' : 'fail',
      'gh-cli',
      'GitHub CLI',
      ghVersion.ok ? String(ghVersion.output).split('\n')[0] : ghVersion.error ?? 'gh CLI is not available.',
      'Install GitHub CLI and authenticate before activating repository workflows.',
    ),
    check(
      ghAuth.ok ? (workflowScopeReady ? 'pass' : 'fail') : 'fail',
      'gh-workflow-scope',
      'GitHub workflow OAuth scope',
      ghAuth.ok
        ? workflowScopeReady
          ? 'Authenticated GitHub token includes workflow scope.'
          : `Authenticated GitHub token scopes do not include workflow. Present scopes: ${scopes.join(', ') || 'none detected'}.`
        : ghAuth.error ?? 'Unable to inspect GitHub authentication.',
      'Run gh auth refresh -h github.com -s workflow, then copy the template to .github/workflows/quality.yml and push.',
    ),
  ];
  const status = statusFromChecks(checks);

  return {
    checks,
    generatedAt,
    nextAction:
      status === 'ready'
        ? 'Push the active workflow and confirm GitHub Actions records a passing Quality run.'
        : checks.find((item) => item.status === 'fail')?.action ?? 'Review GitHub workflow activation warnings.',
    privacy: {
      checkedOauthScopes: scopes,
      credentialValuesIncluded: false,
      secretsIncluded: false,
      tokenIncluded: false,
    },
    schemaVersion: GITHUB_WORKFLOW_REPORT_SCHEMA_VERSION,
    status,
    summary: {
      activeMatchesTemplate,
      activeWorkflowExists,
      ghAuthenticated: ghAuth.ok,
      ghCliAvailable: ghVersion.ok,
      templateExists,
      workflowScopeReady,
    },
  };
}

export function renderGithubWorkflowMarkdown(report) {
  const rows = report.checks
    .map((item) => `| ${item.label} | ${item.status} | ${item.detail.replace(/\n/g, ' ')} | ${item.action} |`)
    .join('\n');

  return `# GitHub Workflow Report

Generated: ${report.generatedAt}

- Status: ${report.status}
- Token included: no
- Next action: ${report.nextAction}

| Check | Status | Detail | Action |
| --- | --- | --- | --- |
${rows}
`;
}

/**
 * @param {{ jsonPath?: string, markdownPath?: string, report?: ReturnType<typeof buildGithubWorkflowReport> }} [options]
 */
export function writeGithubWorkflowReport({
  jsonPath = resolveDefaultJsonPath(),
  markdownPath = resolveDefaultMarkdownPath(),
  report,
} = {}) {
  const rootDir = path.resolve(path.dirname(jsonPath), '../..');
  const nextReport = report ?? buildGithubWorkflowReport({ rootDir });
  fs.mkdirSync(path.dirname(jsonPath), { recursive: true });
  fs.writeFileSync(jsonPath, `${JSON.stringify(nextReport, null, 2)}\n`);
  fs.writeFileSync(markdownPath, renderGithubWorkflowMarkdown(nextReport));
  return { jsonPath, markdownPath, report: nextReport };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const { jsonPath, markdownPath, report } = writeGithubWorkflowReport();
  console.log(`Wrote GitHub workflow report to ${jsonPath}`);
  console.log(`Wrote GitHub workflow summary to ${markdownPath}`);
  console.log(`Status: ${report.status}; next action: ${report.nextAction}`);
}
