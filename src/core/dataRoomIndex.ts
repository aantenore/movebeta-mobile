import { z } from 'zod';

export const dataRoomIndexSchemaVersion = 'movebeta.data-room-index.v1';

const DataRoomCategorySchema = z.enum([
  'archive',
  'commercial',
  'distribution',
  'legal',
  'model',
  'native',
  'product',
  'release',
  'security',
  'validation',
]);
const DataRoomOwnerSchema = z.enum(['founder', 'product', 'engineering', 'qa', 'release']);
const DataRoomStatusSchema = z.enum(['ready', 'review', 'external-required', 'missing', 'blocked']);
const DataRoomSensitivitySchema = z.enum([
  'credential-names-only',
  'external-proof-reference',
  'public-store-copy',
  'share-safe',
  'source-archive',
]);

const DataRoomItemSchema = z.object({
  category: DataRoomCategorySchema,
  key: z.string(),
  label: z.string(),
  location: z.string(),
  owner: DataRoomOwnerSchema,
  purpose: z.string(),
  refreshCommand: z.string(),
  sensitivity: DataRoomSensitivitySchema,
  status: DataRoomStatusSchema,
});

const DataRoomCommandSchema = z.object({
  command: z.string(),
  key: z.string(),
  label: z.string(),
  owner: DataRoomOwnerSchema,
  purpose: z.string(),
});

export const DataRoomIndexSchema = z.object({
  commands: z.array(DataRoomCommandSchema),
  generatedAt: z.string(),
  items: z.array(DataRoomItemSchema),
  privacy: z.object({
    credentialValuesIncluded: z.literal(false),
    localPathsIncluded: z.literal(false),
    paymentDataIncluded: z.literal(false),
    rawArtifactsIncluded: z.literal(false),
    rawVideoIncluded: z.literal(false),
    secretsIncluded: z.literal(false),
    tokenLikeValuesIncluded: z.literal(false),
  }),
  schemaVersion: z.literal(dataRoomIndexSchemaVersion),
  summary: z.object({
    blockedCount: z.number().int().nonnegative(),
    externalRequiredCount: z.number().int().nonnegative(),
    itemCount: z.number().int().positive(),
    missingCount: z.number().int().nonnegative(),
    nextAction: z.string(),
    readyCount: z.number().int().nonnegative(),
    reviewCount: z.number().int().nonnegative(),
    status: z.enum(['ready', 'needs-external-evidence', 'blocked']),
  }),
});

export type DataRoomIndex = z.infer<typeof DataRoomIndexSchema>;
export type DataRoomIndexItem = z.infer<typeof DataRoomItemSchema>;

type DataRoomSeed = Omit<DataRoomIndexItem, 'status'> & {
  blockedStatuses?: string[];
  externalStatuses?: string[];
  readyStatuses?: string[];
  reportKey?: keyof DataRoomReportBundle;
  reviewStatuses?: string[];
};

export type DataRoomReportBundle = {
  acquisitionReadinessPacket?: unknown;
  cueValidationDatasetReport?: unknown;
  dependencyLicenseReport?: unknown;
  externalEvidenceIntakeReport?: unknown;
  featureCompletionReport?: unknown;
  githubWorkflowReport?: unknown;
  iosToolchainReport?: unknown;
  launchReadinessReport?: unknown;
  licenseReviewPacket?: unknown;
  modelAssetProvenanceReport?: unknown;
  modelDeliveryLifecycleReport?: unknown;
  modelVerificationSuiteReport?: unknown;
  moveNetReadinessReport?: unknown;
  nativeQaEvidenceStarterReport?: unknown;
  pwaReadinessReport?: unknown;
  releaseBlockerIssueWebLinks?: unknown;
  releaseBlockerProgressReport?: unknown;
  releaseFreshnessReport?: unknown;
  releaseGateReport?: unknown;
  releaseHandoffPacket?: unknown;
  storeReleaseAccountRunbook?: unknown;
  storeCredentialsSetupPacket?: unknown;
  storeSubmissionPacket?: unknown;
  vercelDeploymentHandoff?: unknown;
  vercelDeploymentReport?: unknown;
  vercelWorkflowReport?: unknown;
  webSmokeReport?: unknown;
};

