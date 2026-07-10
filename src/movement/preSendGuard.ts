import type { LocalAnalysisReport } from './contracts';
import { summarizeDrillPracticeInsights } from './drillPracticeInsights';
import type { DrillPracticeRecord } from './drillPracticeRepository';
import { summarizeProgress } from './progressInsights';
import { summarizeProjectQueue } from './projectQueue';
import { summarizeRepeatOutcomes } from './repeatOutcomeInsights';
import type { ReportAnnotation } from './reportAnnotationRepository';
import {
  applyTechniqueReadinessSafetyCap,
  buildTechniqueReadinessPlan,
  type TechniqueReadinessPlan,
  type TechniqueReadinessSafetyCap,
} from './techniqueReadiness';

export type PreSendGuardStatus = 'baseline' | 'reset-first' | 'controlled-repeat' | 'hard-try-window';
export type PreSendGuardLoadCap = 'baseline' | 'easy' | 'moderate' | 'hard';
export type PreSendGuardSignalSeverity = 'blocker' | 'watch' | 'support';

export type PreSendGuardSignal = {
  evidence: string;
  id: string;
  label: string;
  severity: PreSendGuardSignalSeverity;
};

export type PreSendGuardThresholds = {
  maxAverageEffortForHardTry: number;
  maxFixCuesForHardTry: number;
  maxWarningsForHardTry: number;
  minPracticeCompletionRateForHardTry: number;
  minQualityForHardTry: number;
  minReadinessForHardTry: number;
  minRepeatSuccessRateForHardTry: number;
  resetScoreThreshold: number;
  watchScoreThreshold: number;
};

export type PreSendGuardDecision = {
  action: string;
  headline: string;
  loadCap: PreSendGuardLoadCap;
  score: number;
  signals: PreSendGuardSignal[];
  status: PreSendGuardStatus;
};

export type PreSendGuidance = {
  guard: PreSendGuardDecision;
  readiness: TechniqueReadinessPlan;
};

export const defaultPreSendGuardThresholds: PreSendGuardThresholds = {
  maxAverageEffortForHardTry: 4,
  maxFixCuesForHardTry: 0,
  maxWarningsForHardTry: 0,
  minPracticeCompletionRateForHardTry: 60,
  minQualityForHardTry: 78,
  minReadinessForHardTry: 70,
  minRepeatSuccessRateForHardTry: 50,
  resetScoreThreshold: 45,
  watchScoreThreshold: 74,
};

