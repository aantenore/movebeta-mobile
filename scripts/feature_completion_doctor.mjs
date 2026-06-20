import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const FEATURE_COMPLETION_REPORT_SCHEMA_VERSION = 'movebeta.feature-completion-report.v1';

const externalEvidencePattern =
  /(external|real consented|real clip|real coach|physical|device|xcode|credential|expo|apple|google|store account|oauth|workflow scope|data needed|needs real|needed)/i;

function resolveProjectRoot() {
  return path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
}

export function resolveDefaultJsonPath(rootDir = resolveProjectRoot()) {
  return path.join(rootDir, 'docs/sdlc/feature-completion-report.json');
}

export function resolveDefaultMarkdownPath(rootDir = resolveProjectRoot()) {
  return path.join(rootDir, 'docs/sdlc/feature-completion-report.md');
}

function readText(rootDir, relativePath) {
  return fs.readFileSync(path.join(rootDir, relativePath), 'utf8');
}

function readJsonIfExists(rootDir, relativePath) {
  const filePath = path.join(rootDir, relativePath);
  if (!fs.existsSync(filePath)) return undefined;
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function splitMarkdownRow(line) {
  return line
    .trim()
    .replace(/^\|/, '')
    .replace(/\|$/, '')
    .split('|')
    .map((cell) => cell.trim());
}

function parseMarkdownTable(markdown) {
  const rows = markdown
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.startsWith('|') && line.endsWith('|'))
    .filter((line) => !/^\|\s*-/.test(line));
  if (rows.length === 0) return [];

  const headers = splitMarkdownRow(rows[0]).map((header) => header.toLowerCase());
  return rows.slice(1).map((row) => {
    const cells = splitMarkdownRow(row);
    return Object.fromEntries(headers.map((header, index) => [header, cells[index] ?? '']));
  });
}

function uniqueValues(values) {
  return [...new Set(values)].sort((a, b) => a.localeCompare(b));
}

function classifyOpenTask(task) {
  const status = task.status;
  const text = `${task.task} ${task.status}`;
  if (status === 'Done') return 'done';
  if (externalEvidencePattern.test(text)) return 'external-blocked';
  return 'internal-gap';
}

function classifyOpenBacklogItem(item) {
  const priority = item.priority;
  const text = `${item.userStory} ${item.priority} ${item.acceptanceNotes}`;
  if (priority === 'Done') return 'done';
  if (externalEvidencePattern.test(text)) return 'external-blocked';
  return 'internal-gap';
}

function classifyTraceabilityStatus(row) {
  const status = row['current status'] ?? '';
  if (/covered/i.test(status)) return 'covered';
  if (externalEvidencePattern.test(status)) return 'external-blocked';
  return 'internal-gap';
}

function summarizeLaunchReadiness(rootDir) {
  const report = readJsonIfExists(rootDir, 'docs/sdlc/launch-readiness-report.json');
  if (!report || report.schemaVersion !== 'movebeta.launch-readiness-report.v1') {
    return {
      nextAction: 'Run npm run release:readiness to refresh launch readiness evidence.',
      openChecks: [],
      readyTracks: 0,
      status: 'missing',
      totalTracks: 0,
    };
  }

  return {
    nextAction: report.summary?.nextAction ?? 'Review launch readiness report.',
    openChecks: Array.isArray(report.checks)
      ? report.checks
          .filter((check) => check.status !== 'verified')
          .map((check) => ({
            action: check.action,
            key: check.key,
            label: check.label,
            owner: check.owner,
            status: check.status,
          }))
      : [],
    readyTracks: report.summary?.readyTracks ?? 0,
    status: report.summary?.status ?? 'missing',
    totalTracks: report.summary?.totalTracks ?? 0,
  };
}

function buildStatus({ externalBlockerCount, internalGapCount, launchStatus }) {
  if (internalGapCount > 0) return 'internal-gaps';
  if (launchStatus === 'missing') return 'internal-gaps';
  if (externalBlockerCount > 0 || launchStatus === 'blocked' || launchStatus === 'drift') return 'external-blocked';
  return 'ready';
}

/**
 * @param {{ generatedAt?: string, rootDir?: string }} [options]
 */
