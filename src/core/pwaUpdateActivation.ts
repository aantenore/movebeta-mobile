import { z } from 'zod';

export const pwaUpdateActivationSchemaVersion = 'movebeta.pwa-update-activation.v1';

const PwaUpdateActivationStatusSchema = z.enum(['activated', 'not-needed', 'requested', 'unsupported']);

export const PwaUpdateActivationResultSchema = z.object({
  actions: z.array(z.string().min(1)).min(1),
  generatedAt: z.string().datetime(),
  privacy: z.object({
    credentialValuesIncluded: z.literal(false),
    localPathsIncluded: z.literal(false),
    rawArtifactsIncluded: z.literal(false),
    rawVideoIncluded: z.literal(false),
    tokenLikeValuesIncluded: z.literal(false),
  }),
  schemaVersion: z.literal(pwaUpdateActivationSchemaVersion),
  summary: z.object({
    nextAction: z.string().min(1),
    serviceWorkerSupported: z.boolean(),
    status: PwaUpdateActivationStatusSchema,
    updateAvailableBefore: z.boolean(),
    updateStillWaiting: z.boolean(),
  }),
});

export type PwaUpdateActivationResult = z.infer<typeof PwaUpdateActivationResultSchema>;
export type PwaUpdateActivationStatus = z.infer<typeof PwaUpdateActivationStatusSchema>;

const forbiddenUpdateActivationValuePattern =
  /(file:\/\/|content:\/\/|asset:\/\/|ph:\/\/|\/Users\/|\/private\/|\/var\/mobile\/|[A-Za-z]:\\|\.mov\b|\.mp4\b|BEGIN PRIVATE KEY|ghp_[A-Za-z0-9_]+|github_pat_[A-Za-z0-9_]+|pat_[A-Za-z0-9_]+|sk_live_[A-Za-z0-9_]+|sk_test_[A-Za-z0-9_]+|bearer\s+[A-Za-z0-9._-]+|eyJ[A-Za-z0-9_-]{20,})/i;

function containsForbiddenValue(value: unknown): boolean {
  if (typeof value === 'string') return forbiddenUpdateActivationValuePattern.test(value);
  if (Array.isArray(value)) return value.some(containsForbiddenValue);
  if (value && typeof value === 'object') return Object.values(value).some(containsForbiddenValue);
  return false;
}

function nextActionFor(status: PwaUpdateActivationStatus) {
  if (status === 'activated') return 'Warm the model cache again, then run one offline relaunch smoke before field use.';
  if (status === 'requested') return 'Keep the PWA online until the service worker finishes installing, then refresh and warm the model cache.';
  if (status === 'not-needed') return 'No PWA update is waiting; keep the model cache warm before offline analysis.';
  return 'Open the exported PWA in a browser with service worker support before activating updates.';
}

function actionsFor(status: PwaUpdateActivationStatus) {
  if (status === 'activated') {
    return [
      'The waiting service worker was asked to activate.',
      'Refresh controlled pages if the browser does not switch controller automatically.',
      'Run Warm model after activation so Cache Storage reflects the active app version.',
    ];
  }
  if (status === 'requested') {
    return [
      'A service worker install is in progress or activation could not be confirmed yet.',
      'Stay online, refresh after installation, then warm the model cache.',
    ];
  }
  if (status === 'not-needed') {
    return ['No waiting service worker update was found.', 'Use Warm model after future deploys before offline gym use.'];
  }
  return ['Service worker update activation is unavailable in this runtime.'];
}

export function assertPwaUpdateActivationResultIsShareSafe(result: PwaUpdateActivationResult) {
  if (containsForbiddenValue(result)) {
    throw new Error('PWA update activation result contains credential values, local paths, raw artifacts, raw video references, or token-like data.');
  }
  return result;
}

export function buildPwaUpdateActivationResult({
  generatedAt = new Date().toISOString(),
  serviceWorkerSupported,
  status,
  updateAvailableBefore,
  updateStillWaiting,
}: {
  generatedAt?: string;
  serviceWorkerSupported: boolean;
  status: PwaUpdateActivationStatus;
  updateAvailableBefore: boolean;
  updateStillWaiting: boolean;
}) {
  const result = PwaUpdateActivationResultSchema.parse({
    actions: actionsFor(status),
    generatedAt,
    privacy: {
      credentialValuesIncluded: false,
      localPathsIncluded: false,
      rawArtifactsIncluded: false,
      rawVideoIncluded: false,
      tokenLikeValuesIncluded: false,
    },
    schemaVersion: pwaUpdateActivationSchemaVersion,
    summary: {
      nextAction: nextActionFor(status),
      serviceWorkerSupported,
      status,
      updateAvailableBefore,
      updateStillWaiting,
    },
  });

  return assertPwaUpdateActivationResultIsShareSafe(result);
}
