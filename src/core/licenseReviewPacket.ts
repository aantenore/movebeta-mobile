import { z } from 'zod';

export const licenseReviewPacketSchemaVersion = 'movebeta.license-review-packet.v1';

const LicenseReviewStatusSchema = z.enum(['ready', 'review', 'blocked']);
const LicenseReviewOwnerSchema = z.enum(['engineering', 'founder', 'legal', 'release']);
const LicenseReviewSourceSchema = z.enum(['dependency', 'model', 'notice']);

const LicenseReviewObligationSchema = z.object({
  action: z.string(),
  evidence: z.array(z.string()).min(1),
  key: z.string(),
  label: z.string(),
  license: z.string().optional(),
  owner: LicenseReviewOwnerSchema,
  packageName: z.string().optional(),
  source: LicenseReviewSourceSchema,
  status: LicenseReviewStatusSchema,
  version: z.string().optional(),
});

const LicenseReviewNoticeSchema = z.object({
  included: z.boolean(),
  key: z.string(),
  label: z.string(),
  path: z.string(),
  source: LicenseReviewSourceSchema,
});

const LicenseReviewCommandSchema = z.object({
  command: z.string(),
  key: z.string(),
  label: z.string(),
  owner: LicenseReviewOwnerSchema,
  purpose: z.string(),
});

export const LicenseReviewPacketSchema = z.object({
  commands: z.array(LicenseReviewCommandSchema),
  generatedAt: z.string(),
  legalReview: z.object({
    clearanceClaimed: z.literal(false),
    externalApprovalRequired: z.boolean(),
    requiredApprovalReference: z.string(),
  }),
  notices: z.array(LicenseReviewNoticeSchema),
  obligations: z.array(LicenseReviewObligationSchema),
  privacy: z.object({
    credentialValuesIncluded: z.literal(false),
    localPathsIncluded: z.literal(false),
    rawArtifactsIncluded: z.literal(false),
    rawVideoIncluded: z.literal(false),
    secretsIncluded: z.literal(false),
    tokenLikeValuesIncluded: z.literal(false),
  }),
  schemaVersion: z.literal(licenseReviewPacketSchemaVersion),
  summary: z.object({
    blockedObligationCount: z.number().int().nonnegative(),
    dependencyStatus: z.string(),
    modelStatus: z.string(),
    nextAction: z.string(),
    noticeArtifactCount: z.number().int().nonnegative(),
    obligationCount: z.number().int().nonnegative(),
    reviewObligationCount: z.number().int().nonnegative(),
    status: LicenseReviewStatusSchema,
  }),
});

export type LicenseReviewPacket = z.infer<typeof LicenseReviewPacketSchema>;
export type LicenseReviewStatus = z.infer<typeof LicenseReviewStatusSchema>;

export type LicenseReviewPacketInput = {
  dependencyLicenseReport?: unknown;
  generatedAt?: string;
  modelAssetAttributionNotice?: string;
  modelAssetProvenanceReport?: unknown;
};

const forbiddenLicenseReviewValuePattern =
  /(file:\/\/|content:\/\/|asset:\/\/|ph:\/\/|\/Users\/|\/private\/|\/var\/mobile\/|[A-Za-z]:\\|\.mov\b|\.mp4\b|BEGIN PRIVATE KEY|ghp_[A-Za-z0-9_]+|github_pat_[A-Za-z0-9_]+|pat_[A-Za-z0-9_]+|sk_live_[A-Za-z0-9_]+|sk_test_[A-Za-z0-9_]+|bearer\s+[A-Za-z0-9._-]+|eyJ[A-Za-z0-9_-]{20,})/i;

