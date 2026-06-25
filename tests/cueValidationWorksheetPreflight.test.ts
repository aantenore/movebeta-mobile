import { describe, expect, it } from 'vitest';

import { createCoachReviewConsentRecord } from '../src/movement/coachConsentRepository';
import { localMovementAnalyzer } from '../src/movement/localAnalyzer';
import type { LocalAnalysisReport } from '../src/movement/contracts';
import { samplePoseFrames, sampleSession } from '../src/movement/sampleSession';
import {
  assertCueValidationWorksheetPreflightIsPrivacySafe,
  buildCueValidationReviewWorksheet,
  buildCueValidationReviewWorksheetCsv,
  buildCueValidationStudySeed,
  buildCueValidationWorksheetPreflight,
  formatCueValidationWorksheetPreflightSummary,
} from '../src/movement/cueValidationStudy';

async function buildReport(id: string): Promise<LocalAnalysisReport> {
  const report = await localMovementAnalyzer.analyze({
    frames: samplePoseFrames,
    session: {
      ...sampleSession,
      id,
      title: id,
      wallAngle: 'vertical',
    },
  });
  return {
    ...report,
    id,
    session: {
      ...report.session,
      id,
      title: id,
      wallAngle: 'vertical',
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

async function validationSeed() {
  const report = await buildReport('worksheet-preflight');
  return buildCueValidationStudySeed(
    [report],
    [createCoachReviewConsentRecord(report.id, { grantedAt: '2026-06-25T09:00:00.000Z' })],
    {
      acceptance: {
        minClips: 1,
        minDistinctReviewersPerClip: 2,
        minReviewsPerCue: 2,
        requiredWallAngles: ['vertical'],
      },
      generatedAt: '2026-06-25T09:05:00.000Z',
    },
  );
}

describe('cue validation worksheet preflight', () => {
  it('marks missing completed CSV as empty without exposing worksheet data', async () => {
    const seed = await validationSeed();
    const preflight = buildCueValidationWorksheetPreflight(seed, '', {
      generatedAt: '2026-06-25T09:10:00.000Z',
    });

    expect(preflight.schemaVersion).toBe('movebeta.cue-validation-worksheet-preflight.v1');
    expect(preflight.summary.status).toBe('empty');
    expect(preflight.summary.expectedRows).toBeGreaterThan(0);
    expect(preflight.summary.receivedRows).toBe(0);
    expect(preflight.privacy.rawWorksheetIncluded).toBe(false);
    expect(JSON.stringify(preflight)).not.toContain('worksheetRowId,clipId');
  });

  it('reports blank worksheet reviewer and score gaps before dataset composition', async () => {
    const seed = await validationSeed();
    const worksheet = buildCueValidationReviewWorksheet(seed, {
      generatedAt: '2026-06-25T09:15:00.000Z',
    });
    const csv = buildCueValidationReviewWorksheetCsv(worksheet);
    const preflight = buildCueValidationWorksheetPreflight(seed, csv, {
      generatedAt: '2026-06-25T09:20:00.000Z',
    });

    expect(preflight.summary.status).toBe('review');
    expect(preflight.summary.receivedRows).toBe(worksheet.rowCount);
    expect(preflight.summary.missingReviewerIdCount).toBe(worksheet.rowCount);
    expect(preflight.summary.missingScoreCount).toBe(worksheet.rowCount * 4);
    expect(preflight.checks.find((check) => check.key === 'score-completeness')?.status).toBe('review');
  });

  it('marks completed real-review worksheet CSV ready for local dataset composition', async () => {
    const seed = await validationSeed();
    const worksheet = buildCueValidationReviewWorksheet(seed, {
      generatedAt: '2026-06-25T09:25:00.000Z',
    });
    const csv = completeWorksheetCsv(buildCueValidationReviewWorksheetCsv(worksheet), 5);
    const preflight = buildCueValidationWorksheetPreflight(seed, csv, {
      generatedAt: '2026-06-25T09:30:00.000Z',
    });

    expect(preflight.summary.status).toBe('ready');
    expect(preflight.summary.completeRows).toBe(worksheet.rowCount);
    expect(preflight.summary.distinctReviewerCount).toBe(2);
    expect(preflight.summary.missingScoreCount).toBe(0);
    expect(formatCueValidationWorksheetPreflightSummary(preflight)).toContain('Worksheet preflight: ready');
  });

  it('blocks raw artifact-like worksheet text without echoing it', async () => {
    const seed = await validationSeed();
    const worksheet = buildCueValidationReviewWorksheet(seed, {
      generatedAt: '2026-06-25T09:35:00.000Z',
    });
    const csv = completeWorksheetCsv(buildCueValidationReviewWorksheetCsv(worksheet), 5).replace('coach-1', 'file:///private/video.mov');
    const preflight = buildCueValidationWorksheetPreflight(seed, csv, {
      generatedAt: '2026-06-25T09:40:00.000Z',
    });

    expect(preflight.summary.status).toBe('blocked');
    expect(preflight.checks.find((check) => check.key === 'privacy-boundary')?.status).toBe('blocked');
    expect(() => assertCueValidationWorksheetPreflightIsPrivacySafe(preflight)).not.toThrow();
    expect(JSON.stringify(preflight)).not.toContain('file:///private/video.mov');
  });
});
