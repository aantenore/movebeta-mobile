import { useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as ImagePicker from 'expo-image-picker';
import { useVideoPlayer, VideoView } from 'expo-video';
import { Camera, Clock, Cpu, Download, Gauge, RotateCcw, ShieldCheck, Square, TriangleAlert, Upload, Video } from 'lucide-react-native';

import { Header } from '@/components/Header';
import { AnalysisTrustPanel } from '@/components/AnalysisTrustPanel';
import { MovementCueCard } from '@/components/MovementCueCard';
import { MovementMetricRow } from '@/components/MovementMetricRow';
import { PoseOverlay } from '@/components/PoseOverlay';
import { Screen } from '@/components/Screen';
import { Section } from '@/components/Section';
import { StateView } from '@/components/StateView';
import { appConfig } from '@/core/config';
import { buildAnalysisExecutionPlan, type AnalysisExecutionPlan } from '@/core/analysisExecutionPlan';
import { selectionFeedback } from '@/core/haptics';
import { buildPwaAnalysisPreflight, type PwaAnalysisPreflight } from '@/core/pwaAnalysisPreflight';
import {
  browserPwaProbe,
  emptyModelCacheState,
  nativePwaProbe,
  resolveBrowserModelCacheState,
  warmBrowserPwaModelCache,
} from '@/core/pwaRuntimeBrowser';
import { buildPwaRuntimeReadiness, type PwaRuntimeProbe, type PwaRuntimeReadiness } from '@/core/pwaRuntimeReadiness';
import { theme } from '@/core/theme';
import type { AnalysisWindowMode, CoachLensKey, LocalAnalysisReport } from '@/movement/contracts';
import { buildBetaReplayPlan, type BetaReplayPlan } from '@/movement/betaReplayPlan';
import { buildCapturePrepProtocol, type CapturePrepProtocol } from '@/movement/capturePrepProtocol';
import { assessCaptureReadiness } from '@/movement/captureReadiness';
import { listCoachLenses } from '@/movement/coachLens';
import { buildCueTrustReport, type CueTrustReport, type CueTrustSignal } from '@/movement/cueTrust';
import { buildMovementPhaseBreakdown, type MovementPhaseBreakdown } from '@/movement/movementPhaseBreakdown';
import { analyzeDemoAttempt, analyzeVideoAttempt, listDemoAttempts } from '@/movement/repository';
import {
  assessCaptureCalibration,
  captureCalibrationOptions,
  defaultCaptureCalibrationInput,
  type CaptureCalibrationAssessment,
  type CaptureCalibrationInput,
} from '@/video/captureCalibration';
import {
  analysisWindowModes,
  buildVideoAnalysisWindow,
  formatVideoAnalysisWindow,
  withVideoAnalysisWindow,
} from '@/video/analysisWindow';
import { buildAnalysisResourcePlan, type AnalysisResourcePlan } from '@/video/analysisResourcePlan';
import { buildClipTriagePlan } from '@/video/clipTriage';
import { videoAnalysisConfig } from '@/video/videoConfig';
import { assessVideoIntake, formatVideoDuration } from '@/video/videoIntake';
import { buildLiveRecordingGuide, type LiveRecordingGuide } from '@/video/liveRecordingGuide';
import { readLocalVideoMetadata } from '@/video/videoMetadata';
import { formatAnalysisDuration } from '@/video/performanceBudget';
import {
  createCameraVideoSource,
  createImportedVideoSourceWithSession,
  updateVideoSourceSession,
  wallAngleOptions,
  type SessionMetadataInput,
  type VideoSourceResult,
} from '@/video/videoSource';

import { buildCoachWorkflowState } from './coachWorkflowState';

const attempts = listDemoAttempts();
const coachLenses = listCoachLenses();

type ActiveSource = VideoSourceResult | null;

const defaultEditableSession: Required<Pick<SessionMetadataInput, 'grade' | 'gym' | 'wallAngle'>> & { title: string } = {
  grade: videoAnalysisConfig.defaultSession.grade,
  gym: videoAnalysisConfig.defaultSession.gym,
  title: '',
  wallAngle: videoAnalysisConfig.defaultSession.wallAngle,
};

function getDemoVideoSource(sessionId: string): VideoSourceResult {
  const attempt = attempts.find((item) => item.session.id === sessionId) ?? attempts[0];
  return {
    label: `Bundled attempt · ${(attempt.video.durationMs / 1000).toFixed(1)}s`,
    session: attempt.session,
    video: attempt.video,
  };
}

function AnalysisQualityPanel({ report }: { report: LocalAnalysisReport }) {
  const hasWarnings = report.analysisQuality.warnings.length > 0;

  return (
    <View style={[styles.quality, hasWarnings ? styles.qualityWarning : null]}>
      <View style={styles.qualityTop}>
        <View style={styles.qualityTitleRow}>
          <Gauge color={hasWarnings ? theme.colors.amber : theme.colors.brand} size={18} />
          <Text style={styles.qualityTitle}>Analysis quality</Text>
        </View>
        <Text style={[styles.qualityScore, hasWarnings ? styles.qualityScoreWarning : null]}>
          {report.analysisQuality.score}/100
        </Text>
      </View>
      <View style={styles.qualityStats}>
        <Text style={styles.qualityStat}>Frames {(report.analysisQuality.frameCoverage * 100).toFixed(0)}%</Text>
        <Text style={styles.qualityStat}>Visibility {(report.analysisQuality.averageVisibility * 100).toFixed(0)}%</Text>
        <Text style={styles.qualityStat}>Landmarks {(report.analysisQuality.landmarkCoverage * 100).toFixed(0)}%</Text>
      </View>
      <View style={styles.lensApplied}>
        <Text style={styles.lensAppliedLabel}>Coach lens</Text>
        <Text style={styles.lensAppliedValue}>{report.engine.coachLens.label}</Text>
      </View>
      {hasWarnings ? (
        <View style={styles.qualityWarnings}>
          {report.analysisQuality.warnings.map((warning) => (
            <View key={warning} style={styles.qualityWarningRow}>
              <TriangleAlert color={theme.colors.amber} size={15} />
              <Text style={styles.qualityWarningText}>{warning}</Text>
            </View>
          ))}
        </View>
      ) : null}
    </View>
  );
}

function CoachLensSelector({
  disabled,
  onChange,
  selectedLens,
}: {
  disabled: boolean;
  onChange: (lens: CoachLensKey) => void;
  selectedLens: CoachLensKey;
}) {
  return (
    <Section title="Coach lens" caption="Tune the local analyzer before recording or importing a clip.">
      <View style={styles.lensGrid}>
        {coachLenses.map((lens) => {
          const selected = selectedLens === lens.metadata.key;
          return (
            <Pressable
              accessibilityLabel={`Coach lens ${lens.metadata.label}`}
              accessibilityRole="button"
              disabled={disabled}
              key={lens.metadata.key}
              onPress={() => onChange(lens.metadata.key)}
              style={[styles.lensOption, selected ? styles.lensOptionSelected : null, disabled ? styles.disabled : null]}
            >
              <Text style={[styles.lensTitle, selected ? styles.lensTitleSelected : null]}>{lens.metadata.label}</Text>
              <Text style={[styles.lensSummary, selected ? styles.lensSummarySelected : null]}>{lens.metadata.summary}</Text>
            </Pressable>
          );
        })}
      </View>
    </Section>
  );
}

function CaptureReadinessPanel({ report }: { report: LocalAnalysisReport }) {
  const readiness = assessCaptureReadiness(report.analysisQuality);
  const isReady = readiness.status === 'ready';
  const isRetake = readiness.status === 'retake';

  return (
    <View style={[styles.readiness, isRetake ? styles.readinessRetake : isReady ? styles.readinessReady : null]}>
      <View style={styles.readinessTop}>
        <View style={styles.readinessTitleRow}>
          {isReady ? (
            <ShieldCheck color={theme.colors.success} size={18} />
          ) : (
            <TriangleAlert color={isRetake ? theme.colors.coral : theme.colors.amber} size={18} />
          )}
          <Text style={styles.readinessTitle}>{readiness.title}</Text>
        </View>
        <Text style={[styles.readinessBadge, isRetake ? styles.readinessBadgeRetake : isReady ? styles.readinessBadgeReady : null]}>
          {readiness.status}
        </Text>
      </View>

      <Text style={styles.readinessAction}>{readiness.action}</Text>

      <View style={styles.readinessChecks}>
        {readiness.checks.map((check) => (
          <View key={check.id} style={styles.readinessCheck}>
            <Text style={styles.readinessCheckValue}>{check.valueLabel}</Text>
            <View style={styles.readinessCheckCopy}>
              <Text style={styles.readinessCheckLabel}>{check.label}</Text>
              <Text style={styles.readinessCheckDetail}>{check.detail}</Text>
            </View>
            <Text style={[styles.readinessCheckStatus, check.status === 'fail' ? styles.readinessCheckFail : null]}>
              {check.status}
            </Text>
          </View>
        ))}
      </View>

      <View style={styles.readinessAdvice}>
        {readiness.advice.map((item) => (
          <Text key={item} style={styles.readinessAdviceText}>
            {item}
          </Text>
        ))}
      </View>
    </View>
  );
}

function BetaReplayPlanPanel({ plan }: { plan: BetaReplayPlan }) {
  return (
    <Section title="Beta replay plan" caption="A local three-step repeat plan built from the current analysis evidence.">
      <View style={styles.betaPlan}>
        <View style={styles.betaPlanHeader}>
          <View style={styles.betaPlanIcon}>
            <RotateCcw color="#FFFFFF" size={18} />
          </View>
          <View style={styles.betaPlanCopy}>
            <Text style={styles.betaPlanTitle}>{plan.primaryFocus}</Text>
            <Text style={styles.betaPlanSummary}>{plan.summary}</Text>
          </View>
        </View>
        <View style={styles.betaStepList}>
          {plan.steps.map((step) => (
            <View key={step.id} style={styles.betaStep}>
              <View style={styles.betaStepTop}>
                <Text style={styles.betaStepPhase}>{step.phase}</Text>
                <Text style={styles.betaStepTime}>{(step.timestampMs / 1000).toFixed(1)}s</Text>
              </View>
              <Text style={styles.betaStepTitle}>{step.title}</Text>
              <Text style={styles.betaStepAction}>{step.action}</Text>
              <Text style={styles.betaStepEvidence}>{step.evidence}</Text>
            </View>
          ))}
        </View>
      </View>
    </Section>
  );
}

function MovementPhaseBreakdownPanel({ breakdown }: { breakdown: MovementPhaseBreakdown }) {
  return (
    <Section title="Movement phases" caption="Local phase scoring for where the attempt most needs rehearsal.">
      <View style={styles.phaseBreakdown}>
        <View style={styles.phaseSummary}>
          <Text style={styles.phaseSummaryTitle}>{breakdown.summary}</Text>
          <Text style={styles.phaseSummaryText}>Primary phase: {breakdown.primaryPhaseId}</Text>
        </View>
        <View style={styles.phaseList}>
          {breakdown.phases.map((phase) => (
            <View key={phase.id} style={styles.phaseCard}>
              <View style={styles.phaseTop}>
                <Text style={styles.phaseTitle}>{phase.title}</Text>
                <Text style={[styles.phaseStatus, phase.status === 'reset' ? styles.phaseStatusReset : phase.status === 'smooth' ? styles.phaseStatusSmooth : null]}>
                  {phase.status}
                </Text>
              </View>
              <Text style={styles.phaseScore}>{phase.score}/100</Text>
              <Text style={styles.phaseEvidence}>{phase.evidence}</Text>
              <Text style={styles.phaseAction}>{phase.action}</Text>
            </View>
          ))}
        </View>
      </View>
    </Section>
  );
}

function trustColor(level: CueTrustSignal['level']) {
  if (level === 'high') return theme.colors.success;
  if (level === 'medium') return theme.colors.brand;
  if (level === 'low') return theme.colors.amber;
  return theme.colors.coral;
}

function CueTrustPanel({ cueTrust }: { cueTrust: CueTrustReport }) {
  const validated = cueTrust.validationStatus === 'validated' && cueTrust.reviewCueIds.length === 0;

  return (
    <Section title="Cue trust" caption="Confidence scoring for each local coaching cue before it is treated as production evidence.">
      <View style={styles.trustSummary}>
        <View style={styles.trustSummaryTop}>
          <View style={styles.trustSummaryTitleRow}>
            <ShieldCheck color={validated ? theme.colors.success : theme.colors.amber} size={18} />
            <Text style={styles.trustSummaryTitle}>Trust average</Text>
          </View>
          <Text style={styles.trustSummaryScore}>{cueTrust.averageScore}/100</Text>
        </View>
        <Text style={styles.trustSummaryText}>{cueTrust.summary}</Text>
        <Text style={styles.trustValidation}>Validation: {cueTrust.validationStatus}</Text>
      </View>

      <View style={styles.trustList}>
        {cueTrust.signals.map((signal) => (
          <View key={signal.cueId} style={styles.trustCard}>
            <View style={styles.trustCardTop}>
              <Text style={styles.trustCardTitle}>{signal.title}</Text>
              <Text style={[styles.trustBadge, { color: trustColor(signal.level) }]}>{signal.label}</Text>
            </View>
            <Text style={styles.trustCardScore}>{signal.score}/100</Text>
            <Text style={styles.trustExplanation}>{signal.explanation}</Text>
            <View style={styles.trustFactors}>
              {signal.factors.map((factor) => (
                <View key={`${signal.cueId}-${factor.id}`} style={styles.trustFactor}>
                  <Text style={styles.trustFactorLabel}>{factor.label}</Text>
                  <Text style={styles.trustFactorScore}>{factor.score}</Text>
                  <Text style={[styles.trustFactorStatus, factor.status === 'weak' ? styles.trustFactorWeak : null]}>
                    {factor.status}
                  </Text>
                </View>
              ))}
            </View>
          </View>
        ))}
      </View>
    </Section>
  );
}

function LiveRecordingGuidePanel({ guide }: { guide: LiveRecordingGuide }) {
  const isWarning = guide.prompt.tone === 'warning';
  const isReady = guide.canStopForAnalysis;

  return (
    <View style={[styles.recordingGuide, isWarning ? styles.recordingGuideWarning : isReady ? styles.recordingGuideReady : null]}>
      <View style={styles.recordingGuideTop}>
        <Text style={styles.recordingGuideTitle}>{guide.prompt.title}</Text>
        <Text style={[styles.recordingGuideBadge, isReady ? styles.recordingGuideBadgeReady : null]}>
          {isReady ? 'analysis-ready' : 'minimum pending'}
        </Text>
      </View>
      <Text style={styles.recordingGuideBody}>{guide.prompt.body}</Text>
      <View style={styles.recordingGuideProgress}>
        <View style={[styles.recordingGuideProgressFill, { width: `${Math.min(100, Math.round(guide.progress * 100))}%` }]} />
      </View>
    </View>
  );
}

function VideoPreview({ source }: { source: VideoSourceResult }) {
  const player = useVideoPlayer(source.video.uri, (instance) => {
    instance.loop = true;
    instance.muted = true;
  });

  return (
    <View style={styles.previewShell}>
      <VideoView
        contentFit="contain"
        nativeControls
        player={player}
        style={styles.videoPreview}
      />
      <View style={styles.previewMeta}>
        <Video color={theme.colors.brand} size={18} />
        <View style={styles.previewCopy}>
          <Text style={styles.previewTitle}>{source.session.title}</Text>
          <Text style={styles.previewText}>
            {source.label} · {source.video.width}x{source.video.height}
          </Text>
        </View>
      </View>
    </View>
  );
}

function AnalysisResourcePlanPanel({
  onPreparePacket,
  plan,
}: {
  onPreparePacket: () => void;
  plan: AnalysisResourcePlan;
}) {
  const isBlocked = plan.summary.status === 'blocked';
  const isReady = plan.summary.status === 'ready';

  return (
    <View style={[styles.resourcePlan, isBlocked ? styles.resourcePlanBlocked : isReady ? styles.resourcePlanReady : null]}>
      <View style={styles.resourcePlanTop}>
        <View style={styles.resourcePlanTitleRow}>
          <Cpu color={isBlocked ? theme.colors.coral : isReady ? theme.colors.success : theme.colors.amber} size={17} />
          <Text style={styles.resourcePlanTitle}>Analysis resources</Text>
        </View>
        <Text style={[styles.resourcePlanBadge, isBlocked ? styles.resourcePlanBadgeBlocked : isReady ? styles.resourcePlanBadgeReady : null]}>
          {plan.summary.status}
        </Text>
      </View>
      <Text style={styles.resourcePlanSummary}>{plan.summary.nextAction}</Text>
      <View style={styles.resourcePlanMetrics}>
        <Text style={styles.resourcePlanMetric}>{plan.summary.estimatedSampledFrames} frames</Text>
        <Text style={styles.resourcePlanMetric}>{formatAnalysisDuration(plan.summary.budgetMs)} budget</Text>
        <Text style={styles.resourcePlanMetric}>{formatCacheBytes(plan.summary.decodeSurfaceBytes)} decode</Text>
        <Text style={styles.resourcePlanMetric}>{plan.summary.workloadLevel}</Text>
      </View>
      <View style={styles.resourcePlanSteps}>
        {plan.steps.map((step) => (
          <View key={step.key} style={styles.resourcePlanStep}>
            <Text
              style={[
                styles.resourcePlanStepStatus,
                step.status === 'blocked'
                  ? styles.resourcePlanStepBlocked
                  : step.status === 'ready'
                    ? styles.resourcePlanStepReady
                    : null,
              ]}
            >
              {step.status}
            </Text>
            <View style={styles.resourcePlanStepCopy}>
              <Text style={styles.resourcePlanStepTitle}>{step.label}</Text>
              <Text style={styles.resourcePlanStepDetail}>{step.detail}</Text>
            </View>
          </View>
        ))}
      </View>
      <Pressable accessibilityLabel="Prepare analysis resource packet" onPress={onPreparePacket} style={styles.resourcePlanAction}>
        <Download color={theme.colors.brand} size={16} />
        <Text style={styles.resourcePlanActionText}>Resource packet</Text>
      </Pressable>
    </View>
  );
}

function AnalysisExecutionPlanPanel({
  onPreparePacket,
  plan,
}: {
  onPreparePacket: () => void;
  plan: AnalysisExecutionPlan;
}) {
  const isBlocked = plan.summary.status === 'blocked';
  const isReady = plan.summary.status === 'ready';

  return (
    <View style={[styles.resourcePlan, isBlocked ? styles.resourcePlanBlocked : isReady ? styles.resourcePlanReady : null]}>
      <View style={styles.resourcePlanTop}>
        <View style={styles.resourcePlanTitleRow}>
          <Gauge color={isBlocked ? theme.colors.coral : isReady ? theme.colors.success : theme.colors.amber} size={17} />
          <Text style={styles.resourcePlanTitle}>Execution checklist</Text>
        </View>
        <Text style={[styles.resourcePlanBadge, isBlocked ? styles.resourcePlanBadgeBlocked : isReady ? styles.resourcePlanBadgeReady : null]}>
          {plan.summary.status}
        </Text>
      </View>
      <Text style={styles.resourcePlanSummary}>{plan.summary.nextAction}</Text>
      <View style={styles.resourcePlanMetrics}>
        <Text style={styles.resourcePlanMetric}>{plan.summary.readyCount} ready</Text>
        <Text style={styles.resourcePlanMetric}>{plan.summary.reviewCount} review</Text>
        <Text style={styles.resourcePlanMetric}>{plan.summary.actionCount} action</Text>
        <Text style={styles.resourcePlanMetric}>{plan.summary.blockedCount} blocked</Text>
      </View>
      <View style={styles.resourcePlanSteps}>
        {plan.steps.map((step) => (
          <View key={step.key} style={styles.resourcePlanStep}>
            <Text
              style={[
                styles.resourcePlanStepStatus,
                step.status === 'blocked'
                  ? styles.resourcePlanStepBlocked
                  : step.status === 'ready'
                    ? styles.resourcePlanStepReady
                    : null,
              ]}
            >
              {step.status}
            </Text>
            <View style={styles.resourcePlanStepCopy}>
              <Text style={styles.resourcePlanStepTitle}>{step.label}</Text>
              <Text style={styles.resourcePlanStepDetail}>{step.detail}</Text>
            </View>
          </View>
        ))}
      </View>
      <Pressable accessibilityLabel="Prepare analysis execution packet" onPress={onPreparePacket} style={styles.resourcePlanAction}>
        <Download color={theme.colors.brand} size={16} />
        <Text style={styles.resourcePlanActionText}>Execution packet</Text>
      </Pressable>
    </View>
  );
}

function VideoIntakePanel({
  analysisWindowMode,
  modelPreflight,
  onAnalysisWindowModeChange,
  onPrepareExecutionPacket,
  onPrepareResourcePacket,
  source,
}: {
  analysisWindowMode: AnalysisWindowMode;
  modelPreflight: PwaAnalysisPreflight;
  onAnalysisWindowModeChange: (mode: AnalysisWindowMode) => void;
  onPrepareExecutionPacket: (plan: AnalysisExecutionPlan) => void;
  onPrepareResourcePacket: (plan: AnalysisResourcePlan) => void;
  source: VideoSourceResult;
}) {
  const assessment = assessVideoIntake(source.video);
  const triage = buildClipTriagePlan(source.video, assessment);
  const analysisWindow = buildVideoAnalysisWindow(source.video, analysisWindowMode);
  const resourcePlan = buildAnalysisResourcePlan({ mode: analysisWindowMode, video: source.video });
  const executionPlan = buildAnalysisExecutionPlan({
    intake: assessment,
    modelPreflight,
    resourcePlan,
    triage,
  });
  const windowControlsVisible = source.video.durationMs > videoAnalysisConfig.recommendedAnalysisDurationMs;
  const isBlocked = assessment.status === 'blocked';
  const isReady = assessment.status === 'ready';
  const triageBlocked = triage.status === 'blocked';
  const triageReady = triage.decision === 'analyze';

  return (
    <View style={[styles.intake, isBlocked ? styles.intakeBlocked : isReady ? styles.intakeReady : null]}>
      <View style={styles.intakeTop}>
        <View style={styles.intakeTitleRow}>
          {isBlocked ? (
            <TriangleAlert color={theme.colors.coral} size={18} />
          ) : (
            <ShieldCheck color={isReady ? theme.colors.success : theme.colors.amber} size={18} />
          )}
          <Text style={styles.intakeTitle}>{assessment.title}</Text>
        </View>
        <Text style={[styles.intakeBadge, isBlocked ? styles.intakeBadgeBlocked : isReady ? styles.intakeBadgeReady : null]}>
          {assessment.status}
        </Text>
      </View>

      <Text style={styles.intakeAction}>{assessment.action}</Text>

      <View style={styles.intakeStats}>
        <View style={styles.intakeStat}>
          <Text style={styles.intakeStatValue}>{assessment.durationLabel}</Text>
          <Text style={styles.intakeStatLabel}>Duration</Text>
        </View>
        <View style={styles.intakeStat}>
          <Text style={styles.intakeStatValue}>{assessment.resolutionLabel}</Text>
          <Text style={styles.intakeStatLabel}>Resolution</Text>
        </View>
        <View style={styles.intakeStat}>
          <Text style={styles.intakeStatValue}>{assessment.expectedFrames}</Text>
          <Text style={styles.intakeStatLabel}>Frames</Text>
        </View>
      </View>

      <View style={[styles.triage, triageBlocked ? styles.triageBlocked : triageReady ? styles.triageReady : null]}>
        <View style={styles.triageTop}>
          <View style={styles.triageTitleRow}>
            <Cpu color={triageBlocked ? theme.colors.coral : triageReady ? theme.colors.success : theme.colors.amber} size={17} />
            <Text style={styles.triageTitle}>{triage.title}</Text>
          </View>
          <Text style={[styles.triageBadge, triageBlocked ? styles.triageBadgeBlocked : triageReady ? styles.triageBadgeReady : null]}>
            {triage.decision}
          </Text>
        </View>
        <Text style={styles.triageSummary}>{triage.summary}</Text>
        <View style={styles.triageActions}>
          <Text style={styles.triagePrimary}>{triage.primaryAction}</Text>
          <Text style={styles.triageSecondary}>{triage.secondaryAction}</Text>
        </View>
        <View style={styles.triageMetrics}>
          <Text style={styles.triageMetric}>{triage.score}/100</Text>
          <Text style={styles.triageMetric}>{triage.processingBudgetLabel}</Text>
          <Text style={styles.triageMetric}>{triage.targetClipLabel}</Text>
        </View>
        {triage.reasons.length > 0 ? (
          <View style={styles.triageReasons}>
            {triage.reasons.map((reason) => (
              <Text
                key={reason.id}
                style={[styles.triageReason, reason.severity === 'block' ? styles.triageReasonBlocked : null]}
              >
                {reason.label}
              </Text>
            ))}
          </View>
        ) : null}
        <Text style={styles.triagePrivacy}>{triage.privacyNote}</Text>
      </View>

      <View style={[styles.analysisWindow, analysisWindow.mode !== 'full' ? styles.analysisWindowActive : null]}>
        <View style={styles.analysisWindowTop}>
          <View style={styles.analysisWindowTitleGroup}>
            <Text style={styles.analysisWindowTitle}>Analysis window</Text>
            <Text style={styles.analysisWindowMeta}>{formatVideoAnalysisWindow(analysisWindow)}</Text>
          </View>
          <Text style={[styles.analysisWindowBadge, analysisWindow.mode !== 'full' ? styles.analysisWindowBadgeActive : null]}>
            {analysisWindow.mode}
          </Text>
        </View>
        <Text style={styles.analysisWindowText}>
          Original file is unchanged; the local model samples only this window when analysis runs.
        </Text>
        {windowControlsVisible ? (
          <View style={styles.analysisWindowOptions}>
            {analysisWindowModes.map((mode) => {
              const selected = analysisWindow.mode === mode;
              return (
                <Pressable
                  accessibilityLabel={`Analysis window ${mode}`}
                  accessibilityRole="button"
                  key={mode}
                  onPress={() => onAnalysisWindowModeChange(mode)}
                  style={[styles.analysisWindowOption, selected ? styles.analysisWindowOptionSelected : null]}
                >
                  <Text style={[styles.analysisWindowOptionText, selected ? styles.analysisWindowOptionTextSelected : null]}>
                    {mode}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        ) : null}
      </View>

      <AnalysisResourcePlanPanel onPreparePacket={() => onPrepareResourcePacket(resourcePlan)} plan={resourcePlan} />
      <AnalysisExecutionPlanPanel onPreparePacket={() => onPrepareExecutionPacket(executionPlan)} plan={executionPlan} />

      {assessment.issues.length > 0 ? (
        <View style={styles.intakeIssues}>
          {assessment.issues.map((issue) => (
            <View key={issue.id} style={styles.intakeIssue}>
              <Text style={[styles.intakeIssueSeverity, issue.severity === 'block' ? styles.intakeIssueBlock : null]}>
                {issue.severity}
              </Text>
              <View style={styles.intakeIssueCopy}>
                <Text style={styles.intakeIssueTitle}>{issue.title}</Text>
                <Text style={styles.intakeIssueDetail}>{issue.detail}</Text>
              </View>
            </View>
          ))}
        </View>
      ) : null}
    </View>
  );
}

function SessionMetadataEditor({
  disabled,
  metadata,
  onChange,
}: {
  disabled: boolean;
  metadata: typeof defaultEditableSession;
  onChange: (metadata: typeof defaultEditableSession) => void;
}) {
  const updateField = (field: keyof typeof defaultEditableSession, value: string) => {
    onChange({
      ...metadata,
      [field]: value,
    });
  };

  return (
    <Section title="Session metadata" caption="Saved into local reports, exports, trend history, and coach packets.">
      <View style={styles.metadataGrid}>
        <View style={styles.metadataField}>
          <Text style={styles.metadataLabel}>Attempt title</Text>
          <TextInput
            accessibilityLabel="Attempt title"
            editable={!disabled}
            onChangeText={(value) => updateField('title', value)}
            placeholder="Use video filename"
            placeholderTextColor={theme.colors.muted}
            style={styles.metadataInput}
            value={metadata.title}
          />
        </View>
        <View style={styles.metadataField}>
          <Text style={styles.metadataLabel}>Gym or wall</Text>
          <TextInput
            accessibilityLabel="Gym or wall"
            editable={!disabled}
            onChangeText={(value) => updateField('gym', value)}
            placeholder="Local wall"
            placeholderTextColor={theme.colors.muted}
            style={styles.metadataInput}
            value={metadata.gym}
          />
        </View>
        <View style={styles.metadataField}>
          <Text style={styles.metadataLabel}>Grade or focus</Text>
          <TextInput
            accessibilityLabel="Grade or focus"
            editable={!disabled}
            onChangeText={(value) => updateField('grade', value)}
            placeholder="Project"
            placeholderTextColor={theme.colors.muted}
            style={styles.metadataInput}
            value={metadata.grade}
          />
        </View>
      </View>
      <View style={styles.wallAngleWrap}>
        <Text style={styles.metadataLabel}>Wall angle</Text>
        <View style={styles.wallAngleOptions}>
          {wallAngleOptions.map((angle) => {
            const selected = metadata.wallAngle === angle;
            return (
              <Pressable
                disabled={disabled}
                key={angle}
                onPress={() => onChange({ ...metadata, wallAngle: angle })}
                style={[styles.wallAngleOption, selected ? styles.wallAngleOptionSelected : null, disabled ? styles.disabled : null]}
              >
                <Text style={[styles.wallAngleText, selected ? styles.wallAngleTextSelected : null]}>{angle}</Text>
              </Pressable>
            );
          })}
        </View>
      </View>
    </Section>
  );
}

function setupLabel(value: string | number) {
  if (typeof value === 'number') {
    if (value <= 1) return 'Close';
    if (value >= 8) return 'Far';
    return 'Ideal';
  }

  return value
    .split('-')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

function CaptureCalibrationPanel({
  assessment,
  calibration,
  disabled,
  onChange,
}: {
  assessment: CaptureCalibrationAssessment;
  calibration: CaptureCalibrationInput;
  disabled: boolean;
  onChange: (calibration: CaptureCalibrationInput) => void;
}) {
  const isBlocked = assessment.status === 'blocked';
  const isReady = assessment.status === 'ready';

  const updateField = <Field extends keyof CaptureCalibrationInput>(field: Field, value: CaptureCalibrationInput[Field]) => {
    onChange({
      ...calibration,
      [field]: value,
    });
  };

  const groups: Array<{
    field: keyof CaptureCalibrationInput;
    label: string;
    options: Array<string | number>;
  }> = [
    { field: 'bodyFraming', label: 'Framing', options: captureCalibrationOptions.bodyFraming },
    { field: 'cameraAngle', label: 'View', options: captureCalibrationOptions.cameraAngle },
    { field: 'distanceMeters', label: 'Distance', options: captureCalibrationOptions.distanceMeters },
    { field: 'lighting', label: 'Light', options: captureCalibrationOptions.lighting },
    { field: 'backgroundContrast', label: 'Wall', options: captureCalibrationOptions.backgroundContrast },
    { field: 'phoneStability', label: 'Phone', options: captureCalibrationOptions.phoneStability },
    { field: 'bystanderState', label: 'People', options: captureCalibrationOptions.bystanderState },
  ];

  return (
    <Section title="Capture setup" caption="Calibrate privacy, framing, and signal before recording.">
      <View style={[styles.setupSummary, isBlocked ? styles.setupSummaryBlocked : isReady ? styles.setupSummaryReady : null]}>
        <View style={styles.setupTop}>
          <View style={styles.setupTitleRow}>
            {isBlocked ? (
              <TriangleAlert color={theme.colors.coral} size={18} />
            ) : (
              <ShieldCheck color={isReady ? theme.colors.success : theme.colors.amber} size={18} />
            )}
            <Text style={styles.setupTitle}>{assessment.title}</Text>
          </View>
          <Text style={[styles.setupBadge, isBlocked ? styles.setupBadgeBlocked : isReady ? styles.setupBadgeReady : null]}>
            {assessment.score}/100
          </Text>
        </View>
        <Text style={styles.setupAction}>{assessment.action}</Text>
      </View>

      <View style={styles.setupGroups}>
        {groups.map((group) => (
          <View key={group.field} style={styles.setupGroup}>
            <Text style={styles.metadataLabel}>{group.label}</Text>
            <View style={styles.setupOptions}>
              {group.options.map((option) => {
                const selected = calibration[group.field] === option;
                return (
                  <Pressable
                    accessibilityLabel={`${group.label}: ${setupLabel(option)}`}
                    accessibilityRole="button"
                    disabled={disabled}
                    key={`${group.field}-${option}`}
                    onPress={() => updateField(group.field, option as never)}
                    style={[styles.setupOption, selected ? styles.setupOptionSelected : null, disabled ? styles.disabled : null]}
                  >
                    <Text style={[styles.setupOptionText, selected ? styles.setupOptionTextSelected : null]}>
                      {setupLabel(option)}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>
        ))}
      </View>

      <View style={styles.setupChecks}>
        {assessment.checks.map((check) => (
          <View key={check.id} style={styles.setupCheck}>
            <Text style={styles.setupCheckValue}>{check.valueLabel}</Text>
            <View style={styles.setupCheckCopy}>
              <Text style={styles.setupCheckLabel}>{check.label}</Text>
              <Text style={styles.setupCheckDetail}>{check.detail}</Text>
            </View>
            <Text style={[styles.setupCheckStatus, check.status === 'fail' ? styles.setupCheckFail : null]}>
              {check.status}
            </Text>
          </View>
        ))}
      </View>
    </Section>
  );
}

function CapturePrepProtocolPanel({ protocol }: { protocol: CapturePrepProtocol }) {
  const isBlocked = protocol.status === 'blocked';
  const isReady = protocol.status === 'ready';

  return (
    <Section title="Capture prep protocol" caption="A local pre-recording plan from setup, latest quality, and movement evidence.">
      <View style={[styles.prepProtocol, isBlocked ? styles.prepProtocolBlocked : isReady ? styles.prepProtocolReady : null]}>
        <View style={styles.prepTop}>
          <View style={styles.prepTitleGroup}>
            <Text style={styles.prepTitle}>{protocol.title}</Text>
            <Text style={styles.prepMeta}>
              Focus: {protocol.focus} · {protocol.totalMinutes} min
            </Text>
          </View>
          <Text style={[styles.prepBadge, isBlocked ? styles.prepBadgeBlocked : isReady ? styles.prepBadgeReady : null]}>
            {protocol.status}
          </Text>
        </View>
        <Text style={styles.prepPrivacy}>{protocol.privacyNote}</Text>
        <View style={styles.prepPhaseList}>
          {protocol.phases.map((phase) => (
            <View key={phase.id} style={styles.prepPhase}>
              <View style={styles.prepPhaseTop}>
                <Text style={styles.prepPhaseKind}>{phase.kind}</Text>
                <Text style={styles.prepPhaseTime}>{phase.durationMinutes} min</Text>
              </View>
              <Text style={styles.prepPhaseTitle}>{phase.title}</Text>
              <Text style={styles.prepPhaseInstruction}>{phase.instruction}</Text>
              <Text style={styles.prepPhaseEvidence}>{phase.evidence}</Text>
            </View>
          ))}
        </View>
        <View style={styles.prepCriteria}>
          {protocol.retakeCriteria.map((criterion) => (
            <Text key={criterion} style={styles.prepCriterion}>
              {criterion}
            </Text>
          ))}
        </View>
      </View>
    </Section>
  );
}

function usePwaModelPreflight() {
  const [probe, setProbe] = useState<PwaRuntimeProbe>(() => browserPwaProbe());

  useEffect(() => {
    const initialProbe = browserPwaProbe();
    if (initialProbe.runtime !== 'web' || typeof window === 'undefined' || typeof navigator === 'undefined') {
      setProbe(nativePwaProbe());
      return undefined;
    }

    let cancelled = false;

    const mergeProbe = (patch: Partial<PwaRuntimeProbe> = {}) => {
      if (cancelled) return;
      setProbe((current) =>
        browserPwaProbe({
          installPromptAvailable: current.installPromptAvailable,
          modelCache: current.modelCache,
          serviceWorkerRegistered: current.serviceWorkerRegistered,
          updateAvailable: current.updateAvailable,
          ...patch,
        }),
      );
    };

    const refreshModelCacheState = async () => {
      mergeProbe({ modelCache: await resolveBrowserModelCacheState() });
    };

    const refreshServiceWorkerState = async () => {
      if (!('serviceWorker' in navigator)) {
        mergeProbe({ serviceWorkerRegistered: false, serviceWorkerSupported: false });
        return;
      }

      const registration = await navigator.serviceWorker.getRegistration?.();
      mergeProbe({
        serviceWorkerRegistered: Boolean(registration),
        updateAvailable: Boolean(registration?.waiting || registration?.installing),
      });
    };

    const handleOnlineState = () => {
      mergeProbe();
      void refreshModelCacheState();
    };
    const handleControllerChange = () => {
      mergeProbe({ serviceWorkerControlled: true, serviceWorkerRegistered: true });
      void refreshModelCacheState();
    };

    window.addEventListener('online', handleOnlineState);
    window.addEventListener('offline', handleOnlineState);
    navigator.serviceWorker?.addEventListener('controllerchange', handleControllerChange);
    void refreshServiceWorkerState();
    void refreshModelCacheState();
    void navigator.serviceWorker?.ready.then(() => {
      mergeProbe({ serviceWorkerRegistered: true });
      void refreshModelCacheState();
    });

    return () => {
      cancelled = true;
      window.removeEventListener('online', handleOnlineState);
      window.removeEventListener('offline', handleOnlineState);
      navigator.serviceWorker?.removeEventListener('controllerchange', handleControllerChange);
    };
  }, []);

  async function refreshModelCache() {
    const nextProbe = browserPwaProbe();
    if (nextProbe.runtime !== 'web' || typeof window === 'undefined' || typeof navigator === 'undefined') {
      const nativeProbe = nativePwaProbe();
      setProbe(nativeProbe);
      return nativeProbe.modelCache ?? emptyModelCacheState();
    }

    const modelCache = await resolveBrowserModelCacheState();
    setProbe((current) =>
      browserPwaProbe({
        installPromptAvailable: current.installPromptAvailable,
        modelCache,
        serviceWorkerRegistered: current.serviceWorkerRegistered,
        updateAvailable: current.updateAvailable,
      }),
    );
    return modelCache;
  }

  async function warmModelCache() {
    const result = await warmBrowserPwaModelCache();
    await refreshModelCache();
    return result;
  }

  return {
    online: probe.online,
    readiness: buildPwaRuntimeReadiness(probe),
    refreshModelCache,
    warmModelCache,
  };
}

function formatCacheBytes(value: number) {
  if (value >= 1_000_000) return `${Math.round(value / 100_000) / 10} MB`;
  if (value >= 1_000) return `${Math.round(value / 100) / 10} KB`;
  return `${value} B`;
}

function PwaModelPreflightPanel({
  disabled,
  onWarmModelCache,
  preflight,
  readiness,
  warming,
}: {
  disabled: boolean;
  onWarmModelCache: () => void;
  preflight: PwaAnalysisPreflight;
  readiness: PwaRuntimeReadiness;
  warming: boolean;
}) {
  const isReady = preflight.status === 'ready' || preflight.status === 'native';
  const isBlocked = preflight.status === 'blocked';

  return (
    <View style={[styles.modelPreflight, isBlocked ? styles.modelPreflightBlocked : isReady ? styles.modelPreflightReady : null]}>
      <View style={styles.modelPreflightTop}>
        <View style={styles.modelPreflightTitleRow}>
          {isBlocked ? (
            <TriangleAlert color={theme.colors.coral} size={18} />
          ) : (
            <ShieldCheck color={isReady ? theme.colors.success : theme.colors.amber} size={18} />
          )}
          <View style={styles.modelPreflightTitleGroup}>
            <Text style={styles.modelPreflightTitle}>{preflight.title}</Text>
            <Text style={styles.modelPreflightDetail}>{preflight.detail}</Text>
          </View>
        </View>
        <Text style={[styles.modelPreflightBadge, isBlocked ? styles.modelPreflightBadgeBlocked : isReady ? styles.modelPreflightBadgeReady : null]}>
          {preflight.badge}
        </Text>
      </View>

      <Text style={styles.modelPreflightAction}>{preflight.action}</Text>
      <View style={styles.modelPreflightMetrics}>
        <Text style={styles.modelPreflightMetric}>
          Assets {readiness.summary.modelAssetsCached}/{readiness.summary.modelAssetsExpected}
        </Text>
        <Text style={styles.modelPreflightMetric}>Verified {readiness.summary.modelAssetsVerified}</Text>
        <Text style={styles.modelPreflightMetric}>{formatCacheBytes(readiness.summary.modelBytesCached)}</Text>
      </View>
      {readiness.summary.status !== 'native' ? (
        <Pressable
          accessibilityLabel="Warm model cache"
          disabled={disabled || warming}
          onPress={onWarmModelCache}
          style={[styles.modelPreflightButton, disabled || warming ? styles.disabled : null]}
        >
          <Download color={theme.colors.brand} size={16} />
          <Text style={styles.modelPreflightButtonText}>{warming ? 'Warming' : 'Warm model'}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

export function CoachScreen() {
  const cameraRef = useRef<CameraView | null>(null);
  const recordingStartedAt = useRef<number | null>(null);
  const [cameraPermission, requestCameraPermission] = useCameraPermissions();
  const [report, setReport] = useState<LocalAnalysisReport | null>(null);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [cameraOpen, setCameraOpen] = useState(false);
  const [recording, setRecording] = useState(false);
  const [recordingElapsedMs, setRecordingElapsedMs] = useState(0);
  const [modelWarmupLoading, setModelWarmupLoading] = useState(false);
  const [selectedAttemptId, setSelectedAttemptId] = useState(attempts[0].session.id);
  const [selectedCoachLens, setSelectedCoachLens] = useState<CoachLensKey>(appConfig.coachLens);
  const [analysisWindowMode, setAnalysisWindowMode] = useState<AnalysisWindowMode>(videoAnalysisConfig.analysisWindow.defaultMode);
  const [activeSource, setActiveSource] = useState<ActiveSource>(null);
  const [preparedResourcePacket, setPreparedResourcePacket] = useState('');
  const [preparedExecutionPacket, setPreparedExecutionPacket] = useState('');
  const [sessionMetadata, setSessionMetadata] = useState(defaultEditableSession);
  const [captureCalibration, setCaptureCalibration] = useState<CaptureCalibrationInput>(defaultCaptureCalibrationInput);
  const pwaPreflight = usePwaModelPreflight();
  const intakeSource = activeSource ?? getDemoVideoSource(selectedAttemptId);
  const modelPreflight = buildPwaAnalysisPreflight({
    hasLocalVideo: Boolean(activeSource),
    online: pwaPreflight.online,
    readiness: pwaPreflight.readiness,
  });
  const workflow = buildCoachWorkflowState({
    analyzing: loading,
    recording,
    warmingModel: modelWarmupLoading,
  });
  const captureSetupAssessment = assessCaptureCalibration(captureCalibration);
  const capturePrepProtocol = buildCapturePrepProtocol({
    calibration: captureSetupAssessment,
    report,
    session: intakeSource.session,
  });
  const liveRecordingGuide = buildLiveRecordingGuide({
    calibration: captureSetupAssessment,
    coachLens: selectedCoachLens,
    elapsedMs: recordingElapsedMs,
    recording,
  });
  const cueTrust = report ? buildCueTrustReport(report) : null;
  const cueTrustById = new Map(cueTrust?.signals.map((signal) => [signal.cueId, signal]) ?? []);

  function updateSessionMetadata(nextMetadata: typeof defaultEditableSession) {
    setSessionMetadata(nextMetadata);
    setActiveSource((source) => (source ? updateVideoSourceSession(source, nextMetadata) : source));
  }

  function prepareAnalysisResourcePacket(plan: AnalysisResourcePlan) {
    selectionFeedback();
    setPreparedResourcePacket(JSON.stringify(plan, null, 2));
  }

  function prepareAnalysisExecutionPacket(plan: AnalysisExecutionPlan) {
    selectionFeedback();
    setPreparedExecutionPacket(JSON.stringify(plan, null, 2));
  }

  async function runAnalysis(
    nextSource: ActiveSource = activeSource,
    sessionId = selectedAttemptId,
    withFeedback = true,
    coachLens = selectedCoachLens,
  ) {
    if (withFeedback) selectionFeedback();

    const sourceForAnalysis = nextSource
      ? {
          ...nextSource,
          video: withVideoAnalysisWindow(nextSource.video, analysisWindowMode),
        }
      : null;

    if (sourceForAnalysis) {
      const intake = assessVideoIntake(sourceForAnalysis.video);
      if (!intake.canAnalyze) {
        setLoading(false);
        setReport(null);
        setErrorMessage(intake.action);
        return;
      }

      const runtimePreflight = buildPwaAnalysisPreflight({
        hasLocalVideo: true,
        online: pwaPreflight.online,
        readiness: pwaPreflight.readiness,
      });
      if (!runtimePreflight.canAnalyze) {
        setLoading(false);
        setReport(null);
        setErrorMessage(runtimePreflight.action);
        return;
      }

      if (runtimePreflight.shouldWarmBeforeAnalysis) {
        setModelWarmupLoading(true);
        try {
          const warmup = await pwaPreflight.warmModelCache();
          if (warmup.summary.status !== 'ready' && !warmup.summary.online) {
            setLoading(false);
            setReport(null);
            setErrorMessage(warmup.summary.nextAction);
            return;
          }
        } catch (error) {
          const message = error instanceof Error ? error.message : 'Model cache warmup failed before analysis.';
          setLoading(false);
          setReport(null);
          setErrorMessage(message);
          return;
        } finally {
          setModelWarmupLoading(false);
        }
      }
    }

    setLoading(true);
    setErrorMessage(null);

    try {
      const nextReport = sourceForAnalysis
        ? await analyzeVideoAttempt(sourceForAnalysis.video, sourceForAnalysis.session, coachLens)
        : await analyzeDemoAttempt(sessionId, coachLens);
      setReport(nextReport);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'The local analysis pipeline failed.';
      setErrorMessage(message);
    } finally {
      setLoading(false);
      if (sourceForAnalysis) {
        void pwaPreflight.refreshModelCache();
      }
    }
  }

  async function warmCoachModelCache() {
    selectionFeedback();
    setModelWarmupLoading(true);
    setErrorMessage(null);

    try {
      const result = await pwaPreflight.warmModelCache();
      if (result.summary.status !== 'ready') {
        setErrorMessage(result.summary.nextAction);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Model cache warmup failed.';
      setErrorMessage(message);
    } finally {
      setModelWarmupLoading(false);
    }
  }

  async function openRecorder() {
    selectionFeedback();
    setErrorMessage(null);

    const setup = assessCaptureCalibration(captureCalibration);
    if (!setup.canRecord) {
      setErrorMessage(setup.action);
      return;
    }

    if (!cameraPermission?.granted) {
      const permission = await requestCameraPermission();
      if (!permission.granted) {
        setErrorMessage('Camera permission is required to record an attempt.');
        return;
      }
    }

    setCameraOpen(true);
  }

  async function startRecording() {
    if (!cameraRef.current || recording) return;

    const setup = assessCaptureCalibration(captureCalibration);
    if (!setup.canRecord) {
      setErrorMessage(setup.action);
      return;
    }

    setErrorMessage(null);
    setRecording(true);
    recordingStartedAt.current = Date.now();

    try {
      const recordingResult = await cameraRef.current.recordAsync({
        maxFileSize: videoAnalysisConfig.maxRecordingFileSizeBytes,
        maxDuration: videoAnalysisConfig.maxRecordingDurationSeconds,
      });

      if (!recordingResult?.uri) {
        setErrorMessage('Recording did not return a local video file.');
        return;
      }

      const durationMs = recordingStartedAt.current ? Date.now() - recordingStartedAt.current : undefined;
      const metadata = await readLocalVideoMetadata({
        durationMs,
        uri: recordingResult.uri,
      });
      const source = createCameraVideoSource({
        durationMs: metadata.durationMs,
        height: metadata.height,
        session: sessionMetadata,
        uri: recordingResult.uri,
        width: metadata.width,
      });

      setPreparedResourcePacket('');
      setPreparedExecutionPacket('');
      setActiveSource(source);
      setCameraOpen(false);
      await runAnalysis(source, selectedAttemptId, false);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Recording failed on this device.';
      setErrorMessage(message);
    } finally {
      setRecording(false);
      recordingStartedAt.current = null;
    }
  }

  function stopRecording() {
    selectionFeedback();
    cameraRef.current?.stopRecording();
  }

  async function importVideo() {
    selectionFeedback();
    setErrorMessage(null);

    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      setErrorMessage('Media library permission is required to import a climbing video.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      allowsEditing: false,
      allowsMultipleSelection: false,
      mediaTypes: ['videos'],
      quality: 1,
      videoMaxDuration: 120,
    });

    if (result.canceled || !result.assets[0]) return;

    const asset = result.assets[0];
    const metadata = await readLocalVideoMetadata({
      durationMs: asset.duration,
      height: asset.height,
      uri: asset.uri,
      width: asset.width,
    });
    const source = createImportedVideoSourceWithSession(
      {
        ...asset,
        duration: metadata.durationMs,
        height: metadata.height,
        width: metadata.width,
      },
      sessionMetadata,
    );
    setPreparedResourcePacket('');
    setPreparedExecutionPacket('');
    setActiveSource(source);
    setCameraOpen(false);
    await runAnalysis(source, selectedAttemptId, false);
  }

  function selectDemoAttempt(sessionId: string) {
    selectionFeedback();
    setPreparedResourcePacket('');
    setPreparedExecutionPacket('');
    setActiveSource(null);
    setSelectedAttemptId(sessionId);
    void runAnalysis(null, sessionId, false);
  }

  function selectCoachLens(coachLens: CoachLensKey) {
    selectionFeedback();
    setSelectedCoachLens(coachLens);
    void runAnalysis(activeSource, selectedAttemptId, false, coachLens);
  }

  useEffect(() => {
    void runAnalysis(null, selectedAttemptId, false);
  }, []);

  useEffect(() => {
    if (!recording) {
      setRecordingElapsedMs(0);
      return;
    }

    const timer = setInterval(() => {
      setRecordingElapsedMs(recordingStartedAt.current ? Date.now() - recordingStartedAt.current : 0);
    }, 250);

    return () => clearInterval(timer);
  }, [recording]);

  return (
    <Screen>
      <Header
        eyebrow="MoveBeta"
        title="On-device climbing coach"
        subtitle="Record or import a climbing video, keep it local, and get movement cues from the on-device pipeline."
        action={
          <Pressable
            disabled={workflow.actionDisabled}
            onPress={() => void runAnalysis()}
            style={[styles.action, workflow.actionDisabled ? styles.disabled : null]}
          >
            <Cpu color="#FFFFFF" size={17} />
            <Text style={styles.actionText}>{workflow.actionLabel}</Text>
          </Pressable>
        }
      />

      <View style={styles.capture}>
        <View style={styles.captureIcon}>
          <Camera color={theme.colors.brand} size={24} />
        </View>
        <View style={styles.captureCopy}>
          <Text style={styles.captureTitle}>Capture a climbing attempt</Text>
          <Text style={styles.captureText}>
            The video workflow runs locally. Web builds try TensorFlow.js MoveNet first, then fall back locally when a
            browser cannot decode the source. Native builds can swap in MediaPipe, Core ML, or TFLite behind the same
            provider contract.
          </Text>
          <View style={styles.captureActions}>
            <Pressable
              disabled={workflow.captureDisabled}
              onPress={() => void openRecorder()}
              style={[styles.secondaryAction, workflow.captureDisabled ? styles.disabled : null]}
            >
              <Camera color={theme.colors.brand} size={16} />
              <Text style={styles.secondaryActionText}>Record</Text>
            </Pressable>
            <Pressable
              disabled={workflow.captureDisabled}
              onPress={() => void importVideo()}
              style={[styles.secondaryAction, workflow.captureDisabled ? styles.disabled : null]}
            >
              <Upload color={theme.colors.brand} size={16} />
              <Text style={styles.secondaryActionText}>Import</Text>
            </Pressable>
          </View>
        </View>
      </View>

      <PwaModelPreflightPanel
        disabled={workflow.captureDisabled}
        onWarmModelCache={() => void warmCoachModelCache()}
        preflight={modelPreflight}
        readiness={pwaPreflight.readiness}
        warming={modelWarmupLoading}
      />

      <CaptureCalibrationPanel
        assessment={captureSetupAssessment}
        calibration={captureCalibration}
        disabled={workflow.captureDisabled}
        onChange={setCaptureCalibration}
      />
      <CapturePrepProtocolPanel protocol={capturePrepProtocol} />
      <SessionMetadataEditor disabled={workflow.captureDisabled} metadata={sessionMetadata} onChange={updateSessionMetadata} />
      <CoachLensSelector disabled={workflow.captureDisabled} onChange={selectCoachLens} selectedLens={selectedCoachLens} />

      {cameraOpen ? (
        <Section title="Recorder" caption="Frame the climber side-on and keep the full body visible.">
          <View style={styles.recorderShell}>
            <CameraView
              facing="back"
              mode="video"
              mute
              ref={cameraRef}
              style={styles.cameraView}
              videoBitrate={videoAnalysisConfig.recordingVideoBitrate}
              videoQuality={videoAnalysisConfig.recordingVideoQuality}
            />
            <View style={styles.recorderTop}>
              <View style={styles.recorderTimer}>
                <Clock color="#FFFFFF" size={15} />
                <Text style={styles.recorderTimerText}>
                  {formatVideoDuration(recordingElapsedMs)} / {formatVideoDuration(videoAnalysisConfig.maxRecordingDurationSeconds * 1000)}
                </Text>
              </View>
              <Text style={styles.recorderHint}>Minimum {(videoAnalysisConfig.minimumDurationMs / 1000).toFixed(1)}s</Text>
            </View>
            <LiveRecordingGuidePanel guide={liveRecordingGuide} />
            <View style={styles.recorderOverlay}>
              <Pressable disabled={recording} onPress={() => setCameraOpen(false)} style={styles.recorderGhost}>
                <RotateCcw color="#FFFFFF" size={18} />
                <Text style={styles.recorderGhostText}>Close</Text>
              </Pressable>
              {recording ? (
                <Pressable onPress={stopRecording} style={styles.recorderStop}>
                  <Square color="#FFFFFF" fill="#FFFFFF" size={16} />
                  <Text style={styles.recorderActionText}>Stop</Text>
                </Pressable>
              ) : (
                <Pressable onPress={() => void startRecording()} style={styles.recorderRecord}>
                  <Video color="#FFFFFF" size={18} />
                  <Text style={styles.recorderActionText}>Start</Text>
                </Pressable>
              )}
            </View>
          </View>
        </Section>
      ) : null}

      {activeSource ? (
        <>
          <VideoPreview source={activeSource} />
        </>
      ) : null}
      <VideoIntakePanel
        analysisWindowMode={analysisWindowMode}
        onAnalysisWindowModeChange={(mode) => {
          selectionFeedback();
          setPreparedResourcePacket('');
          setPreparedExecutionPacket('');
          setAnalysisWindowMode(mode);
        }}
        modelPreflight={modelPreflight}
        onPrepareExecutionPacket={prepareAnalysisExecutionPacket}
        onPrepareResourcePacket={prepareAnalysisResourcePacket}
        source={intakeSource}
      />
      {preparedResourcePacket ? (
        <View style={styles.resourcePacketBox}>
          <Text style={styles.resourcePacketTitle}>Prepared analysis resource packet</Text>
          <TextInput
            editable={false}
            multiline
            accessibilityLabel="Analysis resource packet JSON"
            style={styles.resourcePacketText}
            value={preparedResourcePacket}
          />
        </View>
      ) : null}
      {preparedExecutionPacket ? (
        <View style={styles.resourcePacketBox}>
          <Text style={styles.resourcePacketTitle}>Prepared analysis execution packet</Text>
          <TextInput
            editable={false}
            multiline
            accessibilityLabel="Analysis execution packet JSON"
            style={styles.resourcePacketText}
            value={preparedExecutionPacket}
          />
        </View>
      ) : null}

      {errorMessage ? (
        <View style={styles.error}>
          <Text style={styles.errorText}>{errorMessage}</Text>
        </View>
      ) : null}

      <Section title="Demo sources" caption="Use these only when no local video is selected.">
        <View style={styles.attempts}>
          {attempts.map((attempt) => {
            const selected = !activeSource && attempt.session.id === selectedAttemptId;
            return (
              <Pressable
                key={attempt.session.id}
                onPress={() => selectDemoAttempt(attempt.session.id)}
                style={[styles.attempt, selected ? styles.attemptSelected : null]}
              >
                <Text style={[styles.attemptTitle, selected ? styles.attemptTitleSelected : null]}>
                  {attempt.session.title}
                </Text>
                <Text style={[styles.attemptMeta, selected ? styles.attemptMetaSelected : null]}>
                  {attempt.session.gym} · {attempt.session.grade}
                </Text>
                <Text style={[styles.attemptDescription, selected ? styles.attemptMetaSelected : null]}>
                  {attempt.description}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </Section>

      {workflow.stateTitle ? (
        <StateView loading title={workflow.stateTitle} message={workflow.stateMessage ?? ''} />
      ) : !report ? (
        <StateView title="No analysis yet" message="Choose a valid local video or one of the bundled attempts." />
      ) : (
        <>
          <PoseOverlay frame={report.keyFrame} />

          <View style={styles.privacy}>
            <ShieldCheck color={theme.colors.success} size={18} />
            <Text style={styles.privacyText}>
              {report.engine.provider} · {report.engine.processedFrames} frames ·{' '}
              {formatAnalysisDuration(report.performance.analysisMs)} · {report.performance.budgetStatus} ·{' '}
              {report.engine.analysisWindow ? `${formatVideoAnalysisWindow(report.engine.analysisWindow)} · ` : ''}
              video upload {report.engine.uploadsVideo ? 'enabled' : 'disabled'}
            </Text>
          </View>

          <AnalysisQualityPanel report={report} />
          <CaptureReadinessPanel report={report} />
          <AnalysisTrustPanel report={report} />
          <BetaReplayPlanPanel plan={buildBetaReplayPlan(report)} />
          <MovementPhaseBreakdownPanel breakdown={buildMovementPhaseBreakdown(report)} />
          {cueTrust ? <CueTrustPanel cueTrust={cueTrust} /> : null}

          <Section title="Movement metrics">
            {report.metrics.map((metric) => (
              <MovementMetricRow key={metric.id} metric={metric} />
            ))}
          </Section>

          <Section title="Coach cues">
            {report.cues.map((cue) => (
              <MovementCueCard key={cue.id} cue={cue} trustSignal={cueTrustById.get(cue.id)} />
            ))}
          </Section>

          <Section title="Timeline">
            <View style={styles.timeline}>
              {report.timeline.map((event) => (
                <View key={event.id} style={styles.timelineRow}>
                  <Text style={styles.timelineTime}>{(event.timestampMs / 1000).toFixed(1)}s</Text>
                  <Text style={styles.timelineLabel}>{event.label}</Text>
                  <Text style={styles.timelineType}>{event.type}</Text>
                </View>
              ))}
            </View>
          </Section>
        </>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  action: {
    alignItems: 'center',
    backgroundColor: theme.colors.brand,
    borderRadius: theme.radius.sm,
    flexDirection: 'row',
    gap: 7,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  actionText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '900',
  },
  attempts: {
    gap: theme.spacing.sm,
  },
  attempt: {
    backgroundColor: theme.colors.surface,
    borderColor: theme.colors.line,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    gap: 4,
    padding: theme.spacing.md,
  },
  attemptDescription: {
    color: theme.colors.muted,
    fontSize: 13,
    lineHeight: 18,
  },
  attemptMeta: {
    color: theme.colors.brand,
    fontSize: 12,
    fontWeight: '900',
  },
  attemptMetaSelected: {
    color: '#DCECF3',
  },
  attemptSelected: {
    backgroundColor: theme.colors.brandDark,
    borderColor: theme.colors.brandDark,
  },
  attemptTitle: {
    color: theme.colors.ink,
    fontSize: 16,
    fontWeight: '900',
  },
  attemptTitleSelected: {
    color: '#FFFFFF',
  },
  betaPlan: {
    backgroundColor: theme.colors.surface,
    borderColor: theme.colors.line,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    gap: theme.spacing.md,
    padding: theme.spacing.md,
  },
  betaPlanCopy: {
    flex: 1,
    gap: 3,
  },
  betaPlanHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: theme.spacing.md,
  },
  betaPlanIcon: {
    alignItems: 'center',
    backgroundColor: theme.colors.brand,
    borderRadius: theme.radius.md,
    height: 42,
    justifyContent: 'center',
    width: 42,
  },
  betaPlanSummary: {
    color: theme.colors.text,
    fontSize: 13,
    lineHeight: 18,
  },
  betaPlanTitle: {
    color: theme.colors.ink,
    fontSize: 16,
    fontWeight: '900',
  },
  betaStep: {
    backgroundColor: theme.colors.surfaceAlt,
    borderRadius: theme.radius.sm,
    gap: 5,
    padding: theme.spacing.sm,
  },
  betaStepAction: {
    color: theme.colors.text,
    fontSize: 13,
    fontWeight: '800',
    lineHeight: 18,
  },
  betaStepEvidence: {
    color: theme.colors.brand,
    fontSize: 12,
    fontWeight: '900',
    lineHeight: 16,
  },
  betaStepList: {
    gap: 7,
  },
  betaStepPhase: {
    color: theme.colors.brandDark,
    fontSize: 11,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  betaStepTime: {
    color: theme.colors.muted,
    fontSize: 11,
    fontWeight: '900',
  },
  betaStepTitle: {
    color: theme.colors.ink,
    fontSize: 14,
    fontWeight: '900',
  },
  betaStepTop: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: theme.spacing.sm,
    justifyContent: 'space-between',
  },
  cameraView: {
    ...StyleSheet.absoluteFill,
  },
  capture: {
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    borderColor: theme.colors.line,
    borderRadius: theme.radius.lg,
    borderWidth: 1,
    flexDirection: 'row',
    gap: theme.spacing.md,
    padding: theme.spacing.md,
  },
  captureActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.sm,
    marginTop: theme.spacing.sm,
  },
  captureCopy: {
    flex: 1,
    gap: 4,
  },
  captureIcon: {
    alignItems: 'center',
    backgroundColor: theme.colors.brandSoft,
    borderRadius: theme.radius.md,
    height: 52,
    justifyContent: 'center',
    width: 52,
  },
  captureText: {
    color: theme.colors.muted,
    fontSize: 13,
    lineHeight: 18,
  },
  captureTitle: {
    color: theme.colors.ink,
    fontSize: 16,
    fontWeight: '900',
  },
  disabled: {
    opacity: 0.65,
  },
  error: {
    backgroundColor: '#FBEDEA',
    borderColor: '#F0C7BD',
    borderRadius: theme.radius.md,
    borderWidth: 1,
    padding: theme.spacing.md,
  },
  errorText: {
    color: theme.colors.coral,
    fontSize: 13,
    fontWeight: '800',
    lineHeight: 18,
  },
  modelPreflight: {
    backgroundColor: theme.colors.surface,
    borderColor: '#E3BB77',
    borderRadius: theme.radius.md,
    borderWidth: 1,
    gap: theme.spacing.sm,
    padding: theme.spacing.md,
  },
  modelPreflightAction: {
    color: theme.colors.text,
    fontSize: 13,
    fontWeight: '800',
    lineHeight: 18,
  },
  modelPreflightBadge: {
    backgroundColor: '#FFF3DF',
    borderRadius: theme.radius.sm,
    color: theme.colors.amber,
    fontSize: 11,
    fontWeight: '900',
    overflow: 'hidden',
    paddingHorizontal: 9,
    paddingVertical: 6,
    textTransform: 'uppercase',
  },
  modelPreflightBadgeBlocked: {
    backgroundColor: '#FBEDEA',
    color: theme.colors.coral,
  },
  modelPreflightBadgeReady: {
    backgroundColor: '#E8F4EE',
    color: theme.colors.success,
  },
  modelPreflightBlocked: {
    borderColor: '#F0C7BD',
  },
  modelPreflightButton: {
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: theme.colors.brandSoft,
    borderRadius: theme.radius.sm,
    flexDirection: 'row',
    gap: 7,
    minHeight: 38,
    paddingHorizontal: 12,
  },
  modelPreflightButtonText: {
    color: theme.colors.brand,
    fontSize: 13,
    fontWeight: '900',
  },
  modelPreflightDetail: {
    color: theme.colors.muted,
    fontSize: 12,
    fontWeight: '800',
    lineHeight: 17,
  },
  modelPreflightMetric: {
    backgroundColor: theme.colors.surfaceAlt,
    borderRadius: theme.radius.sm,
    color: theme.colors.text,
    fontSize: 11,
    fontWeight: '900',
    overflow: 'hidden',
    paddingHorizontal: 8,
    paddingVertical: 5,
  },
  modelPreflightMetrics: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  modelPreflightReady: {
    borderColor: '#B8D8C8',
  },
  modelPreflightTitle: {
    color: theme.colors.ink,
    fontSize: 15,
    fontWeight: '900',
  },
  modelPreflightTitleGroup: {
    flex: 1,
    gap: 2,
  },
  modelPreflightTitleRow: {
    alignItems: 'flex-start',
    flex: 1,
    flexDirection: 'row',
    gap: 7,
  },
  modelPreflightTop: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: theme.spacing.sm,
    justifyContent: 'space-between',
  },
  metadataField: {
    flex: 1,
    gap: 6,
    minWidth: 160,
  },
  metadataGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.sm,
  },
  metadataInput: {
    backgroundColor: theme.colors.surface,
    borderColor: theme.colors.line,
    borderRadius: theme.radius.sm,
    borderWidth: 1,
    color: theme.colors.ink,
    fontSize: 14,
    fontWeight: '800',
    minHeight: 44,
    paddingHorizontal: 12,
  },
  metadataLabel: {
    color: theme.colors.muted,
    fontSize: 12,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  lensApplied: {
    alignItems: 'center',
    backgroundColor: theme.colors.brandSoft,
    borderRadius: theme.radius.sm,
    flexDirection: 'row',
    gap: theme.spacing.sm,
    justifyContent: 'space-between',
    padding: theme.spacing.sm,
  },
  lensAppliedLabel: {
    color: theme.colors.brand,
    fontSize: 11,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  lensAppliedValue: {
    color: theme.colors.ink,
    fontSize: 13,
    fontWeight: '900',
  },
  lensGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.sm,
  },
  lensOption: {
    backgroundColor: theme.colors.surface,
    borderColor: theme.colors.line,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    flex: 1,
    gap: 5,
    minWidth: 150,
    padding: theme.spacing.md,
  },
  lensOptionSelected: {
    backgroundColor: theme.colors.brandDark,
    borderColor: theme.colors.brandDark,
  },
  lensSummary: {
    color: theme.colors.muted,
    fontSize: 12,
    fontWeight: '700',
    lineHeight: 17,
  },
  lensSummarySelected: {
    color: '#DCECF3',
  },
  lensTitle: {
    color: theme.colors.ink,
    fontSize: 14,
    fontWeight: '900',
  },
  lensTitleSelected: {
    color: '#FFFFFF',
  },
  phaseAction: {
    color: theme.colors.text,
    fontSize: 12,
    fontWeight: '800',
    lineHeight: 17,
  },
  phaseBreakdown: {
    gap: theme.spacing.sm,
  },
  phaseCard: {
    backgroundColor: theme.colors.surface,
    borderColor: theme.colors.line,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    gap: 6,
    padding: theme.spacing.md,
  },
  phaseEvidence: {
    color: theme.colors.muted,
    fontSize: 12,
    fontWeight: '800',
    lineHeight: 16,
  },
  phaseList: {
    gap: theme.spacing.sm,
  },
  phaseScore: {
    color: theme.colors.brand,
    fontSize: 18,
    fontWeight: '900',
  },
  phaseStatus: {
    backgroundColor: '#FFF3DF',
    borderRadius: theme.radius.sm,
    color: theme.colors.amber,
    fontSize: 11,
    fontWeight: '900',
    overflow: 'hidden',
    paddingHorizontal: 8,
    paddingVertical: 5,
    textTransform: 'uppercase',
  },
  phaseStatusReset: {
    backgroundColor: '#FBEDEA',
    color: theme.colors.coral,
  },
  phaseStatusSmooth: {
    backgroundColor: '#E8F4EE',
    color: theme.colors.success,
  },
  phaseSummary: {
    backgroundColor: theme.colors.brandDark,
    borderRadius: theme.radius.md,
    gap: 4,
    padding: theme.spacing.md,
  },
  phaseSummaryText: {
    color: '#DCECF3',
    fontSize: 12,
    fontWeight: '800',
    lineHeight: 17,
  },
  phaseSummaryTitle: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '900',
    lineHeight: 20,
  },
  phaseTitle: {
    color: theme.colors.ink,
    flex: 1,
    fontSize: 15,
    fontWeight: '900',
  },
  phaseTop: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: theme.spacing.sm,
    justifyContent: 'space-between',
  },
  trustBadge: {
    backgroundColor: theme.colors.surfaceAlt,
    borderRadius: theme.radius.sm,
    fontSize: 11,
    fontWeight: '900',
    overflow: 'hidden',
    paddingHorizontal: 8,
    paddingVertical: 5,
    textTransform: 'uppercase',
  },
  trustCard: {
    backgroundColor: theme.colors.surface,
    borderColor: theme.colors.line,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    gap: 6,
    padding: theme.spacing.md,
  },
  trustCardScore: {
    color: theme.colors.brand,
    fontSize: 18,
    fontVariant: ['tabular-nums'],
    fontWeight: '900',
  },
  trustCardTitle: {
    color: theme.colors.ink,
    flex: 1,
    fontSize: 15,
    fontWeight: '900',
  },
  trustCardTop: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: theme.spacing.sm,
    justifyContent: 'space-between',
  },
  trustExplanation: {
    color: theme.colors.text,
    fontSize: 12,
    fontWeight: '800',
    lineHeight: 17,
  },
  trustFactor: {
    alignItems: 'center',
    backgroundColor: theme.colors.surfaceAlt,
    borderRadius: theme.radius.sm,
    flexDirection: 'row',
    gap: theme.spacing.sm,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  trustFactorLabel: {
    color: theme.colors.ink,
    flex: 1,
    fontSize: 12,
    fontWeight: '900',
  },
  trustFactorScore: {
    color: theme.colors.brand,
    fontSize: 12,
    fontVariant: ['tabular-nums'],
    fontWeight: '900',
  },
  trustFactors: {
    gap: 6,
  },
  trustFactorStatus: {
    color: theme.colors.success,
    fontSize: 11,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  trustFactorWeak: {
    color: theme.colors.coral,
  },
  trustList: {
    gap: theme.spacing.sm,
  },
  trustSummary: {
    backgroundColor: theme.colors.brandDark,
    borderRadius: theme.radius.md,
    gap: 5,
    padding: theme.spacing.md,
  },
  trustSummaryScore: {
    color: '#FFFFFF',
    fontSize: 20,
    fontVariant: ['tabular-nums'],
    fontWeight: '900',
  },
  trustSummaryText: {
    color: '#DCECF3',
    fontSize: 13,
    fontWeight: '800',
    lineHeight: 18,
  },
  trustSummaryTitle: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '900',
  },
  trustSummaryTitleRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: theme.spacing.sm,
  },
  trustSummaryTop: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: theme.spacing.sm,
    justifyContent: 'space-between',
  },
  trustValidation: {
    color: '#DCECF3',
    fontSize: 12,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  previewCopy: {
    flex: 1,
    gap: 2,
  },
  previewMeta: {
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    borderColor: theme.colors.line,
    borderTopWidth: 1,
    flexDirection: 'row',
    gap: theme.spacing.sm,
    padding: theme.spacing.md,
  },
  previewShell: {
    backgroundColor: theme.colors.surface,
    borderColor: theme.colors.line,
    borderRadius: theme.radius.lg,
    borderWidth: 1,
    overflow: 'hidden',
  },
  previewText: {
    color: theme.colors.muted,
    fontSize: 12,
    fontWeight: '800',
  },
  previewTitle: {
    color: theme.colors.ink,
    fontSize: 15,
    fontWeight: '900',
  },
  prepBadge: {
    backgroundColor: '#FFF3DF',
    borderRadius: theme.radius.sm,
    color: theme.colors.amber,
    fontSize: 11,
    fontWeight: '900',
    overflow: 'hidden',
    paddingHorizontal: 8,
    paddingVertical: 5,
    textTransform: 'uppercase',
  },
  prepBadgeBlocked: {
    backgroundColor: '#FBEDEA',
    color: theme.colors.coral,
  },
  prepBadgeReady: {
    backgroundColor: '#E8F4EE',
    color: theme.colors.success,
  },
  prepCriteria: {
    gap: 5,
  },
  prepCriterion: {
    color: theme.colors.text,
    fontSize: 12,
    fontWeight: '800',
    lineHeight: 17,
  },
  prepMeta: {
    color: theme.colors.muted,
    fontSize: 12,
    fontWeight: '800',
    lineHeight: 17,
  },
  prepPhase: {
    backgroundColor: theme.colors.surfaceAlt,
    borderRadius: theme.radius.sm,
    gap: 5,
    padding: theme.spacing.sm,
  },
  prepPhaseEvidence: {
    color: theme.colors.brand,
    fontSize: 11,
    fontWeight: '900',
    lineHeight: 15,
  },
  prepPhaseInstruction: {
    color: theme.colors.text,
    fontSize: 12,
    fontWeight: '800',
    lineHeight: 17,
  },
  prepPhaseKind: {
    color: theme.colors.brandDark,
    fontSize: 10,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  prepPhaseList: {
    gap: 7,
  },
  prepPhaseTime: {
    color: theme.colors.muted,
    fontSize: 10,
    fontWeight: '900',
  },
  prepPhaseTitle: {
    color: theme.colors.ink,
    fontSize: 13,
    fontWeight: '900',
  },
  prepPhaseTop: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: theme.spacing.sm,
    justifyContent: 'space-between',
  },
  prepPrivacy: {
    color: theme.colors.text,
    fontSize: 12,
    fontWeight: '800',
    lineHeight: 17,
  },
  prepProtocol: {
    backgroundColor: theme.colors.surface,
    borderColor: theme.colors.line,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    gap: theme.spacing.sm,
    padding: theme.spacing.md,
  },
  prepProtocolBlocked: {
    borderColor: theme.colors.coral,
  },
  prepProtocolReady: {
    borderColor: theme.colors.success,
  },
  prepTitle: {
    color: theme.colors.ink,
    fontSize: 16,
    fontWeight: '900',
  },
  prepTitleGroup: {
    flex: 1,
    gap: 3,
  },
  prepTop: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: theme.spacing.sm,
    justifyContent: 'space-between',
  },
  intake: {
    backgroundColor: theme.colors.surface,
    borderColor: theme.colors.line,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    gap: theme.spacing.sm,
    padding: theme.spacing.md,
  },
  intakeAction: {
    color: theme.colors.text,
    fontSize: 14,
    fontWeight: '800',
    lineHeight: 20,
  },
  intakeBadge: {
    backgroundColor: '#FFF3DF',
    borderRadius: theme.radius.sm,
    color: theme.colors.amber,
    fontSize: 11,
    fontWeight: '900',
    overflow: 'hidden',
    paddingHorizontal: 9,
    paddingVertical: 6,
    textTransform: 'uppercase',
  },
  intakeBadgeBlocked: {
    backgroundColor: '#FBEDEA',
    color: theme.colors.coral,
  },
  intakeBadgeReady: {
    backgroundColor: '#E8F4EE',
    color: theme.colors.success,
  },
  intakeBlocked: {
    borderColor: '#F0C7BD',
  },
  intakeIssue: {
    alignItems: 'flex-start',
    backgroundColor: theme.colors.surfaceAlt,
    borderRadius: theme.radius.sm,
    flexDirection: 'row',
    gap: theme.spacing.sm,
    padding: theme.spacing.sm,
  },
  intakeIssueBlock: {
    color: theme.colors.coral,
  },
  intakeIssueCopy: {
    flex: 1,
    gap: 2,
  },
  intakeIssueDetail: {
    color: theme.colors.muted,
    fontSize: 12,
    fontWeight: '700',
    lineHeight: 16,
  },
  intakeIssueSeverity: {
    color: theme.colors.amber,
    fontSize: 11,
    fontWeight: '900',
    textTransform: 'uppercase',
    width: 56,
  },
  intakeIssues: {
    gap: 7,
  },
  intakeIssueTitle: {
    color: theme.colors.ink,
    fontSize: 13,
    fontWeight: '900',
  },
  intakeReady: {
    borderColor: '#B8D8C8',
  },
  intakeStat: {
    backgroundColor: theme.colors.surfaceAlt,
    borderRadius: theme.radius.sm,
    flex: 1,
    minWidth: 82,
    padding: theme.spacing.sm,
  },
  intakeStatLabel: {
    color: theme.colors.muted,
    fontSize: 11,
    fontWeight: '900',
    marginTop: 2,
    textTransform: 'uppercase',
  },
  intakeStats: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 7,
  },
  intakeStatValue: {
    color: theme.colors.brand,
    fontSize: 14,
    fontWeight: '900',
  },
  intakeTitle: {
    color: theme.colors.ink,
    fontSize: 15,
    fontWeight: '900',
  },
  intakeTitleRow: {
    alignItems: 'center',
    flex: 1,
    flexDirection: 'row',
    gap: 7,
  },
  intakeTop: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: theme.spacing.sm,
    justifyContent: 'space-between',
  },
  analysisWindow: {
    backgroundColor: theme.colors.surfaceAlt,
    borderColor: theme.colors.line,
    borderRadius: theme.radius.sm,
    borderWidth: 1,
    gap: 8,
    padding: theme.spacing.sm,
  },
  analysisWindowActive: {
    borderColor: '#B8D8C8',
  },
  analysisWindowBadge: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.sm,
    color: theme.colors.muted,
    fontSize: 11,
    fontWeight: '900',
    overflow: 'hidden',
    paddingHorizontal: 8,
    paddingVertical: 5,
    textTransform: 'uppercase',
  },
  analysisWindowBadgeActive: {
    backgroundColor: '#E8F4EE',
    color: theme.colors.success,
  },
  analysisWindowMeta: {
    color: theme.colors.brand,
    fontSize: 12,
    fontWeight: '900',
  },
  analysisWindowOption: {
    backgroundColor: theme.colors.surface,
    borderColor: theme.colors.line,
    borderRadius: theme.radius.sm,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  analysisWindowOptionSelected: {
    backgroundColor: theme.colors.brand,
    borderColor: theme.colors.brand,
  },
  analysisWindowOptionText: {
    color: theme.colors.text,
    fontSize: 12,
    fontWeight: '900',
    textTransform: 'capitalize',
  },
  analysisWindowOptionTextSelected: {
    color: '#FFFFFF',
  },
  analysisWindowOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 7,
  },
  analysisWindowText: {
    color: theme.colors.text,
    fontSize: 12,
    fontWeight: '800',
    lineHeight: 17,
  },
  analysisWindowTitle: {
    color: theme.colors.ink,
    fontSize: 13,
    fontWeight: '900',
  },
  analysisWindowTitleGroup: {
    flex: 1,
    gap: 2,
  },
  analysisWindowTop: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: theme.spacing.sm,
    justifyContent: 'space-between',
  },
  resourcePacketBox: {
    backgroundColor: theme.colors.surface,
    borderColor: theme.colors.line,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    gap: theme.spacing.sm,
    padding: theme.spacing.md,
  },
  resourcePacketText: {
    color: theme.colors.text,
    fontFamily: 'Courier',
    fontSize: 11,
    lineHeight: 15,
    minHeight: 180,
  },
  resourcePacketTitle: {
    color: theme.colors.ink,
    fontSize: 13,
    fontWeight: '900',
  },
  resourcePlan: {
    backgroundColor: theme.colors.surfaceAlt,
    borderColor: theme.colors.line,
    borderRadius: theme.radius.sm,
    borderWidth: 1,
    gap: 8,
    padding: theme.spacing.sm,
  },
  resourcePlanAction: {
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: theme.colors.surface,
    borderColor: theme.colors.line,
    borderRadius: theme.radius.sm,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  resourcePlanActionText: {
    color: theme.colors.brand,
    fontSize: 12,
    fontWeight: '900',
  },
  resourcePlanBadge: {
    backgroundColor: '#FFF3DF',
    borderRadius: theme.radius.sm,
    color: theme.colors.amber,
    fontSize: 11,
    fontWeight: '900',
    overflow: 'hidden',
    paddingHorizontal: 8,
    paddingVertical: 5,
    textTransform: 'uppercase',
  },
  resourcePlanBadgeBlocked: {
    backgroundColor: '#FBEDEA',
    color: theme.colors.coral,
  },
  resourcePlanBadgeReady: {
    backgroundColor: '#E8F4EE',
    color: theme.colors.success,
  },
  resourcePlanBlocked: {
    borderColor: '#F0C7BD',
  },
  resourcePlanMetric: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.sm,
    color: theme.colors.text,
    fontSize: 11,
    fontWeight: '900',
    overflow: 'hidden',
    paddingHorizontal: 8,
    paddingVertical: 5,
  },
  resourcePlanMetrics: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  resourcePlanReady: {
    borderColor: '#B8D8C8',
  },
  resourcePlanStep: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: theme.spacing.sm,
  },
  resourcePlanStepBlocked: {
    color: theme.colors.coral,
  },
  resourcePlanStepCopy: {
    flex: 1,
    gap: 2,
  },
  resourcePlanStepDetail: {
    color: theme.colors.muted,
    fontSize: 11,
    fontWeight: '800',
    lineHeight: 15,
  },
  resourcePlanStepReady: {
    color: theme.colors.success,
  },
  resourcePlanSteps: {
    gap: 7,
  },
  resourcePlanStepStatus: {
    color: theme.colors.amber,
    fontSize: 10,
    fontWeight: '900',
    textTransform: 'uppercase',
    width: 50,
  },
  resourcePlanStepTitle: {
    color: theme.colors.ink,
    fontSize: 12,
    fontWeight: '900',
  },
  resourcePlanSummary: {
    color: theme.colors.text,
    fontSize: 12,
    fontWeight: '800',
    lineHeight: 17,
  },
  resourcePlanTitle: {
    color: theme.colors.ink,
    flex: 1,
    fontSize: 13,
    fontWeight: '900',
  },
  resourcePlanTitleRow: {
    alignItems: 'center',
    flex: 1,
    flexDirection: 'row',
    gap: 7,
  },
  resourcePlanTop: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: theme.spacing.sm,
    justifyContent: 'space-between',
  },
  triage: {
    backgroundColor: theme.colors.surfaceAlt,
    borderColor: theme.colors.line,
    borderRadius: theme.radius.sm,
    borderWidth: 1,
    gap: 8,
    padding: theme.spacing.sm,
  },
  triageActions: {
    gap: 3,
  },
  triageBadge: {
    backgroundColor: '#FFF3DF',
    borderRadius: theme.radius.sm,
    color: theme.colors.amber,
    fontSize: 11,
    fontWeight: '900',
    overflow: 'hidden',
    paddingHorizontal: 8,
    paddingVertical: 5,
    textTransform: 'uppercase',
  },
  triageBadgeBlocked: {
    backgroundColor: '#FBEDEA',
    color: theme.colors.coral,
  },
  triageBadgeReady: {
    backgroundColor: '#E8F4EE',
    color: theme.colors.success,
  },
  triageBlocked: {
    borderColor: '#F0C7BD',
  },
  triageMetric: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.sm,
    color: theme.colors.text,
    fontSize: 11,
    fontWeight: '900',
    overflow: 'hidden',
    paddingHorizontal: 8,
    paddingVertical: 5,
  },
  triageMetrics: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  triagePrimary: {
    color: theme.colors.ink,
    fontSize: 13,
    fontWeight: '900',
    lineHeight: 18,
  },
  triagePrivacy: {
    color: theme.colors.muted,
    fontSize: 11,
    fontWeight: '800',
    lineHeight: 15,
  },
  triageReady: {
    borderColor: '#B8D8C8',
  },
  triageReason: {
    backgroundColor: '#FFF3DF',
    borderRadius: theme.radius.sm,
    color: theme.colors.amber,
    fontSize: 11,
    fontWeight: '900',
    overflow: 'hidden',
    paddingHorizontal: 8,
    paddingVertical: 5,
  },
  triageReasonBlocked: {
    backgroundColor: '#FBEDEA',
    color: theme.colors.coral,
  },
  triageReasons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  triageSecondary: {
    color: theme.colors.muted,
    fontSize: 12,
    fontWeight: '800',
    lineHeight: 16,
  },
  triageSummary: {
    color: theme.colors.text,
    fontSize: 12,
    fontWeight: '800',
    lineHeight: 17,
  },
  triageTitle: {
    color: theme.colors.ink,
    flex: 1,
    fontSize: 13,
    fontWeight: '900',
  },
  triageTitleRow: {
    alignItems: 'center',
    flex: 1,
    flexDirection: 'row',
    gap: 7,
  },
  triageTop: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: theme.spacing.sm,
    justifyContent: 'space-between',
  },
  quality: {
    backgroundColor: theme.colors.surface,
    borderColor: theme.colors.line,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    gap: theme.spacing.sm,
    padding: theme.spacing.md,
  },
  qualityScore: {
    color: theme.colors.brand,
    fontSize: 18,
    fontWeight: '900',
  },
  qualityScoreWarning: {
    color: theme.colors.amber,
  },
  qualityStat: {
    backgroundColor: theme.colors.surfaceAlt,
    borderRadius: theme.radius.sm,
    color: theme.colors.text,
    fontSize: 12,
    fontWeight: '900',
    overflow: 'hidden',
    paddingHorizontal: 9,
    paddingVertical: 6,
  },
  qualityStats: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 7,
  },
  qualityTitle: {
    color: theme.colors.ink,
    fontSize: 15,
    fontWeight: '900',
  },
  qualityTitleRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 7,
  },
  qualityTop: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: theme.spacing.sm,
    justifyContent: 'space-between',
  },
  qualityWarning: {
    borderColor: '#E3BB77',
  },
  qualityWarningRow: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: 7,
  },
  qualityWarnings: {
    gap: 6,
  },
  qualityWarningText: {
    color: theme.colors.text,
    flex: 1,
    fontSize: 13,
    fontWeight: '700',
    lineHeight: 18,
  },
  readiness: {
    backgroundColor: theme.colors.surface,
    borderColor: theme.colors.line,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    gap: theme.spacing.sm,
    padding: theme.spacing.md,
  },
  readinessAction: {
    color: theme.colors.text,
    fontSize: 14,
    fontWeight: '800',
    lineHeight: 20,
  },
  readinessAdvice: {
    gap: 6,
  },
  readinessAdviceText: {
    color: theme.colors.muted,
    fontSize: 13,
    fontWeight: '700',
    lineHeight: 18,
  },
  readinessBadge: {
    backgroundColor: '#FFF3DF',
    borderRadius: theme.radius.sm,
    color: theme.colors.amber,
    fontSize: 11,
    fontWeight: '900',
    overflow: 'hidden',
    paddingHorizontal: 9,
    paddingVertical: 6,
    textTransform: 'uppercase',
  },
  readinessBadgeReady: {
    backgroundColor: '#E8F4EE',
    color: theme.colors.success,
  },
  readinessBadgeRetake: {
    backgroundColor: '#FBEDEA',
    color: theme.colors.coral,
  },
  readinessCheck: {
    alignItems: 'center',
    backgroundColor: theme.colors.surfaceAlt,
    borderRadius: theme.radius.sm,
    flexDirection: 'row',
    gap: theme.spacing.sm,
    padding: theme.spacing.sm,
  },
  readinessCheckCopy: {
    flex: 1,
    gap: 2,
  },
  readinessCheckDetail: {
    color: theme.colors.muted,
    fontSize: 12,
    fontWeight: '700',
    lineHeight: 16,
  },
  readinessCheckFail: {
    color: theme.colors.coral,
  },
  readinessCheckLabel: {
    color: theme.colors.ink,
    fontSize: 13,
    fontWeight: '900',
  },
  readinessChecks: {
    gap: 7,
  },
  readinessCheckStatus: {
    color: theme.colors.brandDark,
    fontSize: 11,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  readinessCheckValue: {
    color: theme.colors.brand,
    fontSize: 13,
    fontWeight: '900',
    minWidth: 42,
  },
  readinessReady: {
    borderColor: '#B8D8C8',
  },
  readinessRetake: {
    borderColor: '#F0C7BD',
  },
  readinessTitle: {
    color: theme.colors.ink,
    fontSize: 15,
    fontWeight: '900',
  },
  readinessTitleRow: {
    alignItems: 'center',
    flex: 1,
    flexDirection: 'row',
    gap: 7,
  },
  readinessTop: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: theme.spacing.sm,
    justifyContent: 'space-between',
  },
  privacy: {
    alignItems: 'center',
    backgroundColor: '#E8F4EE',
    borderRadius: theme.radius.md,
    flexDirection: 'row',
    gap: theme.spacing.sm,
    padding: theme.spacing.md,
  },
  privacyText: {
    color: theme.colors.success,
    flex: 1,
    fontSize: 13,
    fontWeight: '900',
  },
  recorderActionText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '900',
  },
  recorderGhost: {
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.38)',
    borderRadius: theme.radius.sm,
    flexDirection: 'row',
    gap: 7,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  recorderGhostText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '900',
  },
  recordingGuide: {
    backgroundColor: 'rgba(10,24,32,0.78)',
    borderColor: 'rgba(255,255,255,0.22)',
    borderRadius: theme.radius.md,
    borderWidth: 1,
    gap: 7,
    left: theme.spacing.md,
    padding: theme.spacing.md,
    position: 'absolute',
    right: theme.spacing.md,
    top: 72,
  },
  recordingGuideBadge: {
    color: '#BFD4DC',
    fontSize: 10,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  recordingGuideBadgeReady: {
    color: '#B8D8C8',
  },
  recordingGuideBody: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
    lineHeight: 18,
  },
  recordingGuideProgress: {
    backgroundColor: 'rgba(255,255,255,0.18)',
    borderRadius: 999,
    height: 5,
    overflow: 'hidden',
  },
  recordingGuideProgressFill: {
    backgroundColor: '#B8D8C8',
    borderRadius: 999,
    height: 5,
  },
  recordingGuideReady: {
    borderColor: '#B8D8C8',
  },
  recordingGuideTitle: {
    color: '#FFFFFF',
    flex: 1,
    fontSize: 14,
    fontWeight: '900',
  },
  recordingGuideTop: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: theme.spacing.sm,
    justifyContent: 'space-between',
  },
  recordingGuideWarning: {
    borderColor: '#F0C7BD',
  },
  recorderHint: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '800',
    opacity: 0.86,
  },
  recorderOverlay: {
    alignItems: 'flex-end',
    bottom: theme.spacing.md,
    flexDirection: 'row',
    justifyContent: 'space-between',
    left: theme.spacing.md,
    position: 'absolute',
    right: theme.spacing.md,
  },
  recorderRecord: {
    alignItems: 'center',
    backgroundColor: theme.colors.coral,
    borderRadius: theme.radius.sm,
    flexDirection: 'row',
    gap: 7,
    paddingHorizontal: 14,
    paddingVertical: 11,
  },
  recorderShell: {
    aspectRatio: 9 / 14,
    backgroundColor: '#111111',
    borderRadius: theme.radius.lg,
    overflow: 'hidden',
  },
  recorderStop: {
    alignItems: 'center',
    backgroundColor: theme.colors.brandDark,
    borderRadius: theme.radius.sm,
    flexDirection: 'row',
    gap: 7,
    paddingHorizontal: 14,
    paddingVertical: 11,
  },
  recorderTimer: {
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.42)',
    borderRadius: theme.radius.sm,
    flexDirection: 'row',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  recorderTimerText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '900',
  },
  recorderTop: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    left: theme.spacing.md,
    position: 'absolute',
    right: theme.spacing.md,
    top: theme.spacing.md,
  },
  secondaryAction: {
    alignItems: 'center',
    backgroundColor: theme.colors.brandSoft,
    borderRadius: theme.radius.sm,
    flexDirection: 'row',
    gap: 7,
    minHeight: 38,
    paddingHorizontal: 12,
  },
  secondaryActionText: {
    color: theme.colors.brand,
    fontSize: 13,
    fontWeight: '900',
  },
  setupAction: {
    color: theme.colors.text,
    fontSize: 14,
    fontWeight: '800',
    lineHeight: 20,
  },
  setupBadge: {
    backgroundColor: '#FFF3DF',
    borderRadius: theme.radius.sm,
    color: theme.colors.amber,
    fontSize: 11,
    fontWeight: '900',
    overflow: 'hidden',
    paddingHorizontal: 9,
    paddingVertical: 6,
  },
  setupBadgeBlocked: {
    backgroundColor: '#FBEDEA',
    color: theme.colors.coral,
  },
  setupBadgeReady: {
    backgroundColor: '#E8F4EE',
    color: theme.colors.success,
  },
  setupCheck: {
    alignItems: 'center',
    backgroundColor: theme.colors.surfaceAlt,
    borderRadius: theme.radius.sm,
    flexDirection: 'row',
    gap: theme.spacing.sm,
    padding: theme.spacing.sm,
  },
  setupCheckCopy: {
    flex: 1,
    gap: 2,
  },
  setupCheckDetail: {
    color: theme.colors.muted,
    fontSize: 12,
    fontWeight: '700',
    lineHeight: 16,
  },
  setupCheckFail: {
    color: theme.colors.coral,
  },
  setupCheckLabel: {
    color: theme.colors.ink,
    fontSize: 13,
    fontWeight: '900',
  },
  setupChecks: {
    gap: 7,
  },
  setupCheckStatus: {
    color: theme.colors.brandDark,
    fontSize: 11,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  setupCheckValue: {
    color: theme.colors.brand,
    fontSize: 13,
    fontWeight: '900',
    minWidth: 72,
  },
  setupGroup: {
    gap: 6,
  },
  setupGroups: {
    gap: theme.spacing.sm,
  },
  setupOption: {
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    borderColor: theme.colors.line,
    borderRadius: theme.radius.sm,
    borderWidth: 1,
    flex: 1,
    justifyContent: 'center',
    minHeight: 40,
    minWidth: 88,
    paddingHorizontal: 10,
  },
  setupOptionSelected: {
    backgroundColor: theme.colors.brandDark,
    borderColor: theme.colors.brandDark,
  },
  setupOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.sm,
  },
  setupOptionText: {
    color: theme.colors.brand,
    fontSize: 12,
    fontWeight: '900',
  },
  setupOptionTextSelected: {
    color: '#FFFFFF',
  },
  setupSummary: {
    backgroundColor: theme.colors.surface,
    borderColor: theme.colors.line,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    gap: theme.spacing.sm,
    padding: theme.spacing.md,
  },
  setupSummaryBlocked: {
    borderColor: '#F0C7BD',
  },
  setupSummaryReady: {
    borderColor: '#B8D8C8',
  },
  setupTitle: {
    color: theme.colors.ink,
    fontSize: 15,
    fontWeight: '900',
  },
  setupTitleRow: {
    alignItems: 'center',
    flex: 1,
    flexDirection: 'row',
    gap: 7,
  },
  setupTop: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: theme.spacing.sm,
    justifyContent: 'space-between',
  },
  wallAngleOption: {
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    borderColor: theme.colors.line,
    borderRadius: theme.radius.sm,
    borderWidth: 1,
    flex: 1,
    minHeight: 40,
    minWidth: 88,
    justifyContent: 'center',
    paddingHorizontal: 12,
  },
  wallAngleOptionSelected: {
    backgroundColor: theme.colors.brandDark,
    borderColor: theme.colors.brandDark,
  },
  wallAngleOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.sm,
  },
  wallAngleText: {
    color: theme.colors.brand,
    fontSize: 13,
    fontWeight: '900',
    textTransform: 'capitalize',
  },
  wallAngleTextSelected: {
    color: '#FFFFFF',
  },
  wallAngleWrap: {
    gap: 6,
  },
  timeline: {
    backgroundColor: theme.colors.surface,
    borderColor: theme.colors.line,
    borderRadius: theme.radius.md,
    borderWidth: 1,
  },
  timelineLabel: {
    color: theme.colors.ink,
    flex: 1,
    fontSize: 14,
    fontWeight: '800',
  },
  timelineRow: {
    alignItems: 'center',
    borderBottomColor: theme.colors.line,
    borderBottomWidth: 1,
    flexDirection: 'row',
    gap: theme.spacing.sm,
    padding: theme.spacing.md,
  },
  timelineTime: {
    color: theme.colors.brand,
    fontSize: 13,
    fontWeight: '900',
    width: 46,
  },
  timelineType: {
    color: theme.colors.muted,
    fontSize: 11,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  videoPreview: {
    aspectRatio: 9 / 12,
    backgroundColor: '#111111',
    width: '100%',
  },
});
