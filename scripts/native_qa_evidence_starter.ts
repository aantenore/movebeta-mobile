import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { z } from 'zod';

import {
  buildNativeQaEvidenceComposerExport,
  buildNativeQaEvidenceComposerPreview,
  type NativeQaEvidenceComposerInput,
} from '../src/core/nativeQaEvidenceComposer';
import { nativeQaEvidenceBudgets } from '../src/core/nativeQaEvidenceKit';
import { validateNativeQaEvidenceForApp } from '../src/core/nativeQaEvidenceValidation';

export const nativeQaEvidenceComposerInputSchemaVersion = 'movebeta.native-qa-evidence-composer-input.v1';
export const nativeQaEvidenceStarterReportSchemaVersion = 'movebeta.native-qa-evidence-starter-report.v1';

const ComposerPlatformSchema = z.enum(['android', 'ios']);
const ComposerWorkflowStatusSchema = z.enum(['fail', 'pass', 'pending']);
const ComposerRunSchema = z
  .object({
    allWorkflowsPassed: z.boolean().optional(),
    analysisSeconds: z.union([z.number(), z.string()]).nullable().optional(),
    batteryDropPct: z.union([z.number(), z.string()]).nullable().optional(),
    buildId: z.string().nullable().optional(),
    clipDurationSeconds: z.union([z.number(), z.string()]).nullable().optional(),
    clipId: z.string().nullable().optional(),
    deviceName: z.string().nullable().optional(),
    osVersion: z.string().nullable().optional(),
    platform: ComposerPlatformSchema,
    provider: z.string().nullable().optional(),
    recordedAt: z.string().nullable().optional(),
    source: z.string().nullable().optional(),
    thermalState: z.string().nullable().optional(),
    workflows: z.record(z.string(), ComposerWorkflowStatusSchema).nullable().optional(),
  })
  .passthrough();

export const NativeQaEvidenceComposerInputFileSchema = z
  .object({
    appVersion: z.string().nullable().optional(),
    generatedAt: z.string().nullable().optional(),
    instructions: z.array(z.string()).optional(),
    runs: z.array(ComposerRunSchema).min(1),
    schemaVersion: z.literal(nativeQaEvidenceComposerInputSchemaVersion).optional(),
  })
  .passthrough();

const StarterStatusSchema = z.enum(['needs-device-evidence', 'blocked', 'ready']);

export const NativeQaEvidenceStarterReportSchema = z.object({
  artifacts: z.array(
    z.object({
      label: z.string(),
      path: z.string(),
      purpose: z.string(),
      status: z.enum(['written', 'skipped']),
    }),
  ),
  generatedAt: z.string().datetime(),
  nextAction: z.string(),
  privacy: z.object({
    credentialValuesIncluded: z.literal(false),
    localPathsIncluded: z.literal(false),
    rawArtifactsIncluded: z.literal(false),
    rawVideoIncluded: z.literal(false),
    tokenLikeValuesIncluded: z.literal(false),
  }),
  schemaVersion: z.literal(nativeQaEvidenceStarterReportSchemaVersion),
  sourceInputProvided: z.boolean(),
  status: StarterStatusSchema,
  summary: z.object({
    blockingChecks: z.number().int().nonnegative(),
    candidateEvidenceReady: z.boolean(),
    evidenceWritten: z.boolean(),
    readyRuns: z.number().int().nonnegative(),
    requiredPlatforms: z.array(ComposerPlatformSchema),
    requiredWorkflows: z.array(z.string()),
    totalRuns: z.number().int().nonnegative(),
  }),
});

export type NativeQaEvidenceStarterReport = z.infer<typeof NativeQaEvidenceStarterReportSchema>;

const forbiddenStarterValuePattern =
  /(file:\/\/|content:\/\/|asset:\/\/|ph:\/\/|\/Users\/|\/private\/|\/var\/mobile\/|[A-Za-z]:\\|\.mov\b|\.mp4\b|BEGIN PRIVATE KEY|ghp_[A-Za-z0-9_]+|github_pat_[A-Za-z0-9_]+|pat_[A-Za-z0-9_]+|sk_live_[A-Za-z0-9_]+|sk_test_[A-Za-z0-9_]+|bearer\s+[A-Za-z0-9._-]+|eyJ[A-Za-z0-9_-]{20,})/i;

