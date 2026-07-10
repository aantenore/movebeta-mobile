import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const deleteAsync = vi.fn();

vi.mock('expo-file-system/legacy', () => ({ deleteAsync }));

import {
  cleanupOwnedCameraVideos,
  listOwnedCameraVideos,
  registerOwnedCameraVideo,
  removeOwnedCameraVideo,
} from '../src/video/localVideoRetention';
import { sampleVideoAsset } from '../src/movement/sampleSession';

describe('local camera video retention', () => {
  beforeEach(() => {
    const store = new Map<string, string>();
    Object.defineProperty(globalThis, 'localStorage', {
      configurable: true,
      value: {
        getItem: (key: string) => store.get(key) ?? null,
        removeItem: (key: string) => store.delete(key),
        setItem: (key: string, value: string) => store.set(key, value),
      },
    });
    deleteAsync.mockReset();
    deleteAsync.mockResolvedValue(undefined);
  });

  afterEach(() => {
    Reflect.deleteProperty(globalThis, 'localStorage');
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

  it('registers camera files and removes crash leftovers during startup cleanup', async () => {
    registerOwnedCameraVideo('file:///cache/first.mp4');
    registerOwnedCameraVideo('file:///cache/second.mp4');

    const result = await cleanupOwnedCameraVideos();

    expect(result).toEqual({ failed: 0, removed: 2 });
    expect(deleteAsync).toHaveBeenCalledTimes(2);
    expect(listOwnedCameraVideos()).toEqual([]);
  });
});
