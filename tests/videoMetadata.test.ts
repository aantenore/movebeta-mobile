import { describe, expect, it } from 'vitest';

import { readLocalVideoMetadata } from '../src/video/videoMetadata';

describe('video metadata', () => {
  it('uses native metadata when the custom module can read the selected file', async () => {
    const metadata = await readLocalVideoMetadata(
      {
        durationMs: 8_000,
        height: 1080,
        uri: 'file:///cache/movebeta/native.mov',
        width: 1920,
      },
      {
        native: async () => ({
          durationMs: 12_250,
          height: 1920,
          width: 1080,
        }),
      },
    );

    expect(metadata).toMatchObject({
      durationMs: 12_250,
      height: 1920,
      source: 'native',
      width: 1080,
    });
    expect(metadata.warnings).toEqual([]);
  });

  it('falls back to browser metadata and keeps native read warnings', async () => {
    const metadata = await readLocalVideoMetadata(
      {
        uri: 'blob:http://localhost/video',
      },
      {
        browser: async () => ({
          durationMs: 9_500,
          height: 1280,
          width: 720,
        }),
        native: async () => {
          throw new Error('Native module unavailable.');
        },
      },
    );

    expect(metadata.source).toBe('browser');
    expect(metadata.durationMs).toBe(9_500);
    expect(metadata.width).toBe(720);
    expect(metadata.warnings).toEqual(['Native module unavailable.']);
  });

  it('uses input values and configured defaults when metadata cannot be read', async () => {
    const metadata = await readLocalVideoMetadata(
      {
        durationMs: 7_500,
        uri: 'file:///cache/movebeta/fallback.mov',
      },
      {
        browser: async () => null,
        native: async () => null,
      },
    );

    expect(metadata.source).toBe('fallback');
    expect(metadata.durationMs).toBe(7_500);
    expect(metadata.width).toBe(1080);
    expect(metadata.height).toBe(1920);
  });
});