function containsForbiddenLicenseReviewValue(value: unknown): boolean {
  if (typeof value === 'string') return forbiddenLicenseReviewValuePattern.test(value);
  if (Array.isArray(value)) return value.some(containsForbiddenLicenseReviewValue);
  if (value && typeof value === 'object') return Object.values(value).some(containsForbiddenLicenseReviewValue);
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

function reportStatus(report: unknown, fallback = 'missing') {
  return text(record(report).status ?? nestedRecord(report, 'summary').status, fallback);
}

function packageObligation(item: Record<string, unknown>): z.infer<typeof LicenseReviewObligationSchema> {
  const packageName = text(item.name, 'unknown-package');
  const version = text(item.version, '');
  const license = text(item.license, 'missing');
  const status = text(item.status) === 'blocked' ? 'blocked' : 'review';

  return LicenseReviewObligationSchema.parse({
    action:
      status === 'blocked'
        ? 'Resolve or replace this dependency before commercial distribution.'
        : 'Review notice, attribution, or file-level obligations before commercial distribution.',
    evidence: ['docs/sdlc/dependency-license-report.json', 'docs/sdlc/dependency-license-report.md'],
    key: `dependency-${packageName.replace(/[^a-zA-Z0-9]+/g, '-').replace(/^-|-$/g, '').toLowerCase()}`,
    label: `${packageName}${version ? ` ${version}` : ''}`,
    license,
    owner: 'legal',
    packageName,
    source: 'dependency',
    status,
    version: version || undefined,
  });
}

function dependencyObligations(dependencyLicenseReport: unknown) {
  const packages = record(dependencyLicenseReport).packages;
  if (!Array.isArray(packages)) return [];

  return packages
    .filter((item): item is Record<string, unknown> => {
      if (!isRecord(item)) return false;
      const status = text(item.status, '');
      return status === 'review' || status === 'blocked';
    })
    .map(packageObligation)
    .sort((a, b) => {
      if (a.status !== b.status) return a.status === 'blocked' ? -1 : 1;
      return a.label.localeCompare(b.label);
    });
}

function modelObligations(modelAssetProvenanceReport: unknown) {
  const checks = record(modelAssetProvenanceReport).checks;
  if (!Array.isArray(checks)) return [];

  return checks
    .filter((item): item is Record<string, unknown> => {
      if (!isRecord(item)) return false;
      const status = text(item.status, '');
      return status === 'review' || status === 'blocked';
    })
    .map((item) =>
      LicenseReviewObligationSchema.parse({
        action: text(item.action, 'Review upstream model terms before commercial distribution.'),
        evidence: [
          'docs/sdlc/model-asset-provenance-report.json',
          'docs/sdlc/model-asset-attribution.md',
          'public/model-assets.json',
        ],
        key: `model-${text(item.key, 'review').replace(/[^a-zA-Z0-9]+/g, '-').replace(/^-|-$/g, '').toLowerCase()}`,
        label: text(item.label, 'Model review'),
        owner: 'legal',
        source: 'model',
        status: text(item.status) === 'blocked' ? 'blocked' : 'review',
      }),
    );
}

function noticeObligation(modelAssetAttributionNotice = '') {
  const noticePresent = modelAssetAttributionNotice.includes('MoveNet SinglePose Lightning');

  return LicenseReviewObligationSchema.parse({
    action: noticePresent
      ? 'Keep generated third-party notices bundled with buyer and distribution artifacts.'
      : 'Restore the model attribution notice before distribution.',
    evidence: ['docs/legal/THIRD_PARTY_NOTICES.md', 'docs/sdlc/model-asset-attribution.md'],
    key: 'notice-third-party-notices',
    label: 'Third-party notices',
    owner: 'release',
    source: 'notice',
    status: noticePresent ? 'ready' : 'blocked',
  });
}

function commands(): Array<z.infer<typeof LicenseReviewCommandSchema>> {
  return [
    {
      command: 'npm run security:licenses',
      key: 'dependency-licenses',
      label: 'Dependency license inventory',
      owner: 'release',
      purpose: 'Refresh package license status, review obligations, and blocked package evidence from the installed lockfile graph.',
    },
    {
      command: 'npm run model:assets:provenance',
      key: 'model-asset-provenance',
      label: 'Model asset provenance',
      owner: 'release',
      purpose: 'Refresh model source, hash, attribution, and upstream terms review status.',
    },
    {
      command: 'npm run release:license-review',
      key: 'license-review-packet',
      label: 'License review packet',
      owner: 'release',
      purpose: 'Regenerate the share-safe legal due-diligence packet and third-party notice index.',
    },
  ];
}

function nextActionFor(status: LicenseReviewStatus, obligations: Array<z.infer<typeof LicenseReviewObligationSchema>>) {
  const blocked = obligations.find((item) => item.status === 'blocked');
  if (blocked) return blocked.action;

  const review = obligations.find((item) => item.status === 'review');
  if (review) return review.action;

  if (status === 'ready') return 'Keep dependency, model provenance, and notice artifacts refreshed before distribution.';
  return 'Review license obligations before distribution.';
}

export function assertLicenseReviewPacketIsShareSafe(packet: LicenseReviewPacket) {
  if (containsForbiddenLicenseReviewValue(packet)) {
    throw new Error('License review packet contains credential values, local paths, raw artifacts, raw video references, or token-like data.');
  }
  return packet;
}

export function buildLicenseReviewPacket({
  dependencyLicenseReport,
  generatedAt = new Date().toISOString(),
  modelAssetAttributionNotice = '',
  modelAssetProvenanceReport,
}: LicenseReviewPacketInput = {}): LicenseReviewPacket {
  const obligations = [
    ...dependencyObligations(dependencyLicenseReport),
    ...modelObligations(modelAssetProvenanceReport),
    noticeObligation(modelAssetAttributionNotice),
  ];
  const dependencyStatus = reportStatus(dependencyLicenseReport);
  const modelStatus = reportStatus(modelAssetProvenanceReport);
  const blockedObligationCount = obligations.filter((item) => item.status === 'blocked').length;
  const reviewObligationCount = obligations.filter((item) => item.status === 'review').length;
  const status: LicenseReviewStatus = blockedObligationCount > 0 ? 'blocked' : reviewObligationCount > 0 ? 'review' : 'ready';
  const notices = [
    LicenseReviewNoticeSchema.parse({
      included: true,
      key: 'third-party-notices',
      label: 'Third-party notices',
      path: 'docs/legal/THIRD_PARTY_NOTICES.md',
      source: 'notice',
    }),
    LicenseReviewNoticeSchema.parse({
      included: modelAssetAttributionNotice.includes('MoveNet SinglePose Lightning'),
      key: 'model-asset-attribution',
      label: 'Model asset attribution',
      path: 'docs/sdlc/model-asset-attribution.md',
      source: 'model',
    }),
    LicenseReviewNoticeSchema.parse({
      included: dependencyLicenseReport !== undefined,
      key: 'dependency-license-report',
      label: 'Dependency license report',
      path: 'docs/sdlc/dependency-license-report.md',
      source: 'dependency',
    }),
  ];
  const packet = LicenseReviewPacketSchema.parse({
    commands: commands(),
    generatedAt,
    legalReview: {
      clearanceClaimed: false,
      externalApprovalRequired: status !== 'ready',
      requiredApprovalReference: 'external:commercial-legal-approval',
    },
    notices,
    obligations,
    privacy: {
      credentialValuesIncluded: false,
      localPathsIncluded: false,
      rawArtifactsIncluded: false,
      rawVideoIncluded: false,
      secretsIncluded: false,
      tokenLikeValuesIncluded: false,
    },
    schemaVersion: licenseReviewPacketSchemaVersion,
    summary: {
      blockedObligationCount,
      dependencyStatus,
      modelStatus,
      nextAction: nextActionFor(status, obligations),
      noticeArtifactCount: notices.filter((item) => item.included).length,
      obligationCount: obligations.length,
      reviewObligationCount,
      status,
    },
  });

  return assertLicenseReviewPacketIsShareSafe(packet);
}
