import { z } from 'zod';

export const acquisitionReadinessPacketSchemaVersion = 'movebeta.acquisition-readiness-packet.v1';

const AcquisitionSignalStatusSchema = z.enum(['ready', 'review', 'blocked', 'external-required']);
const AcquisitionStatusSchema = z.enum(['ready', 'needs-external-clearance', 'blocked']);
const AcquisitionOwnerSchema = z.enum(['founder', 'product', 'engineering', 'qa', 'release']);

const AcquisitionSignalSchema = z.object({
  detail: z.string(),
  evidence: z.array(z.string()),
  key: z.string(),
  label: z.string(),
  nextAction: z.string(),
  owner: AcquisitionOwnerSchema,
  status: AcquisitionSignalStatusSchema,
});

const AcquisitionArtifactSchema = z.object({
  key: z.string(),
  label: z.string(),
  path: z.string(),
  status: z.enum(['ready', 'missing', 'review']),
});

const AcquisitionCommandSchema = z.object({
  command: z.string(),
  key: z.string(),
  label: z.string(),
  owner: AcquisitionOwnerSchema,
  purpose: z.string(),
});

export const AcquisitionReadinessPacketSchema = z.object({
  artifacts: z.array(AcquisitionArtifactSchema),
  commands: z.array(AcquisitionCommandSchema),
  generatedAt: z.string(),
  privacy: z.object({
    credentialValuesIncluded: z.literal(false),
    localPathsIncluded: z.literal(false),
    paymentDataIncluded: z.literal(false),
    rawArtifactsIncluded: z.literal(false),
    rawVideoIncluded: z.literal(false),
    secretsIncluded: z.literal(false),
    tokenLikeValuesIncluded: z.literal(false),
  }),
  schemaVersion: z.literal(acquisitionReadinessPacketSchemaVersion),
  signals: z.array(AcquisitionSignalSchema),
  summary: z.object({
    blockedSignalCount: z.number().int().nonnegative(),
    dueDiligenceArtifactCount: z.number().int().nonnegative(),
    externalBlockerCount: z.number().int().nonnegative(),
    nextAction: z.string(),
    readySignalCount: z.number().int().nonnegative(),
    reviewSignalCount: z.number().int().nonnegative(),
    signalCount: z.number().int().positive(),
    status: AcquisitionStatusSchema,
  }),
});

export type AcquisitionSignalStatus = z.infer<typeof AcquisitionSignalStatusSchema>;
export type AcquisitionReadinessPacket = z.infer<typeof AcquisitionReadinessPacketSchema>;

export type AcquisitionReadinessPacketInput = {
  artifactAvailability?: Record<string, boolean>;
  commercialReadinessPacket?: unknown;
  dependencyLicenseReport?: unknown;
  featureCompletionReport?: unknown;
  generatedAt?: string;
  launchReadinessReport?: unknown;
  licenseReviewPacket?: unknown;
  modelAssetProvenanceReport?: unknown;
  modelDeliveryLifecycleReport?: unknown;
  pwaReadinessReport?: unknown;
  releaseGateReport?: unknown;
  releaseHandoffPacket?: unknown;
  storeSubmissionPacket?: unknown;
  vercelDeploymentReport?: unknown;
  webSmokeReport?: unknown;
};

const forbiddenAcquisitionPacketValuePattern =
  /(file:\/\/|content:\/\/|asset:\/\/|ph:\/\/|\/Users\/|\/private\/|\/var\/mobile\/|[A-Za-z]:\\|\.mov\b|\.mp4\b|BEGIN PRIVATE KEY|ghp_[A-Za-z0-9_]+|github_pat_[A-Za-z0-9_]+|pat_[A-Za-z0-9_]+|sk_live_[A-Za-z0-9_]+|sk_test_[A-Za-z0-9_]+|bearer\s+[A-Za-z0-9._-]+|eyJ[A-Za-z0-9_-]{20,})/i;

