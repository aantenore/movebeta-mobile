import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { z } from 'zod';

import {
  assertCueValidationClipIntakeManifestIsPrivacySafe,
  assertCueValidationReviewWorksheetCsvIsPrivacySafe,
  assertCueValidationReviewWorksheetIsPrivacySafe,
  assertCueValidationReviewerOnboardingPacketIsPrivacySafe,
  assertCueValidationStudySeedIsPrivacySafe,
  buildCueValidationClipIntakeManifest,
  buildCueValidationReviewWorksheet,
  buildCueValidationReviewWorksheetCsv,
  buildCueValidationReviewerOnboardingPacket,
  buildCueValidationStudySeed,
  CueValidationStudySeedSchema,
  formatCueValidationClipIntakeManifestSummary,
  formatCueValidationReviewWorksheetSummary,
  formatCueValidationReviewerOnboardingPacketSummary,
  formatCueValidationStudySeedSummary,
  type CueValidationStudySeed,
} from '../src/movement/cueValidationStudy';

export const cueValidationStarterKitSchemaVersion = 'movebeta.cue-validation-starter-kit.v1';

const StarterKitStatusSchema = z.enum(['needs-seed', 'needs-coverage', 'ready-for-review']);

export const CueValidationStarterKitReportSchema = z.object({
  artifacts: z.array(
    z.object({
      label: z.string(),
      path: z.string(),
      purpose: z.string(),
    }),
  ),
  generatedAt: z.string().datetime(),
  nextAction: z.string(),
  privacy: z.object({
    coachPacketsIncluded: z.literal(false),
    credentialValuesIncluded: z.literal(false),
    localPathsIncluded: z.literal(false),
    rawArtifactsIncluded: z.literal(false),
    rawVideoIncluded: z.literal(false),
    reviewerIdentitiesIncluded: z.literal(false),
    reviewerScoresInvented: z.literal(false),
  }),
  schemaVersion: z.literal(cueValidationStarterKitSchemaVersion),
  sourceSeedProvided: z.boolean(),
  status: StarterKitStatusSchema,
  summary: z.object({
    clipCount: z.number().int().nonnegative(),
    cueCount: z.number().int().nonnegative(),
    manifestStatus: z.enum(['needs-consent', 'needs-coverage', 'ready-for-review']),
    missingWallAngles: z.array(z.enum(['slab', 'vertical', 'overhang'])),
    reviewerCount: z.number().int().positive(),
    worksheetRows: z.number().int().nonnegative(),
  }),
});

export type CueValidationStarterKitReport = z.infer<typeof CueValidationStarterKitReportSchema>;

const forbiddenStarterKitValuePattern =
  /(file:\/\/|content:\/\/|asset:\/\/|ph:\/\/|\/Users\/|\/private\/|\/var\/mobile\/|[A-Za-z]:\\|\.mov\b|\.mp4\b|BEGIN PRIVATE KEY|ghp_[A-Za-z0-9_]+|github_pat_[A-Za-z0-9_]+|pat_[A-Za-z0-9_]+|sk_live_[A-Za-z0-9_]+|sk_test_[A-Za-z0-9_]+|bearer\s+[A-Za-z0-9._-]+|eyJ[A-Za-z0-9_-]{20,})/i;

function containsForbiddenValue(value: unknown): boolean {
  if (typeof value === 'string') return forbiddenStarterKitValuePattern.test(value);
  if (Array.isArray(value)) return value.some(containsForbiddenValue);
  if (value && typeof value === 'object') return Object.values(value).some(containsForbiddenValue);
  return false;
}

export function resolveProjectRoot() {
  return path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
}

function relativePath(rootDir: string, filePath: string) {
  return path.relative(rootDir, filePath).replaceAll(path.sep, '/');
}

export function resolveCueValidationStarterKitPaths(rootDir = resolveProjectRoot()) {
  const validationDir = path.join(rootDir, 'docs/validation');
  const sdlcDir = path.join(rootDir, 'docs/sdlc');

  return {
    clipIntakeManifestPath: path.join(validationDir, 'cue-validation-clip-intake-manifest.json'),
    onboardingPath: path.join(validationDir, 'cue-validation-reviewer-onboarding.json'),
    reportJsonPath: path.join(sdlcDir, 'cue-validation-starter-kit-report.json'),
    reportMarkdownPath: path.join(sdlcDir, 'cue-validation-starter-kit-report.md'),
    seedPath: path.join(validationDir, 'cue-validation-study-seed.json'),
    worksheetCsvPath: path.join(validationDir, 'cue-validation-review-worksheet.csv'),
    worksheetJsonPath: path.join(validationDir, 'cue-validation-review-worksheet.json'),
  };
}

