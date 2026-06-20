import { z } from 'zod';

import {
  buildLaunchReadinessSummary,
  defaultLaunchReadinessEvidence,
  LaunchReadinessCheckKeySchema,
  LaunchReadinessEvidenceSchema,
  LaunchStatusSchema,
  LaunchTrackSchema,
  type LaunchReadinessCheck,
  type LaunchReadinessEvidence,
} from './launchReadiness';
import { validateNativeQaEvidenceForApp, type NativeQaEvidencePayload } from './nativeQaEvidenceValidation';

export const releaseEvidenceReconciliationSchemaVersion = 'movebeta.release-evidence-reconciliation.v1';
export const releaseEvidenceReconciliationInputSchemaVersion = 'movebeta.release-evidence-reconciliation-input.v1';

const ReconciliationImportStatusSchema = z.enum(['ready', 'blocked', 'missing', 'invalid']);

export const ReleaseEvidenceReconciliationItemSchema = z.object({
  action: z.string(),
  command: z.string(),
  currentStatus: LaunchStatusSchema,
  detail: z.string(),
  importedStatus: ReconciliationImportStatusSchema,
  key: LaunchReadinessCheckKeySchema,
  label: z.string(),
  owner: z.enum(['engineering', 'qa', 'product', 'release']),
  proof: z.array(z.string()).min(1),
  source: z.string(),
  tracks: z.array(LaunchTrackSchema).min(1),
  wouldClear: z.boolean(),
});

export const ReleaseEvidenceReconciliationSchema = z.object({
  generatedAt: z.string(),
  items: z.array(ReleaseEvidenceReconciliationItemSchema),
  parseError: z.string().optional(),
  privacy: z.object({
    credentialValuesIncluded: z.literal(false),
    localPathsIncluded: z.literal(false),
    rawArtifactsIncluded: z.literal(false),
    tokenLikeValuesIncluded: z.literal(false),
  }),
  schemaVersion: z.literal(releaseEvidenceReconciliationSchemaVersion),
  summary: z.object({
    blockerCount: z.number().int().nonnegative(),
    clearedBlockerCount: z.number().int().nonnegative(),
    currentReadyTracks: z.number().int().nonnegative(),
    invalidEvidenceCount: z.number().int().nonnegative(),
    missingProofCount: z.number().int().nonnegative(),
    nextAction: z.string(),
    projectedReadyTracks: z.number().int().nonnegative(),
    status: z.enum(['blocked', 'invalid-evidence', 'ready', 'would-improve']),
    totalTracks: z.number().int().positive(),
  }),
});

export type ReleaseEvidenceReconciliation = z.infer<typeof ReleaseEvidenceReconciliationSchema>;
export type ReleaseEvidenceReconciliationItem = z.infer<typeof ReleaseEvidenceReconciliationItemSchema>;
export type ReleaseEvidenceReconciliationImportStatus = z.infer<typeof ReconciliationImportStatusSchema>;

export type ReleaseEvidenceReconciliationBundle = {
  cueValidationDatasetReport?: unknown;
  iosToolchainReport?: unknown;
  nativeQaEvidence?: unknown;
  storeCredentialsReport?: unknown;
};

export type ReleaseEvidenceReconciliationInputPreview = {
  bundle: ReleaseEvidenceReconciliationBundle;
  parseError?: string;
  schemaVersion: typeof releaseEvidenceReconciliationInputSchemaVersion;
  status: 'empty' | 'invalid-json' | 'parsed';
};

type EvidenceCheckKey = Extract<
  LaunchReadinessCheck['key'],
  'cueValidationDataset' | 'easCredentials' | 'easProject' | 'iosBuild' | 'nativeDeviceQa'
>;

type ReconciliationConfig = {
  command: string;
  proof: string[];
  source: keyof ReleaseEvidenceReconciliationBundle;
};

type EvidenceEvaluation = {
  detail: string;
  source: string;
  status: ReleaseEvidenceReconciliationImportStatus;
};

