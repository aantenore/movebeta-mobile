import { describe, expect, it } from 'vitest';

import {
  createCoachReviewConsentRecord,
  InMemoryCoachConsentRepository,
} from '../src/movement/coachConsentRepository';
import {
  createDrillPracticeRecord,
  InMemoryDrillPracticeRepository,
} from '../src/movement/drillPracticeRepository';
import { localMovementAnalyzer } from '../src/movement/localAnalyzer';
import {
  deleteAnalysisBundle,
  formatAnalysisBundleDeletionReceipt,
} from '../src/movement/privacyDeletion';
import {
  createReportAnnotation,
  InMemoryReportAnnotationRepository,
} from '../src/movement/reportAnnotationRepository';
import { InMemoryReportRepository } from '../src/movement/reportRepository';
import { samplePoseFrames, sampleSession } from '../src/movement/sampleSession';

async function createDeletionFixture() {
  const reports = new InMemoryReportRepository();
  const annotations = new InMemoryReportAnnotationRepository();
  const consents = new InMemoryCoachConsentRepository();
  const drillPractice = new InMemoryDrillPracticeRepository();
  const report = await localMovementAnalyzer.analyze({
    frames: samplePoseFrames,
    session: sampleSession,
  });

  await reports.saveReport(report);
  await annotations.saveAnnotation(
    createReportAnnotation(report.id, {
      privateNote: 'Delete this local beta note with the report.',
      updatedAt: '2026-06-19T12:00:00.000Z',
    }),
  );
  await consents.saveConsent(
    createCoachReviewConsentRecord(report.id, {
      grantedAt: '2026-06-19T12:00:00.000Z',
    }),
  );
  await drillPractice.saveRecord(
    createDrillPracticeRecord({
      cueId: report.cues[0].id,
      drillId: `${report.cues[0].id}-${report.id}`,
      reportId: report.id,
      status: 'completed',
      updatedAt: '2026-06-19T12:10:00.000Z',
    }),
  );

  return { annotations, consents, drillPractice, report, reports };
}

describe('privacy deletion bundle', () => {
  it('deletes a local report, private training log, and coach consent together', async () => {
    const { annotations, consents, drillPractice, report, reports } = await createDeletionFixture();

    const result = await deleteAnalysisBundle(report.id, {
      annotations,
      consents,
      drillPractice,
      now: () => '2026-06-19T14:30:00.000Z',
      reports,
    });

    expect(result.status).toBe('deleted');
    expect(result.privacy).toEqual({
      rawVideoIncluded: false,
      videoLeavesDevice: false,
    });
    expect(result.artifacts.every((artifact) => artifact.deleted && artifact.wasPresent)).toBe(true);
    expect(await reports.getReport(report.id)).toBeNull();
    expect(await annotations.getAnnotation(report.id)).toBeNull();
    expect(await consents.getConsent(report.id)).toBeNull();
    expect(await drillPractice.listRecordsForReport(report.id)).toEqual([]);
  });

  it('cleans orphaned local annotation and consent records even when the report is missing', async () => {
    const reports = new InMemoryReportRepository();
    const annotations = new InMemoryReportAnnotationRepository();
    const consents = new InMemoryCoachConsentRepository();
    const drillPractice = new InMemoryDrillPracticeRepository();

    await annotations.saveAnnotation(createReportAnnotation('orphan-report'));
    await consents.saveConsent(createCoachReviewConsentRecord('orphan-report'));
    await drillPractice.saveRecord(
      createDrillPracticeRecord({
        cueId: 'cue-orphan',
        drillId: 'cue-orphan-orphan-report',
        reportId: 'orphan-report',
        status: 'skipped',
      }),
    );

    const result = await deleteAnalysisBundle('orphan-report', {
      annotations,
      consents,
      drillPractice,
      now: () => '2026-06-19T14:31:00.000Z',
      reports,
    });

    expect(result.status).toBe('deleted');
    expect(result.artifacts.find((artifact) => artifact.id === 'report')).toMatchObject({
      deleted: false,
      wasPresent: false,
    });
    expect(result.artifacts.find((artifact) => artifact.id === 'training-log')?.deleted).toBe(true);
    expect(result.artifacts.find((artifact) => artifact.id === 'coach-consent')?.deleted).toBe(true);
    expect(result.artifacts.find((artifact) => artifact.id === 'drill-practice')?.deleted).toBe(true);
  });

  it('returns a privacy-safe deletion receipt', async () => {
    const { annotations, consents, drillPractice, report, reports } = await createDeletionFixture();
    const result = await deleteAnalysisBundle(report.id, {
      annotations,
      consents,
      drillPractice,
      now: () => '2026-06-19T14:32:00.000Z',
      reports,
    });

    const receipt = formatAnalysisBundleDeletionReceipt(result);

    expect(receipt).toContain('Analysis report: deleted');
    expect(receipt).toContain('Private training log: deleted');
    expect(receipt).toContain('Coach consent record: deleted');
    expect(receipt).toContain('Drill practice log: deleted');
    expect(receipt).toContain('Raw video included: no');
    expect(receipt).toContain('Video left device: no');
  });
});
