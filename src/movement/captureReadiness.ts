import type { AnalysisQuality } from './contracts';

export type CaptureReadinessStatus = 'ready' | 'review' | 'retake';
export type CaptureCheckStatus = 'pass' | 'watch' | 'fail';

export type CaptureReadinessThresholds = {
  readyScore: number;
  reviewScore: number;
  minFrameCoverage: number;
  minLandmarkCoverage: number;
  minVisibility: number;
};

export type CaptureReadinessCheck = {
  detail: string;
  id: string;
  label: string;
  status: CaptureCheckStatus;
  valueLabel: string;
};

export type CaptureReadiness = {
  action: string;
  advice: string[];
  checks: CaptureReadinessCheck[];
  status: CaptureReadinessStatus;
  title: string;
};

export const defaultCaptureReadinessThresholds: CaptureReadinessThresholds = {
  minFrameCoverage: 0.7,
  minLandmarkCoverage: 0.9,
  minVisibility: 0.65,
  readyScore: 88,
  reviewScore: 72,
};

function percent(value: number) {
  return `${Math.round(value * 100)}%`;
}

function checkStatus(value: number, minimum: number): CaptureCheckStatus {
  if (value >= minimum) return 'pass';
  if (value >= minimum * 0.82) return 'watch';
  return 'fail';
}

function summarizeStatus(quality: AnalysisQuality, thresholds: CaptureReadinessThresholds): CaptureReadinessStatus {
  const hasFailedCheck =
    quality.frameCoverage < thresholds.minFrameCoverage * 0.82 ||
    quality.landmarkCoverage < thresholds.minLandmarkCoverage * 0.82 ||
    quality.averageVisibility < thresholds.minVisibility * 0.82;

  if (quality.score >= thresholds.readyScore && !hasFailedCheck) return 'ready';
  if (quality.score >= thresholds.reviewScore && !hasFailedCheck) return 'review';
  return 'retake';
}

function buildAdvice(quality: AnalysisQuality, thresholds: CaptureReadinessThresholds) {
  const advice: string[] = [];

  if (quality.frameCoverage < thresholds.minFrameCoverage) {
    advice.push('Keep the climber in frame from the first pull to the last controlled move.');
  }
  if (quality.landmarkCoverage < thresholds.minLandmarkCoverage) {
    advice.push('Film side-on with hands, hips, knees, and feet visible for the full attempt.');
  }
  if (quality.averageVisibility < thresholds.minVisibility) {
    advice.push('Use brighter, even light and avoid clothing or wall features that hide joints.');
  }
  if (advice.length === 0) {
    advice.push('This clip is reliable enough for local cues; repeat the same camera angle for comparison.');
  }

  return advice;
}

export function assessCaptureReadiness(
  quality: AnalysisQuality,
  thresholds: CaptureReadinessThresholds = defaultCaptureReadinessThresholds,
): CaptureReadiness {
  const status = summarizeStatus(quality, thresholds);
  const checks: CaptureReadinessCheck[] = [
    {
      detail: 'Enough sampled frames for movement timing.',
      id: 'frame-coverage',
      label: 'Frame coverage',
      status: checkStatus(quality.frameCoverage, thresholds.minFrameCoverage),
      valueLabel: percent(quality.frameCoverage),
    },
    {
      detail: 'Full-body landmarks are present across the clip.',
      id: 'landmark-coverage',
      label: 'Body coverage',
      status: checkStatus(quality.landmarkCoverage, thresholds.minLandmarkCoverage),
      valueLabel: percent(quality.landmarkCoverage),
    },
    {
      detail: 'Pose confidence is high enough for technique cues.',
      id: 'visibility',
      label: 'Pose visibility',
      status: checkStatus(quality.averageVisibility, thresholds.minVisibility),
      valueLabel: percent(quality.averageVisibility),
    },
  ];

  if (status === 'ready') {
    return {
      action: 'Use this as a baseline attempt.',
      advice: buildAdvice(quality, thresholds),
      checks,
      status,
      title: 'Ready for coaching',
    };
  }

  if (status === 'review') {
    return {
      action: 'Review cues, then repeat with the same angle.',
      advice: buildAdvice(quality, thresholds),
      checks,
      status,
      title: 'Usable with caution',
    };
  }

  return {
    action: 'Retake before trusting technique cues.',
    advice: buildAdvice(quality, thresholds),
    checks,
    status,
    title: 'Retake recommended',
  };
}
