import type { LocalAnalysisReport, MovementCue, MovementMetric, TimelineEvent } from './contracts';

export type SessionReviewStatus = 'strong' | 'review' | 'risk';

export type SessionTimelineMarker = {
  id: string;
  label: string;
  positionPercent: number;
  timeLabel: string;
  timestampMs: number;
  type: TimelineEvent['type'] | 'cue';
};

export type SessionReviewFact = {
  detail: string;
  label: string;
  value: string;
};

export type SessionReviewDetail = {
  bestMetric: MovementMetric | null;
  focusMetric: MovementMetric | null;
  performanceFacts: SessionReviewFact[];
  primaryCue: MovementCue | null;
  privacyFacts: SessionReviewFact[];
  qualityFacts: SessionReviewFact[];
  status: SessionReviewStatus;
  summary: string;
  timelineMarkers: SessionTimelineMarker[];
  title: string;
};

function formatTimestamp(timestampMs: number) {
  const seconds = Math.max(0, Math.floor(timestampMs / 1000));
  const minutes = Math.floor(seconds / 60);
  return `${minutes}:${(seconds % 60).toString().padStart(2, '0')}`;
}

function clampPercent(value: number) {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function percent(value: number) {
  return `${Math.round(value * 100)}%`;
}

function metricByScore(reports: MovementMetric[], direction: 'best' | 'focus') {
  if (reports.length === 0) return null;
  return [...reports].sort((a, b) => (direction === 'best' ? b.score - a.score : a.score - b.score))[0];
}

function cuePriority(cue: MovementCue) {
  if (cue.severity === 'fix') return 0;
  if (cue.severity === 'watch') return 1;
  return 2;
}

function primaryCue(cues: MovementCue[]) {
  if (cues.length === 0) return null;
  return [...cues].sort((a, b) => cuePriority(a) - cuePriority(b) || a.timestampMs - b.timestampMs)[0];
}

function buildStatus(report: LocalAnalysisReport): { status: SessionReviewStatus; summary: string; title: string } {
  const hasQualityWarnings = report.analysisQuality.warnings.length > 0;
  const overBudget = report.performance.budgetStatus === 'over-budget';
  const lowQuality = report.analysisQuality.score < 70;

  if (lowQuality || overBudget) {
    return {
      status: 'risk',
      summary: 'Retake or review this attempt before trusting the cue timing.',
      title: 'Needs retake review',
    };
  }

  if (hasQualityWarnings || report.analysisQuality.score < 85) {
    return {
      status: 'review',
      summary: 'Use the cues, but compare them with the video before changing beta.',
      title: 'Usable with caveats',
    };
  }

  return {
    status: 'strong',
    summary: 'Signal quality is strong enough for a focused repeat plan.',
    title: 'Ready for repeat plan',
  };
}

function buildTimelineMarkers(report: LocalAnalysisReport): SessionTimelineMarker[] {
  const durationMs = Math.max(1, report.session.durationMs);
  const timelineMarkers = report.timeline.map((event) => ({
    id: `event-${event.id}`,
    label: event.label,
    positionPercent: clampPercent((event.timestampMs / durationMs) * 100),
    timeLabel: formatTimestamp(event.timestampMs),
    timestampMs: event.timestampMs,
    type: event.type,
  }));
  const cueMarkers = report.cues.map((cue) => ({
    id: `cue-${cue.id}`,
    label: cue.title,
    positionPercent: clampPercent((cue.timestampMs / durationMs) * 100),
    timeLabel: formatTimestamp(cue.timestampMs),
    timestampMs: cue.timestampMs,
    type: 'cue' as const,
  }));

  return [...timelineMarkers, ...cueMarkers].sort((a, b) => a.timestampMs - b.timestampMs || a.id.localeCompare(b.id));
}

export function buildSessionReviewDetail(report: LocalAnalysisReport): SessionReviewDetail {
  const status = buildStatus(report);
  const focusMetric = metricByScore(report.metrics, 'focus');
  const bestMetric = metricByScore(report.metrics, 'best');

  return {
    bestMetric,
    focusMetric,
    performanceFacts: [
      {
        detail: 'Local analysis duration for this report.',
        label: 'Runtime',
        value: `${(report.performance.analysisMs / 1000).toFixed(1)}s`,
      },
      {
        detail: 'Processed pose frames per second of analysis time.',
        label: 'Throughput',
        value: `${report.performance.framesPerSecond.toFixed(1)} fps`,
      },
      {
        detail: 'Configured local analysis performance budget status.',
        label: 'Budget',
        value: report.performance.budgetStatus,
      },
    ],
    primaryCue: primaryCue(report.cues),
    privacyFacts: [
      {
        detail: 'Default data flow for this local report.',
        label: 'Video upload',
        value: report.privacy.videoLeavesDevice ? 'enabled' : 'off',
      },
      {
        detail: 'Artifacts persisted by the local repository.',
        label: 'Stored',
        value: report.privacy.storedArtifacts.join(', '),
      },
    ],
    qualityFacts: [
      {
        detail: 'Combined frame coverage, landmark coverage, and visibility.',
        label: 'Quality',
        value: `${report.analysisQuality.score}/100`,
      },
      {
        detail: 'Share of expected sampled frames that produced pose data.',
        label: 'Frames',
        value: percent(report.analysisQuality.frameCoverage),
      },
      {
        detail: 'Average visibility across required landmarks.',
        label: 'Visibility',
        value: percent(report.analysisQuality.averageVisibility),
      },
    ],
    status: status.status,
    summary: status.summary,
    timelineMarkers: buildTimelineMarkers(report),
    title: status.title,
  };
}