const reconciliationKeys: EvidenceCheckKey[] = [
  'iosBuild',
  'nativeDeviceQa',
  'cueValidationDataset',
  'easProject',
  'easCredentials',
];

const reconciliationConfigs: Record<EvidenceCheckKey, ReconciliationConfig> = {
  cueValidationDataset: {
    command: 'npm run validation:cue:doctor',
    proof: ['docs/sdlc/cue-validation-dataset-report.json', 'docs/validation/cue-validation-dataset.json'],
    source: 'cueValidationDatasetReport',
  },
  easCredentials: {
    command: 'npm run release:credentials:doctor',
    proof: ['docs/sdlc/store-credentials-report.json'],
    source: 'storeCredentialsReport',
  },
  easProject: {
    command: 'npm run release:credentials:doctor',
    proof: ['docs/sdlc/store-credentials-report.json'],
    source: 'storeCredentialsReport',
  },
  iosBuild: {
    command: 'npm run native:ios:doctor',
    proof: ['docs/sdlc/ios-toolchain-report.json'],
    source: 'iosToolchainReport',
  },
  nativeDeviceQa: {
    command: 'npm run native:qa:validate',
    proof: ['docs/sdlc/native-qa-evidence.json'],
    source: 'nativeQaEvidence',
  },
};

const forbiddenCredentialEnvKeys = new Set([
  'ASC_API_ISSUER_ID',
  'ASC_API_KEY_ID',
  'ASC_API_KEY_P8_BASE64',
  'EXPO_TOKEN',
  'GOOGLE_SERVICE_ACCOUNT_JSON',
  'GOOGLE_SERVICE_ACCOUNT_KEY_PATH',
  'MOVEBETA_APPLE_ID',
  'MOVEBETA_ASC_APP_ID',
  'MOVEBETA_GOOGLE_SERVICE_ACCOUNT_JSON_BASE64',
]);

