import { describe, expect, it } from 'vitest';

import {
  assertCoachPacketIsPrivacySafe,
  buildCoachReviewPacket,
  CoachReviewPacketSchema,
} from '../src/movement/coachReviewPacket';
import { PrivacyConsentSchema } from '../src/core/privacy';
import { createDrillPracticeRecord } from '../src/movement/drillPracticeRepository';
import { localMovementAnalyzer } from '../src/movement/localAnalyzer';
import { createReportAnnotation, updateCueFeedback, updateRepeatOutcome } from '../src/movement/reportAnnotationRepository';
import { samplePoseFrames, sampleSession } from '../src/movement/sampleSession';

const coachConsent = PrivacyConsentSchema.parse({
  coachReview: true,
  cueValidation: true,
});

async function buildReport() {
  return localMovementAnalyzer.analyze({
    frames: samplePoseFrames,
    session: sampleSession,
  });
}

describe('coach review packet', () => {
  it('builds a schema-valid consented packet without raw video artifacts', async () => {
    const report = await buildReport();
    const packet = buildCoachReviewPacket(report, {
      consent: coachConsent,
      consentGrantedAt: '2026-06-19T11:55:00+02:00',
      createdAt: '2026-06-19T12:00:00+02:00',
    });

    expect(CoachReviewPacketSchema.parse(packet)).toEqual(packet);
    expect(packet.schemaVersion).toBe('movebeta.coach-review.v2');
    expect(packet.reportId).toBe(report.id);
    expect(packet.consent.granted).toBe(true);
    expect(packet.consent.grantedAt).toBe('2026-06-19T11:55:00+02:00');
    expect(packet.consent.rawVideoIncluded).toBe(false);
    expect(packet.consent.videoLeavesDevice).toBe(false);
    expect(packet.analysis.performance.budgetStatus).toBe('not-measured');
    expect(packet.analysis.metrics.length).toBeGreaterThan(0);
    expect(packet.analysis.cueTrust.schemaVersion).toBe('movebeta.cue-trust.v1');
    expect(packet.analysis.cueTrust.signals).toHaveLength(report.cues.length);
    expect(packet.analysis.cueTrust.validationStatus).toBe('pending');
    expect(packet.athleteContext.trainingLog.privateNoteIncluded).toBe(false);
    expect(packet.athleteContext.drillPractice.totalCount).toBe(0);
    expect(packet.reviewRubric.map((item) => item.id)).toEqual([
      'cue-relevance',
      'timing-accuracy',
      'drill-fit',
      'safety-language',
    ]);
    expect(JSON.stringify(packet)).not.toMatch(/"keyFrame"\s*:/);
    expect(JSON.stringify(packet)).not.toMatch(/"landmarks"\s*:/);
    expect(JSON.stringify(packet)).not.toMatch(/"uri"\s*:/);
    expect(() => assertCoachPacketIsPrivacySafe(packet)).not.toThrow();
  });

  it('adds consented athlete context without exposing private notes or drill notes', async () => {
    const report = await buildReport();
    const primaryCue = report.cues[0];
    const secondaryCue = report.cues[1] ?? report.cues[0];
    const annotation = updateRepeatOutcome(
      updateCueFeedback(
        createReportAnnotation(report.id, {
          confidence: 5,
          perceivedEffort: 4,
          privateNote: 'Keep this private: left hip drift before the crux.',
          projectStatus: 'repeat',
          tags: ['board', 'crux'],
          updatedAt: '2026-06-19T18:00:00.000Z',
        }),
        {
          cueId: primaryCue.id,
          note: 'This cue felt accurate but the note is private.',
          rating: 'useful',
          updatedAt: '2026-06-19T18:05:00.000Z',
        },
      ),
      {
        attempts: 2,
        resolvedCueIds: [primaryCue.id, 'orphan-cue'],
        status: 'improved',
        updatedAt: '2026-06-19T18:08:00.000Z',
      },
    );

    const packet = buildCoachReviewPacket(report, {
      annotation,
      consent: coachConsent,
      createdAt: '2026-06-19T18:20:00.000Z',
      drillPractice: [
        createDrillPracticeRecord({
          cueId: primaryCue.id,
          drillId: `${primaryCue.id}-${report.id}-a`,
          note: 'Coach packet must not expose this drill note.',
          reportId: report.id,
          status: 'completed',
          updatedAt: '2026-06-19T18:15:00.000Z',
        }),
        createDrillPracticeRecord({
          cueId: secondaryCue.id,
          drillId: `${secondaryCue.id}-${report.id}-b`,
          note: 'Blocked because of pump.',
          reportId: report.id,
          status: 'skipped',
          updatedAt: '2026-06-19T18:10:00.000Z',
        }),
        createDrillPracticeRecord({
          cueId: primaryCue.id,
          drillId: `${primaryCue.id}-other-report`,
          reportId: 'other-report',
          status: 'skipped',
          updatedAt: '2026-06-19T18:25:00.000Z',
        }),
      ],
    });
    const serialized = JSON.stringify(packet);

    expect(packet.athleteContext.trainingLog).toMatchObject({
      confidence: 5,
      perceivedEffort: 4,
      privateNoteIncluded: false,
      projectStatus: 'repeat',
      tags: ['board', 'crux'],
      updatedAt: '2026-06-19T18:08:00.000Z',
    });
    expect(packet.athleteContext.trainingLog.cueFeedback).toEqual([
      {
        cueId: primaryCue.id,
        noteIncluded: false,
        rating: 'useful',
        updatedAt: '2026-06-19T18:05:00.000Z',
      },
    ]);
    expect(packet.athleteContext.trainingLog.repeatOutcome).toEqual({
      attempts: 2,
      resolvedCueIds: [primaryCue.id],
      status: 'improved',
      updatedAt: '2026-06-19T18:08:00.000Z',
    });
    expect(packet.athleteContext.drillPractice).toMatchObject({
      completedCount: 1,
      latestStatus: 'completed',
      skippedCount: 1,
      totalCount: 2,
      updatedAt: '2026-06-19T18:15:00.000Z',
    });
    expect(packet.athleteContext.drillPractice.practicedCueIds).toEqual([primaryCue.id]);
    expect(packet.athleteContext.drillPractice.blockedCueIds).toEqual([secondaryCue.id]);
    expect(serialized).not.toContain('Keep this private');
    expect(serialized).not.toContain('This cue felt accurate');
    expect(serialized).not.toContain('Coach packet must not expose');
    expect(serialized).not.toContain('Blocked because of pump');
    expect(() => assertCoachPacketIsPrivacySafe(packet)).not.toThrow();
  });

  it('includes real validation evidence in cue trust when provided', async () => {
    const report = await buildReport();
    const failingCueId = report.cues[0].id;
    const packet = buildCoachReviewPacket(report, {
      consent: coachConsent,
      createdAt: '2026-06-20T08:00:00.000Z',
      validation: {
        acceptance: 'needs-review',
        averageScore: 3.25,
        failingCueIds: [failingCueId],
        reviewedCueCount: report.cues.length,
        unreviewedCueIds: [],
      },
    });
    const failingSignal = packet.analysis.cueTrust.signals.find((signal) => signal.cueId === failingCueId);

    expect(packet.analysis.cueTrust.validationStatus).toBe('needs-review');
    expect(failingSignal?.factors.find((factor) => factor.id === 'validation')).toMatchObject({
      status: 'weak',
    });
    expect(JSON.stringify(packet)).not.toMatch(/reviewerId|rawVideoUri|videoUri|file:\/\//i);
    expect(() => assertCoachPacketIsPrivacySafe(packet)).not.toThrow();
  });

  it('rejects packets that contain upload-capable or raw pose artifacts', async () => {
    const report = await buildReport();
    const packet = buildCoachReviewPacket(report, { consent: coachConsent });

    expect(() =>
      assertCoachPacketIsPrivacySafe({
        ...packet,
        analysis: {
          ...packet.analysis,
          engine: {
            ...packet.analysis.engine,
            uploadsVideo: true,
          },
        },
      }),
    ).toThrow('must not include upload-capable');
  });

  it('requires explicit consent before preparing a coach packet', async () => {
    const report = await buildReport();

    expect(() => buildCoachReviewPacket(report)).toThrow('explicit athlete consent');
  });
});
