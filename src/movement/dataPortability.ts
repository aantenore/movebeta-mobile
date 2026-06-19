import { z } from 'zod';

import { appConfig } from '@/core/config';

import {
  CoachReviewConsentRecordSchema,
  coachConsentRepository,
  type CoachConsentRepository,
} from './coachConsentRepository';
import { LocalAnalysisReportSchema } from './contracts';
import {
  DrillPracticeRecordSchema,
  drillPracticeRepository,
  type DrillPracticeRepository,
} from './drillPracticeRepository';
import {
  ReportAnnotationSchema,
  reportAnnotationRepository,
  type ReportAnnotationRepository,
} from './reportAnnotationRepository';
import { reportRepository, type ReportRepository } from './reportRepository';

export const LocalDataBackupRecordCountsSchema = z.object({
  annotations: z.number().int().min(0),
  consents: z.number().int().min(0),
  drillPractice: z.number().int().min(0),
  reports: z.number().int().min(0),
});

export const LocalDataBackupIntegritySchema = z.object({
  algorithm: z.literal('fnv1a-32'),
  checksum: z.string().regex(/^[a-f0-9]{8}$/),
  recordCounts: LocalDataBackupRecordCountsSchema,
});

export const LocalDataBackupSchema = z.object({
  app: z.object({
    activePlan: z.string(),
    privacyMode: z.string(),
    release: z.string(),
  }),
  annotations: z.array(ReportAnnotationSchema),
  consents: z.array(CoachReviewConsentRecordSchema),
  drillPractice: z.array(DrillPracticeRecordSchema).default([]),
  generatedAt: z.string(),
  integrity: LocalDataBackupIntegritySchema.optional(),
  privacy: z.object({
    excludedArtifacts: z.array(z.string()),
    rawVideoIncluded: z.literal(false),
    videoLeavesDevice: z.literal(false),
  }),
  reports: z.array(LocalAnalysisReportSchema),
  schemaVersion: z.literal(1),
});

export type LocalDataBackup = z.infer<typeof LocalDataBackupSchema>;
export type LocalDataBackupIntegrity = z.infer<typeof LocalDataBackupIntegritySchema>;
export type LocalDataBackupRecordCounts = z.infer<typeof LocalDataBackupRecordCountsSchema>;

export type LocalDataBackupSummary = {
  annotations: number;
  checksum: string | null;
  consents: number;
  drillPractice: number;
  generatedAt: string;
  integrityVerified: boolean;
  reports: number;
};

export type LocalDataRestoreResult = {
  annotationsRestored: number;
  consentsRestored: number;
  drillPracticeRestored: number;
  importedAt: string;
  integrityChecksum: string | null;
  integrityVerified: boolean;
  reportsRestored: number;
  skippedAnnotations: number;
  skippedConsents: number;
  skippedDrillPractice: number;
  status: 'restored';
};

export type LocalDataRestorePreview = {
  annotationsToRestore: number;
  consentsToRestore: number;
  drillPracticeToRestore: number;
  existingAnnotations: number;
  existingConsents: number;
  existingDrillPractice: number;
  existingReports: number;
  generatedAt: string;
  integrityChecksum: string | null;
  integrityVerified: boolean;
  newAnnotations: number;
  newConsents: number;
  newDrillPractice: number;
  newReports: number;
  reportsToRestore: number;
  skippedAnnotations: number;
  skippedConsents: number;
  skippedDrillPractice: number;
  status: 'ready-to-restore';
};

export type LocalDataPortabilityRepositories = {
  annotations: Pick<ReportAnnotationRepository, 'getAnnotation' | 'listAnnotations' | 'saveAnnotation'>;
  consents: Pick<CoachConsentRepository, 'getConsent' | 'listConsents' | 'saveConsent'>;
  drillPractice: Pick<DrillPracticeRepository, 'getRecord' | 'listRecords' | 'saveRecord'>;
  now?: () => string;
  reports: Pick<ReportRepository, 'exportReport' | 'getReport' | 'listReports' | 'saveReport'>;
};

