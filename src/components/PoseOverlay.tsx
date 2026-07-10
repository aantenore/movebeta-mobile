import Svg, { Circle, Line } from 'react-native-svg';
import { StyleSheet, Text, View } from 'react-native';

import type { PoseFrame, LandmarkName } from '@/movement/contracts';
import { theme } from '@/core/theme';

type PoseOverlayProps = {
  frame: PoseFrame;
  overlay?: boolean;
};

const segments: [LandmarkName, LandmarkName][] = [
  ['leftShoulder', 'rightShoulder'],
  ['leftShoulder', 'leftElbow'],
  ['leftElbow', 'leftWrist'],
  ['rightShoulder', 'rightElbow'],
  ['rightElbow', 'rightWrist'],
  ['leftShoulder', 'leftHip'],
  ['rightShoulder', 'rightHip'],
  ['leftHip', 'rightHip'],
  ['leftHip', 'leftKnee'],
  ['leftKnee', 'leftAnkle'],
  ['rightHip', 'rightKnee'],
  ['rightKnee', 'rightAnkle'],
];

function find(frame: PoseFrame, name: LandmarkName) {
  return frame.landmarks.find((landmark) => landmark.name === name);
}

function Skeleton({ frame, overlay }: Required<PoseOverlayProps>) {
  return (
    <Svg height="100%" preserveAspectRatio="none" viewBox="0 0 100 100" width="100%">
      {segments.map(([from, to]) => {
        const a = find(frame, from);
        const b = find(frame, to);
        if (!a || !b) return null;
        return (
          <Line
            key={`${from}-${to}`}
            stroke={overlay ? '#B8F0D0' : theme.colors.brandSoft}
            strokeLinecap="round"
            strokeWidth={overlay ? '1.5' : '2.4'}
            x1={a.x * 100}
            x2={b.x * 100}
            y1={a.y * 100}
            y2={b.y * 100}
          />
        );
      })}
      {frame.landmarks.map((landmark) => (
        <Circle
          cx={landmark.x * 100}
          cy={landmark.y * 100}
          fill={landmark.visibility < 0.7 ? theme.colors.coral : '#FFFFFF'}
          key={landmark.name}
          r={landmark.name.includes('Wrist') || landmark.name.includes('Ankle') ? 1.5 : 1.2}
          stroke={overlay ? '#123D57' : theme.colors.brand}
          strokeWidth="0.7"
        />
      ))}
    </Svg>
  );
}

export function PoseOverlay({ frame, overlay = false }: PoseOverlayProps) {
  if (overlay) {
    return (
      <View
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
        pointerEvents="none"
        style={styles.overlay}
        testID="pose-overlay"
      >
        <Skeleton frame={frame} overlay />
      </View>
    );
  }

  return (
    <View style={styles.wrap}>
      <View style={styles.wall}>
        <Skeleton frame={frame} overlay={false} />
      </View>
      <Text style={styles.caption}>Local pose landmarks · frame {Math.round(frame.timestampMs)}ms</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: theme.spacing.sm,
  },
  wall: {
    aspectRatio: 3 / 4,
    backgroundColor: theme.colors.brandDark,
    borderRadius: theme.radius.lg,
    overflow: 'hidden',
  },
  overlay: {
    bottom: 0,
    left: 0,
    position: 'absolute',
    right: 0,
    top: 0,
  },
  caption: {
    color: theme.colors.muted,
    fontSize: 12,
    fontWeight: '800',
    textAlign: 'center',
  },
});
