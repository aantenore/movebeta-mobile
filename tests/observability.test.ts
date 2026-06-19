import { describe, expect, it } from 'vitest';

import {
  assertDiagnosticPacketIsPrivacySafe,
  buildDiagnosticSupportPacket,
  createDiagnosticEvent,
  sanitizeDiagnostics,
} from '../src/core/observability';

describe('privacy-preserving observability', () => {
  it('redacts raw video, landmark, URI, and secret-like diagnostic context', () => {
    const context = sanitizeDiagnostics({
      analysisProvider: 'local-fixture',
      landmarks: [{ x: 0.4, y: 0.2 }],
      token: 'secret-token',
      videoUri: 'file:///private/video.mov',
    });

    expect(context.analysisProvider).toBe('local-fixture');
    expect(context.landmarks).toBe('[redacted]');
    expect(context.token).toBe('[redacted]');
    expect(context.videoUri).toBe('[redacted]');
  });

  it('creates schema-valid diagnostic events with release tags', () => {
    const event = createDiagnosticEvent({
      context: { provider: 'local-fixture' },
      message: 'Local analysis completed',
      name: 'analysis.completed',
      release: '1.0.0',
    });

    expect(event.release).toBe('1.0.0');
    expect(event.severity).toBe('info');
    expect(event.context.provider).toBe('local-fixture');
  });

  it('builds aggregate support packets without raw video, URI, landmarks, or secrets', () => {
    const packet = buildDiagnosticSupportPacket({
      activePlan: 'free',
      analysisProvider: 'local-fixture',
      cloudSync: false,
      diagnosticsExport: true,
      events: [
        createDiagnosticEvent({
          context: {
            provider: 'local-fixture',
            token: 'secret-token',
            videoUri: 'file:///private/raw-video.mov',
          },
          message: 'Local analysis completed',
          name: 'analysis.completed',
          release: '1.0.0',
        }),
      ],
      privacyMode: 'on-device',
      rawVideoExport: false,
      release: '1.0.0',
      reportSnapshots: [
        {
          analysisMs: 2500,
          budgetStatus: 'within-budget',
          framesPerSecond: 14,
          processedFrames: 35,
          provider: 'local-fixture',
          qualityScore: 98,
          storedArtifacts: ['pose landmarks', 'movement metrics'],
          videoLeavesDevice: false,
          warningCount: 0,
        },
        {
          analysisMs: 28000,
          budgetStatus: 'over-budget',
          framesPerSecond: 0.8,
          processedFrames: 22,
          provider: 'web-tfjs-movenet',
          qualityScore: 76,
          storedArtifacts: ['pose landmarks', 'movement metrics'],
          videoLeavesDevice: false,
          warningCount: 2,
        },
      ],
      videoAnalysisProvider: 'web-tfjs-movenet',
    });

    expect(assertDiagnosticPacketIsPrivacySafe(packet)).toEqual(packet);
    expect(packet.history.reportCount).toBe(2);
    expect(packet.history.averageQuality).toBe(87);
    expect(packet.history.localOnlyReports).toBe(2);
    expect(packet.history.overBudgetReports).toBe(1);
    expect(packet.events[0].context.videoUri).toBe('[redacted]');
    expect(JSON.stringify(packet)).not.toContain('file:///private/raw-video.mov');
    expect(JSON.stringify(packet)).not.toContain('secret-token');
  });
});