const defaultRepositories: LocalDataPortabilityRepositories = {
  annotations: reportAnnotationRepository,
  consents: coachConsentRepository,
  drillPractice: drillPracticeRepository,
  reports: reportRepository,
};

function clock() {
  return new Date().toISOString();
}

function assertNoRawVideoArtifacts(serialized: string) {
  const forbiddenPattern = /(?:file|content|ph):\/\/|https?:\/\/|videoUri|videoURI|videoPath|assetUri/i;
  if (forbiddenPattern.test(serialized)) {
    throw new Error('Local data backup contains raw video, URI, or upload-like artifacts.');
  }
}

function stableStringify(value: unknown): string {
  if (Array.isArray(value)) {
    return `[${value.map((item) => stableStringify(item)).join(',')}]`;
  }
  if (value && typeof value === 'object') {
    return `{${Object.entries(value)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, item]) => `${JSON.stringify(key)}:${stableStringify(item)}`)
      .join(',')}}`;
  }
  return JSON.stringify(value);
}

function fnv1a32(value: string) {
  let hash = 0x811c9dc5;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(16).padStart(8, '0');
}

function backupContentForIntegrity(backup: LocalDataBackup) {
  const { integrity: _integrity, ...content } = backup;
  return content;
}

function countLocalDataBackupRecords(backup: Pick<LocalDataBackup, 'annotations' | 'consents' | 'drillPractice' | 'reports'>): LocalDataBackupRecordCounts {
  return {
    annotations: backup.annotations.length,
    consents: backup.consents.length,
    drillPractice: backup.drillPractice.length,
    reports: backup.reports.length,
  };
}

export function createLocalDataBackupIntegrity(backup: LocalDataBackup): LocalDataBackupIntegrity {
  const parsed = LocalDataBackupSchema.omit({ integrity: true }).parse(backupContentForIntegrity(backup));
  return {
    algorithm: 'fnv1a-32',
    checksum: fnv1a32(stableStringify(parsed)),
    recordCounts: countLocalDataBackupRecords(parsed),
  };
}

export function verifyLocalDataBackupIntegrity(backup: LocalDataBackup) {
  if (!backup.integrity) return false;
  const expected = createLocalDataBackupIntegrity(backup);
  const matchesChecksum = backup.integrity.checksum === expected.checksum;
  const matchesCounts = JSON.stringify(backup.integrity.recordCounts) === JSON.stringify(expected.recordCounts);

  if (!matchesChecksum || !matchesCounts) {
    throw new Error('Local data backup integrity check failed.');
  }

  return true;
}

export function assertLocalDataBackupIsPrivacySafe(backup: LocalDataBackup) {
  const parsed = LocalDataBackupSchema.parse(backup);
  assertNoRawVideoArtifacts(JSON.stringify(parsed));
  verifyLocalDataBackupIntegrity(parsed);
  return parsed;
}

export async function createLocalDataBackup(
  repositories: LocalDataPortabilityRepositories = defaultRepositories,
): Promise<LocalDataBackup> {
  const reports = await repositories.reports.listReports();
  const exportedReports = (
    await Promise.all(reports.map((report) => repositories.reports.exportReport(report.id)))
  ).flatMap((report) => (report ? [report] : []));
  const reportIds = new Set(exportedReports.map((report) => report.id));
  const annotations = (await repositories.annotations.listAnnotations()).filter((annotation) => reportIds.has(annotation.reportId));
  const consents = (await repositories.consents.listConsents()).filter((consent) => reportIds.has(consent.reportId));
  const drillPractice = (await repositories.drillPractice.listRecords()).filter((record) => reportIds.has(record.reportId));

  const backup = LocalDataBackupSchema.omit({ integrity: true }).parse({
    app: {
      activePlan: appConfig.activePlan,
      privacyMode: appConfig.privacyMode,
      release: '1.0.0',
    },
    annotations,
    consents,
    drillPractice,
    generatedAt: (repositories.now ?? clock)(),
    privacy: {
      excludedArtifacts: ['raw video', 'video URI', 'audio', 'account identifiers', 'secrets'],
      rawVideoIncluded: false,
      videoLeavesDevice: false,
    },
    reports: exportedReports,
    schemaVersion: 1,
  });

  return assertLocalDataBackupIsPrivacySafe({
    ...backup,
    integrity: createLocalDataBackupIntegrity(backup),
  });
}

