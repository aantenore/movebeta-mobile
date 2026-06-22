import { z } from 'zod';

import { summarizeAnalysisEvidence } from './analysisEvidence';
import type { LocalAnalysisReport } from './contracts';

export const analysisTrustSchemaVersion = 'movebeta.analysis-trust.v1';

export const AnalysisTrustDecisionSchema = z.enum(['coach-ready', 'review-first', 'journal-only', 'retake']);
export const AnalysisTrustFactorStatusSchema = z.enum(['pass', 'watch', 'block']);

export const AnalysisTrustFactorSchema = z.object({
  detail: z.string(),
  id: z.string(),
  label: z.string(),
  status: AnalysisTrustFactorStatusSchema,
  valueLabel: z.string(),
  weight: z.number().positive(),
});

export const AnalysisTrustSummarySchema = z.object({
  blockers: z.array(z.string()),
  cautions: z.array(z.string()),
  decision: AnalysisTrustDecisionSchema,
  factors: z.array(AnalysisTrustFactorSchema),
  positives: z.array(z.string()),
  privacy: z.object({
    localOnly: z.boolean(),
    rawVideoIncluded: z.literal(false),
    storedArtifacts: z.array(z.string()),
    uploadsVideo: z.boolean(),
  }),
  recommendedAction: z.string(),
  schemaVersion: z.literal(analysisTrustSchemaVersion),
  score: z.number().int().min(0).max(100),
  summary: z.string(),
  title: z.string(),
});

export type AnalysisTrustDecision = z.infer<typeof AnalysisTrustDecisionSchema>;
export type AnalysisTrustFactor = z.infer<typeof AnalysisTrustFactorSchema>;
export type AnalysisTrustFactorStatus = z.infer<typeof AnalysisTrustFactorStatusSchema>;
export type AnalysisTrustSummary = z.infer<typeof AnalysisTrustSummarySchema>;

export type AnalysisTrustThresholds = {
  minFrameCoverage: number;
  minLandmarkCoverage: number;
  minQualityScore: number;
  minVisibility: number;
  reviewQualityScore: number;
};

export const defaultAnalysisTrustThresholds: AnalysisTrustThresholds = {
  minFrameCoverage: 0.7,
  minLandmarkCoverage: 0.9,
  minQualityScore: 78,
  minVisibility: 0.65,
  reviewQualityScore: 60,
};

function percent(value: number) {
  return `${Math.round(value * 100)}%`;
}

function statusFromMinimum(value: number, minimum: number, reviewMinimum: number): AnalysisTrustFactorStatus {
  if (value >= minimum) return 'pass';
  if (value >= reviewMinimum) return 'watch';
  return 'block';
}

function qualityFactor(report: LocalAnalysisReport, thresholds: AnalysisTrustThresholds): AnalysisTrustFactor {
  const status = statusFromMinimum(report.analysisQuality.score, thresholds.minQualityScore, thresholds.reviewQualityScore);

  return {
    detail:
      status === 'pass'
        ? 'Quality is high enough for a focused repeat decision.'
        : status === 'watch'
          ? 'Quality is usable, but cue timing should be checked against the clip.'
          : 'Quality is too weak to trust technique corrections from this clip.',
    id: 'signal-quality',
    label: 'Signal quality',
    status,
    valueLabel: `${report.analysisQuality.score}/100`,
    weight: 30,
  };
}

function coverageFactor(report: LocalAnalysisReport, thresholds: AnalysisTrustThresholds): AnalysisTrustFactor {
  const frameStatus = statusFromMinimum(report.analysisQuality.frameCoverage, thresholds.minFrameCoverage, thresholds.minFrameCoverage * 0.78);
  const landmarkStatus = statusFromMinimum(
    report.analysisQuality.landmarkCoverage,
    thresholds.minLandmarkCoverage,
    thresholds.minLandmarkCoverage * 0.78,
  );
  const visibilityStatus = statusFromMinimum(
    report.analysisQuality.averageVisibility,
    thresholds.minVisibility,
    thresholds.minVisibility * 0.78,
  );
  const statuses = [frameStatus, landmarkStatus, visibilityStatus];
  const status = statuses.includes('block') ? 'block' : statuses.includes('watch') ? 'watch' : 'pass';

  return {
    detail:
      status === 'pass'
        ? 'Frame, landmark, and visibility coverage support timing-sensitive cue review.'
        : status === 'watch'
          ? 'One coverage signal is borderline; compare the cue against the visible movement.'
          : 'Coverage is missing too much body or frame evidence for coaching use.',
    id: 'signal-coverage',
    label: 'Body coverage',
    status,
    valueLabel: `${percent(report.analysisQuality.frameCoverage)} frames · ${percent(report.analysisQuality.averageVisibility)} visibility`,
    weight: 20,
  };
}

function cueFactor(report: LocalAnalysisReport): AnalysisTrustFactor {
  const status: AnalysisTrustFactorStatus =
    report.metrics.length === 0 ? 'block' : report.cues.length === 0 ? 'watch' : 'pass';

  return {
    detail:
      status === 'pass'
        ? 'The analyzer produced movement metrics and at least one coaching cue.'
        : status === 'watch'
          ? 'Metrics were produced, but no cue crossed the configured threshold.'
          : 'No movement metrics were produced for this report.',
    id: 'cue-generation',
    label: 'Cue evidence',
    status,
    valueLabel: `${report.cues.length} cues`,
    weight: 10,
  };
}

