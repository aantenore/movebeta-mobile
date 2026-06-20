import { z } from 'zod';

import type { LocalAnalysisReport, MovementCue, MovementMetric, TimelineEvent } from './contracts';
import { resolveCoachLens, sortCuesForCoachLens } from './coachLens';

export const BetaReplayStepSchema = z.object({
  action: z.string(),
  cueId: z.string().optional(),
  evidence: z.string(),
  id: z.string(),
  phase: z.enum(['setup', 'crux', 'exit']),
  timestampMs: z.number().nonnegative(),
  title: z.string(),
});

export const BetaReplayPlanSchema = z.object({
  focusCueIds: z.array(z.string()),
  primaryFocus: z.string(),
  steps: z.array(BetaReplayStepSchema).min(3).max(3),
  summary: z.string(),
});

export type BetaReplayStep = z.infer<typeof BetaReplayStepSchema>;
export type BetaReplayPlan = z.infer<typeof BetaReplayPlanSchema>;

function lowestMetric(metrics: MovementMetric[]) {
  return [...metrics].sort((a, b) => a.score - b.score)[0];
}

function firstEvent(timeline: TimelineEvent[], type: TimelineEvent['type']) {
  return timeline.find((event) => event.type === type);
}

function metricEvidence(metric?: MovementMetric) {
  if (!metric) return 'No weak metric is dominant in this attempt.';
  return `${metric.label}: ${metric.value}${metric.unit === '/100' ? '/100' : ` ${metric.unit}`}`;
}

function setupStep(report: LocalAnalysisReport, primaryCue?: MovementCue, weakestMetric?: MovementMetric): BetaReplayStep {
  const hipCue = report.cues.find((cue) => cue.id === 'cue-hip');
  const pauseCue = report.cues.find((cue) => cue.id === 'cue-pause');
  const cue = hipCue ?? pauseCue ?? primaryCue;

  return {
    action: hipCue
      ? 'Start the repeat by bringing the inside hip in before the first long reach.'
      : pauseCue
        ? 'Name the next two feet before leaving the start position.'
        : 'Set the first feet and keep the climber framed before starting the repeat.',
    cueId: cue?.id,
    evidence: cue ? cue.title : metricEvidence(weakestMetric),
    id: 'beta-setup',
    phase: 'setup',
    timestampMs: cue?.timestampMs ?? report.timeline[0]?.timestampMs ?? 0,
    title: hipCue ? 'Prime the hip position' : pauseCue ? 'Preload the foot sequence' : 'Set the repeat intention',
  };
}

function cruxStep(report: LocalAnalysisReport, primaryCue?: MovementCue, weakestMetric?: MovementMetric): BetaReplayStep {
  const event = firstEvent(report.timeline, 'pause') ?? firstEvent(report.timeline, 'lock-off') ?? report.timeline[0];

  return {
    action: primaryCue
      ? primaryCue.body
      : 'Repeat the cleanest movement window with the same rhythm and avoid adding extra pauses.',
    cueId: primaryCue?.id,
    evidence: primaryCue ? primaryCue.drill : metricEvidence(weakestMetric),
    id: 'beta-crux',
    phase: 'crux',
    timestampMs: primaryCue?.timestampMs ?? event?.timestampMs ?? report.keyFrame.timestampMs,
    title: primaryCue?.title ?? 'Hold the smooth sequence',
  };
}

function exitStep(report: LocalAnalysisReport, primaryCue?: MovementCue, weakestMetric?: MovementMetric): BetaReplayStep {
  const footCue = report.cues.find((cue) => cue.id === 'cue-foot-cut');
  const lockCue = report.cues.find((cue) => cue.id === 'cue-lockoff');
  const cue = footCue ?? lockCue ?? primaryCue;
  const lastEvent = report.timeline[report.timeline.length - 1];

  return {
    action: footCue
      ? 'Finish the repeat by keeping pressure through both feet for one extra beat after the reach.'
      : lockCue
        ? 'Exit the crux by straightening the arms before adding the next hand move.'
        : 'After the key move, repeat once more and keep the same tempo through the finish.',
    cueId: cue?.id,
    evidence: cue ? cue.drill : metricEvidence(weakestMetric),
    id: 'beta-exit',
    phase: 'exit',
    timestampMs: cue?.timestampMs ?? lastEvent?.timestampMs ?? report.keyFrame.timestampMs,
    title: footCue ? 'Keep the feet engaged' : lockCue ? 'Exit with straight arms' : 'Lock in the repeat',
  };
}

export function buildBetaReplayPlan(report: LocalAnalysisReport): BetaReplayPlan {
  const lens = resolveCoachLens(report.engine.coachLens.key);
  const sortedCues = sortCuesForCoachLens(report.cues, lens.metadata.key);
  const primaryCue = sortedCues[0];
  const weakestMetric = lowestMetric(report.metrics);
  const steps = [
    setupStep(report, primaryCue, weakestMetric),
    cruxStep(report, primaryCue, weakestMetric),
    exitStep(report, primaryCue, weakestMetric),
  ].sort((a, b) => a.timestampMs - b.timestampMs || a.id.localeCompare(b.id));
  const focusCueIds = sortedCues.slice(0, 3).map((cue) => cue.id);
  const primaryFocus = primaryCue?.title ?? weakestMetric?.label ?? 'Repeat quality';

  return BetaReplayPlanSchema.parse({
    focusCueIds,
    primaryFocus,
    steps,
    summary: primaryCue
      ? `${lens.betaReplayHint} Repeat this attempt around ${primaryCue.title.toLowerCase()} before adding volume.`
      : `${lens.betaReplayHint} Repeat this attempt around ${primaryFocus.toLowerCase()} and keep the same local video setup.`,
  });
}