export type DataRoomIndexInput = {
  artifactAvailability?: Record<string, boolean>;
  generatedAt?: string;
  reports?: DataRoomReportBundle;
};

const forbiddenDataRoomValuePattern =
  /(file:\/\/|content:\/\/|asset:\/\/|ph:\/\/|\/Users\/|\/private\/|\/var\/mobile\/|[A-Za-z]:\\|\.mov\b|\.mp4\b|BEGIN PRIVATE KEY|ghp_[A-Za-z0-9_]+|github_pat_[A-Za-z0-9_]+|pat_[A-Za-z0-9_]+|sk_live_[A-Za-z0-9_]+|sk_test_[A-Za-z0-9_]+|bearer\s+[A-Za-z0-9._-]+|eyJ[A-Za-z0-9_-]{20,})/i;

function containsForbiddenDataRoomValue(value: unknown): boolean {
  if (typeof value === 'string') return forbiddenDataRoomValuePattern.test(value);
  if (Array.isArray(value)) return value.some(containsForbiddenDataRoomValue);
  if (value && typeof value === 'object') return Object.values(value).some(containsForbiddenDataRoomValue);
  return false;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function record(value: unknown): Record<string, unknown> {
  return isRecord(value) ? value : {};
}

function nestedRecord(value: unknown, key: string): Record<string, unknown> {
  const next = record(value)[key];
  return isRecord(next) ? next : {};
}

function text(value: unknown, fallback = 'unknown') {
  return typeof value === 'string' && value.trim().length > 0 ? value : fallback;
}

function reportStatus(report: unknown, fallback = 'unknown') {
  return text(record(report).status ?? nestedRecord(report, 'summary').status, fallback);
}

const dataRoomSeeds: DataRoomSeed[] = [
  {
    category: 'release',
    key: 'release-gate-report',
    label: 'Release gate report',
    location: 'docs/sdlc/release-gate-report.json',
    owner: 'engineering',
    purpose: 'Automated quality, model, web, security, and release evidence gate.',
    readyStatuses: ['pass'],
    refreshCommand: 'npm run release:check',
    reportKey: 'releaseGateReport',
    sensitivity: 'share-safe',
  },
  {
    category: 'release',
    externalStatuses: ['blocked', 'drift'],
    key: 'launch-readiness-report',
    label: 'Launch readiness report',
    location: 'docs/sdlc/launch-readiness-report.json',
    owner: 'release',
    purpose: 'Current demo, internal beta, and store readiness state.',
    readyStatuses: ['ready'],
    refreshCommand: 'npm run release:readiness',
    reportKey: 'launchReadinessReport',
    sensitivity: 'share-safe',
  },
  {
    category: 'product',
    externalStatuses: ['external-blocked'],
    key: 'feature-completion-report',
    label: 'Feature completion report',
    location: 'docs/sdlc/feature-completion-report.json',
    owner: 'product',
    purpose: 'Tracked task, backlog, and traceability completion evidence.',
    readyStatuses: ['ready'],
    refreshCommand: 'npm run feature:doctor',
    reportKey: 'featureCompletionReport',
    sensitivity: 'share-safe',
  },
  {
    category: 'release',
    externalStatuses: ['needs-external-clearance'],
    key: 'acquisition-readiness-packet',
    label: 'Acquisition readiness packet',
    location: 'docs/sdlc/acquisition-readiness-packet.json',
    owner: 'founder',
    purpose: 'Buyer due-diligence summary across product, technical, commercial, model, and handoff signals.',
    readyStatuses: ['ready'],
    refreshCommand: 'npm run release:acquisition',
    reportKey: 'acquisitionReadinessPacket',
    sensitivity: 'share-safe',
  },
  {
    category: 'release',
    key: 'release-handoff-packet',
    label: 'Release handoff packet',
    location: 'docs/sdlc/release-handoff-packet.json',
    owner: 'release',
    purpose: 'Repository, commit, screenshots, blockers, artifacts, and verification commands for handoff.',
    refreshCommand: 'npm run release:handoff',
    reportKey: 'releaseHandoffPacket',
    sensitivity: 'share-safe',
  },
  {
    category: 'release',
    key: 'release-freshness-report',
    label: 'Release freshness report',
    location: 'docs/sdlc/release-freshness-report.json',
    owner: 'release',
    purpose: 'Freshness windows for generated release evidence.',
    readyStatuses: ['ready'],
    refreshCommand: 'npm run release:freshness:doctor',
    reportKey: 'releaseFreshnessReport',
    sensitivity: 'share-safe',
  },
  {
    category: 'release',
    key: 'release-blocker-web-links',
    label: 'Release blocker web links',
    location: 'docs/sdlc/release-blocker-issue-web-links.json',
    owner: 'release',
    purpose: 'Prefilled issue links for external blockers without mutating GitHub automatically.',
    readyStatuses: ['ready'],
    refreshCommand: 'npm run release:blocker-issues:links',
    reportKey: 'releaseBlockerIssueWebLinks',
    sensitivity: 'share-safe',
  },
  {
    category: 'release',
    key: 'release-blocker-progress',
    label: 'Release blocker progress',
    location: 'docs/sdlc/release-blocker-progress.json',
    owner: 'release',
    purpose: 'Aggregated external blocker progress with dependencies, proof counts, owners, and current commands.',
    externalStatuses: ['needs-external-evidence'],
    readyStatuses: ['ready'],
    refreshCommand: 'npm run release:blocker-progress',
    reportKey: 'releaseBlockerProgressReport',
    sensitivity: 'share-safe',
  },
  {
    category: 'release',
    externalStatuses: ['needs-evidence'],
    key: 'external-evidence-intake',
    label: 'External evidence intake',
    location: 'docs/sdlc/external-evidence-intake-report.json',
    owner: 'release',
    purpose: 'Proof-reference template for blockers that require accounts, devices, or real validation data.',
    readyStatuses: ['ready'],
    refreshCommand: 'npm run release:evidence:intake',
    reportKey: 'externalEvidenceIntakeReport',
    sensitivity: 'external-proof-reference',
  },
  {
    category: 'model',
    key: 'movenet-readiness-report',
    label: 'MoveNet readiness report',
    location: 'docs/sdlc/movenet-readiness-report.json',
    owner: 'engineering',
    purpose: 'Local model load and inference budget evidence.',
    readyStatuses: ['ready'],
    refreshCommand: 'npm run model:movenet:readiness',
    reportKey: 'moveNetReadinessReport',
    sensitivity: 'share-safe',
  },
  {
    category: 'model',
    key: 'model-verification-suite',
    label: 'Model verification suite',
    location: 'docs/sdlc/model-verification-suite-report.json',
    owner: 'engineering',
    purpose: 'Aggregated model execution, replay, provider, and real-validation readiness checks.',
    readyStatuses: ['technical-ready'],
    refreshCommand: 'npm run model:verification:suite',
    reportKey: 'modelVerificationSuiteReport',
    sensitivity: 'share-safe',
  },
  {
    category: 'model',
    key: 'model-delivery-lifecycle',
    label: 'Model delivery lifecycle',
    location: 'docs/sdlc/model-delivery-lifecycle-report.json',
    owner: 'engineering',
    purpose: 'Build-time vendoring, browser warmup, native delivery, and offline reuse evidence.',
    readyStatuses: ['ready', 'action'],
    refreshCommand: 'npm run model:delivery:lifecycle',
    reportKey: 'modelDeliveryLifecycleReport',
    sensitivity: 'share-safe',
  },
  {
    category: 'legal',
    key: 'model-asset-provenance',
    label: 'Model asset provenance',
    location: 'docs/sdlc/model-asset-provenance-report.json',
    owner: 'release',
    purpose: 'Vendored model source, hashes, attribution, and license-review state.',
    readyStatuses: ['ready'],
    refreshCommand: 'npm run model:assets:provenance',
    reportKey: 'modelAssetProvenanceReport',
    reviewStatuses: ['review'],
    sensitivity: 'share-safe',
  },
  {
    category: 'legal',
    key: 'dependency-license-report',
    label: 'Dependency license report',
    location: 'docs/sdlc/dependency-license-report.json',
    owner: 'release',
    purpose: 'Dependency license inventory and notice obligations.',
    readyStatuses: ['ready'],
    refreshCommand: 'npm run security:licenses',
    reportKey: 'dependencyLicenseReport',
    reviewStatuses: ['review'],
    sensitivity: 'share-safe',
  },
  {
    category: 'legal',
    blockedStatuses: ['blocked'],
    key: 'license-review-packet',
    label: 'License review packet',
    location: 'docs/sdlc/license-review-packet.json',
    owner: 'release',
    purpose: 'Aggregated dependency, model, notice, and legal-clearance review packet.',
    readyStatuses: ['ready'],
    refreshCommand: 'npm run release:license-review',
    reportKey: 'licenseReviewPacket',
    reviewStatuses: ['review'],
    sensitivity: 'share-safe',
  },
  {
    category: 'legal',
    key: 'third-party-notices',
    label: 'Third-party notices',
    location: 'docs/legal/THIRD_PARTY_NOTICES.md',
    owner: 'release',
    purpose: 'Share-safe generated third-party notice index for buyer due diligence and distribution review.',
    refreshCommand: 'npm run release:license-review',
    sensitivity: 'share-safe',
  },
  {
    category: 'distribution',
    key: 'store-submission-packet',
    label: 'Store submission packet',
    location: 'docs/store/store-submission-packet.json',
    owner: 'release',
    purpose: 'Store metadata, privacy copy, screenshot, and command packet.',
    readyStatuses: ['metadata-ready'],
    refreshCommand: 'npm run store:submission',
    reportKey: 'storeSubmissionPacket',
    sensitivity: 'public-store-copy',
  },
  {
    category: 'distribution',
    key: 'pwa-readiness-report',
    label: 'PWA readiness report',
    location: 'docs/sdlc/pwa-readiness-report.json',
    owner: 'release',
    purpose: 'Static installable PWA and offline app boot evidence.',
    readyStatuses: ['ready'],
    refreshCommand: 'npm run export:web && npm run web:pwa:check',
    reportKey: 'pwaReadinessReport',
    sensitivity: 'share-safe',
  },
  {
    category: 'distribution',
    key: 'web-smoke-report',
    label: 'Web smoke report',
    location: 'docs/sdlc/web-smoke-report.json',
    owner: 'qa',
    purpose: 'Exported web bundle smoke evidence across release UI, PWA cache, and model delivery paths.',
    readyStatuses: ['pass'],
    refreshCommand: 'npm run web:smoke:report',
    reportKey: 'webSmokeReport',
    sensitivity: 'share-safe',
  },
  {
    category: 'distribution',
    key: 'vercel-deployment-report',
    label: 'Vercel deployment report',
    location: 'docs/sdlc/vercel-deployment-report.json',
    owner: 'release',
    purpose: 'No-backend static Vercel deployment readiness.',
    readyStatuses: ['ready', 'static-ready'],
    refreshCommand: 'npm run web:vercel:check',
    reportKey: 'vercelDeploymentReport',
    sensitivity: 'share-safe',
  },
  {
    category: 'distribution',
    key: 'vercel-workflow-report',
    label: 'Vercel workflow report',
    location: 'docs/sdlc/vercel-workflow-report.json',
    owner: 'release',
    purpose: 'GitHub Actions template readiness for Vercel deployment.',
    readyStatuses: ['ready', 'template-ready'],
    refreshCommand: 'npm run web:vercel:workflow',
    reportKey: 'vercelWorkflowReport',
    sensitivity: 'credential-names-only',
  },
  {
    category: 'distribution',
    key: 'vercel-deployment-handoff',
    label: 'Vercel deployment handoff',
    location: 'docs/sdlc/vercel-deployment-handoff.json',
    owner: 'release',
    purpose: 'Operational no-backend Vercel deployment handoff with prebuilt deploy, smoke, inspect, and rollback commands.',
    readyStatuses: ['handoff-ready', 'linked-ready', 'deployed-ready'],
    refreshCommand: 'npm run web:vercel:handoff',
    reportKey: 'vercelDeploymentHandoff',
    sensitivity: 'credential-names-only',
  },
  {
    category: 'commercial',
    key: 'store-credentials-setup',
    label: 'Store credentials setup packet',
    location: 'docs/sdlc/store-credentials-setup-packet.json',
    owner: 'release',
    purpose: 'Credential key-name setup packet without account secret values.',
    externalStatuses: ['blocked'],
    refreshCommand: 'npm run release:credentials:starter',
    reportKey: 'storeCredentialsSetupPacket',
    sensitivity: 'credential-names-only',
  },
  {
    category: 'distribution',
    key: 'store-release-account-runbook',
    label: 'Store release account runbook',
    location: 'docs/sdlc/store-release-account-runbook.json',
    owner: 'release',
    purpose: 'Ordered account, credential, strict-gate, QA, and store-submit runbook without secret values.',
    externalStatuses: ['blocked', 'ready-for-strict-gate'],
    readyStatuses: ['ready-for-submission'],
    refreshCommand: 'npm run release:store-account:runbook',
    reportKey: 'storeReleaseAccountRunbook',
    sensitivity: 'credential-names-only',
  },
  {
    category: 'security',
    key: 'github-workflow-report',
    label: 'GitHub workflow report',
    location: 'docs/sdlc/github-workflow-report.json',
    owner: 'engineering',
    purpose: 'CI workflow activation state and required token scope.',
    externalStatuses: ['blocked'],
    readyStatuses: ['ready'],
    refreshCommand: 'npm run release:github:doctor',
    reportKey: 'githubWorkflowReport',
    sensitivity: 'credential-names-only',
  },
  {
    category: 'native',
    key: 'ios-toolchain-report',
    label: 'iOS toolchain report',
    location: 'docs/sdlc/ios-toolchain-report.json',
    owner: 'engineering',
    purpose: 'Full Xcode, Pods, workspace, and build-settings readiness.',
    externalStatuses: ['blocked'],
    readyStatuses: ['ready'],
    refreshCommand: 'npm run native:ios:doctor',
    reportKey: 'iosToolchainReport',
    sensitivity: 'share-safe',
  },
  {
    category: 'native',
    externalStatuses: ['needs-device-evidence'],
    key: 'native-qa-starter',
    label: 'Native QA evidence starter',
    location: 'docs/sdlc/native-qa-evidence-starter-report.json',
    owner: 'qa',
    purpose: 'Template and composer report for physical-device QA evidence.',
    readyStatuses: ['ready'],
    refreshCommand: 'npm run native:qa:starter',
    reportKey: 'nativeQaEvidenceStarterReport',
    sensitivity: 'external-proof-reference',
  },
  {
    category: 'validation',
    externalStatuses: ['blocked'],
    key: 'cue-validation-dataset-report',
    label: 'Cue-validation dataset report',
    location: 'docs/sdlc/cue-validation-dataset-report.json',
    owner: 'product',
    purpose: 'Doctor report for real consented coach cue-validation data.',
    readyStatuses: ['ready'],
    refreshCommand: 'npm run validation:cue:doctor',
    reportKey: 'cueValidationDatasetReport',
    sensitivity: 'external-proof-reference',
  },
  {
    category: 'archive',
    key: 'source-archive',
    label: 'Source archive',
    location: '../movebeta-mobile-source.zip',
    owner: 'release',
    purpose: 'Source delivery archive for transfer or review.',
    refreshCommand: 'npm run release:archives',
    sensitivity: 'source-archive',
  },
  {
    category: 'archive',
    key: 'web-dist-archive',
    label: 'Web dist archive',
    location: '../movebeta-mobile-web-dist.zip',
    owner: 'release',
    purpose: 'Static web distribution archive for Vercel-style hosting.',
    refreshCommand: 'npm run release:archives',
    sensitivity: 'share-safe',
  },
  {
    category: 'archive',
    key: 'release-archive-manifest',
    label: 'Release archive manifest',
    location: '../movebeta-mobile-release-archives.json',
    owner: 'release',
    purpose: 'SHA-256 manifest and repository metadata for release archives.',
    refreshCommand: 'npm run release:archives',
    sensitivity: 'share-safe',
  },
];

export const dataRoomIndexArtifactLocations = dataRoomSeeds.map((seed) => seed.location);

function seedStatus(seed: DataRoomSeed, reports: DataRoomReportBundle, artifactAvailability: Record<string, boolean>): z.infer<typeof DataRoomStatusSchema> {
  const report = seed.reportKey ? reports[seed.reportKey] : undefined;
  const exists = artifactAvailability[seed.location] ?? report !== undefined;
  if (!exists) return 'missing';

  const status = reportStatus(report, 'ready');
  if (seed.readyStatuses?.includes(status)) return 'ready';
  if (seed.externalStatuses?.includes(status)) return 'external-required';
  if (seed.blockedStatuses?.includes(status)) return 'blocked';
  if (seed.reviewStatuses?.includes(status)) return 'review';
  if (['ready', 'pass', 'metadata-ready', 'technical-ready', 'static-ready', 'template-ready', 'action'].includes(status)) return 'ready';
  if (['external-blocked', 'needs-evidence', 'needs-device-evidence', 'needs-seed', 'needs-external-clearance', 'blocked', 'drift'].includes(status)) {
    return 'external-required';
  }
  if (['review', 'dry-run'].includes(status)) return 'review';
  return 'ready';
}

const externalProofLocationByCheck: Record<string, string> = {
  cueValidationDataset: 'docs/validation/cue-validation-dataset.json',
  easCredentials: 'external:eas-and-store-credential-values',
  easProject: 'app.json expo.extra.eas.projectId',
  iosBuild: 'external:ios-build-log-or-ci-run',
  nativeDeviceQa: 'docs/sdlc/native-qa-evidence.json',
};

const externalProofRefreshByCheck: Record<string, string> = {
  cueValidationDataset: 'npm run validation:cue:starter && npm run validation:cue:doctor',
  easCredentials: 'npm run release:credentials:starter && npm run release:credentials:doctor',
  easProject: 'npm run release:eas:check',
  iosBuild: 'npm run native:ios:doctor',
  nativeDeviceQa: 'npm run native:qa:starter && npm run native:qa:validate',
};

function owner(value: unknown): z.infer<typeof DataRoomOwnerSchema> {
  const parsed = DataRoomOwnerSchema.safeParse(value);
  return parsed.success ? parsed.data : 'release';
}

function externalProofItems(launchReadinessReport: unknown): DataRoomIndexItem[] {
  const rawChecks = record(launchReadinessReport).checks;
  const checks = Array.isArray(rawChecks) ? rawChecks : [];
  return checks
    .filter((check): check is Record<string, unknown> => isRecord(check) && check.status !== 'verified')
    .map((check) => {
      const key = text(check.key, 'external-proof');
      return DataRoomItemSchema.parse({
        category: key === 'nativeDeviceQa' || key === 'iosBuild' ? 'native' : key === 'cueValidationDataset' ? 'validation' : 'commercial',
        key: `external-${key}`,
        label: `${text(check.label, key)} proof`,
        location: externalProofLocationByCheck[key] ?? `external:${key}`,
        owner: owner(check.owner),
        purpose: text(check.action, 'Collect external proof before claiming this blocker is closed.'),
        refreshCommand: externalProofRefreshByCheck[key] ?? 'npm run release:readiness',
        sensitivity: key === 'easCredentials' ? 'credential-names-only' : 'external-proof-reference',
        status: 'external-required',
      });
    });
}

function commands(): Array<z.infer<typeof DataRoomCommandSchema>> {
  return [
    {
      command: 'npm run release:data-room',
      key: 'data-room-index',
      label: 'Data-room index',
      owner: 'release',
      purpose: 'Regenerate this buyer-facing artifact inventory after evidence changes.',
    },
    {
      command: 'npm run release:acquisition',
      key: 'acquisition-readiness',
      label: 'Acquisition readiness',
      owner: 'founder',
      purpose: 'Refresh buyer due-diligence readiness signals.',
    },
    {
      command: 'npm run release:check',
      key: 'release-check',
      label: 'Release gate',
      owner: 'engineering',
      purpose: 'Refresh automated quality and release evidence.',
    },
    {
      command: 'npm run release:archives',
      key: 'release-archives',
      label: 'Release archives',
      owner: 'release',
      purpose: 'Refresh source and web archive checksums before transfer.',
    },
    {
      command: 'npm run release:handoff -- --commit-sha <delivered-commit>',
      key: 'release-handoff',
      label: 'Release handoff',
      owner: 'release',
      purpose: 'Pin final handoff to the commit being transferred.',
    },
  ];
}

function nextActionFor(items: DataRoomIndexItem[], launchReadinessReport: unknown) {
  const missing = items.find((item) => item.status === 'missing');
  if (missing) return `Refresh missing data-room item ${missing.label} with ${missing.refreshCommand}.`;

  const blocked = items.find((item) => item.status === 'blocked');
  if (blocked) return `Resolve blocked data-room item ${blocked.label} with ${blocked.refreshCommand}.`;

  const external = items.find((item) => item.status === 'external-required');
  if (external) return text(nestedRecord(launchReadinessReport, 'summary').nextAction, external.purpose);

  const review = items.find((item) => item.status === 'review');
  if (review) return `Review ${review.label} before final buyer transfer.`;

  return 'Data-room index is ready for buyer review; keep artifacts fresh until transfer.';
}

function summaryStatus(items: DataRoomIndexItem[]): z.infer<typeof DataRoomIndexSchema>['summary']['status'] {
  if (items.some((item) => item.status === 'blocked' || item.status === 'missing')) return 'blocked';
  if (items.some((item) => item.status === 'external-required' || item.status === 'review')) return 'needs-external-evidence';
  return 'ready';
}

export function assertDataRoomIndexIsShareSafe(index: DataRoomIndex) {
  if (containsForbiddenDataRoomValue(index)) {
    throw new Error('Data-room index contains credential values, local paths, raw artifacts, raw video references, or token-like data.');
  }
  return index;
}

export function buildDataRoomIndex({
  artifactAvailability = {},
  generatedAt = new Date().toISOString(),
  reports = {},
}: DataRoomIndexInput = {}): DataRoomIndex {
  const seededItems = dataRoomSeeds.map((seed) =>
    DataRoomItemSchema.parse({
      category: seed.category,
      key: seed.key,
      label: seed.label,
      location: seed.location,
      owner: seed.owner,
      purpose: seed.purpose,
      refreshCommand: seed.refreshCommand,
      sensitivity: seed.sensitivity,
      status: seedStatus(seed, reports, artifactAvailability),
    }),
  );
  const items = [...seededItems, ...externalProofItems(reports.launchReadinessReport)];
  const readyCount = items.filter((item) => item.status === 'ready').length;
  const reviewCount = items.filter((item) => item.status === 'review').length;
  const externalRequiredCount = items.filter((item) => item.status === 'external-required').length;
  const missingCount = items.filter((item) => item.status === 'missing').length;
  const blockedCount = items.filter((item) => item.status === 'blocked').length;
  const packet = DataRoomIndexSchema.parse({
    commands: commands(),
    generatedAt,
    items,
    privacy: {
      credentialValuesIncluded: false,
      localPathsIncluded: false,
      paymentDataIncluded: false,
      rawArtifactsIncluded: false,
      rawVideoIncluded: false,
      secretsIncluded: false,
      tokenLikeValuesIncluded: false,
    },
    schemaVersion: dataRoomIndexSchemaVersion,
    summary: {
      blockedCount,
      externalRequiredCount,
      itemCount: items.length,
      missingCount,
      nextAction: nextActionFor(items, reports.launchReadinessReport),
      readyCount,
      reviewCount,
      status: summaryStatus(items),
    },
  });

  return assertDataRoomIndexIsShareSafe(packet);
}
