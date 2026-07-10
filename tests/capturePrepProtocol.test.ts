import { describe, expect, it } from 'vitest';

import { buildCapturePrepProtocol } from '../src/movement/capturePrepProtocol';
import { localMovementAnalyzer } from '../src/movement/localAnalyzer';
import { sampleAttempts } from '../src/movement/sampleSession';
import { assessCaptureCalibration, defaultCaptureCalibrationInput } from '../src/video/captureCalibration';

async function buildReport(index = 0) {
  const attempt = sampleAttempts[index];
  return localMovementAnalyzer.analyze({
    frames: attempt.frames,
    session: attempt.session,
  });
}

describe('capture prep protocol', () => {
  it('creates a baseline protocol before any prior analysis exists', () => {
    const protocol = buildCapturePrepProtocol({
      calibration: assessCaptureCalibration(defaultCaptureCalibrationInput),
      session: sampleAttempts[0].session,
    });

    expect(protocol.status).toBe('ready');
    expect(protocol.canRecord).toBe(true);
    expect(protocol.title).toBe('Protocol ready');
    expect(protocol.focus).toBe(sampleAttempts[0].session.title);
    expect(protocol.phases.map((phase) => phase.kind)).toEqual(['setup', 'warmup', 'record', 'verify']);
    expect(protocol.retakeCriteria).toContain('Keep the same camera angle for comparable repeat analysis.');
    expect(protocol.privacyNote).toContain('Raw video stays on device');
  });

  it('uses local report cues and weakest metric to focus the next capture', async () => {
    const report = await buildReport();
    const protocol = buildCapturePrepProtocol({
      calibration: assessCaptureCalibration(defaultCaptureCalibrationInput),
      report,
      session: report.session,
    });

    expect(protocol.status).toBe('ready');
    const expectedPrimaryCue = [...report.cues]
      .filter((cue) => cue.severity === 'fix')
      .sort((a, b) => a.timestampMs - b.timestampMs)[0];
    expect(protocol.focus).toBe(expectedPrimaryCue?.title);
    expect(protocol.phases.find((phase) => phase.id === 'prep-evidence-warmup')?.evidence).toContain('Elbow-flexion time');
    expect(protocol.phases.find((phase) => phase.id === 'prep-record')?.instruction).toContain(report.session.wallAngle);
    expect(protocol.totalMinutes).toBe(15);
  });

  it('blocks recording when setup calibration fails privacy or pose extraction checks', async () => {
    const report = await buildReport();
    const protocol = buildCapturePrepProtocol({
      calibration: assessCaptureCalibration({
        ...defaultCaptureCalibrationInput,
        bodyFraming: 'cropped-limbs',
        bystanderState: 'visible',
      }),
      report,
      session: report.session,
    });

    expect(protocol.status).toBe('blocked');
    expect(protocol.canRecord).toBe(false);
    expect(protocol.title).toBe('Setup blocked');
    expect(protocol.phases[0].title).toBe('Fix setup blockers');
    expect(protocol.retakeCriteria.join(' ')).toContain('visible bystanders');
  });

  it('switches to review mode when the prior analysis quality needs retake guidance', async () => {
    const report = await buildReport();
    const weakReport = {
      ...report,
      analysisQuality: {
        averageVisibility: 0.38,
        frameCoverage: 0.46,
        landmarkCoverage: 0.52,
        score: 49,
        warnings: ['Synthetic weak signal for protocol test.'],
      },
    };
    const protocol = buildCapturePrepProtocol({
      calibration: assessCaptureCalibration(defaultCaptureCalibrationInput),
      report: weakReport,
      session: weakReport.session,
    });

    expect(protocol.status).toBe('review');
    expect(protocol.phases.find((phase) => phase.id === 'prep-record')?.title).toBe('Retake comparable clip');
    expect(protocol.retakeCriteria.join(' ')).toContain('Use brighter, even light');
  });
});
