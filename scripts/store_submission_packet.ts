import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { buildStoreSubmissionPacket, type StoreSubmissionPacket } from '../src/core/storeSubmissionPacket';
import { StoreReadinessManifestSchema } from '../src/core/storeReadiness';

export function resolveProjectRoot() {
  return path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
}

export function resolveDefaultManifestPath(rootDir = resolveProjectRoot()) {
  return path.join(rootDir, 'docs/store/store-manifest.json');
}

export function resolveDefaultOutputPath(rootDir = resolveProjectRoot()) {
  return path.join(rootDir, 'docs/store/store-submission-packet.json');
}

export function resolveDefaultSummaryPath(rootDir = resolveProjectRoot()) {
  return path.join(rootDir, 'docs/store/store-submission-packet.md');
}

function readJson(filePath: string) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8')) as unknown;
}

export function renderStoreSubmissionPacketMarkdown(packet: StoreSubmissionPacket) {
  const failingChecks = packet.readiness.checks.filter((check) => check.status === 'fail');
  const issues = packet.safetyLanguage.issues;

  return `# Store Submission Packet

Generated: ${packet.generatedAt}

## Summary

- Status: ${packet.summary.status}
- iOS bundle: ${packet.summary.iosBundleIdentifier}
- Android package: ${packet.summary.androidPackage}
- Store checks: ${packet.summary.checksPassed}/${packet.summary.checkCount}
- Screenshots: ${packet.summary.screenshotCount}
- Copy issues: ${packet.summary.copyIssueCount}
- Next action: ${packet.summary.nextAction}

## Privacy

- Raw video included: no
- Raw artifacts included: no
- Credential values included: no
- Tracking enabled: no

## Commands

${packet.commands.map((command) => `- \`${command.command}\` - ${command.purpose}`).join('\n')}

## Failing Checks

${failingChecks.length > 0 ? failingChecks.map((check) => `- ${check.label}: ${check.detail}`).join('\n') : '- None'}

## Copy Issues

${issues.length > 0 ? issues.map((issue) => `- ${issue.sourceLabel}: ${issue.label} - ${issue.guidance}`).join('\n') : '- None'}
`;
}

export function writeStoreSubmissionPacket({
  manifestPath = resolveDefaultManifestPath(),
  outputPath = resolveDefaultOutputPath(),
  summaryPath = resolveDefaultSummaryPath(),
}: {
  manifestPath?: string;
  outputPath?: string;
  summaryPath?: string;
} = {}) {
  const manifest = StoreReadinessManifestSchema.parse(readJson(manifestPath));
  const packet = buildStoreSubmissionPacket({ manifest });

  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, `${JSON.stringify(packet, null, 2)}\n`);
  fs.writeFileSync(summaryPath, renderStoreSubmissionPacketMarkdown(packet));
  return { outputPath, packet, summaryPath };
}

function readCliOptions(argv: string[]) {
  const manifestIndex = argv.indexOf('--manifest');
  const outputIndex = argv.indexOf('--output');
  const summaryIndex = argv.indexOf('--summary');

  return {
    manifestPath: manifestIndex >= 0 ? argv[manifestIndex + 1] : resolveDefaultManifestPath(),
    outputPath: outputIndex >= 0 ? argv[outputIndex + 1] : resolveDefaultOutputPath(),
    summaryPath: summaryIndex >= 0 ? argv[summaryIndex + 1] : resolveDefaultSummaryPath(),
  };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  try {
    const { outputPath, packet, summaryPath } = writeStoreSubmissionPacket(readCliOptions(process.argv.slice(2)));

    console.log(`Wrote store submission packet to ${outputPath}`);
    console.log(`Wrote store submission summary to ${summaryPath}`);
    console.log(`Status: ${packet.summary.status}; checks: ${packet.summary.checksPassed}/${packet.summary.checkCount}`);
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  }
}
