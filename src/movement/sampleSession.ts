import { type ClimbSession, type LandmarkName, type PoseFrame, type VideoAsset, PoseFrameSchema } from './contracts';

type MovementProfile = {
  description: string;
  grade: string;
  gym: string;
  hipAwayBoost: number;
  id: string;
  lockOffBias: number;
  pauseEnd: number;
  pauseStart: number;
  sway: number;
  title: string;
  wallAngle: ClimbSession['wallAngle'];
};

export type SampleAttempt = {
  description: string;
  frames: PoseFrame[];
  session: ClimbSession;
  video: VideoAsset;
};

const names: LandmarkName[] = [
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

function landmark(name: LandmarkName, x: number, y: number, visibility = 1) {
  return { name, x: Math.max(0, Math.min(1, x)), y: Math.max(0, Math.min(1, y)), visibility };
}

const profiles: MovementProfile[] = [
  {
    description: 'Steep board attempt with a long pause and bent-arm loading.',
    grade: '6c / V5',
    gym: 'Indoor board',
    hipAwayBoost: 0.095,
    id: 'board-001',
    lockOffBias: 0.15,
    pauseEnd: 22,
    pauseStart: 13,
    sway: 0.035,
    title: 'Overhang board attempt',
    wallAngle: 'overhang',
  },
  {
    description: 'Vertical coordination attempt with smoother hips and less lock-off time.',
    grade: '6a / V3',
    gym: 'Training wall',
    hipAwayBoost: 0.045,
    id: 'vertical-001',
    lockOffBias: 0.07,
    pauseEnd: 14,
    pauseStart: 10,
    sway: 0.02,
    title: 'Vertical sequence repeat',
    wallAngle: 'vertical',
  },
  {
    description: 'Slab balance attempt where the main goal is quiet footwork.',
    grade: '5c / V2',
    gym: 'Technique slab',
    hipAwayBoost: 0.025,
    id: 'slab-001',
    lockOffBias: 0.04,
    pauseEnd: 8,
    pauseStart: 6,
    sway: 0.012,
    title: 'Slab balance drill',
    wallAngle: 'slab',
  },
];

function buildSession(profile: MovementProfile, index: number): ClimbSession {
  return {
    createdAt: `2026-06-17T10:0${index}:00+02:00`,
    durationMs: 6200,
    grade: profile.grade,
    gym: profile.gym,
    id: `session-${profile.id}`,
    source: 'fixture',
    title: profile.title,
    wallAngle: profile.wallAngle,
  };
}

function buildVideo(session: ClimbSession, profile: MovementProfile): VideoAsset {
  return {
    capturedAt: session.createdAt,
    durationMs: session.durationMs,
    height: 1920,
    id: `video-${profile.id}`,
    source: 'fixture',
    uri: `fixture://movebeta/${profile.id}`,
    width: 1080,
  };
}

function frame(index: number, session: ClimbSession, profile: MovementProfile): PoseFrame {
  const t = index / 35;
  const pause = index > profile.pauseStart && index < profile.pauseEnd ? 0.02 : 0;
  const reach = Math.min(1, index / 34);
  const sway = Math.sin(t * Math.PI * 3) * profile.sway;
  const hipAway = index > 17 && index < 27 ? profile.hipAwayBoost : 0.035;
  const footCut = index >= 25 && index <= 27;
  const bodyY = 0.78 - reach * 0.36 + pause;
  const centerX = 0.49 + sway + (index > 17 ? 0.035 : 0);

  const landmarks = [
    landmark('nose', centerX + 0.01, bodyY - 0.25),
    landmark('leftShoulder', centerX - 0.075, bodyY - 0.18),
    landmark('rightShoulder', centerX + 0.075, bodyY - 0.18),
    landmark('leftElbow', centerX - 0.14, bodyY - 0.08),
    landmark('rightElbow', centerX + 0.1, bodyY - (index > 10 && index < 24 ? profile.lockOffBias : 0.04)),
    landmark('leftWrist', centerX - 0.17, bodyY - 0.18 - reach * 0.04),
    landmark('rightWrist', centerX + 0.16, bodyY - 0.24 - reach * 0.1),
    landmark('leftHip', centerX - 0.055 + hipAway, bodyY + 0.02),
    landmark('rightHip', centerX + 0.055 + hipAway, bodyY + 0.015),
    landmark('leftKnee', centerX - 0.11 + hipAway, bodyY + 0.18),
    landmark('rightKnee', centerX + 0.08 + hipAway, bodyY + 0.18),
    landmark('leftAnkle', centerX - 0.13 + hipAway, bodyY + (footCut ? 0.35 : 0.3), footCut ? 0.55 : 0.96),
    landmark('rightAnkle', centerX + 0.1 + hipAway, bodyY + (footCut ? 0.36 : 0.28), footCut ? 0.52 : 0.96),
  ];

  return PoseFrameSchema.parse({
    timestampMs: Math.round((session.durationMs / 34) * index),
    landmarks: landmarks.sort((a, b) => names.indexOf(a.name) - names.indexOf(b.name)),
  });
}

function buildAttempt(profile: MovementProfile, index: number): SampleAttempt {
  const session = buildSession(profile, index);
  return {
    description: profile.description,
    frames: PoseFrameSchema.array().parse(Array.from({ length: 35 }, (_, frameIndex) => frame(frameIndex, session, profile))),
    session,
    video: buildVideo(session, profile),
  };
}

export const sampleAttempts = profiles.map(buildAttempt);
export const sampleSession = sampleAttempts[0].session;
export const sampleVideoAsset = sampleAttempts[0].video;
export const samplePoseFrames = sampleAttempts[0].frames;
