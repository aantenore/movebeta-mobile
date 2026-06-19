import { coachConsentRepository, type CoachConsentRepository } from './coachConsentRepository';
import { reportAnnotationRepository, type ReportAnnotationRepository } from './reportAnnotationRepository';
import { reportRepository, type ReportRepository } from './reportRepository';

export type AnalysisBundleDeletionArtifact = {
  deleted: boolean;
  id: 'report' | 'training-log' | 'coach-consent';
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
  status: 'deleted' | 'not-found';
};

export type AnalysisBundleDeletionRepositories = {
  annotations: Pick<ReportAnnotationRepository, 'deleteAnnotation' | 'getAnnotation'>;
  consents: Pick<CoachConsentRepository, 'deleteConsent' | 'getConsent'>;
  now?: () => string;
  reports: Pick<ReportRepository, 'deleteReport' | 'getReport'>;
};

const defaultRepositories: AnalysisBundleDeletionRepositories = {
  annotations: reportAnnotationRepository,
  consents: coachConsentRepository,
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

  const [report, annotation, consent] = await Promise.all([
    repositories.reports.getReport(normalizedReportId),
    repositories.annotations.getAnnotation(normalizedReportId),
    repositories.consents.getConsent(normalizedReportId),
  ]);

  const [reportDeleted, annotationDeleted, consentDeleted] = await Promise.all([
    repositories.reports.deleteReport(normalizedReportId),
    repositories.annotations.deleteAnnotation(normalizedReportId),
    repositories.consents.deleteConsent(normalizedReportId),
  ]);

  const artifacts: AnalysisBundleDeletionArtifact[] = [
    {
      deleted: reportDeleted,
      id: 'report',
      label: 'Analysis report',
      wasPresent: Boolean(report),
    },
    {
      deleted: annotationDeleted,
      id: 'training-log',
      label: 'Private training log',
      wasPresent: Boolean(annotation),
    },
    {
      deleted: consentDeleted,
      id: 'coach-consent',
      label: 'Coach consent record',
      wasPresent: Boolean(consent),
    },
  ];

  return {
    artifacts,
    deletedAt: (repositories.now ?? clock)(),
    privacy: {
      rawVideoIncluded: false,
      videoLeavesDevice: false,
    },
    reportId: normalizedReportId,
    status: artifacts.some((artifact) => artifact.deleted) ? 'deleted' : 'not-found',
  };
}

export function formatAnalysisBundleDeletionReceipt(result: AnalysisBundleDeletionResult) {
  const artifactLines = result.artifacts.map((artifact) => {
    const status = artifact.deleted ? 'deleted' : artifact.wasPresent ? 'retained for review' : 'not present';
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
