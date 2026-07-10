import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { performance } from 'node:perf_hooks';
import { fileURLToPath } from 'node:url';

export const RELEASE_GATE_REPORT_SCHEMA_VERSION = 'movebeta.release-gate-report.v1';

function reportEvidence({ blocked = [], fail = [], pass, path: reportPath, schemaVersion, statusPath = ['status'] }) {
  return {
    outcomes: { blocked, fail, pass },
    path: reportPath,
    schemaVersion,
    statusPath,
  };
}

export const releaseGateSteps = [
  { command: ['npm', 'run', 'quality'], key: 'quality', label: 'TypeScript and Vitest quality gate' },
  {
    command: ['npm', 'run', 'model:movenet:readiness'],
    evidence: reportEvidence({
      fail: ['degraded'],
      pass: ['ready'],
      path: 'docs/sdlc/movenet-readiness-report.json',
      schemaVersion: 'movebeta.movenet-readiness-report.v1',
    }),
    key: 'modelReadiness',
    label: 'MoveNet readiness report',
  },
  {
    command: ['npm', 'run', 'model:analysis:replay'],
    evidence: reportEvidence({
      fail: ['fail'],
      pass: ['pass'],
      path: 'docs/sdlc/model-analysis-replay-report.json',
      schemaVersion: 'movebeta.model-analysis-replay-report.v1',
    }),
    key: 'modelAnalysisReplay',
    label: 'Model-shaped analysis replay',
  },
  {
    command: ['npm', 'run', 'model:verification:suite'],
    evidence: reportEvidence({
      blocked: ['blocked', 'technical-ready'],
      pass: ['ready'],
      path: 'docs/sdlc/model-verification-suite-report.json',
      schemaVersion: 'movebeta.model-verification-suite-report.v1',
    }),
    key: 'modelVerificationSuite',
    label: 'Model verification suite',
  },
  { command: ['npm', 'run', 'native:qa:runbook'], key: 'nativeQaRunbook', label: 'Native QA runbook generation' },
  { command: ['npm', 'run', 'native:qa:starter'], key: 'nativeQaEvidenceStarter', label: 'Native QA evidence starter' },
  {
    command: ['npm', 'run', 'native:qa:validate'],
    failureStatus: 'blocked',
    key: 'nativeQaEvidenceValidation',
    label: 'Physical-device native QA evidence validation',
  },
  {
    command: ['npm', 'run', 'native:ios:doctor'],
    evidence: reportEvidence({
      blocked: ['blocked', 'review'],
      pass: ['ready'],
      path: 'docs/sdlc/ios-toolchain-report.json',
      schemaVersion: 'movebeta.ios-toolchain-report.v1',
    }),
    key: 'iosToolchainDoctor',
    label: 'iOS toolchain doctor',
  },
  { command: ['npm', 'run', 'native:ios:setup'], key: 'iosToolchainSetupPacket', label: 'iOS toolchain setup packet' },
  { command: ['npm', 'run', 'validation:cue:starter'], key: 'cueValidationStarterKit', label: 'Cue validation starter kit' },
  {
    command: ['npm', 'run', 'validation:cue:doctor'],
    evidence: reportEvidence({
      blocked: ['blocked'],
      pass: ['ready'],
      path: 'docs/sdlc/cue-validation-dataset-report.json',
      schemaVersion: 'movebeta.cue-validation-dataset-report.v1',
    }),
    key: 'cueValidationDatasetDoctor',
    label: 'Cue validation dataset doctor',
  },
  { command: ['npm', 'run', 'validation:cue:composition'], key: 'cueValidationDatasetComposition', label: 'Cue validation dataset composition packet' },
  {
    command: ['npm', 'run', 'release:env:doctor'],
    evidence: reportEvidence({
      blocked: ['blocked'],
      pass: ['ready'],
      path: 'docs/sdlc/env-template-report.json',
      schemaVersion: 'movebeta.env-template-report.v1',
    }),
    key: 'envTemplateDoctor',
    label: 'Environment template doctor',
  },
  { command: ['npm', 'run', 'release:credentials:starter'], key: 'storeCredentialsStarter', label: 'Store credentials starter' },
  {
    command: ['npm', 'run', 'release:credentials:doctor'],
    evidence: reportEvidence({
      blocked: ['blocked'],
      pass: ['ready'],
      path: 'docs/sdlc/store-credentials-report.json',
      schemaVersion: 'movebeta.store-credentials-report.v1',
    }),
    key: 'storeCredentialsDoctor',
    label: 'Store credentials doctor',
  },
  { command: ['npm', 'run', 'release:store-account:runbook'], key: 'storeReleaseAccountRunbook', label: 'Store release account runbook' },
  {
    command: ['npm', 'run', 'release:github:doctor'],
    evidence: reportEvidence({
      blocked: ['blocked', 'review'],
      pass: ['ready'],
      path: 'docs/sdlc/github-workflow-report.json',
      schemaVersion: 'movebeta.github-workflow-report.v1',
    }),
    key: 'githubWorkflowDoctor',
    label: 'GitHub workflow doctor',
  },
  {
    command: ['npm', 'run', 'feature:doctor'],
    evidence: reportEvidence({
      blocked: ['external-blocked'],
      fail: ['internal-gaps'],
      pass: ['ready'],
      path: 'docs/sdlc/feature-completion-report.json',
      schemaVersion: 'movebeta.feature-completion-report.v1',
    }),
    key: 'featureCompletionDoctor',
    label: 'Feature completion doctor',
  },
  { command: ['npm', 'run', 'release:blocker-issues'], key: 'releaseBlockerIssues', label: 'Release blocker issue report' },
  { command: ['npm', 'run', 'release:blocker-progress'], key: 'releaseBlockerProgress', label: 'Release blocker progress tracker' },
  { command: ['npm', 'run', 'release:blocker-issues:file'], key: 'releaseBlockerIssueFiling', label: 'Release blocker issue filing plan' },
  { command: ['npm', 'run', 'release:blocker-issues:links'], key: 'releaseBlockerIssueLinks', label: 'Release blocker issue web links' },
  { command: ['npm', 'run', 'release:evidence:intake'], key: 'externalEvidenceIntake', label: 'External evidence intake' },
  { command: ['npm', 'run', 'release:evidence:validate'], key: 'externalEvidenceValidation', label: 'External evidence validation' },
  { command: ['npm', 'run', 'release:evidence:promote'], key: 'externalEvidencePromotion', label: 'External evidence promotion candidate' },
  { command: ['npm', 'run', 'release:evidence:apply'], key: 'externalEvidenceApply', label: 'External evidence apply guard' },
  { command: ['npm', 'run', 'store:submission'], key: 'storeSubmissionPacket', label: 'Store submission packet' },
  { command: ['npm', 'run', 'export:web'], key: 'webExport', label: 'Expo web export' },
  {
    command: ['npm', 'run', 'model:movenet:assets:check'],
    evidence: reportEvidence({
      blocked: ['blocked'],
      pass: ['ready'],
      path: 'docs/sdlc/movenet-static-assets-report.json',
      schemaVersion: 'movebeta.movenet-static-assets-report.v1',
      statusPath: ['summary', 'status'],
    }),
    key: 'moveNetStaticAssets',
    label: 'MoveNet static model assets doctor',
  },
  {
    command: ['npm', 'run', 'model:assets:provenance'],
    evidence: reportEvidence({
      blocked: ['blocked', 'review'],
      pass: ['ready'],
      path: 'docs/sdlc/model-asset-provenance-report.json',
      schemaVersion: 'movebeta.model-asset-provenance-report.v1',
      statusPath: ['summary', 'status'],
    }),
    key: 'modelAssetProvenance',
    label: 'Model asset provenance doctor',
  },
  { command: ['npm', 'run', 'model:delivery:lifecycle'], key: 'modelDeliveryLifecycle', label: 'Model delivery lifecycle report' },
  { command: ['npm', 'run', 'model:download:plan'], key: 'modelDownloadPlan', label: 'Model download plan report' },
  {
    command: ['npm', 'run', 'web:pwa:check'],
    evidence: reportEvidence({
      blocked: ['blocked'],
      pass: ['ready'],
      path: 'docs/sdlc/pwa-readiness-report.json',
      schemaVersion: 'movebeta.pwa-readiness.v1',
      statusPath: ['summary', 'status'],
    }),
    key: 'pwaReadiness',
    label: 'PWA static readiness doctor',
  },
  {
    command: ['npm', 'run', 'web:smoke:report'],
    evidence: reportEvidence({
      fail: ['fail'],
      pass: ['pass'],
      path: 'docs/sdlc/web-smoke-report.json',
      schemaVersion: 'movebeta.web-smoke-report.v1',
    }),
    key: 'webSmokeReport',
    label: 'Exported web smoke report',
  },
  {
    command: ['npm', 'run', 'web:vercel:check'],
    evidence: reportEvidence({
      blocked: ['blocked', 'static-ready'],
      pass: ['linked'],
      path: 'docs/sdlc/vercel-deployment-report.json',
      schemaVersion: 'movebeta.vercel-deployment-readiness.v1',
      statusPath: ['summary', 'status'],
    }),
    key: 'vercelDeploymentReadiness',
    label: 'Vercel deployment readiness doctor',
  },
  {
    command: ['npm', 'run', 'web:vercel:workflow'],
    evidence: reportEvidence({
      blocked: ['blocked', 'template-ready'],
      pass: ['ready'],
      path: 'docs/sdlc/vercel-workflow-report.json',
      schemaVersion: 'movebeta.vercel-workflow-readiness.v1',
      statusPath: ['summary', 'status'],
    }),
    key: 'vercelWorkflowReadiness',
    label: 'Vercel workflow readiness doctor',
  },
  { command: ['npm', 'run', 'web:vercel:handoff'], key: 'vercelDeploymentHandoff', label: 'Vercel deployment handoff packet' },
  {
    command: ['npm', 'run', 'release:eas:strict'],
    failureStatus: 'blocked',
    key: 'easStandard',
    label: 'EAS strict release check',
  },
  { command: ['npm', 'run', 'security:audit'], key: 'securityAudit', label: 'Moderate-or-higher dependency audit' },
  {
    command: ['npm', 'run', 'security:licenses'],
    evidence: reportEvidence({
      blocked: ['blocked', 'review'],
      pass: ['ready'],
      path: 'docs/sdlc/dependency-license-report.json',
      schemaVersion: 'movebeta.dependency-license-report.v1',
    }),
    key: 'dependencyLicenses',
    label: 'Dependency license report',
  },
  { command: ['npm', 'run', 'release:license-review'], key: 'licenseReviewPacket', label: 'License review packet' },
  { command: ['npm', 'run', 'release:acquisition'], key: 'acquisitionReadinessPacket', label: 'Acquisition readiness packet' },
  { command: ['npm', 'run', 'release:data-room'], key: 'dataRoomIndex', label: 'Data-room index' },
];

