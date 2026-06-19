import type { LocalAnalysisReport } from './contracts';
import type { ReportAnnotation, RepeatOutcome } from './reportAnnotationRepository';

export type RepeatOutcomeInsight = {
  action: string;
  attemptedCount: number;
  improvedCount: number;
  latest: {
    attempts: number;
    reportId: string;
    status: RepeatOutcome['status'];
    title: string;
    updatedAt: string;
  } | null;
  resolvedCueCount: number;
  sentCount: number;
  stalledCount: number;
  status: 'empty' | 'building' | 'progressing' | 'stalled';
  successRate: number;
  totalLogged: number;
};

function reportsById(reports: LocalAnalysisReport[]) {
  return new Map(reports.map((report) => [report.id, report]));
}

function successStatuses(status: RepeatOutcome['status']) {
  return status === 'improved' || status === 'sent';
}

function actionFor(insight: Omit<RepeatOutcomeInsight, 'action'>) {
  if (insight.totalLogged === 0) return 'Log the result after the next comparable repeat.';
  if (insight.status === 'stalled') return 'Lower the intensity and repeat the same cue before adding grade pressure.';
  if (insight.sentCount > 0) return 'Use the sent repeat as a benchmark and pick the next similar crux.';
  if (insight.improvedCount > 0) return 'Keep the same beta for one more attempt and record a comparison video.';
  return 'Try one more controlled repeat and mark whether the cue changed the movement.';
}

export function summarizeRepeatOutcomes(
  reports: LocalAnalysisReport[],
  annotations: ReportAnnotation[],
): RepeatOutcomeInsight {
  const byId = reportsById(reports);
  const entries = annotations
    .flatMap((annotation) => {
      const report = byId.get(annotation.reportId);
      if (!report || !annotation.repeatOutcome) return [];
      return [{ annotation, outcome: annotation.repeatOutcome, report }];
    })
    .sort((a, b) => b.outcome.updatedAt.localeCompare(a.outcome.updatedAt));

  const attempted = entries.filter((entry) => entry.outcome.status !== 'not-tried');
  const improvedCount = entries.filter((entry) => entry.outcome.status === 'improved').length;
  const sentCount = entries.filter((entry) => entry.outcome.status === 'sent').length;
  const stalledCount = entries.filter((entry) => entry.outcome.status === 'fell' || entry.outcome.status === 'regressed').length;
  const successCount = entries.filter((entry) => successStatuses(entry.outcome.status)).length;
  const successRate = attempted.length === 0 ? 0 : Math.round((successCount / attempted.length) * 100);

  const base = {
    attemptedCount: attempted.length,
    improvedCount,
    latest: entries[0]
      ? {
          attempts: entries[0].outcome.attempts,
          reportId: entries[0].report.id,
          status: entries[0].outcome.status,
          title: entries[0].report.session.title,
          updatedAt: entries[0].outcome.updatedAt,
        }
      : null,
    resolvedCueCount: new Set(entries.flatMap((entry) => entry.outcome.resolvedCueIds)).size,
    sentCount,
    stalledCount,
    status:
      entries.length === 0
        ? ('empty' as const)
        : stalledCount > improvedCount + sentCount
          ? ('stalled' as const)
          : successCount > 0
            ? ('progressing' as const)
            : ('building' as const),
    successRate,
    totalLogged: entries.length,
  };

  return {
    ...base,
    action: actionFor(base),
  };
}