function containsForbiddenValue(value: unknown): boolean {
  if (typeof value === 'string') return forbiddenStarterValuePattern.test(value);
  if (Array.isArray(value)) return value.some(containsForbiddenValue);
  if (value && typeof value === 'object') return Object.values(value).some(containsForbiddenValue);
  return false;
}

export function resolveProjectRoot() {
  return path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
}

function readJsonIfExists(filePath: string) {
  if (!fs.existsSync(filePath)) return undefined;
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function readAppVersion(rootDir = resolveProjectRoot()) {
  return readJsonIfExists(path.join(rootDir, 'app.json'))?.expo?.version ?? '1.0.0';
}

function relativePath(rootDir: string, filePath: string) {
  return path.relative(rootDir, filePath).replaceAll(path.sep, '/');
}

export function resolveNativeQaEvidenceStarterPaths(rootDir = resolveProjectRoot()) {
  const sdlcDir = path.join(rootDir, 'docs/sdlc');

  return {
    candidateEvidencePath: path.join(sdlcDir, 'native-qa-evidence.candidate.json'),
    composerExportPath: path.join(sdlcDir, 'native-qa-evidence-composer-export.json'),
    evidencePath: path.join(sdlcDir, 'native-qa-evidence.json'),
    inputTemplatePath: path.join(sdlcDir, 'native-qa-evidence-input.template.json'),
    reportJsonPath: path.join(sdlcDir, 'native-qa-evidence-starter-report.json'),
    reportMarkdownPath: path.join(sdlcDir, 'native-qa-evidence-starter-report.md'),
  };
}

export function buildNativeQaEvidenceComposerInputTemplate({
  appVersion = '1.0.0',
}: {
  appVersion?: string;
} = {}) {
  return {
    appVersion,
    generatedAt: 'replace-with-real-run-generated-at-iso',
    instructions: [
      'Replace every placeholder with real Android and iOS physical-device measurements.',
      'Use clip ids, not local video paths, content URIs, raw media names, account ids, credentials, or tokens.',
      'Run npm run native:qa:starter -- --input <filled-template.json> to produce a candidate evidence payload.',
      'Add --write-evidence only after the candidate is ready and should become docs/sdlc/native-qa-evidence.json.',
    ],
    runs: nativeQaEvidenceBudgets.requiredPlatforms.map((platform) => ({
      allWorkflowsPassed: false,
      analysisSeconds: null,
      batteryDropPct: null,
      buildId: 'replace-with-internal-build-id',
      clipDurationSeconds: null,
      clipId: `replace-with-${platform}-consented-clip-id`,
      deviceName: `replace-with-${platform}-physical-device-name`,
      osVersion: `replace-with-${platform}-os-version`,
      platform,
      provider: 'native-platform-pose',
      recordedAt: 'replace-with-real-run-recorded-at-iso',
      source: 'camera',
      thermalState: null,
      workflows: Object.fromEntries(nativeQaEvidenceBudgets.requiredWorkflows.map((workflow) => [workflow, 'pending'])),
    })),
    schemaVersion: nativeQaEvidenceComposerInputSchemaVersion,
  };
}

export function assertNativeQaEvidenceStarterIsShareSafe(value: unknown) {
  if (containsForbiddenValue(value)) {
    throw new Error('Native QA evidence starter contains credential values, local paths, raw artifacts, raw video references, or token-like data.');
  }
}

function nextActionFor({
  evidenceWritten,
  sourceInputProvided,
  status,
}: {
  evidenceWritten: boolean;
  sourceInputProvided: boolean;
  status: z.infer<typeof StarterStatusSchema>;
}) {
  if (evidenceWritten) return 'Run npm run native:qa:validate, then refresh release readiness.';
  if (status === 'ready') {
    return 'Review docs/sdlc/native-qa-evidence.candidate.json, then rerun npm run native:qa:starter -- --input <filled-template.json> --write-evidence.';
  }
  if (sourceInputProvided) {
    return 'Fix the blocked device measurements, keep raw media paths out of the input, then rerun the native QA starter.';
  }
  return 'Fill docs/sdlc/native-qa-evidence-input.template.json with real Android and iOS device measurements, then rerun npm run native:qa:starter -- --input <filled-template.json>.';
}

function artifact(label: string, filePath: string, purpose: string, status: 'written' | 'skipped', rootDir: string) {
  return {
    label,
    path: relativePath(rootDir, filePath),
    purpose,
    status,
  };
}

export function buildNativeQaEvidenceStarterKit({
  appVersion = '1.0.0',
  generatedAt = new Date().toISOString(),
  input,
  rootDir = resolveProjectRoot(),
  writeEvidence = false,
}: {
  appVersion?: string;
  generatedAt?: string;
  input?: unknown;
  rootDir?: string;
  writeEvidence?: boolean;
} = {}) {
  const sourceInputProvided = input !== undefined;
  const template = buildNativeQaEvidenceComposerInputTemplate({ appVersion });
  const parsedInput = sourceInputProvided
    ? NativeQaEvidenceComposerInputFileSchema.parse(input)
    : NativeQaEvidenceComposerInputFileSchema.parse(template);

  assertNativeQaEvidenceStarterIsShareSafe(parsedInput);

  const preview = buildNativeQaEvidenceComposerPreview(parsedInput as NativeQaEvidenceComposerInput);
  const candidateValidation = validateNativeQaEvidenceForApp(preview.payload);
  const candidateReady = candidateValidation.ready;

  if (writeEvidence && !sourceInputProvided) {
    throw new Error('Native QA evidence cannot be written without a real composer input file.');
  }
  if (writeEvidence && !candidateReady) {
    throw new Error('Native QA evidence cannot be written until the composed candidate passes validation.');
  }

  const composerExport = sourceInputProvided
    ? buildNativeQaEvidenceComposerExport({
        generatedAt,
        preview,
      })
    : undefined;

  if (composerExport) assertNativeQaEvidenceStarterIsShareSafe(composerExport);
  assertNativeQaEvidenceStarterIsShareSafe(preview.payload);

  const paths = resolveNativeQaEvidenceStarterPaths(rootDir);
  const status: z.infer<typeof StarterStatusSchema> = !sourceInputProvided
    ? 'needs-device-evidence'
    : candidateReady
      ? 'ready'
      : 'blocked';
  const evidenceWritten = writeEvidence && candidateReady;

  const report = NativeQaEvidenceStarterReportSchema.parse({
    artifacts: [
      artifact('Native QA composer input template', paths.inputTemplatePath, 'Stable fill-in template for real device measurements.', 'written', rootDir),
      artifact(
        'Native QA candidate evidence',
        paths.candidateEvidencePath,
        'Validator-shaped candidate evidence generated from real composer input.',
        sourceInputProvided ? 'written' : 'skipped',
        rootDir,
      ),
      artifact(
        'Native QA composer export',
        paths.composerExportPath,
        'Share-safe export packet with validator summary and privacy flags.',
        sourceInputProvided ? 'written' : 'skipped',
        rootDir,
      ),
      artifact(
        'Native QA release evidence',
        paths.evidencePath,
        'Final validator input used by launch readiness after real device runs pass.',
        evidenceWritten ? 'written' : 'skipped',
        rootDir,
      ),
      artifact('Native QA starter report', paths.reportJsonPath, 'SDLC evidence for the native QA evidence starter command.', 'written', rootDir),
    ],
    generatedAt,
    nextAction: nextActionFor({ evidenceWritten, sourceInputProvided, status }),
    privacy: {
      credentialValuesIncluded: false,
      localPathsIncluded: false,
      rawArtifactsIncluded: false,
      rawVideoIncluded: false,
      tokenLikeValuesIncluded: false,
    },
    schemaVersion: nativeQaEvidenceStarterReportSchemaVersion,
    sourceInputProvided,
    status,
    summary: {
      blockingChecks: preview.blockingChecks,
      candidateEvidenceReady: candidateReady,
      evidenceWritten,
      readyRuns: preview.readyRuns,
      requiredPlatforms: [...nativeQaEvidenceBudgets.requiredPlatforms],
      requiredWorkflows: [...nativeQaEvidenceBudgets.requiredWorkflows],
      totalRuns: preview.totalRuns,
    },
  });

  assertNativeQaEvidenceStarterIsShareSafe(report);

  return {
    composerExport,
    preview,
    report,
    template,
  };
}

export function renderNativeQaEvidenceStarterMarkdown(report: NativeQaEvidenceStarterReport) {
  const rows = report.artifacts
    .map((item) => `| ${item.label} | ${item.status} | \`${item.path}\` | ${item.purpose} |`)
    .join('\n');

  return `# Native QA Evidence Starter Report

Generated: ${report.generatedAt}

- Status: ${report.status}
- Source input provided: ${report.sourceInputProvided ? 'yes' : 'no'}
- Candidate evidence ready: ${report.summary.candidateEvidenceReady ? 'yes' : 'no'}
- Evidence written: ${report.summary.evidenceWritten ? 'yes' : 'no'}
- Ready runs: ${report.summary.readyRuns}/${report.summary.totalRuns}
- Blocking checks: ${report.summary.blockingChecks}
- Required platforms: ${report.summary.requiredPlatforms.join(', ')}
- Required workflows: ${report.summary.requiredWorkflows.length}
- Next action: ${report.nextAction}
- Raw video included: no
- Local paths included: no
- Credential values included: no

| Artifact | Status | Path | Purpose |
| --- | --- | --- | --- |
${rows}
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

export function writeNativeQaEvidenceStarterKit({
  generatedAt,
  inputPath,
  rootDir = resolveProjectRoot(),
  writeEvidence = false,
}: {
  generatedAt?: string;
  inputPath?: string;
  rootDir?: string;
  writeEvidence?: boolean;
} = {}) {
  const appVersion = readAppVersion(rootDir);
  const input = inputPath ? JSON.parse(fs.readFileSync(inputPath, 'utf8')) : undefined;
  const kit = buildNativeQaEvidenceStarterKit({
    appVersion,
    generatedAt,
    input,
    rootDir,
    writeEvidence,
  });
  const paths = resolveNativeQaEvidenceStarterPaths(rootDir);

  writeJson(paths.inputTemplatePath, kit.template);
  if (inputPath) {
    writeJson(paths.candidateEvidencePath, kit.preview.payload);
    if (kit.composerExport) writeJson(paths.composerExportPath, kit.composerExport);
  }
  if (kit.report.summary.evidenceWritten) {
    writeJson(paths.evidencePath, kit.preview.payload);
  }
  writeJson(paths.reportJsonPath, kit.report);
  writeText(paths.reportMarkdownPath, renderNativeQaEvidenceStarterMarkdown(kit.report));

  return { kit, paths };
}

function requireOptionValue(argv: string[], option: string) {
  const index = argv.indexOf(option);
  if (index < 0) return undefined;
  const value = argv[index + 1];
  if (!value || value.startsWith('--')) throw new Error(`${option} requires a value.`);
  return value;
}

function readCliOptions(argv: string[]) {
  const rootDir = resolveProjectRoot();
  const inputValue = requireOptionValue(argv, '--input');
  const generatedAt = requireOptionValue(argv, '--generated-at');

  return {
    generatedAt,
    inputPath: inputValue ? path.resolve(rootDir, inputValue) : undefined,
    rootDir,
    writeEvidence: argv.includes('--write-evidence'),
  };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const { kit, paths } = writeNativeQaEvidenceStarterKit(readCliOptions(process.argv.slice(2)));
  console.log(`Wrote native QA evidence starter report to ${paths.reportJsonPath}`);
  console.log(`Wrote native QA evidence starter summary to ${paths.reportMarkdownPath}`);
  console.log(
    `Status: ${kit.report.status}; candidate ready: ${kit.report.summary.candidateEvidenceReady}; evidence written: ${kit.report.summary.evidenceWritten}`,
  );
}
