import {
  type AnalysisProvider,
  type AnalysisQuality,
  type AnalyzerThresholds,
  type LandmarkName,
  LocalAnalysisReportSchema,
  type LocalAnalyzerInput,
  type MovementCue,
  type MovementMetric,
  type OnDeviceAnalyzer,
  type PoseFrame,
  type PoseLandmark,
  type PrivacyMode,
  type TimelineEvent,
} from './contracts';
import { attachAnalysisEvidence } from './analysisEvidence';
import { coachLensMetadata, coachLensThresholds, sortCuesForCoachLens } from './coachLens';

export const defaultAnalyzerThresholds: AnalyzerThresholds = {
  footCutVelocity: 0.12,
  hipDrift: 0.08,
  lockOffAngle: 112,
  maxTemporalIntervalMs: 550,
  minLandmarkVisibility: 0.35,
  minMetricCoverage: 0.7,
  pauseVelocity: 0.012,
};

const bodyReferenceScale = 0.2;
const currentCueEngineVersion = 'movebeta-cue-engine-v2.0.0';

const requiredLandmarks: LandmarkName[] = [
  'nose',
  'leftShoulder',
  'rightShoulder',
  'leftElbow',
  'rightElbow',
  'leftWrist',
  'rightWrist',
  'leftHip',
  'rightHip',
  'leftKnee',
  'rightKnee',
  'leftAnkle',
  'rightAnkle',
];

const extremityLandmarks: LandmarkName[] = ['leftWrist', 'rightWrist', 'leftAnkle', 'rightAnkle'];
const frameEdgeMargin = 0.015;

type Point = { x: number; y: number };

type FrameGeometry = {
  center?: Point;
  index: number;
  leftAnkle?: Point;
  leftElbowAngle?: number;
  rightAnkle?: Point;
  rightElbowAngle?: number;
  shoulderCenter?: Point;
  timestampMs: number;
};

function midpoint(a: Point, b: Point): Point {
  return {
    x: (a.x + b.x) / 2,
    y: (a.y + b.y) / 2,
  };
}

function distance(a: Point, b: Point) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function angle(a: Point, b: Point, c: Point) {
  const ab = { x: a.x - b.x, y: a.y - b.y };
  const cb = { x: c.x - b.x, y: c.y - b.y };
  const denominator = Math.hypot(ab.x, ab.y) * Math.hypot(cb.x, cb.y);
  if (denominator <= Number.EPSILON) return undefined;
  const cosine = Math.max(-1, Math.min(1, (ab.x * cb.x + ab.y * cb.y) / denominator));
  return (Math.acos(cosine) * 180) / Math.PI;
}

