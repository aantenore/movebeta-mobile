import { z } from 'zod';

import {
  buildReleaseUnblockChecklist,
  ReleaseUnblockChecklistSchema,
  type ReleaseUnblockChecklist,
  type ReleaseUnblockChecklistItem,
} from './releaseUnblockChecklist';
import {
  defaultLaunchReadinessEvidence,
  LaunchReadinessCheckKeySchema,
  LaunchReadinessEvidenceSchema,
  LaunchStatusSchema,
  LaunchTrackSchema,
  type LaunchReadinessEvidence,
} from './launchReadiness';

export const externalEvidenceIntakeSchemaVersion = 'movebeta.external-evidence-intake.v1';
export const externalEvidenceIntakeTemplateSchemaVersion = 'movebeta.external-evidence-intake-template.v1';
export const externalEvidenceValidationReportSchemaVersion = 'movebeta.external-evidence-validation-report.v1';
export const externalEvidencePromotionReportSchemaVersion = 'movebeta.external-evidence-promotion-report.v1';
export const externalEvidenceApplyReportSchemaVersion = 'movebeta.external-evidence-apply-report.v1';

const IntakeOwnerSchema = z.enum(['engineering', 'qa', 'product', 'release']);
const IntakeStatusSchema = z.enum(['ready', 'needs-evidence']);
const ExternalEvidenceReferenceTypeSchema = z.enum(['relative-path', 'report-id', 'issue-url', 'ci-run-url', 'store-console-state']);

const ExternalEvidenceIntakeProofSchema = z.object({
  acceptedReferenceTypes: z.array(ExternalEvidenceReferenceTypeSchema),
  evidenceReference: z.literal(''),
  evidenceReferenceType: z.literal(''),
  expectedProof: z.string().min(1),
  notes: z.literal(''),
  status: z.literal('missing'),
});

const ExternalEvidenceIntakeItemSchema = z.object({
  acceptance: z.array(z.string()).min(1),
  commands: z.array(z.string()).min(1),
  envKeys: z.array(z.string()),
  key: z.string().min(1),
  label: z.string().min(1),
  owner: IntakeOwnerSchema,
  proof: z.array(ExternalEvidenceIntakeProofSchema).min(1),
  secretPolicy: z.string().min(1),
  sourceStatus: LaunchStatusSchema,
  tracks: z.array(LaunchTrackSchema).min(1),
});

export const ExternalEvidenceIntakeTemplateSchema = z.object({
  generatedAt: z.string(),
  instructions: z.array(z.string()).min(1),
  items: z.array(ExternalEvidenceIntakeItemSchema),
  privacy: z.object({
    credentialValuesIncluded: z.literal(false),
    localPathsIncluded: z.literal(false),
    rawArtifactsIncluded: z.literal(false),
    rawVideoIncluded: z.literal(false),
    tokenLikeValuesIncluded: z.literal(false),
  }),
  schemaVersion: z.literal(externalEvidenceIntakeTemplateSchemaVersion),
});

export const ExternalEvidenceIntakeReportSchema = z.object({
  generatedAt: z.string(),
  intakeTemplate: ExternalEvidenceIntakeTemplateSchema,
  privacy: z.object({
    credentialValuesIncluded: z.literal(false),
    localPathsIncluded: z.literal(false),
    rawArtifactsIncluded: z.literal(false),
    rawVideoIncluded: z.literal(false),
    tokenLikeValuesIncluded: z.literal(false),
  }),
  schemaVersion: z.literal(externalEvidenceIntakeSchemaVersion),
  sourceChecklist: ReleaseUnblockChecklistSchema,
  summary: z.object({
    commandCount: z.number().int().nonnegative(),
    intakeItemCount: z.number().int().nonnegative(),
    nextAction: z.string(),
    ownerCount: z.number().int().nonnegative(),
    proofReferenceCount: z.number().int().nonnegative(),
    status: IntakeStatusSchema,
  }),
});

