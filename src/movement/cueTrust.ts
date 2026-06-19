import { z } from 'zod';

import type { LocalAnalysisReport, MovementCue, TimelineEvent } from './contracts';

export const CueTrustLevelSchema = z.enum(['high', 'medium', 'low', 'review']);
export const CueTrustFactorStatusSchema = z.enum(['strong', 'caution', 'weak']);

export const CueTrustFactorSchema = z.object({
  detail: z.string(),
  id: z.string(),
  label: z.string(),
  score: z.number().min(0).max(100),
  status: CueTrustFactorStatusSchema,
});

export const CueTrustSignalSchema = z.object({
  cueId: z.string(),
  explanation: z.string(),
  factors: z.array(CueTrustFactorSchema),
  label: z.string(),
  level: CueTrustLevelSchema,
  score: z.number().min(0).max(100),
  title: z.string(),
});

export const CueTrustReportSchema = z.object({
  averageScore: z.number().min(0).max(100),
  generatedAt: z.string(),
  lowestCueIds: z.array(z.string()),
  reviewCueIds: z.array(z.string()),
  schemaVersion: z.literal('movebeta.cue-trust.v1'),
  signals: z.array(CueTrustSignalSchema),
  summary: z.string(),
  validationStatus: z.enum(['validated', 'needs-review', 'insufficient-data', 'pending']),
});

export type CueTrustLevel = z.infer<typeof CueTrustLevelSchema>;
export type CueTrustSignal = z.infer<typeof CueTrustSignalSchema>;
export type CueTrustReport = z.infer<typeof CueTrustReportSchema>;
export type CueTrustFactor = z.infer<typeof CueTrustFactorSchema>;

export type CueTrustValidationEvidence = {
  acceptance: 'pass' | 'needs-review' | 'insufficient-data';
  averageScore: number;
  failingCueIds: string[];
  reviewedCueCount: number;
  unreviewedCueIds: string[];
};

export type CueTrustThresholds = {
  high: number;
  low: number;
  medium: number;
  timelineWindowMs: number;
};

export type CueTrustOptions = {
  generatedAt?: string;
  thresholds?: Partial<CueTrustThresholds>;
  validation?: CueTrustValidationEvidence;
};

const defaultThresholds: CueTrustThresholds = {
  high: 85,
  low: 58,
  medium: 72,
  timelineWindowMs: 1400,
};

const cueEventTypes: Record<string, TimelineEvent['type'][]> = {
  'cue-foot-cut': ['foot-cut'],
  'cue-hip': ['flow', 'lock-off', 'pause'],
  'cue-lockoff': ['lock-off', 'pause'],
  'cue-pause': ['pause'],
};

