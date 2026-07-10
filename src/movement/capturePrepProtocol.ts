import type { ClimbSession, LocalAnalysisReport, MovementCue, MovementMetric } from './contracts';
import { assessCaptureReadiness, type CaptureReadiness } from './captureReadiness';
import type { CaptureCalibrationAssessment } from '@/video/captureCalibration';
import { measuredMovementMetrics } from './metricEvidence';

export type CapturePrepProtocolStatus = 'ready' | 'review' | 'blocked';
export type CapturePrepPhaseKind = 'setup' | 'warmup' | 'record' | 'verify';

export type CapturePrepPhase = {
  durationMinutes: number;
  evidence: string;
  id: string;
  instruction: string;
  kind: CapturePrepPhaseKind;
  title: string;
};

export type CapturePrepProtocol = {
  canRecord: boolean;
  focus: string;
  phases: CapturePrepPhase[];
  privacyNote: string;
  retakeCriteria: string[];
  status: CapturePrepProtocolStatus;
  title: string;
  totalMinutes: number;
};

type BuildCapturePrepProtocolOptions = {
  calibration: CaptureCalibrationAssessment;
  report?: LocalAnalysisReport | null;
  session?: ClimbSession;
};

function totalMinutes(phases: CapturePrepPhase[]) {
  return phases.reduce((total, phase) => total + phase.durationMinutes, 0);
}

function cueRank(cue: MovementCue) {
  if (cue.severity === 'fix') return 0;
  if (cue.severity === 'watch') return 1;
  return 2;
}

function primaryCue(report: LocalAnalysisReport | null | undefined) {
  if (!report || report.cues.length === 0) return null;
  return [...report.cues].sort((a, b) => cueRank(a) - cueRank(b) || a.timestampMs - b.timestampMs)[0];
}

function weakestMetric(report: LocalAnalysisReport | null | undefined): MovementMetric | null {
  if (!report || report.metrics.length === 0) return null;
  return measuredMovementMetrics(report.metrics).sort((a, b) => a.score - b.score || a.label.localeCompare(b.label))[0] ?? null;
}

function setupPhase(calibration: CaptureCalibrationAssessment): CapturePrepPhase {
  const failing = calibration.checks.filter((check) => check.status === 'fail');
  const watching = calibration.checks.filter((check) => check.status === 'watch');
  const targetChecks = failing.length > 0 ? failing : watching;

  return {
    durationMinutes: calibration.status === 'ready' ? 2 : 4,
    evidence:
      targetChecks.length > 0
        ? targetChecks.map((check) => `${check.label}: ${check.valueLabel}`).join(', ')
        : `${calibration.score}/100 capture setup score.`,
    id: 'prep-setup',
    instruction:
      calibration.status === 'blocked'
        ? 'Fix the blocked setup checks before opening the recorder.'
        : calibration.status === 'review'
          ? 'Make one setup improvement, then keep the same angle for the next local comparison.'
          : 'Confirm privacy, side-on framing, and stable phone placement before recording.',
    kind: 'setup',
    title: calibration.status === 'blocked' ? 'Fix setup blockers' : 'Confirm privacy and framing',
  };
}

function warmupPhase(report: LocalAnalysisReport | null | undefined, cue: MovementCue | null, metric: MovementMetric | null): CapturePrepPhase {
  if (!report || !cue || !metric) {
    return {
      durationMinutes: 6,
      evidence: 'No previous local report is required.',
      id: 'prep-baseline-warmup',
      instruction: 'Move through an easy version of the climb and keep the whole body visible for a clean baseline clip.',
      kind: 'warmup',
      title: 'Baseline movement check',
    };
  }

  return {
    durationMinutes: cue.severity === 'fix' ? 8 : 6,
    evidence: `${metric.label} ${metric.score}/100; ${cue.title} at ${(cue.timestampMs / 1000).toFixed(1)}s.`,
    id: 'prep-evidence-warmup',
    instruction: cue.drill,
    kind: 'warmup',
    title: `Prime ${metric.label.toLowerCase()}`,
  };
}

function recordPhase(
  calibration: CaptureCalibrationAssessment,
  readiness: CaptureReadiness | null,
  session: ClimbSession | undefined,
): CapturePrepPhase {
  const wallAngle = session?.wallAngle ?? 'selected wall angle';
  const retakePrefix = readiness?.status === 'retake' ? 'Retake the comparable attempt' : 'Record one comparable attempt';

  return {
    durationMinutes: 3,
    evidence: readiness ? `${readiness.title}: ${readiness.action}` : calibration.action,
    id: 'prep-record',
    instruction: `${retakePrefix} on ${wallAngle}; keep the same phone position until analysis finishes.`,
    kind: 'record',
    title: readiness?.status === 'retake' ? 'Retake comparable clip' : 'Record local attempt',
  };
}

function verifyPhase(readiness: CaptureReadiness | null): CapturePrepPhase {
  return {
    durationMinutes: 2,
    evidence: readiness ? `${readiness.checks.map((check) => `${check.label} ${check.valueLabel}`).join(', ')}.` : 'First report will define quality evidence.',
    id: 'prep-verify',
    instruction: 'Check quality, cue trust, and video upload status before saving notes or sharing any packet.',
    kind: 'verify',
    title: 'Verify local evidence',
  };
}

function statusFor(calibration: CaptureCalibrationAssessment, readiness: CaptureReadiness | null): CapturePrepProtocolStatus {
  if (!calibration.canRecord) return 'blocked';
  if (!readiness) return calibration.status === 'ready' ? 'ready' : 'review';
  if (calibration.status === 'ready' && readiness.status === 'ready') return 'ready';
  return 'review';
}

function retakeCriteria(calibration: CaptureCalibrationAssessment, readiness: CaptureReadiness | null) {
  const criteria = [
    'Retake if visible bystanders enter frame or consent is unresolved.',
    'Retake if the whole climber is not visible from first pull to final controlled move.',
  ];

  if (calibration.status !== 'ready') {
    criteria.push(...calibration.advice.slice(0, 2));
  }

  if (readiness && readiness.status !== 'ready') {
    criteria.push(...readiness.advice.slice(0, 3));
  } else {
    criteria.push('Keep the same camera angle for comparable repeat analysis.');
  }

  return Array.from(new Set(criteria)).slice(0, 5);
}

export function buildCapturePrepProtocol({
  calibration,
  report = null,
  session,
}: BuildCapturePrepProtocolOptions): CapturePrepProtocol {
  const readiness = report ? assessCaptureReadiness(report.analysisQuality) : null;
  const cue = primaryCue(report);
  const metric = weakestMetric(report);
  const phases = [setupPhase(calibration), warmupPhase(report, cue, metric), recordPhase(calibration, readiness, session), verifyPhase(readiness)];
  const status = statusFor(calibration, readiness);
  const focus = cue?.title ?? metric?.label ?? session?.title ?? 'Clean local baseline';

  return {
    canRecord: calibration.canRecord,
    focus,
    phases,
    privacyNote: 'Raw video stays on device by default; share only prepared packets after reviewing privacy flags.',
    retakeCriteria: retakeCriteria(calibration, readiness),
    status,
    title: status === 'blocked' ? 'Setup blocked' : status === 'review' ? 'Capture with review' : 'Protocol ready',
    totalMinutes: totalMinutes(phases),
  };
}
