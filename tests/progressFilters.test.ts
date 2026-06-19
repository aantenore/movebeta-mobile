import { describe, expect, it } from 'vitest';

import { localMovementAnalyzer } from '../src/movement/localAnalyzer';
import {
  activeProgressFilterCount,
  defaultProgressFilters,
  deriveProgressFilterOptions,
  filterProgressReports,
} from '../src/movement/progressFilters';
import { sampleAttempts } from '../src/movement/sampleSession';

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

describe('progress filters', () => {
  it('derives wall angle, grade, and gym options from local reports', async () => {
    const reports = await buildSampleReports();
    const options = deriveProgressFilterOptions(reports);

    expect(options.wallAngles).toEqual(['overhang', 'slab', 'vertical']);
    expect(options.grades).toEqual(['5c / V2', '6a / V3', '6c / V5']);
    expect(options.gyms).toEqual(['Indoor board', 'Technique slab', 'Training wall']);
  });

  it('filters local progress history by wall angle, grade, and gym', async () => {
    const reports = await buildSampleReports();
    const filtered = filterProgressReports(reports, {
      grade: '5c / V2',
      gym: 'Technique slab',
      wallAngle: 'slab',
    });

    expect(filtered).toHaveLength(1);
    expect(filtered[0].session.title).toBe('Slab balance drill');
  });

  it('counts active filters while leaving all-history as zero', () => {
    expect(activeProgressFilterCount(defaultProgressFilters)).toBe(0);
    expect(activeProgressFilterCount({ grade: 'all', gym: 'Training wall', wallAngle: 'vertical' })).toBe(2);
  });
});