const ExternalEvidenceFilledProofSchema = z.object({
  acceptedReferenceTypes: z.array(ExternalEvidenceReferenceTypeSchema).min(1),
  evidenceReference: z.string(),
  evidenceReferenceType: z.union([ExternalEvidenceReferenceTypeSchema, z.literal('')]),
  expectedProof: z.string().min(1),
  notes: z.string(),
  status: z.union([z.literal('missing'), z.literal('provided')]),
});

const ExternalEvidenceFilledItemSchema = ExternalEvidenceIntakeItemSchema.omit({ proof: true }).extend({
  proof: z.array(ExternalEvidenceFilledProofSchema).min(1),
});

export const ExternalEvidenceFilledIntakeSchema = ExternalEvidenceIntakeTemplateSchema.omit({
  items: true,
  schemaVersion: true,
}).extend({
  items: z.array(ExternalEvidenceFilledItemSchema),
  schemaVersion: z.union([
    z.literal(externalEvidenceIntakeTemplateSchemaVersion),
    z.literal('movebeta.external-evidence-filled-intake.v1'),
  ]),
});

const ExternalEvidenceValidationStatusSchema = z.enum(['ready', 'needs-evidence', 'invalid']);
const ExternalEvidencePromotionStatusSchema = z.enum(['ready-to-apply', 'needs-evidence', 'invalid']);
const ExternalEvidenceApplyStatusSchema = z.enum(['applied', 'ready-to-apply', 'needs-evidence', 'invalid']);

export const ExternalEvidenceValidationReportSchema = z.object({
  checks: z.array(
    z.object({
      detail: z.string(),
      expectedProof: z.string(),
      id: z.string(),
      itemKey: z.string(),
      label: z.string(),
      referenceType: z.union([ExternalEvidenceReferenceTypeSchema, z.literal('')]),
      status: z.enum(['pass', 'fail']),
    }),
  ),
  generatedAt: z.string(),
  nextAction: z.string(),
  privacy: z.object({
    credentialValuesIncluded: z.literal(false),
    localPathsIncluded: z.literal(false),
    rawArtifactsIncluded: z.literal(false),
    rawVideoIncluded: z.literal(false),
    tokenLikeValuesIncluded: z.literal(false),
  }),
  schemaVersion: z.literal(externalEvidenceValidationReportSchemaVersion),
  status: ExternalEvidenceValidationStatusSchema,
  summary: z.object({
    acceptedProofs: z.number().int().nonnegative(),
    failedChecks: z.number().int().nonnegative(),
    intakeItemCount: z.number().int().nonnegative(),
    missingProofs: z.number().int().nonnegative(),
    providedProofs: z.number().int().nonnegative(),
    requiredProofs: z.number().int().nonnegative(),
  }),
});

export const ExternalEvidencePromotionReportSchema = z.object({
  candidateEvidence: LaunchReadinessEvidenceSchema,
  generatedAt: z.string(),
  nextAction: z.string(),
  privacy: z.object({
    credentialValuesIncluded: z.literal(false),
    localPathsIncluded: z.literal(false),
    rawArtifactsIncluded: z.literal(false),
    rawVideoIncluded: z.literal(false),
    tokenLikeValuesIncluded: z.literal(false),
  }),
  promotedChecks: z.array(
    z.object({
      key: LaunchReadinessCheckKeySchema,
      label: z.string(),
      proofCount: z.number().int().nonnegative(),
      status: z.enum(['candidate-ready', 'blocked']),
    }),
  ),
  schemaVersion: z.literal(externalEvidencePromotionReportSchemaVersion),
  sourceValidation: ExternalEvidenceValidationReportSchema,
  status: ExternalEvidencePromotionStatusSchema,
  summary: z.object({
    blockedCheckCount: z.number().int().nonnegative(),
    candidateReady: z.boolean(),
    promotedCheckCount: z.number().int().nonnegative(),
    validationStatus: ExternalEvidenceValidationStatusSchema,
  }),
});

