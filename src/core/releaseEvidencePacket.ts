import { z } from 'zod';

import { type buildEvidenceCollectionPlan } from './evidenceCollectionPlan';
import { type LaunchReadinessCheck, type LaunchReadinessSummary } from './launchReadiness';
import { type buildModelEvidenceSummary } from './modelEvidence';
import { NativeQaRunbookPacketSchema, type NativeQaRunbookPacket } from './nativeQaRunbookPacket';
import { type ProviderReadinessSummary } from './providerReadiness';
import { ReleaseUnblockPacketSchema, type ReleaseUnblockPacket } from './releaseUnblockPacket';

export const releaseEvidencePacketSchemaVersion = 'movebeta.release-evidence-packet.v1';

type EvidenceCollectionPlan = ReturnType<typeof buildEvidenceCollectionPlan>;
type ModelEvidenceSummary = ReturnType<typeof buildModelEvidenceSummary>;

const ReleaseEvidenceCommandSchema = z.object({
  command: z.string(),
  key: z.string(),
  label: z.string(),
  owner: z.enum(['engineering', 'qa', 'product', 'release']),
  purpose: z.string(),
});

const ReleaseEvidenceArtifactSchema = z.object({
  command: z.string(),
  key: z.string(),
  label: z.string(),
  path: z.string(),
  status: z.enum(['ready', 'needed', 'blocked']),
});

export const ReleaseEvidencePacketSchema = z.object({
  artifacts: z.array(ReleaseEvidenceArtifactSchema),
  commands: z.array(ReleaseEvidenceCommandSchema),
  evidenceCollectionPlan: z.custom<EvidenceCollectionPlan>(),
  generatedAt: z.string(),
  launchReadiness: z.custom<LaunchReadinessSummary>(),
  modelEvidence: z.custom<ModelEvidenceSummary>(),
  nativeQaRunbookPacket: NativeQaRunbookPacketSchema,
  privacy: z.object({
    credentialValuesIncluded: z.literal(false),
    localPathsIncluded: z.literal(false),
    rawArtifactsIncluded: z.literal(false),
    rawVideoIncluded: z.literal(false),
    secretsIncluded: z.literal(false),
  }),
  providerReadiness: z.custom<ProviderReadinessSummary>(),
  releaseUnblockPacket: ReleaseUnblockPacketSchema,
  schemaVersion: z.literal(releaseEvidencePacketSchemaVersion),
  summary: z.object({
    artifactCount: z.number().int().nonnegative(),
    blockerCount: z.number().int().nonnegative(),
    commandCount: z.number().int().nonnegative(),
    externalEvidenceCount: z.number().int().nonnegative(),
    nextAction: z.string(),
    readyTracks: z.number().int().nonnegative(),
    status: z.enum(['ready', 'needs-external-evidence']),
    totalTracks: z.number().int().nonnegative(),
  }),
});

export type ReleaseEvidencePacket = z.infer<typeof ReleaseEvidencePacketSchema>;

const forbiddenReleaseEvidenceValuePattern =
  /(file:\/\/|content:\/\/|ph:\/\/|\/users\/|\/private\/|\/var\/|BEGIN PRIVATE KEY|ghp_[A-Za-z0-9_]+|pat_[A-Za-z0-9_]+|sk_live_[A-Za-z0-9_]+|sk_test_[A-Za-z0-9_]+|eyJ[A-Za-z0-9_-]{20,})/i;

function containsForbiddenValue(value: unknown): boolean {
  if (typeof value === 'string') return forbiddenReleaseEvidenceValuePattern.test(value);
  if (Array.isArray(value)) return value.some(containsForbiddenValue);
  if (value && typeof value === 'object') return Object.values(value).some(containsForbiddenValue);
  return false;
}

function uniqueCommands(commands: Array<z.infer<typeof ReleaseEvidenceCommandSchema>>) {
  const seen = new Set<string>();
  return commands.filter((command) => {
    if (seen.has(command.key)) return false;
    seen.add(command.key);
    return true;
  });
}

