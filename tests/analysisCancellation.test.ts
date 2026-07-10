import { describe, expect, it } from 'vitest';

import {
  LatestAnalysisRunCoordinator,
  throwIfAnalysisAborted,
} from '../src/movement/analysisCancellation';

describe('analysis cancellation', () => {
  it('invalidates the previous run when a newer run starts', () => {
    const coordinator = new LatestAnalysisRunCoordinator();
    const first = coordinator.start();
    const second = coordinator.start();

    expect(first.signal.aborted).toBe(true);
    expect(first.isCurrent()).toBe(false);
    expect(second.signal.aborted).toBe(false);
    expect(second.isCurrent()).toBe(true);
    expect(() => throwIfAnalysisAborted(first.signal)).toThrow('Analysis was cancelled.');
  });

  it('invalidates the active run when the owner unmounts', () => {
    const coordinator = new LatestAnalysisRunCoordinator();
    const active = coordinator.start();

    coordinator.cancel();

    expect(active.signal.aborted).toBe(true);
    expect(active.isCurrent()).toBe(false);
  });
});
