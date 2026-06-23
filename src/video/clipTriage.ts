import type { VideoAsset } from '@/movement/contracts';

import { assessVideoIntake, type VideoIntakeAssessment, type VideoIntakeIssue } from './videoIntake';
import { videoAnalysisConfig } from './videoConfig';

export type ClipTriageDecision = 'analyze' | 'trim' | 'retake' | 'blocked';

export type ClipTriageReason = {
  detail: string;
  id: string;
  label: string;
  severity: VideoIntakeIssue['severity'];
};

export type ClipTriagePlan = {
  canAnalyze: boolean;
  decision: ClipTriageDecision;
  primaryAction: string;
  privacyNote: string;
  processingBudgetLabel: string;
  reasons: ClipTriageReason[];
  score: number;
  secondaryAction: string;
  status: VideoIntakeAssessment['status'];
  summary: string;
  targetClipLabel: string;
  title: string;
};

const issuePenaltyById: Record<string, number> = {
  'low-resolution': videoAnalysisConfig.clipTriage.issuePenalties.lowResolution,
  'missing-uri': videoAnalysisConfig.clipTriage.issuePenalties.missingUri,
  'remote-uri': videoAnalysisConfig.clipTriage.issuePenalties.remoteUri,
  'review-duration': videoAnalysisConfig.clipTriage.issuePenalties.reviewDuration,
  'too-long': videoAnalysisConfig.clipTriage.issuePenalties.longDuration,
  'too-short': videoAnalysisConfig.clipTriage.issuePenalties.tooShort,
  'low-frame-sample': videoAnalysisConfig.clipTriage.issuePenalties.tooShort,
};

function scoreAssessment(assessment: VideoIntakeAssessment) {
  const penalty = assessment.issues.reduce((total, issue) => total + (issuePenaltyById[issue.id] ?? 10), 0);
  return Math.max(0, Math.min(100, 100 - penalty));
}

function mapReasons(issues: VideoIntakeIssue[]): ClipTriageReason[] {
  return issues.map((issue) => ({
    detail: issue.detail,
    id: issue.id,
    label: issue.title,
    severity: issue.severity,
  }));
}

function decideFromIssues(assessment: VideoIntakeAssessment): ClipTriageDecision {
  const issueIds = new Set(assessment.issues.map((issue) => issue.id));

  if (issueIds.has('missing-uri') || issueIds.has('remote-uri')) return 'blocked';
  if (issueIds.has('too-short') || issueIds.has('low-frame-sample')) return 'retake';
  if (issueIds.has('low-resolution')) return 'retake';
  if (issueIds.has('too-long') || issueIds.has('review-duration')) return 'trim';
  return 'analyze';
}

function titleForDecision(decision: ClipTriageDecision) {
  if (decision === 'blocked') return 'Choose a local clip';
  if (decision === 'retake') return 'Retake recommended';
  if (decision === 'trim') return 'Trim recommended';
  return 'Ready to analyze';
}

function summaryForDecision(decision: ClipTriageDecision, assessment: VideoIntakeAssessment) {
  if (decision === 'blocked') return 'This source is not safe for the default on-device workflow.';
  if (decision === 'retake') {
    return assessment.canAnalyze
      ? 'Analysis can run, but a cleaner capture should improve pose confidence.'
      : 'Record a new attempt before local analysis.';
  }
  if (decision === 'trim') return 'Shorter clips reduce local processing time and make cues easier to trust.';
  return 'The clip matches the local analysis budget and capture constraints.';
}

function primaryActionForDecision(decision: ClipTriageDecision, assessment: VideoIntakeAssessment) {
  if (decision === 'blocked') return assessment.action;
  if (decision === 'retake') return assessment.canAnalyze ? 'Retake when possible, or analyze with caveats.' : 'Record a longer local attempt.';
  if (decision === 'trim') return 'Trim to the main attempt before analysis.';
  return 'Run local analysis.';
}

function secondaryActionForDecision(decision: ClipTriageDecision, assessment: VideoIntakeAssessment) {
  if (decision === 'blocked') return 'Keep video sources local to the device or app bundle.';
  if (decision === 'retake') return assessment.canAnalyze ? 'Use the current clip only for a quick check.' : 'Check framing, lighting, and minimum duration first.';
  if (decision === 'trim') return 'Keep one attempt with the climber fully visible.';
  return 'No cleanup required before the model runs.';
}

export function buildClipTriagePlan(
  video: VideoAsset,
  assessment: VideoIntakeAssessment = assessVideoIntake(video),
): ClipTriagePlan {
  const decision = decideFromIssues(assessment);
  const recommendedSeconds = Math.round(videoAnalysisConfig.recommendedAnalysisDurationMs / 1000);

  return {
    canAnalyze: assessment.canAnalyze,
    decision,
    primaryAction: primaryActionForDecision(decision, assessment),
    privacyNote: 'No upload is required; triage uses local metadata and the configured on-device policy.',
    processingBudgetLabel: `${assessment.expectedFrames} sampled frames`,
    reasons: mapReasons(assessment.issues),
    score: scoreAssessment(assessment),
    secondaryAction: secondaryActionForDecision(decision, assessment),
    status: assessment.status,
    summary: summaryForDecision(decision, assessment),
    targetClipLabel: `Target: one attempt under ${recommendedSeconds}s`,
    title: titleForDecision(decision),
  };
}
