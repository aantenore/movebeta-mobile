import type { LocalAnalysisReport } from './contracts';
import type { CueFeedback, ReportAnnotation } from './reportAnnotationRepository';

export type CueFeedbackInsight = {
  cueId: string;
  latestRating: CueFeedback['rating'];
  latestReportTitle: string;
  notUsefulCount: number;
  title: string;
  total: number;
  unclearCount: number;
  usefulCount: number;
  usefulnessRate: number;
};

export type CueFeedbackInsightSummary = {
  feedbackCount: number;
  insights: CueFeedbackInsight[];
  notUsefulCount: number;
  reviewCue: CueFeedbackInsight | null;
  topUsefulCue: CueFeedbackInsight | null;
  unclearCount: number;
  usefulCount: number;
  usefulnessRate: number;
};

function reportLookup(reports: LocalAnalysisReport[]) {
  return new Map(reports.map((report) => [report.id, report]));
}

function cueTitle(report: LocalAnalysisReport, cueId: string) {
  return report.cues.find((cue) => cue.id === cueId)?.title ?? cueId;
}

function pct(part: number, total: number) {
  if (total === 0) return 0;
  return Math.round((part / total) * 100);
}

export function summarizeCueFeedbackInsights(
  reports: LocalAnalysisReport[],
  annotations: ReportAnnotation[],
): CueFeedbackInsightSummary {
  const reportsById = reportLookup(reports);
  const byCue = new Map<string, Array<{ feedback: CueFeedback; report: LocalAnalysisReport }>>();

  for (const annotation of annotations) {
    const report = reportsById.get(annotation.reportId);
    if (!report) continue;

    for (const feedback of annotation.cueFeedback) {
      byCue.set(feedback.cueId, [...(byCue.get(feedback.cueId) ?? []), { feedback, report }]);
    }
  }

  const insights = [...byCue.entries()]
    .map(([cueId, entries]) => {
      const orderedEntries = [...entries].sort((a, b) => b.feedback.updatedAt.localeCompare(a.feedback.updatedAt));
      const latest = orderedEntries[0];
      const usefulCount = entries.filter((entry) => entry.feedback.rating === 'useful').length;
      const unclearCount = entries.filter((entry) => entry.feedback.rating === 'unclear').length;
      const notUsefulCount = entries.filter((entry) => entry.feedback.rating === 'not-useful').length;
      const total = entries.length;

      return {
        cueId,
        latestRating: latest.feedback.rating,
        latestReportTitle: latest.report.session.title,
        notUsefulCount,
        title: cueTitle(latest.report, cueId),
        total,
        unclearCount,
        usefulCount,
        usefulnessRate: pct(usefulCount, total),
      };
    })
    .sort(
      (a, b) =>
        b.total - a.total ||
        b.usefulnessRate - a.usefulnessRate ||
        b.notUsefulCount - a.notUsefulCount ||
        a.title.localeCompare(b.title),
    );

  const feedbackCount = insights.reduce((sum, insight) => sum + insight.total, 0);
  const usefulCount = insights.reduce((sum, insight) => sum + insight.usefulCount, 0);
  const unclearCount = insights.reduce((sum, insight) => sum + insight.unclearCount, 0);
  const notUsefulCount = insights.reduce((sum, insight) => sum + insight.notUsefulCount, 0);
  const topUsefulCue =
    [...insights]
      .filter((insight) => insight.usefulCount > 0)
      .sort((a, b) => b.usefulCount - a.usefulCount || b.usefulnessRate - a.usefulnessRate || b.total - a.total)[0] ??
    null;
  const reviewCue =
    [...insights]
      .filter((insight) => insight.unclearCount + insight.notUsefulCount > 0)
      .sort(
        (a, b) =>
          b.notUsefulCount + b.unclearCount - (a.notUsefulCount + a.unclearCount) ||
          b.notUsefulCount - a.notUsefulCount ||
          b.total - a.total,
      )[0] ?? null;

  return {
    feedbackCount,
    insights: insights.slice(0, 4),
    notUsefulCount,
    reviewCue,
    topUsefulCue,
    unclearCount,
    usefulCount,
    usefulnessRate: pct(usefulCount, feedbackCount),
  };
}