function average(values: number[]) {
  if (values.length === 0) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function median(values: number[]) {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? (sorted[middle - 1] + sorted[middle]) / 2 : sorted[middle];
}

function scoreFromPenalty(penalty: number) {
  return Math.max(0, Math.min(100, Math.round(100 - penalty)));
}

function buildMetric(
  id: string,
  label: string,
  value: number,
  unit: string,
  score: number,
  helper: string,
  measured = true,
): MovementMetric {
  return {
    helper,
    id,
    label,
    score: measured ? score : 0,
    status: measured ? 'measured' : 'insufficient-data',
    unit,
    value: measured ? Number(value.toFixed(2)) : 0,
  };
}

function pushWarning(quality: AnalysisQuality, warning: string) {
  if (!quality.warnings.includes(warning)) quality.warnings.push(warning);
}

function buildAnalysisQuality(
  frames: PoseFrame[],
  expectedFrameCount: number,
  minVisibility: number,
  minMetricCoverage: number,
): AnalysisQuality {
  const frameCoverage = Math.min(1, frames.length / Math.max(2, expectedFrameCount));
  const frameLandmarkCoverage = frames.map((frame) => {
    const usable = requiredLandmarks.filter((name) => {
      const landmark = frame.landmarks.find((item) => item.name === name);
      return landmark !== undefined && landmark.visibility >= minVisibility;
    });
    return usable.length / requiredLandmarks.length;
  });
  const landmarkCoverage = average(frameLandmarkCoverage);
  const visibilityValues = frames.flatMap((frame) =>
    requiredLandmarks.map((name) => frame.landmarks.find((landmark) => landmark.name === name)?.visibility ?? 0),
  );
  const averageVisibility = average(visibilityValues);
  const extremityCoverage = average(
    extremityLandmarks.map(
      (name) =>
        frames.filter((frame) => {
          const landmark = frame.landmarks.find((item) => item.name === name);
          return landmark !== undefined && landmark.visibility >= minVisibility && landmark.inFrame !== false;
        }).length / Math.max(1, frames.length),
    ),
  );
  const usableLandmarks = frames.flatMap((frame) =>
    frame.landmarks.filter((landmark) => landmark.visibility >= minVisibility),
  );
  const inFrameCoverage =
    usableLandmarks.filter(
      (landmark) =>
        landmark.inFrame !== false &&
        landmark.x > frameEdgeMargin &&
        landmark.x < 1 - frameEdgeMargin &&
        landmark.y > frameEdgeMargin &&
        landmark.y < 1 - frameEdgeMargin,
    ).length / Math.max(1, usableLandmarks.length);
  const subjectScale = median(
    frames.flatMap((frame) => {
      const visible = frame.landmarks.filter(
        (landmark) => landmark.visibility >= minVisibility && landmark.inFrame !== false,
      );
      if (visible.length < 6) return [];
      const xs = visible.map((landmark) => landmark.x);
      const ys = visible.map((landmark) => landmark.y);
      return [Math.max(Math.max(...xs) - Math.min(...xs), Math.max(...ys) - Math.min(...ys))];
    }),
  );
  const score = Math.round(
    frameCoverage * 32 + averageVisibility * 28 + landmarkCoverage * 20 + extremityCoverage * 12 + inFrameCoverage * 8,
  );
  const warnings: string[] = [];

  if (frames.length < 10) {
    warnings.push('The clip produced very few pose frames; use a longer attempt for stronger feedback.');
  }
  if (frameCoverage < 0.7) {
    warnings.push('Frame coverage is low; keep the climber visible for the full attempt.');
  }
  if (landmarkCoverage < 0.9) {
    warnings.push('Some body landmarks were missing or uncertain; record the full body side-on when possible.');
  }
  if (averageVisibility < 0.65) {
    warnings.push('Pose visibility is low; improve lighting and avoid occluding hands or feet.');
  }
  if (extremityCoverage < 0.65) {
    warnings.push('Hands or feet were missing too often; keep all four extremities visible for the repeat.');
  }
  if (inFrameCoverage < 0.9) {
    warnings.push('Pose landmarks reached the frame edge; move the camera back and keep the climber centered.');
  }
  if (subjectScale > 0 && subjectScale < 0.25) {
    warnings.push('The climber is too small in the frame for dependable movement signals.');
  }

  const unreliableNames = requiredLandmarks.filter((name) => {
    const usableFrames = frames.filter((frame) => {
      const landmark = frame.landmarks.find((item) => item.name === name);
      return landmark !== undefined && landmark.visibility >= minVisibility;
    }).length;
    return usableFrames / frames.length < minMetricCoverage;
  });
  if (unreliableNames.length > 0) {
    warnings.push(`Low-confidence joints limit some metrics: ${unreliableNames.join(', ')}.`);
  }

  return {
    averageVisibility: Number(averageVisibility.toFixed(2)),
    extremityCoverage: Number(extremityCoverage.toFixed(2)),
    frameCoverage: Number(frameCoverage.toFixed(2)),
    inFrameCoverage: Number(inFrameCoverage.toFixed(2)),
    landmarkCoverage: Number(landmarkCoverage.toFixed(2)),
    score: Math.max(0, Math.min(100, score)),
    subjectScale: Number(subjectScale.toFixed(2)),
    warnings,
  };
}

function assertIncreasingTimestamps(frames: PoseFrame[]) {
  for (let index = 1; index < frames.length; index += 1) {
    if (frames[index].timestampMs <= frames[index - 1].timestampMs) {
      throw new Error('Pose frame timestamps must be strictly increasing.');
    }
  }
}

function eventStarts<T extends { index: number }>(items: T[]) {
  return items.filter((item, index) => index === 0 || item.index > items[index - 1].index + 1);
}

function correctedPoint(
  frame: PoseFrame,
  name: LandmarkName,
  dimensions: { height: number; width: number },
  minVisibility: number,
): Point | undefined {
  const landmark = frame.landmarks.find((item) => item.name === name);
  if (!landmark || landmark.visibility < minVisibility) return undefined;
  const height = Math.max(1, dimensions.height);
  return {
    x: landmark.x * (Math.max(1, dimensions.width) / height),
    y: landmark.y,
  };
}

function frameGeometry(
  frame: PoseFrame,
  index: number,
  dimensions: { height: number; width: number },
  minVisibility: number,
): FrameGeometry {
  const point = (name: LandmarkName) => correctedPoint(frame, name, dimensions, minVisibility);
  const leftShoulder = point('leftShoulder');
  const rightShoulder = point('rightShoulder');
  const leftHip = point('leftHip');
  const rightHip = point('rightHip');
  const leftElbow = point('leftElbow');
  const rightElbow = point('rightElbow');
  const leftWrist = point('leftWrist');
  const rightWrist = point('rightWrist');

  return {
    center: leftHip && rightHip ? midpoint(leftHip, rightHip) : undefined,
    index,
    leftAnkle: point('leftAnkle'),
    leftElbowAngle:
      leftShoulder && leftElbow && leftWrist ? angle(leftShoulder, leftElbow, leftWrist) : undefined,
    rightAnkle: point('rightAnkle'),
    rightElbowAngle:
      rightShoulder && rightElbow && rightWrist ? angle(rightShoulder, rightElbow, rightWrist) : undefined,
    shoulderCenter: leftShoulder && rightShoulder ? midpoint(leftShoulder, rightShoulder) : undefined,
    timestampMs: frame.timestampMs,
  };
}

function resolveBodyScale(geometry: FrameGeometry[]) {
  const torsoLengths = geometry.flatMap((frame) =>
    frame.center && frame.shoulderCenter ? [distance(frame.center, frame.shoulderCenter)] : [],
  );
  return Math.max(0.001, median(torsoLengths));
}

function normalizeDistance(value: number, bodyScale: number) {
  return (value / bodyScale) * bodyReferenceScale;
}

function metricIsMeasured(coverage: number, threshold: number) {
  return coverage >= threshold;
}

export type LocalMovementAnalyzerOptions = {
  cueEngineVersion?: string;
  model?: string;
  privacyMode?: PrivacyMode;
  provider?: AnalysisProvider;
};

export class LocalMovementAnalyzer implements OnDeviceAnalyzer {
  private readonly cueEngineVersion: string;
  private readonly model: string;
  private readonly privacyMode: PrivacyMode;
  private readonly provider: AnalysisProvider;

  constructor(options: LocalMovementAnalyzerOptions = {}) {
    this.cueEngineVersion = options.cueEngineVersion ?? currentCueEngineVersion;
    this.model = options.model ?? 'pose-input-unspecified';
    this.privacyMode = options.privacyMode ?? 'on-device';
    this.provider = options.provider ?? 'local-fixture';
  }

  async analyze(input: LocalAnalyzerInput) {
    const thresholds = {
      ...defaultAnalyzerThresholds,
      ...coachLensThresholds(input.coachLens),
      ...input.thresholds,
    };
    const coachLens = coachLensMetadata(input.coachLens);
    const frames = input.frames;
    if (frames.length < 2) {
      throw new Error('At least two pose frames are required for local movement analysis.');
    }
    assertIncreasingTimestamps(frames);

    const observedDurationMs = frames[frames.length - 1].timestampMs - frames[0].timestampMs;
    const sampleDurationMs = input.sample?.durationMs ?? observedDurationMs;
    const expectedFrameCount = input.sample?.expectedFrameCount ?? frames.length;
    const referenceIntervalMs = input.sample?.referenceIntervalMs ?? 350;
    const samplingIntervalMs = input.sample?.samplingIntervalMs ?? observedDurationMs / Math.max(frames.length - 1, 1);
    const dimensions = input.video ?? { height: 1, width: 1 };
    const analysisQuality = buildAnalysisQuality(
      frames,
      expectedFrameCount,
      thresholds.minLandmarkVisibility,
      thresholds.minMetricCoverage,
    );
    const geometry = frames.map((frame, index) =>
      frameGeometry(frame, index, dimensions, thresholds.minLandmarkVisibility),
    );
    const bodyScale = resolveBodyScale(geometry);

    const transitions = geometry.slice(1).map((frame, offset) => {
      const previous = geometry[offset];
      const deltaMs = frame.timestampMs - previous.timestampMs;
      const centerDistance =
        frame.center && previous.center
          ? normalizeDistance(distance(frame.center, previous.center), bodyScale)
          : undefined;
      const leftAnkleDistance =
        frame.leftAnkle && previous.leftAnkle
          ? normalizeDistance(distance(frame.leftAnkle, previous.leftAnkle), bodyScale)
          : undefined;
      const rightAnkleDistance =
        frame.rightAnkle && previous.rightAnkle
          ? normalizeDistance(distance(frame.rightAnkle, previous.rightAnkle), bodyScale)
          : undefined;

      return {
        ankleVelocity:
          leftAnkleDistance !== undefined && rightAnkleDistance !== undefined
            ? (Math.max(leftAnkleDistance, rightAnkleDistance) * referenceIntervalMs) / deltaMs
            : undefined,
        centerDistance,
        centerVelocity: centerDistance === undefined ? undefined : (centerDistance * referenceIntervalMs) / deltaMs,
        deltaMs,
        index: offset + 1,
        timestampMs: frame.timestampMs,
      };
    });

    const transitionDenominator = Math.max(1, frames.length - 1);
    const centerTransitions = transitions.filter(
      (item): item is typeof item & { centerDistance: number; centerVelocity: number } =>
        item.centerDistance !== undefined && item.centerVelocity !== undefined,
    );
    const timedCenterTransitions = centerTransitions.filter(
      (item) => item.deltaMs <= thresholds.maxTemporalIntervalMs,
    );
    const ankleTransitions = transitions.filter(
      (item): item is typeof item & { ankleVelocity: number } => item.ankleVelocity !== undefined,
    );
    const timedAnkleTransitions = ankleTransitions.filter(
      (item) => item.deltaMs <= thresholds.maxTemporalIntervalMs,
    );
    const centerCoverage = centerTransitions.length / transitionDenominator;
    const centerTimingCoverage = timedCenterTransitions.length / transitionDenominator;
    const ankleCoverage = ankleTransitions.length / transitionDenominator;
    const ankleTimingCoverage = timedAnkleTransitions.length / transitionDenominator;
    const samplingSupportsTiming = samplingIntervalMs <= thresholds.maxTemporalIntervalMs;
    const flowMeasured =
      samplingSupportsTiming &&
      metricIsMeasured(centerCoverage, thresholds.minMetricCoverage) &&
      metricIsMeasured(centerTimingCoverage, thresholds.minMetricCoverage);
    const footMeasured =
      samplingSupportsTiming &&
      metricIsMeasured(ankleCoverage, thresholds.minMetricCoverage) &&
      metricIsMeasured(ankleTimingCoverage, thresholds.minMetricCoverage);

    const armFrames = geometry.flatMap((frame) => {
      const angles = [frame.leftElbowAngle, frame.rightElbowAngle].filter(
        (value): value is number => value !== undefined,
      );
      return angles.length > 0 ? [{ angle: Math.min(...angles), index: frame.index }] : [];
    });
    const hipFrames = geometry.flatMap((frame) =>
      frame.center && frame.shoulderCenter
        ? [
            {
              drift: normalizeDistance(Math.abs(frame.center.x - frame.shoulderCenter.x), bodyScale),
              index: frame.index,
            },
          ]
        : [],
    );
    const armMeasured = metricIsMeasured(armFrames.length / frames.length, thresholds.minMetricCoverage);
    const hipMeasured = metricIsMeasured(hipFrames.length / frames.length, thresholds.minMetricCoverage);

    if (!flowMeasured) {
      pushWarning(
        analysisQuality,
        samplingSupportsTiming
          ? 'Flow and pause metrics were skipped because confident hip tracking was incomplete.'
          : 'Flow and pause metrics were skipped because temporal sampling was too sparse.',
      );
    }
    if (!footMeasured) {
      pushWarning(
        analysisQuality,
        samplingSupportsTiming
          ? 'Rapid ankle movement signals were skipped because ankle confidence was insufficient.'
          : 'Rapid ankle movement signals were skipped because temporal sampling was too sparse.',
      );
    }
    if (!armMeasured) {
      pushWarning(analysisQuality, 'Bent-arm cues were skipped because arm-joint confidence was insufficient.');
    }
    if (!hipMeasured) {
      pushWarning(analysisQuality, 'Torso offset signals were skipped because torso confidence was insufficient.');
    }

    const analysisStartMs = frames[0].timestampMs;
    const analysisEndMs = frames[frames.length - 1].timestampMs;
    const leadingMarginMs = Math.min(1_750, sampleDurationMs * 0.15);
    const trailingMarginMs = Math.min(1_400, sampleDurationMs * 0.12);
    const pauseIndexes = flowMeasured
      ? timedCenterTransitions.filter(
          (item) =>
            item.centerVelocity < thresholds.pauseVelocity &&
            item.timestampMs > analysisStartMs + leadingMarginMs &&
            item.timestampMs < analysisEndMs - trailingMarginMs,
        )
      : [];
    const lockOffCandidates = armMeasured
      ? armFrames.filter((item) => item.angle < thresholds.lockOffAngle)
      : [];
    const footCutIndexes = footMeasured
      ? eventStarts(timedAnkleTransitions.filter((item) => item.ankleVelocity > thresholds.footCutVelocity))
      : [];
    const hipDriftCandidates = hipMeasured
      ? hipFrames.filter((item) => item.drift > thresholds.hipDrift)
      : [];

    const centerPoints = geometry.flatMap((frame) => (frame.center ? [frame.center] : []));
    const directTravel =
      centerPoints.length > 1
        ? normalizeDistance(distance(centerPoints[0], centerPoints[centerPoints.length - 1]), bodyScale)
        : 0;
    const pathTravel = centerTransitions.reduce((sum, item) => sum + item.centerDistance, 0);
    const efficiencyRatio = directTravel <= Number.EPSILON ? 1 : Math.max(1, pathTravel / directTravel);
    const pauseSeconds = pauseIndexes.reduce((sum, item) => sum + item.deltaMs, 0) / 1000;
    const lockOffPercent = armMeasured ? (lockOffCandidates.length / armFrames.length) * 100 : 0;
    const footCutCount = footCutIndexes.length;
    const footCutSeverity = footCutIndexes.reduce(
      (sum, item) => sum + Math.max(1, item.ankleVelocity / thresholds.footCutVelocity),
      0,
    );
    const hipDriftPercent = hipMeasured ? (hipDriftCandidates.length / hipFrames.length) * 100 : 0;
    const flowScore = flowMeasured
      ? scoreFromPenalty((efficiencyRatio - 1) * 34 + pauseSeconds * 7 + footCutCount * 9)
      : 0;

    const metrics: MovementMetric[] = [
      buildMetric(
        'flow',
        'Movement continuity',
        flowScore,
        '/100',
        flowScore,
        flowMeasured
          ? 'Combines low-movement time, hip-path efficiency, and rapid ankle movement.'
          : 'Unavailable until confident hip tracking and temporal coverage meet the analysis threshold.',
        flowMeasured,
      ),
      buildMetric(
        'pause-time',
        'Low-movement time',
        pauseSeconds,
        's',
        scoreFromPenalty(pauseSeconds * 12),
        flowMeasured
          ? 'Counts tracked time where hip-center movement stayed below the configured threshold.'
          : 'Unavailable until confident hip tracking and temporal coverage meet the analysis threshold.',
        flowMeasured,
      ),
      buildMetric(
        'lock-off',
        'Elbow-flexion time',
        lockOffPercent,
        '%',
        scoreFromPenalty(lockOffPercent * 0.8),
        armMeasured
          ? 'Share of measured frames where either elbow angle stayed below the configured threshold.'
          : 'Unavailable until shoulder, elbow, and wrist confidence meet the analysis threshold.',
        armMeasured,
      ),
      buildMetric(
        'hip-drift',
        'Torso lateral offset',
        hipDriftPercent,
        '%',
        scoreFromPenalty(hipDriftPercent * 0.9),
        hipMeasured
          ? 'Share of tracked frames where hips and shoulders have a large lateral offset. This does not measure wall distance.'
          : 'Unavailable until shoulder and hip confidence meet the analysis threshold.',
        hipMeasured,
      ),
      buildMetric(
        'foot-cuts',
        'Rapid ankle movement',
        footCutCount,
        'events',
        scoreFromPenalty(footCutSeverity * 18),
        footMeasured
          ? 'Counts sudden body-scale-normalized ankle velocity. Pose alone cannot confirm foot contact or a foot cut.'
          : 'Unavailable until ankle confidence and temporal coverage meet the analysis threshold.',
        footMeasured,
      ),
    ];

    if (metrics.some((metric) => metric.status === 'insufficient-data')) {
      analysisQuality.score = Math.min(analysisQuality.score, 84);
    }

    const cues: MovementCue[] = [];
    if (flowMeasured && pauseSeconds > 0.7) {
      cues.push({
        body: 'The pose track contains a low-movement interval. Review this timestamp and test a more continuous sequence.',
        drill: 'Continuity repeat: use the same beta and aim to move through this timestamp without an extra pause.',
        id: 'cue-pause',
        severity: 'watch',
        timestampMs: frames[pauseIndexes[0]?.index ?? 0]?.timestampMs ?? 0,
        title: 'Review the low-movement interval',
      });
    }
    if (armMeasured && lockOffPercent > 28) {
      const peak = [...lockOffCandidates].sort(
        (a, b) => Number(a.angle.toFixed(6)) - Number(b.angle.toFixed(6)) || a.index - b.index,
      )[0];
      cues.push({
        body: 'One or both elbows stay flexed across several measured frames. Review the replay before changing technique.',
        drill: 'Elbow-angle repeat: use the same beta and test whether this section can be climbed with less sustained flexion.',
        id: 'cue-lockoff',
        severity: 'fix',
        timestampMs: frames[peak?.index ?? 0].timestampMs,
        title: 'Review sustained elbow flexion',
      });
    }
    if (hipMeasured && hipDriftPercent > 20) {
      const peak = [...hipDriftCandidates].sort(
        (a, b) => Number(b.drift.toFixed(6)) - Number(a.drift.toFixed(6)) || a.index - b.index,
      )[0];
      cues.push({
        body: 'The hips and shoulders show a large lateral offset at this timestamp. Test a quieter torso position on the repeat.',
        drill: 'Quiet-torso repeat: use the same beta and reduce side-to-side torso movement at this timestamp.',
        id: 'cue-hip',
        severity: 'fix',
        timestampMs: frames[peak?.index ?? 0].timestampMs,
        title: 'Reduce torso offset',
      });
    }
    if (footMeasured && footCutCount > 0) {
      cues.push({
        body: 'The ankles move rapidly after the reach. Check the video to confirm whether a foot moved intentionally or lost contact.',
        drill: 'Controlled-feet repeat: keep the same beta and aim for a quieter foot transition at this timestamp.',
        id: 'cue-foot-cut',
        severity: 'watch',
        timestampMs: frames[footCutIndexes[0].index].timestampMs,
        title: 'Check rapid foot movement',
      });
    }

    const timeline: TimelineEvent[] = [
      ...pauseIndexes.slice(0, 3).map((item, index) => ({
        id: `pause-${index}`,
        label: 'Low movement pause',
        timestampMs: frames[item.index].timestampMs,
        type: 'pause' as const,
      })),
      ...footCutIndexes.slice(0, 2).map((item, index) => ({
        id: `foot-cut-${index}`,
        label: 'Rapid ankle movement',
        timestampMs: frames[item.index].timestampMs,
        type: 'foot-cut' as const,
      })),
      ...lockOffCandidates.slice(0, 2).map((item, index) => ({
        id: `lock-off-${index}`,
        label: 'Bent-arm load',
        timestampMs: frames[item.index].timestampMs,
        type: 'lock-off' as const,
      })),
    ];

    if (timeline.length === 0 && metrics.every((metric) => metric.status === 'measured')) {
      timeline.push({
        id: 'flow-0',
        label: 'Clean movement window',
        timestampMs: frames[Math.round(frames.length / 2)].timestampMs,
        type: 'flow',
      });
    }

    const sortedCues = sortCuesForCoachLens(cues, coachLens.key);
    const focusTimestampMs = sortedCues[0]?.timestampMs ?? timeline[0]?.timestampMs ?? frames[Math.round(frames.length / 2)].timestampMs;
    const keyFrame = frames.reduce((closest, frame) =>
      Math.abs(frame.timestampMs - focusTimestampMs) < Math.abs(closest.timestampMs - focusTimestampMs) ? frame : closest,
    );

    const report = LocalAnalysisReportSchema.parse({
      analysisQuality,
      cues: sortedCues,
      engine: {
        ...(input.video
          ? {
              capture: {
                height: input.video.height,
                orientation:
                  input.video.width === input.video.height
                    ? 'square'
                    : input.video.width > input.video.height
                      ? 'landscape'
                      : 'portrait',
                width: input.video.width,
              },
            }
          : {}),
        coachLens,
        cueEngineVersion: this.cueEngineVersion,
        model: input.model ?? this.model,
        processedFrames: frames.length,
        provider: input.provider ?? this.provider,
        runsOnDevice: (input.privacyMode ?? this.privacyMode) === 'on-device',
        uploadsVideo: false,
      },
      id: `analysis-${input.session.id}`,
      keyFrame,
      poseFrames: frames,
      metrics,
      privacy: {
        retention: 'Selected video is processed locally and is not retained by the analysis report.',
        storedArtifacts: ['pose landmark timeline', 'movement metrics', 'pose-based focus cues'],
        videoLeavesDevice: false,
      },
      session: input.session,
      timeline: timeline.sort((a, b) => a.timestampMs - b.timestampMs),
    });

    return attachAnalysisEvidence(report, { generatedAt: input.session.createdAt });
  }
}

export const localMovementAnalyzer = new LocalMovementAnalyzer();
