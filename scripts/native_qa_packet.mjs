import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { nativeQaBudgets } from './native_qa_evidence_checks.mjs';

export const NATIVE_QA_RUNBOOK_SCHEMA_VERSION = 'movebeta.native-qa-runbook.v1';

const workflowLabels = {
  airplaneModeAnalysis: 'Airplane-mode local analysis',
  cameraPermission: 'Camera permission flow',
  deleteReport: 'Report deletion',
  importVideo: 'Video import',
  metadataRead: 'Native video metadata read',
  mutedRecording: 'Muted recording profile',
  recordVideo: 'Record video',
};

const platformLabels = {
  android: 'Android physical device',
  ios: 'iOS physical device',
};

function readJsonIfExists(filePath) {
  if (!fs.existsSync(filePath)) return undefined;
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function evidenceRunDraft(platform, generatedAt) {
  return {
    buildId: 'replace-with-internal-build-id',
    clip: {
      durationMs: 10_000,
      id: `${platform}-real-climbing-clip-id`,
      source: 'camera',
    },
    deviceName: `replace-with-${platform}-device-name`,
    osVersion: `replace-with-${platform}-os-version`,
    performance: {
      analysisMs: null,
      batteryDropPct: null,
      thermalState: null,
    },
    platform,
    provider: 'native-platform-pose',
    recordedAt: generatedAt,
    workflows: Object.fromEntries(nativeQaBudgets.requiredWorkflows.map((workflow) => [workflow, 'pending'])),
    notes: 'Fill with real physical-device evidence. Do not paste raw video paths, faces, account ids, or secrets.',
  };
}

function workflowStep(platform, workflow, index) {
  return {
    expectedEvidence:
      workflow === 'metadataRead'
        ? 'Report or QA notes include native duration and dimensions for camera and import clips.'
        : workflow === 'mutedRecording'
          ? 'Recording completes without microphone permission and without audio capture.'
          : workflow === 'airplaneModeAnalysis'
            ? 'A local camera/import clip produces a report while airplane mode is enabled.'
            : 'Tester marks pass only after the workflow succeeds on the physical device.',
    id: `${platform}-${workflow}`,
    label: workflowLabels[workflow] ?? workflow,
    order: index + 1,
    requiredStatus: 'pass',
  };
}

function performanceStep(platform) {
  return {
    batteryBudgetPct: nativeQaBudgets.maxBatteryDropPct,
    clipLatencyBudgets: nativeQaBudgets.maxLatencyByClipMs,
    id: `${platform}-performance`,
    label: 'Repeated-analysis performance budget',
    requiredThermalStates: nativeQaBudgets.passingThermalStates,
    sampleSize: 'Run at least one camera clip and one imported clip; repeat five analyses when preparing store evidence.',
  };
}

export function buildNativeQaRunbook({
  appVersion = '1.0.0',
  generatedAt = new Date().toISOString(),
  platforms = nativeQaBudgets.requiredPlatforms,
} = {}) {
  const runbooks = platforms.map((platform) => ({
    acceptance: {
      evidenceFile: 'docs/sdlc/native-qa-evidence.json',
      validator: 'npm run native:qa:validate',
    },
    label: platformLabels[platform] ?? platform,
    performance: performanceStep(platform),
    platform,
    setup: [
      'Install a custom native build, not Expo Go.',
      'Use a real climbing clip with consent and no visible bystanders.',
      'Enable airplane mode before the offline-analysis workflow.',
      'Record only pass/fail evidence and aggregate timing; do not store raw video paths in committed docs.',
    ],
    workflows: nativeQaBudgets.requiredWorkflows.map((workflow, index) => workflowStep(platform, workflow, index)),
  }));

  return {
    acceptanceBudgets: nativeQaBudgets,
    appVersion,
    evidenceDraft: {
      appVersion,
      generatedAt,
      runs: platforms.map((platform) => evidenceRunDraft(platform, generatedAt)),
    },
    generatedAt,
    instructions: [
      'Copy evidenceDraft into docs/sdlc/native-qa-evidence.json after replacing every pending/null value with real device results.',
      'Run npm run native:qa:validate and keep the generated evidence local until it contains no raw video identifiers or secrets.',
      'Store submission remains blocked until both android and ios runs pass the validator.',
    ],
    runbooks,
    schemaVersion: NATIVE_QA_RUNBOOK_SCHEMA_VERSION,
  };
}

export function resolveProjectRoot() {
  return path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
}

export function readAppVersion(rootDir = resolveProjectRoot()) {
  return readJsonIfExists(path.join(rootDir, 'app.json'))?.expo?.version ?? '1.0.0';
}

export function writeNativeQaRunbook(runbook, outputPath = path.join(resolveProjectRoot(), 'docs/sdlc/native-qa-runbook.json')) {
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, `${JSON.stringify(runbook, null, 2)}\n`);
  return outputPath;
}

function readCliOptions(argv) {
  const outputIndex = argv.indexOf('--output');
  return {
    generatedAt: argv.includes('--stable-date') ? '2026-06-19T00:00:00.000Z' : undefined,
    outputPath: outputIndex >= 0 ? argv[outputIndex + 1] : path.join(resolveProjectRoot(), 'docs/sdlc/native-qa-runbook.json'),
  };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const options = readCliOptions(process.argv.slice(2));
  const rootDir = resolveProjectRoot();
  const runbook = buildNativeQaRunbook({
    appVersion: readAppVersion(rootDir),
    generatedAt: options.generatedAt,
  });
  const outputPath = writeNativeQaRunbook(runbook, options.outputPath);
  console.log(`Wrote native QA runbook to ${outputPath}`);
  console.log(`Runs: ${runbook.runbooks.length}; workflows per platform: ${nativeQaBudgets.requiredWorkflows.length}`);
}
