import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { buildExternalEvidenceIntakeReport, type ExternalEvidenceValidationReport } from '../src/core/externalEvidenceIntake';
import { type LaunchReadinessEvidence } from '../src/core/launchReadiness';
import {
  ReleaseBlockerProgressSchema,
  assertReleaseBlockerProgressIsShareSafe,
  buildReleaseBlockerProgress,
  type ReleaseBlockerProgress,
} from '../src/core/releaseBlockerProgress';
import { buildReleaseCriticalPath } from '../src/core/releaseCriticalPath';
import { buildReleaseUnblockChecklist } from '../src/core/releaseUnblockChecklist';

export function resolveProjectRoot() {
  return path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
}

function readJsonIfExists(filePath: string) {
  if (!fs.existsSync(filePath)) return undefined;
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function readLaunchEvidence(appConfigPath: string) {
  const appConfig = readJsonIfExists(appConfigPath);
  return appConfig?.expo?.extra?.launchReadinessEvidence as LaunchReadinessEvidence | undefined;
}

export function resolveReleaseBlockerProgressPaths(rootDir = resolveProjectRoot()) {
  const sdlcDir = path.join(rootDir, 'docs/sdlc');

  return {
    markdownOutputPath: path.join(sdlcDir, 'release-blocker-progress.md'),
    reportOutputPath: path.join(sdlcDir, 'release-blocker-progress.json'),
  };
}

export function renderReleaseBlockerProgressMarkdown(report: ReleaseBlockerProgress) {
  const itemRows = report.items
    .map(
      (item) =>
        `| ${item.label} | ${item.status} | ${item.owner} | ${item.lane} | ${item.missingProofCount} | \`${item.currentCommand}\` | ${item.blockedBy.join(', ') || '-'} |`,
    )
    .join('\n');
  const proofRows = report.items
    .flatMap((item) =>
      item.proof.map(
        (proof) =>
          `| ${item.label} | ${proof.status} | \`${proof.expectedProof}\` | ${proof.acceptedReferenceTypes.map((type) => `\`${type}\``).join(', ')} |`,
      ),
    )
    .join('\n');

  return `# Release Blocker Progress

Generated: ${report.generatedAt}

- Status: ${report.summary.status}
- Blockers: ${report.summary.blockerCount}
- Needs proof: ${report.summary.needsProofCount}
- Dependency blocked: ${report.summary.dependencyBlockedCount}
- Proof ready: ${report.summary.proofReadyCount}
- Accepted proofs: ${report.summary.acceptedProofCount}
- Missing proofs: ${report.summary.missingProofCount}
- Commands: ${report.summary.commandCount}
- Next action: ${report.summary.nextAction}
- Credential values included: no
- Local paths included: no
- Raw artifacts included: no
- Raw video included: no
- Token-like values included: no

## Blockers

| Blocker | Status | Owner | Lane | Missing proofs | Current command | Blocked by |
| --- | --- | --- | --- | ---: | --- | --- |
${itemRows || '| None | ready | - | - | 0 | - | - |'}

## Proof References

| Blocker | Status | Expected proof | Accepted references |
| --- | --- | --- | --- |
${proofRows || '| None | accepted | - | - |'}
`;
}

function writeJson(filePath: string, value: unknown) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`);
}

function writeText(filePath: string, value: string) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, value);
}

export function writeReleaseBlockerProgress({
  appConfigPath = path.join(resolveProjectRoot(), 'app.json'),
  generatedAt = new Date().toISOString(),
  rootDir = resolveProjectRoot(),
}: {
  appConfigPath?: string;
  generatedAt?: string;
  rootDir?: string;
} = {}) {
  const evidence = readLaunchEvidence(appConfigPath);
  const checklist = buildReleaseUnblockChecklist(evidence);
  const criticalPath = buildReleaseCriticalPath({
    checklist,
    evidence,
    generatedAt,
  });
  const intakeReport = buildExternalEvidenceIntakeReport({
    checklist,
    evidence,
    generatedAt,
  });
  const validationReport = readJsonIfExists(path.join(rootDir, 'docs/sdlc/external-evidence-validation-report.json')) as
    | ExternalEvidenceValidationReport
    | undefined;
  const report = buildReleaseBlockerProgress({
    checklist,
    criticalPath,
    generatedAt,
    intakeReport,
    validationReport,
  });
  const paths = resolveReleaseBlockerProgressPaths(rootDir);

  ReleaseBlockerProgressSchema.parse(report);
  assertReleaseBlockerProgressIsShareSafe(report);
  writeJson(paths.reportOutputPath, report);
  writeText(paths.markdownOutputPath, renderReleaseBlockerProgressMarkdown(report));

  return {
    paths,
    report,
  };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const { paths, report } = writeReleaseBlockerProgress();

  console.log(`Wrote release blocker progress to ${paths.reportOutputPath}`);
  console.log(`Wrote release blocker progress summary to ${paths.markdownOutputPath}`);
  console.log(`Status: ${report.summary.status}; missing proofs: ${report.summary.missingProofCount}; dependency blocked: ${report.summary.dependencyBlockedCount}`);
}
