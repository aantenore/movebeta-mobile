import type { VideoAsset } from '@/movement/contracts';

export async function removeOwnedCameraVideo(video: VideoAsset | string | null | undefined) {
  const uri = typeof video === 'string' ? video : video?.source === 'camera' ? video.uri : undefined;
  if (!uri?.startsWith('file:')) return false;

  const fileSystem = await import('expo-file-system/legacy');
  await fileSystem.deleteAsync(uri, { idempotent: true });
  return true;
}
