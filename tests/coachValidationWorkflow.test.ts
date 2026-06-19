import { describe, expect, it } from 'vitest';

import { createCoachReviewConsentRecord } from '../src/movement/coachConsentRepository';
import {
  buildCoachValidationWorkflow,
  buildCueTrustValidationEvidenceForReport,
  coachValidationWorkflowSchemaVersion,
} from '../src/movement/coachValidationWorkflow';
import type { LocalAnalysisReport } from '../src/movement/contracts';
import { assertCueValidationReviewWorksheetCsvIsPrivacySafe } from '../src/movement/cueValidationStudy';
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

describe('coach validation workflow', () => {
  it('reports needs-consent before active cue-validation consent exists', async () => {
    const report = await buildReport('workflow-no-consent');
    const workflow = buildCoachValidationWorkflow(
      [report],
      [
        {
          ...createCoachReviewConsentRecord(report.id),
          scope: ['coach-review'],
        },
      ],
      {
        acceptance: {
          minClips: 1,
          requiredWallAngles: ['vertical'],
        },
        generatedAt: '2026-06-20T01:00:00.000Z',
      },
    );

    expect(workflow).toMatchObject({
      progress: {
        consentedClipCount: 0,
        cueCount: 0,
        reviewCount: 0,
        worksheetRowCount: 0,
      },
      schemaVersion: coachValidationWorkflowSchemaVersion,
      status: 'needs-consent',
    });
    expect(workflow.shareableStatusJson).toContain('"rawVideoIncluded": false');
  });

  it('builds a privacy-safe worksheet campaign from active consent and excludes revoked or orphan consent', async () => {
    const report = await buildReport('workflow-active-consent');
    const workflow = buildCoachValidationWorkflow(
      [report],
      [
        createCoachReviewConsentRecord(report.id, { grantedAt: '2026-06-20T01:05:00.000Z' }),
        {
          ...createCoachReviewConsentRecord(report.id, { grantedAt: '2026-06-20T01:10:00.000Z' }),
          revokedAt: '2026-06-20T01:12:00.000Z',
        },
        createCoachReviewConsentRecord('orphan-report', { grantedAt: '2026-06-20T01:15:00.000Z' }),
      ],
      {
        acceptance: {
          minClips: 1,
          requiredWallAngles: ['vertical'],
        },
        generatedAt: '2026-06-20T01:20:00.000Z',
      },
    );

    expect(() => assertCueValidationReviewWorksheetCsvIsPrivacySafe(workflow.worksheetCsv)).not.toThrow();
    expect(workflow).toMatchObject({
      progress: {
        consentedClipCount: 1,
        missingWallAngles: [],
        targetClipCount: 1,
        wallAngles: ['vertical'],
      },
      status: 'needs-review',
    });
    expect(workflow.worksheetCsv).toContain('worksheetRowId,clipId,packetReportId');
    expect(workflow.worksheetCsv).not.toMatch(/file:\/\/|rawVideo|videoUri|privateNote/i);
  });

  it('turns completed worksheet CSV into ready dataset JSON when the gate passes', async () => {
    const report = await buildReport('workflow-ready-dataset');
    const baseWorkflow = buildCoachValidationWorkflow(
      [report],
      [createCoachReviewConsentRecord(report.id, { grantedAt: '2026-06-20T01:25:00.000Z' })],
      {
        acceptance: {
          minClips: 1,
          minDistinctReviewersPerClip: 2,
          minReviewsPerCue: 2,
          requiredWallAngles: ['vertical'],
        },
        generatedAt: '2026-06-20T01:30:00.000Z',
      },
    );
    const completedCsv = completeWorksheetCsv(baseWorkflow.worksheetCsv, 5);
    const readyWorkflow = buildCoachValidationWorkflow(
      [report],
      [createCoachReviewConsentRecord(report.id, { grantedAt: '2026-06-20T01:25:00.000Z' })],
      {
        acceptance: {
          minClips: 1,
          minDistinctReviewersPerClip: 2,
          minReviewsPerCue: 2,
          requiredWallAngles: ['vertical'],
        },
        completedWorksheetCsv: completedCsv,
        generatedAt: '2026-06-20T01:35:00.000Z',
      },
    );

    expect(readyWorkflow).toMatchObject({
      datasetGate: {
        ready: true,
      },
      progress: {
        averageScore: 5,
        consentedClipCount: 1,
        reviewCount: report.cues.length * 2,
      },
      status: 'ready',
    });
    expect(readyWorkflow.shareableDatasetJson).toContain('"schemaVersion": "movebeta.cue-validation-dataset.v1"');
    expect(readyWorkflow.shareableStatusJson).not.toMatch(/rawVideoUri|videoUri|file:\/\//i);

    expect(buildCueTrustValidationEvidenceForReport(readyWorkflow, report)).toMatchObject({
      acceptance: 'pass',
      averageScore: 5,
      failingCueIds: [],
      reviewedCueCount: report.cues.length,
      unreviewedCueIds: [],
    });
  });

  it('blocks raw artifact text in completed worksheet CSV without throwing', async () => {
    const report = await buildReport('workflow-raw-artifact');
    const baseWorkflow = buildCoachValidationWorkflow(
      [report],
      [createCoachReviewConsentRecord(report.id, { grantedAt: '2026-06-20T01:40:00.000Z' })],
      {
        acceptance: {
          minClips: 1,
          requiredWallAngles: ['vertical'],
        },
        generatedAt: '2026-06-20T01:45:00.000Z',
      },
    );
    const completedCsv = completeWorksheetCsv(baseWorkflow.worksheetCsv).replace('coach-1', 'file:///private/video.mov');
    const workflow = buildCoachValidationWorkflow(
      [report],
      [createCoachReviewConsentRecord(report.id, { grantedAt: '2026-06-20T01:40:00.000Z' })],
      {
        acceptance: {
          minClips: 1,
          requiredWallAngles: ['vertical'],
        },
        completedWorksheetCsv: completedCsv,
        generatedAt: '2026-06-20T01:50:00.000Z',
      },
    );

    expect(workflow).toMatchObject({
      status: 'blocked',
    });
    expect(workflow.errors[0]).toContain('forbidden raw artifact text');
    expect(workflow.shareableDatasetJson).toBeUndefined();
  });
});
