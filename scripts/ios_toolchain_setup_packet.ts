import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  buildIosToolchainSetupPacket,
  type IosToolchainSetupPacket,
} from '../src/core/iosToolchainSetupPacket';

function resolveProjectRoot() {
  return path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
}

function readJsonIfExists(rootDir: string, relativePath: string) {
  const filePath = path.join(rootDir, relativePath);
  if (!fs.existsSync(filePath)) return undefined;
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

export function renderIosToolchainSetupMarkdown(packet: IosToolchainSetupPacket) {
  const checkRows = packet.checks
    .map((check) => `| ${check.label} | ${check.status} | ${check.owner} | ${check.action} | ${check.proof.join(', ')} |`)
    .join('\n');
  const commandRows = packet.commands
    .map((command) => `| ${command.label} | ${command.owner} | \`${command.command}\` | ${command.purpose} |`)
    .join('\n');

  return `# iOS Toolchain Setup Packet

Generated: ${packet.generatedAt}

- Status: ${packet.summary.status}
- Report status: ${packet.reportStatus}
- Checks ready: ${packet.summary.readyCheckCount}/${packet.summary.totalCheckCount}
- Blocked checks: ${packet.summary.blockedCheckCount}
- Next action: ${packet.summary.nextAction}
- Credential values included: no
- Local paths included: no
- Raw artifacts included: no
- Raw video included: no

## Checks

| Check | Status | Owner | Action | Proof |
| --- | --- | --- | --- | --- |
${checkRows}

## Commands

| Command | Owner | Value | Purpose |
| --- | --- | --- | --- |
${commandRows}
`;
}

export function writeIosToolchainSetupPacket({
  generatedAt = new Date().toISOString(),
  jsonOutputPath,
  markdownOutputPath,
  rootDir = resolveProjectRoot(),
}: {
  generatedAt?: string;
  jsonOutputPath?: string;
  markdownOutputPath?: string;
  rootDir?: string;
} = {}) {
  const packet = buildIosToolchainSetupPacket({
    generatedAt,
    report: readJsonIfExists(rootDir, 'docs/sdlc/ios-toolchain-report.json'),
  });
  const jsonTarget = jsonOutputPath ?? path.join(rootDir, 'docs/sdlc/ios-toolchain-setup-packet.json');
  const markdownTarget = markdownOutputPath ?? path.join(rootDir, 'docs/sdlc/ios-toolchain-setup-packet.md');

  fs.mkdirSync(path.dirname(jsonTarget), { recursive: true });
  fs.mkdirSync(path.dirname(markdownTarget), { recursive: true });
  fs.writeFileSync(jsonTarget, `${JSON.stringify(packet, null, 2)}\n`);
  fs.writeFileSync(markdownTarget, renderIosToolchainSetupMarkdown(packet));

  return { jsonTarget, markdownTarget, packet };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const { jsonTarget, markdownTarget, packet } = writeIosToolchainSetupPacket();
  console.log(`Wrote iOS toolchain setup packet to ${jsonTarget}`);
  console.log(`Wrote iOS toolchain setup summary to ${markdownTarget}`);
  console.log(`Status: ${packet.summary.status}; ready checks: ${packet.summary.readyCheckCount}/${packet.summary.totalCheckCount}`);
}
