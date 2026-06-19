import Constants from 'expo-constants';
import { z } from 'zod';

import { PlanKeySchema } from './entitlements';

const AnalysisProviderSchema = z.enum([
  'local-fixture',
  'local-video-fallback',
  'web-tfjs-movenet',
  'native-platform-pose',
  'native-mediapipe',
  'native-coreml',
  'native-tflite',
]);

const ConfigSchema = z.object({
  activePlan: PlanKeySchema,
  analysisProvider: AnalysisProviderSchema,
  videoAnalysisProvider: AnalysisProviderSchema,
  nativeVideoAnalysisProvider: AnalysisProviderSchema.optional(),
  privacyMode: z.enum(['on-device', 'cloud-assisted']),
  officialApiBaseUrl: z.string().url().optional(),
});

const expoExtra = Constants.expoConfig?.extra ?? {};
const isNativeRuntime = typeof navigator !== 'undefined' && navigator.product === 'ReactNative';
const configuredVideoProvider =
  isNativeRuntime ? expoExtra.nativeVideoAnalysisProvider ?? expoExtra.videoAnalysisProvider : expoExtra.videoAnalysisProvider;

export const appConfig = ConfigSchema.parse({
  activePlan:
    process.env.EXPO_PUBLIC_MOVEBETA_ACTIVE_PLAN ??
    expoExtra.activePlan ??
    'free',
  analysisProvider:
    process.env.EXPO_PUBLIC_MOVEBETA_ANALYSIS_PROVIDER ??
    expoExtra.analysisProvider ??
    'local-fixture',
  videoAnalysisProvider:
    process.env.EXPO_PUBLIC_MOVEBETA_VIDEO_ANALYSIS_PROVIDER ??
    configuredVideoProvider ??
    'web-tfjs-movenet',
  nativeVideoAnalysisProvider:
    process.env.EXPO_PUBLIC_MOVEBETA_NATIVE_VIDEO_ANALYSIS_PROVIDER ??
    expoExtra.nativeVideoAnalysisProvider,
  privacyMode:
    process.env.EXPO_PUBLIC_MOVEBETA_PRIVACY_MODE ??
    expoExtra.privacyMode ??
    'on-device',
  officialApiBaseUrl: process.env.EXPO_PUBLIC_MOVEBETA_API_BASE_URL,
});

export type AppConfig = z.infer<typeof ConfigSchema>;
