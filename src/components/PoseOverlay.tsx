import Svg, { Circle, Line } from 'react-native-svg';
import { StyleSheet, Text, View } from 'react-native';

import type { PoseFrame, LandmarkName } from '@/movement/contracts';
import { theme } from '@/core/theme';

type PoseOverlayProps = {
  frame: PoseFrame;
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

export function PoseOverlay({ frame }: PoseOverlayProps) {
  return (
    <View style={styles.wrap}>
      <View style={styles.wall}>
        <Svg height="100%" viewBox="0 0 100 130" width="100%">
          {segments.map(([from, to]) => {
            const a = find(frame, from);
            const b = find(frame, to);
            if (!a || !b) return null;
            return (
              <Line
                key={`${from}-${to}`}
                stroke={theme.colors.brandSoft}
                strokeLinecap="round"
                strokeWidth="2.4"
                x1={a.x * 100}
                x2={b.x * 100}
                y1={a.y * 130}
                y2={b.y * 130}
              />
            );
          })}
          {frame.landmarks.map((landmark) => (
            <Circle
              cx={landmark.x * 100}
              cy={landmark.y * 130}
              fill={landmark.visibility < 0.7 ? theme.colors.coral : '#FFFFFF'}
              key={landmark.name}
              r={landmark.name.includes('Wrist') || landmark.name.includes('Ankle') ? 1.9 : 1.5}
              stroke={theme.colors.brand}
              strokeWidth="0.8"
            />
          ))}
        </Svg>
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
    backgroundColor: theme.colors.brandDark,
    borderRadius: theme.radius.lg,
    height: 360,
    overflow: 'hidden',
  },
  caption: {
    color: theme.colors.muted,
    fontSize: 12,
    fontWeight: '800',
    textAlign: 'center',
  },
});