function findCheck(launchReadiness: LaunchReadinessSummary, key: LaunchReadinessCheck['key']) {
  return launchReadiness.tracks.flatMap((track) => track.checks).find((check) => check.key === key);
}

function artifactStatus(check?: LaunchReadinessCheck): z.infer<typeof ReleaseEvidenceArtifactSchema>['status'] {
  if (check?.status === 'ready') return 'ready';
  if (check?.status === 'blocked') return 'blocked';
  return 'needed';
}

function joinedArtifactStatus(checks: Array<LaunchReadinessCheck | undefined>): z.infer<typeof ReleaseEvidenceArtifactSchema>['status'] {
  if (checks.every((check) => check?.status === 'ready')) return 'ready';
  if (checks.some((check) => check?.status === 'blocked')) return 'blocked';
  return 'needed';
}

export function assertReleaseEvidencePacketIsShareSafe(packet: ReleaseEvidencePacket) {
  if (containsForbiddenValue(packet)) {
    throw new Error('Release evidence packet contains credential values, local paths, raw artifacts, or token-like data.');
  }
  return packet;
}

export function buildReleaseEvidencePacket({
  evidenceCollectionPlan,
  generatedAt = new Date().toISOString(),
  launchReadiness,
  modelEvidence,
  nativeQaRunbookPacket,
  providerReadiness,
  releaseUnblockPacket,
}: {
  evidenceCollectionPlan: EvidenceCollectionPlan;
  generatedAt?: string;
  launchReadiness: LaunchReadinessSummary;
  modelEvidence: ModelEvidenceSummary;
  nativeQaRunbookPacket: NativeQaRunbookPacket;
  providerReadiness: ProviderReadinessSummary;
  releaseUnblockPacket: ReleaseUnblockPacket;
}): ReleaseEvidencePacket {
  const commands = uniqueCommands([
    {
      command: 'npm run release:check',
      key: 'release-check',
      label: 'Local release gate',
      owner: 'engineering',
      purpose: 'Refresh typecheck, tests, model reports, native runbook, iOS toolchain report, web export, EAS standard check, and audit evidence.',
    },
    {
      command: 'npm run native:ios:doctor',
      key: 'ios-toolchain-doctor',
      label: 'iOS toolchain doctor',
      owner: 'engineering',
      purpose: 'Refresh full-Xcode, workspace, Pods, and build-settings readiness before iOS beta or store work.',
    },
    {
      command: 'npm run release:env:doctor',
      key: 'env-template-doctor',
      label: 'Environment template doctor',
      owner: 'engineering',
      purpose: 'Verify .env.example covers runtime, smoke, and release key names without credential values or local paths.',
    },
    {
      command: 'npm run release:credentials:doctor',
      key: 'store-credentials-doctor',
      label: 'Store credentials doctor',
      owner: 'release',
      purpose: 'Refresh Expo, App Store Connect, and Google Play credential presence without exposing secret values.',
    },
    {
      command: 'npm run feature:doctor',
      key: 'feature-completion-doctor',
      label: 'Feature completion doctor',
      owner: 'engineering',
      purpose: 'Refresh task, backlog, traceability, and launch-readiness drift while separating internal gaps from external blockers.',
    },
    {
      command: 'npm run release:blocker-issues',
      key: 'release-blocker-issues',
      label: 'Release blocker issue report',
      owner: 'release',
      purpose: 'Generate issue-ready drafts for every external release blocker without filing issues or exposing secrets.',
    },
    {
      command: 'npm run release:blocker-issues:file',
      key: 'release-blocker-issue-filing',
      label: 'Release blocker issue filing plan',
      owner: 'release',
      purpose: 'Generate a dry-run GitHub issue filing plan, or explicitly file missing blocker issues after opt-in.',
    },
    {
      command: 'npm run release:freshness:doctor',
      key: 'release-freshness-doctor',
      label: 'Release evidence freshness doctor',
      owner: 'release',
      purpose: 'Verify generated release reports are recent enough before handoff, beta, or store work.',
    },
    {
      command: 'npm run model:verification:suite',
      key: 'model-verification-suite',
      label: 'Model verification suite',
      owner: 'engineering',
      purpose: 'Aggregate MoveNet runtime, replay, wall-angle, cue, metric, privacy, and real-validation readiness evidence.',
    },
    {
      command: 'npm run model:movenet:assets:check',
      key: 'movenet-static-assets',
      label: 'MoveNet static assets doctor',
      owner: 'engineering',
      purpose: 'Verify vendored same-origin MoveNet graph and weight shards are present in public and exported PWA assets.',
    },
    {
      command: 'npm run model:assets:provenance',
      key: 'model-asset-provenance',
      label: 'Model asset provenance doctor',
      owner: 'release',
      purpose: 'Verify vendored model source URLs, file hashes, attribution notice, and commercial license-review status before distribution.',
    },
    {
      command: 'npm run validation:cue:doctor',
      key: 'cue-validation-doctor',
      label: 'Cue validation dataset doctor',
      owner: 'product',
      purpose: 'Refresh missing, malformed, or incomplete cue-validation dataset evidence without inventing coach review data.',
    },
    {
      command: 'npm run native:qa:runbook',
      key: 'native-qa-runbook',
      label: 'Native QA runbook',
      owner: 'qa',
      purpose: 'Generate the physical-device workflow packet and blocked draft evidence template.',
    },
    {
      command: 'npm run native:qa:validate',
      key: 'native-qa-validate',
      label: 'Native QA validator',
      owner: 'qa',
      purpose: 'Validate measured iOS and Android device evidence after real runs are captured.',
    },
    {
      command: 'npm run validation:cue',
      key: 'cue-validation',
      label: 'Cue validation gate',
      owner: 'product',
      purpose: 'Validate real consented climbing clips and coach review rows before production movement-quality claims.',
    },
    {
      command: 'npm run release:eas:strict',
      key: 'eas-strict',
      label: 'Strict EAS release gate',
      owner: 'release',
      purpose: 'Verify Expo, Apple, and Google submission credentials before TestFlight, Play, or production submission.',
    },
  ]);
  const artifacts = [
    {
      command: 'npm run release:check',
      key: 'release-gate-report',
      label: 'Release gate report',
      path: 'docs/sdlc/release-gate-report.json',
      status: artifactStatus(findCheck(launchReadiness, 'releaseGate')),
    },
    {
      command: 'npm run release:env:doctor',
      key: 'env-template-report',
      label: 'Environment template report',
      path: 'docs/sdlc/env-template-report.json',
      status: artifactStatus(findCheck(launchReadiness, 'releaseGate')),
    },
    {
      command: 'npm run native:ios:doctor',
      key: 'ios-toolchain-report',
      label: 'iOS toolchain report',
      path: 'docs/sdlc/ios-toolchain-report.json',
      status: artifactStatus(findCheck(launchReadiness, 'iosBuild')),
    },
    {
      command: 'npm run release:credentials:doctor',
      key: 'store-credentials-report',
      label: 'Store credentials report',
      path: 'docs/sdlc/store-credentials-report.json',
      status: joinedArtifactStatus([findCheck(launchReadiness, 'easProject'), findCheck(launchReadiness, 'easCredentials')]),
    },
    {
      command: 'npm run native:qa:validate',
      key: 'native-qa-evidence',
      label: 'Native QA evidence',
      path: 'docs/sdlc/native-qa-evidence.json',
      status: artifactStatus(findCheck(launchReadiness, 'nativeDeviceQa')),
    },
    {
      command: 'npm run validation:cue:doctor',
      key: 'cue-validation-dataset-report',
      label: 'Cue validation dataset report',
      path: 'docs/sdlc/cue-validation-dataset-report.json',
      status: artifactStatus(findCheck(launchReadiness, 'cueValidationDataset')),
    },
    {
      command: 'npm run validation:cue',
      key: 'cue-validation-dataset',
      label: 'Cue validation dataset',
      path: 'docs/validation/cue-validation-dataset.json',
      status: artifactStatus(findCheck(launchReadiness, 'cueValidationDataset')),
    },
    {
      command: 'npm run release:readiness',
      key: 'launch-readiness-report',
      label: 'Launch readiness report',
      path: 'docs/sdlc/launch-readiness-report.json',
      status: launchReadiness.status === 'ready' ? 'ready' : 'blocked',
    },
    {
      command: 'npm run feature:doctor',
      key: 'feature-completion-report',
      label: 'Feature completion report',
      path: 'docs/sdlc/feature-completion-report.json',
      status: launchReadiness.status === 'ready' ? 'ready' : 'blocked',
    },
    {
      command: 'npm run release:blocker-issues',
      key: 'release-blocker-issues-report',
      label: 'Release blocker issues report',
      path: 'docs/sdlc/release-blocker-issues-report.json',
      status: releaseUnblockPacket.summary.blockedItems > 0 ? 'blocked' : 'ready',
    },
    {
      command: 'npm run release:blocker-issues:file',
      key: 'release-blocker-issue-filing-plan',
      label: 'Release blocker issue filing plan',
      path: 'docs/sdlc/release-blocker-issue-filing-plan.json',
      status: releaseUnblockPacket.summary.blockedItems > 0 ? 'blocked' : 'ready',
    },
    {
      command: 'npm run release:freshness:doctor',
      key: 'release-freshness-report',
      label: 'Release evidence freshness report',
      path: 'docs/sdlc/release-freshness-report.json',
      status: artifactStatus(findCheck(launchReadiness, 'releaseGate')),
    },
    {
      command: 'npm run model:verification:suite',
      key: 'model-verification-suite-report',
      label: 'Model verification suite report',
      path: 'docs/sdlc/model-verification-suite-report.json',
      status: artifactStatus(findCheck(launchReadiness, 'modelAnalysisReplay')),
    },
    {
      command: 'npm run model:movenet:assets:check',
      key: 'movenet-static-assets-report',
      label: 'MoveNet static assets report',
      path: 'docs/sdlc/movenet-static-assets-report.json',
      status: artifactStatus(findCheck(launchReadiness, 'modelReadiness')),
    },
    {
      command: 'npm run model:assets:provenance',
      key: 'model-asset-provenance-report',
      label: 'Model asset provenance report',
      path: 'docs/sdlc/model-asset-provenance-report.json',
      status: artifactStatus(findCheck(launchReadiness, 'modelReadiness')),
    },
  ];
  const status =
    launchReadiness.status === 'ready' && releaseUnblockPacket.summary.status === 'ready' ? 'ready' : 'needs-external-evidence';
  const packet = ReleaseEvidencePacketSchema.parse({
    artifacts,
    commands,
    evidenceCollectionPlan,
    generatedAt,
    launchReadiness,
    modelEvidence,
    nativeQaRunbookPacket,
    privacy: {
      credentialValuesIncluded: false,
      localPathsIncluded: false,
      rawArtifactsIncluded: false,
      rawVideoIncluded: false,
      secretsIncluded: false,
    },
    providerReadiness,
    releaseUnblockPacket,
    schemaVersion: releaseEvidencePacketSchemaVersion,
    summary: {
      artifactCount: artifacts.length,
      blockerCount: releaseUnblockPacket.summary.blockedItems,
      commandCount: commands.length,
      externalEvidenceCount: evidenceCollectionPlan.externalEvidence.length,
      nextAction: launchReadiness.nextAction,
      readyTracks: launchReadiness.readyTracks,
      status,
      totalTracks: launchReadiness.tracks.length,
    },
  });

  return assertReleaseEvidencePacketIsShareSafe(packet);
}
