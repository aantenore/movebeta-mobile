import { z } from 'zod';

import { appConfig } from '@/core/config';

import {
  CoachReviewConsentRecordSchema,
  coachConsentRepository,
  type CoachConsentRepository,
} from './coachConsentRepository';
import { LocalAnalysisReportSchema } from './contracts';
import {
  ReportAnnotationSchema,
  reportAnnotationRepository,
  type ReportAnnotationRepository,
} from './reportAnnotationRepository';
import { reportRepository, type ReportRepository } from './reportRepository';

export const LocalDataBackupSchema = z.object({
  app: z.object({
    activePlan: z.string(),
    privacyMode: z.string(),
    release: z.string(),
  }),
  annotations: z.array(ReportAnnotationSchema),
  consents: z.array(CoachReviewConsentRecordSchema),
  generatedAt: z.string(),
  privacy: z.object({
    excludedArtifacts: z.array(z.string()),
    rawVideoIncluded: z.literal(false),
    videoLeavesDevice: z.literal(false),
  }),
  reports: z.array(LocalAnalysisReportSchema),
  schemaVersion: z.literal(1),
});

export type LocalDataBackup = z.infer<typeof LocalDataBackupSchema>;

export type LocalDataBackupSummary = {
  annotations: number;
  consents: number;
  generatedAt: string;
  reports: number;
};

export type LocalDataRestoreResult = {
  annotationsRestored: number;
  consentsRestored: number;
  importedAt: string;
  reportsRestored: number;
  skippedAnnotations: number;
  skippedConsents: number;
  status: 'restored';
};

export type LocalDataPortabilityRepositories = {
  annotations: Pick<ReportAnnotationRepository, 'listAnnotations' | 'saveAnnotation'>;
  consents: Pick<CoachConsentRepository, 'listConsents' | 'saveConsent'>;
  now?: () => string;
  reports: Pick<ReportRepository, 'exportReport' | 'listReports' | 'saveReport'>;
};

const defaultRepositories: LocalDataPortabilityRepositories = {
  annotations: reportAnnotationRepository,
  consents: coachConsentRepository,
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

export function assertLocalDataBackupIsPrivacySafe(backup: LocalDataBackup) {
  const parsed = LocalDataBackupSchema.parse(backup);
  assertNoRawVideoArtifacts(JSON.stringify(parsed));
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

  return assertLocalDataBackupIsPrivacySafe({
    app: {
      activePlan: appConfig.activePlan,
      privacyMode: appConfig.privacyMode,
      release: '1.0.0',
    },
    annotations,
    consents,
    generatedAt: (repositories.now ?? clock)(),
    privacy: {
      excludedArtifacts: ['raw video', 'video URI', 'audio', 'account identifiers', 'secrets'],
      rawVideoIncluded: false,
      videoLeavesDevice: false,
    },
    reports: exportedReports,
    schemaVersion: 1,
  });
}

export async function restoreLocalDataBackup(
  payload: string | LocalDataBackup,
  repositories: LocalDataPortabilityRepositories = defaultRepositories,
): Promise<LocalDataRestoreResult> {
  const parsedPayload = typeof payload === 'string' ? JSON.parse(payload) : payload;
  const backup = assertLocalDataBackupIsPrivacySafe(LocalDataBackupSchema.parse(parsedPayload));
  const reportIds = new Set(backup.reports.map((report) => report.id));
  const annotations = backup.annotations.filter((annotation) => reportIds.has(annotation.reportId));
  const consents = backup.consents.filter((consent) => reportIds.has(consent.reportId));

  await Promise.all(backup.reports.map((report) => repositories.reports.saveReport(report)));
  await Promise.all(annotations.map((annotation) => repositories.annotations.saveAnnotation(annotation)));
  await Promise.all(consents.map((consent) => repositories.consents.saveConsent(consent)));

  return {
    annotationsRestored: annotations.length,
    consentsRestored: consents.length,
    importedAt: (repositories.now ?? clock)(),
    reportsRestored: backup.reports.length,
    skippedAnnotations: backup.annotations.length - annotations.length,
    skippedConsents: backup.consents.length - consents.length,
    status: 'restored',
  };
}

export function summarizeLocalDataBackup(backup: LocalDataBackup): LocalDataBackupSummary {
  const parsed = assertLocalDataBackupIsPrivacySafe(backup);
  return {
    annotations: parsed.annotations.length,
    consents: parsed.consents.length,
    generatedAt: parsed.generatedAt,
    reports: parsed.reports.length,
  };
}

export function formatLocalDataRestoreResult(result: LocalDataRestoreResult) {
  return [
    `Status: ${result.status}`,
    `Imported at: ${result.importedAt}`,
    `Reports restored: ${result.reportsRestored}`,
    `Training logs restored: ${result.annotationsRestored}`,
    `Coach consent records restored: ${result.consentsRestored}`,
    `Skipped training logs: ${result.skippedAnnotations}`,
    `Skipped consent records: ${result.skippedConsents}`,
    'Raw video included: no',
    'Video left device: no',
  ].join('\n');
}
