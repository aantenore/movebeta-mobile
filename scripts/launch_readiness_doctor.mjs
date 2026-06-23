import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { validateCueValidationDataset } from './cue_validation_dataset_checks.mjs';
import { validateNativeQaEvidence } from './native_qa_evidence_checks.mjs';

export const CHECK_DEFINITIONS = {
  androidDebugBuild: {
    action: 'Build or refresh android/app/build/outputs/apk/debug/app-debug.apk.',
    label: 'Android custom debug build',
    owner: 'engineering',
  },
  cueValidationDataset: {
    action: 'Create docs/validation/cue-validation-dataset.json from real consented coach reviews and run the validation gate.',
    label: 'Real cue-validation dataset',
    owner: 'product',
  },
  easCredentials: {
    action: 'Set Expo, App Store Connect, and Google Play submission credentials outside the repository.',
    label: 'Store submission credentials',
    owner: 'release',
  },
  easProject: {
    action: 'Run npx eas-cli@latest init and store extra.eas.projectId in app.json.',
    label: 'EAS project binding',
    owner: 'release',
  },
  iosBuild: {
    action: 'Install full Xcode and verify an iOS simulator or device build.',
    label: 'iOS build verification',
    owner: 'engineering',
  },
  iosPods: {
    action: 'Run npm run native:ios:pods until ios/Pods is populated.',
    label: 'iOS pods install',
    owner: 'engineering',
  },
  modelReadiness: {
    action: 'Run npm run model:movenet:readiness and keep docs/sdlc/movenet-readiness-report.json ready.',
    label: 'MoveNet model readiness',
    owner: 'engineering',
  },
  modelAnalysisReplay: {
    action: 'Run npm run model:analysis:replay and keep docs/sdlc/model-analysis-replay-report.json passing.',
    label: 'Model-analysis replay',
    owner: 'engineering',
  },
  nativeDeviceQa: {
    action: 'Capture docs/sdlc/native-qa-evidence.json from physical iOS and Android runs.',
    label: 'Native device QA evidence',
    owner: 'qa',
  },
  nativeQaRunbook: {
    action: 'Run npm run native:qa:runbook and keep docs/sdlc/native-qa-runbook.json current.',
    label: 'Native QA runbook',
    owner: 'qa',
  },
  privacyManifest: {
    action: 'Generate docs/store/store-manifest.json and keep privacy declarations current.',
    label: 'Privacy declarations',
    owner: 'product',
  },
  releaseGate: {
    action: 'Run npm run release:check and refresh the release readiness report.',
    label: 'Release gate',
    owner: 'engineering',
  },
  storeListing: {
    action: 'Generate store listing copy and screenshots.',
    label: 'Store listing kit',
    owner: 'product',
  },
  webSmoke: {
    action: 'Run npm run web:smoke:report against the exported web bundle.',
    label: 'Web preview smoke',
    owner: 'qa',
  },
};

export const TRACK_REQUIREMENTS = {
  demo: ['releaseGate', 'webSmoke', 'privacyManifest', 'storeListing', 'modelReadiness', 'modelAnalysisReplay'],
  internal: [
    'releaseGate',
    'webSmoke',
    'androidDebugBuild',
    'iosPods',
    'modelReadiness',
    'modelAnalysisReplay',
    'nativeQaRunbook',
    'nativeDeviceQa',
  ],
  store: [
    'releaseGate',
    'webSmoke',
    'privacyManifest',
    'storeListing',
    'modelReadiness',
    'modelAnalysisReplay',
    'iosBuild',
    'nativeQaRunbook',
    'nativeDeviceQa',
    'cueValidationDataset',
    'easProject',
    'easCredentials',
  ],
};

const TRACK_LABELS = {
  demo: 'Stakeholder demo',
  internal: 'Internal native beta',
  store: 'Store submission',
};

