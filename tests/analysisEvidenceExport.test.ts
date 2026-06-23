import { describe, expect, it } from 'vitest';

import {
  analysisEvidenceExportSchemaVersion,
  AnalysisEvidenceExportSchema,
  buildAnalysisEvidenceExport,
} from '../src/movement/analysisEvidenceExport';
import { attachAnalysisEvidence } from '../src/movement/analysisEvidence';
import { localMovementAnalyzer } from '../src/movement/localAnalyzer';
import { samplePoseFrames, sampleSession } from '../src/movement/sampleSession';

async function buildReport() {
  return localMovementAnalyzer.analyze({
    frames: samplePoseFrames,
    session: sampleSession,
  });
}

describe('analysis evidence export', () => {
  it('builds a versioned evidence-only export without raw artifacts', async () => {
    const report = await buildReport();
    const exportBundle = buildAnalysisEvidenceExport(report, {
      generatedAt: '2026-06-20T13:00:00.000Z',
    });

    expect(AnalysisEvidenceExportSchema.parse(exportBundle)).toEqual(exportBundle);
    expect(exportBundle.schemaVersion).toBe(analysisEvidenceExportSchemaVersion);
    expect(exportBundle.generatedAt).toBe('2026-06-20T13:00:00.000Z');
    expect(exportBundle.report.reportId).toBe(report.id);
    expect(exportBundle.report.coachLens.key).toBe('balanced');
    expect(exportBundle.privacy).toEqual({
      keyFramesIncluded: false,
      landmarksIncluded: false,
      rawVideoIncluded: false,
      videoUriIncluded: false,
    });
    expect(exportBundle.timeline.steps.map((step) => step.id)).toContain('privacy-boundary');
    expect(JSON.stringify(exportBundle)).not.toMatch(/file:\/\/|content:\/\/|ph:\/\/|\/Users\/|secret|token/);
  });

  it('exports analysis-window metadata without raw video references', async () => {
    const baseReport = await buildReport();
    const report = attachAnalysisEvidence({
      ...baseReport,
      engine: {
        ...baseReport.engine,
        analysisWindow: {
          durationMs: 45_000,
          endMs: 75_000,
          mode: 'middle',
          sourceDurationMs: 90_000,
          startMs: 30_000,
        },
      },
    });
    const exportBundle = buildAnalysisEvidenceExport(report);

    expect(exportBundle.report.analysisWindow).toMatchObject({
      durationMs: 45_000,
      mode: 'middle',
      sourceDurationMs: 90_000,
    });
    expect(exportBundle.timeline.steps.find((step) => step.id === 'analysis-window')?.detail).toContain('middle window');
    expect(JSON.stringify(exportBundle)).not.toMatch(/file:\/\/|content:\/\/|ph:\/\/|\/Users\/|secret|token/);
  });

  it('rejects evidence exports that contain local paths or raw artifact keys', async () => {
    const unsafeReport = attachAnalysisEvidence({
      ...(await buildReport()),
      privacy: {
        retention: 'Local path file:///private/raw.mov kept for debugging.',
        storedArtifacts: ['movement metrics', '/Users/athlete/raw.mov'],
        videoLeavesDevice: false,
      },
    });

    expect(() => buildAnalysisEvidenceExport(unsafeReport)).toThrow('Analysis evidence export contains raw artifact');
  });
});
