import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { z } from 'zod';

import {
  assertCueValidationStudySeedIsPrivacySafe,
  buildCueValidationCollectionRunbook,
  buildCueValidationDatasetFromCompletedWorksheetCsv,
  buildCueValidationStudySeed,
  buildCueValidationWorksheetPreflight,
  CueValidationStudySeedSchema,
  type CueValidationCollectionRunbook,
  type CueValidationStudySeed,
  type CueValidationWorksheetPreflight,
} from '../src/movement/cueValidationStudy';

export const cueValidationDatasetCompositionPacketSchemaVersion =
  'movebeta.cue-validation-dataset-composition-packet.v1';

const CompositionStatusSchema = z.enum([
  'blocked',
  'dataset-ready',
  'needs-coverage',
  'needs-real-review',
  'needs-seed',
  'ready-to-compose',
  'ready-to-validate',
]);
const SourceSeedStatusSchema = z.enum(['empty', 'invalid', 'missing', 'ready']);
const WorksheetStatusSchema = z.enum(['blocked', 'empty', 'missing', 'ready', 'review']);
const DatasetStatusSchema = z.enum(['blocked', 'missing', 'ready', 'written-needs-validation']);
const ArtifactStatusSchema = z.enum(['blocked', 'external-required', 'missing', 'ready', 'review']);

export const CueValidationDatasetCompositionPacketSchema = z.object({
  artifacts: z.array(
    z.object({
      key: z.string(),
      label: z.string(),
      path: z.string(),
      purpose: z.string(),
      status: ArtifactStatusSchema,
    }),
  ),
  commands: z.array(
    z.object({
      command: z.string(),
      key: z.string(),
      label: z.string(),
      owner: z.enum(['product', 'qa', 'release']),
      purpose: z.string(),
    }),
  ),
  generatedAt: z.string().datetime(),
  nextAction: z.string(),
  phases: z.array(
    z.object({
      action: z.string(),
      detail: z.string(),
      key: z.string(),
      label: z.string(),
      owner: z.enum(['coach', 'product', 'qa']),
      status: z.enum(['blocked', 'ready', 'waiting']),
    }),
  ),
  privacy: z.object({
    coachPacketsIncluded: z.literal(false),
    credentialValuesIncluded: z.literal(false),
    datasetIncluded: z.literal(false),
    localPathsIncluded: z.literal(false),
    rawArtifactsIncluded: z.literal(false),
    rawVideoIncluded: z.literal(false),
    rawWorksheetIncluded: z.literal(false),
    reviewerIdentitiesIncluded: z.literal(false),
    reviewerScoresIncluded: z.literal(false),
    reviewerScoresInvented: z.literal(false),
    tokenLikeValuesIncluded: z.literal(false),
  }),
  schemaVersion: z.literal(cueValidationDatasetCompositionPacketSchemaVersion),
  status: CompositionStatusSchema,
  summary: z.object({
    completeWorksheetRows: z.number().int().nonnegative(),
    datasetFileExists: z.boolean(),
    datasetStatus: DatasetStatusSchema,
    datasetWriteAttempted: z.boolean(),
    distinctReviewerCount: z.number().int().nonnegative(),
    expectedWorksheetRows: z.number().int().nonnegative(),
    invalidScoreCount: z.number().int().nonnegative(),
    missingReviewerIdCount: z.number().int().nonnegative(),
    missingScoreCount: z.number().int().nonnegative(),
    missingWallAngles: z.array(z.enum(['slab', 'vertical', 'overhang'])),
    sourceCueCount: z.number().int().nonnegative(),
    sourceSeedStatus: SourceSeedStatusSchema,
    sourceSeedProvided: z.boolean(),
    sourceClipCount: z.number().int().nonnegative(),
    status: CompositionStatusSchema,
    targetClipCount: z.number().int().positive(),
    worksheetStatus: WorksheetStatusSchema,
  }),
});

export type CueValidationDatasetCompositionPacket = z.infer<typeof CueValidationDatasetCompositionPacketSchema>;

const forbiddenCompositionValuePattern =
  /(file:\/\/|content:\/\/|asset:\/\/|ph:\/\/|\/Users\/|\/private\/|\/var\/mobile\/|[A-Za-z]:\\|\.mov\b|\.mp4\b|BEGIN PRIVATE KEY|ghp_[A-Za-z0-9_]+|github_pat_[A-Za-z0-9_]+|pat_[A-Za-z0-9_]+|sk_live_[A-Za-z0-9_]+|sk_test_[A-Za-z0-9_]+|bearer\s+[A-Za-z0-9._-]+|eyJ[A-Za-z0-9_-]{20,})/i;