export const ExternalEvidenceApplyReportSchema = z.object({
  appConfigPath: z.string(),
  candidateEvidence: LaunchReadinessEvidenceSchema,
  generatedAt: z.string(),
  nextAction: z.string(),
  privacy: z.object({
    credentialValuesIncluded: z.literal(false),
    localPathsIncluded: z.literal(false),
    rawArtifactsIncluded: z.literal(false),
    rawVideoIncluded: z.literal(false),
    tokenLikeValuesIncluded: z.literal(false),
  }),
  schemaVersion: z.literal(externalEvidenceApplyReportSchemaVersion),
  sourcePromotion: ExternalEvidencePromotionReportSchema,
  status: ExternalEvidenceApplyStatusSchema,
  summary: z.object({
    applied: z.boolean(),
    appliedCheckCount: z.number().int().nonnegative(),
    blockedCheckCount: z.number().int().nonnegative(),
    candidateReady: z.boolean(),
    promotedCheckCount: z.number().int().nonnegative(),
    validationStatus: ExternalEvidenceValidationStatusSchema,
    writeRequested: z.boolean(),
  }),
});

export type ExternalEvidenceIntakeReport = z.infer<typeof ExternalEvidenceIntakeReportSchema>;
export type ExternalEvidenceIntakeTemplate = z.infer<typeof ExternalEvidenceIntakeTemplateSchema>;
export type ExternalEvidenceFilledIntake = z.infer<typeof ExternalEvidenceFilledIntakeSchema>;
export type ExternalEvidenceValidationReport = z.infer<typeof ExternalEvidenceValidationReportSchema>;
export type ExternalEvidencePromotionReport = z.infer<typeof ExternalEvidencePromotionReportSchema>;
export type ExternalEvidenceApplyReport = z.infer<typeof ExternalEvidenceApplyReportSchema>;

const forbiddenExternalEvidenceValuePattern =
  /(file:\/\/|content:\/\/|asset:\/\/|ph:\/\/|\/Users\/|\/private\/|\/var\/mobile\/|[A-Za-z]:\\|\.mov\b|\.mp4\b|rawVideoUri|videoUri|BEGIN PRIVATE KEY|ghp_[A-Za-z0-9_]+|github_pat_[A-Za-z0-9_]+|pat_[A-Za-z0-9_]+|sk_live_[A-Za-z0-9_]+|sk_test_[A-Za-z0-9_]+|bearer\s+[A-Za-z0-9._-]+|eyJ[A-Za-z0-9_-]{20,}|"private_key"\s*:|"client_email"\s*:)/i;

function containsForbiddenValue(value: unknown): boolean {
  if (typeof value === 'string') return forbiddenExternalEvidenceValuePattern.test(value);
  if (Array.isArray(value)) return value.some(containsForbiddenValue);
  if (value && typeof value === 'object') return Object.values(value).some(containsForbiddenValue);
  return false;
}

function acceptedReferenceTypes(item: ReleaseUnblockChecklistItem) {
  if (item.key === 'easProject' || item.key === 'easCredentials') {
    return ['report-id', 'issue-url', 'ci-run-url', 'store-console-state'] as const;
  }

  if (item.key === 'iosBuild') {
    return ['relative-path', 'issue-url', 'ci-run-url'] as const;
  }

  return ['relative-path', 'report-id', 'issue-url'] as const;
}

function buildTemplateItem(item: ReleaseUnblockChecklistItem): z.infer<typeof ExternalEvidenceIntakeItemSchema> {
  return ExternalEvidenceIntakeItemSchema.parse({
    acceptance: item.acceptance,
    commands: item.commands,
    envKeys: item.envKeys,
    key: item.key,
    label: item.label,
    owner: item.owner,
    proof: item.proof.map((expectedProof) => ({
      acceptedReferenceTypes: [...acceptedReferenceTypes(item)],
      evidenceReference: '',
      evidenceReferenceType: '',
      expectedProof,
      notes: '',
      status: 'missing',
    })),
    secretPolicy: item.secretPolicy,
    sourceStatus: item.status,
    tracks: item.tracks,
  });
}

