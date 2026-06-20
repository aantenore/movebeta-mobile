import { describe, expect, it } from 'vitest';

import type { MovementCue } from '../src/movement/contracts';
import {
  coachLensMetadata,
  coachLensThresholds,
  listCoachLenses,
  resolveCoachLensKey,
  sortCuesForCoachLens,
} from '../src/movement/coachLens';

const cues: MovementCue[] = [
  {
    body: 'Loaded arms.',
    drill: 'Straight-arm hover.',
    id: 'cue-lockoff',
    severity: 'fix',
    timestampMs: 4000,
    title: 'Reduce bent-arm time',
  },
  {
    body: 'Feet move after the reach.',
    drill: 'No-cut repeat.',
    id: 'cue-foot-cut',
    severity: 'watch',
    timestampMs: 5000,
    title: 'Keep feet engaged after the reach',
  },
  {
    body: 'Hip drifts out.',
    drill: 'Hip-to-wall touches.',
    id: 'cue-hip',
    severity: 'fix',
    timestampMs: 6000,
    title: 'Move from the hips',
  },
];

describe('coach lenses', () => {
  it('exposes the supported configurable lenses', () => {
    expect(listCoachLenses().map((lens) => lens.metadata.key)).toEqual([
      'balanced',
      'footwork',
      'body-position',
      'power-conservation',
    ]);
  });

  it('normalizes unknown lens config back to balanced', () => {
    expect(resolveCoachLensKey('footwork')).toBe('footwork');
    expect(resolveCoachLensKey('unknown')).toBe('balanced');
    expect(coachLensMetadata('body-position')).toMatchObject({
      key: 'body-position',
      label: 'Body position',
    });
  });

  it('keeps threshold overrides isolated to the selected lens', () => {
    expect(coachLensThresholds('balanced')).toEqual({});
    expect(coachLensThresholds('footwork')).toMatchObject({
      footCutVelocity: 0.07,
      pauseVelocity: 0.01,
    });
  });

  it('sorts cue priority through the selected lens without changing cue payloads', () => {
    expect(sortCuesForCoachLens(cues, 'balanced').map((cue) => cue.id)).toEqual([
      'cue-lockoff',
      'cue-hip',
      'cue-foot-cut',
    ]);
    expect(sortCuesForCoachLens(cues, 'footwork').map((cue) => cue.id)).toEqual([
      'cue-foot-cut',
      'cue-hip',
      'cue-lockoff',
    ]);
  });
});
