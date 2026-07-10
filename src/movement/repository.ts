import { appConfig } from '@/core/config';

import type { ClimbSession, CoachLensKey, VideoAsset } from './contracts';
import { throwIfAnalysisAborted, type AnalysisRunOptions } from './analysisCancellation';
import { deleteAnalysisBundle, formatAnalysisBundleDeletionReceipt } from './privacyDeletion';
import {
  createPoseEstimator,
  OnDeviceMovementPipeline,
  onDeviceMovementPipeline,
  type PoseEstimator,
} from './onDevicePipeline';
import { reportRepository } from './reportRepository';
import { sampleAttempts, sampleSession, sampleVideoAsset } from './sampleSession';

export async function analyzeSampleSession(coachLens?: CoachLensKey) {
  return analyzeDemoAttempt(sampleAttempts[0].session.id, coachLens);
}

export async function analyzeDemoAttempt(
  sessionId: string,
  coachLens?: CoachLensKey,
  options: AnalysisRunOptions = {},
) {
  const attempt = sampleAttempts.find((item) => item.session.id === sessionId) ?? sampleAttempts[0];
  return onDeviceMovementPipeline.analyze(attempt.video, attempt.session, { coachLens, signal: options.signal });
}

async function createVideoEstimator(options: AnalysisRunOptions = {}): Promise<PoseEstimator> {
  throwIfAnalysisAborted(options.signal);
  const provider = appConfig.videoAnalysisProvider;
  if (provider === 'local-fixture' || provider === 'local-video-fallback') {
    throw new Error(`${provider} is a synthetic demo/test provider and cannot analyze recorded or imported video.`);
  }

  const estimator = createPoseEstimator(provider);
  if (!(await estimator.isAvailable())) {
    const action =
      provider === 'web-tfjs-movenet'
        ? 'Use a browser with local video decoding and WebGL support, then warm the MoveNet cache before retrying.'
        : 'Install a custom MoveBeta development or release build with the native pose module; Expo Go is not supported.';
    throw new Error(`The configured on-device pose provider (${provider}) is unavailable. ${action}`);
  }

  throwIfAnalysisAborted(options.signal);
  return estimator;
}

async function runVideoPipeline(
  video: VideoAsset,
  session: ClimbSession,
  coachLens?: CoachLensKey,
  options: AnalysisRunOptions = {},
) {
  const estimator = await createVideoEstimator(options);
  const pipeline = new OnDeviceMovementPipeline({ poseEstimator: estimator });
  return pipeline.analyze(video, session, { coachLens, signal: options.signal });
}

export async function analyzeVideoAttempt(
  video: VideoAsset,
  session: ClimbSession,
  coachLens?: CoachLensKey,
  options: AnalysisRunOptions = {},
) {
  const report = await runVideoPipeline(video, session, coachLens, options);
  throwIfAnalysisAborted(options.signal);
  return reportRepository.saveReport(report);
}

export function getSampleSession() {
  return sampleSession;
}

export function listDemoAttempts() {
  return sampleAttempts.map((attempt) => ({
    description: attempt.description,
    session: attempt.session,
    video: attempt.video,
  }));
}

export function listReports() {
  return reportRepository.listReports();
}

export function deleteReport(reportId: string) {
  return reportRepository.deleteReport(reportId);
}

export function deleteLocalAnalysisBundle(reportId: string) {
  return deleteAnalysisBundle(reportId);
}

export function exportReport(reportId: string) {
  return reportRepository.exportReport(reportId);
}

export { formatAnalysisBundleDeletionReceipt, reportRepository, sampleVideoAsset };