function starterStatus(seed: CueValidationStudySeed, manifestStatus: 'needs-consent' | 'needs-coverage' | 'ready-for-review') {
  if (seed.clipCount === 0) return 'needs-seed';
  return manifestStatus === 'ready-for-review' ? 'ready-for-review' : 'needs-coverage';
}

function nextActionFor(status: z.infer<typeof StarterKitStatusSchema>) {
  if (status === 'ready-for-review') {
    return 'Share the blank worksheet with real coach reviewers, collect completed scores, compose the dataset JSON, then run npm run validation:cue.';
  }
  if (status === 'needs-coverage') {
    return 'Collect more consented clips or missing wall angles, export a fresh study seed from Sessions, then rerun npm run validation:cue:starter -- --seed <seed.json>.';
  }
  return 'Export a real cue-validation study seed from Sessions after athlete consent, then rerun npm run validation:cue:starter -- --seed <seed.json>.';
}

export function assertCueValidationStarterKitReportIsShareSafe(report: CueValidationStarterKitReport) {
  if (containsForbiddenValue(report)) {
    throw new Error('Cue validation starter kit report contains credential values, local paths, raw artifacts, raw video references, or token-like data.');
  }
  return report;
}

function assertStarterKitPayloadsAreShareSafe(payloads: unknown[]) {
  if (payloads.some(containsForbiddenValue)) {
    throw new Error('Cue validation starter kit contains credential values, local paths, raw artifacts, raw video references, or token-like data.');
  }
}

export function buildCueValidationStarterKit({
  appVersion = '1.0.0',
  generatedAt = new Date().toISOString(),
  reviewerCount,
  rootDir = resolveProjectRoot(),
  seed,
  sourceSeedProvided = Boolean(seed),
}: {
  appVersion?: string;
  generatedAt?: string;
  reviewerCount?: number;
  rootDir?: string;
  seed?: unknown;
  sourceSeedProvided?: boolean;
} = {}) {
  const parsedSeed = seed === undefined
    ? buildCueValidationStudySeed([], [], { appVersion, generatedAt })
    : CueValidationStudySeedSchema.parse(seed);
  assertCueValidationStudySeedIsPrivacySafe(parsedSeed);

  const nextReviewerCount = reviewerCount ?? parsedSeed.acceptance.minDistinctReviewersPerClip;
  const clipIntakeManifest = buildCueValidationClipIntakeManifest(parsedSeed, {
    generatedAt,
    reviewerCount: nextReviewerCount,
  });
  const onboarding = buildCueValidationReviewerOnboardingPacket(parsedSeed, {
    generatedAt,
    reviewerCount: nextReviewerCount,
  });
  const worksheet = buildCueValidationReviewWorksheet(parsedSeed, {
    generatedAt,
    reviewerCount: nextReviewerCount,
  });
  const worksheetCsv = buildCueValidationReviewWorksheetCsv(worksheet);

  assertCueValidationClipIntakeManifestIsPrivacySafe(clipIntakeManifest);
  assertCueValidationReviewerOnboardingPacketIsPrivacySafe(onboarding);
  assertCueValidationReviewWorksheetIsPrivacySafe(worksheet);
  assertCueValidationReviewWorksheetCsvIsPrivacySafe(worksheetCsv);
  assertStarterKitPayloadsAreShareSafe([parsedSeed, clipIntakeManifest, onboarding, worksheet, worksheetCsv]);

  const paths = resolveCueValidationStarterKitPaths(rootDir);
  const status = starterStatus(parsedSeed, clipIntakeManifest.summary.status);
  const report = CueValidationStarterKitReportSchema.parse({
    artifacts: [
      {
        label: 'Cue-validation study seed',
        path: relativePath(rootDir, paths.seedPath),
        purpose: 'Input contract for packet-only coach review tasks exported from Sessions.',
      },
      {
        label: 'Clip intake manifest',
        path: relativePath(rootDir, paths.clipIntakeManifestPath),
        purpose: 'Coverage and review-row planning without coach packet payloads or raw artifacts.',
      },
      {
        label: 'Reviewer onboarding packet',
        path: relativePath(rootDir, paths.onboardingPath),
        purpose: 'Coach-facing rubric and workflow instructions without identities or scores.',
      },
      {
        label: 'Blank review worksheet JSON',
        path: relativePath(rootDir, paths.worksheetJsonPath),
        purpose: 'Structured blank rows for real coach reviewer IDs and 1-5 scores.',
      },
      {
        label: 'Blank review worksheet CSV',
        path: relativePath(rootDir, paths.worksheetCsvPath),
        purpose: 'Spreadsheet-friendly worksheet with reviewer and score cells left blank.',
      },
    ],
    generatedAt,
    nextAction: nextActionFor(status),
    privacy: {
      coachPacketsIncluded: false,
      credentialValuesIncluded: false,
      localPathsIncluded: false,
      rawArtifactsIncluded: false,
      rawVideoIncluded: false,
      reviewerIdentitiesIncluded: false,
      reviewerScoresInvented: false,
    },
    schemaVersion: cueValidationStarterKitSchemaVersion,
    sourceSeedProvided,
    status,
    summary: {
      clipCount: parsedSeed.clipCount,
      cueCount: parsedSeed.cueCount,
      manifestStatus: clipIntakeManifest.summary.status,
      missingWallAngles: clipIntakeManifest.summary.missingWallAngles,
      reviewerCount: nextReviewerCount,
      worksheetRows: worksheet.rowCount,
    },
  });

  return {
    clipIntakeManifest,
    onboarding,
    report: assertCueValidationStarterKitReportIsShareSafe(report),
    seed: parsedSeed,
    summaries: {
      clipIntakeManifest: formatCueValidationClipIntakeManifestSummary(clipIntakeManifest),
      onboarding: formatCueValidationReviewerOnboardingPacketSummary(onboarding),
      seed: formatCueValidationStudySeedSummary(parsedSeed),
      worksheet: formatCueValidationReviewWorksheetSummary(worksheet),
    },
    worksheet,
    worksheetCsv,
  };
}

