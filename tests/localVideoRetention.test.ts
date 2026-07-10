import { beforeEach, describe, expect, it, vi } from 'vitest';

const deleteAsync = vi.fn();

vi.mock('expo-file-system/legacy', () => ({ deleteAsync }));

import { removeOwnedCameraVideo } from '../src/video/localVideoRetention';
import { sampleVideoAsset } from '../src/movement/sampleSession';

describe('local camera video retention', () => {
  beforeEach(() => {
    deleteAsync.mockReset();
    deleteAsync.mockResolvedValue(undefined);
  });

  it('removes camera-owned cache files idempotently', async () => {
    const removed = await removeOwnedCameraVideo({
      ...sampleVideoAsset,
      source: 'camera',
      uri: 'file:///cache/movebeta-attempt.mp4',
    });

    expect(removed).toBe(true);
    expect(deleteAsync).toHaveBeenCalledWith('file:///cache/movebeta-attempt.mp4', { idempotent: true });
  });

  it('never removes a user-selected imported video', async () => {
    const removed = await removeOwnedCameraVideo({
      ...sampleVideoAsset,
      source: 'import',
      uri: 'file:///library/user-video.mp4',
    });

    expect(removed).toBe(false);
    expect(deleteAsync).not.toHaveBeenCalled();
  });
});
