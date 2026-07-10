import { describe, expect, it, vi } from 'vitest';

import { createRetryableLoader } from '../src/movement/webTfjsPoseEstimator';

describe('retryable MoveNet loader', () => {
  it('deduplicates concurrent loads and retries after a rejected attempt', async () => {
    const loader = createRetryableLoader<number>();
    const firstFactory = vi.fn(async () => {
      throw new Error('model unavailable');
    });

    const first = loader.load(firstFactory);
    const concurrent = loader.load(firstFactory);
    expect(concurrent).toBe(first);
    await expect(first).rejects.toThrow('model unavailable');
    expect(firstFactory).toHaveBeenCalledTimes(1);

    const secondFactory = vi.fn(async () => 42);
    await expect(loader.load(secondFactory)).resolves.toBe(42);
    expect(secondFactory).toHaveBeenCalledTimes(1);
  });

  it('disposes a resolved resource when reset is requested during loading', async () => {
    const loader = createRetryableLoader<{ dispose: () => void }>();
    const dispose = vi.fn();
    const pending = loader.load(async () => ({ dispose }));

    loader.reset((resource) => resource.dispose());
    await pending;
    await Promise.resolve();

    expect(dispose).toHaveBeenCalledTimes(1);
  });
});