function containsForbiddenAcquisitionPacketValue(value: unknown): boolean {
  if (typeof value === 'string') return forbiddenAcquisitionPacketValuePattern.test(value);
  if (Array.isArray(value)) return value.some(containsForbiddenAcquisitionPacketValue);
  if (value && typeof value === 'object') return Object.values(value).some(containsForbiddenAcquisitionPacketValue);
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

function numberValue(value: unknown, fallback = 0) {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

function reportStatus(report: unknown, fallback = 'unknown') {
  return text(record(report).status ?? nestedRecord(report, 'summary').status, fallback);
}

function artifact(
  label: string,
  path: string,
  report: unknown,
  availability: Record<string, boolean> = {},
): z.infer<typeof AcquisitionArtifactSchema> {
  const exists = availability[path] ?? report !== undefined;
  return {
    key: path.replace(/[^a-zA-Z0-9]+/g, '-').replace(/^-|-$/g, '').toLowerCase(),
    label,
    path,
    status: exists ? 'ready' : 'missing',
  };
}

function signal({
  detail,
  evidence,
  key,
  label,
  nextAction,
  owner,
  status,
}: z.infer<typeof AcquisitionSignalSchema>): z.infer<typeof AcquisitionSignalSchema> {
  return AcquisitionSignalSchema.parse({ detail, evidence, key, label, nextAction, owner, status });
}

function productScopeSignal(featureCompletionReport: unknown) {
  const summary = nestedRecord(featureCompletionReport, 'summary');
  const internalGapCount = numberValue(summary.internalGapCount);
  const traceabilityCoveredCount = numberValue(summary.traceabilityCoveredCount);
  const traceabilityItemCount = numberValue(summary.traceabilityItemCount);
  const status: AcquisitionSignalStatus = internalGapCount > 0 ? 'blocked' : 'ready';

  return signal({
    detail:
      internalGapCount > 0
        ? `${internalGapCount} internal feature gap(s) remain in tracked delivery artifacts.`
        : `Tracked delivery scope has no internal gaps and ${traceabilityCoveredCount}/${traceabilityItemCount} traceability rows covered.`,
    evidence: ['docs/sdlc/feature-completion-report.json', 'docs/task-plan.md', 'docs/sdlc/backlog.md', 'docs/sdlc/traceability-matrix.md'],
    key: 'product-scope',
    label: 'Product scope',
    nextAction: status === 'ready' ? 'Keep feature-completion evidence fresh before buyer review.' : 'Resolve internal feature gaps before acquisition handoff.',
    owner: 'product',
    status,
  });
}

function releaseGateSignal(releaseGateReport: unknown) {
  const statusValue = reportStatus(releaseGateReport);
  const status: AcquisitionSignalStatus = statusValue === 'pass' ? 'ready' : statusValue === 'fail' ? 'blocked' : 'review';

  return signal({
    detail:
      status === 'ready'
        ? 'The automated release gate is passing.'
        : status === 'blocked'
          ? 'The latest release gate report contains a failing step.'
          : 'Release gate status is not available for buyer review.',
    evidence: ['docs/sdlc/release-gate-report.json', 'npm run release:check'],
    key: 'release-gate',
    label: 'Release gate',
    nextAction: status === 'ready' ? 'Regenerate the gate after any source or evidence change.' : 'Run npm run release:check and fix the first failing gate.',
    owner: 'engineering',
    status,
  });
}

function launchClearanceSignal(launchReadinessReport: unknown, featureCompletionReport: unknown) {
  const summary = nestedRecord(launchReadinessReport, 'summary');
  const launchStatus = text(summary.status);
  const readyTracks = numberValue(summary.readyTracks);
  const totalTracks = numberValue(summary.totalTracks);
  const featureExternalBlockers = numberValue(nestedRecord(featureCompletionReport, 'summary').externalBlockerCount);
  const status: AcquisitionSignalStatus =
    launchStatus === 'ready' ? 'ready' : launchStatus === 'blocked' || launchStatus === 'drift' ? 'external-required' : 'review';

  return signal({
    detail:
      status === 'ready'
        ? `All ${totalTracks} launch track(s) are ready.`
        : `${readyTracks}/${totalTracks} launch track(s) ready with ${featureExternalBlockers} external blocker reference(s) still tracked.`,
    evidence: ['docs/sdlc/launch-readiness-report.json', 'docs/sdlc/release-blocker-issues-report.json'],
    key: 'launch-clearance',
    label: 'Launch clearance',
    nextAction:
      status === 'ready'
        ? 'Preserve ready launch evidence and refresh handoff artifacts.'
        : text(summary.nextAction, 'Collect external launch evidence before final transfer.'),
    owner: 'release',
    status,
  });
}

function modelProvenanceSignal(modelAssetProvenanceReport: unknown, modelDeliveryLifecycleReport: unknown) {
  const provenanceStatus = reportStatus(modelAssetProvenanceReport);
  const lifecycleStatus = reportStatus(modelDeliveryLifecycleReport);
  const status: AcquisitionSignalStatus =
    provenanceStatus === 'blocked' || lifecycleStatus === 'blocked'
      ? 'blocked'
      : provenanceStatus === 'ready' && (lifecycleStatus === 'ready' || lifecycleStatus === 'action')
        ? 'ready'
        : 'review';

  return signal({
    detail:
      status === 'ready'
        ? 'Model delivery and provenance evidence are present for the shipped on-device analysis path.'
        : `Model provenance is ${provenanceStatus}; delivery lifecycle is ${lifecycleStatus}.`,
    evidence: ['docs/sdlc/model-asset-provenance-report.json', 'docs/sdlc/model-delivery-lifecycle-report.json', 'docs/sdlc/model-asset-attribution.md'],
    key: 'model-provenance',
    label: 'Model provenance',
    nextAction:
      status === 'ready'
        ? 'Keep hashes and attribution aligned whenever model assets change.'
        : 'Complete commercial review for upstream model terms before final buyer reliance.',
    owner: 'release',
    status,
  });
}

function commercialPathSignal(commercialReadinessPacket: unknown) {
  const statusValue = reportStatus(commercialReadinessPacket, 'review');
  const summary = nestedRecord(commercialReadinessPacket, 'summary');
  const status: AcquisitionSignalStatus = statusValue === 'ready' ? 'ready' : statusValue === 'blocked' ? 'blocked' : 'review';

  return signal({
    detail: `Commercial path is ${statusValue}; billing provider ${text(summary.provider, 'not connected')}; paid plan mapping ${text(summary.paidPlanMappingRatio, 'unknown')}.`,
    evidence: ['docs/sdlc/acquisition-readiness-packet.json', 'src/core/commercialReadinessPacket.ts'],
    key: 'commercial-path',
    label: 'Commercial path',
    nextAction:
      status === 'ready'
        ? 'Keep sandbox commerce proof linked outside repository values.'
        : text(summary.nextAction, 'Select the billing adapter and collect sandbox commerce proof.'),
    owner: 'founder',
    status,
  });
}

function distributionSignal(
  storeSubmissionPacket: unknown,
  pwaReadinessReport: unknown,
  vercelDeploymentReport: unknown,
  webSmokeReport: unknown,
) {
  const storeStatus = reportStatus(storeSubmissionPacket);
  const pwaStatus = reportStatus(pwaReadinessReport);
  const vercelStatus = reportStatus(vercelDeploymentReport);
  const webSmokeStatus = reportStatus(webSmokeReport);
  const staticWebReady =
    pwaStatus === 'ready' &&
    webSmokeStatus === 'pass' &&
    (vercelStatus === 'ready' || vercelStatus === 'template-ready' || vercelStatus === 'static-ready');
  const status: AcquisitionSignalStatus = storeStatus === 'metadata-ready' && staticWebReady ? 'ready' : 'review';

  return signal({
    detail: `Store metadata is ${storeStatus}; PWA readiness is ${pwaStatus}; web smoke is ${webSmokeStatus}; Vercel static readiness is ${vercelStatus}.`,
    evidence: [
      'docs/store/store-submission-packet.json',
      'docs/sdlc/pwa-readiness-report.json',
      'docs/sdlc/web-smoke-report.json',
      'docs/sdlc/vercel-deployment-report.json',
    ],
    key: 'distribution',
    label: 'Distribution',
    nextAction:
      status === 'ready'
        ? 'Use the static PWA path for buyer demo and keep native store blockers tracked separately.'
        : 'Refresh store, PWA, web smoke, and Vercel readiness evidence before buyer demo.',
    owner: 'release',
    status,
  });
}

function handoffSignal(releaseHandoffPacket: unknown) {
  const summary = nestedRecord(releaseHandoffPacket, 'summary');
  const expectedScreenshots = numberValue(summary.expectedScreenshots);
  const existingScreenshots = numberValue(summary.existingScreenshots);
  const screenshotReady = expectedScreenshots > 0 && existingScreenshots >= expectedScreenshots;
  const status: AcquisitionSignalStatus = releaseHandoffPacket && screenshotReady ? 'ready' : 'review';

  return signal({
    detail:
      status === 'ready'
        ? `Handoff packet includes ${existingScreenshots}/${expectedScreenshots} expected screenshot(s).`
        : `Handoff screenshot evidence is ${existingScreenshots}/${expectedScreenshots}.`,
    evidence: ['docs/sdlc/release-handoff-packet.json', 'docs/sdlc/release-handoff-packet.md', 'docs/screenshots.md'],
    key: 'handoff-evidence',
    label: 'Handoff evidence',
    nextAction: status === 'ready' ? 'Regenerate handoff after the final commit is pushed.' : 'Refresh release handoff and screenshot artifacts.',
    owner: 'release',
    status,
  });
}

function legalSupplySignal(dependencyLicenseReport: unknown, modelAssetProvenanceReport: unknown, licenseReviewPacket: unknown) {
  const dependencyStatus = reportStatus(dependencyLicenseReport);
  const modelStatus = reportStatus(modelAssetProvenanceReport);
  const reviewStatus = reportStatus(licenseReviewPacket);
  const blocked = dependencyStatus === 'blocked' || modelStatus === 'blocked' || reviewStatus === 'blocked';
  const ready = dependencyStatus === 'ready' && modelStatus === 'ready' && reviewStatus === 'ready';
  const status: AcquisitionSignalStatus = blocked ? 'blocked' : ready ? 'ready' : 'review';

  return signal({
    detail: `Dependency license report is ${dependencyStatus}; model license/provenance review is ${modelStatus}; license review packet is ${reviewStatus}.`,
    evidence: [
      'docs/sdlc/dependency-license-report.json',
      'docs/sdlc/model-asset-provenance-report.json',
      'docs/sdlc/license-review-packet.json',
      'docs/legal/THIRD_PARTY_NOTICES.md',
    ],
    key: 'supply-review',
    label: 'Supply review',
    nextAction:
      status === 'ready'
        ? 'Keep notices and attribution with release evidence.'
        : text(nestedRecord(licenseReviewPacket, 'summary').nextAction, 'Review notice obligations and upstream model terms before commercial transfer.'),
    owner: 'release',
    status,
  });
}

function privacySignal() {
  return signal({
    detail: 'The packet contains negative privacy flags and rejects credential values, local paths, media references, and token-like values before sharing.',
    evidence: ['tests/acquisitionReadinessPacket.test.ts'],
    key: 'privacy-boundary',
    label: 'Privacy boundary',
    nextAction: 'Keep buyer-facing artifacts packet-only and do not attach private media or account values.',
    owner: 'engineering',
    status: 'ready',
  });
}

function commands(): Array<z.infer<typeof AcquisitionCommandSchema>> {
  return [
    {
      command: 'npm run release:check',
      key: 'release-check',
      label: 'Release gate',
      owner: 'engineering',
      purpose: 'Refresh automated quality, model, web, security, and evidence gates before buyer review.',
    },
    {
      command: 'npm run release:readiness',
      key: 'launch-readiness',
      label: 'Launch readiness',
      owner: 'release',
      purpose: 'Refresh launch blocker status and next actions from the latest external evidence.',
    },
    {
      command: 'npm run release:acquisition',
      key: 'acquisition-readiness',
      label: 'Acquisition readiness',
      owner: 'founder',
      purpose: 'Regenerate the buyer-ready due diligence packet after release evidence changes.',
    },
    {
      command: 'npm run release:handoff -- --commit-sha <delivered-commit>',
      key: 'pin-handoff-commit',
      label: 'Pin delivered commit',
      owner: 'release',
      purpose: 'Generate final handoff evidence against the exact pushed commit being transferred.',
    },
    {
      command: 'npm run release:archives',
      key: 'release-archives',
      label: 'Release archives',
      owner: 'release',
      purpose: 'Refresh source and web distribution archives with SHA-256 manifest evidence.',
    },
  ];
}

function nextActionFor(signals: Array<z.infer<typeof AcquisitionSignalSchema>>) {
  const blocked = signals.find((item) => item.status === 'blocked');
  if (blocked) return blocked.nextAction;

  const external = signals.find((item) => item.status === 'external-required');
  if (external) return external.nextAction;

  const review = signals.find((item) => item.status === 'review');
  if (review) return review.nextAction;

  return 'Acquisition packet is ready for buyer review; keep evidence fresh until transfer.';
}

function summaryStatus(signals: Array<z.infer<typeof AcquisitionSignalSchema>>): z.infer<typeof AcquisitionStatusSchema> {
  if (signals.some((item) => item.status === 'blocked')) return 'blocked';
  if (signals.some((item) => item.status === 'external-required' || item.status === 'review')) return 'needs-external-clearance';
  return 'ready';
}

export function assertAcquisitionReadinessPacketIsShareSafe(packet: AcquisitionReadinessPacket) {
  if (containsForbiddenAcquisitionPacketValue(packet)) {
    throw new Error('Acquisition readiness packet contains credential values, local paths, raw artifacts, raw video references, or token-like data.');
  }
  return packet;
}

export function buildAcquisitionReadinessPacket({
  artifactAvailability = {},
  commercialReadinessPacket,
  dependencyLicenseReport,
  featureCompletionReport,
  generatedAt = new Date().toISOString(),
  launchReadinessReport,
  licenseReviewPacket,
  modelAssetProvenanceReport,
  modelDeliveryLifecycleReport,
  pwaReadinessReport,
  releaseGateReport,
  releaseHandoffPacket,
  storeSubmissionPacket,
  vercelDeploymentReport,
  webSmokeReport,
}: AcquisitionReadinessPacketInput = {}): AcquisitionReadinessPacket {
  const signals = [
    productScopeSignal(featureCompletionReport),
    releaseGateSignal(releaseGateReport),
    launchClearanceSignal(launchReadinessReport, featureCompletionReport),
    modelProvenanceSignal(modelAssetProvenanceReport, modelDeliveryLifecycleReport),
    commercialPathSignal(commercialReadinessPacket),
    distributionSignal(storeSubmissionPacket, pwaReadinessReport, vercelDeploymentReport, webSmokeReport),
    handoffSignal(releaseHandoffPacket),
    legalSupplySignal(dependencyLicenseReport, modelAssetProvenanceReport, licenseReviewPacket),
    privacySignal(),
  ];
  const artifacts = [
    artifact('Release gate report', 'docs/sdlc/release-gate-report.json', releaseGateReport, artifactAvailability),
    artifact('Launch readiness report', 'docs/sdlc/launch-readiness-report.json', launchReadinessReport, artifactAvailability),
    artifact('Feature completion report', 'docs/sdlc/feature-completion-report.json', featureCompletionReport, artifactAvailability),
    artifact('Release handoff packet', 'docs/sdlc/release-handoff-packet.json', releaseHandoffPacket, artifactAvailability),
    artifact('Store submission packet', 'docs/store/store-submission-packet.json', storeSubmissionPacket, artifactAvailability),
    artifact('Acquisition readiness packet', 'docs/sdlc/acquisition-readiness-packet.json', undefined, artifactAvailability),
    artifact('Dependency license report', 'docs/sdlc/dependency-license-report.json', dependencyLicenseReport, artifactAvailability),
    artifact('License review packet', 'docs/sdlc/license-review-packet.json', licenseReviewPacket, artifactAvailability),
    artifact('Third-party notices', 'docs/legal/THIRD_PARTY_NOTICES.md', undefined, artifactAvailability),
    artifact('Model asset provenance report', 'docs/sdlc/model-asset-provenance-report.json', modelAssetProvenanceReport, artifactAvailability),
    artifact('Model delivery lifecycle report', 'docs/sdlc/model-delivery-lifecycle-report.json', modelDeliveryLifecycleReport, artifactAvailability),
    artifact('PWA readiness report', 'docs/sdlc/pwa-readiness-report.json', pwaReadinessReport, artifactAvailability),
    artifact('Web smoke report', 'docs/sdlc/web-smoke-report.json', webSmokeReport, artifactAvailability),
    artifact('Vercel deployment report', 'docs/sdlc/vercel-deployment-report.json', vercelDeploymentReport, artifactAvailability),
    artifact('Screenshot gallery', 'docs/screenshots.md', undefined, artifactAvailability),
    artifact('Source archive', '../movebeta-mobile-source.zip', undefined, artifactAvailability),
    artifact('Web dist archive', '../movebeta-mobile-web-dist.zip', undefined, artifactAvailability),
  ];
  const readySignalCount = signals.filter((item) => item.status === 'ready').length;
  const reviewSignalCount = signals.filter((item) => item.status === 'review').length;
  const blockedSignalCount = signals.filter((item) => item.status === 'blocked').length;
  const externalSignalCount = signals.filter((item) => item.status === 'external-required').length;
  const featureExternalBlockers = numberValue(nestedRecord(featureCompletionReport, 'summary').externalBlockerCount);
  const packet = AcquisitionReadinessPacketSchema.parse({
    artifacts,
    commands: commands(),
    generatedAt,
    privacy: {
      credentialValuesIncluded: false,
      localPathsIncluded: false,
      paymentDataIncluded: false,
      rawArtifactsIncluded: false,
      rawVideoIncluded: false,
      secretsIncluded: false,
      tokenLikeValuesIncluded: false,
    },
    schemaVersion: acquisitionReadinessPacketSchemaVersion,
    signals,
    summary: {
      blockedSignalCount,
      dueDiligenceArtifactCount: artifacts.filter((item) => item.status === 'ready').length,
      externalBlockerCount: Math.max(externalSignalCount, featureExternalBlockers),
      nextAction: nextActionFor(signals),
      readySignalCount,
      reviewSignalCount,
      signalCount: signals.length,
      status: summaryStatus(signals),
    },
  });

  return assertAcquisitionReadinessPacketIsShareSafe(packet);
}
