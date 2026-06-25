import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  buildDataRoomIndex,
  dataRoomIndexArtifactLocations,
  type DataRoomIndex,
  type DataRoomReportBundle,
} from '../src/core/dataRoomIndex';

export function resolveProjectRoot() {
  return path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
}

export function resolveDefaultJsonOutputPath(rootDir = resolveProjectRoot()) {
  return path.join(rootDir, 'docs/sdlc/data-room-index.json');
}

export function resolveDefaultMarkdownOutputPath(rootDir = resolveProjectRoot()) {
  return path.join(rootDir, 'docs/sdlc/data-room-index.md');
}

function readJsonIfExists(rootDir: string, relativePath: string) {
  const filePath = path.join(rootDir, relativePath);
  if (!fs.existsSync(filePath)) return undefined;
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function buildArtifactAvailability(rootDir: string) {
  return Object.fromEntries(
    dataRoomIndexArtifactLocations.map((location) => [location, fs.existsSync(path.join(rootDir, location))]),
  );
}

function readReports(rootDir: string): DataRoomReportBundle {
  return {
    acquisitionReadinessPacket: readJsonIfExists(rootDir, 'docs/sdlc/acquisition-readiness-packet.json'),
    cueValidationDatasetReport: readJsonIfExists(rootDir, 'docs/sdlc/cue-validation-dataset-report.json'),
    dependencyLicenseReport: readJsonIfExists(rootDir, 'docs/sdlc/dependency-license-report.json'),
    externalEvidenceIntakeReport: readJsonIfExists(rootDir, 'docs/sdlc/external-evidence-intake-report.json'),
    featureCompletionReport: readJsonIfExists(rootDir, 'docs/sdlc/feature-completion-report.json'),
    githubWorkflowReport: readJsonIfExists(rootDir, 'docs/sdlc/github-workflow-report.json'),
    iosToolchainReport: readJsonIfExists(rootDir, 'docs/sdlc/ios-toolchain-report.json'),
    launchReadinessReport: readJsonIfExists(rootDir, 'docs/sdlc/launch-readiness-report.json'),
    licenseReviewPacket: readJsonIfExists(rootDir, 'docs/sdlc/license-review-packet.json'),
    modelAssetProvenanceReport: readJsonIfExists(rootDir, 'docs/sdlc/model-asset-provenance-report.json'),
    modelDeliveryLifecycleReport: readJsonIfExists(rootDir, 'docs/sdlc/model-delivery-lifecycle-report.json'),
    modelVerificationSuiteReport: readJsonIfExists(rootDir, 'docs/sdlc/model-verification-suite-report.json'),
    moveNetReadinessReport: readJsonIfExists(rootDir, 'docs/sdlc/movenet-readiness-report.json'),
    nativeQaEvidenceStarterReport: readJsonIfExists(rootDir, 'docs/sdlc/native-qa-evidence-starter-report.json'),
    pwaReadinessReport: readJsonIfExists(rootDir, 'docs/sdlc/pwa-readiness-report.json'),
    releaseBlockerIssueWebLinks: readJsonIfExists(rootDir, 'docs/sdlc/release-blocker-issue-web-links.json'),
    releaseBlockerProgressReport: readJsonIfExists(rootDir, 'docs/sdlc/release-blocker-progress.json'),
    releaseFreshnessReport: readJsonIfExists(rootDir, 'docs/sdlc/release-freshness-report.json'),
    releaseGateReport: readJsonIfExists(rootDir, 'docs/sdlc/release-gate-report.json'),
    releaseHandoffPacket: readJsonIfExists(rootDir, 'docs/sdlc/release-handoff-packet.json'),
    storeReleaseAccountRunbook: readJsonIfExists(rootDir, 'docs/sdlc/store-release-account-runbook.json'),
    storeCredentialsSetupPacket: readJsonIfExists(rootDir, 'docs/sdlc/store-credentials-setup-packet.json'),
    storeSubmissionPacket: readJsonIfExists(rootDir, 'docs/store/store-submission-packet.json'),
    vercelDeploymentHandoff: readJsonIfExists(rootDir, 'docs/sdlc/vercel-deployment-handoff.json'),
    vercelDeploymentReport: readJsonIfExists(rootDir, 'docs/sdlc/vercel-deployment-report.json'),
    vercelWorkflowReport: readJsonIfExists(rootDir, 'docs/sdlc/vercel-workflow-report.json'),
    webSmokeReport: readJsonIfExists(rootDir, 'docs/sdlc/web-smoke-report.json'),
  };
}

export function renderDataRoomIndexMarkdown(index: DataRoomIndex) {
  const itemRows = index.items
    .map((item) => `| ${item.label} | ${item.category} | ${item.status} | ${item.owner} | ${item.sensitivity} | \`${item.location}\` | \`${item.refreshCommand}\` |`)
    .join('\n');
  const commandRows = index.commands
    .map((command) => `| ${command.label} | ${command.owner} | \`${command.command}\` | ${command.purpose} |`)
    .join('\n');

  return `# Data Room Index

Generated: ${index.generatedAt}

## Summary

- Status: ${index.summary.status}
- Items ready: ${index.summary.readyCount}/${index.summary.itemCount}
- Review items: ${index.summary.reviewCount}
- External-required items: ${index.summary.externalRequiredCount}
- Missing items: ${index.summary.missingCount}
- Blocked items: ${index.summary.blockedCount}
- Next action: ${index.summary.nextAction}

## Privacy

- Credential values included: no
- Local paths included: no
- Payment data included: no
- Raw artifacts included: no
- Raw video included: no
- Token-like values included: no

## Items

| Item | Category | Status | Owner | Sensitivity | Location | Refresh |
| --- | --- | --- | --- | --- | --- | --- |
${itemRows}

## Commands

| Command | Owner | Value | Purpose |
| --- | --- | --- | --- |
${commandRows}
`;
}

export function writeDataRoomIndex({
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
  const jsonTarget = jsonOutputPath ?? resolveDefaultJsonOutputPath(rootDir);
  const markdownTarget = markdownOutputPath ?? resolveDefaultMarkdownOutputPath(rootDir);
  const index = buildDataRoomIndex({
    artifactAvailability: buildArtifactAvailability(rootDir),
    generatedAt,
    reports: readReports(rootDir),
  });

  fs.mkdirSync(path.dirname(jsonTarget), { recursive: true });
  fs.mkdirSync(path.dirname(markdownTarget), { recursive: true });
  fs.writeFileSync(jsonTarget, `${JSON.stringify(index, null, 2)}\n`);
  fs.writeFileSync(markdownTarget, renderDataRoomIndexMarkdown(index));

  return { index, jsonTarget, markdownTarget };
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
    const { index, jsonTarget, markdownTarget } = writeDataRoomIndex(readCliOptions(process.argv.slice(2)));

    console.log(`Wrote data-room index to ${jsonTarget}`);
    console.log(`Wrote data-room summary to ${markdownTarget}`);
    console.log(`Status: ${index.summary.status}; ready: ${index.summary.readyCount}/${index.summary.itemCount}; external: ${index.summary.externalRequiredCount}`);
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  }
}
