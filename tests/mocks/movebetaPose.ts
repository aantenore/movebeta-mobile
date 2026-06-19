import type { NativePoseEstimatorInput, NativeVideoMetadataInput } from '../../modules/movebeta-pose/src';

export async function isNativePoseAvailable() {
  return false;
}

export async function estimateNativePoseFrames(input: NativePoseEstimatorInput) {
  throw new Error(`${input.provider} requires a custom Expo development build with the MoveBetaPose native module.`);
}

export async function getNativeVideoMetadata(input: NativeVideoMetadataInput) {
  throw new Error(`Native video metadata requires a custom Expo development build for ${input.uri}.`);
}
