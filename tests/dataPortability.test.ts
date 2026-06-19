import { describe, expect, it } from 'vitest';

import {
  createCoachReviewConsentRecord,
  InMemoryCoachConsentRepository,
} from '../src/movement/coachConsentRepository';
import {
  createLocalDataBackup,
  formatLocalDataRestoreResult,
  restoreLocalDataBackup,
  summarizeLocalDataBackup,
} from '../src/movement/dataPortability';
import {
  createDrillPracticeRecord,
  InMemoryDrillPracticeRepository,
} from '../src/movement/drillPracticeRepository';
import { localMovementAnalyzer } from '../src/movement/localAnalyzer';
import {
  createReportAnnotation,
  InMemoryReportAnnotationRepository,
  updateCueFeedback,
} from '../src/movement/reportAnnotationRepository';
import { InMemoryReportRepository } from '../src/movement/reportRepository';
import { samplePoseFrames, sampleSession } from '../src/movement/sampleSession';

async function createPortabilityFixture() {
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
      updateCueFeedback(
        createReportAnnotation(report.id, {
          confidence: 5,
          perceivedEffort: 4,
          privateNote: 'Backup this beta.',
          projectStatus: 'repeat',
          tags: ['board'],
          updatedAt: '2026-06-19T15:00:00.000Z',
        }),
        {
          cueId: report.cues[0].id,
          rating: 'useful',
          updatedAt: '2026-06-19T15:05:00.000Z',
        },
      ),
  );
  await consents.saveConsent(
    createCoachReviewConsentRecord(report.id, {
      grantedAt: '2026-06-19T15:00:00.000Z',
    }),
  );
  await drillPractice.saveRecord(
    createDrillPracticeRecord({
      cueId: report.cues[0].id,
      drillId: `${report.cues[0].id}-${report.id}`,
      reportId: report.id,
      status: 'completed',
      updatedAt: '2026-06-19T15:10:00.000Z',
    }),
  );

  return { annotations, consents, drillPractice, report, reports };
}

describe('local data portability', () => {
  it('creates a privacy-safe local backup with reports, annotations, and consent records', async () => {
    const { annotations, consents, drillPractice, reports } = await createPortabilityFixture();

    const backup = await createLocalDataBackup({
      annotations,
      consents,
      drillPractice,
      now: () => '2026-06-19T15:30:00.000Z',
      reports,
    });
    const serialized = JSON.stringify(backup);

    expect(summarizeLocalDataBackup(backup)).toEqual({
      annotations: 1,
      consents: 1,
      drillPractice: 1,
      generatedAt: '2026-06-19T15:30:00.000Z',
      reports: 1,
    });
    expect(backup.privacy.rawVideoIncluded).toBe(false);
    expect(backup.privacy.videoLeavesDevice).toBe(false);
    expect(backup.annotations[0].cueFeedback[0]).toMatchObject({
      rating: 'useful',
    });
    expect(backup.drillPractice[0]).toMatchObject({
      status: 'completed',
    });
    expect(serialized).not.toMatch(/file:\/\/|content:\/\/|ph:\/\/|videoUri|videoPath|assetUri/i);
  });

  it('restores a backup into empty repositories', async () => {
    const source = await createPortabilityFixture();
    const backup = await createLocalDataBackup({
      annotations: source.annotations,
      consents: source.consents,
      drillPractice: source.drillPractice,
      now: () => '2026-06-19T15:30:00.000Z',
      reports: source.reports,
    });
    const destinationReports = new InMemoryReportRepository();
    const destinationAnnotations = new InMemoryReportAnnotationRepository();
    const destinationConsents = new InMemoryCoachConsentRepository();
    const destinationDrillPractice = new InMemoryDrillPracticeRepository();

    const result = await restoreLocalDataBackup(JSON.stringify(backup), {
      annotations: destinationAnnotations,
      consents: destinationConsents,
      drillPractice: destinationDrillPractice,
      now: () => '2026-06-19T15:31:00.000Z',
      reports: destinationReports,
    });

    expect(result).toMatchObject({
      annotationsRestored: 1,
      consentsRestored: 1,
      drillPracticeRestored: 1,
      reportsRestored: 1,
      skippedAnnotations: 0,
      skippedConsents: 0,
      skippedDrillPractice: 0,
    });
    expect(await destinationReports.getReport(source.report.id)).toEqual(source.report);
    expect(await destinationAnnotations.getAnnotation(source.report.id)).toMatchObject({
      cueFeedback: [
        expect.objectContaining({
          rating: 'useful',
        }),
      ],
      privateNote: 'Backup this beta.',
    });
    expect(await destinationConsents.getConsent(source.report.id)).toMatchObject({
      rawVideoIncluded: false,
      videoLeavesDevice: false,
    });
    expect(await destinationDrillPractice.listRecordsForReport(source.report.id)).toHaveLength(1);
    expect(formatLocalDataRestoreResult(result)).toContain('Reports restored: 1');
    expect(formatLocalDataRestoreResult(result)).toContain('Drill practice records restored: 1');
  });

  it('skips orphan annotations and consent records during restore', async () => {
    const { annotations, consents, drillPractice, reports } = await createPortabilityFixture();
    const backup = await createLocalDataBackup({
      annotations,
      consents,
      drillPractice,
      now: () => '2026-06-19T15:30:00.000Z',
      reports,
    });

    const result = await restoreLocalDataBackup(
      {
        ...backup,
        annotations: [...backup.annotations, createReportAnnotation('missing-report')],
        consents: [...backup.consents, createCoachReviewConsentRecord('missing-report')],
        drillPractice: [
          ...backup.drillPractice,
          createDrillPracticeRecord({
            cueId: 'cue-missing',
            drillId: 'cue-missing-missing-report',
            reportId: 'missing-report',
            status: 'completed',
          }),
        ],
      },
      {
        annotations: new InMemoryReportAnnotationRepository(),
        consents: new InMemoryCoachConsentRepository(),
        drillPractice: new InMemoryDrillPracticeRepository(),
        now: () => '2026-06-19T15:31:00.000Z',
        reports: new InMemoryReportRepository(),
      },
    );

    expect(result.skippedAnnotations).toBe(1);
    expect(result.skippedConsents).toBe(1);
    expect(result.skippedDrillPractice).toBe(1);
  });

  it('rejects backups that contain raw video or URI-like artifacts', async () => {
    const { annotations, consents, drillPractice, reports } = await createPortabilityFixture();
    const backup = await createLocalDataBackup({
      annotations,
      consents,
      drillPractice,
      now: () => '2026-06-19T15:30:00.000Z',
      reports,
    });

    await expect(
      restoreLocalDataBackup(
        JSON.stringify({
          ...backup,
          reports: [
            {
              ...backup.reports[0],
              privacy: {
                ...backup.reports[0].privacy,
                retention: 'debug file://private/video.mov',
              },
            },
          ],
        }),
        {
          annotations: new InMemoryReportAnnotationRepository(),
          consents: new InMemoryCoachConsentRepository(),
          drillPractice: new InMemoryDrillPracticeRepository(),
          reports: new InMemoryReportRepository(),
        },
      ),
    ).rejects.toThrow('raw video');
  });
});
