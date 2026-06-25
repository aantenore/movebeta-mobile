import { z } from 'zod';

import { type CaptureCalibrationAssessment } from '@/video/captureCalibration';
import { type AnalysisDeviceReadiness } from './analysisDeviceReadiness';
import { type AnalysisRunLoad } from './analysisRunLoad';
import { type PwaAnalysisPreflight } from './pwaAnalysisPreflight';
import { type PwaFieldReadiness } from './pwaFieldReadiness';

export const coachSessionLaunchSchemaVersion = 'movebeta.coach-session-launch.v1';

const CoachSessionLaunchStatusSchema = z.enum(['blocked', 'ready', 'review']);
const CoachSessionLaunchStepKeySchema = z.enum([
  'capture-setup',
  'model-readiness',
  'field-readiness',
  'device-readiness',
  'run-load',
  'privacy-boundary',
]);

export const CoachSessionLaunchStepSchema = z.object({
  action: z.string().min(1),
  detail: z.string().min(1),
  key: CoachSessionLaunchStepKeySchema,
  label: z.string().min(1),
  status: CoachSessionLaunchStatusSchema,
});

export const CoachSessionLaunchSchema = z.object({
  generatedAt: z.string().datetime(),
  privacy: z.object({
    credentialValuesIncluded: z.literal(false),
    localPathsIncluded: z.literal(false),
    rawArtifactsIncluded: z.literal(false),
    rawVideoIncluded: z.literal(false),
    reportIdsIncluded: z.literal(false),
    tokenLikeValuesIncluded: z.literal(false),
    videoUriIncluded: z.literal(false),
  }),
  schemaVersion: z.literal(coachSessionLaunchSchemaVersion),
  steps: z.array(CoachSessionLaunchStepSchema).length(6),
  summary: z.object({
    blockedCount: z.number().int().nonnegative(),
    canStartCapture: z.boolean(),
    nextAction: z.string().min(1),
    readyCount: z.number().int().nonnegative(),
    readyForSession: z.boolean(),
    reviewCount: z.number().int().nonnegative(),
    status: CoachSessionLaunchStatusSchema,
  }),
});

export type CoachSessionLaunch = z.infer<typeof CoachSessionLaunchSchema>;
export type CoachSessionLaunchStatus = z.infer<typeof CoachSessionLaunchStatusSchema>;
export type CoachSessionLaunchStep = z.infer<typeof CoachSessionLaunchStepSchema>;

const forbiddenCoachSessionLaunchValuePattern =
  /(file:\/\/|content:\/\/|asset:\/\/|ph:\/\/|\/Users\/|\/private\/|\/var\/mobile\/|[A-Za-z]:\\|\.mov\b|\.mp4\b|BEGIN PRIVATE KEY|ghp_[A-Za-z0-9_]+|github_pat_[A-Za-z0-9_]+|pat_[A-Za-z0-9_]+|sk_live_[A-Za-z0-9_]+|sk_test_[A-Za-z0-9_]+|bearer\s+[A-Za-z0-9._-]+|eyJ[A-Za-z0-9_-]{20,})/i;

function containsForbiddenValue(value: unknown): boolean {
  if (typeof value === 'string') return forbiddenCoachSessionLaunchValuePattern.test(value);
  if (Array.isArray(value)) return value.some(containsForbiddenValue);
  if (value && typeof value === 'object') return Object.values(value).some(containsForbiddenValue);
  return false;
}

function step({
  action,
  detail,
  key,
  label,
  status,
}: {
  action: string;
  detail: string;
  key: CoachSessionLaunchStep['key'];
  label: string;
  status: CoachSessionLaunchStatus;
}) {
  return CoachSessionLaunchStepSchema.parse({ action, detail, key, label, status });
}

function captureStatus(capture: CaptureCalibrationAssessment): CoachSessionLaunchStatus {
  if (!capture.canRecord || capture.status === 'blocked') return 'blocked';
  if (capture.status === 'review') return 'review';
  return 'ready';
}

function modelStatus(preflight: PwaAnalysisPreflight): CoachSessionLaunchStatus {
  if (!preflight.canAnalyze || preflight.status === 'blocked') return 'blocked';
  if (preflight.status === 'action') return 'review';
  return 'ready';
}

function fieldStatus(readiness: PwaFieldReadiness): CoachSessionLaunchStatus {
  if (readiness.summary.status === 'blocked') return 'blocked';
  if (readiness.summary.status === 'action') return 'review';
  return 'ready';
}

