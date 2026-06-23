import { requireOptionalNativeModule } from 'expo';

export type NativePoseEstimatorInput = {
  analysisEndMs?: number;
  analysisStartMs?: number;
  durationMs: number;
  frameIntervalMs: number;
  height: number;
  maxFrames: number;
  minFrames: number;
  provider: string;
  uri: string;
  width: number;
};

export type NativeVideoMetadataInput = {
  durationMs?: number;
  height?: number;
  uri: string;
  width?: number;
};

export type NativeVideoMetadata = {
  durationMs: number;
  height: number;
  uri: string;
  width: number;
};

export type NativePoseLandmark = {
  name: string;
  visibility: number;
  x: number;
  y: number;
  z?: number;
};

export type NativePoseFrame = {
  timestampMs: number;
  landmarks: NativePoseLandmark[];
};

type MoveBetaPoseNativeModule = {
  estimatePosesAsync(input: NativePoseEstimatorInput): Promise<NativePoseFrame[]>;
  getVideoMetadataAsync(input: NativeVideoMetadataInput): Promise<NativeVideoMetadata>;
  isAvailableAsync(provider?: string): Promise<boolean>;
};

const MoveBetaPose = requireOptionalNativeModule<MoveBetaPoseNativeModule>('MoveBetaPose');

export async function isNativePoseAvailable(provider?: string) {
  if (!MoveBetaPose) return false;
  return MoveBetaPose.isAvailableAsync(provider);
}

export async function estimateNativePoseFrames(input: NativePoseEstimatorInput) {
  if (!MoveBetaPose) {
    throw new Error('MoveBetaPose native module is not installed. Create a custom Expo development build.');
  }

  return MoveBetaPose.estimatePosesAsync(input);
}

export async function getNativeVideoMetadata(input: NativeVideoMetadataInput) {
  if (!MoveBetaPose) {
    throw new Error('MoveBetaPose native module is not installed. Create a custom Expo development build.');
  }

  return MoveBetaPose.getVideoMetadataAsync(input);
}
