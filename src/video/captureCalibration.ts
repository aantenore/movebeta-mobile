import { videoAnalysisConfig } from './videoConfig';

export type CameraAngle = 'side-on' | 'diagonal' | 'front';
export type BodyFraming = 'full-body' | 'cropped-limbs' | 'close-up';
export type LightingCondition = 'bright' | 'dim' | 'backlit';
export type BackgroundContrast = 'clear-wall' | 'busy-wall' | 'low-contrast';
export type PhoneStability = 'tripod' | 'handheld-stable' | 'moving';
export type BystanderState = 'clear' | 'nearby' | 'visible';
export type CaptureCalibrationStatus = 'ready' | 'review' | 'blocked';
export type CaptureCalibrationCheckStatus = 'pass' | 'watch' | 'fail';

export type CaptureCalibrationInput = {
  backgroundContrast: BackgroundContrast;
  bodyFraming: BodyFraming;
  bystanderState: BystanderState;
  cameraAngle: CameraAngle;
  distanceMeters: number;
  lighting: LightingCondition;
  phoneStability: PhoneStability;
};

export type CaptureCalibrationCheck = {
  detail: string;
  id: string;
  label: string;
  status: CaptureCalibrationCheckStatus;
  valueLabel: string;
};

export type CaptureCalibrationAssessment = {
  action: string;
  advice: string[];
  canRecord: boolean;
  checks: CaptureCalibrationCheck[];
  score: number;
  status: CaptureCalibrationStatus;
  title: string;
};

export const captureCalibrationOptions = {
  backgroundContrast: ['clear-wall', 'busy-wall', 'low-contrast'] as BackgroundContrast[],
  bodyFraming: ['full-body', 'cropped-limbs', 'close-up'] as BodyFraming[],
  bystanderState: ['clear', 'nearby', 'visible'] as BystanderState[],
  cameraAngle: ['side-on', 'diagonal', 'front'] as CameraAngle[],
  distanceMeters: [1, 4, 8] as number[],
  lighting: ['bright', 'dim', 'backlit'] as LightingCondition[],
  phoneStability: ['tripod', 'handheld-stable', 'moving'] as PhoneStability[],
} as const;

export const defaultCaptureCalibrationInput: CaptureCalibrationInput = {
  backgroundContrast: 'clear-wall',
  bodyFraming: 'full-body',
  bystanderState: 'clear',
  cameraAngle: 'side-on',
  distanceMeters: 4,
  lighting: 'bright',
  phoneStability: 'tripod',
};