function deviceStatus(readiness: AnalysisDeviceReadiness): CoachSessionLaunchStatus {
  if (!readiness.summary.canAnalyze || readiness.summary.status === 'blocked') return 'blocked';
  if (readiness.summary.status === 'review') return 'review';
  return 'ready';
}

function runLoadStatus(load: AnalysisRunLoad): CoachSessionLaunchStatus {
  if (!load.summary.canStartAnalysis || load.summary.status === 'cooldown') return 'blocked';
  if (load.summary.status === 'review') return 'review';
  return 'ready';
}

function aggregateStatus(steps: CoachSessionLaunchStep[]): CoachSessionLaunchStatus {
  if (steps.some((item) => item.status === 'blocked')) return 'blocked';
  if (steps.some((item) => item.status === 'review')) return 'review';
  return 'ready';
}

export function assertCoachSessionLaunchIsShareSafe(launch: CoachSessionLaunch) {
  if (containsForbiddenValue(launch)) {
    throw new Error('Coach session launch contains credential values, local paths, report ids, raw artifacts, raw video references, or token-like data.');
  }
  return launch;
}

export function buildCoachSessionLaunch({
  capture,
  deviceReadiness,
  fieldReadiness,
  generatedAt = new Date().toISOString(),
  modelPreflight,
  runLoad,
}: {
  capture: CaptureCalibrationAssessment;
  deviceReadiness: AnalysisDeviceReadiness;
  fieldReadiness: PwaFieldReadiness;
  generatedAt?: string;
  modelPreflight: PwaAnalysisPreflight;
  runLoad: AnalysisRunLoad;
}): CoachSessionLaunch {
  const steps = [
    step({
      action: capture.action,
      detail: `${capture.title}; score ${capture.score}/100.`,
      key: 'capture-setup',
      label: 'Capture setup',
      status: captureStatus(capture),
    }),
    step({
      action: modelPreflight.action,
      detail: modelPreflight.detail,
      key: 'model-readiness',
      label: 'Model readiness',
      status: modelStatus(modelPreflight),
    }),
    step({
      action: fieldReadiness.summary.nextAction,
      detail: `${fieldReadiness.summary.blockerCount} blocker(s), ${fieldReadiness.summary.actionCount} action(s), ${fieldReadiness.summary.modelBytesMissing} model byte(s) missing.`,
      key: 'field-readiness',
      label: 'Field readiness',
      status: fieldStatus(fieldReadiness),
    }),
    step({
      action: deviceReadiness.summary.nextAction,
      detail: `${deviceReadiness.summary.readyCount} ready, ${deviceReadiness.summary.reviewCount} review, ${deviceReadiness.summary.blockedCount} blocked.`,
      key: 'device-readiness',
      label: 'Device readiness',
      status: deviceStatus(deviceReadiness),
    }),
    step({
      action: runLoad.summary.nextAction,
      detail: `${runLoad.summary.recentRunCount} recent run(s), ${runLoad.summary.reviewCount} review item(s), ${runLoad.summary.actionCount} action item(s).`,
      key: 'run-load',
      label: 'Run load',
      status: runLoadStatus(runLoad),
    }),
    step({
      action: 'Keep launch exports limited to derived readiness states and aggregate counters.',
      detail: 'The packet excludes video URI, raw media, report ids, local paths, credentials, and token-like values.',
      key: 'privacy-boundary',
      label: 'Privacy boundary',
      status: 'ready',
    }),
  ];

  const status = aggregateStatus(steps);
  const blockedCount = steps.filter((item) => item.status === 'blocked').length;
  const readyCount = steps.filter((item) => item.status === 'ready').length;
  const reviewCount = steps.filter((item) => item.status === 'review').length;
  const packet = CoachSessionLaunchSchema.parse({
    generatedAt,
    privacy: {
      credentialValuesIncluded: false,
      localPathsIncluded: false,
      rawArtifactsIncluded: false,
      rawVideoIncluded: false,
      reportIdsIncluded: false,
      tokenLikeValuesIncluded: false,
      videoUriIncluded: false,
    },
    schemaVersion: coachSessionLaunchSchemaVersion,
    steps,
    summary: {
      blockedCount,
      canStartCapture: blockedCount === 0,
      nextAction:
        steps.find((item) => item.status === 'blocked')?.action ??
        steps.find((item) => item.status === 'review')?.action ??
        'Session launch is ready for local recording or import.',
      readyCount,
      readyForSession: status === 'ready',
      reviewCount,
      status,
    },
  });

  return assertCoachSessionLaunchIsShareSafe(packet);
}
