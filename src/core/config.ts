import Constants from 'expo-constants';
import { z } from 'zod';

import { AnalysisProviderSchema, CoachLensKeySchema, PrivacyModeSchema } from '@/movement/contracts';
import { resolveCoachLensKey } from '@/movement/coachLens';

import {
  BillingReadinessConfigSchema,
  defaultBillingReadinessConfig,
  parseBillingReadinessConfig,
  type BillingReadinessConfig,
} from './billingReadiness';
import { PlanKeySchema } from './entitlements';
import { LaunchReadinessEvidenceSchema, type LaunchReadinessEvidence } from './launchReadiness';
import {
  defaultModelEvidenceConfig,
  ModelEvidenceConfigSchema,
  parseModelEvidenceConfig,
  type ModelEvidenceConfig,
} from './modelEvidence';

const ConfigSchema = z.object({
  activePlan: PlanKeySchema,
  analysisProvider: AnalysisProviderSchema,
  videoAnalysisProvider: AnalysisProviderSchema,
  nativeVideoAnalysisProvider: AnalysisProviderSchema.optional(),
  coachLens: CoachLensKeySchema,
  privacyMode: PrivacyModeSchema,
  officialApiBaseUrl: z.string().url().optional(),
  billingReadiness: BillingReadinessConfigSchema,
  launchReadinessEvidence: LaunchReadinessEvidenceSchema.optional(),
  modelEvidence: ModelEvidenceConfigSchema.optional(),
});

const expoExtra = Constants.expoConfig?.extra ?? {};
const isNativeRuntime = typeof navigator !== 'undefined' && navigator.product === 'ReactNative';
const configuredVideoProvider =
  isNativeRuntime ? expoExtra.nativeVideoAnalysisProvider ?? expoExtra.videoAnalysisProvider : expoExtra.videoAnalysisProvider;

export function resolveLaunchReadinessEvidence(value: unknown): LaunchReadinessEvidence | undefined {
  if (value === undefined || value === null || value === '') return undefined;
  const parsed = typeof value === 'string' ? JSON.parse(value) : value;
  return LaunchReadinessEvidenceSchema.parse(parsed);
}

export function resolveModelEvidence(value: unknown): ModelEvidenceConfig | undefined {
  return parseModelEvidenceConfig(value);
}

export function resolveBillingReadinessConfig(value: unknown): BillingReadinessConfig | undefined {
  return parseBillingReadinessConfig(value);
}

export function resolveConfiguredCoachLens(value: unknown) {
  return resolveCoachLensKey(value);
}

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
    expoExtra.nativeVideoAnalysisProvider ??
    'native-platform-pose',
  coachLens: resolveConfiguredCoachLens(process.env.EXPO_PUBLIC_MOVEBETA_COACH_LENS ?? expoExtra.coachLens ?? 'balanced'),
  privacyMode:
    process.env.EXPO_PUBLIC_MOVEBETA_PRIVACY_MODE ??
    expoExtra.privacyMode ??
    'on-device',
  officialApiBaseUrl: process.env.EXPO_PUBLIC_MOVEBETA_API_BASE_URL,
  billingReadiness:
    resolveBillingReadinessConfig(process.env.EXPO_PUBLIC_MOVEBETA_BILLING_READINESS ?? expoExtra.billingReadiness) ??
    defaultBillingReadinessConfig,
  launchReadinessEvidence: resolveLaunchReadinessEvidence(
    process.env.EXPO_PUBLIC_MOVEBETA_LAUNCH_READINESS_EVIDENCE ?? expoExtra.launchReadinessEvidence,
  ),
  modelEvidence:
    resolveModelEvidence(process.env.EXPO_PUBLIC_MOVEBETA_MODEL_EVIDENCE ?? expoExtra.modelEvidence) ?? defaultModelEvidenceConfig,
});

export type AppConfig = z.infer<typeof ConfigSchema>;
