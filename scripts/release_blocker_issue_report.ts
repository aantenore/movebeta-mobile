import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { type LaunchReadinessEvidence } from '../src/core/launchReadiness';
import { buildReleaseBlockerIssuePacket, type ReleaseBlockerIssuePacket } from '../src/core/releaseBlockerIssuePacket';

export function resolveProjectRoot() {
  return path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
}

function readJsonIfExists(filePath: string) {
  if (!fs.existsSync(filePath)) return undefined;
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

export function resolveDefaultJsonOutputPath(rootDir = resolveProjectRoot()) {
  return path.join(rootDir, 'docs/sdlc/release-blocker-issues-report.json');
}

export function resolveDefaultMarkdownOutputPath(rootDir = resolveProjectRoot()) {
  return path.join(rootDir, 'docs/sdlc/release-blocker-issues-report.md');
}

export function renderReleaseBlockerIssueMarkdown(packet: ReleaseBlockerIssuePacket) {
  const issueRows = packet.issues
    .map((issue) => {
      const labels = issue.labels.map((label) => `\`${label}\``).join(', ');
      const commands = issue.commands.map((command) => `\`${command}\``).join('<br>');
      const proof = issue.proof.map((item) => `\`${item}\``).join('<br>');
      return `| ${issue.title} | ${issue.owner} | ${issue.tracks.join(', ')} | ${labels} | ${commands} | ${proof} |`;
    })
    .join('\n');

  return `# Release Blocker Issues Report

Generated: ${packet.generatedAt}

- Status: ${packet.summary.status}
- Issue drafts: ${packet.summary.issueCount}
- Owners: ${packet.summary.ownerCount}
- Commands: ${packet.summary.commandCount}
- Proof artifacts: ${packet.summary.proofCount}
- Credential key names: ${packet.summary.credentialKeyNameCount}
- Issue template: \`${packet.issueTemplatePath}\`
- Next action: ${packet.summary.nextAction}
- Credential values included: no
- Local paths included: no
- Raw artifacts included: no
- Raw video included: no

| Issue | Owner | Tracks | Labels | Commands | Proof |
| --- | --- | --- | --- | --- | --- |
${issueRows || '| None | - | - | - | - | - |'}
`;
}

export function writeReleaseBlockerIssueReport({
  jsonOutputPath,
  markdownOutputPath,
  packet,
}: {
  jsonOutputPath: string;
  markdownOutputPath: string;
  packet: ReleaseBlockerIssuePacket;
}) {
  fs.mkdirSync(path.dirname(jsonOutputPath), { recursive: true });
  fs.mkdirSync(path.dirname(markdownOutputPath), { recursive: true });
  fs.writeFileSync(jsonOutputPath, `${JSON.stringify(packet, null, 2)}\n`);
  fs.writeFileSync(markdownOutputPath, renderReleaseBlockerIssueMarkdown(packet));
}

export function buildReleaseBlockerIssueReportFromConfig({
  appConfigPath,
  generatedAt = new Date().toISOString(),
}: {
  appConfigPath: string;
  generatedAt?: string;
}) {
  const appConfig = readJsonIfExists(appConfigPath);
  const evidence = appConfig?.expo?.extra?.launchReadinessEvidence as LaunchReadinessEvidence | undefined;

  return buildReleaseBlockerIssuePacket({
    evidence,
    generatedAt,
  });
}

function readCliOptions(argv: string[], rootDir = resolveProjectRoot()) {
  const optionValue = (name: string, fallback: string) => {
    const index = argv.indexOf(name);
    const value = index >= 0 ? argv[index + 1] : undefined;
    return value && !value.startsWith('--') ? value : fallback;
  };

  return {
    appConfigPath: optionValue('--app-config', path.join(rootDir, 'app.json')),
    jsonOutputPath: optionValue('--output', resolveDefaultJsonOutputPath(rootDir)),
    markdownOutputPath: optionValue('--markdown-output', resolveDefaultMarkdownOutputPath(rootDir)),
  };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const options = readCliOptions(process.argv.slice(2));
  const packet = buildReleaseBlockerIssueReportFromConfig({
    appConfigPath: options.appConfigPath,
  });

  writeReleaseBlockerIssueReport({
    jsonOutputPath: options.jsonOutputPath,
    markdownOutputPath: options.markdownOutputPath,
    packet,
  });

  console.log(`Wrote release blocker issue report to ${options.jsonOutputPath}`);
  console.log(`Wrote release blocker issue summary to ${options.markdownOutputPath}`);
  console.log(`Status: ${packet.summary.status}; issues: ${packet.summary.issueCount}`);
}
