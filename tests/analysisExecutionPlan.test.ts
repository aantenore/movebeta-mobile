import { describe, expect, it } from 'vitest';

import {
  analysisExecutionPlanSchemaVersion,
  assertAnalysisExecutionPlanIsShareSafe,
  buildAnalysisExecutionPlan,
} from '../src/core/analysisExecutionPlan';
import { buildPwaAnalysisPreflight } from '../src/core/pwaAnalysisPreflight';
import { buildPwaRuntimeReadiness, type PwaRuntimeProbe } from '../src/core/pwaRuntimeReadiness';
import type { VideoAsset } from '../src/movement/contracts';
import { buildAnalysisResourcePlan } from '../src/video/analysisResourcePlan';
import { buildClipTriagePlan } from '../src/video/clipTriage';
import { assessVideoIntake } from '../src/video/videoIntake';

const baseVideo: VideoAsset = {
  capturedAt: '2026-06-25T08:00:00.000Z',
  durationMs: 12_000,
  height: 1920,
  id: 'local-video',
  source: 'camera',
  uri: 'file://local/session.mov',
  width: 1080,
};

const readyProbe: PwaRuntimeProbe = {
  cacheApiSupported: true,
  installPromptAvailable: false,
  installedStandalone: true,
  modelCache: {
    bytesCached: 6_000_000,
    cachedCount: 3,
    expectedCount: 3,
    integritySupported: true,
    integrityVerified: true,
    manifestCached: true,
    verifiedCount: 3,
  },
  online: false,
  runtime: 'web',
  serviceWorkerControlled: true,
  serviceWorkerRegistered: true,
  serviceWorkerSupported: true,
  updateAvailable: false,
};

function planFor({
  generatedAt = '2026-06-25T08:00:00.000Z',
  hasLocalVideo = true,
  online = readyProbe.online,
  probe = readyProbe,
  video = baseVideo,
}: {
  generatedAt?: string;
  hasLocalVideo?: boolean;
  online?: boolean;
  probe?: PwaRuntimeProbe;
  video?: VideoAsset;
} = {}) {
  const intake = assessVideoIntake(video);
  const triage = buildClipTriagePlan(video, intake);
  const resourcePlan = buildAnalysisResourcePlan({ generatedAt, mode: 'full', video });
  const modelPreflight = buildPwaAnalysisPreflight({
    hasLocalVideo,
    online,
    readiness: buildPwaRuntimeReadiness({ ...probe, online }),
  });

  return buildAnalysisExecutionPlan({
    generatedAt,
    intake,
    modelPreflight,
    resourcePlan,
    triage,
  });
}

describe('analysis execution plan', () => {
  it('marks local analysis ready when intake, cache, and resources are ready', () => {
    const plan = planFor();

    expect(plan.schemaVersion).toBe(analysisExecutionPlanSchemaVersion);
    expect(plan.summary).toMatchObject({
      actionCount: 0,
      blockedCount: 0,
      canStartAnalysis: true,
      reviewCount: 0,
      shouldWarmModel: false,
      status: 'ready',
    });
    expect(plan.steps.map((step) => step.key)).toEqual([
      'clip-intake',
      'clip-triage',
      'model-readiness',
      'resource-budget',
      'privacy-boundary',
    ]);
    expect(JSON.stringify(plan)).not.toContain(baseVideo.uri);
  });

  it('requires model warmup for online uncached real-video analysis', () => {
    const uncachedProbe: PwaRuntimeProbe = {
      ...readyProbe,
      installedStandalone: false,
      modelCache: {
        bytesCached: 0,
        cachedCount: 0,
        expectedCount: 3,
        manifestCached: false,
      },
      online: true,
    };

    const plan = planFor({ online: true, probe: uncachedProbe });

    expect(plan.summary.status).toBe('warmup-required');
    expect(plan.summary.canStartAnalysis).toBe(true);
    expect(plan.summary.shouldWarmModel).toBe(true);
    expect(plan.steps.find((step) => step.key === 'model-readiness')?.status).toBe('action');
    expect(plan.summary.nextAction).toContain('Analyze will warm the model cache first');
  });

  it('blocks offline uncached real-video analysis', () => {
    const uncachedProbe: PwaRuntimeProbe = {
      ...readyProbe,
      installedStandalone: true,
      modelCache: {
        bytesCached: 0,
        cachedCount: 0,
        expectedCount: 3,
        manifestCached: false,
      },
      online: false,
    };

    const plan = planFor({ online: false, probe: uncachedProbe });

    expect(plan.summary.status).toBe('blocked');
    expect(plan.summary.canStartAnalysis).toBe(false);
    expect(plan.summary.blockedCount).toBe(1);
    expect(plan.steps.find((step) => step.key === 'model-readiness')?.status).toBe('blocked');
  });

  it('keeps retake or trim recommendations as review when analysis can still start', () => {
    const plan = planFor({
      video: {
        ...baseVideo,
        durationMs: 60_000,
      },
    });

    expect(plan.summary.status).toBe('review');
    expect(plan.summary.canStartAnalysis).toBe(true);
    expect(plan.summary.reviewCount).toBeGreaterThan(0);
    expect(plan.steps.find((step) => step.key === 'clip-triage')?.status).toBe('review');
  });

  it('rejects unsafe exported execution values', () => {
    const plan = planFor();

    expect(() =>
      assertAnalysisExecutionPlanIsShareSafe({
        ...plan,
        steps: plan.steps.map((step, index) =>
          index === 0 ? { ...step, detail: 'Review file:///private/session.mp4 before sharing.' } : step,
        ),
      }),
    ).toThrow('Analysis execution plan contains credential');
  });
});
