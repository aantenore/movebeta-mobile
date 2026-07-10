import { z } from 'zod';

import type { AnalysisProvider, PrivacyMode } from '@/movement/contracts';

export const ProviderReadinessStatusSchema = z.enum(['ready', 'review', 'blocked']);
export type ProviderReadinessStatus = z.infer<typeof ProviderReadinessStatusSchema>;

export const ProviderReadinessRuntimeSchema = z.enum(['web', 'native', 'test']);
export type ProviderReadinessRuntime = z.infer<typeof ProviderReadinessRuntimeSchema>;

export type ProviderReadinessCheck = {
  detail: string;
  id: string;
  label: string;
  status: ProviderReadinessStatus;
};

export type ProviderReadinessSummary = {
  action: string;
  failurePolicy: 'fail-closed';
  primaryProvider: AnalysisProvider;
  nativeProvider?: AnalysisProvider;
  checks: ProviderReadinessCheck[];
  runtime: ProviderReadinessRuntime;
  status: ProviderReadinessStatus;
  title: string;
};

type ProviderCapability = {
  availability: 'always' | 'runtime' | 'custom-native-build' | 'reserved' | 'test-only';
  detail: string;
  label: string;
  local: boolean;
};

type ProviderReadinessConfig = {
  nativeVideoAnalysisProvider?: AnalysisProvider;
  privacyMode: PrivacyMode;
  videoAnalysisProvider: AnalysisProvider;
};

const providerCapabilities: Record<AnalysisProvider, ProviderCapability> = {
  'local-fixture': {
    availability: 'always',
    detail: 'Deterministic bundled attempt provider for demos, tests, and design validation.',
    label: 'Fixture provider',
    local: true,
  },
  'local-video-fallback': {
    availability: 'test-only',
    detail: 'Synthetic pose frames for deterministic tests only; never valid evidence for recorded or imported video.',
    label: 'Synthetic video fixture',
    local: true,
  },
  'web-tfjs-movenet': {
    availability: 'runtime',
    detail: 'TensorFlow.js MoveNet runs in browser runtimes that can decode the selected local video.',
    label: 'Web MoveNet',
    local: true,
  },
  'native-platform-pose': {
    availability: 'custom-native-build',
    detail: 'Apple Vision on iOS and ML Kit on Android through the MoveBetaPose custom native module.',
    label: 'Native platform pose',
    local: true,
  },
  'native-mediapipe': {
    availability: 'reserved',
    detail: 'Reserved adapter slot for a future MediaPipe Pose Landmarker implementation.',
    label: 'Native MediaPipe',
    local: true,
  },
  'native-coreml': {
    availability: 'reserved',
    detail: 'Reserved adapter slot for a future custom Core ML model implementation.',
    label: 'Native Core ML',
    local: true,
  },
  'native-tflite': {
    availability: 'reserved',
    detail: 'Reserved adapter slot for a future TensorFlow Lite implementation.',
    label: 'Native TFLite',
    local: true,
  },
};

function mergeStatus(statuses: ProviderReadinessStatus[]): ProviderReadinessStatus {
  if (statuses.includes('blocked')) return 'blocked';
  if (statuses.includes('review')) return 'review';
  return 'ready';
}

function runtimeLabel(runtime: ProviderReadinessRuntime) {
  if (runtime === 'native') return 'native runtime';
  if (runtime === 'web') return 'web runtime';
  return 'test runtime';
}

function availabilityStatus(provider: AnalysisProvider, runtime: ProviderReadinessRuntime): ProviderReadinessStatus {
  const capability = providerCapabilities[provider];
  if (capability.availability === 'always') return 'ready';
  if (capability.availability === 'test-only') return runtime === 'test' ? 'ready' : 'blocked';
  if (capability.availability === 'reserved') return 'blocked';
  if (capability.availability === 'custom-native-build') return runtime === 'native' ? 'review' : 'review';
  if (provider === 'web-tfjs-movenet') return runtime === 'web' ? 'ready' : 'review';
  return 'review';
}

function providerCheck(id: string, label: string, provider: AnalysisProvider, runtime: ProviderReadinessRuntime): ProviderReadinessCheck {
  const capability = providerCapabilities[provider];
  const status = availabilityStatus(provider, runtime);
  const availabilityCopy =
    capability.availability === 'reserved'
      ? 'Reserved providers must not be selected until an adapter is installed.'
      : capability.availability === 'test-only'
        ? 'Synthetic providers are allowed only in tests and bundled demos.'
      : capability.availability === 'custom-native-build'
        ? 'Requires a custom Expo development or release build with MoveBetaPose linked.'
        : capability.availability === 'runtime'
          ? `Available when the ${runtimeLabel(runtime)} supports the required local video APIs.`
          : 'Always available for local analysis.';

  return {
    detail: `${provider}: ${capability.detail} ${availabilityCopy}`,
    id,
    label,
    status,
  };
}

function privacyCheck(config: Pick<ProviderReadinessConfig, 'privacyMode' | 'videoAnalysisProvider'>): ProviderReadinessCheck {
  const localProvider = providerCapabilities[config.videoAnalysisProvider]?.local === true;
  return {
    detail:
      config.privacyMode === 'on-device' && localProvider
        ? 'The configured analysis path keeps pose extraction local and excludes cloud upload by default.'
        : 'Review privacy mode or provider selection before claiming local-only analysis.',
    id: 'privacy-boundary',
    label: 'Local privacy boundary',
    status: config.privacyMode === 'on-device' && localProvider ? 'ready' : 'blocked',
  };
}

function failurePolicyCheck(): ProviderReadinessCheck {
  return {
    detail: 'Recorded and imported video failures stop without generating synthetic landmarks or coaching cues.',
    id: 'failure-policy',
    label: 'Failure policy',
    status: 'ready',
  };
}

function titleForStatus(status: ProviderReadinessStatus) {
  if (status === 'ready') return 'Provider path ready';
  if (status === 'review') return 'Provider path needs device proof';
  return 'Provider path blocked';
}

function actionForStatus(status: ProviderReadinessStatus) {
  if (status === 'ready') return 'Primary analysis, fail-closed behavior, and the privacy boundary are aligned for local review.';
  if (status === 'review') return 'Run the native QA packet on physical devices before claiming production mobile readiness.';
  return 'Switch away from reserved providers or install the required adapter before release validation.';
}

export function buildProviderReadinessSummary(
  config: ProviderReadinessConfig,
  runtime: ProviderReadinessRuntime = 'web',
): ProviderReadinessSummary {
  const checks = [
    providerCheck('primary-provider', 'Primary video provider', config.videoAnalysisProvider, runtime),
    failurePolicyCheck(),
    privacyCheck(config),
  ];

  if (config.nativeVideoAnalysisProvider) {
    checks.push(providerCheck('native-provider', 'Native build provider', config.nativeVideoAnalysisProvider, 'native'));
  }

  const status = mergeStatus(checks.map((check) => check.status));

  return {
    action: actionForStatus(status),
    checks,
    failurePolicy: 'fail-closed',
    nativeProvider: config.nativeVideoAnalysisProvider,
    primaryProvider: config.videoAnalysisProvider,
    runtime,
    status,
    title: titleForStatus(status),
  };
}
