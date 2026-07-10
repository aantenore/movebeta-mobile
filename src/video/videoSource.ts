import type { ImagePickerAsset } from 'expo-image-picker';

import { ClimbSessionSchema, VideoAssetSchema, type ClimbSession, type VideoAsset } from '@/movement/contracts';

import { videoAnalysisConfig } from './videoConfig';

export type VideoSourceResult = {
  label: string;
  session: ClimbSession;
  video: VideoAsset;
};

export type WallAngle = ClimbSession['wallAngle'];

export type SessionMetadataInput = Partial<Pick<ClimbSession, 'grade' | 'gym' | 'title' | 'wallAngle'>>;

type VideoSourceInput = {
  capturedAt?: string;
  durationMs?: number | null;
  fileName?: string | null;
  height?: number | null;
  id?: string;
  session?: SessionMetadataInput;
  source: Extract<VideoAsset['source'], 'camera' | 'import'>;
  uri: string;
  width?: number | null;
};

const sourceLabels: Record<VideoSourceInput['source'], string> = {
  camera: 'Recorded attempt',
  import: 'Imported attempt',
};

let videoSourceSequence = 0;

export const wallAngleOptions: WallAngle[] = ['slab', 'vertical', 'overhang'];

function hashText(value: string) {
  let hash = 0;
  for (let index = 0; index < value.length; index += 1) {
    hash = (hash << 5) - hash + value.charCodeAt(index);
    hash |= 0;
  }
  return Math.abs(hash).toString(36);
}

function normalizePositiveNumber(value: number | null | undefined, fallback: number) {
  if (!value || Number.isNaN(value) || value <= 0) return fallback;
  return value;
}

function normalizeDurationMs(value: number | null | undefined) {
  return normalizePositiveNumber(value, videoAnalysisConfig.defaultDurationMs);
}

function buildVideoId(input: VideoSourceInput, capturedAt: string) {
  if (input.id) return input.id;
  videoSourceSequence += 1;
  return `video-${input.source}-${hashText(`${input.uri}:${capturedAt}:${videoSourceSequence}`)}`;
}

function buildSessionTitle(source: VideoSourceInput['source'], fileName?: string | null) {
  if (fileName) return fileName.replace(/\.[a-z0-9]+$/i, '');
  return sourceLabels[source];
}

function normalizeText(value: string | null | undefined, fallback: string) {
  const trimmed = value?.trim();
  return trimmed ? trimmed.slice(0, 80) : fallback;
}

export function normalizeSessionMetadata(input: SessionMetadataInput | undefined, fallbackTitle: string) {
  return {
    grade: normalizeText(input?.grade, videoAnalysisConfig.defaultSession.grade),
    gym: normalizeText(input?.gym, videoAnalysisConfig.defaultSession.gym),
    title: normalizeText(input?.title, fallbackTitle),
    wallAngle:
      input?.wallAngle && wallAngleOptions.includes(input.wallAngle)
        ? input.wallAngle
        : videoAnalysisConfig.defaultSession.wallAngle,
  };
}

export function createVideoSource(input: VideoSourceInput): VideoSourceResult {
  const capturedAt = input.capturedAt ?? new Date().toISOString();
  const fallbackTitle = buildSessionTitle(input.source, input.fileName);
  const sessionMetadata = normalizeSessionMetadata(input.session, fallbackTitle);
  const video = VideoAssetSchema.parse({
    capturedAt,
    durationMs: normalizeDurationMs(input.durationMs),
    height: normalizePositiveNumber(input.height, videoAnalysisConfig.defaultHeight),
    id: buildVideoId(input, capturedAt),
    source: input.source,
    uri: input.uri,
    width: normalizePositiveNumber(input.width, videoAnalysisConfig.defaultWidth),
  });
  const session = ClimbSessionSchema.parse({
    createdAt: capturedAt,
    durationMs: video.durationMs,
    grade: sessionMetadata.grade,
    gym: sessionMetadata.gym,
    id: `session-${video.id}`,
    source: video.source,
    title: sessionMetadata.title,
    wallAngle: sessionMetadata.wallAngle,
  });

  return {
    label: `${sourceLabels[input.source]} · ${(video.durationMs / 1000).toFixed(1)}s`,
    session,
    video,
  };
}

export function createCameraVideoSource(input: Omit<VideoSourceInput, 'source'>) {
  return createVideoSource({ ...input, source: 'camera' });
}

export function createImportedVideoSource(asset: ImagePickerAsset) {
  return createVideoSource({
    durationMs: asset.duration,
    fileName: asset.fileName,
    height: asset.height,
    source: 'import',
    uri: asset.uri,
    width: asset.width,
  });
}

export function createImportedVideoSourceWithSession(asset: ImagePickerAsset, session: SessionMetadataInput) {
  return createVideoSource({
    durationMs: asset.duration,
    fileName: asset.fileName,
    height: asset.height,
    session,
    source: 'import',
    uri: asset.uri,
    width: asset.width,
  });
}

export function updateVideoSourceSession(source: VideoSourceResult, session: SessionMetadataInput) {
  const metadata = normalizeSessionMetadata(session, source.session.title);
  return {
    ...source,
    session: ClimbSessionSchema.parse({
      ...source.session,
      ...metadata,
    }),
  };
}