function clampScore(value: number) {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function latestReport(reports: LocalAnalysisReport[]) {
  return [...reports].sort((a, b) => b.session.createdAt.localeCompare(a.session.createdAt))[0] ?? null;
}

function countFixCues(report: LocalAnalysisReport | null) {
  return report?.cues.filter((cue) => cue.severity === 'fix').length ?? 0;
}

function makeSignal(
  id: string,
  label: string,
  evidence: string,
  severity: PreSendGuardSignalSeverity,
): PreSendGuardSignal {
  return {
    evidence,
    id,
    label,
    severity,
  };
}

function statusFor(score: number, signals: PreSendGuardSignal[], thresholds: PreSendGuardThresholds): PreSendGuardStatus {
  if (signals.some((signal) => signal.severity === 'blocker') || score < thresholds.resetScoreThreshold) return 'reset-first';
  if (score <= thresholds.watchScoreThreshold || signals.some((signal) => signal.severity === 'watch')) return 'controlled-repeat';
  return 'hard-try-window';
}

function loadCapFor(status: PreSendGuardStatus): PreSendGuardLoadCap {
  if (status === 'baseline') return 'baseline';
  if (status === 'reset-first') return 'easy';
  if (status === 'controlled-repeat') return 'moderate';
  return 'hard';
}

function headlineFor(status: PreSendGuardStatus) {
  if (status === 'baseline') return 'Create the movement baseline first';
  if (status === 'reset-first') return 'Reset before another hard try';
  if (status === 'controlled-repeat') return 'Repeat with one constraint';
  return 'Hard try window is open';
}

function actionFor(status: PreSendGuardStatus, signals: PreSendGuardSignal[], latest: LocalAnalysisReport | null) {
  const firstBlocker = signals.find((signal) => signal.severity === 'blocker');
  const firstWatch = signals.find((signal) => signal.severity === 'watch');

  if (status === 'baseline') return 'Record one controlled benchmark attempt before using the guard for hard tries.';
  if (status === 'reset-first') {
    return firstBlocker
      ? `${firstBlocker.label}: ${firstBlocker.evidence} Use an easier variant and log the result.`
      : 'Use an easier repeat and keep the next clip comparable before adding intensity.';
  }
  if (status === 'controlled-repeat') {
    return firstWatch
      ? `${firstWatch.label}: ${firstWatch.evidence} Repeat ${latest?.session.title ?? 'the latest attempt'} once with this constraint.`
      : `Repeat ${latest?.session.title ?? 'the latest attempt'} once before increasing difficulty.`;
  }
  return `Keep the same setup for one honest hard try on ${latest?.session.title ?? 'the latest attempt'}, then log the outcome.`;
}

function penaltyForSignals(signals: PreSendGuardSignal[]) {
  return signals.reduce((sum, signal) => {
    if (signal.severity === 'blocker') return sum + 18;
    if (signal.severity === 'watch') return sum + 8;
    return sum;
  }, 0);
}

export function buildPreSendGuard(
  reports: LocalAnalysisReport[],
  annotations: ReportAnnotation[],
  drillPractice: DrillPracticeRecord[] = [],
  thresholds: Partial<PreSendGuardThresholds> = {},
): PreSendGuardDecision {
  const config = { ...defaultPreSendGuardThresholds, ...thresholds };
  const progress = summarizeProgress(reports);
  const latest = latestReport(reports);

  if (!latest) {
    return {
      action: actionFor('baseline', [], null),
      headline: headlineFor('baseline'),
      loadCap: loadCapFor('baseline'),
      score: 0,
      signals: [
        makeSignal('baseline-missing', 'No local baseline', 'At least one local report is required before comparing hard tries.', 'watch'),
      ],
      status: 'baseline',
    };
  }

  const readiness = buildTechniqueReadinessPlan(reports, annotations);
  const projectQueue = summarizeProjectQueue(reports, annotations);
  const repeatOutcomes = summarizeRepeatOutcomes(reports, annotations);
  const practiceInsights = summarizeDrillPracticeInsights(reports, drillPractice);
  const signals: PreSendGuardSignal[] = [];
  const warningCount = latest.analysisQuality.warnings.length;
  const fixCueCount = countFixCues(latest);

  if (latest.analysisQuality.score < config.minQualityForHardTry) {
    signals.push(
      makeSignal(
        'analysis-quality',
        'Analysis quality',
        `${latest.analysisQuality.score}/100 is below the ${config.minQualityForHardTry}/100 hard-try threshold.`,
        'blocker',
      ),
    );
  } else {
    signals.push(
      makeSignal('analysis-quality', 'Analysis quality', `${latest.analysisQuality.score}/100 clears the hard-try threshold.`, 'support'),
    );
  }

  if (readiness.score < config.minReadinessForHardTry || readiness.status === 'recover') {
    signals.push(
      makeSignal(
        'technique-readiness',
        'Technique readiness',
        `${readiness.score}/100 and ${readiness.status} status point to ${readiness.nextAction}`,
        readiness.status === 'recover' ? 'blocker' : 'watch',
      ),
    );
  } else {
    signals.push(
      makeSignal('technique-readiness', 'Technique readiness', `${readiness.score}/100 supports a harder repeat window.`, 'support'),
    );
  }

  if (warningCount > config.maxWarningsForHardTry) {
    signals.push(
      makeSignal('video-signal', 'Video signal', `${warningCount} quality warning${warningCount === 1 ? '' : 's'} on the latest report.`, 'watch'),
    );
  }

  if (fixCueCount > config.maxFixCuesForHardTry) {
    signals.push(
      makeSignal(
        'fix-cues',
        'Open fix cues',
        `${fixCueCount} fix cue${fixCueCount === 1 ? '' : 's'} still need a controlled repeat.`,
        fixCueCount > 1 ? 'blocker' : 'watch',
      ),
    );
  }

  if (projectQueue.averageEffort > config.maxAverageEffortForHardTry) {
    signals.push(
      makeSignal(
        'effort-load',
        'Training load',
        `Average effort ${projectQueue.averageEffort}/5 is above the ${config.maxAverageEffortForHardTry}/5 cap.`,
        'blocker',
      ),
    );
  }

  if (practiceInsights.totalCount > 0 && practiceInsights.completionRate < config.minPracticeCompletionRateForHardTry) {
    signals.push(
      makeSignal(
        'practice-follow-through',
        'Practice follow-through',
        `${practiceInsights.completionRate}% completion is below the ${config.minPracticeCompletionRateForHardTry}% hard-try threshold.`,
        practiceInsights.status === 'blocked' ? 'blocker' : 'watch',
      ),
    );
  } else if (practiceInsights.status === 'consistent') {
    signals.push(
      makeSignal('practice-follow-through', 'Practice follow-through', `${practiceInsights.completionRate}% drill completion supports progression.`, 'support'),
    );
  }

  if (repeatOutcomes.attemptedCount > 0 && repeatOutcomes.successRate < config.minRepeatSuccessRateForHardTry) {
    signals.push(
      makeSignal(
        'repeat-outcome',
        'Repeat outcome',
        `${repeatOutcomes.successRate}% repeat success is below the ${config.minRepeatSuccessRateForHardTry}% threshold.`,
        repeatOutcomes.status === 'stalled' ? 'blocker' : 'watch',
      ),
    );
  } else if (repeatOutcomes.status === 'progressing') {
    signals.push(
      makeSignal('repeat-outcome', 'Repeat outcome', `${repeatOutcomes.successRate}% repeat success supports a harder attempt.`, 'support'),
    );
  }

  if (latest.performance.budgetStatus === 'over-budget') {
    signals.push(
      makeSignal('analysis-budget', 'Analysis budget', 'Latest local analysis exceeded the configured runtime budget.', 'watch'),
    );
  }

  const rawScore = progress.averageQuality - penaltyForSignals(signals);
  const score = clampScore(rawScore);
  const status = statusFor(score, signals, config);

  return {
    action: actionFor(status, signals, latest),
    headline: headlineFor(status),
    loadCap: loadCapFor(status),
    score,
    signals: signals.slice(0, 6),
    status,
  };
}

function readinessCapForGuard(guard: PreSendGuardDecision): TechniqueReadinessSafetyCap {
  const limitingSignal = guard.signals.find((signal) => signal.severity === 'blocker') ??
    guard.signals.find((signal) => signal.severity === 'watch');
  const risk = limitingSignal
    ? `Pre-send guard limit: ${limitingSignal.label}. ${limitingSignal.evidence}`
    : `Pre-send guard caps the next attempt at ${guard.loadCap} intensity.`;

  if (guard.status === 'baseline') {
    return {
      headline: guard.headline,
      maxStatus: 'baseline',
      nextAction: guard.action,
      risk,
    };
  }

  if (guard.status === 'reset-first') {
    return {
      headline: guard.headline,
      maxStatus: 'recover',
      nextAction: guard.action,
      risk,
    };
  }

  if (guard.status === 'controlled-repeat') {
    return {
      headline: guard.headline,
      maxStatus: 'repeat',
      nextAction: guard.action,
      risk,
    };
  }

  return {
    headline: guard.headline,
    maxStatus: 'ready',
    nextAction: guard.action,
    risk,
  };
}

export function buildPreSendGuidance(
  reports: LocalAnalysisReport[],
  annotations: ReportAnnotation[],
  drillPractice: DrillPracticeRecord[] = [],
  thresholds: Partial<PreSendGuardThresholds> = {},
): PreSendGuidance {
  const guard = buildPreSendGuard(reports, annotations, drillPractice, thresholds);
  const readiness = buildTechniqueReadinessPlan(reports, annotations);

  return {
    guard,
    readiness: applyTechniqueReadinessSafetyCap(readiness, readinessCapForGuard(guard)),
  };
}
