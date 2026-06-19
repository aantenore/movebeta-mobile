export type VideoAnalysisPerformance = {
  analysisMs: number;
  budgetMs: number;
  budgetStatus: 'within-budget' | 'over-budget' | 'not-measured';
  framesPerSecond: number;
  measuredAt: string;
};

const videoAnalysisBudgets = [
  { maxDurationMs: 10_000, budgetMs: 8_000 },
  { maxDurationMs: 45_000, budgetMs: 25_000 },
  { maxDurationMs: 60_000, budgetMs: 35_000 },
] as const;

export const unmeasuredVideoAnalysisPerformance: VideoAnalysisPerformance = {
  analysisMs: 0,
  budgetMs: 0,
  budgetStatus: 'not-measured',
  framesPerSecond: 0,
  measuredAt: '1970-01-01T00:00:00.000Z',
};

export function resolveVideoAnalysisBudgetMs(durationMs: number) {
  const match = videoAnalysisBudgets.find((budget) => durationMs <= budget.maxDurationMs);
  return match?.budgetMs ?? videoAnalysisBudgets[videoAnalysisBudgets.length - 1].budgetMs;
}

export function buildVideoAnalysisPerformance(input: {
  analysisMs: number;
  durationMs: number;
  frameCount: number;
  measuredAt?: string;
}): VideoAnalysisPerformance {
  const analysisMs = Math.max(0, Math.round(input.analysisMs));
  const budgetMs = resolveVideoAnalysisBudgetMs(input.durationMs);
  const seconds = analysisMs / 1000;

  return {
    analysisMs,
    budgetMs,
    budgetStatus: analysisMs === 0 ? 'not-measured' : analysisMs <= budgetMs ? 'within-budget' : 'over-budget',
    framesPerSecond: seconds > 0 ? Number((input.frameCount / seconds).toFixed(2)) : 0,
    measuredAt: input.measuredAt ?? new Date().toISOString(),
  };
}

export function formatAnalysisDuration(analysisMs: number) {
  if (analysisMs < 1000) return `${Math.round(analysisMs)}ms`;
  return `${(analysisMs / 1000).toFixed(1)}s`;
}

export function formatAnalysisFrameRate(framesPerSecond: number) {
  if (framesPerSecond <= 0) return '0 fps';
  if (framesPerSecond > 120) return '>120 fps';
  if (framesPerSecond >= 10) return `${Math.round(framesPerSecond)} fps`;
  return `${framesPerSecond.toFixed(1)} fps`;
}
