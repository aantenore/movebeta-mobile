import { describe, expect, it } from 'vitest';

import type { LocalAnalysisReport, MovementCue } from '../src/movement/contracts';
import { summarizeCuePatterns } from '../src/movement/cuePatterns';
import { localMovementAnalyzer } from '../src/movement/localAnalyzer';
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

function withReportShape(report: LocalAnalysisReport, createdAt: string, cues: MovementCue[]): LocalAnalysisReport {
  return {
    ...report,
    cues,
    session: {
      ...report.session,
      createdAt,
    },
  };
}

describe('cue patterns', () => {
  it('summarizes persistent, emerging, and cleared cue patterns', async () => {
    const [base, second] = await buildSampleReports();
    const recurringCue = base.cues[0];
    const emergingCue: MovementCue = {
      ...recurringCue,
      id: 'cue-new-foot-sequence',
      severity: 'watch',
      title: 'Preview the new foot sequence',
    };
    const clearedCue: MovementCue = {
      ...recurringCue,
      id: 'cue-cleared-lockoff',
      severity: 'fix',
      title: 'Old lock-off issue',
    };
    const current = withReportShape(base, '2026-06-19T11:00:00.000Z', [recurringCue, emergingCue]);
    const previous = withReportShape(second, '2026-06-18T11:00:00.000Z', [recurringCue, clearedCue]);

    const summary = summarizeCuePatterns([previous, current]);

    expect(summary.latestCueCount).toBe(2);
    expect(summary.patternCount).toBe(3);
    expect(summary.resolvedCount).toBe(1);
    expect(summary.patterns.find((pattern) => pattern.cueId === recurringCue.id)?.status).toBe('persistent');
    expect(summary.patterns.find((pattern) => pattern.cueId === emergingCue.id)?.status).toBe('emerging');
    expect(summary.patterns.find((pattern) => pattern.cueId === clearedCue.id)?.status).toBe('cleared');
  });

  it('returns an empty summary when no local cues exist', async () => {
    const [base] = await buildSampleReports();
    const summary = summarizeCuePatterns([{ ...base, cues: [] }]);

    expect(summary.latestCueCount).toBe(0);
    expect(summary.patternCount).toBe(0);
    expect(summary.resolvedCount).toBe(0);
    expect(summary.patterns).toEqual([]);
  });
});
