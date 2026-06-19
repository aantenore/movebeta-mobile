import { describe, expect, it } from 'vitest';

import type { LocalAnalysisReport } from '../src/movement/contracts';
import { createDrillPracticeRecord } from '../src/movement/drillPracticeRepository';
import { localMovementAnalyzer } from '../src/movement/localAnalyzer';
import { buildPreSendGuard } from '../src/movement/preSendGuard';
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

function updateLatestReport(
  reports: LocalAnalysisReport[],
  update: (report: LocalAnalysisReport) => LocalAnalysisReport,
) {
  const latest = [...reports].sort((a, b) => b.session.createdAt.localeCompare(a.session.createdAt))[0];
  return reports.map((report) => (report.id === latest.id ? update(report) : report));
}

function clearLatestFixCues(reports: LocalAnalysisReport[]) {
  return updateLatestReport(reports, (report) => ({
    ...report,
    cues: report.cues.map((cue) => ({
      ...cue,
      severity: 'info',
    })),
  }));
}

describe('pre-send guard', () => {
  it('asks for a baseline before any local reports exist', () => {
    const guard = buildPreSendGuard([], []);

    expect(guard.status).toBe('baseline');
    expect(guard.loadCap).toBe('baseline');
    expect(guard.score).toBe(0);
    expect(guard.action).toContain('benchmark');
    expect(guard.signals[0]).toMatchObject({
      id: 'baseline-missing',
      severity: 'watch',
    });
  });

  it('keeps the demo reports in controlled-repeat while a fix cue is still open', async () => {
    const reports = await buildSampleReports();
    const guard = buildPreSendGuard(reports, []);

    expect(guard.status).toBe('controlled-repeat');
    expect(guard.loadCap).toBe('moderate');
    expect(guard.signals.some((signal) => signal.id === 'fix-cues' && signal.severity === 'watch')).toBe(true);
    expect(guard.action).toContain('controlled repeat');
  });

  it('opens a hard-try window when quality, readiness, and cue signals are green', async () => {
    const reports = clearLatestFixCues(await buildSampleReports());
    const guard = buildPreSendGuard(reports, []);

    expect(guard.status).toBe('hard-try-window');
    expect(guard.loadCap).toBe('hard');
    expect(guard.score).toBeGreaterThanOrEqual(90);
    expect(guard.signals.every((signal) => signal.severity === 'support')).toBe(true);
  });

  it('resets first when the latest analysis quality drops below the configured threshold', async () => {
    const reports = updateLatestReport(await buildSampleReports(), (report) => ({
      ...report,
      analysisQuality: {
        ...report.analysisQuality,
        score: 54,
        warnings: ['Low landmark confidence near the crux.'],
      },
    }));
    const guard = buildPreSendGuard(reports, []);

    expect(guard.status).toBe('reset-first');
    expect(guard.loadCap).toBe('easy');
    expect(guard.signals.some((signal) => signal.id === 'analysis-quality' && signal.severity === 'blocker')).toBe(true);
    expect(guard.signals.some((signal) => signal.id === 'video-signal' && signal.severity === 'watch')).toBe(true);
  });

  it('resets first when private drill follow-through is blocked', async () => {
    const reports = await buildSampleReports();
    const cueId = reports[0].cues[0].id;
    const guard = buildPreSendGuard(
      reports,
      [],
      [
        createDrillPracticeRecord({
          cueId,
          drillId: `${cueId}-${reports[0].id}`,
          reportId: reports[0].id,
          status: 'skipped',
        }),
        createDrillPracticeRecord({
          cueId,
          drillId: `${cueId}-${reports[1].id}`,
          reportId: reports[1].id,
          status: 'skipped',
        }),
      ],
    );

    expect(guard.status).toBe('reset-first');
    expect(guard.signals.some((signal) => signal.id === 'practice-follow-through' && signal.severity === 'blocker')).toBe(true);
    expect(guard.action).toContain('Practice follow-through');
  });

  it('lets callers tune thresholds without changing domain code', async () => {
    const reports = await buildSampleReports();
    const guard = buildPreSendGuard(reports, [], [], {
      maxFixCuesForHardTry: 1,
      watchScoreThreshold: 60,
    });

    expect(guard.status).toBe('hard-try-window');
    expect(guard.signals.some((signal) => signal.id === 'fix-cues')).toBe(false);
  });
});
