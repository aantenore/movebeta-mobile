import { describe, expect, it } from 'vitest';

import { buildAdvancedDrillPack, AdvancedDrillPackSchema } from '../src/movement/drillPackPlanner';
import { createDrillPracticeRecord } from '../src/movement/drillPracticeRepository';
import { localMovementAnalyzer } from '../src/movement/localAnalyzer';
import { createReportAnnotation, updateCueFeedback } from '../src/movement/reportAnnotationRepository';
import { sampleAttempts } from '../src/movement/sampleSession';

async function buildReports() {
  return Promise.all(
    sampleAttempts.map((attempt) =>
      localMovementAnalyzer.analyze({
        frames: attempt.frames,
        session: attempt.session,
      }),
    ),
  );
}

describe('advanced drill pack planner', () => {
  it('builds a schema-valid local advanced drill pack from report cues', async () => {
    const reports = await buildReports();
    const pack = buildAdvancedDrillPack(reports, [], [], {
      generatedAt: '2026-06-20T10:00:00.000Z',
    });

    expect(AdvancedDrillPackSchema.parse(pack)).toEqual(pack);
    expect(pack.status).toBe('ready');
    expect(pack.blocks.length).toBeGreaterThan(0);
    expect(pack.blocks.length).toBeLessThanOrEqual(3);
    expect(pack.localOnly).toBe(true);
    expect(pack.privacy).toEqual({
      privateNotesIncluded: false,
      rawVideoIncluded: false,
      videoLeavesDevice: false,
    });
    expect(pack.summary).toContain('pack readiness');
  });

  it('uses practice logs to lower intensity when a cue is blocked', async () => {
    const reports = await buildReports();
    const cueId = reports[0].cues[0].id;
    const pack = buildAdvancedDrillPack(
      reports,
      [],
      [
        createDrillPracticeRecord({
          cueId,
          drillId: `${cueId}-${reports[0].id}`,
          reportId: reports[0].id,
          status: 'skipped',
        }),
        createDrillPracticeRecord({
          cueId,
          drillId: `${cueId}-${reports[1].id}`,
          reportId: reports[1].id,
          status: 'skipped',
        }),
      ],
    );
    const blockedBlock = pack.blocks.find((block) => block.cueIds.includes(cueId));

    expect(blockedBlock?.intensity).toBe('easy');
    expect(blockedBlock?.adaptation).toContain('getting skipped');
    expect(blockedBlock?.progression[0]).toContain('Reset on easy terrain');
  });

  it('adapts the pack from cue feedback without exposing private notes', async () => {
    const reports = await buildReports();
    const cueId = reports[0].cues[0].id;
    const annotation = updateCueFeedback(
      createReportAnnotation(reports[0].id, {
        privateNote: 'Private beta note must not leave the annotation store.',
        tags: ['secret-pack-tag'],
      }),
      {
        cueId,
        rating: 'not-useful',
        updatedAt: '2026-06-20T10:30:00.000Z',
      },
    );
    const pack = buildAdvancedDrillPack(reports, [annotation]);
    const cueBlock = pack.blocks.find((block) => block.cueIds.includes(cueId));

    expect(cueBlock?.title).toContain('variant pack');
    expect(cueBlock?.adaptation).toContain('needs review');
    expect(JSON.stringify(pack)).not.toContain('Private beta note');
    expect(JSON.stringify(pack)).not.toContain('secret-pack-tag');
  });

  it('returns an empty pack when reports do not contain coach cues', async () => {
    const [report] = await buildReports();
    const pack = buildAdvancedDrillPack([{ ...report, cues: [] }]);

    expect(pack.status).toBe('empty');
    expect(pack.blocks).toEqual([]);
    expect(pack.summary).toContain('Run an analysis');
  });
});
