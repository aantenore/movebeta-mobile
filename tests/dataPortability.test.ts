import { describe, expect, it } from 'vitest';

import {
  createCoachReviewConsentRecord,
  InMemoryCoachConsentRepository,
} from '../src/movement/coachConsentRepository';
import {
  createLocalDataBackup,
  createLocalDataBackupIntegrity,
  formatLocalDataRestorePreview,
  formatLocalDataRestoreResult,
  type LocalDataBackup,
  previewLocalDataRestore,
  previewLocalDataRestoreAgainstRepositories,
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
  updateRepeatOutcome,
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
    updateRepeatOutcome(
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
      {
        attempts: 2,
        resolvedCueIds: [report.cues[0].id],
        status: 'improved',
        updatedAt: '2026-06-19T15:08:00.000Z',
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

function withCurrentIntegrity(backup: LocalDataBackup): LocalDataBackup {
  return {
    ...backup,
    integrity: createLocalDataBackupIntegrity(backup),
  };
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
      checksum: backup.integrity?.checksum,
      consents: 1,
      drillPractice: 1,
      generatedAt: '2026-06-19T15:30:00.000Z',
      integrityVerified: true,
      reports: 1,
    });
    expect(backup.integrity).toEqual({
      algorithm: 'fnv1a-32',
      checksum: expect.stringMatching(/^[a-f0-9]{8}$/),
      recordCounts: {
        annotations: 1,
        consents: 1,
        drillPractice: 1,
        reports: 1,
      },
    });
    expect(backup.privacy.rawVideoIncluded).toBe(false);
    expect(backup.privacy.videoLeavesDevice).toBe(false);
    expect(backup.annotations[0].cueFeedback[0]).toMatchObject({
      rating: 'useful',
    });
    expect(backup.annotations[0].repeatOutcome).toMatchObject({
      attempts: 2,
      status: 'improved',
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
      integrityChecksum: backup.integrity?.checksum,
      integrityVerified: true,
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
      repeatOutcome: expect.objectContaining({
        resolvedCueIds: [source.report.cues[0].id],
        status: 'improved',
      }),
    });
    expect(await destinationConsents.getConsent(source.report.id)).toMatchObject({
      rawVideoIncluded: false,
      videoLeavesDevice: false,
    });
    expect(await destinationDrillPractice.listRecordsForReport(source.report.id)).toHaveLength(1);
    expect(formatLocalDataRestoreResult(result)).toContain('Reports restored: 1');
    expect(formatLocalDataRestoreResult(result)).toContain('Drill practice records restored: 1');
    expect(formatLocalDataRestoreResult(result)).toContain('Integrity verified: yes');
    expect(formatLocalDataRestoreResult(result)).toContain(`Content checksum: ${backup.integrity?.checksum}`);
  });

  it('previews a restore without writing local repositories', async () => {
    const source = await createPortabilityFixture();
    const backup = await createLocalDataBackup({
      annotations: source.annotations,
      consents: source.consents,
      drillPractice: source.drillPractice,
      now: () => '2026-06-19T15:30:00.000Z',
      reports: source.reports,
    });
    const destinationReports = new InMemoryReportRepository();

    const preview = previewLocalDataRestore(JSON.stringify(backup));

    expect(preview).toEqual({
      annotationsToRestore: 1,
      consentsToRestore: 1,
      drillPracticeToRestore: 1,
      existingAnnotations: 0,
      existingConsents: 0,
      existingDrillPractice: 0,
      existingReports: 0,
      generatedAt: '2026-06-19T15:30:00.000Z',
      integrityChecksum: backup.integrity?.checksum,
      integrityVerified: true,
      newAnnotations: 1,
      newConsents: 1,
      newDrillPractice: 1,
      newReports: 1,
      reportsToRestore: 1,
      skippedAnnotations: 0,
      skippedConsents: 0,
      skippedDrillPractice: 0,
      status: 'ready-to-restore',
    });
    expect(formatLocalDataRestorePreview(preview)).toContain('Reports ready: 1');
    expect(formatLocalDataRestorePreview(preview)).toContain('Integrity verified: yes');
    expect(await destinationReports.listReports()).toEqual([]);
  });

  it('previews existing local records before restore without writing repositories', async () => {
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

    await destinationReports.saveReport(backup.reports[0]);
    await destinationAnnotations.saveAnnotation(backup.annotations[0]);
    await destinationConsents.saveConsent(backup.consents[0]);
    await destinationDrillPractice.saveRecord(backup.drillPractice[0]);

    const preview = await previewLocalDataRestoreAgainstRepositories(JSON.stringify(backup), {
      annotations: destinationAnnotations,
      consents: destinationConsents,
      drillPractice: destinationDrillPractice,
      reports: destinationReports,
    });

    expect(preview).toMatchObject({
      existingAnnotations: 1,
      existingConsents: 1,
      existingDrillPractice: 1,
      existingReports: 1,
      newAnnotations: 0,
      newConsents: 0,
      newDrillPractice: 0,
      newReports: 0,
    });
    expect(formatLocalDataRestorePreview(preview)).toContain('Existing reports: 1');
    expect(formatLocalDataRestorePreview(preview)).toContain('New drill practice records: 0');
    expect(await destinationReports.listReports()).toHaveLength(1);
    expect(await destinationAnnotations.listAnnotations()).toHaveLength(1);
    expect(await destinationConsents.listConsents()).toHaveLength(1);
    expect(await destinationDrillPractice.listRecords()).toHaveLength(1);
  });

  it('accepts legacy v1 backups without an integrity checksum', async () => {
    const source = await createPortabilityFixture();
    const backup = await createLocalDataBackup({
      annotations: source.annotations,
      consents: source.consents,
      drillPractice: source.drillPractice,
      now: () => '2026-06-19T15:30:00.000Z',
      reports: source.reports,
    });
    const legacyBackup = { ...backup, integrity: undefined };

    const preview = previewLocalDataRestore(JSON.stringify(legacyBackup));
    const result = await restoreLocalDataBackup(JSON.stringify(legacyBackup), {
      annotations: new InMemoryReportAnnotationRepository(),
      consents: new InMemoryCoachConsentRepository(),
      drillPractice: new InMemoryDrillPracticeRepository(),
      reports: new InMemoryReportRepository(),
    });

    expect(preview.integrityChecksum).toBeNull();
    expect(preview.integrityVerified).toBe(false);
    expect(formatLocalDataRestorePreview(preview)).toContain('Integrity verified: legacy backup without checksum');
    expect(result.integrityChecksum).toBeNull();
    expect(result.integrityVerified).toBe(false);
    expect(formatLocalDataRestoreResult(result)).toContain('Integrity verified: legacy backup without checksum');
  });

  it('rejects backups whose content no longer matches the integrity checksum', async () => {
    const source = await createPortabilityFixture();
    const backup = await createLocalDataBackup({
      annotations: source.annotations,
      consents: source.consents,
      drillPractice: source.drillPractice,
      now: () => '2026-06-19T15:30:00.000Z',
      reports: source.reports,
    });
    const tamperedBackup = {
      ...backup,
      app: {
        ...backup.app,
        release: '9.9.9',
      },
    };

    expect(() => previewLocalDataRestore(tamperedBackup)).toThrow('integrity check failed');
    await expect(
      restoreLocalDataBackup(tamperedBackup, {
        annotations: new InMemoryReportAnnotationRepository(),
        consents: new InMemoryCoachConsentRepository(),
        drillPractice: new InMemoryDrillPracticeRepository(),
        reports: new InMemoryReportRepository(),
      }),
    ).rejects.toThrow('integrity check failed');
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

    const backupWithOrphans = withCurrentIntegrity({
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
    });

    const result = await restoreLocalDataBackup(
      backupWithOrphans,
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

  it('previews skipped orphan records before restore', async () => {
    const { annotations, consents, drillPractice, reports } = await createPortabilityFixture();
    const backup = await createLocalDataBackup({
      annotations,
      consents,
      drillPractice,
      now: () => '2026-06-19T15:30:00.000Z',
      reports,
    });

    const backupWithOrphans = withCurrentIntegrity({
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
    });

    const preview = previewLocalDataRestore(backupWithOrphans);

    expect(preview).toMatchObject({
      annotationsToRestore: 1,
      consentsToRestore: 1,
      drillPracticeToRestore: 1,
      skippedAnnotations: 1,
      skippedConsents: 1,
      skippedDrillPractice: 1,
    });
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
    expect(() =>
      previewLocalDataRestore({
        ...backup,
        reports: [
          {
            ...backup.reports[0],
            privacy: {
              ...backup.reports[0].privacy,
              retention: 'debug content://private/video.mov',
            },
          },
        ],
      }),
    ).toThrow('raw video');
  });
});
