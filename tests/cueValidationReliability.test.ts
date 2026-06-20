import { describe, expect, it } from 'vitest';

import { createCoachReviewConsentRecord } from '../src/movement/coachConsentRepository';
import {
  assertCueValidationReliabilityReportIsPrivacySafe,
  buildCueValidationReliabilityReport,
  cueValidationReliabilitySchemaVersion,
  formatCueValidationReliabilitySummary,
} from '../src/movement/cueValidationReliability';
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

function lowerSecondReviewerForFirstCue(csv: string) {
  const [headerLine, ...rows] = csv.trimEnd().split('\n');
  const headers = headerLine.split(',');
  const indexes = Object.fromEntries(headers.map((header, index) => [header, index]));
  const firstCueId = rows[0].split(',')[indexes.cueId];
  let changed = false;

  return [
    headerLine,
    ...rows.map((row) => {
      const cells = row.split(',');
      if (!changed && cells[indexes.cueId] === firstCueId && cells[indexes.reviewerSlot] === '2') {
        cells[indexes.relevance] = '3';
        cells[indexes.timingAccuracy] = '3';
        cells[indexes.drillFit] = '3';
        cells[indexes.safetyLanguage] = '5';
        changed = true;
      }
      return cells.join(',');
    }),
  ].join('\n') + '\n';
}

async function buildDataset(csvMutator: (csv: string) => string = (csv) => csv) {
  const report = await buildReport('reliability-project');
  const seed = buildCueValidationStudySeed(
    [report],
    [createCoachReviewConsentRecord(report.id, { grantedAt: '2026-06-20T09:00:00.000Z' })],
    {
      acceptance: {
        minClips: 1,
        minDistinctReviewersPerClip: 2,
        minReviewsPerCue: 2,
        requiredWallAngles: ['vertical'],
      },
      generatedAt: '2026-06-20T09:05:00.000Z',
    },
  );
  const worksheet = buildCueValidationReviewWorksheet(seed, { generatedAt: '2026-06-20T09:10:00.000Z' });
  const csv = csvMutator(completeWorksheetCsv(buildCueValidationReviewWorksheetCsv(worksheet)));
  return buildCueValidationDatasetFromCompletedWorksheetCsv(seed, csv, {
    generatedAt: '2026-06-20T09:15:00.000Z',
  });
}

describe('cue validation reliability', () => {
  it('reports ready reliability when reviewers agree on every cue', async () => {
    const dataset = await buildDataset();
    const report = buildCueValidationReliabilityReport(dataset, {
      generatedAt: '2026-06-20T09:20:00.000Z',
    });

    expect(report.schemaVersion).toBe(cueValidationReliabilitySchemaVersion);
    expect(report.summary.status).toBe('ready');
    expect(report.summary.averageConsensusScore).toBe(100);
    expect(report.summary.lowConsensusCueCount).toBe(0);
    expect(formatCueValidationReliabilitySummary(report)).toContain('Reliability: ready');
    expect(() => assertCueValidationReliabilityReportIsPrivacySafe(report)).not.toThrow();
    expect(JSON.stringify(report)).not.toMatch(/coach-1|coach-2|file:\/\/|videoUri|"landmarks"|"keyFrame"/i);
  });

  it('flags low-consensus cues even when enough real reviews are present', async () => {
    const dataset = await buildDataset(lowerSecondReviewerForFirstCue);
    const report = buildCueValidationReliabilityReport(dataset, {
      generatedAt: '2026-06-20T09:25:00.000Z',
    });

    expect(report.summary.status).toBe('needs-consensus');
    expect(report.summary.lowConsensusCueCount).toBe(1);
    expect(report.cueFindings.find((cue) => cue.status === 'needs-consensus')).toMatchObject({
      reviewCount: 2,
      reviewerCount: 2,
      scoreSpread: 1.5,
    });
  });
});
