import { VideoAssetSchema, type AnalysisWindowMode, type VideoAnalysisWindow, type VideoAsset } from '@/movement/contracts';

import { formatVideoDuration } from './videoIntake';
import { videoAnalysisConfig } from './videoConfig';

export const analysisWindowModes = videoAnalysisConfig.analysisWindow.modes;

function clampWindow(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function buildStartMs(durationMs: number, windowDurationMs: number, mode: AnalysisWindowMode) {
  const maxStartMs = Math.max(0, durationMs - windowDurationMs);
  if (mode === 'early') return 0;
  if (mode === 'late') return maxStartMs;
  return Math.round(maxStartMs / 2);
}

export function buildVideoAnalysisWindow(video: VideoAsset, mode: AnalysisWindowMode): VideoAnalysisWindow {
  const sourceDurationMs = Math.max(1, Math.round(video.durationMs));
  if (mode === 'full' || sourceDurationMs <= videoAnalysisConfig.recommendedAnalysisDurationMs) {
    return {
      durationMs: sourceDurationMs,
      endMs: sourceDurationMs,
      mode: 'full',
      sourceDurationMs,
      startMs: 0,
    };
  }

  const durationMs = Math.min(sourceDurationMs, videoAnalysisConfig.recommendedAnalysisDurationMs);
  const startMs = buildStartMs(sourceDurationMs, durationMs, mode);
  const endMs = clampWindow(startMs + durationMs, durationMs, sourceDurationMs);

  return {
    durationMs: endMs - startMs,
    endMs,
    mode,
    sourceDurationMs,
    startMs,
  };
}

export function resolveVideoAnalysisWindow(video: VideoAsset) {
  return video.analysisWindow ?? buildVideoAnalysisWindow(video, 'full');
}

export function withVideoAnalysisWindow(video: VideoAsset, mode: AnalysisWindowMode): VideoAsset {
  const analysisWindow = buildVideoAnalysisWindow(video, mode);
  return VideoAssetSchema.parse({
    ...video,
    analysisWindow: analysisWindow.mode === 'full' ? undefined : analysisWindow,
  });
}

export function activeVideoAnalysisDurationMs(video: VideoAsset) {
  return resolveVideoAnalysisWindow(video).durationMs;
}

export function videoAnalysisWindowIsActive(video: VideoAsset) {
  return resolveVideoAnalysisWindow(video).mode !== 'full';
}

export function formatVideoAnalysisWindow(window: VideoAnalysisWindow) {
  if (window.mode === 'full') return `Full clip · ${formatVideoDuration(window.durationMs)}`;
  return `${formatVideoDuration(window.startMs)}-${formatVideoDuration(window.endMs)} · ${formatVideoDuration(window.durationMs)}`;
}
