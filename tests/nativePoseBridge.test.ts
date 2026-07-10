import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const rootDir = process.cwd();

function readProjectFile(relativePath: string) {
  return fs.readFileSync(path.join(rootDir, relativePath), 'utf8');
}

function expectAll(content: string, needles: string[]) {
  for (const needle of needles) {
    expect(content).toContain(needle);
  }
}

const requiredLandmarks = [
  'nose',
  'leftShoulder',
  'rightShoulder',
  'leftElbow',
  'rightElbow',
  'leftWrist',
  'rightWrist',
  'leftHip',
  'rightHip',
  'leftKnee',
  'rightKnee',
  'leftAnkle',
  'rightAnkle',
];

describe('native pose bridge contract', () => {
  it('exports the optional native module boundary expected by the app', () => {
    const source = readProjectFile('modules/movebeta-pose/src/index.ts');
    const moduleConfig = JSON.parse(readProjectFile('modules/movebeta-pose/expo-module.config.json'));

    expectAll(source, [
      "requireOptionalNativeModule<MoveBetaPoseNativeModule>('MoveBetaPose')",
      'estimatePosesAsync(input: NativePoseEstimatorInput): Promise<NativePoseFrame[]>',
      'getVideoMetadataAsync(input: NativeVideoMetadataInput): Promise<NativeVideoMetadata>',
      'isAvailableAsync(provider?: string): Promise<boolean>',
      'MoveBetaPose native module is not installed. Create a custom Expo development build.',
    ]);
    expect(moduleConfig.platforms).toEqual(['apple', 'android']);
    expect(moduleConfig.apple.modules).toEqual(['MoveBetaPoseModule']);
    expect(moduleConfig.android.modules).toEqual(['com.movebeta.pose.MoveBetaPoseModule']);
  });

  it('keeps the iOS provider backed by Apple Vision with local Photos resolution', () => {
    const source = readProjectFile('modules/movebeta-pose/ios/MoveBetaPoseModule.swift');
    const podspec = readProjectFile('modules/movebeta-pose/MoveBetaPose.podspec');

    expectAll(podspec, ['AVFoundation', 'Photos', 'Vision']);
    expectAll(source, [
      'Name("MoveBetaPose")',
      'provider == nil || provider == "native-platform-pose"',
      'VNDetectHumanBodyPoseRequest()',
      'AVAssetImageGenerator(asset: asset)',
      'PHImageManager.default().requestAVAsset',
      'options.isNetworkAccessAllowed = false',
      'Apple Vision did not return enough pose frames.',
      'let normalizedY = 1 - Double(point.location.y)',
      '"inFrame": normalizedX >= 0',
      '"y": clamp(normalizedY)',
    ]);

    for (const landmark of requiredLandmarks) {
      expect(source).toContain(`("${landmark}"`);
    }
  });

  it('keeps the Android provider backed by ML Kit frame extraction', () => {
    const source = readProjectFile('modules/movebeta-pose/android/src/main/java/com/movebeta/pose/MoveBetaPoseModule.kt');
    const gradle = readProjectFile('modules/movebeta-pose/android/build.gradle');

    expect(gradle).toContain("implementation 'com.google.mlkit:pose-detection-accurate:18.0.0-beta5'");
    expectAll(source, [
      'Name("MoveBetaPose")',
      'provider == null || provider == "native-platform-pose"',
      'PoseDetection.getClient',
      'AccuratePoseDetectorOptions.SINGLE_IMAGE_MODE',
      'MediaMetadataRetriever()',
      'retriever.getFrameAtTime',
      'InputImage.fromBitmap',
      'landmark.inFrameLikelihood',
      '"inFrame" to (normalizedX >= 0',
      'return@mapNotNull null',
      'ML Kit did not return enough pose frames.',
    ]);

    for (const landmark of requiredLandmarks) {
      expect(source).toContain(`"${landmark}"`);
    }
  });

  it('retains partially visible poses so the analyzer can report capture quality', () => {
    const iosSource = readProjectFile('modules/movebeta-pose/ios/MoveBetaPoseModule.swift');
    const androidSource = readProjectFile('modules/movebeta-pose/android/src/main/java/com/movebeta/pose/MoveBetaPoseModule.kt');

    expect(iosSource).toContain('continue');
    expect(iosSource).toContain('guard !landmarks.isEmpty');
    expect(androidSource).toContain('return@mapNotNull null');
    expect(androidSource).toContain('if (landmarks.isEmpty()) return null');
  });
});
