import { describe, expect, it } from 'vitest';

import { buildProviderReadinessSummary } from '../src/core/providerReadiness';

describe('provider readiness summary', () => {
  it('marks the configured web MoveNet path as review until native device proof is collected', () => {
    const summary = buildProviderReadinessSummary({
      nativeVideoAnalysisProvider: 'native-platform-pose',
      privacyMode: 'on-device',
      videoAnalysisProvider: 'web-tfjs-movenet',
    });

    expect(summary.status).toBe('review');
    expect(summary.title).toBe('Provider path needs device proof');
    expect(summary.primaryProvider).toBe('web-tfjs-movenet');
    expect(summary.fallbackProvider).toBe('local-video-fallback');
    expect(summary.nativeProvider).toBe('native-platform-pose');
    expect(summary.checks.map((check) => [check.id, check.status])).toEqual([
      ['primary-provider', 'ready'],
      ['fallback-provider', 'ready'],
      ['privacy-boundary', 'ready'],
      ['native-provider', 'review'],
    ]);
    expect(JSON.stringify(summary)).not.toMatch(/api key|secret|token|raw video/i);
  });

  it('keeps native platform provider in review until a custom build and physical QA prove it', () => {
    const summary = buildProviderReadinessSummary(
      {
        nativeVideoAnalysisProvider: 'native-platform-pose',
        privacyMode: 'on-device',
        videoAnalysisProvider: 'native-platform-pose',
      },
      'native',
    );

    expect(summary.status).toBe('review');
    expect(summary.checks.find((check) => check.id === 'primary-provider')).toMatchObject({
      status: 'review',
    });
    expect(summary.action).toContain('physical devices');
  });

  it('blocks reserved provider selections before release validation', () => {
    const summary = buildProviderReadinessSummary(
      {
        nativeVideoAnalysisProvider: 'native-coreml',
        privacyMode: 'on-device',
        videoAnalysisProvider: 'native-coreml',
      },
      'native',
    );

    expect(summary.status).toBe('blocked');
    expect(summary.title).toBe('Provider path blocked');
    expect(summary.checks.filter((check) => check.status === 'blocked').map((check) => check.id)).toEqual([
      'primary-provider',
      'native-provider',
    ]);
  });
});
