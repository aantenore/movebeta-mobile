import type { LocalAnalysisReport } from './contracts';
import type { ReportAnnotation } from './reportAnnotationRepository';

export type ProjectQueueItem = {
  action: string;
  annotation: ReportAnnotation;
  priorityScore: number;
  report: LocalAnalysisReport;
};

export type ProjectQueueSummary = {
  activeCount: number;
  annotatedCount: number;
  averageEffort: number;
  nextProject: ProjectQueueItem | null;
  repeatCount: number;
  sentCount: number;
};

function reportById(reports: LocalAnalysisReport[]) {
  return new Map(reports.map((report) => [report.id, report]));
}

function actionFor(annotation: ReportAnnotation, report: LocalAnalysisReport) {
  if (annotation.projectStatus === 'sent') return 'Use this send as a benchmark for the next grade.';
  if (annotation.projectStatus === 'repeat') return `Repeat ${report.session.title} and compare the same crux window.`;
  if (annotation.confidence >= 4) return 'Run one confident repeat before increasing difficulty.';
  if (annotation.perceivedEffort >= 4) return 'Keep the beta easier: one high-effort repeat with the same focus metric.';
  return 'Project one more attempt and update the private note after the repeat.';
}

function priorityScore(annotation: ReportAnnotation, report: LocalAnalysisReport) {
  const statusWeight = annotation.projectStatus === 'repeat' ? 60 : annotation.projectStatus === 'project' ? 30 : 0;
  const effortWeight = annotation.perceivedEffort * 8;
  const confidenceWeight = (6 - annotation.confidence) * 5;
  const weakSignalWeight = Math.max(0, 100 - report.analysisQuality.score) / 3;

  return Math.round(statusWeight + effortWeight + confidenceWeight + weakSignalWeight);
}

function isActive(annotation: ReportAnnotation) {
  return annotation.projectStatus === 'project' || annotation.projectStatus === 'repeat';
}

function average(values: number[]) {
  if (values.length === 0) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

export function summarizeProjectQueue(
  reports: LocalAnalysisReport[],
  annotations: ReportAnnotation[],
): ProjectQueueSummary {
  const reportsById = reportById(reports);
  const matched = annotations.flatMap((annotation) => {
    const report = reportsById.get(annotation.reportId);
    return report ? [{ annotation, report }] : [];
  });
  const activeItems = matched
    .filter((item) => isActive(item.annotation))
    .map((item) => ({
      ...item,
      action: actionFor(item.annotation, item.report),
      priorityScore: priorityScore(item.annotation, item.report),
    }))
    .sort((a, b) => b.priorityScore - a.priorityScore || b.annotation.updatedAt.localeCompare(a.annotation.updatedAt));

  return {
    activeCount: activeItems.length,
    annotatedCount: matched.length,
    averageEffort: Math.round(average(matched.map((item) => item.annotation.perceivedEffort)) * 10) / 10,
    nextProject: activeItems[0] ?? null,
    repeatCount: matched.filter((item) => item.annotation.projectStatus === 'repeat').length,
    sentCount: matched.filter((item) => item.annotation.projectStatus === 'sent').length,
  };
}
