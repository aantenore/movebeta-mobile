import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  buildAcquisitionReadinessPacket,
  type AcquisitionReadinessPacket,
} from '../src/core/acquisitionReadinessPacket';
import {
  buildBillingReadinessSummary,
  defaultBillingReadinessConfig,
  parseBillingReadinessConfig,
} from '../src/core/billingReadiness';
import { buildCommercialReadinessPacket } from '../src/core/commercialReadinessPacket';

export function resolveProjectRoot() {
  return path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
}

export function resolveDefaultJsonOutputPath(rootDir = resolveProjectRoot()) {
  return path.join(rootDir, 'docs/sdlc/acquisition-readiness-packet.json');
}

export function resolveDefaultMarkdownOutputPath(rootDir = resolveProjectRoot()) {
  return path.join(rootDir, 'docs/sdlc/acquisition-readiness-packet.md');
}

function readJsonIfExists(rootDir: string, relativePath: string) {
  const filePath = path.join(rootDir, relativePath);
  if (!fs.existsSync(filePath)) return undefined;
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function record(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

function readBillingReadinessConfig(rootDir: string) {
  const appJson = record(readJsonIfExists(rootDir, 'app.json'));
  const expo = record(appJson.expo);
  const extra = record(expo.extra);
  return parseBillingReadinessConfig(process.env.EXPO_PUBLIC_MOVEBETA_BILLING_READINESS ?? extra.billingReadiness) ?? defaultBillingReadinessConfig;
}

function artifactAvailability(rootDir: string, paths: string[]) {
  return Object.fromEntries(paths.map((relativePath) => [relativePath, fs.existsSync(path.join(rootDir, relativePath))]));
}

export function renderAcquisitionReadinessMarkdown(packet: AcquisitionReadinessPacket) {
  const signalRows = packet.signals
    .map((signal) => `| ${signal.label} | ${signal.status} | ${signal.owner} | ${signal.detail} | ${signal.nextAction} |`)
    .join('\n');
  const artifactRows = packet.artifacts
    .map((artifact) => `| ${artifact.label} | ${artifact.status} | \`${artifact.path}\` |`)
    .join('\n');
  const commandRows = packet.commands
    .map((command) => `| ${command.label} | ${command.owner} | \`${command.command}\` | ${command.purpose} |`)
    .join('\n');

  return `# Acquisition Readiness Packet

Generated: ${packet.generatedAt}

## Summary

- Status: ${packet.summary.status}
- Signals ready: ${packet.summary.readySignalCount}/${packet.summary.signalCount}
- Review signals: ${packet.summary.reviewSignalCount}
- Blocked signals: ${packet.summary.blockedSignalCount}
- External blockers: ${packet.summary.externalBlockerCount}
- Due diligence artifacts ready: ${packet.summary.dueDiligenceArtifactCount}/${packet.artifacts.length}
- Next action: ${packet.summary.nextAction}

## Privacy

- Credential values included: no
- Local paths included: no
- Payment data included: no
- Raw artifacts included: no
- Raw video included: no
- Token-like values included: no

## Signals

| Signal | Status | Owner | Detail | Next action |
| --- | --- | --- | --- | --- |
${signalRows}

## Artifacts

| Artifact | Status | Path |
| --- | --- | --- |
${artifactRows}

## Commands

| Command | Owner | Value | Purpose |
| --- | --- | --- | --- |
${commandRows}
`;
}

export function writeAcquisitionReadinessPacket({
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
  const artifactPaths = [
    'docs/sdlc/release-gate-report.json',
    'docs/sdlc/launch-readiness-report.json',
    'docs/sdlc/feature-completion-report.json',
    'docs/sdlc/release-handoff-packet.json',
    'docs/store/store-submission-packet.json',
    'docs/sdlc/acquisition-readiness-packet.json',
    'docs/sdlc/dependency-license-report.json',
    'docs/sdlc/license-review-packet.json',
    'docs/legal/THIRD_PARTY_NOTICES.md',
    'docs/sdlc/model-asset-provenance-report.json',
    'docs/sdlc/model-delivery-lifecycle-report.json',
    'docs/sdlc/pwa-readiness-report.json',
    'docs/sdlc/web-smoke-report.json',
    'docs/sdlc/vercel-deployment-report.json',
    'docs/sdlc/vercel-deployment-handoff.json',
    'docs/screenshots.md',
    '../movebeta-mobile-source.zip',
    '../movebeta-mobile-web-dist.zip',
  ];
  const commercialReadinessPacket = buildCommercialReadinessPacket({
    generatedAt,
    readiness: buildBillingReadinessSummary(readBillingReadinessConfig(rootDir)),
  });
  const packet = buildAcquisitionReadinessPacket({
    artifactAvailability: {
      ...artifactAvailability(rootDir, artifactPaths),
      'docs/sdlc/acquisition-readiness-packet.json': true,
    },
    commercialReadinessPacket,
    dependencyLicenseReport: readJsonIfExists(rootDir, 'docs/sdlc/dependency-license-report.json'),
    featureCompletionReport: readJsonIfExists(rootDir, 'docs/sdlc/feature-completion-report.json'),
    generatedAt,
    launchReadinessReport: readJsonIfExists(rootDir, 'docs/sdlc/launch-readiness-report.json'),
    licenseReviewPacket: readJsonIfExists(rootDir, 'docs/sdlc/license-review-packet.json'),
    modelAssetProvenanceReport: readJsonIfExists(rootDir, 'docs/sdlc/model-asset-provenance-report.json'),
    modelDeliveryLifecycleReport: readJsonIfExists(rootDir, 'docs/sdlc/model-delivery-lifecycle-report.json'),
    pwaReadinessReport: readJsonIfExists(rootDir, 'docs/sdlc/pwa-readiness-report.json'),
    releaseGateReport: readJsonIfExists(rootDir, 'docs/sdlc/release-gate-report.json'),
    releaseHandoffPacket: readJsonIfExists(rootDir, 'docs/sdlc/release-handoff-packet.json'),
    storeSubmissionPacket: readJsonIfExists(rootDir, 'docs/store/store-submission-packet.json'),
    vercelDeploymentHandoff: readJsonIfExists(rootDir, 'docs/sdlc/vercel-deployment-handoff.json'),
    vercelDeploymentReport: readJsonIfExists(rootDir, 'docs/sdlc/vercel-deployment-report.json'),
    webSmokeReport: readJsonIfExists(rootDir, 'docs/sdlc/web-smoke-report.json'),
  });

  fs.mkdirSync(path.dirname(jsonTarget), { recursive: true });
  fs.mkdirSync(path.dirname(markdownTarget), { recursive: true });
  fs.writeFileSync(jsonTarget, `${JSON.stringify(packet, null, 2)}\n`);
  fs.writeFileSync(markdownTarget, renderAcquisitionReadinessMarkdown(packet));

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
    const { jsonTarget, markdownTarget, packet } = writeAcquisitionReadinessPacket(readCliOptions(process.argv.slice(2)));

    console.log(`Wrote acquisition readiness packet to ${jsonTarget}`);
    console.log(`Wrote acquisition readiness summary to ${markdownTarget}`);
    console.log(`Status: ${packet.summary.status}; signals ready: ${packet.summary.readySignalCount}/${packet.summary.signalCount}`);
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  }
}