function parseLocalDataBackupPayload(payload: string | LocalDataBackup) {
  const parsedPayload = typeof payload === 'string' ? JSON.parse(payload) : payload;
  const backup = assertLocalDataBackupIsPrivacySafe(LocalDataBackupSchema.parse(parsedPayload));
  const reportIds = new Set(backup.reports.map((report) => report.id));
  const annotations = backup.annotations.filter((annotation) => reportIds.has(annotation.reportId));
  const consents = backup.consents.filter((consent) => reportIds.has(consent.reportId));
  const drillPractice = backup.drillPractice.filter((record) => reportIds.has(record.reportId));

  return {
    annotations,
    backup,
    consents,
    drillPractice,
  };
}

type ParsedLocalDataBackupPayload = ReturnType<typeof parseLocalDataBackupPayload>;

type RestorePreviewExistingCounts = Pick<
  LocalDataRestorePreview,
  'existingAnnotations' | 'existingConsents' | 'existingDrillPractice' | 'existingReports'
>;

function buildLocalDataRestorePreview(
  { annotations, backup, consents, drillPractice }: ParsedLocalDataBackupPayload,
  existing: RestorePreviewExistingCounts = {
    existingAnnotations: 0,
    existingConsents: 0,
    existingDrillPractice: 0,
    existingReports: 0,
  },
): LocalDataRestorePreview {
  const reportsToRestore = backup.reports.length;
  const annotationsToRestore = annotations.length;
  const consentsToRestore = consents.length;
  const drillPracticeToRestore = drillPractice.length;

  return {
    annotationsToRestore,
    consentsToRestore,
    drillPracticeToRestore,
    ...existing,
    generatedAt: backup.generatedAt,
    integrityChecksum: backup.integrity?.checksum ?? null,
    integrityVerified: verifyLocalDataBackupIntegrity(backup),
    newAnnotations: annotationsToRestore - existing.existingAnnotations,
    newConsents: consentsToRestore - existing.existingConsents,
    newDrillPractice: drillPracticeToRestore - existing.existingDrillPractice,
    newReports: reportsToRestore - existing.existingReports,
    reportsToRestore,
    skippedAnnotations: backup.annotations.length - annotations.length,
    skippedConsents: backup.consents.length - consents.length,
    skippedDrillPractice: backup.drillPractice.length - drillPractice.length,
    status: 'ready-to-restore',
  };
}

async function countExistingRecords<T>(records: T[], getRecord: (record: T) => Promise<unknown | null>) {
  const existing = await Promise.all(records.map((record) => getRecord(record)));
  return existing.filter((record) => record !== null).length;
}

export function previewLocalDataRestore(payload: string | LocalDataBackup): LocalDataRestorePreview {
  return buildLocalDataRestorePreview(parseLocalDataBackupPayload(payload));
}

export async function previewLocalDataRestoreAgainstRepositories(
  payload: string | LocalDataBackup,
  repositories: LocalDataPortabilityRepositories = defaultRepositories,
): Promise<LocalDataRestorePreview> {
  const parsed = parseLocalDataBackupPayload(payload);
  const [existingReports, existingAnnotations, existingConsents, existingDrillPractice] = await Promise.all([
    countExistingRecords(parsed.backup.reports, (report) => repositories.reports.getReport(report.id)),
    countExistingRecords(parsed.annotations, (annotation) => repositories.annotations.getAnnotation(annotation.reportId)),
    countExistingRecords(parsed.consents, (consent) => repositories.consents.getConsent(consent.reportId)),
    countExistingRecords(parsed.drillPractice, (record) => repositories.drillPractice.getRecord(record.drillId)),
  ]);

  return buildLocalDataRestorePreview(parsed, {
    existingAnnotations,
    existingConsents,
    existingDrillPractice,
    existingReports,
  });
}

