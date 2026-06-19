import { describe, expect, it } from 'vitest';

import {
  buildVideoAnalysisPerformance,
  formatAnalysisDuration,
  formatAnalysisFrameRate,
  resolveVideoAnalysisBudgetMs,
} from '../src/video/performanceBudget';

describe('video analysis performance budgets', () => {
  it('resolves native QA budgets by clip duration', () => {
    expect(resolveVideoAnalysisBudgetMs(10_000)).toBe(8_000);
    expect(resolveVideoAnalysisBudgetMs(45_000)).toBe(25_000);
    expect(resolveVideoAnalysisBudgetMs(60_000)).toBe(35_000);
    expect(resolveVideoAnalysisBudgetMs(120_000)).toBe(35_000);
  });

  it('builds measurable report performance evidence', () => {
    const performance = buildVideoAnalysisPerformance({
      analysisMs: 5_000,
      durationMs: 10_000,
      frameCount: 40,
      measuredAt: '2026-06-19T12:00:00.000Z',
    });

    expect(performance).toEqual({
      analysisMs: 5_000,
      budgetMs: 8_000,
      budgetStatus: 'within-budget',
      framesPerSecond: 8,
      measuredAt: '2026-06-19T12:00:00.000Z',
    });
  });

  it('flags over-budget analysis runs', () => {
    const performance = buildVideoAnalysisPerformance({
      analysisMs: 42_000,
      durationMs: 45_000,
      frameCount: 48,
      measuredAt: '2026-06-19T12:00:00.000Z',
    });

    expect(performance.budgetMs).toBe(25_000);
    expect(performance.budgetStatus).toBe('over-budget');
  });

  it('formats performance evidence for compact mobile UI', () => {
    expect(formatAnalysisDuration(420)).toBe('420ms');
    expect(formatAnalysisDuration(1250)).toBe('1.3s');
    expect(formatAnalysisFrameRate(8750)).toBe('>120 fps');
    expect(formatAnalysisFrameRate(21.4)).toBe('21 fps');
    expect(formatAnalysisFrameRate(6.25)).toBe('6.3 fps');
  });
});
