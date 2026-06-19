import type { LocalAnalysisReport } from './contracts';
import type { DrillPracticeRecord } from './drillPracticeRepository';

export type DrillPracticeInsight = {
  completedCount: number;
  completionRate: number;
  cueId: string;
  latestReportTitle: string;
  latestStatus: DrillPracticeRecord['status'];
  skippedCount: number;
  title: string;
  total: number;
};

export type DrillPracticeInsightSummary = {
  completedCount: number;
  completionRate: number;
  insights: DrillPracticeInsight[];
  latest: DrillPracticeInsight | null;
  recommendation: string;
  skippedCount: number;
  skippedCue: DrillPracticeInsight | null;
  status: 'empty' | 'building' | 'consistent' | 'blocked';
  totalCount: number;
};

function pct(part: number, total: number) {
  if (total === 0) return 0;
  return Math.round((part / total) * 100);
}

function reportLookup(reports: LocalAnalysisReport[]) {
  return new Map(reports.map((report) => [report.id, report]));
}

function cueTitle(report: LocalAnalysisReport, cueId: string) {
  return report.cues.find((cue) => cue.id === cueId)?.title ?? cueId;
}

function summarizeStatus(completionRate: number, completedCount: number, skippedCount: number): DrillPracticeInsightSummary['status'] {
  if (completedCount + skippedCount === 0) return 'empty';
  if (skippedCount > completedCount) return 'blocked';
  if (completionRate >= 70) return 'consistent';
  return 'building';
}

function recommendationFor(status: DrillPracticeInsightSummary['status']) {
  if (status === 'empty') return 'Log one suggested drill as done or skipped to measure practice follow-through.';
  if (status === 'blocked') return 'Pick the most skipped cue and use an easier variant before adding volume.';
  if (status === 'consistent') return 'Keep the current cadence and compare the next repeat against your best benchmark.';
  return 'Complete one suggested drill before increasing session intensity.';
}

export function summarizeDrillPracticeInsights(
  reports: LocalAnalysisReport[],
  records: DrillPracticeRecord[],
): DrillPracticeInsightSummary {
  const reportsById = reportLookup(reports);
  const byCue = new Map<string, Array<{ record: DrillPracticeRecord; report: LocalAnalysisReport }>>();

  for (const record of records) {
    const report = reportsById.get(record.reportId);
    if (!report) continue;
    byCue.set(record.cueId, [...(byCue.get(record.cueId) ?? []), { record, report }]);
  }

  const insights = [...byCue.entries()]
    .map(([cueId, entries]) => {
      const orderedEntries = [...entries].sort((a, b) => b.record.updatedAt.localeCompare(a.record.updatedAt));
      const latest = orderedEntries[0];
      const completedCount = entries.filter((entry) => entry.record.status === 'completed').length;
      const skippedCount = entries.filter((entry) => entry.record.status === 'skipped').length;
      const total = entries.length;

      return {
        completedCount,
        completionRate: pct(completedCount, total),
        cueId,
        latestReportTitle: latest.report.session.title,
        latestStatus: latest.record.status,
        skippedCount,
        title: cueTitle(latest.report, cueId),
        total,
      };
    })
    .sort(
      (a, b) =>
        b.total - a.total ||
        b.completionRate - a.completionRate ||
        b.skippedCount - a.skippedCount ||
        a.title.localeCompare(b.title),
    );

  const totalCount = insights.reduce((sum, insight) => sum + insight.total, 0);
  const completedCount = insights.reduce((sum, insight) => sum + insight.completedCount, 0);
  const skippedCount = insights.reduce((sum, insight) => sum + insight.skippedCount, 0);
  const completionRate = pct(completedCount, totalCount);
  const status = summarizeStatus(completionRate, completedCount, skippedCount);
  const latest =
    [...insights].sort((a, b) => {
      const latestA = records
        .filter((record) => record.cueId === a.cueId && reportsById.has(record.reportId))
        .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt))[0];
      const latestB = records
        .filter((record) => record.cueId === b.cueId && reportsById.has(record.reportId))
        .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt))[0];
      return (latestB?.updatedAt ?? '').localeCompare(latestA?.updatedAt ?? '');
    })[0] ?? null;
  const skippedCue =
    [...insights]
      .filter((insight) => insight.skippedCount > 0)
      .sort((a, b) => b.skippedCount - a.skippedCount || b.total - a.total || a.title.localeCompare(b.title))[0] ?? null;

  return {
    completedCount,
    completionRate,
    insights: insights.slice(0, 4),
    latest,
    recommendation: recommendationFor(status),
    skippedCount,
    skippedCue,
    status,
    totalCount,
  };
}
