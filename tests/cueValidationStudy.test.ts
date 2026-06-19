import { describe, expect, it } from 'vitest';

import { createCoachReviewConsentRecord } from '../src/movement/coachConsentRepository';
import type { LocalAnalysisReport } from '../src/movement/contracts';
import {
  assertCueValidationStudySeedIsPrivacySafe,
  buildCueValidationStudySeed,
  formatCueValidationStudySeedSummary,
} from '../src/movement/cueValidationStudy';
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

  it('rejects injected raw artifact keys before study handoff', async () => {
    const seed = buildCueValidationStudySeed([], [], { generatedAt: '2026-06-20T00:10:00.000Z' });
    const unsafeSeed = {
      ...seed,
      videoUri: 'file:///private/local.mov',
    };

    expect(() => assertCueValidationStudySeedIsPrivacySafe(unsafeSeed)).toThrow(/forbidden raw artifact keys/i);
  });
});