const unsafeEvidenceValuePattern =
  /(file:\/\/|content:\/\/|asset:\/\/|ph:\/\/|\/Users\/|\/private\/|\/var\/mobile\/|[A-Za-z]:\\|\.mov\b|\.mp4\b|BEGIN [A-Z ]*PRIVATE KEY|github_pat_[A-Za-z0-9_]+|ghp_[A-Za-z0-9_]+|pat_[A-Za-z0-9_]+|sk_live_[A-Za-z0-9_]+|sk_test_[A-Za-z0-9_]+|eyJ[A-Za-z0-9_-]{20,})/i;

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function hasText(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

function hasSchema(value: unknown, schemaVersion: string): value is Record<string, unknown> & { schemaVersion: string } {
  return isRecord(value) && value.schemaVersion === schemaVersion;
}

function containsUnsafeEvidenceValue(value: unknown, path: string[] = []): boolean {
  if (value == null) return false;

  if (typeof value === 'string') {
    const key = path[path.length - 1];
    if (key && forbiddenCredentialEnvKeys.has(key) && value.trim().length > 0) return true;
    return unsafeEvidenceValuePattern.test(value);
  }

  if (Array.isArray(value)) {
    return value.some((item, index) => containsUnsafeEvidenceValue(item, [...path, String(index)]));
  }

  if (typeof value === 'object') {
    return Object.entries(value).some(([key, item]) => {
      if (forbiddenCredentialEnvKeys.has(key) && hasText(item)) return true;
      return containsUnsafeEvidenceValue(item, [...path, key]);
    });
  }

  return false;
}

function inferSingleReport(value: unknown): ReleaseEvidenceReconciliationBundle {
  if (Array.isArray(value)) {
    return value.reduce<ReleaseEvidenceReconciliationBundle>(
      (bundle, item) => ({ ...bundle, ...inferSingleReport(item) }),
      {},
    );
  }

  if (!isRecord(value)) return {};

  if (
    'cueValidationDatasetReport' in value ||
    'iosToolchainReport' in value ||
    'nativeQaEvidence' in value ||
    'storeCredentialsReport' in value
  ) {
    return {
      cueValidationDatasetReport: value.cueValidationDatasetReport,
      iosToolchainReport: value.iosToolchainReport,
      nativeQaEvidence: value.nativeQaEvidence,
      storeCredentialsReport: value.storeCredentialsReport,
    };
  }

  if (Array.isArray(value.reports)) {
    return inferSingleReport(value.reports);
  }

  if (hasSchema(value, 'movebeta.cue-validation-dataset-report.v1')) {
    return { cueValidationDatasetReport: value };
  }

  if (hasSchema(value, 'movebeta.ios-toolchain-report.v1')) {
    return { iosToolchainReport: value };
  }

  if (hasSchema(value, 'movebeta.store-credentials-report.v1')) {
    return { storeCredentialsReport: value };
  }

  if (Array.isArray(value.runs)) {
    return { nativeQaEvidence: value };
  }

  if (isRecord(value.payload) && Array.isArray(value.payload.runs)) {
    return { nativeQaEvidence: value.payload };
  }

  return {};
}

function readyCueValidationDatasetReport(report: unknown): EvidenceEvaluation {
  if (report === undefined) {
    return { detail: 'No cue-validation dataset report was provided.', source: 'cueValidationDatasetReport', status: 'missing' };
  }

  if (!hasSchema(report, 'movebeta.cue-validation-dataset-report.v1')) {
    return { detail: 'Expected movebeta.cue-validation-dataset-report.v1.', source: 'cueValidationDatasetReport', status: 'invalid' };
  }

  const summary = isRecord(report.summary) ? report.summary : {};
  const privacy = isRecord(report.privacy) ? report.privacy : {};
  const ready =
    report.status === 'ready' &&
    summary.ready === true &&
    Number(summary.clipCount ?? 0) > 0 &&
    Number(summary.reviewCount ?? 0) > 0 &&
    Number(summary.failedChecks ?? 0) === 0 &&
    privacy.rawArtifactsIncluded === false &&
    privacy.reviewerIdentitiesIncluded === false;

  return {
    detail: ready
      ? `${summary.clipCount} clips and ${summary.reviewCount} coach review rows are ready.`
      : 'Cue dataset proof is still blocked, incomplete, or not share-safe.',
    source: 'cueValidationDatasetReport',
    status: ready ? 'ready' : 'blocked',
  };
}

function readyIosToolchainReport(report: unknown): EvidenceEvaluation {
  if (report === undefined) {
    return { detail: 'No iOS toolchain report was provided.', source: 'iosToolchainReport', status: 'missing' };
  }

  if (!hasSchema(report, 'movebeta.ios-toolchain-report.v1')) {
    return { detail: 'Expected movebeta.ios-toolchain-report.v1.', source: 'iosToolchainReport', status: 'invalid' };
  }

  const summary = isRecord(report.summary) ? report.summary : {};
  const ready =
    report.status === 'ready' &&
    summary.fullXcode === true &&
    summary.workspaceExists === true &&
    summary.podsInstalled === true &&
    summary.xcodebuildAvailable === true &&
    summary.buildSettingsProbe === 'pass';

  return {
    detail: ready
      ? 'Full Xcode, workspace, Pods, and build-settings probe are ready.'
      : 'iOS toolchain proof still needs full Xcode, workspace, Pods, or build-settings evidence.',
    source: 'iosToolchainReport',
    status: ready ? 'ready' : 'blocked',
  };
}

function readyNativeQaEvidence(evidence: unknown): EvidenceEvaluation {
  if (evidence === undefined) {
    return { detail: 'No native QA evidence payload was provided.', source: 'nativeQaEvidence', status: 'missing' };
  }

  if (!isRecord(evidence) || !Array.isArray(evidence.runs)) {
    return { detail: 'Expected native QA evidence with physical-device runs.', source: 'nativeQaEvidence', status: 'invalid' };
  }

  const validation = validateNativeQaEvidenceForApp(evidence as NativeQaEvidencePayload);
  const readyRuns = validation.runSummaries.filter((run) => run.status === 'pass').length;

  return {
    detail: validation.ready
      ? `${readyRuns}/${validation.runSummaries.length} physical-device runs pass.`
      : `${validation.failedChecks.length} native QA checks still block release evidence.`,
    source: 'nativeQaEvidence',
    status: validation.ready ? 'ready' : 'blocked',
  };
}

function storeCredentialsEvaluation(report: unknown, key: Extract<EvidenceCheckKey, 'easCredentials' | 'easProject'>): EvidenceEvaluation {
  if (report === undefined) {
    return { detail: 'No store credentials report was provided.', source: 'storeCredentialsReport', status: 'missing' };
  }

  if (!hasSchema(report, 'movebeta.store-credentials-report.v1')) {
    return { detail: 'Expected movebeta.store-credentials-report.v1.', source: 'storeCredentialsReport', status: 'invalid' };
  }

  const summary = isRecord(report.summary) ? report.summary : {};
  const privacy = isRecord(report.privacy) ? report.privacy : {};
  const shareSafe =
    privacy.credentialValuesIncluded === false && privacy.localPathsIncluded === false && privacy.secretsIncluded === false;
  const ready = key === 'easProject' ? summary.easProjectReady === true : summary.easCredentialsReady === true;

  return {
    detail: ready && shareSafe
      ? key === 'easProject'
        ? 'EAS project binding is confirmed without credential values.'
        : 'EAS, App Store Connect, and Google Play credential groups are confirmed without secret values.'
      : key === 'easProject'
        ? 'EAS project binding is still missing or the report is not share-safe.'
        : 'Store credential proof is still incomplete or the report is not share-safe.',
    source: 'storeCredentialsReport',
    status: ready && shareSafe ? 'ready' : 'blocked',
  };
}

function evaluateKey(key: EvidenceCheckKey, bundle: ReleaseEvidenceReconciliationBundle): EvidenceEvaluation {
  if (key === 'cueValidationDataset') return readyCueValidationDatasetReport(bundle.cueValidationDatasetReport);
  if (key === 'iosBuild') return readyIosToolchainReport(bundle.iosToolchainReport);
  if (key === 'nativeDeviceQa') return readyNativeQaEvidence(bundle.nativeQaEvidence);
  return storeCredentialsEvaluation(bundle.storeCredentialsReport, key);
}

function tracksForCheck(key: LaunchReadinessCheck['key'], evidence: LaunchReadinessEvidence) {
  return buildLaunchReadinessSummary(evidence).tracks
    .filter((track) => track.checks.some((check) => check.key === key))
    .map((track) => track.key);
}

function checkForKey(key: LaunchReadinessCheck['key'], evidence: LaunchReadinessEvidence) {
  return buildLaunchReadinessSummary(evidence).tracks.flatMap((track) => track.checks).find((check) => check.key === key);
}

function nextActionForStatus(status: ReleaseEvidenceReconciliation['summary']['status'], items: ReleaseEvidenceReconciliationItem[]) {
  if (status === 'invalid-evidence') return 'Remove raw paths, videos, token-like values, or malformed report JSON before using this evidence.';
  if (status === 'ready') return 'Imported evidence would clear every configured launch blocker.';
  if (status === 'would-improve') return 'Promote the cleared proof files, then rerun launch readiness to refresh the release gate.';
  return items.find((item) => item.currentStatus !== 'ready')?.action ?? 'Collect the remaining external proof files.';
}

export function parseReleaseEvidenceReconciliationInput(input: string): ReleaseEvidenceReconciliationInputPreview {
  const trimmed = input.trim();

  if (trimmed.length === 0) {
    return {
      bundle: {},
      schemaVersion: releaseEvidenceReconciliationInputSchemaVersion,
      status: 'empty',
    };
  }

  try {
    return {
      bundle: inferSingleReport(JSON.parse(trimmed)),
      schemaVersion: releaseEvidenceReconciliationInputSchemaVersion,
      status: 'parsed',
    };
  } catch (error) {
    return {
      bundle: {},
      parseError: error instanceof Error ? error.message : 'Evidence JSON could not be parsed.',
      schemaVersion: releaseEvidenceReconciliationInputSchemaVersion,
      status: 'invalid-json',
    };
  }
}

export function assertReleaseEvidenceReconciliationIsShareSafe(packet: ReleaseEvidenceReconciliation) {
  if (
    packet.privacy.credentialValuesIncluded ||
    packet.privacy.localPathsIncluded ||
    packet.privacy.rawArtifactsIncluded ||
    packet.privacy.tokenLikeValuesIncluded ||
    containsUnsafeEvidenceValue(packet)
  ) {
    throw new Error('Release evidence reconciliation contains credential values, local paths, raw artifacts, or token-like data.');
  }
  return packet;
}

export function buildReleaseEvidenceReconciliation({
  currentEvidence = defaultLaunchReadinessEvidence,
  generatedAt = new Date().toISOString(),
  importedEvidence = {},
  parseError,
}: {
  currentEvidence?: LaunchReadinessEvidence;
  generatedAt?: string;
  importedEvidence?: ReleaseEvidenceReconciliationBundle;
  parseError?: string;
} = {}): ReleaseEvidenceReconciliation {
  const evidence = LaunchReadinessEvidenceSchema.parse(currentEvidence);
  const currentReadiness = buildLaunchReadinessSummary(evidence);
  const unsafeImport = containsUnsafeEvidenceValue(importedEvidence);
  const projectedEvidence: LaunchReadinessEvidence = { ...evidence };

  const items = reconciliationKeys.map((key) => {
    const check = checkForKey(key, evidence);
    const config = reconciliationConfigs[key];
    const evaluation = unsafeImport || parseError ? {
      detail: parseError ?? 'Imported evidence contains raw artifacts, local paths, credential values, or token-like strings.',
      source: config.source,
      status: 'invalid' as const,
    } : evaluateKey(key, importedEvidence);
    const wouldClear = check?.status !== 'ready' && evaluation.status === 'ready';

    if (evaluation.status === 'ready') {
      projectedEvidence[key] = true;
    }

    return ReleaseEvidenceReconciliationItemSchema.parse({
      action: check?.action ?? 'Refresh launch readiness after evidence import.',
      command: config.command,
      currentStatus: check?.status ?? 'blocked',
      detail: evaluation.detail,
      importedStatus: evaluation.status,
      key,
      label: check?.label ?? key,
      owner: check?.owner ?? 'release',
      proof: config.proof,
      source: evaluation.source,
      tracks: tracksForCheck(key, evidence),
      wouldClear,
    });
  });

  const projectedReadiness = buildLaunchReadinessSummary(projectedEvidence);
  const blockerCount = items.filter((item) => item.currentStatus !== 'ready').length;
  const clearedBlockerCount = items.filter((item) => item.wouldClear).length;
  const invalidEvidenceCount = items.filter((item) => item.importedStatus === 'invalid').length;
  const missingProofCount = items.filter((item) => item.currentStatus !== 'ready' && item.importedStatus !== 'ready').length;
  const status =
    invalidEvidenceCount > 0
      ? 'invalid-evidence'
      : projectedReadiness.status === 'ready'
        ? 'ready'
        : clearedBlockerCount > 0
          ? 'would-improve'
          : 'blocked';

  return ReleaseEvidenceReconciliationSchema.parse({
    generatedAt,
    items,
    parseError,
    privacy: {
      credentialValuesIncluded: false,
      localPathsIncluded: false,
      rawArtifactsIncluded: false,
      tokenLikeValuesIncluded: false,
    },
    schemaVersion: releaseEvidenceReconciliationSchemaVersion,
    summary: {
      blockerCount,
      clearedBlockerCount,
      currentReadyTracks: currentReadiness.readyTracks,
      invalidEvidenceCount,
      missingProofCount,
      nextAction: nextActionForStatus(status, items),
      projectedReadyTracks: projectedReadiness.readyTracks,
      status,
      totalTracks: currentReadiness.tracks.length,
    },
  });
}
