import { StyleSheet, Text, View } from 'react-native';

import { theme } from '@/core/theme';
import {
  type Capability,
  type PlanKey,
  describeHistoryAccess,
  getEntitlement,
  hasCapability,
  summarizeUpgradePath,
} from '@/core/entitlements';

type PlanStatusCardProps = {
  capability: Capability;
  includedText: string;
  lockedText: string;
  plan: PlanKey;
  title: string;
};

export function PlanStatusCard({ capability, includedText, lockedText, plan, title }: PlanStatusCardProps) {
  const entitlement = getEntitlement(plan);
  const included = hasCapability(plan, capability);

  return (
    <View style={styles.card}>
      <View style={styles.topRow}>
        <View style={styles.titleGroup}>
          <Text style={styles.label}>Current plan</Text>
          <Text style={styles.title}>{entitlement.label}</Text>
          <Text style={styles.feature}>{title}</Text>
        </View>
        <Text style={[styles.badge, included ? styles.includedBadge : styles.lockedBadge]}>
          {included ? 'Included' : summarizeUpgradePath(plan, capability)}
        </Text>
      </View>
      <Text style={styles.body}>{included ? includedText : lockedText}</Text>
      <Text style={styles.meta}>{describeHistoryAccess(plan)}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    borderRadius: theme.radius.sm,
    fontSize: 11,
    fontWeight: '900',
    overflow: 'hidden',
    paddingHorizontal: 9,
    paddingVertical: 6,
  },
  body: {
    color: theme.colors.text,
    fontSize: 13,
    lineHeight: 18,
  },
  card: {
    backgroundColor: theme.colors.surface,
    borderColor: theme.colors.line,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    gap: theme.spacing.sm,
    padding: theme.spacing.md,
  },
  feature: {
    color: theme.colors.brand,
    fontSize: 12,
    fontWeight: '900',
  },
  includedBadge: {
    backgroundColor: theme.colors.brandSoft,
    color: theme.colors.brand,
  },
  label: {
    color: theme.colors.muted,
    fontSize: 11,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  lockedBadge: {
    backgroundColor: '#FFF0EC',
    color: theme.colors.coral,
  },
  meta: {
    color: theme.colors.muted,
    fontSize: 12,
    fontWeight: '800',
  },
  title: {
    color: theme.colors.ink,
    fontSize: 16,
    fontWeight: '900',
  },
  titleGroup: {
    flex: 1,
    gap: 2,
  },
  topRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: theme.spacing.sm,
    justifyContent: 'space-between',
  },
});
