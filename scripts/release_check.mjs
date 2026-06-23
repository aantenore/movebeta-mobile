import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { performance } from 'node:perf_hooks';
import { fileURLToPath } from 'node:url';

export const RELEASE_GATE_REPORT_SCHEMA_VERSION = 'movebeta.release-gate-report.v1';

export const releaseGateSteps = [
  { command: ['npm', 'run', 'quality'], key: 'quality', label: 'TypeScript and Vitest quality gate' },
  { command: ['npm', 'run', 'model:movenet:readiness'], key: 'modelReadiness', label: 'MoveNet readiness report' },
  { command: ['npm', 'run', 'model:analysis:replay'], key: 'modelAnalysisReplay', label: 'Model-shaped analysis replay' },
  { command: ['npm', 'run', 'model:verification:suite'], key: 'modelVerificationSuite', label: 'Model verification suite' },
  { command: ['npm', 'run', 'native:qa:runbook'], key: 'nativeQaRunbook', label: 'Native QA runbook generation' },
  { command: ['npm', 'run', 'native:qa:starter'], key: 'nativeQaEvidenceStarter', label: 'Native QA evidence starter' },
  { command: ['npm', 'run', 'native:ios:doctor'], key: 'iosToolchainDoctor', label: 'iOS toolchain doctor' },
  { command: ['npm', 'run', 'validation:cue:starter'], key: 'cueValidationStarterKit', label: 'Cue validation starter kit' },
  { command: ['npm', 'run', 'validation:cue:doctor'], key: 'cueValidationDatasetDoctor', label: 'Cue validation dataset doctor' },
  { command: ['npm', 'run', 'release:env:doctor'], key: 'envTemplateDoctor', label: 'Environment template doctor' },
  { command: ['npm', 'run', 'release:credentials:starter'], key: 'storeCredentialsStarter', label: 'Store credentials starter' },
  { command: ['npm', 'run', 'release:credentials:doctor'], key: 'storeCredentialsDoctor', label: 'Store credentials doctor' },
  { command: ['npm', 'run', 'release:github:doctor'], key: 'githubWorkflowDoctor', label: 'GitHub workflow doctor' },
  { command: ['npm', 'run', 'feature:doctor'], key: 'featureCompletionDoctor', label: 'Feature completion doctor' },
  { command: ['npm', 'run', 'release:blocker-issues'], key: 'releaseBlockerIssues', label: 'Release blocker issue report' },
  { command: ['npm', 'run', 'release:blocker-issues:file'], key: 'releaseBlockerIssueFiling', label: 'Release blocker issue filing plan' },
  { command: ['npm', 'run', 'release:blocker-issues:links'], key: 'releaseBlockerIssueLinks', label: 'Release blocker issue web links' },
  { command: ['npm', 'run', 'release:evidence:intake'], key: 'externalEvidenceIntake', label: 'External evidence intake' },
  { command: ['npm', 'run', 'release:evidence:validate'], key: 'externalEvidenceValidation', label: 'External evidence validation' },
  { command: ['npm', 'run', 'release:evidence:promote'], key: 'externalEvidencePromotion', label: 'External evidence promotion candidate' },
  { command: ['npm', 'run', 'release:evidence:apply'], key: 'externalEvidenceApply', label: 'External evidence apply guard' },
  { command: ['npm', 'run', 'store:submission'], key: 'storeSubmissionPacket', label: 'Store submission packet' },
  { command: ['npm', 'run', 'export:web'], key: 'webExport', label: 'Expo web export' },
  { command: ['npm', 'run', 'model:movenet:assets:check'], key: 'moveNetStaticAssets', label: 'MoveNet static model assets doctor' },
  { command: ['npm', 'run', 'model:assets:provenance'], key: 'modelAssetProvenance', label: 'Model asset provenance doctor' },
  { command: ['npm', 'run', 'model:delivery:lifecycle'], key: 'modelDeliveryLifecycle', label: 'Model delivery lifecycle report' },
  { command: ['npm', 'run', 'web:pwa:check'], key: 'pwaReadiness', label: 'PWA static readiness doctor' },
  { command: ['npm', 'run', 'web:smoke:report'], key: 'webSmokeReport', label: 'Exported web smoke report' },
  { command: ['npm', 'run', 'web:vercel:check'], key: 'vercelDeploymentReadiness', label: 'Vercel deployment readiness doctor' },
  { command: ['npm', 'run', 'web:vercel:workflow'], key: 'vercelWorkflowReadiness', label: 'Vercel workflow readiness doctor' },
  { command: ['npm', 'run', 'release:eas:check'], key: 'easStandard', label: 'EAS standard release check' },
  { command: ['npm', 'run', 'security:audit'], key: 'securityAudit', label: 'Moderate-or-higher dependency audit' },
  { command: ['npm', 'run', 'security:licenses'], key: 'dependencyLicenses', label: 'Dependency license report' },
  { command: ['npm', 'run', 'release:acquisition'], key: 'acquisitionReadinessPacket', label: 'Acquisition readiness packet' },
  { command: ['npm', 'run', 'release:data-room'], key: 'dataRoomIndex', label: 'Data-room index' },
  { command: ['npm', 'run', 'release:freshness:doctor'], key: 'releaseFreshnessDoctor', label: 'Release evidence freshness doctor' },
];