export function assertExternalEvidenceIntakeIsShareSafe<T>(value: T) {
  if (containsForbiddenValue(value)) {
    throw new Error('External evidence intake contains credential values, local paths, raw artifacts, raw video references, or token-like data.');
  }
  return value;
}

export function buildExternalEvidenceIntakeReport({
  checklist,
  evidence,
  generatedAt = new Date().toISOString(),
}: {
  checklist?: ReleaseUnblockChecklist;
  evidence?: LaunchReadinessEvidence;
  generatedAt?: string;
} = {}): ExternalEvidenceIntakeReport {
  const sourceChecklist =
    checklist ?? buildReleaseUnblockChecklist(evidence ? LaunchReadinessEvidenceSchema.parse(evidence) : undefined);
  const items = sourceChecklist.items.map(buildTemplateItem);
  const proofReferenceCount = items.reduce((total, item) => total + item.proof.length, 0);
  const commandCount = items.reduce((total, item) => total + item.commands.length, 0);
  const ownerCount = new Set(items.map((item) => item.owner)).size;
  const status = items.length === 0 ? 'ready' : 'needs-evidence';
  const nextAction =
    status === 'ready'
      ? 'All external evidence intake items are cleared.'
      : 'Fill the template with share-safe references to real proof artifacts, then rerun release readiness checks.';

  const intakeTemplate = ExternalEvidenceIntakeTemplateSchema.parse({
    generatedAt,
    instructions: [
      'Use relative repository paths, issue URLs, CI run URLs, or provider-console state references only.',
      'Do not paste credential values, private keys, raw video paths, absolute local paths, reviewer identities, or raw local artifacts.',
      'After proof is collected, run the listed commands and regenerate release readiness, freshness, blocker issues, and handoff reports.',
    ],
    items,
    privacy: {
      credentialValuesIncluded: false,
      localPathsIncluded: false,
      rawArtifactsIncluded: false,
      rawVideoIncluded: false,
      tokenLikeValuesIncluded: false,
    },
    schemaVersion: externalEvidenceIntakeTemplateSchemaVersion,
  });

  const report = ExternalEvidenceIntakeReportSchema.parse({
    generatedAt,
    intakeTemplate,
    privacy: {
      credentialValuesIncluded: false,
      localPathsIncluded: false,
      rawArtifactsIncluded: false,
      rawVideoIncluded: false,
      tokenLikeValuesIncluded: false,
    },
    schemaVersion: externalEvidenceIntakeSchemaVersion,
    sourceChecklist,
    summary: {
      commandCount,
      intakeItemCount: items.length,
      nextAction,
      ownerCount,
      proofReferenceCount,
      status,
    },
  });

  return assertExternalEvidenceIntakeIsShareSafe(report);
}

function failCheck({
  detail,
  expectedProof,
  id,
  itemKey,
  label,
  referenceType,
}: {
  detail: string;
  expectedProof: string;
  id: string;
  itemKey: string;
  label: string;
  referenceType: z.infer<typeof ExternalEvidenceReferenceTypeSchema> | '';
}) {
  return {
    detail,
    expectedProof,
    id,
    itemKey,
    label,
    referenceType,
    status: 'fail' as const,
  };
}

function passCheck({
  detail,
  expectedProof,
  id,
  itemKey,
  label,
  referenceType,
}: {
  detail: string;
  expectedProof: string;
  id: string;
  itemKey: string;
  label: string;
  referenceType: z.infer<typeof ExternalEvidenceReferenceTypeSchema>;
}) {
  return {
    detail,
    expectedProof,
    id,
    itemKey,
    label,
    referenceType,
    status: 'pass' as const,
  };
}

function safeUrl(value: string) {
  try {
    const url = new URL(value);
    return url.protocol === 'https:' || url.protocol === 'http:' ? url : undefined;
  } catch {
    return undefined;
  }
}

