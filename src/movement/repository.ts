import { appConfig } from '@/core/config';

import type { ClimbSession, CoachLensKey, VideoAsset } from './contracts';
import { deleteAnalysisBundle, formatAnalysisBundleDeletionReceipt } from './privacyDeletion';
import {
  createPoseEstimator,
  OnDeviceMovementPipeline,
  onDeviceMovementPipeline,
  type AnalysisProvider,
  type PoseEstimator,
} from './onDevicePipeline';
import { reportRepository } from './reportRepository';
import { sampleAttempts, sampleSession, sampleVideoAsset } from './sampleSession';

export async function analyzeSampleSession(coachLens?: CoachLensKey) {
  return analyzeDemoAttempt(sampleAttempts[0].session.id, coachLens);
}

export async function analyzeDemoAttempt(sessionId: string, coachLens?: CoachLensKey) {
  const attempt = sampleAttempts.find((item) => item.session.id === sessionId) ?? sampleAttempts[0];
  const report = await onDeviceMovementPipeline.analyze(attempt.video, attempt.session, { coachLens });
  return reportRepository.saveReport(report);
}

async function createVideoEstimator(): Promise<PoseEstimator> {
  const provider = appConfig.videoAnalysisProvider === 'local-fixture' ? 'local-video-fallback' : appConfig.videoAnalysisProvider;
  const estimator = createPoseEstimator(provider);
  return (await estimator.isAvailable()) ? estimator : createPoseEstimator('local-video-fallback');
}

async function runVideoPipeline(video: VideoAsset, session: ClimbSession, provider?: AnalysisProvider, coachLens?: CoachLensKey) {
  const estimator = provider ? createPoseEstimator(provider) : await createVideoEstimator();
  const pipeline = new OnDeviceMovementPipeline({ poseEstimator: estimator });
  return pipeline.analyze(video, session, { coachLens });
}

export async function analyzeVideoAttempt(video: VideoAsset, session: ClimbSession, coachLens?: CoachLensKey) {
  let report;
  try {
    report = await runVideoPipeline(video, session, undefined, coachLens);
  } catch (error) {
    if (appConfig.videoAnalysisProvider === 'local-video-fallback') throw error;
    report = await runVideoPipeline(video, session, 'local-video-fallback', coachLens);
  }
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