export const requiredReleaseEvidence = {
  ci: {
    label: 'Active CI workflow evidence',
    stepKeys: ['githubWorkflowDoctor'],
  },
  native: {
    label: 'Native build and physical-device QA evidence',
    stepKeys: ['nativeQaEvidenceValidation', 'iosToolchainDoctor'],
  },
};

export function resolveProjectRoot() {
  return path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
}

export function resolveDefaultOutputPath(rootDir = resolveProjectRoot()) {
  return path.join(rootDir, 'docs/sdlc/release-gate-report.json');
}

function buildRequiredEvidence(steps) {
  return Object.fromEntries(
    Object.entries(requiredReleaseEvidence).map(([key, requirement]) => {
      const requiredSteps = requirement.stepKeys.map((stepKey) => steps.find((step) => step.key === stepKey));
      const missingStepKeys = requirement.stepKeys.filter((stepKey, index) => !requiredSteps[index]);
      const failedStepKeys = requiredSteps.filter((step) => step?.status === 'fail').map((step) => step.key);
      const blockedStepKeys = requiredSteps.filter((step) => step?.status === 'blocked').map((step) => step.key);
      const status = failedStepKeys.length > 0 ? 'fail' : missingStepKeys.length > 0 || blockedStepKeys.length > 0 ? 'blocked' : 'pass';

      return [
        key,
        {
          blockedStepKeys,
          failedStepKeys,
          label: requirement.label,
          missingStepKeys,
          requiredStepKeys: requirement.stepKeys,
          status,
        },
      ];
    }),
  );
}

