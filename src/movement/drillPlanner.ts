import type { LocalAnalysisReport, MovementCue } from './contracts';
import type { CueFeedback, ReportAnnotation } from './reportAnnotationRepository';
import { coachLensDrillDosageHint, sortCuesForCoachLens } from './coachLens';

export type DrillPlanPriority = 'high' | 'medium' | 'maintenance';
export type DrillFeedbackStatus = 'reinforce' | 'variant' | 'untested';

export type DrillPlanItem = {
  id: string;
  cueId: string;
  title: string;
  focus: string;
  drill: string;
  dosage: string;
  evidence: string;
  feedbackEvidence: string;
  feedbackStatus: DrillFeedbackStatus;
  priority: DrillPlanPriority;
  sourceReportId: string;
  sourceSessionTitle: string;
};

export type DrillPlan = {
  sourceReportCount: number;
  weeklyLoad: string;
  items: DrillPlanItem[];
};

const priorityRank: Record<DrillPlanPriority, number> = {
  high: 3,
  medium: 2,
  maintenance: 1,
};

function cuePriority(cue: MovementCue): DrillPlanPriority {
  if (cue.severity === 'fix') return 'high';
  if (cue.severity === 'watch') return 'medium';
  return 'maintenance';
}

function dosageForPriority(priority: DrillPlanPriority) {
  if (priority === 'high') return '3 sets x 3 focused repeats';
  if (priority === 'medium') return '2 sets x 3 controlled repeats';
  return '1 set x 4 easy repeats';
}

function dosageForReport(report: LocalAnalysisReport, priority: DrillPlanPriority) {
  const hint = coachLensDrillDosageHint(report.engine.coachLens.key);
  const dosage = dosageForPriority(priority);
  return hint ? `${dosage} · ${hint}` : dosage;
}

function sortReports(reports: LocalAnalysisReport[]) {
  return [...reports].sort((a, b) => b.session.createdAt.localeCompare(a.session.createdAt));
}

function shouldReplace(existing: DrillPlanItem, candidate: DrillPlanItem) {
  const rankDelta = priorityRank[candidate.priority] - priorityRank[existing.priority];
  if (rankDelta !== 0) return rankDelta > 0;
  return feedbackRank(candidate.feedbackStatus) > feedbackRank(existing.feedbackStatus);
}

function feedbackRank(status: DrillFeedbackStatus) {
  if (status === 'reinforce') return 3;
  if (status === 'untested') return 2;
  return 1;
}

function summarizeCueFeedback(feedback: CueFeedback[]): Pick<DrillPlanItem, 'feedbackEvidence' | 'feedbackStatus'> {
  if (feedback.length === 0) {
    return {
      feedbackEvidence: 'No private feedback yet.',
      feedbackStatus: 'untested',
    };
  }

  const usefulCount = feedback.filter((item) => item.rating === 'useful').length;
  const unclearCount = feedback.filter((item) => item.rating === 'unclear').length;
  const notUsefulCount = feedback.filter((item) => item.rating === 'not-useful').length;
  const reviewCount = unclearCount + notUsefulCount;
  const total = feedback.length;

  if (usefulCount > reviewCount) {
    return {
      feedbackEvidence: `${usefulCount}/${total} marked useful; repeat this cue before changing the drill.`,
      feedbackStatus: 'reinforce',
    };
  }

  return {
    feedbackEvidence: `${reviewCount}/${total} need review; try a different constraint or ask a coach.`,
    feedbackStatus: 'variant',
  };
}

function buildFeedbackLookup(reports: LocalAnalysisReport[], annotations: ReportAnnotation[]) {
  const reportIds = new Set(reports.map((report) => report.id));
  const byCue = new Map<string, CueFeedback[]>();

  for (const annotation of annotations) {
    if (!reportIds.has(annotation.reportId)) continue;

    for (const feedback of annotation.cueFeedback) {
      byCue.set(feedback.cueId, [...(byCue.get(feedback.cueId) ?? []), feedback]);
    }
  }

  return byCue;
}

function buildItem(report: LocalAnalysisReport, cue: MovementCue, feedback: CueFeedback[]): DrillPlanItem {
  const priority = cuePriority(cue);
  const feedbackSummary = summarizeCueFeedback(feedback);

  return {
    cueId: cue.id,
    dosage: dosageForReport(report, priority),
    drill: cue.drill,
    evidence: `${report.session.title} at ${(cue.timestampMs / 1000).toFixed(1)}s`,
    feedbackEvidence: feedbackSummary.feedbackEvidence,
    feedbackStatus: feedbackSummary.feedbackStatus,
    focus: cue.title,
    id: `${cue.id}-${report.id}`,
    priority,
    sourceReportId: report.id,
    sourceSessionTitle: report.session.title,
    title: cue.title,
  };
}

export function buildDrillPlan(reports: LocalAnalysisReport[], annotations: ReportAnnotation[] = []): DrillPlan {
  const orderedReports = sortReports(reports);
  const feedbackByCue = buildFeedbackLookup(orderedReports, annotations);
  const byCue = new Map<string, DrillPlanItem>();

  for (const report of orderedReports) {
    for (const cue of sortCuesForCoachLens(report.cues, report.engine.coachLens.key)) {
      const item = buildItem(report, cue, feedbackByCue.get(cue.id) ?? []);
      const existing = byCue.get(cue.id);
      if (!existing || shouldReplace(existing, item)) {
        byCue.set(cue.id, item);
      }
    }
  }

  const items = [...byCue.values()]
    .sort((a, b) => priorityRank[b.priority] - priorityRank[a.priority] || a.focus.localeCompare(b.focus))
    .slice(0, 4);

  if (items.length === 0) {
    return {
      items: [],
      sourceReportCount: orderedReports.length,
      weeklyLoad: 'No focused drill load until a report produces coach cues.',
    };
  }

  const highPriorityCount = items.filter((item) => item.priority === 'high').length;
  const variantCount = items.filter((item) => item.feedbackStatus === 'variant').length;
  const baseLoad =
    highPriorityCount > 0
      ? `${highPriorityCount} priority focus${highPriorityCount > 1 ? 'es' : ''}, 2 technique days`
      : 'Technique maintenance, 1 to 2 easy days';
  const weeklyLoad =
    variantCount > 0 ? `${baseLoad} · ${variantCount} cue${variantCount > 1 ? 's' : ''} need variants` : baseLoad;

  return {
    items,
    sourceReportCount: orderedReports.length,
    weeklyLoad,
  };
}
