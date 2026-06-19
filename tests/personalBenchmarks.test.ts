import { describe, expect, it } from 'vitest';

import type { LocalAnalysisReport } from '../src/movement/contracts';
import { localMovementAnalyzer } from '../src/movement/localAnalyzer';
import { formatBenchmarkDelta, summarizePersonalBenchmarks } from '../src/movement/personalBenchmarks';
import { sampleAttempts } from '../src/movement/sampleSession';

async function buildSampleReports() {
  return Promise.all(
    sampleAttempts.map((attempt) =>
      localMovementAnalyzer.analyze({
        frames: attempt.frames,
        session: attempt.session,
      }),
    ),
  );
}

function withQuality(report: LocalAnalysisReport, score: number, createdAt: string): LocalAnalysisReport {
  return {
    ...report,
    analysisQuality: {
      ...report.analysisQuality,
      score,
    },
    session: {
      ...report.session,
      createdAt,
    },
  };
}

describe('personal benchmarks', () => {
  it('summarizes best overall and segment benchmarks from local reports', async () => {
    const reports = await buildSampleReports();
    const summary = summarizePersonalBenchmarks(reports);

    expect(summary.bestOverall?.title).toBe('Overall best');
    expect(summary.bestOverall?.reportCount).toBe(3);
    expect(summary.benchmarks.map((benchmark) => benchmark.segment)).toContain('wall-angle');
    expect(summary.benchmarks.map((benchmark) => benchmark.segment)).toContain('grade');
    expect(summary.benchmarks.map((benchmark) => benchmark.segment)).toContain('gym');
  });

  it('compares latest report against the best report in a segment', async () => {
    const [base] = await buildSampleReports();
    const olderBest = withQuality(base, 94, '2026-06-17T10:00:00+02:00');
    const latestLower = withQuality(
      {
        ...base,
        id: `${base.id}-repeat`,
      },
      82,
      '2026-06-18T10:00:00+02:00',
    );

    const summary = summarizePersonalBenchmarks([olderBest, latestLower]);

    expect(summary.bestOverall?.bestReport.id).toBe(olderBest.id);
    expect(summary.bestOverall?.latestReport.id).toBe(latestLower.id);
    expect(summary.bestOverall?.latestVsBestDelta).toBe(-12);
    expect(formatBenchmarkDelta(-12)).toBe('-12 vs best');
  });

  it('returns empty benchmark state when no reports exist', () => {
    const summary = summarizePersonalBenchmarks([]);

    expect(summary.bestOverall).toBeNull();
    expect(summary.benchmarks).toEqual([]);
    expect(formatBenchmarkDelta(0)).toBe('at best');
  });
});
