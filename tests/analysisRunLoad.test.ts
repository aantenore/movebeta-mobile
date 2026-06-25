import { describe, expect, it } from 'vitest';

import {
  analysisRunLoadSchemaVersion,
  assertAnalysisRunLoadIsShareSafe,
  buildAnalysisRunLoad,
  createAnalysisRunLoadRecord,
} from '../src/core/analysisRunLoad';

const now = '2026-06-25T10:00:00.000Z';

function minutesAgo(minutes: number) {
  return new Date(Date.parse(now) - minutes * 60_000).toISOString();
}

describe('analysis run load', () => {
  it('marks an empty local run window as ready', () => {
    const load = buildAnalysisRunLoad({
      currentBudgetMs: 12_000,
      generatedAt: now,
      records: [],
    });

    expect(load.schemaVersion).toBe(analysisRunLoadSchemaVersion);
    expect(load.summary).toMatchObject({
      canStartAnalysis: true,
      cooldownRemainingMs: 0,
      recentRunCount: 0,
      status: 'ready',
    });
    expect(load.privacy).toMatchObject({
      rawVideoIncluded: false,
      reportIdsIncluded: false,
      videoUriIncluded: false,
    });
  });

  it('recommends cooldown after repeated recent analyses', () => {
    const records = [8, 4, 1].map((minutes) =>
      createAnalysisRunLoadRecord({
        activeDurationMs: 12_000,
        analysisMs: 800,
        budgetMs: 12_000,
        completedAt: minutesAgo(minutes),
        provider: 'web-tfjs-movenet',
        sourceType: 'camera',
      }),
    );

    const load = buildAnalysisRunLoad({
      currentBudgetMs: 12_000,
      generatedAt: now,
      records,
    });

    expect(load.summary.status).toBe('cooldown');
    expect(load.summary.canStartAnalysis).toBe(false);
    expect(load.summary.recentRunCount).toBe(3);
    expect(load.summary.cooldownRemainingMs).toBe(120_000);
    expect(load.steps.find((step) => step.key === 'cooldown')?.status).toBe('action');
  });

  it('ignores old records outside the configured window', () => {
    const load = buildAnalysisRunLoad({
      currentBudgetMs: 12_000,
      generatedAt: now,
      records: [
        createAnalysisRunLoadRecord({
          activeDurationMs: 12_000,
          analysisMs: 800,
          budgetMs: 12_000,
          completedAt: minutesAgo(20),
          provider: 'local-fixture',
          sourceType: 'fixture',
        }),
      ],
    });

    expect(load.summary.recentRunCount).toBe(0);
    expect(load.summary.status).toBe('ready');
  });

  it('marks high current budget as review', () => {
    const load = buildAnalysisRunLoad({
      currentBudgetMs: 75_000,
      generatedAt: now,
      records: [],
    });

    expect(load.summary.status).toBe('review');
    expect(load.steps.find((step) => step.key === 'runtime-budget')?.status).toBe('review');
  });

  it('marks sustained measured runtime as review', () => {
    const load = buildAnalysisRunLoad({
      currentBudgetMs: 12_000,
      generatedAt: now,
      records: [
        createAnalysisRunLoadRecord({
          activeDurationMs: 45_000,
          analysisMs: 95_000,
          budgetMs: 45_000,
          completedAt: minutesAgo(2),
          provider: 'native-platform-pose',
          sourceType: 'import',
        }),
      ],
    });

    expect(load.summary.status).toBe('review');
    expect(load.summary.totalRecentAnalysisMs).toBe(95_000);
    expect(load.steps.find((step) => step.key === 'device-boundary')?.status).toBe('review');
  });

  it('rejects unsafe exported values', () => {
    const load = buildAnalysisRunLoad({
      currentBudgetMs: 12_000,
      generatedAt: now,
      records: [],
    });

    expect(() =>
      assertAnalysisRunLoadIsShareSafe({
        ...load,
        steps: load.steps.map((step, index) =>
          index === 0 ? { ...step, detail: 'Report stored at /Users/antonio/private-run.mp4.' } : step,
        ),
      }),
    ).toThrow('Analysis run load contains credential');
  });
});
