import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  buildExternalEvidenceApplyReport,
  buildExternalEvidencePromotionReport,
  type ExternalEvidenceApplyReport,
  ExternalEvidencePromotionReportSchema,
} from '../src/core/externalEvidenceIntake';
import { LaunchReadinessEvidenceSchema, type LaunchReadinessEvidence } from '../src/core/launchReadiness';

export function resolveProjectRoot() {
  return path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
}

function readJsonIfExists(filePath: string) {
  if (!fs.existsSync(filePath)) return undefined;
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function writeJson(filePath: string, value: unknown) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`);
}

function writeText(filePath: string, value: string) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, value);
}

function relativePath(rootDir: string, filePath: string) {
  return path.relative(rootDir, filePath).replaceAll(path.sep, '/');
}

export function resolveExternalEvidenceApplyPaths(rootDir = resolveProjectRoot()) {
  const sdlcDir = path.join(rootDir, 'docs/sdlc');

  return {
    appConfigPath: path.join(rootDir, 'app.json'),
    markdownOutputPath: path.join(sdlcDir, 'external-evidence-apply-report.md'),
    promotionReportPath: path.join(sdlcDir, 'external-evidence-promotion-report.json'),
    reportOutputPath: path.join(sdlcDir, 'external-evidence-apply-report.json'),
  };
}

export function applyLaunchReadinessEvidenceToAppConfig({
  appConfigPath,
  candidateEvidence,
}: {
  appConfigPath: string;
  candidateEvidence: LaunchReadinessEvidence;
}) {
  const appConfig = readJsonIfExists(appConfigPath);
  if (!appConfig || typeof appConfig !== 'object' || Array.isArray(appConfig)) {
    throw new Error('app.json must contain an object before launch readiness evidence can be applied.');
  }

  const expo = appConfig.expo && typeof appConfig.expo === 'object' && !Array.isArray(appConfig.expo) ? appConfig.expo : {};
  const extra = expo.extra && typeof expo.extra === 'object' && !Array.isArray(expo.extra) ? expo.extra : {};
  const currentEvidence = LaunchReadinessEvidenceSchema.parse(extra.launchReadinessEvidence ?? {});
  const nextAppConfig = {
    ...appConfig,
    expo: {
      ...expo,
      extra: {
        ...extra,
        launchReadinessEvidence: LaunchReadinessEvidenceSchema.parse({
          ...currentEvidence,
          ...candidateEvidence,
        }),
      },
    },
  };

  writeJson(appConfigPath, nextAppConfig);
}

function renderApplyRows(report: ExternalEvidenceApplyReport) {
  return report.sourcePromotion.promotedChecks
    .map((check) => `| ${check.label} | \`${check.key}\` | ${check.proofCount} | ${check.status} |`)
    .join('\n');
}

export function renderExternalEvidenceApplyMarkdown(report: ExternalEvidenceApplyReport) {
  return `# External Evidence Apply Report

Generated: ${report.generatedAt}

- Status: ${report.status}
- Write requested: ${report.summary.writeRequested ? 'yes' : 'no'}
- Applied: ${report.summary.applied ? 'yes' : 'no'}
- Candidate ready: ${report.summary.candidateReady ? 'yes' : 'no'}
- Promoted checks: ${report.summary.promotedCheckCount}
- Applied checks: ${report.summary.appliedCheckCount}
- App config path: ${report.appConfigPath}
- Next action: ${report.nextAction}
- Credential values included: no
- Local paths included: no
- Raw artifacts included: no
- Raw video included: no

## Candidate Evidence

\`\`\`json
${JSON.stringify(report.candidateEvidence, null, 2)}
\`\`\`

| Check | Key | Proofs | Promotion status |
| --- | --- | ---: | --- |
${renderApplyRows(report) || '| None | - | 0 | - |'}
`;
}

function readCliOptions(argv: string[], rootDir = resolveProjectRoot()) {
  const optionValue = (name: string, fallback: string | undefined = undefined) => {
    const index = argv.indexOf(name);
    const value = index >= 0 ? argv[index + 1] : undefined;
    return value && !value.startsWith('--') ? value : fallback;
  };
  const paths = resolveExternalEvidenceApplyPaths(rootDir);

  return {
    appConfigPath: optionValue('--app-config', paths.appConfigPath) ?? paths.appConfigPath,
    generatedAt: optionValue('--generated-at'),
    markdownOutputPath: optionValue('--markdown-output', paths.markdownOutputPath) ?? paths.markdownOutputPath,
    promotionReportPath: optionValue('--promotion-report', paths.promotionReportPath) ?? paths.promotionReportPath,
    reportOutputPath: optionValue('--json-output', paths.reportOutputPath) ?? paths.reportOutputPath,
    rootDir,
    writeAppConfig: argv.includes('--write-app-config'),
  };
}

export function writeExternalEvidenceApplyReport({
  appConfigPath,
  generatedAt = new Date().toISOString(),
  markdownOutputPath,
  promotionReportPath,
  reportOutputPath,
  rootDir = resolveProjectRoot(),
  writeAppConfig = false,
}: {
  appConfigPath?: string;
  generatedAt?: string;
  markdownOutputPath?: string;
  promotionReportPath?: string;
  reportOutputPath?: string;
  rootDir?: string;
  writeAppConfig?: boolean;
} = {}) {
  const paths = resolveExternalEvidenceApplyPaths(rootDir);
  const nextAppConfigPath = appConfigPath ?? paths.appConfigPath;
  const nextMarkdownOutputPath = markdownOutputPath ?? paths.markdownOutputPath;
  const nextPromotionReportPath = promotionReportPath ?? paths.promotionReportPath;
  const nextReportOutputPath = reportOutputPath ?? paths.reportOutputPath;
  const rawPromotion = readJsonIfExists(nextPromotionReportPath);
  const promotionReport = rawPromotion
    ? ExternalEvidencePromotionReportSchema.parse(rawPromotion)
    : buildExternalEvidencePromotionReport({ generatedAt });
  const candidateReady = promotionReport.status === 'ready-to-apply' && promotionReport.summary.candidateReady;
  const shouldApply = writeAppConfig && candidateReady;

  if (shouldApply) {
    applyLaunchReadinessEvidenceToAppConfig({
      appConfigPath: nextAppConfigPath,
      candidateEvidence: promotionReport.candidateEvidence,
    });
  }

  const report = buildExternalEvidenceApplyReport({
    appConfigPath: relativePath(rootDir, nextAppConfigPath),
    applied: shouldApply,
    generatedAt,
    promotionReport,
    writeRequested: writeAppConfig,
  });

  writeJson(nextReportOutputPath, report);
  writeText(nextMarkdownOutputPath, renderExternalEvidenceApplyMarkdown(report));

  return {
    markdownOutputPath: nextMarkdownOutputPath,
    report,
    reportOutputPath: nextReportOutputPath,
  };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const options = readCliOptions(process.argv.slice(2));
  const { markdownOutputPath, report, reportOutputPath } = writeExternalEvidenceApplyReport(options);

  console.log(`Wrote external evidence apply report to ${reportOutputPath}`);
  console.log(`Wrote external evidence apply summary to ${markdownOutputPath}`);
  console.log(`Status: ${report.status}; applied checks: ${report.summary.appliedCheckCount}`);
}
