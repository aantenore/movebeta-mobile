import { describe, expect, it } from 'vitest';

import { buildCoachLibrary } from '../src/movement/coachLibrary';
import { createCoachReviewConsentRecord } from '../src/movement/coachConsentRepository';
import type { LocalAnalysisReport } from '../src/movement/contracts';
import { createDrillPracticeRecord } from '../src/movement/drillPracticeRepository';
import { localMovementAnalyzer } from '../src/movement/localAnalyzer';
import { createReportAnnotation, updateCueFeedback } from '../src/movement/reportAnnotationRepository';
import { samplePoseFrames, sampleSession } from '../src/movement/sampleSession';

async function buildReport(id: string, title: string): Promise<LocalAnalysisReport> {
  const report = await localMovementAnalyzer.analyze({
    frames: samplePoseFrames,
    session: {
      ...sampleSession,
      id,
      title,
    },
  });
  return {
    ...report,
    id,
    session: {
      ...report.session,
      id,
      title,
    },
  };
}

describe('coach library', () => {
  it('builds a privacy-safe local coach review queue from active consented reports', async () => {
    const highPriority = await buildReport('report-high', 'Board crux repeat');
    const mediumPriority = {
      ...(await buildReport('report-medium', 'Warmup slab')),
      cues: [
        {
          body: 'Keep one smooth repeat for baseline review.',
          drill: 'Repeat the same sequence once.',
          id: 'cue-watch',
          severity: 'watch' as const,
          timestampMs: 500,
          title: 'Smooth repeat',
        },
      ],
    };
    const annotation = updateCueFeedback(
      createReportAnnotation(highPriority.id, {
        confidence: 5,
        perceivedEffort: 4,
        privateNote: 'Private athlete detail must stay local.',
        updatedAt: '2026-06-19T19:20:00.000Z',
      }),
      {
        cueId: highPriority.cues[0].id,
        note: 'Do not expose this coach note.',
        rating: 'useful',
        updatedAt: '2026-06-19T19:25:00.000Z',
      },
    );

    const library = buildCoachLibrary(
      [mediumPriority, highPriority],
      [
        createCoachReviewConsentRecord(mediumPriority.id, { grantedAt: '2026-06-19T19:00:00.000Z' }),
        createCoachReviewConsentRecord(highPriority.id, { grantedAt: '2026-06-19T19:10:00.000Z' }),
        {
          ...createCoachReviewConsentRecord('revoked-report', { grantedAt: '2026-06-19T19:30:00.000Z' }),
          revokedAt: '2026-06-19T19:31:00.000Z',
        },
        createCoachReviewConsentRecord('orphan-report', { grantedAt: '2026-06-19T19:40:00.000Z' }),
      ],
      [annotation],
      [
        createDrillPracticeRecord({
          cueId: highPriority.cues[0].id,
          drillId: 'drill-high',
          note: 'Private drill note',
          reportId: highPriority.id,
          status: 'completed',
          updatedAt: '2026-06-19T19:30:00.000Z',
        }),
      ],
    );

    expect(library).toMatchObject({
      activeConsentCount: 2,
      highPriorityCount: 1,
      readyPacketCount: 2,
      revokedConsentCount: 1,
      totalReports: 2,
    });
    expect(library.entries.map((entry) => entry.reportId)).toEqual([highPriority.id, mediumPriority.id]);
    expect(library.entries[0]).toMatchObject({
      athleteContextIncluded: true,
      cueFeedbackCount: 1,
      drillPracticeCount: 1,
      packetReady: true,
      priority: 'high',
      rawVideoIncluded: false,
      reviewFocus: highPriority.cues.find((cue) => cue.severity === 'fix')?.title,
      videoLeavesDevice: false,
    });
    expect(JSON.stringify(library)).not.toContain('Private athlete detail');
    expect(JSON.stringify(library)).not.toContain('Private drill note');
  });

  it('flags low-signal consented reports for review without blocking packet readiness', async () => {
    const report = {
      ...(await buildReport('low-signal', 'Low light attempt')),
      analysisQuality: {
        averageVisibility: 0.4,
        frameCoverage: 0.5,
        landmarkCoverage: 0.5,
        score: 58,
        warnings: ['Low visibility'],
      },
      cues: [],
    };

    const library = buildCoachLibrary(
      [report],
      [createCoachReviewConsentRecord(report.id, { grantedAt: '2026-06-19T20:00:00.000Z' })],
    );

    expect(library.entries[0]).toMatchObject({
      packetReady: true,
      priority: 'medium',
      reviewFocus: 'Movement baseline review',
      signalStatus: 'review-signal',
    });
  });
});