export async function restoreLocalDataBackup(
  payload: string | LocalDataBackup,
  repositories: LocalDataPortabilityRepositories = defaultRepositories,
): Promise<LocalDataRestoreResult> {
  const { annotations, backup, consents, drillPractice } = parseLocalDataBackupPayload(payload);

  await Promise.all(backup.reports.map((report) => repositories.reports.saveReport(report)));
  await Promise.all(annotations.map((annotation) => repositories.annotations.saveAnnotation(annotation)));
  await Promise.all(consents.map((consent) => repositories.consents.saveConsent(consent)));
  await Promise.all(drillPractice.map((record) => repositories.drillPractice.saveRecord(record)));

  return {
    annotationsRestored: annotations.length,
    consentsRestored: consents.length,
    drillPracticeRestored: drillPractice.length,
    importedAt: (repositories.now ?? clock)(),
    integrityChecksum: backup.integrity?.checksum ?? null,
    integrityVerified: verifyLocalDataBackupIntegrity(backup),
    reportsRestored: backup.reports.length,
    skippedAnnotations: backup.annotations.length - annotations.length,
    skippedConsents: backup.consents.length - consents.length,
    skippedDrillPractice: backup.drillPractice.length - drillPractice.length,
    status: 'restored',
  };
}

export function summarizeLocalDataBackup(backup: LocalDataBackup): LocalDataBackupSummary {
  const parsed = assertLocalDataBackupIsPrivacySafe(backup);
  const integrityVerified = verifyLocalDataBackupIntegrity(parsed);
  return {
    annotations: parsed.annotations.length,
    checksum: parsed.integrity?.checksum ?? null,
    consents: parsed.consents.length,
    drillPractice: parsed.drillPractice.length,
    generatedAt: parsed.generatedAt,
    integrityVerified,
    reports: parsed.reports.length,
  };
}

export function formatLocalDataRestorePreview(preview: LocalDataRestorePreview) {
  return [
    `Status: ${preview.status}`,
    `Backup generated at: ${preview.generatedAt}`,
    `Integrity verified: ${preview.integrityVerified ? 'yes' : 'legacy backup without checksum'}`,
    `Content checksum: ${preview.integrityChecksum ?? 'not available'}`,
    `Reports ready: ${preview.reportsToRestore}`,
    `New reports: ${preview.newReports}`,
    `Existing reports: ${preview.existingReports}`,
    `Training logs ready: ${preview.annotationsToRestore}`,
    `New training logs: ${preview.newAnnotations}`,
    `Existing training logs: ${preview.existingAnnotations}`,
    `Coach consent records ready: ${preview.consentsToRestore}`,
    `New coach consent records: ${preview.newConsents}`,
    `Existing coach consent records: ${preview.existingConsents}`,
    `Drill practice records ready: ${preview.drillPracticeToRestore}`,
    `New drill practice records: ${preview.newDrillPractice}`,
    `Existing drill practice records: ${preview.existingDrillPractice}`,
    `Skipped training logs: ${preview.skippedAnnotations}`,
    `Skipped consent records: ${preview.skippedConsents}`,
    `Skipped drill practice records: ${preview.skippedDrillPractice}`,
    'Raw video included: no',
    'Video left device: no',
  ].join('\n');
}

export function formatLocalDataRestoreResult(result: LocalDataRestoreResult) {
  return [
    `Status: ${result.status}`,
    `Imported at: ${result.importedAt}`,
    `Integrity verified: ${result.integrityVerified ? 'yes' : 'legacy backup without checksum'}`,
    `Content checksum: ${result.integrityChecksum ?? 'not available'}`,
    `Reports restored: ${result.reportsRestored}`,
    `Training logs restored: ${result.annotationsRestored}`,
    `Coach consent records restored: ${result.consentsRestored}`,
    `Drill practice records restored: ${result.drillPracticeRestored}`,
    `Skipped training logs: ${result.skippedAnnotations}`,
    `Skipped consent records: ${result.skippedConsents}`,
    `Skipped drill practice records: ${result.skippedDrillPractice}`,
    'Raw video included: no',
    'Video left device: no',
  ].join('\n');
}
