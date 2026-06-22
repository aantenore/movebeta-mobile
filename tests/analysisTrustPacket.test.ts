import { describe, expect, it } from 'vitest';

import { attachAnalysisEvidence } from '../src/movement/analysisEvidence';
import {
  analysisTrustPacketSchemaVersion,
  AnalysisTrustPacketSchema,
  buildAnalysisTrustPacket,
  formatAnalysisTrustPacketSummary,
} from '../src/movement/analysisTrustPacket';
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
        analysisMs: 720,
        budgetMs: 1800,
        budgetStatus: 'within-budget',
        framesPerSecond: 40,
        measuredAt: sampleSession.createdAt,
        ...overrides.performance,
      },
    },
    { generatedAt: sampleSession.createdAt },
  );
}

describe('analysis trust packet', () => {
  it('builds a versioned share-safe packet from the local trust summary', async () => {
    const packet = buildAnalysisTrustPacket(await buildReport(), {
      generatedAt: '2026-06-22T14:00:00.000Z',
    });

    expect(AnalysisTrustPacketSchema.parse(packet)).toEqual(packet);
    expect(packet.schemaVersion).toBe(analysisTrustPacketSchemaVersion);
    expect(packet.generatedAt).toBe('2026-06-22T14:00:00.000Z');
    expect(packet.trust.decision).toBe('coach-ready');
    expect(packet.privacy).toEqual({
      keyFramesIncluded: false,
      landmarksIncluded: false,
      privateNotesIncluded: false,
      rawVideoIncluded: false,
      tokenLikeValuesIncluded: false,
      videoUriIncluded: false,
    });
    expect(formatAnalysisTrustPacketSummary(packet)).toContain('Analysis trust: coach-ready');
    expect(JSON.stringify(packet)).not.toMatch(/file:\/\/|content:\/\/|ph:\/\/|\/Users\/|secret-value|BEGIN PRIVATE KEY/i);
  });

  it('exports retake decisions without raw media or landmark payloads', async () => {
    const packet = buildAnalysisTrustPacket(
      await buildReport({
        analysisQuality: {
          averageVisibility: 0.32,
          frameCoverage: 0.4,
          landmarkCoverage: 0.5,
          score: 41,
          warnings: ['Pose visibility is low.'],
        },
      }),
    );

    expect(packet.trust.decision).toBe('retake');
    expect(packet.trust.blockers.length).toBeGreaterThan(0);
    expect(packet.privacy.rawVideoIncluded).toBe(false);
    expect(JSON.stringify(packet)).not.toMatch(/"landmarks"\s*:|"keyFrame"\s*:|file:\/\/|content:\/\/|ph:\/\//i);
  });

  it('rejects packets when source report metadata contains local paths or raw artifact values', async () => {
    const unsafeReport = await buildReport({
      privacy: {
        retention: 'Video remains local.',
        storedArtifacts: ['pose landmarks', '/Users/athlete/raw.mov'],
        videoLeavesDevice: false,
      },
    });

    expect(() => buildAnalysisTrustPacket(unsafeReport)).toThrow('Analysis trust packet contains raw video');
  });
});
