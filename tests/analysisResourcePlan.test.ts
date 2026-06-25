import { describe, expect, it } from 'vitest';

import type { VideoAsset } from '../src/movement/contracts';
import {
  analysisResourcePlanSchemaVersion,
  assertAnalysisResourcePlanIsShareSafe,
  buildAnalysisResourcePlan,
} from '../src/video/analysisResourcePlan';

const baseVideo: VideoAsset = {
  capturedAt: '2026-06-24T12:00:00.000Z',
  durationMs: 12_000,
  height: 1920,
  id: 'local-video',
  source: 'camera',
  uri: 'file://local/session.mov',
  width: 1080,
};

describe('analysis resource plan', () => {
  it('marks a short local clip as ready for local analysis', () => {
    const plan = buildAnalysisResourcePlan({
      generatedAt: '2026-06-24T12:00:00.000Z',
      mode: 'full',
      video: baseVideo,
    });

    expect(plan.schemaVersion).toBe(analysisResourcePlanSchemaVersion);
    expect(plan.summary).toMatchObject({
      activeDurationMs: 12_000,
      estimatedSampledFrames: 35,
      readyForLocalAnalysis: true,
      status: 'ready',
      workloadLevel: 'normal',
    });
    expect(plan.source.analysisWindow.mode).toBe('full');
    expect(plan.privacy).toMatchObject({
      rawVideoIncluded: false,
      videoUriIncluded: false,
    });
    expect(JSON.stringify(plan)).not.toContain(baseVideo.uri);
  });

  it('recommends an active window for long clips when full analysis is selected', () => {
    const plan = buildAnalysisResourcePlan({
      generatedAt: '2026-06-24T12:00:00.000Z',
      mode: 'full',
      video: {
        ...baseVideo,
        durationMs: 80_000,
      },
    });

    expect(plan.summary.status).toBe('review');
    expect(plan.summary.readyForLocalAnalysis).toBe(false);
    expect(plan.summary.workloadLevel).toBe('high');
    expect(plan.steps.find((step) => step.key === 'analysis-window')?.status).toBe('review');
    expect(plan.summary.nextAction).toContain('Use early, middle, or late window');
  });

  it('uses the selected window to keep a long source inside the normal runtime budget', () => {
    const plan = buildAnalysisResourcePlan({
      generatedAt: '2026-06-24T12:00:00.000Z',
      mode: 'middle',
      video: {
        ...baseVideo,
        durationMs: 80_000,
      },
    });

    expect(plan.summary.status).toBe('review');
    expect(plan.source.analysisWindow).toMatchObject({
      durationMs: 45_000,
      mode: 'middle',
      sourceDurationMs: 80_000,
    });
    expect(plan.steps.find((step) => step.key === 'analysis-window')?.status).toBe('ready');
    expect(plan.steps.find((step) => step.key === 'frame-sampling')?.status).toBe('review');
  });

  it('blocks remote video sources before local analysis', () => {
    const plan = buildAnalysisResourcePlan({
      generatedAt: '2026-06-24T12:00:00.000Z',
      mode: 'full',
      video: {
        ...baseVideo,
        source: 'import',
        uri: 'https://example.com/private.mp4',
      },
    });

    expect(plan.summary.status).toBe('blocked');
    expect(plan.summary.readyForLocalAnalysis).toBe(false);
    expect(plan.steps.find((step) => step.key === 'source-locality')?.status).toBe('blocked');
  });

  it('keeps bundled fixture source type serializable', () => {
    const plan = buildAnalysisResourcePlan({
      generatedAt: '2026-06-24T12:00:00.000Z',
      mode: 'full',
      video: {
        ...baseVideo,
        source: 'fixture',
        uri: 'fixture://vertical-sequence',
      },
    });

    expect(plan.source.sourceType).toBe('fixture');
    expect(plan.summary.status).toBe('ready');
  });

  it('flags large decode surfaces for review without blocking analysis', () => {
    const plan = buildAnalysisResourcePlan({
      generatedAt: '2026-06-24T12:00:00.000Z',
      mode: 'full',
      video: {
        ...baseVideo,
        height: 3840,
        width: 2160,
      },
    });

    expect(plan.summary.status).toBe('review');
    expect(plan.steps.find((step) => step.key === 'decode-surface')?.status).toBe('review');
    expect(plan.summary.decodeSurfaceBytes).toBe(33_177_600);
  });

  it('rejects unsafe exported values', () => {
    const plan = buildAnalysisResourcePlan({
      generatedAt: '2026-06-24T12:00:00.000Z',
      mode: 'full',
      video: baseVideo,
    });

    expect(() =>
      assertAnalysisResourcePlanIsShareSafe({
        ...plan,
        steps: plan.steps.map((step, index) =>
          index === 0 ? { ...step, detail: 'Review /Users/antonio/private-session.mov before export.' } : step,
        ),
      }),
    ).toThrow('Analysis resource plan contains credential');
  });
});
