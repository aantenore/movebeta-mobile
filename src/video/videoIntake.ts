import type { VideoAsset } from '@/movement/contracts';

import { videoAnalysisConfig } from './videoConfig';

export type VideoIntakeSeverity = 'info' | 'warning' | 'block';
export type VideoIntakeStatus = 'ready' | 'review' | 'blocked';

export type VideoIntakeIssue = {
  detail: string;
  id: string;
  severity: VideoIntakeSeverity;
  title: string;
};

export type VideoIntakeAssessment = {
  action: string;
  canAnalyze: boolean;
  durationLabel: string;
  expectedFrames: number;
  issues: VideoIntakeIssue[];
  resolutionLabel: string;
  sourceLabel: string;
  status: VideoIntakeStatus;
  title: string;
};

const localSchemes = ['file:', 'ph:', 'content:', 'asset-library:', 'blob:', 'data:', 'fixture:'];

function isDevelopmentHost(hostname: string) {
  return hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '0.0.0.0' || hostname === '[::1]';
}

export function isLocalVideoUri(uri: string) {
  const trimmed = uri.trim();
  if (!trimmed) return false;

  if (localSchemes.some((scheme) => trimmed.toLowerCase().startsWith(scheme))) {
    return true;
  }

  try {
    const parsed = new URL(trimmed);
    return (parsed.protocol === 'http:' || parsed.protocol === 'https:') && isDevelopmentHost(parsed.hostname);
  } catch {
    return !trimmed.includes('://');
  }
}

export function estimateSampledFrameCount(durationMs: number) {
  const requested = Math.ceil(durationMs / videoAnalysisConfig.tfjsFrameIntervalMs);
  return Math.max(videoAnalysisConfig.minTfjsFrames, Math.min(videoAnalysisConfig.maxTfjsFrames, requested));
}

export function formatVideoDuration(durationMs: number) {
  const totalSeconds = Math.max(0, Math.floor(durationMs / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

function sourceLabel(source: VideoAsset['source']) {
  if (source === 'camera') return 'Camera recording';
  if (source === 'import') return 'Imported video';
  return 'Bundled fixture';
}

function addIssue(issues: VideoIntakeIssue[], issue: VideoIntakeIssue) {
  issues.push(issue);
}

export function assessVideoIntake(video: VideoAsset): VideoIntakeAssessment {
  const issues: VideoIntakeIssue[] = [];
  const shortSide = Math.min(video.width, video.height);
  const longSide = Math.max(video.width, video.height);
  const expectedFrames = estimateSampledFrameCount(video.durationMs);

  if (!video.uri.trim()) {
    addIssue(issues, {
      detail: 'The selected clip does not include a readable local URI.',
      id: 'missing-uri',
      severity: 'block',
      title: 'Missing video file',
    });
  } else if (!isLocalVideoUri(video.uri)) {
    addIssue(issues, {
      detail: 'Remote video URLs are rejected so the default workflow stays on-device.',
      id: 'remote-uri',
      severity: 'block',
      title: 'Remote video source',
    });
  }

  if (video.durationMs < videoAnalysisConfig.minimumDurationMs) {
    addIssue(issues, {
      detail: `Record at least ${(videoAnalysisConfig.minimumDurationMs / 1000).toFixed(1)} seconds so the pose pipeline can sample enough movement.`,
      id: 'too-short',
      severity: 'block',
      title: 'Clip is too short',
    });
  }

  if (video.durationMs > videoAnalysisConfig.maxImportDurationSeconds * 1000) {
    addIssue(issues, {
      detail: `Trim to under ${videoAnalysisConfig.maxImportDurationSeconds} seconds for faster local processing and clearer cues.`,
      id: 'too-long',
      severity: 'warning',
      title: 'Long clip',
    });
  } else if (video.durationMs > videoAnalysisConfig.recommendedAnalysisDurationMs) {
    addIssue(issues, {
      detail: 'Short attempts are easier to analyze locally and usually produce more actionable technique cues.',
      id: 'review-duration',
      severity: 'warning',
      title: 'Review clip length',
    });
  }

  if (shortSide < videoAnalysisConfig.minimumShortSidePx || longSide < videoAnalysisConfig.minimumLongSidePx) {
    addIssue(issues, {
      detail: `Use at least ${videoAnalysisConfig.minimumShortSidePx}x${videoAnalysisConfig.minimumLongSidePx}px so hands, hips, and feet remain visible.`,
      id: 'low-resolution',
      severity: 'warning',
      title: 'Low resolution',
    });
  }

  if (expectedFrames < videoAnalysisConfig.minTfjsFrames) {
    addIssue(issues, {
      detail: 'The configured sampler would not collect enough frames for a reliable local report.',
      id: 'low-frame-sample',
      severity: 'block',
      title: 'Not enough frames',
    });
  }

  const hasBlocker = issues.some((issue) => issue.severity === 'block');
  const hasWarning = issues.some((issue) => issue.severity === 'warning');
  const status: VideoIntakeStatus = hasBlocker ? 'blocked' : hasWarning ? 'review' : 'ready';

  return {
    action: hasBlocker
      ? 'Choose a different local clip or record a longer attempt before analysis.'
      : hasWarning
        ? 'Analysis can run, but a cleaner clip may improve pose confidence.'
        : 'Clip is ready for local pose analysis.',
    canAnalyze: !hasBlocker,
    durationLabel: formatVideoDuration(video.durationMs),
    expectedFrames,
    issues,
    resolutionLabel: `${video.width}x${video.height}`,
    sourceLabel: sourceLabel(video.source),
    status,
    title: hasBlocker ? 'Clip needs attention' : hasWarning ? 'Clip can be analyzed with caveats' : 'Clip ready',
  };
}