export function buildFeatureCompletionReport({
  generatedAt = new Date().toISOString(),
  rootDir = resolveProjectRoot(),
} = {}) {
  const tasks = parseMarkdownTable(readText(rootDir, 'docs/task-plan.md')).map((row) => ({
    id: row.id,
    task: row.task,
    status: row.status,
  }));
  const backlog = parseMarkdownTable(readText(rootDir, 'docs/sdlc/backlog.md')).map((row) => ({
    acceptanceNotes: row['acceptance notes'],
    epic: row.epic,
    id: row.id,
    priority: row.priority,
    userStory: row['user story'],
  }));
  const traceability = parseMarkdownTable(readText(rootDir, 'docs/sdlc/traceability-matrix.md')).map((row) => ({
    requirement: row.requirement,
    status: row['current status'],
  }));

  const taskFindings = tasks
    .map((task) => ({ ...task, finding: classifyOpenTask(task) }))
    .filter((task) => task.finding !== 'done');
  const backlogFindings = backlog
    .map((item) => ({
      ...item,
      finding: classifyOpenBacklogItem(item),
    }))
    .filter((item) => item.finding !== 'done');
  const traceabilityFindings = traceability
    .map((item) => ({ ...item, finding: classifyTraceabilityStatus({ 'current status': item.status }) }))
    .filter((item) => item.finding !== 'covered');
  const launchReadiness = summarizeLaunchReadiness(rootDir);
  const internalFindings = [
    ...taskFindings.filter((item) => item.finding === 'internal-gap').map((item) => item.id),
    ...backlogFindings.filter((item) => item.finding === 'internal-gap').map((item) => item.id),
    ...traceabilityFindings.filter((item) => item.finding === 'internal-gap').map((item) => item.requirement),
  ];
  const externalFindings = [
    ...taskFindings.filter((item) => item.finding === 'external-blocked').map((item) => item.id),
    ...backlogFindings.filter((item) => item.finding === 'external-blocked').map((item) => item.id),
    ...traceabilityFindings.filter((item) => item.finding === 'external-blocked').map((item) => item.requirement),
    ...launchReadiness.openChecks.map((item) => item.key),
  ];
  const status = buildStatus({
    externalBlockerCount: externalFindings.length,
    internalGapCount: internalFindings.length,
    launchStatus: launchReadiness.status,
  });

  return {
    generatedAt,
    launchReadiness,
    privacy: {
      credentialValuesIncluded: false,
      localPathsIncluded: false,
      rawArtifactsIncluded: false,
      rawVideoIncluded: false,
      secretsIncluded: false,
    },
    schemaVersion: FEATURE_COMPLETION_REPORT_SCHEMA_VERSION,
    status,
    summary: {
      backlogDoneCount: backlog.filter((item) => item.priority === 'Done').length,
      backlogItemCount: backlog.length,
      externalBlockerCount: externalFindings.length,
      internalGapCount: internalFindings.length,
      nextAction:
        status === 'ready'
          ? 'All tracked feature, backlog, traceability, and launch-readiness checks are complete.'
          : internalFindings.length > 0
            ? `Resolve internal feature gaps: ${uniqueValues(internalFindings).slice(0, 5).join(', ')}.`
            : launchReadiness.nextAction,
      taskDoneCount: tasks.filter((task) => task.status === 'Done').length,
      taskItemCount: tasks.length,
      traceabilityCoveredCount: traceability.filter((item) => /covered/i.test(item.status)).length,
      traceabilityItemCount: traceability.length,
    },
    findings: {
      backlog: backlogFindings,
      tasks: taskFindings,
      traceability: traceabilityFindings,
    },
  };
}

export function renderFeatureCompletionMarkdown(report) {
  const taskRows = report.findings.tasks
    .map((item) => `| ${item.id} | ${item.finding} | ${item.status} | ${item.task} |`)
    .join('\n');
  const backlogRows = report.findings.backlog
    .map((item) => `| ${item.id} | ${item.finding} | ${item.priority} | ${item.epic} | ${item.acceptanceNotes} |`)
    .join('\n');
  const launchRows = report.launchReadiness.openChecks
    .map((item) => `| ${item.key} | ${item.status} | ${item.owner} | ${item.action} |`)
    .join('\n');

  return `# Feature Completion Report

Generated: ${report.generatedAt}

- Status: ${report.status}
- Tasks done: ${report.summary.taskDoneCount}/${report.summary.taskItemCount}
- Backlog done: ${report.summary.backlogDoneCount}/${report.summary.backlogItemCount}
- Traceability covered: ${report.summary.traceabilityCoveredCount}/${report.summary.traceabilityItemCount}
- Internal gaps: ${report.summary.internalGapCount}
- External blockers: ${report.summary.externalBlockerCount}
- Credential values included: no
- Local paths included: no
- Next action: ${report.summary.nextAction}

## Task Findings

| ID | Finding | Status | Task |
| --- | --- | --- | --- |
${taskRows || '| none | none | Done | All tracked tasks are complete or externally blocked. |'}

## Backlog Findings

| ID | Finding | Priority | Epic | Acceptance |
| --- | --- | --- | --- | --- |
${backlogRows || '| none | none | Done | All | All tracked backlog items are complete or externally blocked. |'}

## Launch Open Checks

| Key | Status | Owner | Action |
| --- | --- | --- | --- |
${launchRows || '| none | verified | all | All launch-readiness checks are verified. |'}
`;
}

/**
 * @param {{ jsonPath?: string, markdownPath?: string, report?: ReturnType<typeof buildFeatureCompletionReport>, rootDir?: string }} [options]
 */
export function writeFeatureCompletionReport({
  jsonPath,
  markdownPath,
  report,
  rootDir = resolveProjectRoot(),
} = {}) {
  const nextReport = report ?? buildFeatureCompletionReport({ rootDir });
  const targetJsonPath = jsonPath ?? resolveDefaultJsonPath(rootDir);
  const targetMarkdownPath = markdownPath ?? resolveDefaultMarkdownPath(rootDir);
  fs.mkdirSync(path.dirname(targetJsonPath), { recursive: true });
  fs.writeFileSync(targetJsonPath, `${JSON.stringify(nextReport, null, 2)}\n`);
  fs.writeFileSync(targetMarkdownPath, renderFeatureCompletionMarkdown(nextReport));
  return { jsonPath: targetJsonPath, markdownPath: targetMarkdownPath, report: nextReport };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const { jsonPath, markdownPath, report } = writeFeatureCompletionReport();
  console.log(`Wrote feature completion report to ${jsonPath}`);
  console.log(`Wrote feature completion summary to ${markdownPath}`);
  console.log(`Status: ${report.status}; internal gaps: ${report.summary.internalGapCount}; external blockers: ${report.summary.externalBlockerCount}`);
}
