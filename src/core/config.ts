import Constants from 'expo-constants';
import { z } from 'zod';

import appJson from '../../app.json';
import {
  AnalysisProviderSchema,
  CoachLensKeySchema,
  PrivacyModeSchema,
  type AnalysisProvider,
} from '@/movement/contracts';
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
  appVersion: z.string().min(1),
  analysisProvider: AnalysisProviderSchema,
  videoAnalysisProvider: AnalysisProviderSchema,
  nativeVideoAnalysisProvider: z.literal('native-platform-pose').optional(),
  tfjsMoveNetModelUrl: z.string().min(1).optional(),
  coachLens: CoachLensKeySchema,
  privacyMode: PrivacyModeSchema,
  officialApiBaseUrl: z.string().url().optional(),
  releaseRepository: z.string().optional(),
  billingReadiness: BillingReadinessConfigSchema,
  launchReadinessEvidence: LaunchReadinessEvidenceSchema.optional(),
  modelEvidence: ModelEvidenceConfigSchema.optional(),
});

type ExtraConfig = Record<string, unknown>;

function isExtraConfig(value: unknown): value is ExtraConfig {
  return Boolean(value && typeof value === 'object' && !Array.isArray(value));
}

export function resolveExpoExtra(runtimeExtra: unknown, bundledExtra: unknown = appJson.expo.extra): ExtraConfig {
  const runtime = isExtraConfig(runtimeExtra) ? runtimeExtra : {};
  const bundled = isExtraConfig(bundledExtra) ? bundledExtra : {};
  // Expo web can keep a stale legacy manifest next to the current bundled app config after export.
  return { ...runtime, ...bundled };
}

const expoExtra = resolveExpoExtra(Constants.expoConfig?.extra);
const isNativeRuntime = typeof navigator !== 'undefined' && navigator.product === 'ReactNative';

export function resolveRuntimeVideoAnalysisProvider({
  nativeProvider,
  nativeRuntime,
  webProvider,
}: {
  nativeProvider?: unknown;
  nativeRuntime: boolean;
  webProvider?: unknown;
}): AnalysisProvider {
  if (nativeRuntime) {
    return z.literal('native-platform-pose').parse(nativeProvider ?? 'native-platform-pose');
  }
  return z.literal('web-tfjs-movenet').parse(webProvider ?? 'web-tfjs-movenet');
}

const configuredWebVideoProvider =
  process.env.EXPO_PUBLIC_MOVEBETA_VIDEO_ANALYSIS_PROVIDER ?? expoExtra.videoAnalysisProvider;
const configuredNativeVideoProvider =
  process.env.EXPO_PUBLIC_MOVEBETA_NATIVE_VIDEO_ANALYSIS_PROVIDER ?? expoExtra.nativeVideoAnalysisProvider;

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
  appVersion: appJson.expo.version,
  analysisProvider:
    process.env.EXPO_PUBLIC_MOVEBETA_ANALYSIS_PROVIDER ??
    expoExtra.analysisProvider ??
    'local-fixture',
  videoAnalysisProvider: resolveRuntimeVideoAnalysisProvider({
    nativeProvider: configuredNativeVideoProvider,
    nativeRuntime: isNativeRuntime,
    webProvider: configuredWebVideoProvider,
  }),
  nativeVideoAnalysisProvider: configuredNativeVideoProvider ?? 'native-platform-pose',
  tfjsMoveNetModelUrl:
    process.env.EXPO_PUBLIC_MOVEBETA_TFJS_MOVENET_MODEL_URL ??
    (typeof expoExtra.tfjsMoveNetModelUrl === 'string' ? expoExtra.tfjsMoveNetModelUrl : undefined),
  coachLens: resolveConfiguredCoachLens(process.env.EXPO_PUBLIC_MOVEBETA_COACH_LENS ?? expoExtra.coachLens ?? 'balanced'),
  privacyMode:
    process.env.EXPO_PUBLIC_MOVEBETA_PRIVACY_MODE ??
    expoExtra.privacyMode ??
    'on-device',
  officialApiBaseUrl: process.env.EXPO_PUBLIC_MOVEBETA_API_BASE_URL,
  releaseRepository:
    process.env.EXPO_PUBLIC_MOVEBETA_RELEASE_REPOSITORY ??
    (typeof expoExtra.releaseRepository === 'string' ? expoExtra.releaseRepository : undefined),
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