export function buildReleaseGateReport({
  completedAt = new Date().toISOString(),
  expectedSteps = releaseGateSteps,
  startedAt = completedAt,
  steps,
}) {
  const expectedStepKeys = expectedSteps.map((step) => step.key);
  const executedStepKeys = new Set(steps.map((step) => step.key));
  const missingStepKeys = expectedStepKeys.filter((key) => !executedStepKeys.has(key));
  const failedSteps = steps.filter((step) => step.status === 'fail');
  const blockedSteps = steps.filter((step) => step.status === 'blocked');
  const invalidSteps = steps.filter((step) => !['blocked', 'fail', 'pass'].includes(step.status));
  const evidence = buildRequiredEvidence(steps);
  const evidenceStatuses = Object.values(evidence).map((item) => item.status);
  const status =
    failedSteps.length > 0 || invalidSteps.length > 0 || evidenceStatuses.includes('fail')
      ? 'fail'
      : blockedSteps.length > 0 || missingStepKeys.length > 0 || evidenceStatuses.includes('blocked')
        ? 'blocked'
        : 'pass';
  const releaseReady = status === 'pass';

  return {
    completedAt,
    evidence,
    releaseReady,
    schemaVersion: RELEASE_GATE_REPORT_SCHEMA_VERSION,
    startedAt,
    status,
    steps,
    summary: {
      blockedStepCount: blockedSteps.length,
      executedStepCount: steps.length,
      expectedStepCount: expectedSteps.length,
      failedStepCount: failedSteps.length + invalidSteps.length,
      missingStepKeys,
      passedStepCount: steps.filter((step) => step.status === 'pass').length,
      releaseReady,
    },
  };
}