export function renderCueValidationStarterKitMarkdown(report: CueValidationStarterKitReport) {
  const rows = report.artifacts
    .map((artifact) => `| ${artifact.label} | \`${artifact.path}\` | ${artifact.purpose} |`)
    .join('\n');

  return `# Cue Validation Starter Kit Report

Generated: ${report.generatedAt}

- Status: ${report.status}
- Source seed provided: ${report.sourceSeedProvided ? 'yes' : 'no'}
- Clips: ${report.summary.clipCount}
- Cues: ${report.summary.cueCount}
- Worksheet rows: ${report.summary.worksheetRows}
- Reviewer slots per cue: ${report.summary.reviewerCount}
- Missing wall angles: ${report.summary.missingWallAngles.join(', ') || 'none'}
- Next action: ${report.nextAction}
- Raw video included: no
- Reviewer identities included: no
- Reviewer scores invented: no

| Artifact | Path | Purpose |
| --- | --- | --- |
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

export function writeCueValidationStarterKit({
  generatedAt,
  reviewerCount,
  rootDir = resolveProjectRoot(),
  seedPath,
}: {
  generatedAt?: string;
  reviewerCount?: number;
  rootDir?: string;
  seedPath?: string;
} = {}) {
  const seed = seedPath ? JSON.parse(fs.readFileSync(seedPath, 'utf8')) : undefined;
  const kit = buildCueValidationStarterKit({
    generatedAt,
    reviewerCount,
    rootDir,
    seed,
    sourceSeedProvided: Boolean(seedPath),
  });
  const paths = resolveCueValidationStarterKitPaths(rootDir);

  writeJson(paths.seedPath, kit.seed);
  writeJson(paths.clipIntakeManifestPath, kit.clipIntakeManifest);
  writeJson(paths.onboardingPath, kit.onboarding);
  writeJson(paths.worksheetJsonPath, kit.worksheet);
  writeText(paths.worksheetCsvPath, kit.worksheetCsv);
  writeJson(paths.reportJsonPath, kit.report);
  writeText(paths.reportMarkdownPath, renderCueValidationStarterKitMarkdown(kit.report));

  return { kit, paths };
}

function readCliOptions(argv: string[]) {
  const seedIndex = argv.indexOf('--seed');
  const reviewersIndex = argv.indexOf('--reviewers');
  const generatedAtIndex = argv.indexOf('--generated-at');
  const rootDir = resolveProjectRoot();
  const seedPath = seedIndex >= 0 ? path.resolve(rootDir, argv[seedIndex + 1] ?? '') : undefined;

  return {
    generatedAt: generatedAtIndex >= 0 ? argv[generatedAtIndex + 1] : undefined,
    reviewerCount: reviewersIndex >= 0 ? Number(argv[reviewersIndex + 1]) : undefined,
    rootDir,
    seedPath,
  };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const { kit, paths } = writeCueValidationStarterKit(readCliOptions(process.argv.slice(2)));
  console.log(`Wrote cue validation starter kit report to ${paths.reportJsonPath}`);
  console.log(`Wrote cue validation starter kit summary to ${paths.reportMarkdownPath}`);
  console.log(`Status: ${kit.report.status}; worksheet rows: ${kit.report.summary.worksheetRows}; source seed: ${kit.report.sourceSeedProvided ? 'provided' : 'empty'}`);
}
