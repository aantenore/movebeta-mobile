import { z } from 'zod';

import { LaunchTrackSchema } from './launchReadiness';

export const releaseEvidenceFreshnessSchemaVersion = 'movebeta.release-evidence-freshness.v1';

const FreshnessStatusSchema = z.enum(['fresh', 'invalid-date', 'missing-date', 'stale']);
const FreshnessOwnerSchema = z.enum(['engineering', 'product', 'qa', 'release']);
const FreshnessPacketStatusSchema = z.enum(['ready', 'review', 'stale']);

export const ReleaseEvidenceFreshnessArtifactInputSchema = z.object({
  generatedAt: z.string().optional(),
  key: z.string().regex(/^[a-z][a-z0-9-]*$/),
  label: z.string().min(1),
  maxAgeHours: z.number().positive(),
  owner: FreshnessOwnerSchema,
  path: z.string().min(1),
  refreshCommand: z.string().min(1),
  requiredFor: z.array(z.union([LaunchTrackSchema, z.literal('handoff')])).min(1),
});

export const ReleaseEvidenceFreshnessArtifactSchema = ReleaseEvidenceFreshnessArtifactInputSchema.extend({
  ageHours: z.number().nonnegative().optional(),
  detail: z.string(),
  status: FreshnessStatusSchema,
});

export const ReleaseEvidenceFreshnessSchema = z.object({
  artifacts: z.array(ReleaseEvidenceFreshnessArtifactSchema).min(1),
  generatedAt: z.string(),
  privacy: z.object({
    credentialValuesIncluded: z.literal(false),
    localPathsIncluded: z.literal(false),
    rawArtifactsIncluded: z.literal(false),
    rawVideoIncluded: z.literal(false),
    tokenLikeValuesIncluded: z.literal(false),
  }),
  schemaVersion: z.literal(releaseEvidenceFreshnessSchemaVersion),
  summary: z.object({
    artifactCount: z.number().int().positive(),
    freshCount: z.number().int().nonnegative(),
    invalidDateCount: z.number().int().nonnegative(),
    maxObservedAgeHours: z.number().nonnegative(),
    missingDateCount: z.number().int().nonnegative(),
    nextAction: z.string(),
    oldestArtifactKey: z.string(),
    staleCount: z.number().int().nonnegative(),
    status: FreshnessPacketStatusSchema,
  }),
});

export type ReleaseEvidenceFreshnessArtifactInput = z.infer<typeof ReleaseEvidenceFreshnessArtifactInputSchema>;
export type ReleaseEvidenceFreshnessArtifact = z.infer<typeof ReleaseEvidenceFreshnessArtifactSchema>;
export type ReleaseEvidenceFreshness = z.infer<typeof ReleaseEvidenceFreshnessSchema>;

export type ReleaseEvidenceFreshnessReportBundle = {
  cueValidationDatasetReport?: unknown;
  dependencyLicenseReport?: unknown;
  envTemplateReport?: unknown;
  featureCompletionReport?: unknown;
  githubWorkflowReport?: unknown;
  iosToolchainReport?: unknown;
  launchReadinessReport?: unknown;
  releaseBlockerIssueFilingPlan?: unknown;
  releaseBlockerIssuesReport?: unknown;
  modelAnalysisReplayReport?: unknown;
  modelVerificationSuiteReport?: unknown;
  moveNetReadinessReport?: unknown;
  storeCredentialsReport?: unknown;
  storeSubmissionPacket?: unknown;
};

type FreshnessConfig = Omit<ReleaseEvidenceFreshnessArtifactInput, 'generatedAt'> & {
  reportKey: keyof ReleaseEvidenceFreshnessReportBundle;
};

