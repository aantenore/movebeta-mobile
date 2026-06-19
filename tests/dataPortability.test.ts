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
import { localMovementAnalyzer } from '../src/movement/localAnalyzer';
import {
  createReportAnnotation,
  InMemoryReportAnnotationRepository,
} from '../src/movement/reportAnnotationRepository';
import { InMemoryReportRepository } from '../src/movement/reportRepository';
import { samplePoseFrames, sampleSession } from '../src/movement/sampleSession';

async function createPortabilityFixture() {
  const reports = new InMemoryReportRepository();
  const annotations = new InMemoryReportAnnotationRepository();
  const consents = new InMemoryCoachConsentRepository();
  const report = await localMovementAnalyzer.analyze({
    frames: samplePoseFrames,
    session: sampleSession,
  });

  await reports.saveReport(report);
  await annotations.saveAnnotation(
    createReportAnnotation(report.id, {
      confidence: 5,
      perceivedEffort: 4,
      privateNote: 'Backup this beta.',
      projectStatus: 'repeat',
      tags: ['board'],
      updatedAt: '2026-06-19T15:00:00.000Z',
    }),
  );
  await consents.saveConsent(
    createCoachReviewConsentRecord(report.id, {
      grantedAt: '2026-06-19T15:00:00.000Z',
    }),
  );

  return { annotations, consents, report, reports };
}

describe('local data portability', () => {
  it('creates a privacy-safe local backup with reports, annotations, and consent records', async () => {
    const { annotations, consents, reports } = await createPortabilityFixture();

    const backup = await createLocalDataBackup({
      annotations,
      consents,
      now: () => '2026-06-19T15:30:00.000Z',
      reports,
    });
    const serialized = JSON.stringify(backup);

    expect(summarizeLocalDataBackup(backup)).toEqual({
      annotations: 1,
      consents: 1,
      generatedAt: '2026-06-19T15:30:00.000Z',
      reports: 1,
    });
    expect(backup.privacy.rawVideoIncluded).toBe(false);
    expect(backup.privacy.videoLeavesDevice).toBe(false);
    expect(serialized).not.toMatch(/file:\/\/|content:\/\/|ph:\/\/|videoUri|videoPath|assetUri/i);
  });

  it('restores a backup into empty repositories', async () => {
    const source = await createPortabilityFixture();
    const backup = await createLocalDataBackup({
      annotations: source.annotations,
      consents: source.consents,
      now: () => '2026-06-19T15:30:00.000Z',
      reports: source.reports,
    });
    const destinationReports = new InMemoryReportRepository();
    const destinationAnnotations = new InMemoryReportAnnotationRepository();
    const destinationConsents = new InMemoryCoachConsentRepository();

    const result = await restoreLocalDataBackup(JSON.stringify(backup), {
      annotations: destinationAnnotations,
      consents: destinationConsents,
      now: () => '2026-06-19T15:31:00.000Z',
      reports: destinationReports,
    });

    expect(result).toMatchObject({
      annotationsRestored: 1,
      consentsRestored: 1,
      reportsRestored: 1,
      skippedAnnotations: 0,
      skippedConsents: 0,
    });
    expect(await destinationReports.getReport(source.report.id)).toEqual(source.report);
    expect(await destinationAnnotations.getAnnotation(source.report.id)).toMatchObject({
      privateNote: 'Backup this beta.',
    });
    expect(await destinationConsents.getConsent(source.report.id)).toMatchObject({
      rawVideoIncluded: false,
      videoLeavesDevice: false,
    });
    expect(formatLocalDataRestoreResult(result)).toContain('Reports restored: 1');
  });

  it('skips orphan annotations and consent records during restore', async () => {
    const { annotations, consents, reports } = await createPortabilityFixture();
    const backup = await createLocalDataBackup({
      annotations,
      consents,
      now: () => '2026-06-19T15:30:00.000Z',
      reports,
    });

    const result = await restoreLocalDataBackup(
      {
        ...backup,
        annotations: [...backup.annotations, createReportAnnotation('missing-report')],
        consents: [...backup.consents, createCoachReviewConsentRecord('missing-report')],
      },
      {
        annotations: new InMemoryReportAnnotationRepository(),
        consents: new InMemoryCoachConsentRepository(),
        now: () => '2026-06-19T15:31:00.000Z',
        reports: new InMemoryReportRepository(),
      },
    );

    expect(result.skippedAnnotations).toBe(1);
    expect(result.skippedConsents).toBe(1);
  });

  it('rejects backups that contain raw video or URI-like artifacts', async () => {
    const { annotations, consents, reports } = await createPortabilityFixture();
    const backup = await createLocalDataBackup({
      annotations,
      consents,
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
          reports: new InMemoryReportRepository(),
        },
      ),
    ).rejects.toThrow('raw video');
  });
});
