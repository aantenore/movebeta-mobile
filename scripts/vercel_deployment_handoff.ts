import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  buildVercelDeploymentHandoff,
  type VercelDeploymentHandoff,
} from '../src/core/vercelDeploymentHandoff';

export function resolveProjectRoot() {
  return path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
}

export function resolveDefaultJsonOutputPath(rootDir = resolveProjectRoot()) {
  return path.join(rootDir, 'docs/sdlc/vercel-deployment-handoff.json');
}

export function resolveDefaultMarkdownOutputPath(rootDir = resolveProjectRoot()) {
  return path.join(rootDir, 'docs/sdlc/vercel-deployment-handoff.md');
}

function readJsonIfExists(rootDir: string, relativePath: string) {
  const filePath = path.join(rootDir, relativePath);
  if (!fs.existsSync(filePath)) return undefined;
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function phaseRows(packet: VercelDeploymentHandoff) {
  return packet.phases
    .map((phase) => `| ${phase.label} | ${phase.status} | ${phase.owner} | ${phase.nextAction} |`)
    .join('\n');
}

function commandRows(packet: VercelDeploymentHandoff) {
  return packet.commands
    .map((command) => `| ${command.label} | ${command.owner} | \`${command.command}\` | ${command.purpose} |`)
    .join('\n');
}

export function renderVercelDeploymentHandoffMarkdown(packet: VercelDeploymentHandoff) {
  return `# Vercel Deployment Handoff

Generated: ${packet.generatedAt}

## Summary

- Status: ${packet.summary.status}
- Deployment report status: ${packet.summary.deploymentStatus}
- Workflow report status: ${packet.summary.workflowStatus}
- Phases ready: ${packet.summary.readyPhaseCount}/${packet.summary.phaseCount}
- External actions: ${packet.summary.externalActionCount}
- Blocked phases: ${packet.summary.blockedPhaseCount}
- Backend required: no
- Credential values included: no
- Project id values included: no
- Next action: ${packet.summary.nextAction}

## Phases

| Phase | Status | Owner | Next action |
| --- | --- | --- | --- |
${phaseRows(packet)}

## Commands

| Command | Owner | Value | Purpose |
| --- | --- | --- | --- |
${commandRows(packet)}

## Rollback

- Strategy: ${packet.rollback.strategy}
- Command: \`${packet.rollback.command}\`
`;
}

export function writeVercelDeploymentHandoff({
  generatedAt,
  jsonOutputPath,
  markdownOutputPath,
  rootDir = resolveProjectRoot(),
}: {
  generatedAt?: string;
  jsonOutputPath?: string;
  markdownOutputPath?: string;
  rootDir?: string;
} = {}) {
  const packet = buildVercelDeploymentHandoff({
    generatedAt,
    pwaReadinessReport: readJsonIfExists(rootDir, 'docs/sdlc/pwa-readiness-report.json'),
    releaseGateReport: readJsonIfExists(rootDir, 'docs/sdlc/release-gate-report.json'),
    vercelDeploymentReport: readJsonIfExists(rootDir, 'docs/sdlc/vercel-deployment-report.json'),
    vercelWorkflowReport: readJsonIfExists(rootDir, 'docs/sdlc/vercel-workflow-report.json'),
    webSmokeReport: readJsonIfExists(rootDir, 'docs/sdlc/web-smoke-report.json'),
  });
  const jsonTarget = jsonOutputPath ?? resolveDefaultJsonOutputPath(rootDir);
  const markdownTarget = markdownOutputPath ?? resolveDefaultMarkdownOutputPath(rootDir);

  fs.mkdirSync(path.dirname(jsonTarget), { recursive: true });
  fs.mkdirSync(path.dirname(markdownTarget), { recursive: true });
  fs.writeFileSync(jsonTarget, `${JSON.stringify(packet, null, 2)}\n`);
  fs.writeFileSync(markdownTarget, renderVercelDeploymentHandoffMarkdown(packet));

  return { jsonTarget, markdownTarget, packet };
}

function readCliOptions(argv: string[]) {
  const outputIndex = argv.indexOf('--output');
  const summaryIndex = argv.indexOf('--summary');

  return {
    jsonOutputPath: outputIndex >= 0 ? argv[outputIndex + 1] : resolveDefaultJsonOutputPath(),
    markdownOutputPath: summaryIndex >= 0 ? argv[summaryIndex + 1] : resolveDefaultMarkdownOutputPath(),
  };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  try {
    const { jsonTarget, markdownTarget, packet } = writeVercelDeploymentHandoff(readCliOptions(process.argv.slice(2)));

    console.log(`Wrote Vercel deployment handoff to ${jsonTarget}`);
    console.log(`Wrote Vercel deployment handoff summary to ${markdownTarget}`);
    console.log(
      `Status: ${packet.summary.status}; phases ready: ${packet.summary.readyPhaseCount}/${packet.summary.phaseCount}; external actions: ${packet.summary.externalActionCount}; blocked: ${packet.summary.blockedPhaseCount}`,
    );
    if (packet.summary.status === 'blocked') {
      process.exitCode = 1;
    }
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  }
}
