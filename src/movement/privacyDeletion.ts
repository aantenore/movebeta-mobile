import { coachConsentRepository, type CoachConsentRepository } from './coachConsentRepository';
import { drillPracticeRepository, type DrillPracticeRepository } from './drillPracticeRepository';
import { reportAnnotationRepository, type ReportAnnotationRepository } from './reportAnnotationRepository';
import { reportRepository, type ReportRepository } from './reportRepository';

export type AnalysisBundleDeletionArtifact = {
  deleted: boolean;
  error?: string;
  id: 'report' | 'training-log' | 'coach-consent' | 'drill-practice';
  label: string;
  wasPresent: boolean;
};

export type AnalysisBundleDeletionResult = {
  artifacts: AnalysisBundleDeletionArtifact[];
  deletedAt: string;
  privacy: {
    rawVideoIncluded: false;
    videoLeavesDevice: false;
  };
  reportId: string;
  status: 'deleted' | 'not-found' | 'partial';
};

export type AnalysisBundleDeletionRepositories = {
  annotations: Pick<ReportAnnotationRepository, 'deleteAnnotation' | 'getAnnotation'>;
  consents: Pick<CoachConsentRepository, 'deleteConsent' | 'getConsent'>;
  drillPractice: Pick<DrillPracticeRepository, 'deleteRecordsForReport' | 'listRecordsForReport'>;
  now?: () => string;
  reports: Pick<ReportRepository, 'deleteReport' | 'getReport'>;
};

const defaultRepositories: AnalysisBundleDeletionRepositories = {
  annotations: reportAnnotationRepository,
  consents: coachConsentRepository,
  drillPractice: drillPracticeRepository,
  reports: reportRepository,
};

function clock() {
  return new Date().toISOString();
}

export async function deleteAnalysisBundle(
  reportId: string,
  repositories: AnalysisBundleDeletionRepositories = defaultRepositories,
): Promise<AnalysisBundleDeletionResult> {
  const normalizedReportId = reportId.trim();
  if (!normalizedReportId) {
    throw new Error('Report id is required for local deletion.');
  }

  const reads = await Promise.allSettled([
    repositories.reports.getReport(normalizedReportId),
    repositories.annotations.getAnnotation(normalizedReportId),
    repositories.consents.getConsent(normalizedReportId),
    repositories.drillPractice.listRecordsForReport(normalizedReportId),
  ]);

  const deletions = await Promise.allSettled([
    repositories.reports.deleteReport(normalizedReportId),
    repositories.annotations.deleteAnnotation(normalizedReportId),
    repositories.consents.deleteConsent(normalizedReportId),
    repositories.drillPractice.deleteRecordsForReport(normalizedReportId),
  ]);

  const readValue = (index: number) => (reads[index].status === 'fulfilled' ? reads[index].value : null);
  const deletionValue = (index: number) => (deletions[index].status === 'fulfilled' ? deletions[index].value : false);
  const deletionError = (index: number) =>
    deletions[index].status === 'rejected' || (reads[index].status === 'rejected' && !deletionValue(index))
      ? 'Local deletion did not complete; retry this privacy action.'
      : undefined;

  const report = readValue(0);
  const annotation = readValue(1);
  const consent = readValue(2);
  const drillPractice = readValue(3);
  const reportDeleted = Boolean(deletionValue(0));
  const annotationDeleted = Boolean(deletionValue(1));
  const consentDeleted = Boolean(deletionValue(2));
  const drillPracticeDeleted = Number(deletionValue(3));

  const artifacts: AnalysisBundleDeletionArtifact[] = [
    {
      deleted: reportDeleted,
      error: deletionError(0),
      id: 'report',
      label: 'Analysis report',
      wasPresent: Boolean(report),
    },
    {
      deleted: annotationDeleted,
      error: deletionError(1),
      id: 'training-log',
      label: 'Private training log',
      wasPresent: Boolean(annotation),
    },
    {
      deleted: consentDeleted,
      error: deletionError(2),
      id: 'coach-consent',
      label: 'Coach consent record',
      wasPresent: Boolean(consent),
    },
    {
      deleted: drillPracticeDeleted > 0,
      error: deletionError(3),
      id: 'drill-practice',
      label: 'Drill practice log',
      wasPresent: Array.isArray(drillPractice) && drillPractice.length > 0,
    },
  ];
  const partial = artifacts.some((artifact) => Boolean(artifact.error) || (artifact.wasPresent && !artifact.deleted));
  const anyDeleted = artifacts.some((artifact) => artifact.deleted);

  return {
    artifacts,
    deletedAt: (repositories.now ?? clock)(),
    privacy: {
      rawVideoIncluded: false,
      videoLeavesDevice: false,
    },
    reportId: normalizedReportId,
    status: partial ? 'partial' : anyDeleted ? 'deleted' : 'not-found',
  };
}

export function formatAnalysisBundleDeletionReceipt(result: AnalysisBundleDeletionResult) {
  const artifactLines = result.artifacts.map((artifact) => {
    const status = artifact.deleted ? 'deleted' : artifact.error ? 'retry required' : artifact.wasPresent ? 'retained for review' : 'not present';
    return `${artifact.label}: ${status}`;
  });

  return [
    `Report id: ${result.reportId}`,
    `Status: ${result.status}`,
    `Deleted at: ${result.deletedAt}`,
    ...artifactLines,
    `Raw video included: ${result.privacy.rawVideoIncluded ? 'yes' : 'no'}`,
    `Video left device: ${result.privacy.videoLeavesDevice ? 'yes' : 'no'}`,
  ].join('\n');
}
