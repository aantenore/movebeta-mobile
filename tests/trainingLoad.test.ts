import { describe, expect, it } from 'vitest';

import { createDrillPracticeRecord } from '../src/movement/drillPracticeRepository';
import { createReportAnnotation, updateRepeatOutcome } from '../src/movement/reportAnnotationRepository';
import {
  assertTrainingLoadSummaryIsShareSafe,
  buildTrainingLoadPacket,
  formatTrainingLoadPacketSummary,
  summarizeTrainingLoad,
  trainingLoadPacketSchemaVersion,
  TrainingLoadPacketSchema,
} from '../src/movement/trainingLoad';

const generatedAt = '2026-06-21T10:00:00.000Z';

describe('training load summary', () => {
  it('builds a baseline state when no recent local logs exist', () => {
    const summary = summarizeTrainingLoad({
      annotations: [],
      generatedAt,
    });

    expect(summary.schemaVersion).toBe('movebeta.training-load.v1');
    expect(summary.status).toBe('baseline');
    expect(summary.trainingLoadScore).toBe(0);
    expect(summary.summary.annotatedSessionCount).toBe(0);
    expect(summary.nextAction).toContain('Log effort');
    expect(summary.privacy).toEqual({
      cloudUploadRequired: false,
      privateNotesIncluded: false,
      rawVideoIncluded: false,
    });
  });

  it('summarizes balanced low-load logs without exposing private notes', () => {
    const annotation = createReportAnnotation('report-1', {
      confidence: 4,
      perceivedEffort: 2,
      privateNote: 'Keep this private text out of summaries.',
      projectStatus: 'repeat',
      updatedAt: '2026-06-20T10:00:00.000Z',
    });
    const summary = summarizeTrainingLoad({
      annotations: [annotation],
      drillPractice: [
        createDrillPracticeRecord({
          cueId: 'cue-1',
          drillId: 'drill-1',
          reportId: 'report-1',
          status: 'completed',
          updatedAt: '2026-06-20T10:10:00.000Z',
        }),
      ],
      generatedAt,
    });

    expect(summary.status).toBe('balanced');
    expect(summary.summary.averageEffort).toBe(2);
    expect(summary.summary.completedDrillCount).toBe(1);
    expect(summary.signals.find((signal) => signal.id === 'privacy-boundary')?.status).toBe('ready');
    expect(JSON.stringify(summary)).not.toContain(annotation.privateNote);
  });

  it('raises review when load is present but below limit thresholds', () => {
    const annotation = updateRepeatOutcome(
      createReportAnnotation('report-1', {
        perceivedEffort: 4,
        updatedAt: '2026-06-20T10:00:00.000Z',
      }),
      {
        attempts: 2,
        resolvedCueIds: ['cue-1'],
        status: 'improved',
        updatedAt: '2026-06-20T10:15:00.000Z',
      },
    );
    const summary = summarizeTrainingLoad({
      annotations: [annotation],
      generatedAt,
    });

    expect(summary.status).toBe('review');
    expect(summary.summary.highEffortSessionCount).toBe(1);
    expect(summary.summary.repeatAttemptCount).toBe(2);
    expect(summary.recommendation).toContain('Keep one variable stable');
  });

  it('uses configurable thresholds for high-effort classification', () => {
    const annotation = createReportAnnotation('report-1', {
      perceivedEffort: 4,
      updatedAt: '2026-06-20T10:00:00.000Z',
    });
    const summary = summarizeTrainingLoad({
      annotations: [annotation],
      config: {
        highEffortThreshold: 5,
      },
      generatedAt,
    });

    expect(summary.summary.highEffortSessionCount).toBe(0);
    expect(summary.signals.find((signal) => signal.id === 'effort-balance')?.status).toBe('ready');
  });

  it('limits the next session when high effort, stalled repeats, and skipped drills accumulate', () => {
    const days = ['17', '18', '19', '20'];
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
          updatedAt: `2026-06-${day}T10:15:00.000Z`,
        },
      ),
    );
    const drills = days.slice(0, 3).map((day, index) =>
      createDrillPracticeRecord({
        cueId: `cue-${index}`,
        drillId: `drill-${index}`,
        reportId: `report-${index}`,
        status: 'skipped',
        updatedAt: `2026-06-${day}T10:20:00.000Z`,
      }),
    );
    const summary = summarizeTrainingLoad({
      annotations,
      drillPractice: drills,
      generatedAt,
    });

    expect(summary.status).toBe('deload');
    expect(summary.trainingLoadScore).toBe(100);
    expect(summary.signals.map((signal) => signal.status)).toContain('limit');
    expect(summary.nextAction).toContain('lower intensity');
  });

  it('rejects injected local paths, raw video, landmarks, private notes, and token-like values', () => {
    const summary = summarizeTrainingLoad({
      annotations: [],
      generatedAt,
    });
    const unsafe = {
      ...summary,
      recommendation: 'Leaked /Users/example/raw-video.mov with token abc and landmarks.',
    };

    expect(() => assertTrainingLoadSummaryIsShareSafe(unsafe)).toThrow('Training load summary contains local paths');
  });

  it('builds a share-safe training load packet without report ids or private artifacts', () => {
    const annotation = updateRepeatOutcome(
      createReportAnnotation('report-1', {
        perceivedEffort: 4,
        privateNote: 'Private load note must stay local.',
        updatedAt: '2026-06-20T10:00:00.000Z',
      }),
      {
        attempts: 2,
        resolvedCueIds: ['cue-1'],
        status: 'improved',
        updatedAt: '2026-06-20T10:15:00.000Z',
      },
    );
    const load = summarizeTrainingLoad({ annotations: [annotation], generatedAt });
    const packet = buildTrainingLoadPacket(load, { generatedAt: '2026-06-22T16:30:00.000Z' });

    expect(TrainingLoadPacketSchema.parse(packet)).toEqual(packet);
    expect(packet.schemaVersion).toBe(trainingLoadPacketSchemaVersion);
    expect(packet.generatedAt).toBe('2026-06-22T16:30:00.000Z');
    expect(packet.load.status).toBe('review');
    expect(packet.privacy).toMatchObject({
      privateNotesIncluded: false,
      rawVideoIncluded: false,
      reportIdsIncluded: false,
      videoUriIncluded: false,
    });
    expect(formatTrainingLoadPacketSummary(packet)).toContain('Training load:');
    expect(JSON.stringify(packet)).not.toMatch(/"reportId"\s*:|"privateNote"\s*:|file:\/\/|content:\/\/|ph:\/\/|\/Users\/|secret-value/i);
  });

  it('rejects training load packets when load copy contains unsafe local artifacts', () => {
    const load = summarizeTrainingLoad({
      annotations: [],
      generatedAt,
    });
    const unsafeLoad = {
      ...load,
      nextAction: 'Review /Users/athlete/raw.mov before adding load.',
    };

    expect(() => buildTrainingLoadPacket(unsafeLoad)).toThrow('Training load packet contains local paths');
  });
});
