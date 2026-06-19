import { describe, expect, it } from 'vitest';

import { buildCoachLibrary } from '../src/movement/coachLibrary';
import { createCoachReviewConsentRecord } from '../src/movement/coachConsentRepository';
import { buildCoachTeamTemplates } from '../src/movement/coachTeamTemplates';
import type { LocalAnalysisReport } from '../src/movement/contracts';
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

describe('coach team templates', () => {
  it('builds reusable local team templates from consented coach library entries', async () => {
    const report = await buildReport('board-project');
    const annotation = updateCueFeedback(
      createReportAnnotation(report.id, {
        privateNote: 'Private project note must not leak.',
        updatedAt: '2026-06-19T21:00:00.000Z',
      }),
      {
        cueId: report.cues[0].id,
        note: 'Private cue note must not leak.',
        rating: 'useful',
        updatedAt: '2026-06-19T21:05:00.000Z',
      },
    );
    const library = buildCoachLibrary(
      [report],
      [createCoachReviewConsentRecord(report.id, { grantedAt: '2026-06-19T21:10:00.000Z' })],
      [annotation],
      [
        createDrillPracticeRecord({
          cueId: report.cues[0].id,
          drillId: 'board-project-drill',
          note: 'Private drill note must not leak.',
          reportId: report.id,
          status: 'completed',
          updatedAt: '2026-06-19T21:15:00.000Z',
        }),
      ],
    );

    const plan = buildCoachTeamTemplates(library);
    const serialized = JSON.stringify(plan);

    expect(plan.sourceEntryCount).toBe(1);
    expect(plan.templates.map((template) => template.id)).toEqual([
      'high-priority-review',
      'follow-through-review',
      'privacy-safe-packet-review',
    ]);
    expect(plan.templates[0]).toMatchObject({
      audience: 'Coach-led small group',
      priority: 'high',
      title: 'High-priority review block',
    });
    expect(serialized).not.toContain('Private project note');
    expect(serialized).not.toContain('Private cue note');
    expect(serialized).not.toContain('Private drill note');
    expect(serialized).not.toMatch(/keyFrame|landmarks|uri/i);
  });

  it('adds a signal retake clinic when consented entries need quality review', async () => {
    const report = {
      ...(await buildReport('low-signal')),
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
      [createCoachReviewConsentRecord(report.id, { grantedAt: '2026-06-19T21:30:00.000Z' })],
    );

    const plan = buildCoachTeamTemplates(library);

    expect(plan.templates.map((template) => template.id)).toEqual([
      'signal-retake-clinic',
      'privacy-safe-packet-review',
    ]);
    expect(plan.templates[0]).toMatchObject({
      priority: 'medium',
      title: 'Signal retake clinic',
    });
  });

  it('returns an empty plan before coach consent exists', () => {
    const plan = buildCoachTeamTemplates(buildCoachLibrary([], []));

    expect(plan).toEqual({
      sourceEntryCount: 0,
      templates: [],
    });
  });
});
