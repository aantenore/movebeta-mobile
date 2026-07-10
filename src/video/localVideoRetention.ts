import type { VideoAsset } from '@/movement/contracts';

const registryKey = 'movebeta.owned-camera-videos.v1';

function storage() {
  return typeof globalThis.localStorage === 'undefined' ? null : globalThis.localStorage;
}

function readRegistry() {
  const value = storage()?.getItem(registryKey);
  if (!value) return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed.filter((uri): uri is string => typeof uri === 'string' && uri.startsWith('file:')) : [];
  } catch {
    storage()?.removeItem(registryKey);
    return [];
  }
}

function writeRegistry(uris: string[]) {
  if (uris.length === 0) {
    storage()?.removeItem(registryKey);
    return;
  }
  storage()?.setItem(registryKey, JSON.stringify([...new Set(uris)]));
}

export function registerOwnedCameraVideo(uri: string) {
  if (!uri.startsWith('file:')) return false;
  writeRegistry([...readRegistry(), uri]);
  return true;
}

export function listOwnedCameraVideos() {
  return readRegistry();
}

export function unregisterOwnedCameraVideo(uri: string) {
  writeRegistry(readRegistry().filter((candidate) => candidate !== uri));
}

export async function removeOwnedCameraVideo(video: VideoAsset | string | null | undefined) {
  const uri = typeof video === 'string' ? video : video?.source === 'camera' ? video.uri : undefined;
  if (!uri?.startsWith('file:')) return false;

  const fileSystem = await import('expo-file-system/legacy');
  await fileSystem.deleteAsync(uri, { idempotent: true });
  unregisterOwnedCameraVideo(uri);
  return true;
}

export async function cleanupOwnedCameraVideos() {
  const uris = readRegistry();
  const failed: string[] = [];
  for (const uri of uris) {
    try {
      await removeOwnedCameraVideo(uri);
    } catch {
      failed.push(uri);
    }
  }
  writeRegistry(failed);
  return { failed: failed.length, removed: uris.length - failed.length };
}
