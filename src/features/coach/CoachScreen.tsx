import { useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as ImagePicker from 'expo-image-picker';
import { useVideoPlayer, VideoView } from 'expo-video';
import { Camera, Clock, Cpu, Gauge, RotateCcw, ShieldCheck, Square, TriangleAlert, Upload, Video } from 'lucide-react-native';

import { Header } from '@/components/Header';
import { MovementCueCard } from '@/components/MovementCueCard';
import { MovementMetricRow } from '@/components/MovementMetricRow';
import { PoseOverlay } from '@/components/PoseOverlay';
import { Screen } from '@/components/Screen';
import { Section } from '@/components/Section';
import { StateView } from '@/components/StateView';
import { selectionFeedback } from '@/core/haptics';
import { theme } from '@/core/theme';
import type { LocalAnalysisReport } from '@/movement/contracts';
import { buildBetaReplayPlan, type BetaReplayPlan } from '@/movement/betaReplayPlan';
import { assessCaptureReadiness } from '@/movement/captureReadiness';
import { buildMovementPhaseBreakdown, type MovementPhaseBreakdown } from '@/movement/movementPhaseBreakdown';
import { analyzeDemoAttempt, analyzeVideoAttempt, listDemoAttempts } from '@/movement/repository';
import {
  assessCaptureCalibration,
  captureCalibrationOptions,
  defaultCaptureCalibrationInput,
  type CaptureCalibrationAssessment,
  type CaptureCalibrationInput,
} from '@/video/captureCalibration';
import { videoAnalysisConfig } from '@/video/videoConfig';
import { assessVideoIntake, formatVideoDuration } from '@/video/videoIntake';
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

const attempts = listDemoAttempts();

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

function VideoIntakePanel({ source }: { source: VideoSourceResult }) {
  const assessment = assessVideoIntake(source.video);
  const isBlocked = assessment.status === 'blocked';
  const isReady = assessment.status === 'ready';

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
  const [selectedAttemptId, setSelectedAttemptId] = useState(attempts[0].session.id);
  const [activeSource, setActiveSource] = useState<ActiveSource>(null);
  const [sessionMetadata, setSessionMetadata] = useState(defaultEditableSession);
  const [captureCalibration, setCaptureCalibration] = useState<CaptureCalibrationInput>(defaultCaptureCalibrationInput);
  const intakeSource = activeSource ?? getDemoVideoSource(selectedAttemptId);
  const captureSetupAssessment = assessCaptureCalibration(captureCalibration);

  function updateSessionMetadata(nextMetadata: typeof defaultEditableSession) {
    setSessionMetadata(nextMetadata);
    setActiveSource((source) => (source ? updateVideoSourceSession(source, nextMetadata) : source));
  }

  async function runAnalysis(nextSource: ActiveSource = activeSource, sessionId = selectedAttemptId, withFeedback = true) {
    if (withFeedback) selectionFeedback();

    if (nextSource) {
      const intake = assessVideoIntake(nextSource.video);
      if (!intake.canAnalyze) {
        setLoading(false);
        setReport(null);
        setErrorMessage(intake.action);
        return;
      }
    }

    setLoading(true);
    setErrorMessage(null);

    try {
      const nextReport = nextSource
        ? await analyzeVideoAttempt(nextSource.video, nextSource.session)
        : await analyzeDemoAttempt(sessionId);
      setReport(nextReport);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'The local analysis pipeline failed.';
      setErrorMessage(message);
    } finally {
      setLoading(false);
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
    setActiveSource(source);
    setCameraOpen(false);
    await runAnalysis(source, selectedAttemptId, false);
  }

  function selectDemoAttempt(sessionId: string) {
    selectionFeedback();
    setActiveSource(null);
    setSelectedAttemptId(sessionId);
    void runAnalysis(null, sessionId, false);
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
          <Pressable disabled={loading} onPress={() => void runAnalysis()} style={[styles.action, loading ? styles.disabled : null]}>
            <Cpu color="#FFFFFF" size={17} />
            <Text style={styles.actionText}>{loading ? 'Analyzing' : 'Analyze'}</Text>
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
            <Pressable onPress={() => void openRecorder()} style={styles.secondaryAction}>
              <Camera color={theme.colors.brand} size={16} />
              <Text style={styles.secondaryActionText}>Record</Text>
            </Pressable>
            <Pressable onPress={() => void importVideo()} style={styles.secondaryAction}>
              <Upload color={theme.colors.brand} size={16} />
              <Text style={styles.secondaryActionText}>Import</Text>
            </Pressable>
          </View>
        </View>
      </View>

      <CaptureCalibrationPanel
        assessment={captureSetupAssessment}
        calibration={captureCalibration}
        disabled={loading || recording}
        onChange={setCaptureCalibration}
      />
      <SessionMetadataEditor disabled={loading || recording} metadata={sessionMetadata} onChange={updateSessionMetadata} />

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
      <VideoIntakePanel source={intakeSource} />

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

      {loading ? (
        <StateView loading title="Running local analysis" message="No upload, no cloud processing." />
      ) : !report ? (
        <StateView title="No analysis yet" message="Choose a valid local video or one of the bundled attempts." />
      ) : (
        <>
          <PoseOverlay frame={report.keyFrame} />

          <View style={styles.privacy}>
            <ShieldCheck color={theme.colors.success} size={18} />
            <Text style={styles.privacyText}>
              {report.engine.provider} · {report.engine.processedFrames} frames ·{' '}
              {formatAnalysisDuration(report.performance.analysisMs)} · {report.performance.budgetStatus} · video upload{' '}
              {report.engine.uploadsVideo ? 'enabled' : 'disabled'}
            </Text>
          </View>

          <AnalysisQualityPanel report={report} />
          <CaptureReadinessPanel report={report} />
          <BetaReplayPlanPanel plan={buildBetaReplayPlan(report)} />
          <MovementPhaseBreakdownPanel breakdown={buildMovementPhaseBreakdown(report)} />

          <Section title="Movement metrics">
            {report.metrics.map((metric) => (
              <MovementMetricRow key={metric.id} metric={metric} />
            ))}
          </Section>

          <Section title="Coach cues">
            {report.cues.map((cue) => (
              <MovementCueCard key={cue.id} cue={cue} />
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
