import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  buildExternalEvidenceValidationReport,
  buildMissingExternalEvidenceValidationReport,
  externalEvidenceValidationReportSchemaVersion,
  ExternalEvidenceFilledIntakeSchema,
  type ExternalEvidenceValidationReport,
} from '../src/core/externalEvidenceIntake';

export function resolveProjectRoot() {
  return path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
}

function relativePath(rootDir: string, filePath: string) {
  return path.relative(rootDir, filePath).replaceAll(path.sep, '/');
}

export function resolveExternalEvidenceValidationPaths(rootDir = resolveProjectRoot()) {
  const sdlcDir = path.join(rootDir, 'docs/sdlc');

  return {
    inputPath: path.join(sdlcDir, 'external-evidence-intake.filled.json'),
    markdownOutputPath: path.join(sdlcDir, 'external-evidence-validation-report.md'),
    reportOutputPath: path.join(sdlcDir, 'external-evidence-validation-report.json'),
  };
}

function renderCheckRows(report: ExternalEvidenceValidationReport) {
  return report.checks
    .map(
      (check) =>
        `| ${check.label} | \`${check.expectedProof}\` | ${check.referenceType || '-'} | ${check.status} | ${check.detail.replace(/\n/g, ' ')} |`,
    )
    .join('\n');
}

export function renderExternalEvidenceValidationMarkdown(report: ExternalEvidenceValidationReport) {
  return `# External Evidence Validation Report

Generated: ${report.generatedAt}

- Status: ${report.status}
- Required proofs: ${report.summary.requiredProofs}
- Provided proofs: ${report.summary.providedProofs}
- Accepted proofs: ${report.summary.acceptedProofs}
- Missing proofs: ${report.summary.missingProofs}
- Failed checks: ${report.summary.failedChecks}
- Next action: ${report.nextAction}
- Credential values included: no
- Local paths included: no
- Raw artifacts included: no
- Raw video included: no

| Blocker | Expected proof | Reference type | Status | Detail |
| --- | --- | --- | --- | --- |
${renderCheckRows(report) || '| None | - | - | pass | No external evidence rows are open. |'}
`;
}

function buildInvalidInputReport({
  detail,
  generatedAt,
}: {
  detail: string;
  generatedAt: string;
}): ExternalEvidenceValidationReport {
  return {
    checks: [
      {
        detail,
        expectedProof: 'Parseable filled external evidence intake file',
        id: 'external-evidence-input-parse',
        itemKey: 'externalEvidence',
        label: 'External evidence input',
        referenceType: '',
        status: 'fail',
      },
    ],
    generatedAt,
    nextAction: 'Fix the filled external evidence intake JSON without adding secret values, local paths, raw artifacts, or raw video.',
    privacy: {
      credentialValuesIncluded: false,
      localPathsIncluded: false,
      rawArtifactsIncluded: false,
      rawVideoIncluded: false,
      tokenLikeValuesIncluded: false,
    },
    schemaVersion: externalEvidenceValidationReportSchemaVersion,
    status: 'invalid',
    summary: {
      acceptedProofs: 0,
      failedChecks: 1,
      intakeItemCount: 0,
      missingProofs: 1,
      providedProofs: 0,
      requiredProofs: 1,
    },
  };
}

function writeJson(filePath: string, value: unknown) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`);
}

function writeText(filePath: string, value: string) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, value);
}

function readCliOptions(argv: string[], rootDir = resolveProjectRoot()) {
  const optionValue = (name: string, fallback: string | undefined = undefined) => {
    const index = argv.indexOf(name);
    const value = index >= 0 ? argv[index + 1] : undefined;
    return value && !value.startsWith('--') ? value : fallback;
  };
  const paths = resolveExternalEvidenceValidationPaths(rootDir);

  return {
    generatedAt: optionValue('--generated-at'),
    inputPath: optionValue('--input', paths.inputPath) ?? paths.inputPath,
    markdownOutputPath: optionValue('--markdown-output', paths.markdownOutputPath) ?? paths.markdownOutputPath,
    reportOutputPath: optionValue('--json-output', paths.reportOutputPath) ?? paths.reportOutputPath,
    rootDir,
  };
}

export function writeExternalEvidenceValidationReport({
  generatedAt = new Date().toISOString(),
  inputPath = resolveExternalEvidenceValidationPaths().inputPath,
  markdownOutputPath = resolveExternalEvidenceValidationPaths().markdownOutputPath,
  reportOutputPath = resolveExternalEvidenceValidationPaths().reportOutputPath,
  rootDir = resolveProjectRoot(),
}: {
  generatedAt?: string;
  inputPath?: string;
  markdownOutputPath?: string;
  reportOutputPath?: string;
  rootDir?: string;
} = {}) {
  let report: ExternalEvidenceValidationReport;

  if (!fs.existsSync(inputPath)) {
    report = buildMissingExternalEvidenceValidationReport({
      generatedAt,
      inputPath: relativePath(rootDir, inputPath),
    });
  } else {
    try {
      const input = ExternalEvidenceFilledIntakeSchema.parse(JSON.parse(fs.readFileSync(inputPath, 'utf8')));
      report = buildExternalEvidenceValidationReport({
        generatedAt,
        input,
      });
    } catch (error) {
      report = buildInvalidInputReport({
        detail: error instanceof Error ? error.message : 'Filled external evidence intake JSON could not be parsed.',
        generatedAt,
      });
    }
  }

  writeJson(reportOutputPath, report);
  writeText(markdownOutputPath, renderExternalEvidenceValidationMarkdown(report));

  return {
    markdownOutputPath,
    report,
    reportOutputPath,
  };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const options = readCliOptions(process.argv.slice(2));
  const { markdownOutputPath, report, reportOutputPath } = writeExternalEvidenceValidationReport(options);

  console.log(`Wrote external evidence validation report to ${reportOutputPath}`);
  console.log(`Wrote external evidence validation summary to ${markdownOutputPath}`);
  console.log(`Status: ${report.status}; accepted proofs: ${report.summary.acceptedProofs}/${report.summary.requiredProofs}`);
}
