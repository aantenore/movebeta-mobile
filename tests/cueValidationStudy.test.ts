import { describe, expect, it } from 'vitest';

import { createCoachReviewConsentRecord } from '../src/movement/coachConsentRepository';
import type { LocalAnalysisReport } from '../src/movement/contracts';
import {
  assertCueValidationClipIntakeManifestIsPrivacySafe,
  assertCueValidationCollectionRunbookIsPrivacySafe,
  assertCueValidationReviewerAssignmentPacketIsPrivacySafe,
  assertCueValidationReviewWorksheetIsPrivacySafe,
  assertCueValidationReviewWorksheetCsvIsPrivacySafe,
  assertCueValidationReviewerOnboardingPacketIsPrivacySafe,
  assertCueValidationStudySeedIsPrivacySafe,
  buildCueValidationClipIntakeManifest,
  buildCueValidationCollectionRunbook,
  buildCueValidationReviewWorksheet,
  buildCueValidationReviewWorksheetCsv,
  buildCueValidationReviewerAssignmentPacket,
  buildCueValidationReviewerOnboardingPacket,
  buildCueValidationDatasetFromCompletedWorksheetCsv,
  buildCueValidationStudySeed,
  cueValidationClipIntakeManifestSchemaVersion,
  cueValidationCollectionRunbookSchemaVersion,
  cueValidationReviewerAssignmentPacketSchemaVersion,
  cueValidationReviewerOnboardingPacketSchemaVersion,
  formatCueValidationClipIntakeManifestSummary,
  formatCueValidationCollectionRunbookSummary,
  formatCueValidationCompletedDatasetSummary,
  formatCueValidationReviewerAssignmentPacketSummary,
  formatCueValidationReviewerOnboardingPacketSummary,
  formatCueValidationReviewWorksheetSummary,
  formatCueValidationStudySeedSummary,
  type CueValidationClipIntakeManifest,
  type CueValidationCollectionRunbook,
  type CueValidationReviewerAssignmentPacket,
  type CueValidationReviewerOnboardingPacket,
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
      acceptance: {
        maxReviewerScoreSpreadPerCriterion: 1,
        minDistinctReviewersPerCue: 2,
      },
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
    expect(seed.reviewerInstructions.join(' ')).toContain('reviewer score spread');
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

  it('builds a privacy-safe clip intake manifest from consented reports', async () => {
    const report = await buildReport('clip-intake-project');
    const seed = buildCueValidationStudySeed(
      [report],
      [createCoachReviewConsentRecord(report.id, { grantedAt: '2026-06-20T00:07:00.000Z' })],
      {
        acceptance: {
          minAverageCueScore: 4.5,
          minClips: 1,
          requiredWallAngles: [report.session.wallAngle],
        },
        generatedAt: '2026-06-20T00:08:00.000Z',
      },
    );

    const manifest = buildCueValidationClipIntakeManifest(seed, {
      generatedAt: '2026-06-20T00:09:00.000Z',
      reviewerCount: 2,
    });
    const serialized = JSON.stringify(manifest);

    expect(() => assertCueValidationClipIntakeManifestIsPrivacySafe(manifest)).not.toThrow();
    expect(manifest).toMatchObject({
      generatedAt: '2026-06-20T00:09:00.000Z',
      privacy: {
        coachPacketsIncluded: false,
        keyFramesIncluded: false,
        landmarksIncluded: false,
        privateNotesIncluded: false,
        rawUrisIncluded: false,
        rawVideoIncluded: false,
        reviewerScoresInvented: false,
        videoLeavesDevice: false,
      },
      schemaVersion: cueValidationClipIntakeManifestSchemaVersion,
      sourceSeedGeneratedAt: seed.generatedAt,
      summary: {
        clipCount: 1,
        missingWallAngles: [],
        requiredCoachReviewRows: seed.cueCount * 2,
        status: 'ready-for-review',
        targetClipCount: 1,
        wallAngles: [report.session.wallAngle],
      },
    });
    expect(manifest.clips[0]).toMatchObject({
      clipId: report.id,
      consentRecordId: `${report.id}:2026-06-20T00:07:00.000Z`,
      cueCount: report.cues.length,
      packetReportId: report.id,
      requiredCoachReviewRows: report.cues.length * 2,
      status: 'ready-for-packet-review',
      wallAngle: report.session.wallAngle,
    });
    expect(formatCueValidationClipIntakeManifestSummary(manifest)).toBe(
      `1/1 consented clips · 1/1 wall angles · ${report.cues.length * 2} coach review rows · status ready-for-review · raw video: no`,
    );
    expect(serialized).not.toMatch(/(?:file:\/\/|content:\/\/|"(?:privateNote|rawVideoUri|videoUri|landmarks|keyFrame)"\s*:)/i);
  });

  it('rejects clip intake manifests with raw artifact text', async () => {
    const seed = buildCueValidationStudySeed([], [], { generatedAt: '2026-06-20T00:11:00.000Z' });
    const manifest = buildCueValidationClipIntakeManifest(seed, { generatedAt: '2026-06-20T00:12:00.000Z' });
    const unsafeManifest = {
      ...manifest,
      clips: [
        {
          clipId: 'file:///private/raw-video.mov',
          consentRecordId: 'consent',
          cueCount: 1,
          durationMs: 1000,
          grade: '6b',
          gym: 'Local gym',
          packetReportId: 'packet',
          requiredCoachReviewRows: 2,
          status: 'ready-for-packet-review',
          title: 'Unsafe clip',
          wallAngle: 'vertical',
        },
      ],
    } as unknown as CueValidationClipIntakeManifest;

    expect(() => assertCueValidationClipIntakeManifestIsPrivacySafe(unsafeManifest)).toThrow(/raw artifact text/i);
  });

  it('builds a privacy-safe coach reviewer onboarding packet from the study seed', async () => {
    const report = await buildReport('reviewer-onboarding-project');
    const seed = buildCueValidationStudySeed(
      [report],
      [createCoachReviewConsentRecord(report.id, { grantedAt: '2026-06-20T00:17:00.000Z' })],
      {
        acceptance: {
          minAverageCueScore: 4.5,
          minClips: 1,
          requiredWallAngles: [report.session.wallAngle],
        },
        generatedAt: '2026-06-20T00:18:00.000Z',
      },
    );

    const packet = buildCueValidationReviewerOnboardingPacket(seed, {
      generatedAt: '2026-06-20T00:19:00.000Z',
      reviewerCount: 2,
    });
    const serialized = JSON.stringify(packet);

    expect(() => assertCueValidationReviewerOnboardingPacketIsPrivacySafe(packet)).not.toThrow();
    expect(packet).toMatchObject({
      generatedAt: '2026-06-20T00:19:00.000Z',
      privacy: {
        coachPacketsIncluded: false,
        credentialValuesIncluded: false,
        keyFramesIncluded: false,
        landmarksIncluded: false,
        localPathsIncluded: false,
        privateNotesIncluded: false,
        rawArtifactsIncluded: false,
        rawUrisIncluded: false,
        rawVideoIncluded: false,
        reviewerIdentitiesIncluded: false,
        reviewerScoresInvented: false,
        videoLeavesDevice: false,
      },
      schemaVersion: cueValidationReviewerOnboardingPacketSchemaVersion,
      sourceSeedGeneratedAt: seed.generatedAt,
      summary: {
        estimatedReviewRows: seed.cueCount * 2,
        missingWallAngles: [],
        reviewerSlotsNeeded: 2,
        sourceClipCount: 1,
        sourceCueCount: seed.cueCount,
        status: 'ready-for-review',
        targetClipCount: 1,
      },
    });
    expect(packet.commands.map((command) => command.key)).toEqual([
      'prepare-seed',
      'review-packet-only',
      'complete-worksheet',
      'run-validation-gate',
    ]);
    expect(packet.reviewCriteria.map((criterion) => criterion.id)).toEqual([
      'relevance',
      'timingAccuracy',
      'drillFit',
      'safetyLanguage',
    ]);
    expect(packet.reviewCriteria.every((criterion) => criterion.passingScore === 4.5)).toBe(true);
    expect(packet.instructions.join(' ')).toContain('Reviewer spread');
    expect(formatCueValidationReviewerOnboardingPacketSummary(packet)).toBe(
      `1/1 consented clips · ${seed.cueCount * 2} expected review rows · 2 coach slots target · status ready-for-review · raw video: no`,
    );
    expect(serialized).not.toMatch(/file:\/\/|\/Users\/|ghp_|pat_|BEGIN PRIVATE KEY|rawVideoUri|videoUri/i);
  });

  it('rejects reviewer onboarding packets with raw artifact or credential text', () => {
    const seed = buildCueValidationStudySeed([], [], { generatedAt: '2026-06-20T00:20:00.000Z' });
    const packet = buildCueValidationReviewerOnboardingPacket(seed, { generatedAt: '2026-06-20T00:21:00.000Z' });
    const unsafePacket: CueValidationReviewerOnboardingPacket = {
      ...packet,
      instructions: [
        ...packet.instructions,
        'Open file:///private/raw-video.mov with token ghp_1234567890abcdefTOKENVALUE.',
      ],
    };

    expect(() => assertCueValidationReviewerOnboardingPacketIsPrivacySafe(unsafePacket)).toThrow(/raw artifact or credential/i);
  });

  it('builds a privacy-safe reviewer assignment packet from the study seed', async () => {
    const report = await buildReport('reviewer-assignment-project');
    const seed = buildCueValidationStudySeed(
      [report],
      [createCoachReviewConsentRecord(report.id, { grantedAt: '2026-06-20T00:22:00.000Z' })],
      {
        acceptance: {
          minClips: 1,
          requiredWallAngles: [report.session.wallAngle],
        },
        generatedAt: '2026-06-20T00:23:00.000Z',
      },
    );

    const packet = buildCueValidationReviewerAssignmentPacket(seed, {
      generatedAt: '2026-06-20T00:24:00.000Z',
      reviewerCount: 2,
    });
    const serialized = JSON.stringify(packet);

    expect(() => assertCueValidationReviewerAssignmentPacketIsPrivacySafe(packet)).not.toThrow();
    expect(packet).toMatchObject({
      generatedAt: '2026-06-20T00:24:00.000Z',
      privacy: {
        coachPacketsIncluded: false,
        credentialValuesIncluded: false,
        keyFramesIncluded: false,
        landmarksIncluded: false,
        localPathsIncluded: false,
        privateNotesIncluded: false,
        rawArtifactsIncluded: false,
        rawUrisIncluded: false,
        rawVideoIncluded: false,
        rawWorksheetIncluded: false,
        reportIdsIncluded: false,
        reviewerIdentitiesIncluded: false,
        reviewerScoresIncluded: false,
        reviewerScoresInvented: false,
        videoLeavesDevice: false,
      },
      schemaVersion: cueValidationReviewerAssignmentPacketSchemaVersion,
      sourceSeedGeneratedAt: seed.generatedAt,
      summary: {
        assignmentCount: 2,
        estimatedScoreCells: seed.cueCount * 2 * 4,
        estimatedWorksheetRows: seed.cueCount * 2,
        maxRowsPerReviewerSlot: seed.cueCount,
        missingWallAngles: [],
        reviewerSlots: 2,
        sourceClipCount: 1,
        sourceCueCount: seed.cueCount,
        status: 'ready-for-assignment',
        targetClipCount: 1,
      },
    });
    expect(packet.assignments).toHaveLength(2);
    expect(packet.assignments[0]).toMatchObject({
      assignmentKey: 'reviewer-slot-1',
      clipCount: 1,
      cueCount: seed.cueCount,
      expectedScoreCells: seed.cueCount * 4,
      packetOnly: true,
      reviewMode: 'packet-only',
      reviewerRole: 'coach',
      reviewerSlot: 1,
      rowCount: seed.cueCount,
      worksheetFilter: 'reviewerSlot=1',
    });
    expect(formatCueValidationReviewerAssignmentPacketSummary(packet)).toBe(
      `2 reviewer slot assignments · ${seed.cueCount * 2} worksheet rows · ${seed.cueCount * 2 * 4} score cells · status ready-for-assignment · reviewer identities: no`,
    );
    expect(serialized).not.toMatch(/file:\/\/|\/Users\/|ghp_|pat_|BEGIN PRIVATE KEY|rawVideoUri|videoUri|coach-1/i);
  });

  it('rejects reviewer assignment packets with raw artifact or credential text', () => {
    const seed = buildCueValidationStudySeed([], [], { generatedAt: '2026-06-20T00:25:00.000Z' });
    const packet = buildCueValidationReviewerAssignmentPacket(seed, { generatedAt: '2026-06-20T00:26:00.000Z' });
    const unsafePacket: CueValidationReviewerAssignmentPacket = {
      ...packet,
      instructions: [
        ...packet.instructions,
        'Send file:///private/raw-video.mov to reviewer with token ghp_1234567890abcdefTOKENVALUE.',
      ],
    };

    expect(() => assertCueValidationReviewerAssignmentPacketIsPrivacySafe(unsafePacket)).toThrow(/raw artifact or credential/i);
  });

  it('builds a privacy-safe collection runbook for the current study seed and worksheet state', async () => {
    const report = await buildReport('collection-runbook-project');
    const seed = buildCueValidationStudySeed(
      [report],
      [createCoachReviewConsentRecord(report.id, { grantedAt: '2026-06-20T00:27:00.000Z' })],
      {
        acceptance: {
          minClips: 1,
          requiredWallAngles: [report.session.wallAngle],
        },
        generatedAt: '2026-06-20T00:28:00.000Z',
      },
    );

    const runbook = buildCueValidationCollectionRunbook(seed, {
      generatedAt: '2026-06-20T00:29:00.000Z',
      reviewerCount: 2,
    });
    const serialized = JSON.stringify(runbook);

    expect(() => assertCueValidationCollectionRunbookIsPrivacySafe(runbook)).not.toThrow();
    expect(runbook).toMatchObject({
      generatedAt: '2026-06-20T00:29:00.000Z',
      privacy: {
        coachPacketsIncluded: false,
        credentialValuesIncluded: false,
        keyFramesIncluded: false,
        landmarksIncluded: false,
        localPathsIncluded: false,
        privateNotesIncluded: false,
        rawArtifactsIncluded: false,
        rawUrisIncluded: false,
        rawVideoIncluded: false,
        rawWorksheetIncluded: false,
        reportIdsIncluded: false,
        reviewerIdentitiesIncluded: false,
        reviewerScoresIncluded: false,
        reviewerScoresInvented: false,
        tokenLikeValuesIncluded: false,
        videoLeavesDevice: false,
      },
      schemaVersion: cueValidationCollectionRunbookSchemaVersion,
      sourceSeedGeneratedAt: seed.generatedAt,
      summary: {
        assignmentCount: 2,
        completeWorksheetRows: 0,
        currentPhase: 'complete-worksheet',
        expectedWorksheetRows: seed.cueCount * 2,
        missingScoreCount: 0,
        missingWallAngles: [],
        reviewerSlots: 2,
        sourceClipCount: 1,
        sourceCueCount: seed.cueCount,
        status: 'needs-review',
        targetClipCount: 1,
        worksheetPreflightStatus: 'empty',
      },
    });
    expect(runbook.phases.map((phase) => phase.key)).toEqual([
      'collect-consent',
      'cover-wall-angles',
      'assign-reviewers',
      'complete-worksheet',
      'preflight-worksheet',
      'compose-dataset',
    ]);
    expect(formatCueValidationCollectionRunbookSummary(runbook)).toBe(
      `Collection runbook: needs-review · phase complete-worksheet · 1/1 clips · 0/${seed.cueCount * 2} rows complete · preflight empty`,
    );
    expect(serialized).not.toContain(report.id);
    expect(serialized).not.toMatch(/file:\/\/|\/Users\/|ghp_|pat_|BEGIN PRIVATE KEY|rawVideoUri|videoUri/i);
  });

  it('marks the collection runbook ready for dataset after completed worksheet preflight passes', async () => {
    const report = await buildReport('collection-runbook-ready');
    const seed = buildCueValidationStudySeed(
      [report],
      [createCoachReviewConsentRecord(report.id, { grantedAt: '2026-06-20T00:30:00.000Z' })],
      {
        acceptance: {
          minClips: 1,
          requiredWallAngles: [report.session.wallAngle],
        },
        generatedAt: '2026-06-20T00:31:00.000Z',
      },
    );
    const worksheet = buildCueValidationReviewWorksheet(seed, {
      generatedAt: '2026-06-20T00:32:00.000Z',
      reviewerCount: 2,
    });
    const completedWorksheetCsv = completeWorksheetCsv(buildCueValidationReviewWorksheetCsv(worksheet), 5);
    const runbook = buildCueValidationCollectionRunbook(seed, {
      completedWorksheetCsv,
      generatedAt: '2026-06-20T00:33:00.000Z',
      reviewerCount: 2,
    });

    expect(() => assertCueValidationCollectionRunbookIsPrivacySafe(runbook)).not.toThrow();
    expect(runbook.summary).toMatchObject({
      completeWorksheetRows: worksheet.rowCount,
      currentPhase: 'compose-dataset',
      expectedWorksheetRows: worksheet.rowCount,
      missingScoreCount: 0,
      status: 'ready-for-dataset',
      worksheetPreflightStatus: 'ready',
    });
    expect(runbook.phases.find((phase) => phase.key === 'compose-dataset')).toMatchObject({
      owner: 'qa',
      status: 'ready',
    });
  });

  it('rejects collection runbooks with raw artifact or credential text', () => {
    const seed = buildCueValidationStudySeed([], [], { generatedAt: '2026-06-20T00:34:00.000Z' });
    const runbook = buildCueValidationCollectionRunbook(seed, { generatedAt: '2026-06-20T00:35:00.000Z' });
    const unsafeRunbook: CueValidationCollectionRunbook = {
      ...runbook,
      instructions: [
        ...runbook.instructions,
        'Attach file:///private/raw-video.mov and token ghp_1234567890abcdefTOKENVALUE.',
      ],
    };

    expect(() => assertCueValidationCollectionRunbookIsPrivacySafe(unsafeRunbook)).toThrow(/raw artifact or credential/i);
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
      schemaVersion: 'movebeta.cue-validation-dataset.v1',
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
