import { describe, expect, it } from 'vitest';

import {
  assertAttemptPacingPacketIsShareSafe,
  assertAttemptPacingPlanIsShareSafe,
  buildAttemptPacingPlan,
  buildAttemptPacingPacket,
  formatRestTimerClock,
  formatAttemptPacingPacketSummary,
} from '../src/movement/attemptPacing';
import type { LocalAnalysisReport } from '../src/movement/contracts';
import { createDrillPracticeRecord } from '../src/movement/drillPracticeRepository';
import { localMovementAnalyzer } from '../src/movement/localAnalyzer';
import { createReportAnnotation, updateRepeatOutcome } from '../src/movement/reportAnnotationRepository';
import { sampleAttempts } from '../src/movement/sampleSession';

const generatedAt = '2026-06-22T10:00:00.000Z';

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

describe('attempt pacing plan', () => {
  it('starts with baseline pacing when no local reports exist', () => {
    const plan = buildAttemptPacingPlan({
      annotations: [],
      generatedAt,
      reports: [],
    });

    expect(plan.schemaVersion).toBe('movebeta.attempt-pacing.v1');
    expect(plan.status).toBe('baseline');
    expect(plan.summary.maxHardAttempts).toBe(0);
    expect(plan.steps.map((step) => step.type)).toEqual(['baseline-capture', 'closeout']);
    expect(plan.privacy).toEqual({
      cloudUploadRequired: false,
      privateNotesIncluded: false,
      rawVideoIncluded: false,
    });
  });

  it('keeps demo evidence in controlled repeat pacing while fix cues are open', async () => {
    const reports = await buildSampleReports();
    const plan = buildAttemptPacingPlan({
      annotations: [],
      generatedAt,
      reports,
    });

    expect(plan.status).toBe('controlled');
    expect(plan.summary.guardStatus).toBe('controlled-repeat');
    expect(plan.summary.maxHardAttempts).toBe(0);
    expect(plan.steps.some((step) => step.type === 'controlled-repeat')).toBe(true);
    expect(plan.nextAction).toContain('controlled repeat');
  });

  it('opens one hard-try slot when local guard evidence is green', async () => {
    const reports = clearLatestFixCues(await buildSampleReports());
    const plan = buildAttemptPacingPlan({
      annotations: [],
      generatedAt,
      reports,
    });

    expect(plan.status).toBe('progress');
    expect(plan.summary.maxHardAttempts).toBe(1);
    expect(plan.summary.hardAttemptSlots).toBe(1);
    expect(plan.steps.find((step) => step.type === 'hard-try')).toMatchObject({
      intensity: 'hard',
      restAfterSeconds: 300,
    });
  });

  it('resets pacing when high effort, stalled repeats, and skipped drills accumulate', async () => {
    const reports = await buildSampleReports();
    const days = ['18', '19', '20', '21'];
    const annotations = days.map((day, index) =>
      updateRepeatOutcome(
        createReportAnnotation(`report-${index}`, {
          perceivedEffort: 5,
          updatedAt: `2026-06-${day}T10:00:00.000Z`,
        }),
        {
          attempts: 3,
          resolvedCueIds: [],
          status: index % 2 === 0 ? 'fell' : 'regressed',
          updatedAt: `2026-06-${day}T10:30:00.000Z`,
        },
      ),
    );
    const drillPractice = days.slice(0, 3).map((day, index) =>
      createDrillPracticeRecord({
        cueId: `cue-${index}`,
        drillId: `drill-${index}`,
        reportId: `report-${index}`,
        status: 'skipped',
        updatedAt: `2026-06-${day}T11:00:00.000Z`,
      }),
    );
    const plan = buildAttemptPacingPlan({
      annotations,
      drillPractice,
      generatedAt,
      reports,
    });

    expect(plan.status).toBe('reset');
    expect(plan.summary.loadStatus).toBe('deload');
    expect(plan.summary.maxHardAttempts).toBe(0);
    expect(plan.stopRules.find((rule) => rule.id === 'fall-limit')?.status).toBe('limit');
  });

  it('lets callers tune rest windows and attempt caps without changing domain code', async () => {
    const reports = clearLatestFixCues(await buildSampleReports());
    const plan = buildAttemptPacingPlan({
      annotations: [],
      config: {
        hardRestSeconds: 420,
        progressAttemptLimit: 5,
        progressHardAttemptLimit: 2,
      },
      generatedAt,
      reports,
    });

    expect(plan.summary.maxTotalAttempts).toBe(5);
    expect(plan.summary.maxHardAttempts).toBe(2);
    expect(plan.steps.find((step) => step.type === 'hard-try')?.restAfterSeconds).toBe(420);
  });

  it('formats local rest timer values for the session UI', () => {
    expect(formatRestTimerClock(0)).toBe('00:00');
    expect(formatRestTimerClock(59)).toBe('00:59');
    expect(formatRestTimerClock(120)).toBe('02:00');
    expect(formatRestTimerClock(301.9)).toBe('05:01');
    expect(formatRestTimerClock(-10)).toBe('00:00');
  });

  it('builds a share-safe packet from the pacing plan', async () => {
    const reports = await buildSampleReports();
    const plan = buildAttemptPacingPlan({
      annotations: [],
      generatedAt,
      reports,
    });
    const packet = buildAttemptPacingPacket(plan, '2026-06-22T10:05:00.000Z');

    expect(packet.schemaVersion).toBe('movebeta.attempt-pacing-packet.v1');
    expect(packet.summary).toMatchObject({
      attemptSlots: plan.summary.attemptSlots,
      hardAttemptSlots: plan.summary.hardAttemptSlots,
      maxTotalAttempts: plan.summary.maxTotalAttempts,
      status: plan.status,
      stopRuleCount: plan.stopRules.length,
    });
    expect(packet.privacy).toEqual({
      cloudUploadRequired: false,
      privateNotesIncluded: false,
      rawVideoIncluded: false,
    });
    expect(formatAttemptPacingPacketSummary(packet)).toContain(`${plan.summary.attemptSlots}/${plan.summary.maxTotalAttempts} slots`);
    expect(assertAttemptPacingPacketIsShareSafe(packet)).toBe(packet);
  });

  it('rejects local paths, raw video, private notes, landmarks, or token-like values before sharing', () => {
    const plan = buildAttemptPacingPlan({
      annotations: [],
      generatedAt,
      reports: [],
    });
    const unsafe = {
      ...plan,
      nextAction: 'Open file:///Users/example/raw-video.mov with token abc and landmarks.',
    };

    expect(() => assertAttemptPacingPlanIsShareSafe(unsafe)).toThrow('Attempt pacing plan contains local paths');
  });

  it('rejects unsafe packet values before sharing', () => {
    const plan = buildAttemptPacingPlan({
      annotations: [],
      generatedAt,
      reports: [],
    });
    const packet = buildAttemptPacingPacket(plan, '2026-06-22T10:05:00.000Z');
    const unsafe = {
      ...packet,
      purpose: 'Leaked content://media/external/video/42 with token abc.',
    };

    expect(() => assertAttemptPacingPacketIsShareSafe(unsafe)).toThrow('Attempt pacing packet contains local paths');
  });
});
