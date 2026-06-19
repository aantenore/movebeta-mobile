import { StyleSheet, Text, View } from 'react-native';

import type { MovementCue } from '@/movement/contracts';
import type { CueTrustSignal } from '@/movement/cueTrust';
import { theme } from '@/core/theme';

type MovementCueCardProps = {
  cue: MovementCue;
  trustSignal?: CueTrustSignal;
};

export function MovementCueCard({ cue, trustSignal }: MovementCueCardProps) {
  return (
    <View style={[styles.card, cue.severity === 'fix' && styles.fix]}>
      <View style={styles.top}>
        <Text style={styles.title}>{cue.title}</Text>
        <Text style={styles.badge}>{cue.severity}</Text>
      </View>
      <Text style={styles.body}>{cue.body}</Text>
      <Text style={styles.drill}>{cue.drill}</Text>
      {trustSignal ? (
        <View style={styles.trust}>
          <Text style={styles.trustLabel}>{trustSignal.label}</Text>
          <Text style={styles.trustScore}>{trustSignal.score}/100</Text>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: theme.colors.surface,
    borderColor: theme.colors.line,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    gap: theme.spacing.sm,
    padding: theme.spacing.md,
  },
  fix: {
    borderColor: theme.colors.coral,
  },
  top: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: theme.spacing.sm,
    justifyContent: 'space-between',
  },
  title: {
    color: theme.colors.ink,
    flex: 1,
    fontSize: 16,
    fontWeight: '900',
  },
  badge: {
    backgroundColor: theme.colors.surfaceAlt,
    borderRadius: theme.radius.sm,
    color: theme.colors.brandDark,
    fontSize: 11,
    fontWeight: '900',
    overflow: 'hidden',
    paddingHorizontal: 9,
    paddingVertical: 6,
    textTransform: 'uppercase',
  },
  body: {
    color: theme.colors.text,
    fontSize: 14,
    lineHeight: 20,
  },
  drill: {
    color: theme.colors.brand,
    fontSize: 13,
    fontWeight: '900',
    lineHeight: 18,
  },
  trust: {
    alignItems: 'center',
    backgroundColor: theme.colors.surfaceAlt,
    borderRadius: theme.radius.sm,
    flexDirection: 'row',
    gap: theme.spacing.sm,
    justifyContent: 'space-between',
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  trustLabel: {
    color: theme.colors.brandDark,
    flex: 1,
    fontSize: 12,
    fontWeight: '900',
  },
  trustScore: {
    color: theme.colors.ink,
    fontSize: 12,
    fontVariant: ['tabular-nums'],
    fontWeight: '900',
  },
});
