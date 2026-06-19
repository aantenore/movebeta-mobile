import type { ClimbSession, LocalAnalysisReport } from './contracts';

export type BenchmarkSegment = 'overall' | 'wall-angle' | 'grade' | 'gym';

export type PersonalBenchmark = {
  averageQuality: number;
  bestReport: LocalAnalysisReport;
  latestReport: LocalAnalysisReport;
  latestVsBestDelta: number;
  reportCount: number;
  segment: BenchmarkSegment;
  title: string;
};

export type PersonalBenchmarkSummary = {
  bestOverall: PersonalBenchmark | null;
  benchmarks: PersonalBenchmark[];
};

function sortReports(reports: LocalAnalysisReport[]) {
  return [...reports].sort((a, b) => b.session.createdAt.localeCompare(a.session.createdAt));
}

function averageQuality(reports: LocalAnalysisReport[]) {
  if (reports.length === 0) return 0;
  return Math.round(reports.reduce((sum, report) => sum + report.analysisQuality.score, 0) / reports.length);
}

function benchmarkTitle(segment: BenchmarkSegment, value: string) {
  if (segment === 'overall') return 'Overall best';
  if (segment === 'wall-angle') return `${value} benchmark`;
  if (segment === 'grade') return `${value} benchmark`;
  return `${value} benchmark`;
}

function buildBenchmark(segment: BenchmarkSegment, value: string, reports: LocalAnalysisReport[]): PersonalBenchmark | null {
  if (reports.length === 0) return null;

  const orderedReports = sortReports(reports);
  const latestReport = orderedReports[0];
  const bestReport = [...orderedReports].sort(
    (a, b) => b.analysisQuality.score - a.analysisQuality.score || b.session.createdAt.localeCompare(a.session.createdAt),
  )[0];

  return {
    averageQuality: averageQuality(orderedReports),
    bestReport,
    latestReport,
    latestVsBestDelta: latestReport.analysisQuality.score - bestReport.analysisQuality.score,
    reportCount: orderedReports.length,
    segment,
    title: benchmarkTitle(segment, value),
  };
}

function groupBy<T extends string>(reports: LocalAnalysisReport[], key: (report: LocalAnalysisReport) => T | string) {
  const groups = new Map<string, LocalAnalysisReport[]>();
  for (const report of reports) {
    const value = key(report);
    groups.set(value, [...(groups.get(value) ?? []), report]);
  }
  return groups;
}

function segmentBenchmarks(
  reports: LocalAnalysisReport[],
  segment: Exclude<BenchmarkSegment, 'overall'>,
  key: (session: ClimbSession) => string,
) {
  return [...groupBy(reports, (report) => key(report.session)).entries()]
    .flatMap(([value, groupedReports]) => {
      const benchmark = buildBenchmark(segment, value, groupedReports);
      return benchmark ? [benchmark] : [];
    })
    .sort(
      (a, b) =>
        b.bestReport.analysisQuality.score - a.bestReport.analysisQuality.score ||
        b.reportCount - a.reportCount ||
        a.title.localeCompare(b.title),
    );
}

export function summarizePersonalBenchmarks(reports: LocalAnalysisReport[]): PersonalBenchmarkSummary {
  const orderedReports = sortReports(reports);
  const bestOverall = buildBenchmark('overall', 'overall', orderedReports);
  const wallBenchmarks = segmentBenchmarks(orderedReports, 'wall-angle', (session) => session.wallAngle);
  const gradeBenchmarks = segmentBenchmarks(orderedReports, 'grade', (session) => session.grade);
  const gymBenchmarks = segmentBenchmarks(orderedReports, 'gym', (session) => session.gym);
  const topBySegment = [wallBenchmarks[0], gradeBenchmarks[0], gymBenchmarks[0]].filter(Boolean) as PersonalBenchmark[];
  const alreadySelected = new Set(topBySegment.map((benchmark) => `${benchmark.segment}-${benchmark.title}`));
  const remaining = [...wallBenchmarks, ...gradeBenchmarks, ...gymBenchmarks].filter(
    (benchmark) => !alreadySelected.has(`${benchmark.segment}-${benchmark.title}`),
  );
  const benchmarks = [...topBySegment, ...remaining].slice(0, 6);

  return {
    bestOverall,
    benchmarks,
  };
}

export function formatBenchmarkDelta(delta: number) {
  if (delta === 0) return 'at best';
  return `${delta > 0 ? '+' : ''}${delta} vs best`;
}
