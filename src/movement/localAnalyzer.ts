import {
  type AnalysisQuality,
  type AnalysisProvider,
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

const defaultThresholds: AnalyzerThresholds = {
  footCutVelocity: 0.12,
  hipDrift: 0.08,
  lockOffAngle: 112,
  pauseVelocity: 0.012,
};

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

function get(frame: PoseFrame, name: LandmarkName): PoseLandmark {
  const value = frame.landmarks.find((landmark) => landmark.name === name);
  if (!value) {
    throw new Error(`Missing pose landmark: ${name}`);
  }
  return value;
}

function midpoint(a: PoseLandmark, b: PoseLandmark) {
  return {
    x: (a.x + b.x) / 2,
    y: (a.y + b.y) / 2,
  };
}

function distance(a: { x: number; y: number }, b: { x: number; y: number }) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function angle(a: PoseLandmark, b: PoseLandmark, c: PoseLandmark) {
  const ab = { x: a.x - b.x, y: a.y - b.y };
  const cb = { x: c.x - b.x, y: c.y - b.y };
  const dot = ab.x * cb.x + ab.y * cb.y;
  const abMag = Math.hypot(ab.x, ab.y);
  const cbMag = Math.hypot(cb.x, cb.y);
  return (Math.acos(Math.max(-1, Math.min(1, dot / (abMag * cbMag)))) * 180) / Math.PI;
}

function average(values: number[]) {
  if (values.length === 0) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function scoreFromPenalty(penalty: number) {
  return Math.max(0, Math.min(100, Math.round(100 - penalty)));
}

function buildMetric(id: string, label: string, value: number, unit: string, score: number, helper: string): MovementMetric {
  return { helper, id, label, score, unit, value: Number(value.toFixed(2)) };
}

function buildAnalysisQuality(frames: PoseFrame[], durationMs: number): AnalysisQuality {
  const expectedFrames = Math.max(10, Math.ceil(durationMs / 350));
  const frameCoverage = Math.min(1, frames.length / expectedFrames);
  const frameLandmarkCoverage = frames.map((frame) => {
    const present = requiredLandmarks.filter((name) => frame.landmarks.some((landmark) => landmark.name === name));
    return present.length / requiredLandmarks.length;
  });
  const landmarkCoverage = average(frameLandmarkCoverage);
  const visibilityValues = frames.flatMap((frame) =>
    requiredLandmarks.map((name) => frame.landmarks.find((landmark) => landmark.name === name)?.visibility ?? 0),
  );
  const averageVisibility = average(visibilityValues);
  const score = Math.round(frameCoverage * 40 + averageVisibility * 35 + landmarkCoverage * 25);
  const warnings: string[] = [];

  if (frames.length < 10) {
    warnings.push('The clip produced very few pose frames; use a longer attempt for stronger feedback.');
  }
  if (frameCoverage < 0.7) {
    warnings.push('Frame coverage is low; keep the climber visible for the full attempt.');
  }
  if (landmarkCoverage < 0.9) {
    warnings.push('Some body landmarks were missing; record the full body side-on when possible.');
  }
  if (averageVisibility < 0.65) {
    warnings.push('Pose visibility is low; improve lighting and avoid occluding hands or feet.');
  }

  return {
    averageVisibility: Number(averageVisibility.toFixed(2)),
    frameCoverage: Number(frameCoverage.toFixed(2)),
    landmarkCoverage: Number(landmarkCoverage.toFixed(2)),
    score: Math.max(0, Math.min(100, score)),
    warnings,
  };
}

export type LocalMovementAnalyzerOptions = {
  model?: string;
  privacyMode?: PrivacyMode;
  provider?: AnalysisProvider;
};

export class LocalMovementAnalyzer implements OnDeviceAnalyzer {
  private readonly model: string;
  private readonly privacyMode: PrivacyMode;
  private readonly provider: AnalysisProvider;

  constructor(options: LocalMovementAnalyzerOptions = {}) {
    this.model = options.model ?? 'sample-pose-rules-v1';
    this.privacyMode = options.privacyMode ?? 'on-device';
    this.provider = options.provider ?? 'local-fixture';
  }

  async analyze(input: LocalAnalyzerInput) {
    const thresholds = { ...defaultThresholds, ...input.thresholds };
    const frames = input.frames;
    if (frames.length < 2) {
      throw new Error('At least two pose frames are required for local movement analysis.');
    }

    const analysisQuality = buildAnalysisQuality(frames, input.session.durationMs);
    const centers = frames.map((frame) => midpoint(get(frame, 'leftHip'), get(frame, 'rightHip')));
    const shoulderCenters = frames.map((frame) => midpoint(get(frame, 'leftShoulder'), get(frame, 'rightShoulder')));
    const centerVelocity = centers.slice(1).map((center, index) => distance(center, centers[index]));
    const hipDriftValues = centers.map((center, index) => Math.abs(center.x - shoulderCenters[index].x));
    const rightElbowAngles = frames.map((frame) => angle(get(frame, 'rightShoulder'), get(frame, 'rightElbow'), get(frame, 'rightWrist')));
    const leftElbowAngles = frames.map((frame) => angle(get(frame, 'leftShoulder'), get(frame, 'leftElbow'), get(frame, 'leftWrist')));
    const ankleVelocity = frames.slice(1).map((frame, index) => {
      const left = distance(get(frame, 'leftAnkle'), get(frames[index], 'leftAnkle'));
      const right = distance(get(frame, 'rightAnkle'), get(frames[index], 'rightAnkle'));
      return Math.max(left, right);
    });

    const pauseIndexes = centerVelocity
      .map((value, index) => ({ index: index + 1, value }))
      .filter((item) => item.value < thresholds.pauseVelocity && item.index > 5 && item.index < frames.length - 4);
    const lockOffFrames = rightElbowAngles
      .map((right, index) => Math.min(right, leftElbowAngles[index]))
      .filter((value) => value < thresholds.lockOffAngle).length;
    const footCutIndexes = ankleVelocity
      .map((value, index) => ({ index: index + 1, value }))
      .filter((item) => item.value > thresholds.footCutVelocity);
    const hipDriftFrames = hipDriftValues.filter((value) => value > thresholds.hipDrift).length;

    const directTravel = distance(centers[0], centers[centers.length - 1]);
    const pathTravel = centerVelocity.reduce((sum, value) => sum + value, 0);
    const efficiencyRatio = directTravel === 0 ? 1 : pathTravel / directTravel;
    const pauseSeconds = (pauseIndexes.length * input.session.durationMs) / frames.length / 1000;
    const lockOffPercent = (lockOffFrames / frames.length) * 100;
    const footCutCount = footCutIndexes.length;
    const hipDriftPercent = (hipDriftFrames / frames.length) * 100;
    const flowScore = scoreFromPenalty((efficiencyRatio - 1) * 34 + pauseSeconds * 7 + footCutCount * 9);

    const metrics: MovementMetric[] = [
      buildMetric('flow', 'Flow score', flowScore, '/100', flowScore, 'Combines pauses, path efficiency, and sudden foot movement.'),
      buildMetric('pause-time', 'Crux pause', pauseSeconds, 's', scoreFromPenalty(pauseSeconds * 12), 'Long pauses often mean the next foot sequence is not decided.'),
      buildMetric('lock-off', 'Bent-arm load', lockOffPercent, '%', scoreFromPenalty(lockOffPercent * 0.8), 'Lower is usually better for energy conservation on moderate terrain.'),
      buildMetric('hip-drift', 'Hip drift', hipDriftPercent, '%', scoreFromPenalty(hipDriftPercent * 0.9), 'Proxy for hips moving away from the shoulder line.'),
      buildMetric('foot-cuts', 'Foot cuts', footCutCount, 'events', scoreFromPenalty(footCutCount * 18), 'Sudden ankle movement flags likely foot slips or cuts.'),
    ];

    const cues: MovementCue[] = [];
    if (pauseSeconds > 0.7) {
      cues.push({
        body: 'You stalled before the long reach. Rehearse the next two feet before pulling.',
        drill: 'Silent-feet preview: climb once while naming the next foot before each hand move.',
        id: 'cue-pause',
        severity: 'watch',
        timestampMs: frames[pauseIndexes[0]?.index ?? 0]?.timestampMs ?? 0,
        title: 'Plan feet before the crux',
      });
    }
    if (lockOffPercent > 28) {
      cues.push({
        body: 'Several moves happen with a loaded bent arm. Try pushing through the feet before locking off.',
        drill: 'Straight-arm hover: pause with straight arms for two seconds before each hand move.',
        id: 'cue-lockoff',
        severity: 'fix',
        timestampMs: frames[Math.round(frames.length * 0.45)].timestampMs,
        title: 'Reduce bent-arm time',
      });
    }
    if (hipDriftPercent > 20) {
      cues.push({
        body: 'Your hips drift away during the reach. Rotate the inside hip closer before moving the hand.',
        drill: 'Hip-to-wall touches: before each reach, bring the inside hip toward the wall and reset.',
        id: 'cue-hip',
        severity: 'fix',
        timestampMs: frames[Math.round(frames.length * 0.58)].timestampMs,
        title: 'Move from the hips',
      });
    }
    if (footCutCount > 0) {
      cues.push({
        body: 'The ankles spike after the reach, which usually means the feet cut or skate.',
        drill: 'No-cut repeat: repeat the climb and downclimb any move where a foot leaves unexpectedly.',
        id: 'cue-foot-cut',
        severity: 'watch',
        timestampMs: frames[footCutIndexes[0].index].timestampMs,
        title: 'Keep feet engaged after the reach',
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
        label: 'Likely foot cut',
        timestampMs: frames[item.index].timestampMs,
        type: 'foot-cut' as const,
      })),
    ];

    if (timeline.length === 0) {
      timeline.push({
        id: 'flow-0',
        label: 'Clean movement window',
        timestampMs: frames[Math.round(frames.length / 2)].timestampMs,
        type: 'flow',
      });
    }

    return LocalAnalysisReportSchema.parse({
      analysisQuality,
      cues,
      engine: {
        model: input.model ?? this.model,
        processedFrames: frames.length,
        provider: input.provider ?? this.provider,
        runsOnDevice: (input.privacyMode ?? this.privacyMode) === 'on-device',
        uploadsVideo: false,
      },
      id: `analysis-${input.session.id}`,
      keyFrame: frames[Math.round(frames.length * 0.62)],
      metrics,
      privacy: {
        retention: 'Video stays local unless the user explicitly exports it.',
        storedArtifacts: ['pose landmarks', 'movement metrics', 'coach cues'],
        videoLeavesDevice: false,
      },
      session: input.session,
      timeline: timeline.sort((a, b) => a.timestampMs - b.timestampMs),
    });
  }
}

export const localMovementAnalyzer = new LocalMovementAnalyzer();
