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
  drillPractice: number;
  generatedAt: string;
  reports: number;
};

export type LocalDataRestoreResult = {
  annotationsRestored: number;
  consentsRestored: number;
  drillPracticeRestored: number;
  importedAt: string;
  reportsRestored: number;
  skippedAnnotations: number;
  skippedConsents: number;
  skippedDrillPractice: number;
  status: 'restored';
};

export type LocalDataPortabilityRepositories = {
  annotations: Pick<ReportAnnotationRepository, 'listAnnotations' | 'saveAnnotation'>;
  consents: Pick<CoachConsentRepository, 'listConsents' | 'saveConsent'>;
  drillPractice: Pick<DrillPracticeRepository, 'listRecords' | 'saveRecord'>;
  now?: () => string;
  reports: Pick<ReportRepository, 'exportReport' | 'listReports' | 'saveReport'>;
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
  const drillPractice = (await repositories.drillPractice.listRecords()).filter((record) => reportIds.has(record.reportId));

  return assertLocalDataBackupIsPrivacySafe({
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
  const drillPractice = backup.drillPractice.filter((record) => reportIds.has(record.reportId));

  await Promise.all(backup.reports.map((report) => repositories.reports.saveReport(report)));
  await Promise.all(annotations.map((annotation) => repositories.annotations.saveAnnotation(annotation)));
  await Promise.all(consents.map((consent) => repositories.consents.saveConsent(consent)));
  await Promise.all(drillPractice.map((record) => repositories.drillPractice.saveRecord(record)));

  return {
    annotationsRestored: annotations.length,
    consentsRestored: consents.length,
    drillPracticeRestored: drillPractice.length,
    importedAt: (repositories.now ?? clock)(),
    reportsRestored: backup.reports.length,
    skippedAnnotations: backup.annotations.length - annotations.length,
    skippedConsents: backup.consents.length - consents.length,
    skippedDrillPractice: backup.drillPractice.length - drillPractice.length,
    status: 'restored',
  };
}

export function summarizeLocalDataBackup(backup: LocalDataBackup): LocalDataBackupSummary {
  const parsed = assertLocalDataBackupIsPrivacySafe(backup);
  return {
    annotations: parsed.annotations.length,
    consents: parsed.consents.length,
    drillPractice: parsed.drillPractice.length,
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
    `Drill practice records restored: ${result.drillPracticeRestored}`,
    `Skipped training logs: ${result.skippedAnnotations}`,
    `Skipped consent records: ${result.skippedConsents}`,
    `Skipped drill practice records: ${result.skippedDrillPractice}`,
    'Raw video included: no',
    'Video left device: no',
  ].join('\n');
}
