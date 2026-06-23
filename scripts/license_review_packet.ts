import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  buildLicenseReviewPacket,
  type LicenseReviewPacket,
} from '../src/core/licenseReviewPacket';

export function resolveProjectRoot() {
  return path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
}

export function resolveDefaultJsonOutputPath(rootDir = resolveProjectRoot()) {
  return path.join(rootDir, 'docs/sdlc/license-review-packet.json');
}

export function resolveDefaultMarkdownOutputPath(rootDir = resolveProjectRoot()) {
  return path.join(rootDir, 'docs/sdlc/license-review-packet.md');
}

export function resolveDefaultNoticesOutputPath(rootDir = resolveProjectRoot()) {
  return path.join(rootDir, 'docs/legal/THIRD_PARTY_NOTICES.md');
}

function readJsonIfExists(rootDir: string, relativePath: string) {
  const filePath = path.join(rootDir, relativePath);
  if (!fs.existsSync(filePath)) return undefined;
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function readTextIfExists(rootDir: string, relativePath: string) {
  const filePath = path.join(rootDir, relativePath);
  if (!fs.existsSync(filePath)) return '';
  return fs.readFileSync(filePath, 'utf8');
}

function markdownRows(packet: LicenseReviewPacket) {
  return packet.obligations
    .map((item) => {
      const label = item.packageName ? `${item.packageName}${item.version ? ` ${item.version}` : ''}` : item.label;
      const license = item.license ?? '';
      return `| ${label} | ${item.source} | ${item.status} | ${license} | ${item.owner} | ${item.action} |`;
    })
    .join('\n');
}

function noticeRows(packet: LicenseReviewPacket) {
  return packet.notices
    .map((item) => `| ${item.label} | ${item.included ? 'yes' : 'no'} | ${item.source} | \`${item.path}\` |`)
    .join('\n');
}

export function renderLicenseReviewMarkdown(packet: LicenseReviewPacket) {
  return `# License Review Packet

Generated: ${packet.generatedAt}

## Summary

- Status: ${packet.summary.status}
- Dependency status: ${packet.summary.dependencyStatus}
- Model status: ${packet.summary.modelStatus}
- Obligations: ${packet.summary.obligationCount}
- Review obligations: ${packet.summary.reviewObligationCount}
- Blocked obligations: ${packet.summary.blockedObligationCount}
- Notice artifacts: ${packet.summary.noticeArtifactCount}
- External legal approval required: ${packet.legalReview.externalApprovalRequired ? 'yes' : 'no'}
- Legal clearance claimed: no
- Next action: ${packet.summary.nextAction}

## Privacy

- Credential values included: no
- Local paths included: no
- Raw artifacts included: no
- Raw video included: no
- Secret values included: no
- Token-like values included: no

## Obligations

| Item | Source | Status | License | Owner | Action |
| --- | --- | --- | --- | --- | --- |
${markdownRows(packet)}

## Notice Artifacts

| Artifact | Included | Source | Path |
| --- | --- | --- | --- |
${noticeRows(packet)}
`;
}

export function renderThirdPartyNoticesMarkdown(packet: LicenseReviewPacket, modelAssetAttributionNotice: string) {
  const reviewRows = packet.obligations
    .filter((item) => item.status !== 'ready')
    .map((item) => {
      const label = item.packageName ? `${item.packageName}${item.version ? ` ${item.version}` : ''}` : item.label;
      return `| ${label} | ${item.source} | ${item.status} | ${item.license ?? ''} | ${item.action} |`;
    })
    .join('\n');

  return `# Third-Party Notices

Generated: ${packet.generatedAt}

This file is a share-safe notice index generated from the dependency license report and model provenance report. It is not a legal approval record.

- Legal clearance claimed: no
- External legal approval reference: ${packet.legalReview.requiredApprovalReference}
- Dependency status: ${packet.summary.dependencyStatus}
- Model status: ${packet.summary.modelStatus}

## Review Items

| Item | Source | Status | License | Action |
| --- | --- | --- | --- | --- |
${reviewRows || '| None |  |  |  |  |'}

## Model Attribution

${modelAssetAttributionNotice.trim() || 'Model attribution notice is missing and must be restored before distribution.'}
`;
}

export function writeLicenseReviewPacket({
  generatedAt,
  jsonOutputPath,
  markdownOutputPath,
  noticesOutputPath,
  rootDir = resolveProjectRoot(),
}: {
  generatedAt?: string;
  jsonOutputPath?: string;
  markdownOutputPath?: string;
  noticesOutputPath?: string;
  rootDir?: string;
} = {}) {
  const modelAssetAttributionNotice = readTextIfExists(rootDir, 'docs/sdlc/model-asset-attribution.md');
  const packet = buildLicenseReviewPacket({
    dependencyLicenseReport: readJsonIfExists(rootDir, 'docs/sdlc/dependency-license-report.json'),
    generatedAt,
    modelAssetAttributionNotice,
    modelAssetProvenanceReport: readJsonIfExists(rootDir, 'docs/sdlc/model-asset-provenance-report.json'),
  });
  const jsonTarget = jsonOutputPath ?? resolveDefaultJsonOutputPath(rootDir);
  const markdownTarget = markdownOutputPath ?? resolveDefaultMarkdownOutputPath(rootDir);
  const noticesTarget = noticesOutputPath ?? resolveDefaultNoticesOutputPath(rootDir);

  fs.mkdirSync(path.dirname(jsonTarget), { recursive: true });
  fs.mkdirSync(path.dirname(markdownTarget), { recursive: true });
  fs.mkdirSync(path.dirname(noticesTarget), { recursive: true });
  fs.writeFileSync(jsonTarget, `${JSON.stringify(packet, null, 2)}\n`);
  fs.writeFileSync(markdownTarget, renderLicenseReviewMarkdown(packet));
  fs.writeFileSync(noticesTarget, renderThirdPartyNoticesMarkdown(packet, modelAssetAttributionNotice));

  return { jsonTarget, markdownTarget, noticesTarget, packet };
}

function readCliOptions(argv: string[]) {
  const outputIndex = argv.indexOf('--output');
  const summaryIndex = argv.indexOf('--summary');
  const noticesIndex = argv.indexOf('--notices');

  return {
    jsonOutputPath: outputIndex >= 0 ? argv[outputIndex + 1] : resolveDefaultJsonOutputPath(),
    markdownOutputPath: summaryIndex >= 0 ? argv[summaryIndex + 1] : resolveDefaultMarkdownOutputPath(),
    noticesOutputPath: noticesIndex >= 0 ? argv[noticesIndex + 1] : resolveDefaultNoticesOutputPath(),
  };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  try {
    const { jsonTarget, markdownTarget, noticesTarget, packet } = writeLicenseReviewPacket(readCliOptions(process.argv.slice(2)));

    console.log(`Wrote license review packet to ${jsonTarget}`);
    console.log(`Wrote license review summary to ${markdownTarget}`);
    console.log(`Wrote third-party notices to ${noticesTarget}`);
    console.log(
      `Status: ${packet.summary.status}; obligations: ${packet.summary.obligationCount}; review: ${packet.summary.reviewObligationCount}; blocked: ${packet.summary.blockedObligationCount}`,
    );
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  }
}
