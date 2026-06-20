import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { buildModelVerificationSuite, type ModelVerificationSuite } from '../src/core/modelVerificationSuite';

export function resolveProjectRoot() {
  return path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
}

function readJson(filePath: string) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function readJsonIfExists(filePath: string) {
  if (!fs.existsSync(filePath)) return undefined;
  return readJson(filePath);
}

export function resolveDefaultOutputPath(rootDir = resolveProjectRoot()) {
  return path.join(rootDir, 'docs/sdlc/model-verification-suite-report.json');
}

export function resolveDefaultMarkdownOutputPath(rootDir = resolveProjectRoot()) {
  return path.join(rootDir, 'docs/sdlc/model-verification-suite-report.md');
}

function renderMarkdown(report: ModelVerificationSuite) {
  const rows = report.checks
    .map((check) => `| ${check.label} | ${check.status} | ${check.owner} | \`${check.command}\` | ${check.detail} |`)
    .join('\n');

  return `# Model Verification Suite Report

Generated: ${report.generatedAt}

- Status: ${report.status}
- Technical ready: ${report.summary.technicalReady ? 'yes' : 'no'}
- Passed checks: ${report.summary.passedChecks}/${report.summary.totalChecks}
- Blocked checks: ${report.summary.blockedChecks}
- External checks: ${report.summary.externalChecks}
- Providers: ${report.coverage.providers.join(', ') || 'none'}
- Replay attempts: ${report.coverage.replayAttempts.passed}/${report.coverage.replayAttempts.total}
- Wall angles: ${report.coverage.wallAngles.covered.join(', ') || 'none'}
- Metrics: ${report.coverage.metricIds.join(', ') || 'none'}
- Cue outputs: ${report.coverage.cueCount}
- Next action: ${report.summary.nextAction}
- Credential values included: no
- Local paths included: no
- Raw artifacts included: no
- Raw video included: no

| Check | Status | Owner | Command | Detail |
| --- | --- | --- | --- | --- |
${rows}
`;
}

export function writeModelVerificationSuiteReport({
  jsonOutputPath,
  markdownOutputPath,
  report,
}: {
  jsonOutputPath: string;
  markdownOutputPath: string;
  report: ModelVerificationSuite;
}) {
  fs.mkdirSync(path.dirname(jsonOutputPath), { recursive: true });
  fs.mkdirSync(path.dirname(markdownOutputPath), { recursive: true });
  fs.writeFileSync(jsonOutputPath, `${JSON.stringify(report, null, 2)}\n`);
  fs.writeFileSync(markdownOutputPath, renderMarkdown(report));
}

function readCliOptions(argv: string[], rootDir = resolveProjectRoot()) {
  const optionValue = (name: string, fallback: string) => {
    const index = argv.indexOf(name);
    return index >= 0 ? argv[index + 1] : fallback;
  };

  return {
    appConfigPath: optionValue('--app-config', path.join(rootDir, 'app.json')),
    markdownOutputPath: optionValue('--markdown-output', resolveDefaultMarkdownOutputPath(rootDir)),
    modelAnalysisReplayPath: optionValue(
      '--model-analysis-replay',
      path.join(rootDir, 'docs/sdlc/model-analysis-replay-report.json'),
    ),
    moveNetReadinessPath: optionValue('--movenet-readiness', path.join(rootDir, 'docs/sdlc/movenet-readiness-report.json')),
    outputPath: optionValue('--output', resolveDefaultOutputPath(rootDir)),
  };
}

function main() {
  const options = readCliOptions(process.argv.slice(2));
  const appConfig = readJsonIfExists(options.appConfigPath);
  const report = buildModelVerificationSuite({
    modelAnalysisReplayReport: readJson(options.modelAnalysisReplayPath),
    moveNetReadinessReport: readJson(options.moveNetReadinessPath),
    realWorldValidation: appConfig?.expo?.extra?.modelEvidence?.realWorldValidation,
  });

  writeModelVerificationSuiteReport({
    jsonOutputPath: options.outputPath,
    markdownOutputPath: options.markdownOutputPath,
    report,
  });

  console.log(`Wrote model verification suite report to ${options.outputPath}`);
  console.log(`Wrote model verification suite summary to ${options.markdownOutputPath}`);
  console.log(
    `Status: ${report.status}; passed: ${report.summary.passedChecks}/${report.summary.totalChecks}; blocked: ${report.summary.blockedChecks}; external: ${report.summary.externalChecks}`,
  );

  if (report.status === 'blocked') {
    process.exitCode = 1;
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main();
}