export function isReleaseGateReportReady(report) {
  return (
    report?.schemaVersion === RELEASE_GATE_REPORT_SCHEMA_VERSION &&
    report?.status === 'pass' &&
    report?.releaseReady === true &&
    report?.summary?.releaseReady === true &&
    report?.evidence?.native?.status === 'pass' &&
    report?.evidence?.ci?.status === 'pass' &&
    Array.isArray(report?.steps) &&
    report.steps.length > 0 &&
    report.steps.every((step) => step?.status === 'pass')
  );
}

export function writeReleaseGateReport(report, outputPath = resolveDefaultOutputPath()) {
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, `${JSON.stringify(report, null, 2)}\n`);
  return outputPath;
}

function valueAtPath(value, valuePath) {
  return valuePath.reduce((current, key) => current?.[key], value);
}

export function evaluateStepResult({ exitCode, rootDir, step }) {
  if (!step.evidence) {
    const status = exitCode === 0 ? 'pass' : step.failureStatus ?? 'fail';
    return {
      ...(status !== 'pass' ? { detail: `Command exited with code ${String(exitCode)}.` } : {}),
      status,
    };
  }

  const evidencePath = path.join(rootDir, step.evidence.path);
  let report;
  try {
    report = JSON.parse(fs.readFileSync(evidencePath, 'utf8'));
  } catch (error) {
    return {
      detail: `Unable to read authoritative report ${step.evidence.path}: ${error instanceof Error ? error.message : String(error)}`,
      status: 'fail',
    };
  }

  if (report?.schemaVersion !== step.evidence.schemaVersion) {
    return {
      detail: `Authoritative report ${step.evidence.path} has schema ${String(report?.schemaVersion)}; expected ${step.evidence.schemaVersion}.`,
      evidence: {
        path: step.evidence.path,
        schemaVersion: report?.schemaVersion ?? null,
        status: null,
      },
      status: 'fail',
    };
  }

  const reportStatus = valueAtPath(report, step.evidence.statusPath);
  const status = Object.entries(step.evidence.outcomes).find(([, values]) => values.includes(reportStatus))?.[0];
  const evidence = {
    path: step.evidence.path,
    schemaVersion: report.schemaVersion,
    status: typeof reportStatus === 'string' ? reportStatus : null,
    statusPath: step.evidence.statusPath.join('.'),
  };

  if (!status) {
    return {
      detail: `Authoritative report ${step.evidence.path} has unsupported status ${String(reportStatus)}.`,
      evidence,
      status: 'fail',
    };
  }

  if (status === 'pass' && exitCode !== 0) {
    return {
      detail: `Authoritative report passed, but the command exited with code ${String(exitCode)}.`,
      evidence,
      status: 'fail',
    };
  }

  return {
    ...(status !== 'pass' ? { detail: `Authoritative report status is ${String(reportStatus)}.` } : {}),
    evidence,
    status,
  };
}

function runStep(step, cwd) {
  const startedAt = new Date().toISOString();
  const started = performance.now();
  const [binary, ...args] = step.command;

  return new Promise((resolve) => {
    const child = spawn(binary, args, {
      cwd,
      env: process.env,
      stdio: 'inherit',
    });

    child.on('close', (code) => {
      const outcome = evaluateStepResult({ exitCode: code, rootDir: cwd, step });
      resolve({
        command: step.command.join(' '),
        completedAt: new Date().toISOString(),
        durationMs: Math.max(0, Math.round(performance.now() - started)),
        exitCode: code,
        key: step.key,
        label: step.label,
        startedAt,
        ...outcome,
      });
    });

    child.on('error', (error) => {
      resolve({
        command: step.command.join(' '),
        completedAt: new Date().toISOString(),
        detail: error instanceof Error ? error.message : String(error),
        durationMs: Math.max(0, Math.round(performance.now() - started)),
        exitCode: null,
        key: step.key,
        label: step.label,
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
    if (result.status === 'fail') break;
  }

  const report = buildReleaseGateReport({
    completedAt: new Date().toISOString(),
    startedAt,
    steps,
  });
  const targetPath = writeReleaseGateReport(report, outputPath);

  console.log(`Wrote release gate report to ${targetPath}`);
  console.log(
    `Status: ${report.status}; ready: ${report.releaseReady ? 'yes' : 'no'}; passed: ${report.summary.passedStepCount}; blocked: ${report.summary.blockedStepCount}; failed: ${report.summary.failedStepCount}; executed: ${report.summary.executedStepCount}/${report.summary.expectedStepCount}`,
  );

  if (!report.releaseReady) {
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