export function resolveProjectRoot() {
  return path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
}

export function resolveDefaultOutputPath(rootDir = resolveProjectRoot()) {
  return path.join(rootDir, 'docs/sdlc/release-gate-report.json');
}

export function buildReleaseGateReport({
  completedAt = new Date().toISOString(),
  startedAt = completedAt,
  steps,
}) {
  const failedSteps = steps.filter((step) => step.status !== 'pass');

  return {
    completedAt,
    schemaVersion: RELEASE_GATE_REPORT_SCHEMA_VERSION,
    startedAt,
    status: failedSteps.length === 0 ? 'pass' : 'fail',
    steps,
  };
}

export function writeReleaseGateReport(report, outputPath = resolveDefaultOutputPath()) {
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, `${JSON.stringify(report, null, 2)}\n`);
  return outputPath;
}

function runStep({ command, key, label }, cwd) {
  const startedAt = new Date().toISOString();
  const started = performance.now();
  const [binary, ...args] = command;

  return new Promise((resolve) => {
    const child = spawn(binary, args, {
      cwd,
      env: process.env,
      stdio: 'inherit',
    });

    child.on('close', (code) => {
      resolve({
        command: command.join(' '),
        completedAt: new Date().toISOString(),
        durationMs: Math.max(0, Math.round(performance.now() - started)),
        exitCode: code,
        key,
        label,
        startedAt,
        status: code === 0 ? 'pass' : 'fail',
      });
    });

    child.on('error', (error) => {
      resolve({
        command: command.join(' '),
        completedAt: new Date().toISOString(),
        detail: error instanceof Error ? error.message : String(error),
        durationMs: Math.max(0, Math.round(performance.now() - started)),
        exitCode: null,
        key,
        label,
        startedAt,
        status: 'fail',
      });
    });
  });
}

async function runReleaseCheck({ outputPath = resolveDefaultOutputPath(), rootDir = resolveProjectRoot() } = {}) {
  const startedAt = new Date().toISOString();
  const steps = [];

  for (const step of releaseGateSteps) {
    const result = await runStep(step, rootDir);
    steps.push(result);
    if (result.status !== 'pass') break;
  }

  const report = buildReleaseGateReport({
    completedAt: new Date().toISOString(),
    startedAt,
    steps,
  });
  const targetPath = writeReleaseGateReport(report, outputPath);

  console.log(`Wrote release gate report to ${targetPath}`);
  console.log(`Status: ${report.status}; passed steps: ${report.steps.filter((step) => step.status === 'pass').length}/${releaseGateSteps.length}`);

  if (report.status !== 'pass') {
    process.exitCode = 1;
  }
}

function readCliOptions(argv) {
  const outputIndex = argv.indexOf('--output');
  return {
    outputPath: outputIndex >= 0 ? argv[outputIndex + 1] : resolveDefaultOutputPath(),
  };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  await runReleaseCheck(readCliOptions(process.argv.slice(2)));
}
