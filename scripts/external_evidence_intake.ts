import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  buildExternalEvidenceIntakeReport,
  type ExternalEvidenceIntakeReport,
  type ExternalEvidenceIntakeTemplate,
} from '../src/core/externalEvidenceIntake';
import { type LaunchReadinessEvidence } from '../src/core/launchReadiness';

export function resolveProjectRoot() {
  return path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
}

function readJsonIfExists(filePath: string) {
  if (!fs.existsSync(filePath)) return undefined;
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

export function resolveExternalEvidenceIntakePaths(rootDir = resolveProjectRoot()) {
  const sdlcDir = path.join(rootDir, 'docs/sdlc');

  return {
    markdownOutputPath: path.join(sdlcDir, 'external-evidence-intake-report.md'),
    reportOutputPath: path.join(sdlcDir, 'external-evidence-intake-report.json'),
    templateOutputPath: path.join(sdlcDir, 'external-evidence-intake.template.json'),
  };
}

function readLaunchEvidence(appConfigPath: string) {
  const appConfig = readJsonIfExists(appConfigPath);
  return appConfig?.expo?.extra?.launchReadinessEvidence as LaunchReadinessEvidence | undefined;
}

function renderProofRows(template: ExternalEvidenceIntakeTemplate) {
  return template.items
    .flatMap((item) =>
      item.proof.map((proof) => {
        const commands = item.commands.map((command) => `\`${command}\``).join('<br>');
        const accepted = proof.acceptedReferenceTypes.map((type) => `\`${type}\``).join(', ');
        return `| ${item.label} | ${item.owner} | ${item.tracks.join(', ')} | \`${proof.expectedProof}\` | ${accepted} | ${commands} |`;
      }),
    )
    .join('\n');
}

export function renderExternalEvidenceIntakeMarkdown(report: ExternalEvidenceIntakeReport) {
  const proofRows = renderProofRows(report.intakeTemplate);

  return `# External Evidence Intake Report

Generated: ${report.generatedAt}

- Status: ${report.summary.status}
- Intake items: ${report.summary.intakeItemCount}
- Owners: ${report.summary.ownerCount}
- Proof references: ${report.summary.proofReferenceCount}
- Commands: ${report.summary.commandCount}
- Next action: ${report.summary.nextAction}
- Credential values included: no
- Local paths included: no
- Raw artifacts included: no
- Raw video included: no

## Instructions

${report.intakeTemplate.instructions.map((instruction) => `- ${instruction}`).join('\n')}

| Blocker | Owner | Tracks | Expected proof | Accepted references | Commands |
| --- | --- | --- | --- | --- | --- |
${proofRows || '| None | - | - | - | - | - |'}
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

export function writeExternalEvidenceIntake({
  appConfigPath = path.join(resolveProjectRoot(), 'app.json'),
  generatedAt,
  rootDir = resolveProjectRoot(),
}: {
  appConfigPath?: string;
  generatedAt?: string;
  rootDir?: string;
} = {}) {
  const paths = resolveExternalEvidenceIntakePaths(rootDir);
  const report = buildExternalEvidenceIntakeReport({
    evidence: readLaunchEvidence(appConfigPath),
    generatedAt,
  });

  writeJson(paths.reportOutputPath, report);
  writeJson(paths.templateOutputPath, report.intakeTemplate);
  writeText(paths.markdownOutputPath, renderExternalEvidenceIntakeMarkdown(report));

  return {
    paths,
    report,
  };
}

function readCliOptions(argv: string[], rootDir = resolveProjectRoot()) {
  const optionValue = (name: string, fallback: string | undefined = undefined) => {
    const index = argv.indexOf(name);
    const value = index >= 0 ? argv[index + 1] : undefined;
    return value && !value.startsWith('--') ? value : fallback;
  };

  return {
    appConfigPath: optionValue('--app-config', path.join(rootDir, 'app.json')),
    generatedAt: optionValue('--generated-at'),
    rootDir,
  };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const { report, paths } = writeExternalEvidenceIntake(readCliOptions(process.argv.slice(2)));

  console.log(`Wrote external evidence intake report to ${paths.reportOutputPath}`);
  console.log(`Wrote external evidence intake summary to ${paths.markdownOutputPath}`);
  console.log(`Wrote external evidence intake template to ${paths.templateOutputPath}`);
  console.log(`Status: ${report.summary.status}; proof references: ${report.summary.proofReferenceCount}`);
}