function containsForbiddenValue(value: unknown): boolean {
  if (typeof value === 'string') return forbiddenCompositionValuePattern.test(value);
  if (Array.isArray(value)) return value.some(containsForbiddenValue);
  if (value && typeof value === 'object') return Object.values(value).some(containsForbiddenValue);
  return false;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function reportStatus(report: unknown) {
  return isRecord(report) && typeof report.status === 'string' ? report.status : 'missing';
}

export function resolveProjectRoot() {
  return path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
}

function relativePath(rootDir: string, filePath: string) {
  return path.relative(rootDir, filePath).replaceAll(path.sep, '/');
}

export function resolveCueValidationDatasetCompositionPaths(rootDir = resolveProjectRoot()) {
  const validationDir = path.join(rootDir, 'docs/validation');
  const sdlcDir = path.join(rootDir, 'docs/sdlc');

  return {
    datasetPath: path.join(validationDir, 'cue-validation-dataset.json'),
    datasetReportPath: path.join(sdlcDir, 'cue-validation-dataset-report.json'),
    reportJsonPath: path.join(sdlcDir, 'cue-validation-dataset-composition-packet.json'),
    reportMarkdownPath: path.join(sdlcDir, 'cue-validation-dataset-composition-packet.md'),
    seedPath: path.join(validationDir, 'cue-validation-study-seed.json'),
    worksheetCsvPath: path.join(validationDir, 'cue-validation-review-worksheet.csv'),
  };
}

function readJsonIfExists(filePath: string) {
  if (!fs.existsSync(filePath)) return undefined;
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function readTextIfExists(filePath: string) {
  if (!fs.existsSync(filePath)) return undefined;
  return fs.readFileSync(filePath, 'utf8');
}

function emptySeed(generatedAt: string) {
  return buildCueValidationStudySeed([], [], { generatedAt });
}

function parseSeed(value: unknown, generatedAt: string) {
  if (value === undefined) {
    return {
      seed: emptySeed(generatedAt),
      status: 'missing' as const,
    };
  }

  if (containsForbiddenValue(value)) {
    return {
      seed: emptySeed(generatedAt),
      status: 'invalid' as const,
    };
  }

  const parsed = CueValidationStudySeedSchema.safeParse(value);
  if (!parsed.success) {
    return {
      seed: emptySeed(generatedAt),
      status: 'invalid' as const,
    };
  }

  try {
    assertCueValidationStudySeedIsPrivacySafe(parsed.data);
  } catch {
    return {
      seed: emptySeed(generatedAt),
      status: 'invalid' as const,
    };
  }

  return {
    seed: parsed.data,
    status: parsed.data.clipCount > 0 ? ('ready' as const) : ('empty' as const),
  };
}

function worksheetStatus(preflight: CueValidationWorksheetPreflight | undefined, worksheetExists: boolean) {
  if (!worksheetExists) return 'missing';
  return preflight?.summary.status ?? 'missing';
}

function datasetStatus({
  datasetExists,
  datasetReport,
  datasetWritten,
}: {
  datasetExists: boolean;
  datasetReport: unknown;
  datasetWritten: boolean;
}) {
  if (datasetWritten) return 'written-needs-validation';
  if (reportStatus(datasetReport) === 'ready') return 'ready';
  if (datasetExists) return 'blocked';
  return 'missing';
}

function compositionStatus({
  datasetStatus,
  runbook,
  sourceSeedStatus,
}: {
  datasetStatus: z.infer<typeof DatasetStatusSchema>;
  runbook?: CueValidationCollectionRunbook;
  sourceSeedStatus: z.infer<typeof SourceSeedStatusSchema>;
}): z.infer<typeof CompositionStatusSchema> {
  if (datasetStatus === 'ready') return 'dataset-ready';
  if (datasetStatus === 'written-needs-validation') return 'ready-to-validate';
  if (sourceSeedStatus === 'invalid') return 'blocked';
  if (sourceSeedStatus === 'missing' || sourceSeedStatus === 'empty') return 'needs-seed';
  if (!runbook) return 'blocked';
  if (runbook.summary.status === 'ready-for-dataset') return 'ready-to-compose';
  if (runbook.summary.status === 'needs-coverage') return 'needs-coverage';
  if (runbook.summary.status === 'needs-review') return 'needs-real-review';
  if (runbook.summary.status === 'needs-consent') return 'needs-seed';
  return 'blocked';
}

function nextActionFor(status: z.infer<typeof CompositionStatusSchema>, preflight?: CueValidationWorksheetPreflight) {
  if (status === 'dataset-ready') {
    return 'Keep the cue-validation dataset report fresh, then run npm run model:evidence:sync after native QA evidence is also current.';
  }
  if (status === 'ready-to-validate') {
    return 'Run npm run validation:cue and npm run validation:cue:doctor to refresh the validated dataset report.';
  }
  if (status === 'ready-to-compose') {
    return 'Run npm run validation:cue:composition -- --write-dataset, then npm run validation:cue and npm run validation:cue:doctor.';
  }
  if (status === 'needs-real-review') {
    return 'Fill the worksheet with real coach reviewer IDs and 1-5 scores, then rerun npm run validation:cue:composition.';
  }
  if (status === 'needs-coverage') {
    return 'Collect more consented clips for missing wall angles, export a fresh Sessions seed, then rerun npm run validation:cue:starter -- --seed <seed.json>.';
  }
  if (status === 'needs-seed') {
    return 'Export a real cue-validation study seed from Sessions after athlete consent, then rerun npm run validation:cue:starter -- --seed <seed.json>.';
  }
  return preflight?.summary.nextAction ?? 'Fix the cue-validation seed or worksheet input, then rerun npm run validation:cue:composition.';
}

function phaseFallback(status: z.infer<typeof SourceSeedStatusSchema>) {
  const detail =
    status === 'invalid'
      ? 'The seed file is invalid or failed privacy validation.'
      : 'No real consented cue-validation seed is available yet.';
  return [
    {
      action: 'Export a fresh cue-validation study seed from Sessions after athlete consent.',
      detail,
      key: 'collect-consent',
      label: 'Collect consent',
      owner: 'product' as const,
      status: status === 'invalid' ? ('blocked' as const) : ('waiting' as const),
    },
    {
      action: 'Run npm run validation:cue:starter -- --seed <seed.json> after seed export.',
      detail: 'Downstream worksheet and dataset steps depend on a valid seed.',
      key: 'prepare-starter-kit',
      label: 'Prepare starter kit',
      owner: 'product' as const,
      status: 'waiting' as const,
    },
  ];
}

function artifactStatusForWorksheet(status: z.infer<typeof WorksheetStatusSchema>) {
  if (status === 'ready') return 'ready';
  if (status === 'blocked') return 'blocked';
  if (status === 'review' || status === 'empty') return 'external-required';
  return 'missing';
}

function artifactStatusForDataset(status: z.infer<typeof DatasetStatusSchema>) {
  if (status === 'ready' || status === 'written-needs-validation') return 'ready';
  if (status === 'blocked') return 'blocked';
  return 'external-required';
}

function commands() {
  return [
    {
      command: 'npm run validation:cue:starter',
      key: 'cue-validation-starter',
      label: 'Cue-validation starter kit',
      owner: 'product' as const,
      purpose: 'Generate share-safe seed, intake, onboarding, and blank worksheet artifacts from a real Sessions seed.',
    },
    {
      command: 'npm run validation:cue:composition',
      key: 'cue-validation-composition',
      label: 'Cue-validation composition packet',
      owner: 'product' as const,
      purpose: 'Refresh composition readiness without writing a dataset or exposing worksheet contents.',
    },
    {
      command: 'npm run validation:cue:composition -- --write-dataset',
      key: 'cue-validation-compose-dataset',
      label: 'Compose cue-validation dataset',
      owner: 'qa' as const,
      purpose: 'Write the dataset JSON only when the completed worksheet preflight is ready.',
    },
    {
      command: 'npm run validation:cue',
      key: 'cue-validation-gate',
      label: 'Cue-validation gate',
      owner: 'qa' as const,
      purpose: 'Validate the composed dataset before production movement-quality claims.',
    },
    {
      command: 'npm run validation:cue:doctor',
      key: 'cue-validation-dataset-doctor',
      label: 'Cue-validation dataset doctor',
      owner: 'qa' as const,
      purpose: 'Write the share-safe dataset report used by release readiness.',
    },
    {
      command: 'npm run model:evidence:sync',
      key: 'model-evidence-sync',
      label: 'Model evidence sync',
      owner: 'release' as const,
      purpose: 'Promote real-world model evidence only after the cue-validation dataset report is ready.',
    },
  ];
}

export function assertCueValidationDatasetCompositionPacketIsShareSafe(
  packet: CueValidationDatasetCompositionPacket,
) {
  if (containsForbiddenValue(packet)) {
    throw new Error(
      'Cue validation dataset composition packet contains credential values, local paths, raw artifacts, raw worksheet values, raw video references, reviewer identities, reviewer scores, or token-like data.',
    );
  }
  return packet;
}

export function buildCueValidationDatasetCompositionPacket({
  datasetExists,
  datasetReport,
  generatedAt = new Date().toISOString(),
  rootDir = resolveProjectRoot(),
  seed,
  sourceSeedProvided,
  worksheetCsv,
  worksheetExists,
  writeDataset = false,
}: {
  datasetExists?: boolean;
  datasetReport?: unknown;
  generatedAt?: string;
  rootDir?: string;
  seed?: unknown;
  sourceSeedProvided?: boolean;
  worksheetCsv?: string;
  worksheetExists?: boolean;
  writeDataset?: boolean;
} = {}): {
  dataset?: unknown;
  packet: CueValidationDatasetCompositionPacket;
} {
  const paths = resolveCueValidationDatasetCompositionPaths(rootDir);
  const nextSeed = seed ?? readJsonIfExists(paths.seedPath);
  const seedProvided = sourceSeedProvided ?? nextSeed !== undefined;
  const parsedSeed = parseSeed(nextSeed, generatedAt);
  const nextWorksheetCsv = worksheetCsv ?? readTextIfExists(paths.worksheetCsvPath) ?? '';
  const nextWorksheetExists = worksheetExists ?? fs.existsSync(paths.worksheetCsvPath);
  const nextDatasetReport = datasetReport ?? readJsonIfExists(paths.datasetReportPath);
  const datasetFileAlreadyExists = datasetExists ?? fs.existsSync(paths.datasetPath);
  const preflight =
    parsedSeed.status === 'invalid'
      ? undefined
      : buildCueValidationWorksheetPreflight(parsedSeed.seed, nextWorksheetCsv, { generatedAt });
  const runbook =
    parsedSeed.status === 'invalid'
      ? undefined
      : buildCueValidationCollectionRunbook(parsedSeed.seed, {
          completedWorksheetCsv: nextWorksheetCsv,
          generatedAt,
        });
  const nextWorksheetStatus = worksheetStatus(preflight, nextWorksheetExists);
  const canWriteDataset = writeDataset && parsedSeed.status === 'ready' && preflight?.summary.status === 'ready';
  const dataset = canWriteDataset
    ? buildCueValidationDatasetFromCompletedWorksheetCsv(parsedSeed.seed, nextWorksheetCsv, { generatedAt })
    : undefined;
  const nextDatasetStatus = datasetStatus({
    datasetExists: datasetFileAlreadyExists || Boolean(dataset),
    datasetReport: nextDatasetReport,
    datasetWritten: Boolean(dataset),
  });
  const status = compositionStatus({
    datasetStatus: nextDatasetStatus,
    runbook,
    sourceSeedStatus: parsedSeed.status,
  });
  const nextAction = nextActionFor(status, preflight);
  const packet = CueValidationDatasetCompositionPacketSchema.parse({
    artifacts: [
      {
        key: 'cue-validation-study-seed',
        label: 'Cue-validation study seed',
        path: relativePath(rootDir, paths.seedPath),
        purpose: 'Source Sessions seed from real consented local reports.',
        status: parsedSeed.status === 'ready' ? 'ready' : parsedSeed.status === 'invalid' ? 'blocked' : 'external-required',
      },
      {
        key: 'cue-validation-review-worksheet',
        label: 'Cue-validation completed worksheet CSV',
        path: relativePath(rootDir, paths.worksheetCsvPath),
        purpose: 'Completed real coach reviewer IDs and 1-5 score cells; never embedded in this packet.',
        status: artifactStatusForWorksheet(nextWorksheetStatus),
      },
      {
        key: 'cue-validation-composition-packet',
        label: 'Cue-validation composition packet',
        path: relativePath(rootDir, paths.reportJsonPath),
        purpose: 'Share-safe composition readiness report without raw worksheet or reviewer values.',
        status: 'ready',
      },
      {
        key: 'cue-validation-dataset',
        label: 'Cue-validation dataset JSON',
        path: relativePath(rootDir, paths.datasetPath),
        purpose: 'Gate-compatible dataset written only from a ready completed worksheet.',
        status: artifactStatusForDataset(nextDatasetStatus),
      },
      {
        key: 'cue-validation-dataset-report',
        label: 'Cue-validation dataset report',
        path: relativePath(rootDir, paths.datasetReportPath),
        purpose: 'Doctor report proving the composed dataset passed validation checks.',
        status: reportStatus(nextDatasetReport) === 'ready' ? 'ready' : 'external-required',
      },
    ],
    commands: commands(),
    generatedAt,
    nextAction,
    phases: runbook?.phases ?? phaseFallback(parsedSeed.status),
    privacy: {
      coachPacketsIncluded: false,
      credentialValuesIncluded: false,
      datasetIncluded: false,
      localPathsIncluded: false,
      rawArtifactsIncluded: false,
      rawVideoIncluded: false,
      rawWorksheetIncluded: false,
      reviewerIdentitiesIncluded: false,
      reviewerScoresIncluded: false,
      reviewerScoresInvented: false,
      tokenLikeValuesIncluded: false,
    },
    schemaVersion: cueValidationDatasetCompositionPacketSchemaVersion,
    status,
    summary: {
      completeWorksheetRows: preflight?.summary.completeRows ?? 0,
      datasetFileExists: datasetFileAlreadyExists || Boolean(dataset),
      datasetStatus: nextDatasetStatus,
      datasetWriteAttempted: writeDataset,
      distinctReviewerCount: preflight?.summary.distinctReviewerCount ?? 0,
      expectedWorksheetRows: preflight?.summary.expectedRows ?? 0,
      invalidScoreCount: preflight?.summary.invalidScoreCount ?? 0,
      missingReviewerIdCount: preflight?.summary.missingReviewerIdCount ?? 0,
      missingScoreCount: preflight?.summary.missingScoreCount ?? 0,
      missingWallAngles: runbook?.summary.missingWallAngles ?? parsedSeed.seed.acceptance.requiredWallAngles,
      sourceClipCount: parsedSeed.seed.clipCount,
      sourceCueCount: parsedSeed.seed.cueCount,
      sourceSeedProvided: seedProvided,
      sourceSeedStatus: parsedSeed.status,
      status,
      targetClipCount: parsedSeed.seed.acceptance.minClips,
      worksheetStatus: nextWorksheetStatus,
    },
  });

  return {
    dataset,
    packet: assertCueValidationDatasetCompositionPacketIsShareSafe(packet),
  };
}

export function renderCueValidationDatasetCompositionMarkdown(packet: CueValidationDatasetCompositionPacket) {
  const artifactRows = packet.artifacts
    .map((artifact) => `| ${artifact.label} | ${artifact.status} | \`${artifact.path}\` | ${artifact.purpose} |`)
    .join('\n');
  const phaseRows = packet.phases
    .map((phase) => `| ${phase.label} | ${phase.status} | ${phase.owner} | ${phase.detail} | ${phase.action} |`)
    .join('\n');
  const commandRows = packet.commands
    .map((command) => `| ${command.label} | ${command.owner} | \`${command.command}\` | ${command.purpose} |`)
    .join('\n');

  return `# Cue Validation Dataset Composition Packet

Generated: ${packet.generatedAt}

- Status: ${packet.status}
- Source seed: ${packet.summary.sourceSeedStatus}
- Worksheet: ${packet.summary.worksheetStatus}
- Dataset: ${packet.summary.datasetStatus}
- Clips: ${packet.summary.sourceClipCount}/${packet.summary.targetClipCount}
- Worksheet rows: ${packet.summary.completeWorksheetRows}/${packet.summary.expectedWorksheetRows}
- Missing scores: ${packet.summary.missingScoreCount}
- Missing reviewer IDs: ${packet.summary.missingReviewerIdCount}
- Dataset write attempted: ${packet.summary.datasetWriteAttempted ? 'yes' : 'no'}
- Next action: ${packet.nextAction}
- Raw worksheet included: no
- Reviewer identities included: no
- Reviewer scores included: no
- Dataset included: no

## Artifacts

| Artifact | Status | Path | Purpose |
| --- | --- | --- | --- |
${artifactRows}

## Phases

| Phase | Status | Owner | Detail | Action |
| --- | --- | --- | --- | --- |
${phaseRows}

## Commands

| Command | Owner | Value | Purpose |
| --- | --- | --- | --- |
${commandRows}
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

export function writeCueValidationDatasetCompositionPacket({
  datasetPath,
  datasetReportPath,
  generatedAt,
  markdownPath,
  outputPath,
  rootDir = resolveProjectRoot(),
  seedPath,
  worksheetCsvPath,
  writeDataset = false,
}: {
  datasetPath?: string;
  datasetReportPath?: string;
  generatedAt?: string;
  markdownPath?: string;
  outputPath?: string;
  rootDir?: string;
  seedPath?: string;
  worksheetCsvPath?: string;
  writeDataset?: boolean;
} = {}) {
  const paths = resolveCueValidationDatasetCompositionPaths(rootDir);
  const nextSeedPath = seedPath ?? paths.seedPath;
  const nextWorksheetPath = worksheetCsvPath ?? paths.worksheetCsvPath;
  const nextDatasetPath = datasetPath ?? paths.datasetPath;
  const nextDatasetReportPath = datasetReportPath ?? paths.datasetReportPath;
  const jsonTarget = outputPath ?? paths.reportJsonPath;
  const markdownTarget = markdownPath ?? paths.reportMarkdownPath;
  const seed = readJsonIfExists(nextSeedPath);
  const worksheetCsv = readTextIfExists(nextWorksheetPath) ?? '';
  const { dataset, packet } = buildCueValidationDatasetCompositionPacket({
    datasetExists: fs.existsSync(nextDatasetPath),
    datasetReport: readJsonIfExists(nextDatasetReportPath),
    generatedAt,
    rootDir,
    seed,
    sourceSeedProvided: fs.existsSync(nextSeedPath),
    worksheetCsv,
    worksheetExists: fs.existsSync(nextWorksheetPath),
    writeDataset,
  });

  if (dataset) {
    writeJson(nextDatasetPath, dataset);
  }

  writeJson(jsonTarget, packet);
  writeText(markdownTarget, renderCueValidationDatasetCompositionMarkdown(packet));

  return {
    datasetPath: nextDatasetPath,
    jsonPath: jsonTarget,
    markdownPath: markdownTarget,
    packet,
    wroteDataset: Boolean(dataset),
  };
}

function resolveCliPath(rootDir: string, value: string | undefined) {
  if (!value) return undefined;
  return path.isAbsolute(value) ? value : path.resolve(rootDir, value);
}

function readCliOptions(argv: string[]) {
  const rootDir = resolveProjectRoot();
  const options: Parameters<typeof writeCueValidationDatasetCompositionPacket>[0] = {
    rootDir,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--write-dataset') {
      options.writeDataset = true;
      continue;
    }

    const nextValue = argv[index + 1];
    if (!nextValue || nextValue.startsWith('--')) {
      throw new Error(`${arg} requires a value.`);
    }

    if (arg === '--seed') options.seedPath = resolveCliPath(rootDir, nextValue);
    else if (arg === '--worksheet') options.worksheetCsvPath = resolveCliPath(rootDir, nextValue);
    else if (arg === '--dataset') options.datasetPath = resolveCliPath(rootDir, nextValue);
    else if (arg === '--dataset-report') options.datasetReportPath = resolveCliPath(rootDir, nextValue);
    else if (arg === '--output') options.outputPath = resolveCliPath(rootDir, nextValue);
    else if (arg === '--markdown') options.markdownPath = resolveCliPath(rootDir, nextValue);
    else if (arg === '--generated-at') options.generatedAt = nextValue;
    else throw new Error(`Unknown cue-validation composition option: ${arg}`);

    index += 1;
  }

  return options;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  try {
    const { jsonPath, markdownPath, packet, wroteDataset } = writeCueValidationDatasetCompositionPacket(
      readCliOptions(process.argv.slice(2)),
    );
    console.log(`Wrote cue validation dataset composition packet to ${jsonPath}`);
    console.log(`Wrote cue validation dataset composition summary to ${markdownPath}`);
    console.log(`Status: ${packet.status}; worksheet rows: ${packet.summary.completeWorksheetRows}/${packet.summary.expectedWorksheetRows}; dataset written: ${wroteDataset ? 'yes' : 'no'}`);
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  }
}
