import { describe, expect, it } from 'vitest';

import {
  assessCaptureCalibration,
  defaultCaptureCalibrationInput,
  type CaptureCalibrationInput,
} from '../src/video/captureCalibration';

function setup(overrides: Partial<CaptureCalibrationInput>) {
  return {
    ...defaultCaptureCalibrationInput,
    ...overrides,
  };
}

describe('capture calibration', () => {
  it('marks ideal recording setup as ready', () => {
    const assessment = assessCaptureCalibration(defaultCaptureCalibrationInput);

    expect(assessment.status).toBe('ready');
    expect(assessment.canRecord).toBe(true);
    expect(assessment.score).toBe(100);
    expect(assessment.checks.every((check) => check.status === 'pass')).toBe(true);
  });

  it('allows usable but imperfect setup with review guidance', () => {
    const assessment = assessCaptureCalibration(
      setup({
        backgroundContrast: 'busy-wall',
        cameraAngle: 'diagonal',
        distanceMeters: 7,
        lighting: 'dim',
        phoneStability: 'handheld-stable',
      }),
    );

    expect(assessment.status).toBe('review');
    expect(assessment.canRecord).toBe(true);
    expect(assessment.score).toBe(50);
    expect(assessment.checks.filter((check) => check.status === 'watch')).toHaveLength(5);
    expect(assessment.advice).toContain('Side-on is preferred; angled clips can still work with less precise technique cues.');
  });

  it('blocks recording when setup would undermine privacy or pose extraction', () => {
    const assessment = assessCaptureCalibration(
      setup({
        bodyFraming: 'cropped-limbs',
        bystanderState: 'visible',
        distanceMeters: 1,
        lighting: 'backlit',
      }),
    );

    expect(assessment.status).toBe('blocked');
    expect(assessment.canRecord).toBe(false);
    expect(assessment.action).toBe('Fix setup blockers before recording.');
    expect(assessment.checks.filter((check) => check.status === 'fail')).toHaveLength(4);
    expect(assessment.advice).toContain('Do not record until visible bystanders are out of frame or consent is handled.');
  });
});
