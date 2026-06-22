import { describe, expect, it } from 'vitest';

import { createDrillPracticeRecord } from '../src/movement/drillPracticeRepository';
import { localMovementAnalyzer } from '../src/movement/localAnalyzer';
import { createReportAnnotation, updateRepeatOutcome } from '../src/movement/reportAnnotationRepository';
import { sampleAttempts } from '../src/movement/sampleSession';
import {
  assertSessionAgendaIsShareSafe,
  assertSessionAgendaPacketIsShareSafe,
  buildSessionAgenda,
  buildSessionAgendaPacket,
  formatSessionAgendaPacketSummary,
} from '../src/movement/sessionAgenda';

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

describe('session agenda', () => {
  it('creates a baseline agenda without local reports', () => {
    const agenda = buildSessionAgenda({
      annotations: [],
      generatedAt: '2026-06-22T10:00:00.000Z',
      reports: [],
    });

    expect(agenda.schemaVersion).toBe('movebeta.session-agenda.v1');
    expect(agenda.status).toBe('baseline');
    expect(agenda.title).toBe('Baseline agenda');
    expect(agenda.blocks.map((block) => block.id)).toContain('load-check');
    expect(agenda.summary.planStatus).toBe('baseline');
    expect(agenda.privacy).toEqual({
      cloudUploadRequired: false,
      privateNotesIncluded: false,
      rawVideoIncluded: false,
    });
  });

  it('keeps a repeat session controlled when training load is under review', async () => {
    const reports = await buildSampleReports();
    const annotation = updateRepeatOutcome(
      createReportAnnotation(reports[1].id, {
        perceivedEffort: 4,
        privateNote: 'Do not expose this note.',
        projectStatus: 'repeat',
        updatedAt: '2026-06-21T10:00:00.000Z',
      }),
      {
        attempts: 2,
        resolvedCueIds: [reports[1].cues[0].id],
        status: 'improved',
        updatedAt: '2026-06-21T10:05:00.000Z',
      },
    );
    const agenda = buildSessionAgenda({
      annotations: [annotation],
      generatedAt: '2026-06-22T10:00:00.000Z',
      reports,
    });

    expect(agenda.status).toBe('controlled');
    expect(agenda.summary.loadStatus).toBe('review');
    expect(agenda.blocks.some((block) => block.instruction.includes('Keep one variable unchanged'))).toBe(true);
    expect(JSON.stringify(agenda)).not.toContain(annotation.privateNote);
  });

  it('caps every plan block to easy when recent logs require lower load', async () => {
    const reports = await buildSampleReports();
    const annotations = reports.slice(0, 4).map((report, index) =>
      updateRepeatOutcome(
        createReportAnnotation(report.id, {
          perceivedEffort: 5,
          updatedAt: `2026-06-${18 + index}T10:00:00.000Z`,
        }),
        {
          attempts: 3,
          resolvedCueIds: [],
          status: index % 2 === 0 ? 'fell' : 'regressed',
          updatedAt: `2026-06-${18 + index}T10:05:00.000Z`,
        },
      ),
    );
    const drills = reports.slice(0, 3).map((report, index) =>
      createDrillPracticeRecord({
        cueId: report.cues[0].id,
        drillId: `${report.cues[0].id}-${report.id}`,
        reportId: report.id,
        status: 'skipped',
        updatedAt: `2026-06-${18 + index}T10:10:00.000Z`,
      }),
    );
    const agenda = buildSessionAgenda({
      annotations,
      drillPractice: drills,
      generatedAt: '2026-06-22T10:00:00.000Z',
      reports,
    });

    expect(agenda.status).toBe('deload');
    expect(agenda.summary.loadStatus).toBe('deload');
    expect(agenda.blocks.filter((block) => block.source === 'session-plan').every((block) => block.intensity === 'easy')).toBe(true);
    expect(agenda.nextAction).toMatch(/lower|easier/);
  });

  it('honors configurable block limits', async () => {
    const reports = await buildSampleReports();
    const agenda = buildSessionAgenda({
      annotations: [],
      config: {
        maxBlocks: 3,
      },
      generatedAt: '2026-06-22T10:00:00.000Z',
      reports,
    });

    expect(agenda.summary.blockCount).toBe(3);
    expect(agenda.blocks).toHaveLength(3);
  });

  it('builds a share-safe packet from the current agenda', async () => {
    const reports = await buildSampleReports();
    const agenda = buildSessionAgenda({
      annotations: [],
      generatedAt: '2026-06-22T10:00:00.000Z',
      reports,
    });
    const packet = buildSessionAgendaPacket(agenda, '2026-06-22T10:05:00.000Z');

    expect(packet.schemaVersion).toBe('movebeta.session-agenda-packet.v1');
    expect(packet.summary).toMatchObject({
      blockCount: agenda.summary.blockCount,
      status: agenda.status,
      totalMinutes: agenda.summary.totalMinutes,
    });
    expect(packet.privacy).toEqual({
      cloudUploadRequired: false,
      privateNotesIncluded: false,
      rawVideoIncluded: false,
    });
    expect(formatSessionAgendaPacketSummary(packet)).toContain(`${agenda.summary.blockCount} blocks`);
    expect(assertSessionAgendaPacketIsShareSafe(packet)).toBe(packet);
  });

  it('rejects injected local paths, raw video, landmarks, private notes, and token-like values', async () => {
    const reports = await buildSampleReports();
    const agenda = buildSessionAgenda({
      annotations: [],
      generatedAt: '2026-06-22T10:00:00.000Z',
      reports,
    });
    const unsafe = {
      ...agenda,
      nextAction: 'Leaked /Users/example/rawVideo.mov with token abc and landmarks.',
    };

    expect(() => assertSessionAgendaIsShareSafe(unsafe)).toThrow('Session agenda contains local paths');
  });

  it('rejects unsafe packet values before sharing', async () => {
    const reports = await buildSampleReports();
    const agenda = buildSessionAgenda({
      annotations: [],
      generatedAt: '2026-06-22T10:00:00.000Z',
      reports,
    });
    const packet = buildSessionAgendaPacket(agenda, '2026-06-22T10:05:00.000Z');
    const unsafe = {
      ...packet,
      purpose: 'Leaked content://media/external/video/42 with token abc.',
    };

    expect(() => assertSessionAgendaPacketIsShareSafe(unsafe)).toThrow('Session agenda packet contains local paths');
  });
});
