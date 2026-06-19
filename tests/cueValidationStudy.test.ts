import { describe, expect, it } from 'vitest';

import { createCoachReviewConsentRecord } from '../src/movement/coachConsentRepository';
import type { LocalAnalysisReport } from '../src/movement/contracts';
import {
  assertCueValidationReviewWorksheetIsPrivacySafe,
  assertCueValidationReviewWorksheetCsvIsPrivacySafe,
  assertCueValidationStudySeedIsPrivacySafe,
  buildCueValidationReviewWorksheet,
  buildCueValidationReviewWorksheetCsv,
  buildCueValidationDatasetFromCompletedWorksheetCsv,
  buildCueValidationStudySeed,
  formatCueValidationCompletedDatasetSummary,
  formatCueValidationReviewWorksheetSummary,
  formatCueValidationStudySeedSummary,
  type CueValidationReviewWorksheet,
} from '../src/movement/cueValidationStudy';
import { validateCueValidationDataset } from '../scripts/cue_validation_dataset_checks.mjs';
import { createDrillPracticeRecord } from '../src/movement/drillPracticeRepository';
import { localMovementAnalyzer } from '../src/movement/localAnalyzer';
import { createReportAnnotation, updateCueFeedback } from '../src/movement/reportAnnotationRepository';
import { samplePoseFrames, sampleSession } from '../src/movement/sampleSession';

async function buildReport(id: string): Promise<LocalAnalysisReport> {
  const report = await localMovementAnalyzer.analyze({
    frames: samplePoseFrames,
    session: {
      ...sampleSession,
      id,
      title: id,
    },
  });
  return {
    ...report,
    id,
    session: {
      ...report.session,
      id,
      title: id,
    },
  };
}

function completeWorksheetCsv(csv: string, score = 5) {
  const [headerLine, ...rows] = csv.trimEnd().split('\n');
  const headers = headerLine.split(',');
  const indexes = Object.fromEntries(headers.map((header, index) => [header, index]));

  return [
    headerLine,
    ...rows.map((row) => {
      const cells = row.split(',');
      const reviewerSlot = cells[indexes.reviewerSlot];
      cells[indexes.reviewerId] = `coach-${reviewerSlot}`;
      cells[indexes.relevance] = String(score);
      cells[indexes.timingAccuracy] = String(score);
      cells[indexes.drillFit] = String(score);
      cells[indexes.safetyLanguage] = String(score);
      cells[indexes.status] = 'reviewed';
      return cells.join(',');
    }),
  ].join('\n') + '\n';
}

