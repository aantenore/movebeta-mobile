import { describe, expect, it } from 'vitest';

import { createCoachReviewConsentRecord } from '../src/movement/coachConsentRepository';
import {
  formatCueValidationGateFailures,
  formatCueValidationGateSummary,
  validateCueValidationCompletedDataset,
} from '../src/movement/cueValidationDataset';
import {
  buildCueValidationDatasetFromCompletedWorksheetCsv,
  buildCueValidationReviewWorksheet,
  buildCueValidationReviewWorksheetCsv,
  buildCueValidationStudySeed,
} from '../src/movement/cueValidationStudy';
import type { LocalAnalysisReport } from '../src/movement/contracts';
import { localMovementAnalyzer } from '../src/movement/localAnalyzer';
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

function completeWorksheetCsv(csv: string) {
  const [headerLine, ...rows] = csv.trimEnd().split('\n');
  const headers = headerLine.split(',');
  const indexes = Object.fromEntries(headers.map((header, index) => [header, index]));

  return [
    headerLine,
    ...rows.map((row) => {
      const cells = row.split(',');
      const reviewerSlot = cells[indexes.reviewerSlot];
      cells[indexes.reviewerId] = `coach-${reviewerSlot}`;
      cells[indexes.relevance] = '5';
      cells[indexes.timingAccuracy] = '5';
      cells[indexes.drillFit] = '5';
      cells[indexes.safetyLanguage] = '5';
      cells[indexes.status] = 'reviewed';
      return cells.join(',');
    }),
  ].join('\n') + '\n';
}

async function buildCompletedDataset(reportId: string, productionLike = false) {
  const report = await buildReport(reportId);
  const seed = buildCueValidationStudySeed(
    [report],
    [createCoachReviewConsentRecord(report.id, { grantedAt: '2026-06-20T08:00:00.000Z' })],
    productionLike
      ? { generatedAt: '2026-06-20T08:05:00.000Z' }
      : {
          acceptance: {
            minClips: 1,
            minDistinctReviewersPerClip: 2,
            minReviewsPerCue: 2,
            requiredWallAngles: [report.session.wallAngle],
          },
          generatedAt: '2026-06-20T08:05:00.000Z',
        },
  );
  const worksheet = buildCueValidationReviewWorksheet(seed, { generatedAt: '2026-06-20T08:10:00.000Z' });
  return buildCueValidationDatasetFromCompletedWorksheetCsv(seed, completeWorksheetCsv(buildCueValidationReviewWorksheetCsv(worksheet)), {
    generatedAt: '2026-06-20T08:15:00.000Z',
  });
}

describe('cue validation completed dataset gate', () => {
  it('passes when the completed dataset satisfies its acceptance thresholds', async () => {
    const dataset = await buildCompletedDataset('gate-ready-project');

    const result = validateCueValidationCompletedDataset(dataset);

    expect(result.ready).toBe(true);
    expect(result.summary).toMatchObject({
      clipCount: 1,
      cueCount: dataset.clips[0].packet.analysis.cues.length,
      reviewCount: dataset.clips[0].reviews.length,
    });
    expect(formatCueValidationGateSummary(result)).toContain('Validation gate: ready');
    expect(formatCueValidationGateFailures(result)).toBe('Validation gate checks passed.');
  });

  it('reports the missing production evidence for default thresholds', async () => {
    const dataset = await buildCompletedDataset('gate-needs-more-data', true);

    const result = validateCueValidationCompletedDataset(dataset);

    expect(result.ready).toBe(false);
    const failedCheckIds = result.checks.filter((check) => check.status === 'fail').map((check) => check.id);
    expect(failedCheckIds).toContain('dataset-size');
    expect(failedCheckIds.filter((id) => id.startsWith('wall-angle-'))).toHaveLength(2);
    expect(formatCueValidationGateSummary(result)).toContain('Validation gate: needs data');
    expect(formatCueValidationGateFailures(result)).toContain('At least 20 consented clips are required.');
  });

  it('rejects raw artifact keys before presenting a dataset as gate-ready', async () => {
    const dataset = await buildCompletedDataset('gate-raw-artifact');
    const unsafeDataset = {
      ...dataset,
      clips: [
        {
          ...dataset.clips[0],
          packet: {
            ...dataset.clips[0].packet,
            rawVideoUri: 'file:///private/local-video.mov',
          },
        },
      ],
    };

    const result = validateCueValidationCompletedDataset(unsafeDataset);

    expect(result.ready).toBe(false);
    expect(result.checks.find((check) => check.id === 'dataset-raw-artifacts')).toMatchObject({
      status: 'fail',
    });
  });
});
