import { z } from 'zod';

import {
  CoachLensKeySchema,
  CoachLensMetadataSchema,
  type AnalyzerThresholds,
  type CoachLensKey,
  type CoachLensMetadata,
  type MovementCue,
} from './contracts';

export const CoachLensSchema = z.object({
  betaReplayHint: z.string(),
  cuePriority: z.array(z.string()).min(1),
  drillDosageHint: z.string(),
  metadata: CoachLensMetadataSchema,
  thresholds: z.object({
    footCutVelocity: z.number().positive().optional(),
    hipDrift: z.number().positive().optional(),
    lockOffAngle: z.number().positive().optional(),
    pauseVelocity: z.number().positive().optional(),
  }),
});

export type CoachLens = z.infer<typeof CoachLensSchema>;

export const defaultCoachLenses = CoachLensSchema.array().parse([
  {
    betaReplayHint: 'Keep the repeat plan balanced across setup, crux, and exit.',
    cuePriority: ['cue-lockoff', 'cue-hip', 'cue-pause', 'cue-foot-cut'],
    drillDosageHint: '',
    metadata: {
      key: 'balanced',
      label: 'Balanced',
      summary: 'General movement review across flow, feet, hips, and arm load.',
    },
    thresholds: {},
  },
  {
    betaReplayHint: 'Prioritize quiet feet and one controlled no-cut repeat.',
    cuePriority: ['cue-foot-cut', 'cue-pause', 'cue-hip', 'cue-lockoff'],
    drillDosageHint: 'quiet-feet lens',
    metadata: {
      key: 'footwork',
      label: 'Footwork',
      summary: 'Sensitive to foot cuts, foot planning, and lower-body control.',
    },
    thresholds: {
      footCutVelocity: 0.07,
      pauseVelocity: 0.01,
    },
  },
  {
    betaReplayHint: 'Prioritize hip position before adding power or speed.',
    cuePriority: ['cue-hip', 'cue-foot-cut', 'cue-pause', 'cue-lockoff'],
    drillDosageHint: 'hip-position lens',
    metadata: {
      key: 'body-position',
      label: 'Body position',
      summary: 'Sensitive to hip drift, body line, and rotating into reaches.',
    },
    thresholds: {
      hipDrift: 0.055,
      footCutVelocity: 0.1,
    },
  },
  {
    betaReplayHint: 'Prioritize straight arms and efficient load management.',
    cuePriority: ['cue-lockoff', 'cue-pause', 'cue-hip', 'cue-foot-cut'],
    drillDosageHint: 'power-saving lens',
    metadata: {
      key: 'power-conservation',
      label: 'Power conservation',
      summary: 'Sensitive to bent-arm load, pauses, and energy leaks on repeats.',
    },
    thresholds: {
      lockOffAngle: 124,
      pauseVelocity: 0.014,
    },
  },
]);

const coachLensByKey = new Map(defaultCoachLenses.map((lens) => [lens.metadata.key, lens]));

export function listCoachLenses() {
  return defaultCoachLenses;
}

export function resolveCoachLens(value: unknown): CoachLens {
  if (value && typeof value === 'object' && 'metadata' in value) {
    const parsed = CoachLensSchema.safeParse(value);
    if (parsed.success) return parsed.data;
  }

  const parsedKey = CoachLensKeySchema.safeParse(value);
  if (parsedKey.success) return coachLensByKey.get(parsedKey.data) ?? defaultCoachLenses[0];
  return defaultCoachLenses[0];
}

export function resolveCoachLensKey(value: unknown): CoachLensKey {
  return resolveCoachLens(value).metadata.key;
}

export function coachLensThresholds(value: unknown): Partial<AnalyzerThresholds> {
  return resolveCoachLens(value).thresholds;
}

export function coachLensMetadata(value: unknown): CoachLensMetadata {
  return resolveCoachLens(value).metadata;
}

export function coachLensDrillDosageHint(value: unknown) {
  return resolveCoachLens(value).drillDosageHint;
}

export function sortCuesForCoachLens(cues: MovementCue[], value: unknown) {
  const lens = resolveCoachLens(value);
  const priority = new Map(lens.cuePriority.map((cueId, index) => [cueId, index]));
  const severityWeight = { fix: 0, watch: 1, info: 2 };

  return [...cues].sort(
    (a, b) =>
      (priority.get(a.id) ?? Number.MAX_SAFE_INTEGER) - (priority.get(b.id) ?? Number.MAX_SAFE_INTEGER) ||
      severityWeight[a.severity] - severityWeight[b.severity] ||
      a.timestampMs - b.timestampMs ||
      a.title.localeCompare(b.title),
  );
}