function readJsonIfExists(filePath) {
  if (!fs.existsSync(filePath)) return undefined;
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function exists(rootDir, relativePath) {
  return fs.existsSync(path.join(rootDir, relativePath));
}

function validatedJsonFile(rootDir, relativePath, validator) {
  const filePath = path.join(rootDir, relativePath);
  if (!fs.existsSync(filePath)) return false;

  try {
    return validator(JSON.parse(fs.readFileSync(filePath, 'utf8'))).ready === true;
  } catch {
    return false;
  }
}

function requiredScreenshotNames(rootDir) {
  const manifest = readJsonIfExists(path.join(rootDir, 'docs/store/store-manifest.json'));
  const manifestScreenshots = Array.isArray(manifest?.screenshots)
    ? manifest.screenshots.map((item) => item?.fileName).filter((fileName) => typeof fileName === 'string' && fileName.length > 0)
    : [];

  return manifestScreenshots.length > 0
    ? manifestScreenshots
    : ['01-analyze.png', '02-drills.png', '03-progress.png', '04-sessions.png', '05-plan.png', '06-privacy.png'];
}

function hasAllScreenshots(rootDir) {
  return requiredScreenshotNames(rootDir).every((fileName) => exists(rootDir, path.join('docs/store/screenshots', fileName)));
}

function hasAnyEnv(env, keys) {
  return keys.some((key) => typeof env[key] === 'string' && env[key].trim().length > 0);
}

function modelAnalysisReplayReady(report) {
  return (
    report.schemaVersion === 'movebeta.model-analysis-replay-report.v1' &&
    report.status === 'pass' &&
    Array.isArray(report.attempts) &&
    report.attempts.length > 0 &&
    report.attempts.every((attempt) => attempt?.passed === true && attempt?.privacySafe === true) &&
    report.summary?.failedAttempts === 0 &&
    report.summary?.passedAttempts === report.attempts.length
  );
}

function getConfiguredEvidence(rootDir, env = process.env) {
  const appConfig = readJsonIfExists(path.join(rootDir, 'app.json'))?.expo ?? {};
  const extraEvidence = appConfig.extra?.launchReadinessEvidence ?? {};
  const envEvidence = env.EXPO_PUBLIC_MOVEBETA_LAUNCH_READINESS_EVIDENCE
    ? JSON.parse(env.EXPO_PUBLIC_MOVEBETA_LAUNCH_READINESS_EVIDENCE)
    : {};
  return {
    ...extraEvidence,
    ...envEvidence,
  };
}

/**
 * @param {string} rootDir
 * @param {Record<string, string | undefined>} [env]
 */
export function detectLaunchReadinessEvidence(rootDir, env = process.env) {
  const appConfig = readJsonIfExists(path.join(rootDir, 'app.json'))?.expo ?? {};
  const releaseGateReport = readJsonIfExists(path.join(rootDir, 'docs/sdlc/release-gate-report.json')) ?? {};
  const iosToolchainReport = readJsonIfExists(path.join(rootDir, 'docs/sdlc/ios-toolchain-report.json')) ?? {};
  const storeCredentialsReport = readJsonIfExists(path.join(rootDir, 'docs/sdlc/store-credentials-report.json')) ?? {};
  const moveNetReadinessReport = readJsonIfExists(path.join(rootDir, 'docs/sdlc/movenet-readiness-report.json')) ?? {};
  const modelAnalysisReplayReport = readJsonIfExists(path.join(rootDir, 'docs/sdlc/model-analysis-replay-report.json')) ?? {};
  const nativeQaRunbook = readJsonIfExists(path.join(rootDir, 'docs/sdlc/native-qa-runbook.json')) ?? {};
  const webSmokeReport = readJsonIfExists(path.join(rootDir, 'docs/sdlc/web-smoke-report.json')) ?? {};

  return {
    androidDebugBuild: exists(rootDir, 'android/app/build/outputs/apk/debug/app-debug.apk'),
    cueValidationDataset: validatedJsonFile(rootDir, 'docs/validation/cue-validation-dataset.json', validateCueValidationDataset),
    easCredentials:
      storeCredentialsReport.schemaVersion === 'movebeta.store-credentials-report.v1'
        ? storeCredentialsReport.summary?.easCredentialsReady === true
        : hasAnyEnv(env, ['EXPO_TOKEN']) &&
          hasAnyEnv(env, ['MOVEBETA_ASC_APP_ID', 'ASC_API_KEY_ID']) &&
          hasAnyEnv(env, ['GOOGLE_SERVICE_ACCOUNT_JSON', 'GOOGLE_SERVICE_ACCOUNT_KEY_PATH', 'MOVEBETA_GOOGLE_SERVICE_ACCOUNT_JSON_BASE64']),
    easProject:
      storeCredentialsReport.schemaVersion === 'movebeta.store-credentials-report.v1'
        ? storeCredentialsReport.summary?.easProjectReady === true
        : typeof appConfig.extra?.eas?.projectId === 'string' && appConfig.extra.eas.projectId.trim().length > 0,
    iosBuild:
      iosToolchainReport.schemaVersion === 'movebeta.ios-toolchain-report.v1'
        ? iosToolchainReport.status === 'ready'
        : fs.existsSync('/Applications/Xcode.app'),
    iosPods: exists(rootDir, 'ios/Pods/Manifest.lock') && exists(rootDir, 'ios/Pods/Local Podspecs/MoveBetaPose.podspec.json'),
    modelReadiness:
      moveNetReadinessReport.schemaVersion === 'movebeta.movenet-readiness-report.v1' &&
      moveNetReadinessReport.status === 'ready',
    modelAnalysisReplay: modelAnalysisReplayReady(modelAnalysisReplayReport),
    nativeDeviceQa: validatedJsonFile(rootDir, 'docs/sdlc/native-qa-evidence.json', validateNativeQaEvidence),
    nativeQaRunbook: nativeQaRunbook.schemaVersion === 'movebeta.native-qa-runbook.v1',
    privacyManifest: exists(rootDir, 'docs/store/privacy-declarations.md') && exists(rootDir, 'docs/store/store-manifest.json'),
    releaseGate:
      releaseGateReport.schemaVersion === 'movebeta.release-gate-report.v1' &&
      releaseGateReport.status === 'pass' &&
      Array.isArray(releaseGateReport.steps) &&
      releaseGateReport.steps.length >= 10 &&
      releaseGateReport.steps.some((step) => step.key === 'modelAnalysisReplay') &&
      releaseGateReport.steps.some((step) => step.key === 'iosToolchainDoctor') &&
      releaseGateReport.steps.some((step) => step.key === 'cueValidationDatasetDoctor') &&
      releaseGateReport.steps.some((step) => step.key === 'storeCredentialsDoctor') &&
      releaseGateReport.steps.some((step) => step.key === 'webSmokeReport') &&
      releaseGateReport.steps.every((step) => step.status === 'pass'),
    storeListing: exists(rootDir, 'docs/store/store-listing.md') && hasAllScreenshots(rootDir),
    webSmoke:
      exists(rootDir, 'dist/index.html') &&
      webSmokeReport.schemaVersion === 'movebeta.web-smoke-report.v1' &&
      webSmokeReport.status === 'pass' &&
      webSmokeReport.summary?.status === 'pass',
  };
}

function statusForCheck(configured, detected) {
  if (detected) return 'verified';
  if (configured) return 'drift';
  return 'missing';
}

/**
 * @param {{ env?: Record<string, string | undefined>, generatedAt?: string, rootDir?: string }} [options]
 */
export function buildLaunchReadinessDoctorReport({
  env = process.env,
  generatedAt = new Date().toISOString(),
  rootDir,
} = {}) {
  const projectRoot = rootDir ?? path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
  const configuredEvidence = getConfiguredEvidence(projectRoot, env);
  const detectedEvidence = detectLaunchReadinessEvidence(projectRoot, env);
  const checks = Object.entries(CHECK_DEFINITIONS).map(([key, definition]) => {
    const configured = configuredEvidence[key] === true;
    const detected = detectedEvidence[key] === true;
    return {
      ...definition,
      configured,
      detected,
      key,
      status: statusForCheck(configured, detected),
    };
  });
  const checksByKey = Object.fromEntries(checks.map((check) => [check.key, check]));
  const tracks = Object.entries(TRACK_REQUIREMENTS).map(([trackKey, requiredKeys]) => {
    const trackChecks = requiredKeys.map((key) => checksByKey[key]);
    const verifiedChecks = trackChecks.filter((check) => check.status === 'verified').length;
    const driftChecks = trackChecks.filter((check) => check.status === 'drift').length;
    const missingChecks = trackChecks.filter((check) => check.status === 'missing').length;
    return {
      driftChecks,
      key: trackKey,
      label: TRACK_LABELS[trackKey],
      missingChecks,
      requiredChecks: trackChecks.length,
      status: verifiedChecks === trackChecks.length ? 'ready' : driftChecks > 0 ? 'drift' : 'blocked',
      verifiedChecks,
    };
  });
  const firstOpenCheck = checks.find((check) => check.status !== 'verified');

  return {
    checks,
    generatedAt,
    schemaVersion: 'movebeta.launch-readiness-report.v1',
    summary: {
      nextAction: firstOpenCheck?.action ?? 'All launch-readiness checks are verified.',
      readyTracks: tracks.filter((track) => track.status === 'ready').length,
      status: tracks.every((track) => track.status === 'ready')
        ? 'ready'
        : tracks.some((track) => track.status === 'drift')
          ? 'drift'
          : 'blocked',
      totalTracks: tracks.length,
    },
    tracks,
  };
}

/**
 * @param {{ env?: Record<string, string | undefined>, generatedAt?: string, outputPath?: string, rootDir?: string }} [options]
 */
export function writeLaunchReadinessDoctorReport({
  env = process.env,
  generatedAt,
  outputPath,
  rootDir,
} = {}) {
  const projectRoot = rootDir ?? path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
  const report = buildLaunchReadinessDoctorReport({ env, generatedAt, rootDir: projectRoot });
  const targetPath = outputPath ?? path.join(projectRoot, 'docs/sdlc/launch-readiness-report.json');
  fs.mkdirSync(path.dirname(targetPath), { recursive: true });
  fs.writeFileSync(targetPath, `${JSON.stringify(report, null, 2)}\n`);
  return { report, targetPath };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const { report, targetPath } = writeLaunchReadinessDoctorReport();
  console.log(`Wrote launch readiness report to ${targetPath}`);
  console.log(`Status: ${report.summary.status}; ready tracks: ${report.summary.readyTracks}/${report.summary.totalTracks}`);
}
