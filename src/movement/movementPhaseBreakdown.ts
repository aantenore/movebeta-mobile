import { z } from 'zod';

import type { LocalAnalysisReport, MovementCue, TimelineEvent } from './contracts';

export const MovementPhaseStatusSchema = z.enum(['smooth', 'review', 'reset']);

export const MovementPhaseSchema = z.object({
  action: z.string(),
  cueIds: z.array(z.string()),
  endMs: z.number().nonnegative(),
  evidence: z.string(),
  id: z.enum(['launch', 'crux', 'finish']),
  score: z.number().min(0).max(100),
  startMs: z.number().nonnegative(),
  status: MovementPhaseStatusSchema,
  title: z.string(),
});

export const MovementPhaseBreakdownSchema = z.object({
  phases: z.array(MovementPhaseSchema).length(3),
  primaryPhaseId: MovementPhaseSchema.shape.id,
  summary: z.string(),
});

export type MovementPhase = z.infer<typeof MovementPhaseSchema>;
export type MovementPhaseBreakdown = z.infer<typeof MovementPhaseBreakdownSchema>;

const phaseDefinitions = [
  {
    fallbackAction: 'Start the repeat with a clear first-foot plan and keep the same capture angle.',
    id: 'launch' as const,
    title: 'Launch',
  },
  {
    fallbackAction: 'Repeat the hardest move at lower intensity until the rhythm stays predictable.',
    id: 'crux' as const,
    title: 'Crux',
  },
  {
    fallbackAction: 'Finish the repeat without adding speed after the key move.',
    id: 'finish' as const,
    title: 'Finish',
  },
];

function clampScore(score: number) {
  return Math.max(0, Math.min(100, Math.round(score)));
}

function statusFromScore(score: number): MovementPhase['status'] {
  if (score >= 82) return 'smooth';
  if (score >= 62) return 'review';
  return 'reset';
}

function cuePenalty(cue: MovementCue) {
  if (cue.severity === 'fix') return 26;
  if (cue.severity === 'watch') return 16;
  return 8;
}

function eventPenalty(event: TimelineEvent) {
  if (event.type === 'foot-cut') return 22;
  if (event.type === 'lock-off') return 16;
  if (event.type === 'pause') return 12;
  return 0;
}

function inRange(timestampMs: number, startMs: number, endMs: number, isLast: boolean) {
  return timestampMs >= startMs && (isLast ? timestampMs <= endMs : timestampMs < endMs);
}

function evidenceFor(cues: MovementCue[], events: TimelineEvent[]) {
  const cue = cues[0];
  if (cue) return cue.title;
  const event = events[0];
  if (event) return event.label;
  return 'No disruptive cue or timeline event detected in this phase.';
}

function actionFor(cues: MovementCue[], fallback: string) {
  const cue = cues[0];
  return cue ? cue.drill : fallback;
}

function summaryFor(phases: MovementPhase[], primary: MovementPhase) {
  const resetCount = phases.filter((phase) => phase.status === 'reset').length;
  if (resetCount > 0) return `${primary.title} needs the first reset before adding intensity.`;
  const reviewCount = phases.filter((phase) => phase.status === 'review').length;
  if (reviewCount > 0) return `${primary.title} is the phase to rehearse before the next filmed attempt.`;
  return 'All three movement phases are smooth enough for one controlled repeat.';
}

export function buildMovementPhaseBreakdown(report: LocalAnalysisReport): MovementPhaseBreakdown {
  const durationMs = report.session.durationMs;
  const bounds = [0, durationMs * 0.34, durationMs * 0.72, durationMs];
  const qualityPenalty = Math.max(0, 82 - report.analysisQuality.score) * 0.6;
  const phases = phaseDefinitions.map((definition, index) => {
    const startMs = Math.round(bounds[index]);
    const endMs = Math.round(bounds[index + 1]);
    const isLast = index === phaseDefinitions.length - 1;
    const cues = report.cues.filter((cue) => inRange(cue.timestampMs, startMs, endMs, isLast));
    const events = report.timeline.filter((event) => inRange(event.timestampMs, startMs, endMs, isLast));
    const penalties = cues.reduce((sum, cue) => sum + cuePenalty(cue), 0) + events.reduce((sum, event) => sum + eventPenalty(event), 0);
    const score = clampScore(100 - penalties - qualityPenalty);

    return MovementPhaseSchema.parse({
      action: actionFor(cues, definition.fallbackAction),
      cueIds: cues.map((cue) => cue.id),
      endMs,
      evidence: evidenceFor(cues, events),
      id: definition.id,
      score,
      startMs,
      status: statusFromScore(score),
      title: definition.title,
    });
  });
  const primary = [...phases].sort((a, b) => a.score - b.score || a.startMs - b.startMs)[0];

  return MovementPhaseBreakdownSchema.parse({
    phases,
    primaryPhaseId: primary.id,
    summary: summaryFor(phases, primary),
  });
}
