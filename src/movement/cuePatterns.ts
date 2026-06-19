import type { LocalAnalysisReport, MovementCue } from './contracts';

export type CuePatternStatus = 'persistent' | 'emerging' | 'cleared';

export type CuePattern = {
  drill: string;
  firstSeenAt: string;
  lastSeenAt: string;
  latestReportTitle: string;
  occurrences: number;
  reportCount: number;
  severity: MovementCue['severity'];
  status: CuePatternStatus;
  title: string;
  cueId: string;
};

export type CuePatternSummary = {
  latestCueCount: number;
  patternCount: number;
  patterns: CuePattern[];
  resolvedCount: number;
};

const severityRank: Record<MovementCue['severity'], number> = {
  fix: 3,
  watch: 2,
  info: 1,
};

function sortReports(reports: LocalAnalysisReport[]) {
  return [...reports].sort((a, b) => b.session.createdAt.localeCompare(a.session.createdAt));
}

function mostSevere(cues: MovementCue[]) {
  return [...cues].sort((a, b) => severityRank[b.severity] - severityRank[a.severity])[0];
}

export function summarizeCuePatterns(reports: LocalAnalysisReport[]): CuePatternSummary {
  const orderedReports = sortReports(reports);
  const latestReport = orderedReports[0] ?? null;
  const latestCueIds = new Set(latestReport?.cues.map((cue) => cue.id) ?? []);
  const byCue = new Map<string, Array<{ cue: MovementCue; report: LocalAnalysisReport }>>();

  for (const report of orderedReports) {
    for (const cue of report.cues) {
      byCue.set(cue.id, [...(byCue.get(cue.id) ?? []), { cue, report }]);
    }
  }

  const allPatterns = [...byCue.entries()]
    .flatMap(([cueId, entries]) => {
      const uniqueReportIds = new Set(entries.map((entry) => entry.report.id));
      const latestEntry = entries.sort((a, b) => b.report.session.createdAt.localeCompare(a.report.session.createdAt))[0];
      const severeCue = mostSevere(entries.map((entry) => entry.cue));
      const isInLatest = latestCueIds.has(cueId);
      const status: CuePatternStatus = isInLatest ? (uniqueReportIds.size > 1 ? 'persistent' : 'emerging') : 'cleared';

      return {
        cueId,
        drill: severeCue.drill,
        firstSeenAt: entries[entries.length - 1].report.session.createdAt,
        lastSeenAt: latestEntry.report.session.createdAt,
        latestReportTitle: latestEntry.report.session.title,
        occurrences: entries.length,
        reportCount: uniqueReportIds.size,
        severity: severeCue.severity,
        status,
        title: severeCue.title,
      };
    })
    .sort(
      (a, b) =>
        (b.status === 'persistent' ? 2 : b.status === 'emerging' ? 1 : 0) -
          (a.status === 'persistent' ? 2 : a.status === 'emerging' ? 1 : 0) ||
        severityRank[b.severity] - severityRank[a.severity] ||
        b.reportCount - a.reportCount ||
        b.lastSeenAt.localeCompare(a.lastSeenAt),
    )
  const patterns = allPatterns.slice(0, 4);

  return {
    latestCueCount: latestCueIds.size,
    patternCount: byCue.size,
    patterns,
    resolvedCount: allPatterns.filter((pattern) => pattern.status === 'cleared').length,
  };
}
