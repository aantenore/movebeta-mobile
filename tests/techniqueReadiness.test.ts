import { describe, expect, it } from 'vitest';

import { localMovementAnalyzer } from '../src/movement/localAnalyzer';
import { createReportAnnotation } from '../src/movement/reportAnnotationRepository';
import { sampleAttempts } from '../src/movement/sampleSession';
import {
  buildTechniqueReadinessPacket,
  buildTechniqueReadinessPlan,
  formatTechniqueReadinessPacketSummary,
  techniqueReadinessPacketSchemaVersion,
  TechniqueReadinessPacketSchema,
} from '../src/movement/techniqueReadiness';

async function buildSampleReports() {
  return Promise.all(
    sampleAttempts.map((attempt) =>
      localMovementAnalyzer.analyze({
        frames: attempt.frames,
        session: attempt.session,
      }),
    ),
  );
}

describe('technique readiness', () => {
  it('creates a baseline recommendation when no local report exists', () => {
    const plan = buildTechniqueReadinessPlan([], []);

    expect(plan.status).toBe('baseline');
    expect(plan.score).toBe(0);
    expect(plan.headline).toContain('baseline');
    expect(plan.nextAction).toContain('benchmark');
  });

  it('recommends repeating an active project with a concrete warmup and drill', async () => {
    const reports = await buildSampleReports();
    const plan = buildTechniqueReadinessPlan(reports, [
      createReportAnnotation(reports[0].id, {
        confidence: 3,
        perceivedEffort: 4,
        projectStatus: 'repeat',
        updatedAt: '2026-06-19T16:00:00.000Z',
      }),
    ]);

    expect(plan.status).toBe('repeat');
    expect(plan.score).toBeGreaterThan(0);
    expect(plan.focus).toBeTruthy();
    expect(plan.warmup).toContain('Warm up');
    expect(plan.nextAction).toContain('Repeat');
    expect(plan.drill?.dosage).toContain('repeats');
  });

  it('recommends recovery when effort is very high', async () => {
    const reports = await buildSampleReports();
    const plan = buildTechniqueReadinessPlan(reports, [
      createReportAnnotation(reports[0].id, {
        confidence: 2,
        perceivedEffort: 5,
        projectStatus: 'project',
        updatedAt: '2026-06-19T16:00:00.000Z',
      }),
    ]);

    expect(plan.status).toBe('recover');
    expect(plan.risk).toContain('High effort');
    expect(plan.warmup).toContain('easy movement');
  });

  it('builds a share-safe technique readiness packet without report ids or private artifacts', async () => {
    const reports = await buildSampleReports();
    const plan = buildTechniqueReadinessPlan(reports, [
      createReportAnnotation(reports[0].id, {
        confidence: 3,
        perceivedEffort: 4,
        projectStatus: 'repeat',
        updatedAt: '2026-06-19T16:00:00.000Z',
      }),
    ]);
    const packet = buildTechniqueReadinessPacket(plan, { generatedAt: '2026-06-22T16:10:00.000Z' });

    expect(TechniqueReadinessPacketSchema.parse(packet)).toEqual(packet);
    expect(packet.schemaVersion).toBe(techniqueReadinessPacketSchemaVersion);
    expect(packet.generatedAt).toBe('2026-06-22T16:10:00.000Z');
    expect(packet.readiness.status).toBe('repeat');
    expect(packet.readiness.drill?.sourceSessionTitle).toBeTruthy();
    expect(packet.privacy).toMatchObject({
      privateNotesIncluded: false,
      rawVideoIncluded: false,
      reportIdsIncluded: false,
      videoUriIncluded: false,
    });
    expect(formatTechniqueReadinessPacketSummary(packet)).toContain('Technique readiness:');
    expect(JSON.stringify(packet)).not.toMatch(/sourceReportId|"reportId"\s*:|"privateNote"\s*:|file:\/\/|content:\/\/|ph:\/\/|\/Users\/|secret-value/i);
  });

  it('rejects readiness packets when plan copy contains unsafe local artifacts', () => {
    const plan = {
      ...buildTechniqueReadinessPlan([], []),
      nextAction: 'Review /Users/athlete/raw.mov before training.',
    };

    expect(() => buildTechniqueReadinessPacket(plan)).toThrow('Technique readiness packet contains raw media');
  });
});