describe('cue validation study seed', () => {
  it('builds a privacy-safe review seed from active consented cue-validation reports', async () => {
    const report = await buildReport('seed-project');
    const annotation = updateCueFeedback(
      createReportAnnotation(report.id, {
        privateNote: 'Private seed note must stay local.',
        updatedAt: '2026-06-19T23:10:00.000Z',
      }),
      {
        cueId: report.cues[0].id,
        note: 'Private reviewer prep note must stay local.',
        rating: 'useful',
        updatedAt: '2026-06-19T23:15:00.000Z',
      },
    );

    const seed = buildCueValidationStudySeed(
      [report],
      [
        createCoachReviewConsentRecord(report.id, { grantedAt: '2026-06-19T23:20:00.000Z' }),
        {
          ...createCoachReviewConsentRecord('coach-only', { grantedAt: '2026-06-19T23:25:00.000Z' }),
          scope: ['coach-review'],
        },
        {
          ...createCoachReviewConsentRecord(report.id, { grantedAt: '2026-06-19T23:30:00.000Z' }),
          revokedAt: '2026-06-19T23:35:00.000Z',
        },
        createCoachReviewConsentRecord('orphan-report', { grantedAt: '2026-06-19T23:40:00.000Z' }),
      ],
      {
        annotations: [annotation],
        appVersion: '1.0.0-test',
        drillPractice: [
          createDrillPracticeRecord({
            cueId: report.cues[0].id,
            drillId: 'seed-drill',
            note: 'Private drill validation note must stay local.',
            reportId: report.id,
            status: 'completed',
            updatedAt: '2026-06-19T23:45:00.000Z',
          }),
        ],
        generatedAt: '2026-06-19T23:50:00.000Z',
      },
    );
    const serialized = JSON.stringify(seed);

    expect(() => assertCueValidationStudySeedIsPrivacySafe(seed)).not.toThrow();
    expect(seed).toMatchObject({
      appVersion: '1.0.0-test',
      clipCount: 1,
      generatedAt: '2026-06-19T23:50:00.000Z',
      privacy: {
        keyFramesIncluded: false,
        landmarksIncluded: false,
        privateNotesIncluded: false,
        rawUrisIncluded: false,
        rawVideoIncluded: false,
        reviewerScoresInvented: false,
        videoLeavesDevice: false,
      },
      readyForValidation: false,
      schemaVersion: 'movebeta.cue-validation-study-seed.v1',
    });
    expect(seed.clips[0]).toMatchObject({
      clipId: report.id,
      packet: {
        consent: {
          rawVideoIncluded: false,
          videoLeavesDevice: false,
        },
        reportId: report.id,
      },
    });
    expect(seed.clips[0].reviewTasks).toHaveLength(report.cues.length);
    expect(seed.clips[0].reviewTasks[0]).toMatchObject({
      cueId: report.cues[0].id,
      reviewMode: 'packet-only',
      reviewerRole: 'coach',
      status: 'needs-review',
    });
    expect(formatCueValidationStudySeedSummary(seed)).toBe(
      `${seed.clipCount} consented clips · ${seed.cueCount} review tasks · target 20 clips · raw video: no · scores invented: no`,
    );
    expect(serialized).not.toContain('Private seed note');
    expect(serialized).not.toContain('Private reviewer prep note');
    expect(serialized).not.toContain('Private drill validation note');
    expect(serialized).not.toMatch(/"(?:privateNote|rawVideoUri|videoUri|landmarks|keyFrame|uri)"\s*:/i);
  });

  it('returns an empty seed before cue-validation consent exists', async () => {
    const report = await buildReport('no-consent-seed');
    const seed = buildCueValidationStudySeed(
      [report],
      [
        {
          ...createCoachReviewConsentRecord(report.id, { grantedAt: '2026-06-20T00:00:00.000Z' }),
          scope: ['coach-review'],
        },
      ],
      { generatedAt: '2026-06-20T00:05:00.000Z' },
    );

    expect(() => assertCueValidationStudySeedIsPrivacySafe(seed)).not.toThrow();
    expect(seed).toMatchObject({
      clipCount: 0,
      clips: [],
      cueCount: 0,
      generatedAt: '2026-06-20T00:05:00.000Z',
      readyForValidation: false,
    });
  });

  it('builds a blank review worksheet without inventing coach identities or scores', async () => {
    const report = await buildReport('worksheet-project');
    const seed = buildCueValidationStudySeed(
      [report],
      [createCoachReviewConsentRecord(report.id, { grantedAt: '2026-06-20T00:15:00.000Z' })],
      { generatedAt: '2026-06-20T00:20:00.000Z' },
    );

    const worksheet = buildCueValidationReviewWorksheet(seed, {
      generatedAt: '2026-06-20T00:25:00.000Z',
      reviewerCount: 2,
    });
    const serialized = JSON.stringify(worksheet);

    expect(() => assertCueValidationReviewWorksheetIsPrivacySafe(worksheet)).not.toThrow();
    expect(worksheet).toMatchObject({
      generatedAt: '2026-06-20T00:25:00.000Z',
      privacy: {
        keyFramesIncluded: false,
        landmarksIncluded: false,
        privateNotesIncluded: false,
        rawUrisIncluded: false,
        rawVideoIncluded: false,
        reviewerScoresInvented: false,
        videoLeavesDevice: false,
      },
      requiredReviewerCount: 2,
      rowCount: seed.cueCount * 2,
      schemaVersion: 'movebeta.cue-validation-review-worksheet.v1',
      seedGeneratedAt: seed.generatedAt,
      sourceClipCount: seed.clipCount,
      sourceCueCount: seed.cueCount,
    });
    expect(worksheet.rows[0]).toMatchObject({
      clipId: report.id,
      cueId: report.cues[0].id,
      packetReportId: report.id,
      reviewerId: null,
      reviewerRole: 'coach',
      reviewerSlot: 1,
      scores: {
        drillFit: null,
        relevance: null,
        safetyLanguage: null,
        timingAccuracy: null,
      },
      status: 'awaiting-real-review',
    });
    expect(formatCueValidationReviewWorksheetSummary(worksheet)).toBe(
      `${seed.clipCount} consented clips · ${seed.cueCount} cues · ${seed.cueCount * 2} review rows · 2 coach slots · scores invented: no`,
    );
    expect(serialized).not.toMatch(/"(?:privateNote|rawVideoUri|videoUri|landmarks|keyFrame|uri)"\s*:/i);
  });

  it('exports the review worksheet as privacy-safe CSV with blank reviewer fields', async () => {
    const report = await buildReport('worksheet-csv-project');
    const seed = buildCueValidationStudySeed(
      [report],
      [createCoachReviewConsentRecord(report.id, { grantedAt: '2026-06-20T00:40:00.000Z' })],
      { generatedAt: '2026-06-20T00:45:00.000Z' },
    );
    const worksheet = buildCueValidationReviewWorksheet(seed, {
      generatedAt: '2026-06-20T00:50:00.000Z',
      reviewerCount: 2,
    });

    const csv = buildCueValidationReviewWorksheetCsv(worksheet);

    expect(() => assertCueValidationReviewWorksheetCsvIsPrivacySafe(csv)).not.toThrow();
    expect(csv.split('\n')[0]).toBe(
      'worksheetRowId,clipId,packetReportId,consentRecordId,cueId,cueTitle,reviewerSlot,reviewerId,reviewerRole,reviewMode,relevance,timingAccuracy,drillFit,safetyLanguage,status',
    );
    expect(csv).toContain(`${worksheet.rows[0].id},${report.id},${report.id},`);
    expect(csv).toContain(',coach,packet-only,,,,,awaiting-real-review');
    expect(csv).not.toMatch(/(?:file:\/\/|privateNote|rawVideoUri|videoUri|landmarks|keyFrame)/i);
  });

  it('escapes worksheet CSV cells that contain commas, quotes, or new lines', async () => {
    const report = await buildReport('worksheet-csv-escaping');
    const seed = buildCueValidationStudySeed(
      [report],
      [createCoachReviewConsentRecord(report.id, { grantedAt: '2026-06-20T00:55:00.000Z' })],
      { generatedAt: '2026-06-20T01:00:00.000Z' },
    );
    const worksheet = buildCueValidationReviewWorksheet(seed, {
      generatedAt: '2026-06-20T01:05:00.000Z',
      reviewerCount: 1,
    });
    const escapedWorksheet = {
      ...worksheet,
      rows: [
        {
          ...worksheet.rows[0],
          cueTitle: 'Hip, "drop"\nmove',
        },
        ...worksheet.rows.slice(1),
      ],
    } satisfies CueValidationReviewWorksheet;

    const csv = buildCueValidationReviewWorksheetCsv(escapedWorksheet);

    expect(csv).toContain('"Hip, ""drop""\nmove"');
  });

  it('builds a validation dataset from a completed worksheet CSV with real reviewer scores', async () => {
    const report = await buildReport('completed-dataset-project');
    const seed = buildCueValidationStudySeed(
      [report],
      [createCoachReviewConsentRecord(report.id, { grantedAt: '2026-06-20T01:10:00.000Z' })],
      {
        acceptance: {
          minClips: 1,
          minDistinctReviewersPerClip: 2,
          minReviewsPerCue: 2,
          requiredWallAngles: [report.session.wallAngle],
        },
        appVersion: '1.0.0-test',
        generatedAt: '2026-06-20T01:15:00.000Z',
      },
    );
    const worksheet = buildCueValidationReviewWorksheet(seed, { generatedAt: '2026-06-20T01:20:00.000Z' });
    const completedCsv = completeWorksheetCsv(buildCueValidationReviewWorksheetCsv(worksheet));

    const dataset = buildCueValidationDatasetFromCompletedWorksheetCsv(seed, completedCsv, {
      generatedAt: '2026-06-20T01:25:00.000Z',
    });
    const validation = validateCueValidationDataset(dataset);

    expect(dataset).toMatchObject({
      appVersion: '1.0.0-test',
      generatedAt: '2026-06-20T01:25:00.000Z',
    });
    expect(dataset.clips[0].reviews).toHaveLength(seed.cueCount * 2);
    expect(dataset.clips[0].reviews[0]).toMatchObject({
      reviewerId: 'coach-1',
      reviewerRole: 'coach',
      reviewMode: 'packet-only',
      relevance: 5,
      timingAccuracy: 5,
      drillFit: 5,
      safetyLanguage: 5,
    });
    expect(formatCueValidationCompletedDatasetSummary(dataset)).toBe(
      `1 consented clips · ${seed.cueCount * 2} real reviews · target 1 clips · ready for validation gate`,
    );
    expect(validation.ready).toBe(true);
  });

  it('rejects injected raw artifact keys before study handoff', async () => {
    const seed = buildCueValidationStudySeed([], [], { generatedAt: '2026-06-20T00:10:00.000Z' });
    const unsafeSeed = {
      ...seed,
      videoUri: 'file:///private/local.mov',
    };

    expect(() => assertCueValidationStudySeedIsPrivacySafe(unsafeSeed)).toThrow(/forbidden raw artifact keys/i);
  });

  it('rejects worksheet rows with invented reviewer scores', async () => {
    const seed = buildCueValidationStudySeed([], [], { generatedAt: '2026-06-20T00:30:00.000Z' });
    const worksheet = buildCueValidationReviewWorksheet(seed, { generatedAt: '2026-06-20T00:35:00.000Z' });
    const unsafeWorksheet = {
      ...worksheet,
      rows: [
        {
          clipId: 'clip',
          consentRecordId: 'consent',
          cueId: 'cue',
          cueTitle: 'Cue',
          id: 'clip:cue:coach-1',
          packetReportId: 'clip',
          requiredScores: ['relevance', 'timingAccuracy', 'drillFit', 'safetyLanguage'],
          reviewMode: 'packet-only',
          reviewerId: 'coach-1',
          reviewerRole: 'coach',
          reviewerSlot: 1,
          scores: {
            drillFit: 5,
            relevance: 5,
            safetyLanguage: 5,
            timingAccuracy: 5,
          },
          status: 'awaiting-real-review',
        },
      ],
    } as unknown as CueValidationReviewWorksheet;

    expect(() => assertCueValidationReviewWorksheetIsPrivacySafe(unsafeWorksheet)).toThrow(
      /invented reviewer identities or scores/i,
    );
  });

  it('rejects worksheet CSV text with raw artifact references', () => {
    const unsafeCsv =
      'worksheetRowId,clipId,packetReportId,consentRecordId,cueId,cueTitle,reviewerSlot,reviewerId,reviewerRole,reviewMode,relevance,timingAccuracy,drillFit,safetyLanguage,status\n' +
      'row,clip,packet,consent,cue,file:///private/local.mov,1,,coach,packet-only,,,,,awaiting-real-review\n';

    expect(() => assertCueValidationReviewWorksheetCsvIsPrivacySafe(unsafeCsv)).toThrow(/forbidden raw artifact text/i);
  });

  it('rejects incomplete worksheet CSV before building a validation dataset', async () => {
    const report = await buildReport('incomplete-dataset-project');
    const seed = buildCueValidationStudySeed(
      [report],
      [createCoachReviewConsentRecord(report.id, { grantedAt: '2026-06-20T01:30:00.000Z' })],
      { generatedAt: '2026-06-20T01:35:00.000Z' },
    );
    const worksheet = buildCueValidationReviewWorksheet(seed, { generatedAt: '2026-06-20T01:40:00.000Z' });

    expect(() => buildCueValidationDatasetFromCompletedWorksheetCsv(seed, buildCueValidationReviewWorksheetCsv(worksheet))).toThrow(
      /requires a real reviewerId/i,
    );
  });

  it('rejects worksheet CSV rows that do not match the source seed', async () => {
    const report = await buildReport('mismatched-dataset-project');
    const seed = buildCueValidationStudySeed(
      [report],
      [createCoachReviewConsentRecord(report.id, { grantedAt: '2026-06-20T01:45:00.000Z' })],
      { generatedAt: '2026-06-20T01:50:00.000Z' },
    );
    const worksheet = buildCueValidationReviewWorksheet(seed, { generatedAt: '2026-06-20T01:55:00.000Z' });
    const completedCsv = completeWorksheetCsv(buildCueValidationReviewWorksheetCsv(worksheet)).replace(
      worksheet.rows[0].cueId,
      'unknown-cue',
    );

    expect(() => buildCueValidationDatasetFromCompletedWorksheetCsv(seed, completedCsv)).toThrow(/not part of this study seed/i);
  });

  it('rejects worksheet CSV scores outside the 1-5 review scale', async () => {
    const report = await buildReport('bad-score-dataset-project');
    const seed = buildCueValidationStudySeed(
      [report],
      [createCoachReviewConsentRecord(report.id, { grantedAt: '2026-06-20T02:00:00.000Z' })],
      { generatedAt: '2026-06-20T02:05:00.000Z' },
    );
    const worksheet = buildCueValidationReviewWorksheet(seed, { generatedAt: '2026-06-20T02:10:00.000Z' });
    const completedCsv = completeWorksheetCsv(buildCueValidationReviewWorksheetCsv(worksheet), 6);

    expect(() => buildCueValidationDatasetFromCompletedWorksheetCsv(seed, completedCsv)).toThrow(/score from 1 to 5/i);
  });
});
