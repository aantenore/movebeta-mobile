import type { ClimbSession, LocalAnalysisReport } from './contracts';
import type { ReportAnnotation, RepeatOutcome } from './reportAnnotationRepository';

export type BetaMemoryStatus = 'empty' | 'building' | 'ready';

export type BetaMemoryEntry = {
  attempts: number;
  cueTitles: string[];
  evidence: string;
  grade: string;
  gym: string;
  recommendation: string;
  reportId: string;
  status: Extract<RepeatOutcome['status'], 'improved' | 'sent'>;
  title: string;
  updatedAt: string;
  wallAngle: ClimbSession['wallAngle'];
};

export type BetaMemorySummary = {
  buildingCount: number;
  entries: BetaMemoryEntry[];
  improvedCount: number;
  recommendation: string;
  sentCount: number;
  status: BetaMemoryStatus;
  topPattern: string;
  totalSuccessful: number;
};

export type BetaMemoryOptions = {
  limit: number;
};

const defaultOptions: BetaMemoryOptions = {
  limit: 4,
};

function reportsById(reports: LocalAnalysisReport[]) {
  return new Map(reports.map((report) => [report.id, report]));
}

function isSuccessfulRepeat(status: RepeatOutcome['status']): status is BetaMemoryEntry['status'] {
  return status === 'improved' || status === 'sent';
}

function resolvedCueTitles(report: LocalAnalysisReport, cueIds: string[]) {
  const cueLookup = new Map(report.cues.map((cue) => [cue.id, cue.title]));
  return cueIds.flatMap((cueId) => {
    const title = cueLookup.get(cueId);
    return title ? [title] : [];
  });
}

function recommendationForEntry(report: LocalAnalysisReport, status: BetaMemoryEntry['status'], cueTitles: string[]) {
  if (status === 'sent') {
    return `Use ${report.session.title} as the benchmark before trying a harder ${report.session.wallAngle} climb.`;
  }
  if (cueTitles.length > 0) {
    return `Repeat the same beta once more and keep ${cueTitles[0].toLowerCase()} as the anchor.`;
  }
  return `Repeat ${report.session.title} once more with the same camera setup before changing grade.`;
}

function evidenceForEntry(outcome: RepeatOutcome, cueTitles: string[]) {
  const cueCopy = cueTitles.length > 0 ? `${cueTitles.length} resolved cue${cueTitles.length === 1 ? '' : 's'}` : 'no resolved cues tagged';
  return `${outcome.status} after ${outcome.attempts} repeat attempt${outcome.attempts === 1 ? '' : 's'} with ${cueCopy}.`;
}

function topPatternFor(entries: BetaMemoryEntry[]) {
  if (entries.length === 0) return 'No successful repeat pattern yet.';
  const counts = new Map<string, { count: number; label: string; sent: number }>();

  for (const entry of entries) {
    const key = `${entry.wallAngle}-${entry.grade}`;
    const current = counts.get(key) ?? {
      count: 0,
      label: `${entry.wallAngle} ${entry.grade}`,
      sent: 0,
    };
    counts.set(key, {
      ...current,
      count: current.count + 1,
      sent: current.sent + (entry.status === 'sent' ? 1 : 0),
    });
  }

  const best = [...counts.values()].sort((a, b) => b.sent - a.sent || b.count - a.count || a.label.localeCompare(b.label))[0];
  return `${best.label} produced ${best.count} successful repeat${best.count === 1 ? '' : 's'}.`;
}

function summaryRecommendation(status: BetaMemoryStatus, entries: BetaMemoryEntry[], buildingCount: number) {
  if (status === 'empty') return 'Log an improved or sent repeat to build a local beta memory.';
  if (status === 'building') {
    return `${buildingCount} repeat outcome${buildingCount === 1 ? '' : 's'} logged; mark the first improved or sent repeat to unlock reuse cues.`;
  }
  const sent = entries.find((entry) => entry.status === 'sent');
  if (sent) return `Start from the sent beta on ${sent.title}, then compare the next similar crux.`;
  return `Keep the improved beta from ${entries[0].title} and record one more comparable repeat.`;
}

export function summarizeBetaMemory(
  reports: LocalAnalysisReport[],
  annotations: ReportAnnotation[],
  options: Partial<BetaMemoryOptions> = {},
): BetaMemorySummary {
  const config = { ...defaultOptions, ...options };
  const byId = reportsById(reports);
  const matched = annotations.flatMap((annotation) => {
    const report = byId.get(annotation.reportId);
    if (!report || !annotation.repeatOutcome) return [];
    return [{ annotation, outcome: annotation.repeatOutcome, report }];
  });
  const successfulEntries = matched
    .flatMap(({ outcome, report }) => {
      const status = outcome.status;
      if (!isSuccessfulRepeat(status)) return [];
      const cueTitles = resolvedCueTitles(report, outcome.resolvedCueIds);
      return [{
        attempts: outcome.attempts,
        cueTitles,
        evidence: evidenceForEntry(outcome, cueTitles),
        grade: report.session.grade,
        gym: report.session.gym,
        recommendation: recommendationForEntry(report, status, cueTitles),
        reportId: report.id,
        status,
        title: report.session.title,
        updatedAt: outcome.updatedAt,
        wallAngle: report.session.wallAngle,
      }];
    })
    .sort((a, b) => {
      const statusDelta = (b.status === 'sent' ? 1 : 0) - (a.status === 'sent' ? 1 : 0);
      return statusDelta || b.updatedAt.localeCompare(a.updatedAt) || a.title.localeCompare(b.title);
    });
  const entries = successfulEntries.slice(0, config.limit);
  const buildingCount = matched.filter((entry) => entry.outcome.status === 'fell' || entry.outcome.status === 'regressed').length;
  const status = entries.length > 0 ? 'ready' : buildingCount > 0 ? 'building' : 'empty';

  return {
    buildingCount,
    entries,
    improvedCount: successfulEntries.filter((entry) => entry.status === 'improved').length,
    recommendation: summaryRecommendation(status, entries, buildingCount),
    sentCount: successfulEntries.filter((entry) => entry.status === 'sent').length,
    status,
    topPattern: topPatternFor(successfulEntries),
    totalSuccessful: successfulEntries.length,
  };
}
