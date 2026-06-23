import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  buildExternalEvidencePromotionReport,
  buildMissingExternalEvidenceValidationReport,
  externalEvidenceValidationReportSchemaVersion,
  ExternalEvidenceFilledIntakeSchema,
  type ExternalEvidencePromotionReport,
  type ExternalEvidenceValidationReport,
} from '../src/core/externalEvidenceIntake';
import { defaultLaunchReadinessEvidence, type LaunchReadinessEvidence } from '../src/core/launchReadiness';

export function resolveProjectRoot() {
  return path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
}

function readJsonIfExists(filePath: string) {
  if (!fs.existsSync(filePath)) return undefined;
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function relativePath(rootDir: string, filePath: string) {
  return path.relative(rootDir, filePath).replaceAll(path.sep, '/');
}

export function resolveExternalEvidencePromotionPaths(rootDir = resolveProjectRoot()) {
  const sdlcDir = path.join(rootDir, 'docs/sdlc');

  return {
    inputPath: path.join(sdlcDir, 'external-evidence-intake.filled.json'),
    markdownOutputPath: path.join(sdlcDir, 'external-evidence-promotion-report.md'),
    reportOutputPath: path.join(sdlcDir, 'external-evidence-promotion-report.json'),
  };
}

function readLaunchEvidence(rootDir: string): LaunchReadinessEvidence {
  return readJsonIfExists(path.join(rootDir, 'app.json'))?.expo?.extra?.launchReadinessEvidence ?? defaultLaunchReadinessEvidence;
}

function invalidValidationReport({
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
    nextAction: 'Fix the filled external evidence intake JSON before promotion.',
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

function renderPromotionRows(report: ExternalEvidencePromotionReport) {
  return report.promotedChecks
    .map((check) => `| ${check.label} | \`${check.key}\` | ${check.proofCount} | ${check.status} |`)
    .join('\n');
}

export function renderExternalEvidencePromotionMarkdown(report: ExternalEvidencePromotionReport) {
  return `# External Evidence Promotion Report

Generated: ${report.generatedAt}

- Status: ${report.status}
- Validation status: ${report.summary.validationStatus}
- Candidate ready: ${report.summary.candidateReady ? 'yes' : 'no'}
- Promoted checks: ${report.summary.promotedCheckCount}
- Blocked checks: ${report.summary.blockedCheckCount}
- Next action: ${report.nextAction}
- Credential values included: no
- Local paths included: no
- Raw artifacts included: no
- Raw video included: no

## Candidate Evidence

\`\`\`json
${JSON.stringify(report.candidateEvidence, null, 2)}
\`\`\`

| Check | Key | Proofs | Status |
| --- | --- | ---: | --- |
${renderPromotionRows(report) || '| None | - | 0 | - |'}
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

function readCliOptions(argv: string[], rootDir = resolveProjectRoot()) {
  const optionValue = (name: string, fallback: string | undefined = undefined) => {
    const index = argv.indexOf(name);
    const value = index >= 0 ? argv[index + 1] : undefined;
    return value && !value.startsWith('--') ? value : fallback;
  };
  const paths = resolveExternalEvidencePromotionPaths(rootDir);

  return {
    generatedAt: optionValue('--generated-at'),
    inputPath: optionValue('--input', paths.inputPath) ?? paths.inputPath,
    markdownOutputPath: optionValue('--markdown-output', paths.markdownOutputPath) ?? paths.markdownOutputPath,
    reportOutputPath: optionValue('--json-output', paths.reportOutputPath) ?? paths.reportOutputPath,
    rootDir,
  };
}

export function writeExternalEvidencePromotionReport({
  generatedAt = new Date().toISOString(),
  inputPath = resolveExternalEvidencePromotionPaths().inputPath,
  markdownOutputPath = resolveExternalEvidencePromotionPaths().markdownOutputPath,
  reportOutputPath = resolveExternalEvidencePromotionPaths().reportOutputPath,
  rootDir = resolveProjectRoot(),
}: {
  generatedAt?: string;
  inputPath?: string;
  markdownOutputPath?: string;
  reportOutputPath?: string;
  rootDir?: string;
} = {}) {
  const baselineEvidence = readLaunchEvidence(rootDir);
  let report: ExternalEvidencePromotionReport;

  if (!fs.existsSync(inputPath)) {
    report = buildExternalEvidencePromotionReport({
      baselineEvidence,
      generatedAt,
      validationReport: buildMissingExternalEvidenceValidationReport({
        generatedAt,
        inputPath: relativePath(rootDir, inputPath),
      }),
    });
  } else {
    try {
      const input = ExternalEvidenceFilledIntakeSchema.parse(JSON.parse(fs.readFileSync(inputPath, 'utf8')));
      report = buildExternalEvidencePromotionReport({
        baselineEvidence,
        generatedAt,
        input,
      });
    } catch (error) {
      report = buildExternalEvidencePromotionReport({
        baselineEvidence,
        generatedAt,
        validationReport: invalidValidationReport({
          detail: error instanceof Error ? error.message : 'Filled external evidence intake JSON could not be parsed.',
          generatedAt,
        }),
      });
    }
  }

  writeJson(reportOutputPath, report);
  writeText(markdownOutputPath, renderExternalEvidencePromotionMarkdown(report));

  return {
    markdownOutputPath,
    report,
    reportOutputPath,
  };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const options = readCliOptions(process.argv.slice(2));
  const { markdownOutputPath, report, reportOutputPath } = writeExternalEvidencePromotionReport(options);

  console.log(`Wrote external evidence promotion report to ${reportOutputPath}`);
  console.log(`Wrote external evidence promotion summary to ${markdownOutputPath}`);
  console.log(`Status: ${report.status}; promoted checks: ${report.summary.promotedCheckCount}`);
}
