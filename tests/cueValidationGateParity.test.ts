import { describe, expect, it } from 'vitest';

import { validateCueValidationDataset } from '../scripts/cue_validation_dataset_checks.mjs';
import { createCoachReviewConsentRecord } from '../src/movement/coachConsentRepository';
import { validateCueValidationCompletedDataset } from '../src/movement/cueValidationDataset';
import {
  buildCueValidationDatasetFromCompletedWorksheetCsv,
  buildCueValidationReviewWorksheet,
  buildCueValidationReviewWorksheetCsv,
  buildCueValidationStudySeed,
  type CueValidationStudyAcceptance,
} from '../src/movement/cueValidationStudy';
import type { LocalAnalysisReport } from '../src/movement/contracts';
import { localMovementAnalyzer } from '../src/movement/localAnalyzer';
import { samplePoseFrames, sampleSession } from '../src/movement/sampleSession';

async function buildReport(id: string, wallAngle: LocalAnalysisReport['session']['wallAngle']): Promise<LocalAnalysisReport> {
  const report = await localMovementAnalyzer.analyze({
    frames: samplePoseFrames,
    session: {
      ...sampleSession,
      id,
      title: id,
      wallAngle,
    },
  });
  return {
    ...report,
    id,
    session: {
      ...report.session,
      id,
      title: id,
      wallAngle,
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

async function buildDataset(acceptance?: Partial<CueValidationStudyAcceptance>) {
  const reports = [
    await buildReport('parity-slab', 'slab'),
    await buildReport('parity-vertical', 'vertical'),
    await buildReport('parity-overhang', 'overhang'),
  ];
  const seed = buildCueValidationStudySeed(
    reports,
    reports.map((report, index) =>
      createCoachReviewConsentRecord(report.id, { grantedAt: `2026-06-20T09:0${index}:00.000Z` }),
    ),
    {
      acceptance,
      generatedAt: '2026-06-20T09:10:00.000Z',
    },
  );
  const worksheet = buildCueValidationReviewWorksheet(seed, { generatedAt: '2026-06-20T09:15:00.000Z' });
  return buildCueValidationDatasetFromCompletedWorksheetCsv(seed, completeWorksheetCsv(buildCueValidationReviewWorksheetCsv(worksheet)), {
    generatedAt: '2026-06-20T09:20:00.000Z',
  });
}

function failedLabels(result: { checks: Array<{ label: string; status: string }> }) {
  return result.checks.filter((check) => check.status === 'fail').map((check) => check.label).sort();
}

describe('cue validation gate parity', () => {
  it('keeps app and CLI gates aligned for ready datasets', async () => {
    const dataset = await buildDataset({
      minClips: 3,
      minDistinctReviewersPerClip: 2,
      minReviewsPerCue: 2,
      requiredWallAngles: ['slab', 'vertical', 'overhang'],
    });

    const appGate = validateCueValidationCompletedDataset(dataset);
    const cliGate = validateCueValidationDataset(dataset);

    expect(appGate.ready).toBe(true);
    expect(cliGate.ready).toBe(true);
    expect(appGate.summary).toEqual(cliGate.summary);
    expect(failedLabels(appGate)).toEqual(failedLabels(cliGate));
  });

  it('keeps app and CLI gates aligned for production evidence gaps', async () => {
    const dataset = await buildDataset();

    const appGate = validateCueValidationCompletedDataset(dataset);
    const cliGate = validateCueValidationDataset(dataset);

    expect(appGate.ready).toBe(false);
    expect(cliGate.ready).toBe(false);
    expect(appGate.summary).toEqual(cliGate.summary);
    expect(failedLabels(appGate)).toEqual(expect.arrayContaining(['Dataset size']));
    expect(failedLabels(cliGate)).toEqual(expect.arrayContaining(['Dataset size']));
  });

  it('keeps app and CLI gates aligned on raw artifact rejection', async () => {
    const dataset = await buildDataset({
      minClips: 3,
      minDistinctReviewersPerClip: 2,
      minReviewsPerCue: 2,
      requiredWallAngles: ['slab', 'vertical', 'overhang'],
    });
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
        ...dataset.clips.slice(1),
      ],
    };

    const appGate = validateCueValidationCompletedDataset(unsafeDataset);
    const cliGate = validateCueValidationDataset(unsafeDataset);

    expect(appGate.ready).toBe(false);
    expect(cliGate.ready).toBe(false);
    expect(failedLabels(appGate)).toContain('Raw artifact exclusion');
    expect(failedLabels(cliGate)).toContain('Raw artifact exclusion');
  });
});
