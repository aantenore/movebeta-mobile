import {
  analysisEvidenceSchemaVersion,
  AnalysisEvidenceTimelineSchema,
  LocalAnalysisReportSchema,
  type AnalysisEvidenceStep,
  type AnalysisEvidenceTimeline,
  type LocalAnalysisReport,
} from './contracts';

export type AnalysisEvidenceSummary = {
  blocked: number;
  pass: number;
  review: number;
  status: AnalysisEvidenceStep['status'];
  total: number;
};

const forbiddenEvidencePattern = /(raw video|video uri|file:\/\/|content:\/\/|ph:\/\/|\/users\/|\/var\/|\/private\/|\bsecret\b|\btoken\b)/i;

function formatPercent(value: number) {
  return `${Math.round(value * 100)}%`;
}

function evidenceStatusFromQuality(score: number) {
  if (score < 70) return 'blocked';
  if (score < 85) return 'review';
  return 'pass';
}

function evidenceStatusFromPerformance(status: LocalAnalysisReport['performance']['budgetStatus']) {
  if (status === 'over-budget') return 'blocked';
  if (status === 'not-measured') return 'review';
  return 'pass';
}

function containsForbiddenEvidence(values: string[]) {
  return values.some((value) => forbiddenEvidencePattern.test(value));
}

export function summarizeAnalysisEvidence(timeline: AnalysisEvidenceTimeline): AnalysisEvidenceSummary {
  const pass = timeline.steps.filter((step) => step.status === 'pass').length;
  const review = timeline.steps.filter((step) => step.status === 'review').length;
  const blocked = timeline.steps.filter((step) => step.status === 'blocked').length;

  return {
    blocked,
    pass,
    review,
    status: blocked > 0 ? 'blocked' : review > 0 ? 'review' : 'pass',
    total: timeline.steps.length,
  };
}

export function buildAnalysisEvidenceTimeline(
  report: LocalAnalysisReport,
  options: { generatedAt?: string } = {},
): AnalysisEvidenceTimeline {
  const qualityStatus = evidenceStatusFromQuality(report.analysisQuality.score);
  const performanceStatus = evidenceStatusFromPerformance(report.performance.budgetStatus);
  const privacyEvidence = [
    report.privacy.retention,
    ...report.privacy.storedArtifacts,
    report.engine.uploadsVideo ? 'engine uploads video' : 'engine upload disabled',
    report.privacy.videoLeavesDevice ? 'video leaves device' : 'video stays local',
  ];
  const privacyStatus =
    report.engine.uploadsVideo || report.privacy.videoLeavesDevice || containsForbiddenEvidence(privacyEvidence)
      ? 'blocked'
      : 'pass';

  return AnalysisEvidenceTimelineSchema.parse({
    generatedAt: options.generatedAt ?? report.performance.measuredAt ?? report.session.createdAt,
    schemaVersion: analysisEvidenceSchemaVersion,
    steps: [
      {
        category: 'input',
        detail: `${report.session.source} source, ${Math.round(report.session.durationMs / 1000)}s attempt, ${report.session.wallAngle} wall.`,
        evidence: `${report.session.gym} · ${report.session.grade}`,
        id: 'input-normalized',
        label: 'Input normalized',
        status: 'pass',
      },
      {
        category: 'pose',
        detail: `${report.engine.processedFrames} pose frames processed by ${report.engine.provider}.`,
        evidence: `${report.engine.model} · on-device ${report.engine.runsOnDevice ? 'yes' : 'no'}`,
        id: 'pose-provider',
        label: 'Pose provider',
        status: report.engine.processedFrames < 10 ? 'review' : 'pass',
      },
      {
        category: 'quality',
        detail: `Quality ${report.analysisQuality.score}/100, frames ${formatPercent(report.analysisQuality.frameCoverage)}, visibility ${formatPercent(report.analysisQuality.averageVisibility)}.`,
        evidence: report.analysisQuality.warnings[0] ?? 'No quality warnings.',
        id: 'quality-gate',
        label: 'Signal quality',
        status: qualityStatus,
      },
      {
        category: 'metrics',
        detail: `${report.metrics.length} metrics, ${report.cues.length} cues, ${report.timeline.length} movement markers.`,
        evidence: report.cues[0]?.title ?? 'No correction cue crossed the configured threshold.',
        id: 'metric-cue-generation',
        label: 'Cue generation',
        status: report.metrics.length === 0 ? 'blocked' : report.cues.length === 0 ? 'review' : 'pass',
      },
      {
        category: 'performance',
        detail: `${Math.round(report.performance.analysisMs)}ms runtime, ${report.performance.framesPerSecond.toFixed(1)} fps, budget ${report.performance.budgetStatus}.`,
        evidence:
          report.performance.budgetStatus === 'not-measured'
            ? 'Performance is not measured on this legacy report.'
            : `${Math.round(report.performance.budgetMs)}ms configured budget.`,
        id: 'performance-budget',
        label: 'Runtime budget',
        status: performanceStatus,
      },
      {
        category: 'privacy',
        detail: report.engine.uploadsVideo || report.privacy.videoLeavesDevice ? 'Review data boundary before sharing.' : 'Raw video upload disabled for this report.',
        evidence: `Stored artifacts: ${report.privacy.storedArtifacts.join(', ')}`,
        id: 'privacy-boundary',
        label: 'Privacy boundary',
        status: privacyStatus,
      },
    ],
  });
}

export function attachAnalysisEvidence(
  report: LocalAnalysisReport,
  options: { generatedAt?: string } = {},
): LocalAnalysisReport {
  return LocalAnalysisReportSchema.parse({
    ...report,
    analysisEvidence: buildAnalysisEvidenceTimeline(report, options),
  });
}