const forbiddenFreshnessValuePattern =
  /(file:\/\/|content:\/\/|asset:\/\/|ph:\/\/|\/Users\/|\/private\/|\/var\/mobile\/|[A-Za-z]:\\|\.mov\b|\.mp4\b|BEGIN PRIVATE KEY|ghp_[A-Za-z0-9_]+|github_pat_[A-Za-z0-9_]+|pat_[A-Za-z0-9_]+|sk_live_[A-Za-z0-9_]+|sk_test_[A-Za-z0-9_]+|bearer\s+[A-Za-z0-9._-]+|eyJ[A-Za-z0-9_-]{20,})/i;

const reportConfigs: FreshnessConfig[] = [
  {
    key: 'launch-readiness-report',
    label: 'Launch readiness report',
    maxAgeHours: 24,
    owner: 'release',
    path: 'docs/sdlc/launch-readiness-report.json',
    refreshCommand: 'npm run release:readiness',
    reportKey: 'launchReadinessReport',
    requiredFor: ['demo', 'internal', 'store', 'handoff'],
  },
  {
    key: 'feature-completion-report',
    label: 'Feature completion report',
    maxAgeHours: 24,
    owner: 'engineering',
    path: 'docs/sdlc/feature-completion-report.json',
    refreshCommand: 'npm run feature:doctor',
    reportKey: 'featureCompletionReport',
    requiredFor: ['handoff'],
  },
  {
    key: 'release-blocker-issues-report',
    label: 'Release blocker issues report',
    maxAgeHours: 24,
    owner: 'release',
    path: 'docs/sdlc/release-blocker-issues-report.json',
    refreshCommand: 'npm run release:blocker-issues',
    reportKey: 'releaseBlockerIssuesReport',
    requiredFor: ['handoff'],
  },
  {
    key: 'release-blocker-issue-filing-plan',
    label: 'Release blocker issue filing plan',
    maxAgeHours: 24,
    owner: 'release',
    path: 'docs/sdlc/release-blocker-issue-filing-plan.json',
    refreshCommand: 'npm run release:blocker-issues:file',
    reportKey: 'releaseBlockerIssueFilingPlan',
    requiredFor: ['handoff'],
  },
  {
    key: 'movenet-readiness-report',
    label: 'MoveNet readiness report',
    maxAgeHours: 24,
    owner: 'engineering',
    path: 'docs/sdlc/movenet-readiness-report.json',
    refreshCommand: 'npm run model:movenet:readiness',
    reportKey: 'moveNetReadinessReport',
    requiredFor: ['demo', 'internal', 'store'],
  },
  {
    key: 'model-analysis-replay-report',
    label: 'Model-analysis replay report',
    maxAgeHours: 24,
    owner: 'engineering',
    path: 'docs/sdlc/model-analysis-replay-report.json',
    refreshCommand: 'npm run model:analysis:replay',
    reportKey: 'modelAnalysisReplayReport',
    requiredFor: ['demo', 'internal', 'store'],
  },
  {
    key: 'model-verification-suite-report',
    label: 'Model verification suite report',
    maxAgeHours: 24,
    owner: 'engineering',
    path: 'docs/sdlc/model-verification-suite-report.json',
    refreshCommand: 'npm run model:verification:suite',
    reportKey: 'modelVerificationSuiteReport',
    requiredFor: ['demo', 'internal', 'store', 'handoff'],
  },
  {
    key: 'ios-toolchain-report',
    label: 'iOS toolchain report',
    maxAgeHours: 24,
    owner: 'engineering',
    path: 'docs/sdlc/ios-toolchain-report.json',
    refreshCommand: 'npm run native:ios:doctor',
    reportKey: 'iosToolchainReport',
    requiredFor: ['store'],
  },
  {
    key: 'cue-validation-dataset-report',
    label: 'Cue-validation dataset report',
    maxAgeHours: 24,
    owner: 'product',
    path: 'docs/sdlc/cue-validation-dataset-report.json',
    refreshCommand: 'npm run validation:cue:doctor',
    reportKey: 'cueValidationDatasetReport',
    requiredFor: ['store'],
  },
  {
    key: 'store-credentials-report',
    label: 'Store credentials report',
    maxAgeHours: 24,
    owner: 'release',
    path: 'docs/sdlc/store-credentials-report.json',
    refreshCommand: 'npm run release:credentials:doctor',
    reportKey: 'storeCredentialsReport',
    requiredFor: ['store'],
  },
  {
    key: 'github-workflow-report',
    label: 'GitHub workflow report',
    maxAgeHours: 168,
    owner: 'engineering',
    path: 'docs/sdlc/github-workflow-report.json',
    refreshCommand: 'npm run release:github:doctor',
    reportKey: 'githubWorkflowReport',
    requiredFor: ['handoff'],
  },
  {
    key: 'dependency-license-report',
    label: 'Dependency license report',
    maxAgeHours: 168,
    owner: 'release',
    path: 'docs/sdlc/dependency-license-report.json',
    refreshCommand: 'npm run security:licenses',
    reportKey: 'dependencyLicenseReport',
    requiredFor: ['store', 'handoff'],
  },
  {
    key: 'env-template-report',
    label: 'Environment template report',
    maxAgeHours: 168,
    owner: 'engineering',
    path: 'docs/sdlc/env-template-report.json',
    refreshCommand: 'npm run release:env:doctor',
    reportKey: 'envTemplateReport',
    requiredFor: ['handoff'],
  },
  {
    key: 'store-submission-packet',
    label: 'Store submission packet',
    maxAgeHours: 72,
    owner: 'release',
    path: 'docs/store/store-submission-packet.json',
    refreshCommand: 'npm run store:submission',
    reportKey: 'storeSubmissionPacket',
    requiredFor: ['store', 'handoff'],
  },
];