function referenceTypeDetail(reference: string, referenceType: z.infer<typeof ExternalEvidenceReferenceTypeSchema>) {
  const trimmed = reference.trim();

  if (referenceType === 'relative-path') {
    if (/^https?:\/\//i.test(trimmed)) return 'Relative-path proof must not be a URL.';
    if (trimmed.startsWith('/') || trimmed.includes('\\') || trimmed.split('/').includes('..')) {
      return 'Relative-path proof must stay inside the repository and use forward slashes.';
    }
    if (!/^[A-Za-z0-9][A-Za-z0-9._/#:-]*$/.test(trimmed)) {
      return 'Relative-path proof contains unsupported characters.';
    }
    return undefined;
  }

  if (referenceType === 'report-id') {
    return /^[A-Za-z0-9][A-Za-z0-9._:/#=-]*$/.test(trimmed)
      ? undefined
      : 'Report-id proof must be a compact report identifier without spaces or raw values.';
  }

  if (referenceType === 'issue-url') {
    const url = safeUrl(trimmed);
    return url && url.hostname === 'github.com' && /\/issues\/\d+/.test(url.pathname)
      ? undefined
      : 'Issue URL proof must point to a GitHub issue.';
  }

  if (referenceType === 'ci-run-url') {
    const url = safeUrl(trimmed);
    const validGithubRun = url?.hostname === 'github.com' && /\/actions\/runs\/\d+/.test(url.pathname);
    const validExpoRun = url?.hostname.endsWith('expo.dev') === true;
    return validGithubRun || validExpoRun ? undefined : 'CI run proof must point to a GitHub Actions or Expo run URL.';
  }

  if (referenceType === 'store-console-state') {
    return trimmed.length >= 8 && trimmed.length <= 240 && !/[{}[\]\n\r]/.test(trimmed)
      ? undefined
      : 'Store-console proof must be a short state reference without JSON payloads, secrets, or multiline content.';
  }

  return 'Unsupported evidence reference type.';
}

function validateProof({
  item,
  proof,
  proofIndex,
}: {
  item: z.infer<typeof ExternalEvidenceFilledItemSchema>;
  proof: z.infer<typeof ExternalEvidenceFilledProofSchema>;
  proofIndex: number;
}) {
  const reference = proof.evidenceReference.trim();
  const referenceType = proof.evidenceReferenceType;
  const id = `${item.key}-${proofIndex + 1}`;

  if (!reference || referenceType === '') {
    return failCheck({
      detail: 'Evidence reference and evidence reference type are required.',
      expectedProof: proof.expectedProof,
      id,
      itemKey: item.key,
      label: item.label,
      referenceType,
    });
  }

  if (!proof.acceptedReferenceTypes.includes(referenceType)) {
    return failCheck({
      detail: `${referenceType} is not accepted for this proof. Accepted: ${proof.acceptedReferenceTypes.join(', ')}.`,
      expectedProof: proof.expectedProof,
      id,
      itemKey: item.key,
      label: item.label,
      referenceType,
    });
  }

  const referenceIssue = referenceTypeDetail(reference, referenceType);
  if (referenceIssue) {
    return failCheck({
      detail: referenceIssue,
      expectedProof: proof.expectedProof,
      id,
      itemKey: item.key,
      label: item.label,
      referenceType,
    });
  }

  return passCheck({
    detail: `${referenceType} reference accepted.`,
    expectedProof: proof.expectedProof,
    id,
    itemKey: item.key,
    label: item.label,
    referenceType,
  });
}

export function buildExternalEvidenceValidationReport({
  generatedAt = new Date().toISOString(),
  input,
}: {
  generatedAt?: string;
  input: ExternalEvidenceFilledIntake;
}): ExternalEvidenceValidationReport {
  const filledInput = ExternalEvidenceFilledIntakeSchema.parse(input);
  assertExternalEvidenceIntakeIsShareSafe(filledInput);

  const checks = filledInput.items.flatMap((item) =>
    item.proof.map((proof, proofIndex) =>
      validateProof({
        item,
        proof,
        proofIndex,
      }),
    ),
  );
  const failedChecks = checks.filter((check) => check.status === 'fail').length;
  const providedProofs = filledInput.items.flatMap((item) => item.proof).filter((proof) => proof.evidenceReference.trim()).length;
  const requiredProofs = checks.length;
  const acceptedProofs = requiredProofs - failedChecks;
  const status: z.infer<typeof ExternalEvidenceValidationStatusSchema> = failedChecks > 0 ? 'needs-evidence' : 'ready';

  return ExternalEvidenceValidationReportSchema.parse({
    checks,
    generatedAt,
    nextAction:
      status === 'ready'
        ? 'Rerun release readiness, freshness, blocker issue, and handoff reports with the accepted external evidence references.'
        : 'Fill every external evidence proof with an accepted reference type and share-safe reference, then rerun this validator.',
    privacy: {
      credentialValuesIncluded: false,
      localPathsIncluded: false,
      rawArtifactsIncluded: false,
      rawVideoIncluded: false,
      tokenLikeValuesIncluded: false,
    },
    schemaVersion: externalEvidenceValidationReportSchemaVersion,
    status,
    summary: {
      acceptedProofs,
      failedChecks,
      intakeItemCount: filledInput.items.length,
      missingProofs: requiredProofs - providedProofs,
      providedProofs,
      requiredProofs,
    },
  });
}

export function buildMissingExternalEvidenceValidationReport({
  generatedAt = new Date().toISOString(),
  inputPath = 'docs/sdlc/external-evidence-intake.filled.json',
}: {
  generatedAt?: string;
  inputPath?: string;
} = {}): ExternalEvidenceValidationReport {
  return ExternalEvidenceValidationReportSchema.parse({
    checks: [
      {
        detail: `Create ${inputPath} from docs/sdlc/external-evidence-intake.template.json and fill every proof row.`,
        expectedProof: 'Filled external evidence intake file',
        id: 'external-evidence-input-file',
        itemKey: 'externalEvidence',
        label: 'External evidence input',
        referenceType: '',
        status: 'fail',
      },
    ],
    generatedAt,
    nextAction: `Create ${inputPath} from docs/sdlc/external-evidence-intake.template.json, fill accepted proof references, then rerun npm run release:evidence:validate.`,
    privacy: {
      credentialValuesIncluded: false,
      localPathsIncluded: false,
      rawArtifactsIncluded: false,
      rawVideoIncluded: false,
      tokenLikeValuesIncluded: false,
    },
    schemaVersion: externalEvidenceValidationReportSchemaVersion,
    status: 'needs-evidence',
    summary: {
      acceptedProofs: 0,
      failedChecks: 1,
      intakeItemCount: 0,
      missingProofs: 1,
      providedProofs: 0,
      requiredProofs: 1,
    },
  });
}

export function buildExternalEvidencePromotionReport({
  baselineEvidence = defaultLaunchReadinessEvidence,
  generatedAt = new Date().toISOString(),
  input,
  validationReport,
}: {
  baselineEvidence?: LaunchReadinessEvidence;
  generatedAt?: string;
  input?: ExternalEvidenceFilledIntake;
  validationReport?: ExternalEvidenceValidationReport;
} = {}): ExternalEvidencePromotionReport {
  const sourceValidation =
    validationReport ??
    (input
      ? buildExternalEvidenceValidationReport({
          generatedAt,
          input,
        })
      : buildMissingExternalEvidenceValidationReport({
          generatedAt,
        }));
  const parsedBaseline = LaunchReadinessEvidenceSchema.parse(baselineEvidence);
  const parsedValidation = ExternalEvidenceValidationReportSchema.parse(sourceValidation);
  const parsedInput = input ? ExternalEvidenceFilledIntakeSchema.parse(input) : undefined;
  const validationReady = parsedValidation.status === 'ready';
  const candidateEvidence: LaunchReadinessEvidence = { ...parsedBaseline };
  const promotedChecks = (parsedInput?.items ?? []).map((item) => {
    const key = LaunchReadinessCheckKeySchema.parse(item.key);

    if (validationReady) {
      candidateEvidence[key] = true;
    }

    return {
      key,
      label: item.label,
      proofCount: item.proof.length,
      status: validationReady ? ('candidate-ready' as const) : ('blocked' as const),
    };
  });
  const promotedCheckCount = promotedChecks.filter((item) => item.status === 'candidate-ready').length;
  const blockedCheckCount = promotedChecks.filter((item) => item.status === 'blocked').length;
  const status: z.infer<typeof ExternalEvidencePromotionStatusSchema> =
    parsedValidation.status === 'invalid' ? 'invalid' : validationReady ? 'ready-to-apply' : 'needs-evidence';

  const report = ExternalEvidencePromotionReportSchema.parse({
    candidateEvidence,
    generatedAt,
    nextAction:
      status === 'ready-to-apply'
        ? 'Review the candidate launchReadinessEvidence object, then apply it through release configuration only after stakeholder approval.'
        : status === 'invalid'
          ? 'Fix the filled external evidence intake file, rerun validation, then regenerate the promotion candidate.'
          : 'Collect and validate every external proof reference before promoting launch readiness evidence.',
    privacy: {
      credentialValuesIncluded: false,
      localPathsIncluded: false,
      rawArtifactsIncluded: false,
      rawVideoIncluded: false,
      tokenLikeValuesIncluded: false,
    },
    promotedChecks,
    schemaVersion: externalEvidencePromotionReportSchemaVersion,
    sourceValidation: parsedValidation,
    status,
    summary: {
      blockedCheckCount,
      candidateReady: status === 'ready-to-apply',
      promotedCheckCount,
      validationStatus: parsedValidation.status,
    },
  });

  return assertExternalEvidenceIntakeIsShareSafe(report);
}

export function buildExternalEvidenceApplyReport({
  appConfigPath = 'app.json',
  applied = false,
  generatedAt = new Date().toISOString(),
  promotionReport,
  writeRequested = false,
}: {
  appConfigPath?: string;
  applied?: boolean;
  generatedAt?: string;
  promotionReport: ExternalEvidencePromotionReport;
  writeRequested?: boolean;
}): ExternalEvidenceApplyReport {
  const sourcePromotion = ExternalEvidencePromotionReportSchema.parse(promotionReport);
  const candidateReady = sourcePromotion.status === 'ready-to-apply' && sourcePromotion.summary.candidateReady;
  const appliedNow = Boolean(applied && writeRequested && candidateReady);
  const status: z.infer<typeof ExternalEvidenceApplyStatusSchema> =
    sourcePromotion.status === 'invalid'
      ? 'invalid'
      : appliedNow
        ? 'applied'
        : candidateReady
          ? 'ready-to-apply'
          : 'needs-evidence';

  const report = ExternalEvidenceApplyReportSchema.parse({
    appConfigPath,
    candidateEvidence: sourcePromotion.candidateEvidence,
    generatedAt,
    nextAction:
      status === 'applied'
        ? 'Rerun release readiness, freshness, blocker issue, and handoff reports from the updated app configuration.'
        : status === 'ready-to-apply'
          ? 'Review the candidate evidence and rerun with --write-app-config only after stakeholder approval.'
          : status === 'invalid'
            ? 'Fix the external evidence promotion report before applying launch readiness evidence.'
            : 'Collect, validate, and promote every external proof reference before applying launch readiness evidence.',
    privacy: {
      credentialValuesIncluded: false,
      localPathsIncluded: false,
      rawArtifactsIncluded: false,
      rawVideoIncluded: false,
      tokenLikeValuesIncluded: false,
    },
    schemaVersion: externalEvidenceApplyReportSchemaVersion,
    sourcePromotion,
    status,
    summary: {
      applied: appliedNow,
      appliedCheckCount: appliedNow ? sourcePromotion.summary.promotedCheckCount : 0,
      blockedCheckCount: sourcePromotion.summary.blockedCheckCount,
      candidateReady,
      promotedCheckCount: sourcePromotion.summary.promotedCheckCount,
      validationStatus: sourcePromotion.summary.validationStatus,
      writeRequested,
    },
  });

  return assertExternalEvidenceIntakeIsShareSafe(report);
}
