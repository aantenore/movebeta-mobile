import type { CoachLensKey } from '@/movement/contracts';

import type { CaptureCalibrationAssessment } from './captureCalibration';
import { videoAnalysisConfig } from './videoConfig';

export type LiveRecordingGuidePhase = 'setup' | 'opening' | 'middle' | 'finish' | 'near-limit';
export type LiveRecordingGuideTone = 'action' | 'ready' | 'warning';

export type LiveRecordingPrompt = {
  body: string;
  id: string;
  phase: LiveRecordingGuidePhase;
  title: string;
  tone: LiveRecordingGuideTone;
};

export type LiveRecordingGuide = {
  canStopForAnalysis: boolean;
  elapsedMs: number;
  minimumDurationMet: boolean;
  nextMilestoneMs: number;
  progress: number;
  prompt: LiveRecordingPrompt;
  remainingMs: number;
};

export type LiveRecordingGuideInput = {
  calibration: Pick<CaptureCalibrationAssessment, 'advice' | 'canRecord' | 'status'>;
  coachLens: CoachLensKey;
  elapsedMs: number;
  maxDurationMs?: number;
  minimumDurationMs?: number;
  recording: boolean;
};

type PromptTemplate = Omit<LiveRecordingPrompt, 'phase'> & {
  atMs: number;
  phase?: LiveRecordingGuidePhase;
};

const lensPromptTemplates: Record<CoachLensKey, PromptTemplate[]> = {
  balanced: [
    {
      atMs: 0,
      body: 'Keep the full climber in frame and call the start before the first move.',
      id: 'balanced-start',
      title: 'Frame the whole attempt',
      tone: 'action',
    },
    {
      atMs: 4_000,
      body: 'Watch for pauses before the crux and keep feet, hips, and hands visible.',
      id: 'balanced-middle',
      title: 'Capture the decision point',
      tone: 'action',
    },
    {
      atMs: 9_000,
      body: 'Hold the shot through the finish so the report can score the last movement window.',
      id: 'balanced-finish',
      title: 'Keep filming after the reach',
      tone: 'ready',
    },
  ],
  'body-position': [
    {
      atMs: 0,
      body: 'Use side-on framing and keep hips, shoulders, knees, and ankles visible.',
      id: 'body-start',
      title: 'Prioritize hip line',
      tone: 'action',
    },
    {
      atMs: 4_000,
      body: 'Hold the frame steady when the climber rotates or reaches across.',
      id: 'body-middle',
      title: 'Track rotation cleanly',
      tone: 'action',
    },
    {
      atMs: 9_000,
      body: 'Keep recording until hips return to a stable stance after the hardest move.',
      id: 'body-finish',
      title: 'Finish the hip reset',
      tone: 'ready',
    },
  ],
  footwork: [
    {
      atMs: 0,
      body: 'Check that both feet stay visible before the first move starts.',
      id: 'footwork-start',
      title: 'Feet in frame',
      tone: 'action',
    },
    {
      atMs: 4_000,
      body: 'Keep filming through any foot swap, smear, or high step.',
      id: 'footwork-middle',
      title: 'Capture foot pressure',
      tone: 'action',
    },
    {
      atMs: 9_000,
      body: 'Continue until the feet settle after the reach so foot cuts can be scored.',
      id: 'footwork-finish',
      title: 'Hold after the reach',
      tone: 'ready',
    },
  ],
  'power-conservation': [
    {
      atMs: 0,
      body: 'Frame elbows and shoulders clearly before the first hand move.',
      id: 'power-start',
      title: 'Arms visible',
      tone: 'action',
    },
    {
      atMs: 4_000,
      body: 'Keep the camera steady while the climber locks off or pauses.',
      id: 'power-middle',
      title: 'Capture bent-arm load',
      tone: 'action',
    },
    {
      atMs: 9_000,
      body: 'Hold the shot until the climber returns to straight arms or steps down.',
      id: 'power-finish',
      title: 'Finish the recovery',
      tone: 'ready',
    },
  ],
};

function clampNumber(value: number, min: number, max: number) {
  if (!Number.isFinite(value)) return min;
  return Math.max(min, Math.min(max, value));
}

function phaseFor(elapsedMs: number, maxDurationMs: number): LiveRecordingGuidePhase {
  if (elapsedMs >= maxDurationMs * 0.9) return 'near-limit';
  if (elapsedMs >= 9_000) return 'finish';
  if (elapsedMs >= 4_000) return 'middle';
  if (elapsedMs > 0) return 'opening';
  return 'setup';
}

function promptFor(coachLens: CoachLensKey, elapsedMs: number, maxDurationMs: number): LiveRecordingPrompt {
  if (elapsedMs >= maxDurationMs * 0.9) {
    return {
      body: 'Wrap the attempt now; the clip is close to the configured recording limit.',
      id: 'near-limit',
      phase: 'near-limit',
      title: 'Finish recording',
      tone: 'warning',
    };
  }

  const templates = lensPromptTemplates[coachLens] ?? lensPromptTemplates.balanced;
  const template = [...templates].reverse().find((item) => elapsedMs >= item.atMs) ?? templates[0];

  return {
    body: template.body,
    id: template.id,
    phase: template.phase ?? phaseFor(elapsedMs, maxDurationMs),
    title: template.title,
    tone: template.tone,
  };
}

function setupPrompt(calibration: LiveRecordingGuideInput['calibration']): LiveRecordingPrompt | null {
  if (!calibration.canRecord) {
    return {
      body: calibration.advice[0] ?? 'Fix setup blockers before recording.',
      id: 'setup-blocked',
      phase: 'setup',
      title: 'Fix setup first',
      tone: 'warning',
    };
  }

  if (calibration.status === 'review') {
    return {
      body: calibration.advice[0] ?? 'Recording is allowed, but setup tweaks can improve cue quality.',
      id: 'setup-review',
      phase: 'setup',
      title: 'Improve setup if possible',
      tone: 'action',
    };
  }

  return null;
}

export function buildLiveRecordingGuide({
  calibration,
  coachLens,
  elapsedMs,
  maxDurationMs = videoAnalysisConfig.maxRecordingDurationSeconds * 1000,
  minimumDurationMs = videoAnalysisConfig.minimumDurationMs,
  recording,
}: LiveRecordingGuideInput): LiveRecordingGuide {
  const nextElapsedMs = Math.round(clampNumber(elapsedMs, 0, maxDurationMs));
  const minimumDurationMet = nextElapsedMs >= minimumDurationMs;
  const setup = !recording ? setupPrompt(calibration) : null;
  const prompt =
    setup ??
    (recording
      ? promptFor(coachLens, nextElapsedMs, maxDurationMs)
      : {
          body: 'Start recording when the climber is ready and keep the phone fixed.',
          id: 'ready-to-record',
          phase: 'setup' as const,
          title: 'Ready to record',
          tone: 'ready' as const,
        });

  return {
    canStopForAnalysis: minimumDurationMet,
    elapsedMs: nextElapsedMs,
    minimumDurationMet,
    nextMilestoneMs: minimumDurationMet ? maxDurationMs : minimumDurationMs,
    progress: Number((nextElapsedMs / maxDurationMs).toFixed(2)),
    prompt,
    remainingMs: Math.max(0, maxDurationMs - nextElapsedMs),
  };
}