function clampScore(value: number) {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function average(values: number[]) {
  if (values.length === 0) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function factorStatus(score: number): CueTrustFactor['status'] {
  if (score >= 80) return 'strong';
  if (score >= 60) return 'caution';
  return 'weak';
}

function factor(id: string, label: string, score: number, detail: string): CueTrustFactor {
  const rounded = clampScore(score);
  return CueTrustFactorSchema.parse({
    detail,
    id,
    label,
    score: rounded,
    status: factorStatus(rounded),
  });
}

function levelForScore(score: number, thresholds: CueTrustThresholds): CueTrustLevel {
  if (score >= thresholds.high) return 'high';
  if (score >= thresholds.medium) return 'medium';
  if (score >= thresholds.low) return 'low';
  return 'review';
}

function labelForLevel(level: CueTrustLevel) {
  if (level === 'high') return 'High trust';
  if (level === 'medium') return 'Usable signal';
  if (level === 'low') return 'Review first';
  return 'Retake or validate';
}

function qualityFactor(report: LocalAnalysisReport) {
  return factor(
    'pose-quality',
    'Pose quality',
    report.analysisQuality.score,
    `${report.analysisQuality.score}/100 from coverage, landmarks, and visibility.`,
  );
}

function timingFactor(report: LocalAnalysisReport, cue: MovementCue, thresholds: CueTrustThresholds) {
  const durationMs = Math.max(1, report.session.durationMs);
  const timestampInRange = cue.timestampMs >= 0 && cue.timestampMs <= durationMs;

  if (!timestampInRange) {
    return factor('timing', 'Timing evidence', 25, 'Cue timestamp falls outside the clip duration.');
  }

  const expectedTypes = cueEventTypes[cue.id] ?? [];
  const nearestMatchingEvent = report.timeline
    .filter((event) => expectedTypes.length === 0 || expectedTypes.includes(event.type))
    .map((event) => Math.abs(event.timestampMs - cue.timestampMs))
    .sort((a, b) => a - b)[0];

  if (nearestMatchingEvent !== undefined && nearestMatchingEvent <= thresholds.timelineWindowMs) {
    return factor('timing', 'Timing evidence', 95, `Matched local timeline evidence within ${nearestMatchingEvent}ms.`);
  }

  const baseScore = report.timeline.length > 0 ? 76 : 68;
  return factor('timing', 'Timing evidence', baseScore, 'Timestamp is inside the clip, but no close matching timeline marker was found.');
}

function performanceFactor(report: LocalAnalysisReport) {
  if (report.performance.budgetStatus === 'within-budget') {
    return factor('performance', 'Runtime evidence', 92, 'Local analysis stayed within the configured budget.');
  }

  if (report.performance.budgetStatus === 'over-budget') {
    return factor('performance', 'Runtime evidence', 50, 'Local analysis exceeded the configured budget.');
  }

  return factor('performance', 'Runtime evidence', 72, 'Runtime was not measured for this analysis.');
}

function validationFactor(cue: MovementCue, validation?: CueTrustValidationEvidence) {
  if (!validation) {
    return factor('validation', 'Coach validation', 62, 'Pending real coach validation dataset evidence.');
  }

  if (validation.failingCueIds.includes(cue.id)) {
    return factor('validation', 'Coach validation', 25, 'This cue failed at least one real coach validation review.');
  }

  if (validation.unreviewedCueIds.includes(cue.id)) {
    return factor('validation', 'Coach validation', 52, 'This cue is not fully reviewed in the validation dataset.');
  }

  if (validation.acceptance === 'pass') {
    return factor('validation', 'Coach validation', validation.averageScore * 20, 'Validation dataset passed its acceptance gate.');
  }

  if (validation.acceptance === 'needs-review') {
    return factor('validation', 'Coach validation', 58, 'Validation dataset needs review before production movement claims.');
  }

  return factor('validation', 'Coach validation', 50, 'Validation dataset does not have enough real review evidence yet.');
}

function explanationFor(signal: Pick<CueTrustSignal, 'factors' | 'level'>) {
  const weakFactor = signal.factors.find((item) => item.status === 'weak');
  if (weakFactor) {
    return `${labelForLevel(signal.level)} because ${weakFactor.label.toLowerCase()} is weak.`;
  }

  const cautionFactor = signal.factors.find((item) => item.status === 'caution');
  if (cautionFactor) {
    return `${labelForLevel(signal.level)} with a caveat: ${cautionFactor.label.toLowerCase()} needs review.`;
  }

  return `${labelForLevel(signal.level)} across pose quality, timing, runtime, and validation factors.`;
}

function validationStatus(validation?: CueTrustValidationEvidence): CueTrustReport['validationStatus'] {
  if (!validation) return 'pending';
  if (validation.acceptance === 'pass') return 'validated';
  return validation.acceptance;
}

export function buildCueTrustReport(report: LocalAnalysisReport, options: CueTrustOptions = {}): CueTrustReport {
  const thresholds = { ...defaultThresholds, ...(options.thresholds ?? {}) };

  const signals = report.cues.map((cue) => {
    const factors = [
      qualityFactor(report),
      timingFactor(report, cue, thresholds),
      performanceFactor(report),
      validationFactor(cue, options.validation),
    ];
    const score = clampScore(
      factors[0].score * 0.45 + factors[1].score * 0.25 + factors[2].score * 0.15 + factors[3].score * 0.15,
    );
    const level = levelForScore(score, thresholds);

    return CueTrustSignalSchema.parse({
      cueId: cue.id,
      explanation: explanationFor({ factors, level }),
      factors,
      label: labelForLevel(level),
      level,
      score,
      title: cue.title,
    });
  });

  const averageScore = clampScore(average(signals.map((signal) => signal.score)));
  const lowestScore = Math.min(...signals.map((signal) => signal.score), 100);
  const reviewCueIds = signals.filter((signal) => signal.level === 'low' || signal.level === 'review').map((signal) => signal.cueId);
  const summary =
    signals.length === 0
      ? 'No cue trust signals were generated for this report.'
      : `${signals.length} cues scored, ${reviewCueIds.length} need review before production claims.`;

  return CueTrustReportSchema.parse({
    averageScore,
    generatedAt: options.generatedAt ?? new Date().toISOString(),
    lowestCueIds: signals.filter((signal) => signal.score === lowestScore).map((signal) => signal.cueId),
    reviewCueIds,
    schemaVersion: 'movebeta.cue-trust.v1',
    signals,
    summary,
    validationStatus: validationStatus(options.validation),
  });
}
