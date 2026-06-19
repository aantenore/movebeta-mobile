import type { LocalAnalysisReport, MovementCue } from './contracts';

export type DrillPlanPriority = 'high' | 'medium' | 'maintenance';

export type DrillPlanItem = {
  id: string;
  cueId: string;
  title: string;
  focus: string;
  drill: string;
  dosage: string;
  evidence: string;
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

function sortReports(reports: LocalAnalysisReport[]) {
  return [...reports].sort((a, b) => b.session.createdAt.localeCompare(a.session.createdAt));
}

function shouldReplace(existing: DrillPlanItem, candidate: DrillPlanItem) {
  const rankDelta = priorityRank[candidate.priority] - priorityRank[existing.priority];
  return rankDelta > 0;
}

function buildItem(report: LocalAnalysisReport, cue: MovementCue): DrillPlanItem {
  const priority = cuePriority(cue);

  return {
    cueId: cue.id,
    dosage: dosageForPriority(priority),
    drill: cue.drill,
    evidence: `${report.session.title} at ${(cue.timestampMs / 1000).toFixed(1)}s`,
    focus: cue.title,
    id: `${cue.id}-${report.id}`,
    priority,
    sourceReportId: report.id,
    sourceSessionTitle: report.session.title,
    title: cue.title,
  };
}

export function buildDrillPlan(reports: LocalAnalysisReport[]): DrillPlan {
  const orderedReports = sortReports(reports);
  const byCue = new Map<string, DrillPlanItem>();

  for (const report of orderedReports) {
    for (const cue of report.cues) {
      const item = buildItem(report, cue);
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
  const weeklyLoad =
    highPriorityCount > 0
      ? `${highPriorityCount} priority focus${highPriorityCount > 1 ? 'es' : ''}, 2 technique days`
      : 'Technique maintenance, 1 to 2 easy days';

  return {
    items,
    sourceReportCount: orderedReports.length,
    weeklyLoad,
  };
}
