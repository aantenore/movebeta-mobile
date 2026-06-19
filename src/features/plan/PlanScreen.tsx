import { StyleSheet, Text, View } from 'react-native';
import { ArrowUpRight, CheckCircle2, Circle, ShieldCheck } from 'lucide-react-native';

import { Header } from '@/components/Header';
import { Screen } from '@/components/Screen';
import { Section } from '@/components/Section';
import { appConfig } from '@/core/config';
import { theme } from '@/core/theme';
import { buildPlanCatalog, buildPlanRecommendation, type PlanCatalogItem } from '@/core/planCatalog';

function statusLabel(status: PlanCatalogItem['status']) {
  if (status === 'current') return 'Current';
  if (status === 'upgrade') return 'Upgrade';
  return 'Included';
}

function PlanCard({ item }: { item: PlanCatalogItem }) {
  const accent =
    item.status === 'current' ? styles.planCurrent : item.status === 'upgrade' ? styles.planUpgrade : styles.planIncluded;

  return (
    <View style={[styles.planCard, accent]}>
      <View style={styles.planTop}>
        <View style={styles.planTitleGroup}>
          <Text style={styles.planLabel}>{statusLabel(item.status)}</Text>
          <Text style={styles.planTitle}>{item.label}</Text>
        </View>
        <Text style={styles.planCta}>{item.cta}</Text>
      </View>
      <Text style={styles.planSummary}>{item.summary}</Text>
      <Text style={styles.planMeta}>{item.historyAccess}</Text>
      <View style={styles.unlockList}>
        {(item.highlightedUnlocks.length > 0 ? item.highlightedUnlocks : item.capabilities.slice(0, 3)).map((capability) => (
          <View key={capability.capability} style={styles.unlockRow}>
            {item.status === 'upgrade' ? (
              <ArrowUpRight color={theme.colors.brand} size={15} />
            ) : (
              <CheckCircle2 color={theme.colors.success} size={15} />
            )}
            <Text style={styles.unlockText}>{capability.label}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

export function PlanScreen() {
  const catalog = buildPlanCatalog(appConfig.activePlan);
  const recommendation = buildPlanRecommendation(appConfig.activePlan);
  const groupedCapabilities = catalog
    .find((item) => item.key === 'coach')
    ?.capabilities.reduce<Record<string, PlanCatalogItem['capabilities']>>((groups, capability) => {
      groups[capability.group] = [...(groups[capability.group] ?? []), capability];
      return groups;
    }, {});

  return (
    <Screen>
      <Header
        eyebrow="Plan"
        title="Plan catalog"
        subtitle="A configurable freemium surface for local climbers, Pro athletes, and coach workflows."
      />

      <Section title="Current plan" caption="The active tier comes from app configuration, not movement-engine code.">
        <View style={styles.recommendation}>
          <View style={styles.recommendationIcon}>
            <ShieldCheck color="#FFFFFF" size={22} />
          </View>
          <View style={styles.recommendationCopy}>
            <Text style={styles.recommendationTitle}>{recommendation.title}</Text>
            <Text style={styles.recommendationText}>{recommendation.action}</Text>
          </View>
        </View>
      </Section>

      <Section title="Upgrade path" caption="Each tier is derived from the same capability contract used by product gates.">
        <View style={styles.planList}>
          {catalog.map((item) => (
            <PlanCard key={item.key} item={item} />
          ))}
        </View>
      </Section>

      <Section title="Capability matrix" caption="Coach includes all published capabilities; lower tiers keep useful local value.">
        <View style={styles.matrix}>
          {Object.entries(groupedCapabilities ?? {}).map(([group, capabilities]) => (
            <View key={group} style={styles.matrixGroup}>
              <Text style={styles.matrixGroupTitle}>{group}</Text>
              {capabilities.map((capability) => (
                <View key={capability.capability} style={styles.matrixRow}>
                  <Circle color={theme.colors.brand} fill={theme.colors.brandSoft} size={11} />
                  <View style={styles.matrixCopy}>
                    <Text style={styles.matrixLabel}>{capability.label}</Text>
                    <Text style={styles.matrixSummary}>{capability.summary}</Text>
                  </View>
                </View>
              ))}
            </View>
          ))}
        </View>
      </Section>

      <Section title="Commercial readiness" caption="Checkout can be connected later without changing analysis contracts.">
        <View style={styles.readiness}>
          <Text style={styles.readinessTitle}>Provider status</Text>
          <Text style={styles.readinessBadge}>Not connected</Text>
          <Text style={styles.readinessText}>
            Keep store subscriptions or a provider such as RevenueCat outside the movement domain; map receipts back to
            the same plan keys.
          </Text>
        </View>
      </Section>
    </Screen>
  );
}

const styles = StyleSheet.create({
  matrix: {
    gap: theme.spacing.md,
  },
  matrixCopy: {
    flex: 1,
    gap: 3,
  },
  matrixGroup: {
    backgroundColor: theme.colors.surface,
    borderColor: theme.colors.line,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    gap: theme.spacing.sm,
    padding: theme.spacing.md,
  },
  matrixGroupTitle: {
    color: theme.colors.brand,
    fontSize: 12,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  matrixLabel: {
    color: theme.colors.ink,
    fontSize: 13,
    fontWeight: '900',
  },
  matrixRow: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: theme.spacing.sm,
  },
  matrixSummary: {
    color: theme.colors.muted,
    fontSize: 12,
    lineHeight: 17,
  },
  planCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    gap: theme.spacing.sm,
    padding: theme.spacing.md,
  },
  planCta: {
    borderRadius: theme.radius.sm,
    color: theme.colors.brand,
    fontSize: 11,
    fontWeight: '900',
    overflow: 'hidden',
    paddingHorizontal: 9,
    paddingVertical: 6,
  },
  planCurrent: {
    borderColor: theme.colors.success,
  },
  planIncluded: {
    borderColor: theme.colors.line,
  },
  planLabel: {
    color: theme.colors.muted,
    fontSize: 11,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  planList: {
    gap: theme.spacing.sm,
  },
  planMeta: {
    color: theme.colors.muted,
    fontSize: 12,
    fontWeight: '800',
  },
  planSummary: {
    color: theme.colors.text,
    fontSize: 13,
    lineHeight: 19,
  },
  planTitle: {
    color: theme.colors.ink,
    fontSize: 20,
    fontWeight: '900',
  },
  planTitleGroup: {
    flex: 1,
    gap: 2,
  },
  planTop: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: theme.spacing.sm,
    justifyContent: 'space-between',
  },
  planUpgrade: {
    borderColor: theme.colors.brand,
  },
  readiness: {
    backgroundColor: theme.colors.brandDark,
    borderRadius: theme.radius.md,
    gap: theme.spacing.sm,
    padding: theme.spacing.md,
  },
  readinessBadge: {
    alignSelf: 'flex-start',
    backgroundColor: '#FFF5E7',
    borderRadius: theme.radius.sm,
    color: theme.colors.amber,
    fontSize: 11,
    fontWeight: '900',
    overflow: 'hidden',
    paddingHorizontal: 9,
    paddingVertical: 6,
    textTransform: 'uppercase',
  },
  readinessText: {
    color: '#DCECF3',
    fontSize: 13,
    lineHeight: 19,
  },
  readinessTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '900',
  },
  recommendation: {
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    borderColor: theme.colors.line,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    flexDirection: 'row',
    gap: theme.spacing.md,
    padding: theme.spacing.md,
  },
  recommendationCopy: {
    flex: 1,
    gap: 4,
  },
  recommendationIcon: {
    alignItems: 'center',
    backgroundColor: theme.colors.brand,
    borderRadius: theme.radius.md,
    height: 44,
    justifyContent: 'center',
    width: 44,
  },
  recommendationText: {
    color: theme.colors.text,
    fontSize: 13,
    lineHeight: 19,
  },
  recommendationTitle: {
    color: theme.colors.ink,
    fontSize: 17,
    fontWeight: '900',
  },
  unlockList: {
    gap: 7,
  },
  unlockRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 7,
  },
  unlockText: {
    color: theme.colors.text,
    flex: 1,
    fontSize: 12,
    fontWeight: '800',
  },
});