function containsForbiddenValue(value: unknown): boolean {
  if (typeof value === 'string') return forbiddenFreshnessValuePattern.test(value);
  if (Array.isArray(value)) return value.some(containsForbiddenValue);
  if (value && typeof value === 'object') return Object.values(value).some(containsForbiddenValue);
  return false;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function reportTimestamp(report: unknown) {
  if (!isRecord(report)) return undefined;
  const candidates = [report.generatedAt, report.completedAt, report.startedAt];
  return candidates.find((value): value is string => typeof value === 'string' && value.trim().length > 0);
}

function ageHours(generatedAt: string, now: string) {
  const generatedMs = Date.parse(generatedAt);
  const nowMs = Date.parse(now);
  if (!Number.isFinite(generatedMs) || !Number.isFinite(nowMs)) return undefined;
  return Math.round(Math.max(0, nowMs - generatedMs) / 36_000) / 100;
}

function artifactStatus(input: ReleaseEvidenceFreshnessArtifactInput, now: string): ReleaseEvidenceFreshnessArtifact {
  if (!input.generatedAt) {
    return ReleaseEvidenceFreshnessArtifactSchema.parse({
      ...input,
      detail: `${input.label} does not expose generatedAt, completedAt, or startedAt.`,
      status: 'missing-date',
    });
  }

  const age = ageHours(input.generatedAt, now);
  if (age === undefined) {
    return ReleaseEvidenceFreshnessArtifactSchema.parse({
      ...input,
      detail: `${input.label} has an invalid timestamp: ${input.generatedAt}.`,
      status: 'invalid-date',
    });
  }

  const stale = age > input.maxAgeHours;
  return ReleaseEvidenceFreshnessArtifactSchema.parse({
    ...input,
    ageHours: age,
    detail: stale
      ? `${input.label} is ${age}h old and exceeds the ${input.maxAgeHours}h freshness window.`
      : `${input.label} is ${age}h old and inside the ${input.maxAgeHours}h freshness window.`,
    status: stale ? 'stale' : 'fresh',
  });
}

function nextActionFor(artifacts: ReleaseEvidenceFreshnessArtifact[]) {
  const invalid = artifacts.find((artifact) => artifact.status === 'invalid-date');
  if (invalid) return `Fix the timestamp in ${invalid.path}, then rerun ${invalid.refreshCommand}.`;

  const stale = artifacts.find((artifact) => artifact.status === 'stale');
  if (stale) return `Refresh ${stale.label} with ${stale.refreshCommand}.`;

  const missing = artifacts.find((artifact) => artifact.status === 'missing-date');
  if (missing) return `Add a generated timestamp to ${missing.label} or refresh it with ${missing.refreshCommand}.`;

  return 'All tracked release evidence artifacts are fresh.';
}

function summaryStatus(artifacts: ReleaseEvidenceFreshnessArtifact[]): z.infer<typeof FreshnessPacketStatusSchema> {
  if (artifacts.some((artifact) => artifact.status === 'stale' || artifact.status === 'invalid-date')) return 'stale';
  if (artifacts.some((artifact) => artifact.status === 'missing-date')) return 'review';
  return 'ready';
}

function oldestArtifactKey(artifacts: ReleaseEvidenceFreshnessArtifact[]) {
  return [...artifacts]
    .filter((artifact) => typeof artifact.ageHours === 'number')
    .sort((a, b) => (b.ageHours ?? 0) - (a.ageHours ?? 0))[0]?.key ?? artifacts[0].key;
}

export function buildReleaseEvidenceFreshnessArtifactInputs(
  reports: ReleaseEvidenceFreshnessReportBundle,
  { includeMissing = true }: { includeMissing?: boolean } = {},
): ReleaseEvidenceFreshnessArtifactInput[] {
  return reportConfigs.flatMap((config) => {
    const report = reports[config.reportKey];
    if (!includeMissing && report === undefined) return [];
    return ReleaseEvidenceFreshnessArtifactInputSchema.parse({
      ...config,
      generatedAt: reportTimestamp(report),
    });
  });
}

export function assertReleaseEvidenceFreshnessIsShareSafe(packet: ReleaseEvidenceFreshness) {
  if (containsForbiddenValue(packet)) {
    throw new Error('Release evidence freshness report contains credential values, local paths, raw artifacts, raw video references, or token-like data.');
  }
  return packet;
}

export function buildReleaseEvidenceFreshness({
  artifacts,
  generatedAt = new Date().toISOString(),
  now = generatedAt,
}: {
  artifacts: ReleaseEvidenceFreshnessArtifactInput[];
  generatedAt?: string;
  now?: string;
}): ReleaseEvidenceFreshness {
  const parsedInputs = z.array(ReleaseEvidenceFreshnessArtifactInputSchema).min(1).parse(artifacts);
  const nextArtifacts = parsedInputs.map((artifact) => artifactStatus(artifact, now));
  const freshCount = nextArtifacts.filter((artifact) => artifact.status === 'fresh').length;
  const staleCount = nextArtifacts.filter((artifact) => artifact.status === 'stale').length;
  const invalidDateCount = nextArtifacts.filter((artifact) => artifact.status === 'invalid-date').length;
  const missingDateCount = nextArtifacts.filter((artifact) => artifact.status === 'missing-date').length;
  const packet = ReleaseEvidenceFreshnessSchema.parse({
    artifacts: nextArtifacts,
    generatedAt,
    privacy: {
      credentialValuesIncluded: false,
      localPathsIncluded: false,
      rawArtifactsIncluded: false,
      rawVideoIncluded: false,
      tokenLikeValuesIncluded: false,
    },
    schemaVersion: releaseEvidenceFreshnessSchemaVersion,
    summary: {
      artifactCount: nextArtifacts.length,
      freshCount,
      invalidDateCount,
      maxObservedAgeHours: Math.max(...nextArtifacts.map((artifact) => artifact.ageHours ?? 0)),
      missingDateCount,
      nextAction: nextActionFor(nextArtifacts),
      oldestArtifactKey: oldestArtifactKey(nextArtifacts),
      staleCount,
      status: summaryStatus(nextArtifacts),
    },
  });

  return assertReleaseEvidenceFreshnessIsShareSafe(packet);
}
