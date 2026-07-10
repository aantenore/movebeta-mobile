import { describe, expect, it } from 'vitest';

import { attachAnalysisEvidence } from '../src/movement/analysisEvidence';
import {
  analysisTrustTrendPacketSchemaVersion,
  analysisTrustTrendSchemaVersion,
  AnalysisTrustTrendPacketSchema,
  AnalysisTrustTrendSchema,
  buildAnalysisTrustTrendPacket,
  formatAnalysisTrustTrendPacketSummary,
  summarizeAnalysisTrustTrend,
} from '../src/movement/analysisTrustTrend';
import type { LocalAnalysisReport } from '../src/movement/contracts';
import { localMovementAnalyzer } from '../src/movement/localAnalyzer';
import { samplePoseFrames, sampleSession } from '../src/movement/sampleSession';

async function buildReport(overrides: Partial<LocalAnalysisReport> = {}) {
  const report = await localMovementAnalyzer.analyze({
    frames: samplePoseFrames,
    session: sampleSession,
  });

  return attachAnalysisEvidence(
    {
      ...report,
      ...overrides,
      performance: {
        ...report.performance,
        analysisMs: 680,
        budgetMs: 1800,
        budgetStatus: 'within-budget',
        framesPerSecond: 41,
        measuredAt: sampleSession.createdAt,
        ...overrides.performance,
      },
    },
    { generatedAt: overrides.session?.createdAt ?? sampleSession.createdAt },
  );
}

function session(id: string, title: string, createdAt: string) {
  return {
    ...sampleSession,
    createdAt,
    id,
    title,
  };
}

const lowQuality = {
  averageVisibility: 0.35,
  frameCoverage: 0.41,
  landmarkCoverage: 0.52,
  score: 43,
  warnings: ['Pose visibility is low.'],
};

describe('analysis trust trend', () => {
  it('returns a schema-versioned empty baseline without raw artifacts', () => {
    const trend = summarizeAnalysisTrustTrend([], { generatedAt: '2026-06-22T15:00:00.000Z' });

    expect(AnalysisTrustTrendSchema.parse(trend)).toEqual(trend);
    expect(trend.schemaVersion).toBe(analysisTrustTrendSchemaVersion);
    expect(trend.status).toBe('baseline-needed');
    expect(trend.latest).toBeNull();
    expect(trend.counts).toEqual({
      coachReady: 0,
      journalOnly: 0,
      retake: 0,
      reviewFirst: 0,
    });
    expect(trend.privacy).toEqual({
      localOnly: true,
      privateNotesIncluded: false,
      rawVideoIncluded: false,
      reportsCrossingLocalBoundary: 0,
    });
  });

  it('detects improving trust when the latest local report is stronger than the previous one', async () => {
    const weak = await buildReport({
      analysisQuality: lowQuality,
      id: 'weak-report',
      session: session('weak-session', 'Slab baseline', '2026-06-20T10:00:00.000Z'),
    });
    const strong = await buildReport({
      id: 'strong-report',
      session: session('strong-session', 'Slab repeat', '2026-06-22T10:00:00.000Z'),
    });
    const trend = summarizeAnalysisTrustTrend([strong, weak], { generatedAt: '2026-06-22T15:10:00.000Z' });

    expect(trend.status).toBe('improving');
    expect(trend.latest).toMatchObject({
      decision: 'coach-ready',
      reportId: 'strong-report',
      title: 'Slab repeat',
    });
    expect(trend.previous?.decision).toBe('retake');
    expect(trend.counts.coachReady).toBe(1);
    expect(trend.counts.retake).toBe(1);
    expect(trend.averageScore).toBeGreaterThan(40);
    expect(JSON.stringify(trend)).not.toMatch(/file:\/\/|content:\/\/|ph:\/\/|\/Users\/|token|secret|keyFrame|landmarks/i);
  });

  it('flags degrading trust and local-boundary crossings from the latest report', async () => {
    const strong = await buildReport({
      id: 'strong-report',
      session: session('strong-session', 'Overhang baseline', '2026-06-20T10:00:00.000Z'),
    });
    const unsafeLatest = await buildReport({
      engine: {
        coachLens: {
          key: 'balanced',
          label: 'Balanced',
          summary: 'General movement review across flow, feet, hips, and arm load.',
        },
        cueEngineVersion: 'movebeta-cue-engine-v2.0.0',
        model: 'remote-review',
        processedFrames: samplePoseFrames.length,
        provider: 'local-fixture',
        runsOnDevice: false,
        uploadsVideo: true,
      },
      id: 'unsafe-report',
      privacy: {
        retention: 'Review before sharing.',
        storedArtifacts: ['pose landmarks', 'movement metrics'],
        videoLeavesDevice: true,
      },
      session: session('unsafe-session', 'Overhang remote check', '2026-06-22T10:00:00.000Z'),
    });
    const trend = summarizeAnalysisTrustTrend([unsafeLatest, strong], { generatedAt: '2026-06-22T15:20:00.000Z' });

    expect(trend.status).toBe('degrading');
    expect(trend.latest?.decision).toBe('journal-only');
    expect(trend.counts.journalOnly).toBe(1);
    expect(trend.privacy.localOnly).toBe(false);
    expect(trend.privacy.reportsCrossingLocalBoundary).toBe(1);
    expect(trend.nextAction).toContain('Retake or review');
  });

  it('builds a share-safe packet without report ids, raw media, or private notes', async () => {
    const trend = summarizeAnalysisTrustTrend(
      [
        await buildReport({
          id: 'packet-report',
          session: session('packet-session', 'Compression board repeat', '2026-06-22T10:00:00.000Z'),
        }),
      ],
      { generatedAt: '2026-06-22T15:30:00.000Z' },
    );
    const packet = buildAnalysisTrustTrendPacket(trend, { generatedAt: '2026-06-22T15:31:00.000Z' });

    expect(AnalysisTrustTrendPacketSchema.parse(packet)).toEqual(packet);
    expect(packet.schemaVersion).toBe(analysisTrustTrendPacketSchemaVersion);
    expect(packet.generatedAt).toBe('2026-06-22T15:31:00.000Z');
    expect(packet.trend.latest).toMatchObject({
      decision: 'coach-ready',
      title: 'Compression board repeat',
    });
    expect(packet.privacy).toMatchObject({
      privateNotesIncluded: false,
      rawVideoIncluded: false,
      reportIdsIncluded: false,
      videoUriIncluded: false,
    });
    expect(formatAnalysisTrustTrendPacketSummary(packet)).toContain('Analysis trust trend:');
    expect(JSON.stringify(packet)).not.toMatch(/"reportId"\s*:|"privateNote"\s*:|file:\/\/|content:\/\/|ph:\/\/|\/Users\/|secret-value/i);
  });

  it('rejects trend packets when source titles contain raw local artifacts', async () => {
    const trend = summarizeAnalysisTrustTrend([
      await buildReport({
        id: 'unsafe-title-report',
        session: session('unsafe-title-session', '/Users/athlete/raw-climb.mov', '2026-06-22T10:00:00.000Z'),
      }),
    ]);

    expect(() => buildAnalysisTrustTrendPacket(trend)).toThrow('Analysis trust trend packet contains raw media');
  });
});
