import { StyleSheet, Text, View } from 'react-native';

import type { MovementMetric } from '@/movement/contracts';
import { theme } from '@/core/theme';

type MovementMetricRowProps = {
  metric: MovementMetric;
};

export function MovementMetricRow({ metric }: MovementMetricRowProps) {
  return (
    <View style={styles.row}>
      <View style={styles.copy}>
        <Text style={styles.label}>{metric.label}</Text>
        <Text style={styles.helper}>{metric.helper}</Text>
      </View>
      <View style={styles.score}>
        <Text style={styles.value}>
          {metric.value}
          {metric.unit === '/100' ? '' : ` ${metric.unit}`}
        </Text>
        <View style={styles.track}>
          <View style={[styles.bar, { width: `${metric.score}%` }]} />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    backgroundColor: theme.colors.surface,
    borderColor: theme.colors.line,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    flexDirection: 'row',
    gap: theme.spacing.md,
    padding: theme.spacing.md,
  },
  copy: {
    flex: 1,
    gap: 4,
  },
  label: {
    color: theme.colors.ink,
    fontSize: 15,
    fontWeight: '900',
  },
  helper: {
    color: theme.colors.muted,
    fontSize: 12,
    lineHeight: 17,
  },
  score: {
    alignItems: 'flex-end',
    gap: 7,
    minWidth: 86,
  },
  value: {
    color: theme.colors.brandDark,
    fontSize: 16,
    fontWeight: '900',
  },
  track: {
    backgroundColor: theme.colors.surfaceAlt,
    borderRadius: 999,
    height: 8,
    overflow: 'hidden',
    width: 82,
  },
  bar: {
    backgroundColor: theme.colors.moss,
    borderRadius: 999,
    height: '100%',
  },
});
