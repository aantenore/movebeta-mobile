import { getNativeVideoMetadata, isNativePoseAvailable } from 'movebeta-pose';

import { videoAnalysisConfig } from './videoConfig';

export type VideoMetadataInput = {
  durationMs?: number | null;
  height?: number | null;
  uri: string;
  width?: number | null;
};

export type VideoMetadataResult = {
  durationMs: number;
  height: number;
  source: 'native' | 'browser' | 'fallback';
  uri: string;
  warnings: string[];
  width: number;
};

export type VideoMetadataReader = (input: VideoMetadataInput) => Promise<Partial<VideoMetadataInput> | null>;

const metadataTimeoutMs = 10_000;

function hasBrowserVideoRuntime() {
  return typeof document !== 'undefined' && typeof HTMLVideoElement !== 'undefined';
}

function positiveNumber(value: number | null | undefined, fallback: number) {
  return typeof value === 'number' && Number.isFinite(value) && value > 0 ? value : fallback;
}

function normalizeVideoMetadata(
  input: VideoMetadataInput,
  metadata: Partial<VideoMetadataInput> | null,
  source: VideoMetadataResult['source'],
  warnings: string[] = [],
): VideoMetadataResult {
  return {
    durationMs: positiveNumber(metadata?.durationMs ?? input.durationMs, videoAnalysisConfig.defaultDurationMs),
    height: positiveNumber(metadata?.height ?? input.height, videoAnalysisConfig.defaultHeight),
    source,
    uri: input.uri,
    warnings,
    width: positiveNumber(metadata?.width ?? input.width, videoAnalysisConfig.defaultWidth),
  };
}

async function readNativeMetadata(input: VideoMetadataInput) {
  if (!(await isNativePoseAvailable('native-platform-pose'))) {
    return null;
  }

  return getNativeVideoMetadata({
    durationMs: input.durationMs ?? undefined,
    height: input.height ?? undefined,
    uri: input.uri,
    width: input.width ?? undefined,
  });
}

function waitForVideoMetadata(element: HTMLVideoElement) {
  return new Promise<void>((resolve, reject) => {
    const timeout = window.setTimeout(() => {
      cleanup();
      reject(new Error('Timed out while reading video metadata.'));
    }, metadataTimeoutMs);

    const onLoaded = () => {
      cleanup();
      resolve();
    };
    const onError = () => {
      cleanup();
      reject(new Error('Video metadata could not be read.'));
    };
    const cleanup = () => {
      window.clearTimeout(timeout);
      element.removeEventListener('loadedmetadata', onLoaded);
      element.removeEventListener('error', onError);
    };

    element.addEventListener('loadedmetadata', onLoaded, { once: true });
    element.addEventListener('error', onError, { once: true });
  });
}

async function readBrowserMetadata(input: VideoMetadataInput) {
  if (!hasBrowserVideoRuntime()) return null;

  const element = document.createElement('video');
  element.muted = true;
  element.playsInline = true;
  element.preload = 'metadata';
  element.src = input.uri;
  element.load();

  try {
    if (element.readyState < HTMLMediaElement.HAVE_METADATA) {
      await waitForVideoMetadata(element);
    }

    return {
      durationMs: Number.isFinite(element.duration) ? element.duration * 1000 : input.durationMs,
      height: element.videoHeight || input.height,
      uri: input.uri,
      width: element.videoWidth || input.width,
    };
  } finally {
    element.removeAttribute('src');
    element.load();
    element.remove();
  }
}

export async function readLocalVideoMetadata(
  input: VideoMetadataInput,
  readers: { browser?: VideoMetadataReader; native?: VideoMetadataReader } = {},
): Promise<VideoMetadataResult> {
  const warnings: string[] = [];
  const nativeReader = readers.native ?? readNativeMetadata;
  const browserReader = readers.browser ?? readBrowserMetadata;

  try {
    const nativeMetadata = await nativeReader(input);
    if (nativeMetadata) {
      return normalizeVideoMetadata(input, nativeMetadata, 'native');
    }
  } catch (error) {
    warnings.push(error instanceof Error ? error.message : 'Native video metadata could not be read.');
  }

  try {
    const browserMetadata = await browserReader(input);
    if (browserMetadata) {
      return normalizeVideoMetadata(input, browserMetadata, 'browser', warnings);
    }
  } catch (error) {
    warnings.push(error instanceof Error ? error.message : 'Browser video metadata could not be read.');
  }

  return normalizeVideoMetadata(input, null, 'fallback', warnings);
}