function label(value: string) {
  return value
    .split('-')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

function distanceCheck(distanceMeters: number): CaptureCalibrationCheck {
  const { idealDistanceMeters, usableDistanceMeters } = videoAnalysisConfig.captureCalibration;
  const valueLabel = `${distanceMeters.toFixed(distanceMeters % 1 === 0 ? 0 : 1)}m`;

  if (distanceMeters < usableDistanceMeters.min) {
    return {
      detail: 'Move the phone back so hands, hips, knees, and feet stay in frame.',
      id: 'distance',
      label: 'Distance',
      status: 'fail',
      valueLabel,
    };
  }

  if (distanceMeters > usableDistanceMeters.max) {
    return {
      detail: 'Move closer so the local pose model can see wrists, hips, knees, and ankles.',
      id: 'distance',
      label: 'Distance',
      status: 'fail',
      valueLabel,
    };
  }

  if (distanceMeters < idealDistanceMeters.min || distanceMeters > idealDistanceMeters.max) {
    return {
      detail: 'The clip can work, but the ideal range keeps the whole body visible with enough landmark detail.',
      id: 'distance',
      label: 'Distance',
      status: 'watch',
      valueLabel,
    };
  }

  return {
    detail: 'Good distance for full-body local pose extraction.',
    id: 'distance',
    label: 'Distance',
    status: 'pass',
    valueLabel,
  };
}

function optionCheck(
  id: string,
  labelText: string,
  valueLabel: string,
  status: CaptureCalibrationCheckStatus,
  detail: string,
): CaptureCalibrationCheck {
  return {
    detail,
    id,
    label: labelText,
    status,
    valueLabel,
  };
}

function scoreChecks(checks: CaptureCalibrationCheck[]) {
  const penalty = checks.reduce((total, check) => {
    if (check.status === 'fail') return total + 28;
    if (check.status === 'watch') return total + 10;
    return total;
  }, 0);

  return Math.max(0, Math.min(100, 100 - penalty));
}

function uniqueAdvice(checks: CaptureCalibrationCheck[]) {
  return Array.from(
    new Set(
      checks
        .filter((check) => check.status !== 'pass')
        .map((check) => check.detail),
    ),
  );
}

export function assessCaptureCalibration(input: CaptureCalibrationInput): CaptureCalibrationAssessment {
  const checks: CaptureCalibrationCheck[] = [
    optionCheck(
      'framing',
      'Framing',
      label(input.bodyFraming),
      input.bodyFraming === 'full-body' ? 'pass' : 'fail',
      input.bodyFraming === 'full-body'
        ? 'Whole climber should remain visible from setup to finish.'
        : 'Retake setup until the whole climber stays visible, including feet and hands.',
    ),
    optionCheck(
      'angle',
      'View',
      label(input.cameraAngle),
      input.cameraAngle === 'side-on' ? 'pass' : 'watch',
      input.cameraAngle === 'side-on'
        ? 'Side-on framing makes hip drift, lock-off shape, and foot movement easier to score.'
        : 'Side-on is preferred; angled clips can still work with less precise technique cues.',
    ),
    distanceCheck(input.distanceMeters),
    optionCheck(
      'lighting',
      'Light',
      label(input.lighting),
      input.lighting === 'bright' ? 'pass' : input.lighting === 'dim' ? 'watch' : 'fail',
      input.lighting === 'bright'
        ? 'Lighting is strong enough for local landmark detection.'
        : input.lighting === 'dim'
          ? 'Add light if possible; dim clips reduce confidence in wrists and feet.'
          : 'Avoid backlighting because it hides body landmarks from the local pose model.',
    ),
    optionCheck(
      'contrast',
      'Wall contrast',
      label(input.backgroundContrast),
      input.backgroundContrast === 'clear-wall' ? 'pass' : input.backgroundContrast === 'busy-wall' ? 'watch' : 'fail',
      input.backgroundContrast === 'clear-wall'
        ? 'The climber should separate clearly from wall and holds.'
        : input.backgroundContrast === 'busy-wall'
          ? 'Busy walls are usable, but stronger clothing contrast improves the report.'
          : 'Use stronger contrast between climber, wall, and holds before recording.',
    ),
    optionCheck(
      'stability',
      'Phone',
      label(input.phoneStability),
      input.phoneStability === 'tripod' ? 'pass' : input.phoneStability === 'handheld-stable' ? 'watch' : 'fail',
      input.phoneStability === 'tripod'
        ? 'Stable framing keeps the timeline and landmark velocity cleaner.'
        : input.phoneStability === 'handheld-stable'
          ? 'Handheld clips can work, but a fixed phone gives cleaner velocity cues.'
          : 'Use a fixed phone or stable holder before recording.',
    ),
    optionCheck(
      'bystanders',
      'People',
      label(input.bystanderState),
      input.bystanderState === 'clear' ? 'pass' : input.bystanderState === 'nearby' ? 'watch' : 'fail',
      input.bystanderState === 'clear'
        ? 'No visible bystanders in the intended capture.'
        : input.bystanderState === 'nearby'
          ? 'Confirm consent or reframe before saving reports from a gym clip.'
          : 'Do not record until visible bystanders are out of frame or consent is handled.',
    ),
  ];

  const score = scoreChecks(checks);
  const hasFail = checks.some((check) => check.status === 'fail');
  const hasWatch = checks.some((check) => check.status === 'watch');
  const status: CaptureCalibrationStatus = hasFail ? 'blocked' : hasWatch ? 'review' : 'ready';

  return {
    action:
      status === 'blocked'
        ? 'Fix setup blockers before recording.'
        : status === 'review'
          ? 'Recording is allowed, but setup tweaks can improve cue quality.'
          : 'Setup is ready for a local coaching clip.',
    advice: uniqueAdvice(checks),
    canRecord: !hasFail,
    checks,
    score,
    status,
    title: status === 'blocked' ? 'Setup needs attention' : status === 'review' ? 'Setup can improve' : 'Setup ready',
  };
}