function performanceFactor(report: LocalAnalysisReport): AnalysisTrustFactor {
  const status: AnalysisTrustFactorStatus =
    report.performance.budgetStatus === 'within-budget'
      ? 'pass'
      : report.performance.budgetStatus === 'not-measured'
        ? 'watch'
        : 'block';

  return {
    detail:
      status === 'pass'
        ? 'The local analysis completed inside the configured runtime budget.'
        : status === 'watch'
          ? 'Runtime was not measured, so this report should not be used as performance evidence.'
          : 'Runtime exceeded the configured budget; review before relying on the analysis in-session.',
    id: 'runtime-budget',
    label: 'Runtime budget',
    status,
    valueLabel: report.performance.budgetStatus,
    weight: 15,
  };
}

function privacyFactor(report: LocalAnalysisReport): AnalysisTrustFactor {
  const localOnly = !report.engine.uploadsVideo && !report.privacy.videoLeavesDevice;

  return {
    detail: localOnly
      ? 'The report stays inside the local privacy boundary.'
      : 'The report crosses the expected local-only privacy boundary.',
    id: 'privacy-boundary',
    label: 'Privacy boundary',
    status: localOnly ? 'pass' : 'block',
    valueLabel: localOnly ? 'local only' : 'review',
    weight: 20,
  };
}

function evidenceFactor(report: LocalAnalysisReport): AnalysisTrustFactor {
  const evidence = summarizeAnalysisEvidence(report.analysisEvidence);
  const status: AnalysisTrustFactorStatus =
    evidence.total === 0 ? 'watch' : evidence.status === 'pass' ? 'pass' : evidence.status === 'review' ? 'watch' : 'block';

  return {
    detail:
      status === 'pass'
        ? 'The generated evidence timeline has no review or blocked steps.'
        : status === 'watch'
          ? 'The evidence timeline needs review before sharing or making claims.'
          : 'The evidence timeline contains at least one blocked step.',
    id: 'evidence-timeline',
    label: 'Evidence timeline',
    status,
    valueLabel: evidence.total === 0 ? 'legacy' : `${evidence.pass}/${evidence.total} pass`,
    weight: 5,
  };
}

function factorScore(status: AnalysisTrustFactorStatus) {
  if (status === 'pass') return 100;
  if (status === 'watch') return 62;
  return 0;
}

function weightedScore(factors: AnalysisTrustFactor[]) {
  const weight = factors.reduce((sum, factor) => sum + factor.weight, 0);
  if (weight === 0) return 0;

  return Math.round(factors.reduce((sum, factor) => sum + factorScore(factor.status) * factor.weight, 0) / weight);
}

function decideTrust(factors: AnalysisTrustFactor[], score: number): AnalysisTrustDecision {
  const blockedIds = new Set(factors.filter((factor) => factor.status === 'block').map((factor) => factor.id));
  if (blockedIds.has('privacy-boundary')) return 'journal-only';
  if (blockedIds.has('signal-quality') || blockedIds.has('signal-coverage') || blockedIds.has('cue-generation')) return 'retake';
  if (factors.some((factor) => factor.status === 'block')) return 'review-first';
  if (score >= 86 && factors.every((factor) => factor.status === 'pass')) return 'coach-ready';
  if (score >= 72) return 'review-first';
  return 'journal-only';
}

function titleFor(decision: AnalysisTrustDecision) {
  if (decision === 'coach-ready') return 'Coaching signal ready';
  if (decision === 'review-first') return 'Review before changing beta';
  if (decision === 'retake') return 'Retake before coaching';
  return 'Keep as private journal';
}

function summaryFor(decision: AnalysisTrustDecision) {
  if (decision === 'coach-ready') {
    return 'Quality, privacy, runtime, and cue evidence support using this report for a focused repeat.';
  }
  if (decision === 'review-first') {
    return 'Use the report, but compare the cues against the clip before making a major beta change.';
  }
  if (decision === 'retake') {
    return 'Signal quality is too weak to trust timing or body-position corrections from this clip.';
  }
  return 'This report is useful for local notes, but should not drive coaching decisions.';
}

function actionFor(decision: AnalysisTrustDecision) {
  if (decision === 'coach-ready') return 'Run one focused repeat and log whether the primary cue improved.';
  if (decision === 'review-first') return 'Watch the cue moment once, then repeat only if the video supports the cue.';
  if (decision === 'retake') return 'Retake with the full body visible before using the coach cues.';
  return 'Keep the report for history and capture a cleaner local clip for coaching.';
}

export function buildAnalysisTrustSummary(
  report: LocalAnalysisReport,
  thresholds: AnalysisTrustThresholds = defaultAnalysisTrustThresholds,
): AnalysisTrustSummary {
  const factors = [
    qualityFactor(report, thresholds),
    coverageFactor(report, thresholds),
    cueFactor(report),
    performanceFactor(report),
    privacyFactor(report),
    evidenceFactor(report),
  ];
  const score = weightedScore(factors);
  const decision = decideTrust(factors, score);

  return AnalysisTrustSummarySchema.parse({
    blockers: factors.filter((factor) => factor.status === 'block').map((factor) => factor.detail),
    cautions: factors.filter((factor) => factor.status === 'watch').map((factor) => factor.detail),
    decision,
    factors,
    positives: factors.filter((factor) => factor.status === 'pass').map((factor) => factor.detail),
    privacy: {
      localOnly: !report.engine.uploadsVideo && !report.privacy.videoLeavesDevice,
      rawVideoIncluded: false,
      storedArtifacts: report.privacy.storedArtifacts,
      uploadsVideo: report.engine.uploadsVideo,
    },
    recommendedAction: actionFor(decision),
    schemaVersion: analysisTrustSchemaVersion,
    score,
    summary: summaryFor(decision),
    title: titleFor(decision),
  });
}
