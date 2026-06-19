import { StyleSheet, Text, View } from 'react-native';
import { ArrowUpRight, CheckCircle2, Circle, ShieldCheck, TriangleAlert } from 'lucide-react-native';

import { Header } from '@/components/Header';
import { Screen } from '@/components/Screen';
import { Section } from '@/components/Section';
import { appConfig } from '@/core/config';
import { buildLaunchReadinessSummary, type LaunchReadinessTrack } from '@/core/launchReadiness';
import { buildNativeQaEvidenceKit } from '@/core/nativeQaEvidenceKit';
import { buildNativeQaEvidenceDraft, validateNativeQaEvidenceForApp } from '@/core/nativeQaEvidenceValidation';
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

function readinessStatusLabel(status: LaunchReadinessTrack['status']) {
  if (status === 'ready') return 'Ready';
  if (status === 'blocked') return 'Blocked';
  return 'Action';
}

function LaunchTrackCard({ track }: { track: LaunchReadinessTrack }) {
  const isReady = track.status === 'ready';
  const isBlocked = track.status === 'blocked';

  return (
    <View style={[styles.launchTrack, isReady ? styles.launchTrackReady : isBlocked ? styles.launchTrackBlocked : null]}>
      <View style={styles.launchTrackTop}>
        <View style={styles.launchTrackTitleGroup}>
          <Text style={styles.launchTrackTitle}>{track.label}</Text>
          <Text style={styles.launchTrackSummary}>{track.summary}</Text>
        </View>
        <Text style={[styles.launchStatus, isReady ? styles.launchStatusReady : isBlocked ? styles.launchStatusBlocked : null]}>
          {readinessStatusLabel(track.status)}
        </Text>
      </View>
      <Text style={styles.launchAction}>{track.action}</Text>
      <View style={styles.launchChecks}>
        {track.checks.map((check) => (
          <View key={check.key} style={styles.launchCheckRow}>
            {check.status === 'ready' ? (
              <CheckCircle2 color={theme.colors.success} size={15} />
            ) : (
              <TriangleAlert color={check.status === 'blocked' ? theme.colors.coral : theme.colors.amber} size={15} />
            )}
            <Text style={styles.launchCheckText}>{check.label}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

function NativeQaEvidenceKitCard({ kit }: { kit: ReturnType<typeof buildNativeQaEvidenceKit> }) {
  const latencyCopy = kit.budgets.maxLatencyByClipMs
    .map(
      (budget) =>
        `${Math.round(budget.maxClipDurationMs / 1000)}s clip: ${Math.round(budget.maxAnalysisMs / 1000)}s analysis`,
    )
    .join(' · ');
  const draftValidation = validateNativeQaEvidenceForApp(buildNativeQaEvidenceDraft());
  const readyRuns = draftValidation.runSummaries.filter((run) => run.status === 'pass').length;

  return (
    <View style={styles.qaKit}>
      <View style={styles.qaKitHero}>
        <View style={styles.qaKitMetric}>
          <Text style={styles.qaKitMetricValue}>{kit.summary.requiredRuns}</Text>
          <Text style={styles.qaKitMetricLabel}>device runs</Text>
        </View>
        <View style={styles.qaKitMetric}>
          <Text style={styles.qaKitMetricValue}>{kit.summary.workflowCountPerPlatform}</Text>
          <Text style={styles.qaKitMetricLabel}>workflows</Text>
        </View>
        <View style={styles.qaKitMetric}>
          <Text style={styles.qaKitMetricValue}>{kit.budgets.maxBatteryDropPct}%</Text>
          <Text style={styles.qaKitMetricLabel}>battery max</Text>
        </View>
      </View>
      <Text style={styles.qaKitAction}>{kit.summary.action}</Text>
      <Text style={styles.qaKitText}>{kit.placeholderPolicy}</Text>
      <Text style={styles.qaKitText}>Latency budgets: {latencyCopy}</Text>
      <View style={styles.qaValidation}>
        <View style={styles.qaValidationTop}>
          <View style={styles.launchTrackTitleGroup}>
            <Text style={styles.qaValidationTitle}>Evidence validator preview</Text>
            <Text style={styles.qaKitText}>Draft evidence remains blocked until real device values replace placeholders.</Text>
          </View>
          <Text style={[styles.launchStatus, styles.launchStatusBlocked]}>Blocked</Text>
        </View>
        <View style={styles.qaValidationStats}>
          <Text style={styles.qaValidationStat}>
            {readyRuns}/{draftValidation.runSummaries.length} ready runs
          </Text>
          <Text style={styles.qaValidationStat}>{draftValidation.failedChecks.length} blocking checks</Text>
          <Text style={styles.qaValidationStat}>No raw artifact references accepted</Text>
        </View>
        {draftValidation.failedChecks.slice(0, 3).map((check) => (
          <View key={check.id} style={styles.qaWorkflowRow}>
            <TriangleAlert color={theme.colors.coral} size={14} />
            <Text style={styles.qaWorkflowText}>{check.detail}</Text>
          </View>
        ))}
      </View>
      <View style={styles.qaPlatformList}>
        {kit.platforms.map((platform) => (
          <View key={platform.key} style={styles.qaPlatform}>
            <Text style={styles.qaPlatformTitle}>{platform.label}</Text>
            {platform.requiredWorkflows.slice(0, 4).map((workflow) => (
              <View key={workflow.key} style={styles.qaWorkflowRow}>
                <CheckCircle2 color={theme.colors.success} size={14} />
                <Text style={styles.qaWorkflowText}>{workflow.label}</Text>
              </View>
            ))}
            <Text style={styles.qaPlatformMore}>
              +{Math.max(0, platform.requiredWorkflows.length - 4)} more · {kit.validationCommand}
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
}

export function PlanScreen() {
  const catalog = buildPlanCatalog(appConfig.activePlan);
  const recommendation = buildPlanRecommendation(appConfig.activePlan);
  const launchReadiness = buildLaunchReadinessSummary(appConfig.launchReadinessEvidence);
  const nativeQaKit = buildNativeQaEvidenceKit();
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

      <Section title="Launch readiness" caption="A configurable release cockpit for demo, internal beta, and store submission gates.">
        <View style={styles.launchOverview}>
          <View style={styles.launchHero}>
            <View style={styles.launchHeroIcon}>
              {launchReadiness.status === 'ready' ? (
                <ShieldCheck color="#FFFFFF" size={22} />
              ) : (
                <TriangleAlert color="#FFFFFF" size={22} />
              )}
            </View>
            <View style={styles.launchHeroCopy}>
              <Text style={styles.launchHeroTitle}>
                {launchReadiness.readyTracks}/{launchReadiness.tracks.length} launch tracks ready
              </Text>
              <Text style={styles.launchHeroText}>{launchReadiness.nextAction}</Text>
            </View>
          </View>
          <View style={styles.launchTrackList}>
            {launchReadiness.tracks.map((track) => (
              <LaunchTrackCard key={track.key} track={track} />
            ))}
          </View>
        </View>
      </Section>

      <Section title="Native QA evidence kit" caption="Physical-device evidence checklist for internal beta and store readiness.">
        <NativeQaEvidenceKitCard kit={nativeQaKit} />
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
  launchAction: {
    color: theme.colors.text,
    fontSize: 12,
    lineHeight: 17,
  },
  launchCheckRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 7,
  },
  launchChecks: {
    gap: 6,
  },
  launchCheckText: {
    color: theme.colors.text,
    flex: 1,
    fontSize: 12,
    fontWeight: '800',
  },
  launchHero: {
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    borderColor: theme.colors.line,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    flexDirection: 'row',
    gap: theme.spacing.md,
    padding: theme.spacing.md,
  },
  launchHeroCopy: {
    flex: 1,
    gap: 4,
  },
  launchHeroIcon: {
    alignItems: 'center',
    backgroundColor: theme.colors.brandDark,
    borderRadius: theme.radius.md,
    height: 44,
    justifyContent: 'center',
    width: 44,
  },
  launchHeroText: {
    color: theme.colors.text,
    fontSize: 13,
    lineHeight: 19,
  },
  launchHeroTitle: {
    color: theme.colors.ink,
    fontSize: 17,
    fontWeight: '900',
  },
  launchOverview: {
    gap: theme.spacing.sm,
  },
  launchStatus: {
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
  launchStatusBlocked: {
    backgroundColor: '#FBE7E1',
    color: theme.colors.coral,
  },
  launchStatusReady: {
    backgroundColor: '#E6F3EC',
    color: theme.colors.success,
  },
  launchTrack: {
    backgroundColor: theme.colors.surface,
    borderColor: theme.colors.line,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    gap: theme.spacing.sm,
    padding: theme.spacing.md,
  },
  launchTrackBlocked: {
    borderColor: theme.colors.coral,
  },
  launchTrackList: {
    gap: theme.spacing.sm,
  },
  launchTrackReady: {
    borderColor: theme.colors.success,
  },
  launchTrackSummary: {
    color: theme.colors.muted,
    fontSize: 12,
    lineHeight: 17,
  },
  launchTrackTitle: {
    color: theme.colors.ink,
    fontSize: 15,
    fontWeight: '900',
  },
  launchTrackTitleGroup: {
    flex: 1,
    gap: 3,
  },
  launchTrackTop: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: theme.spacing.sm,
    justifyContent: 'space-between',
  },
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
  qaKit: {
    backgroundColor: theme.colors.surface,
    borderColor: theme.colors.line,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    gap: theme.spacing.sm,
    padding: theme.spacing.md,
  },
  qaKitAction: {
    color: theme.colors.ink,
    fontSize: 13,
    fontWeight: '900',
    lineHeight: 18,
  },
  qaKitHero: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
  },
  qaKitMetric: {
    backgroundColor: theme.colors.surfaceAlt,
    borderRadius: theme.radius.sm,
    flex: 1,
    gap: 2,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: theme.spacing.sm,
  },
  qaKitMetricLabel: {
    color: theme.colors.muted,
    fontSize: 10,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  qaKitMetricValue: {
    color: theme.colors.brand,
    fontSize: 19,
    fontWeight: '900',
  },
  qaKitText: {
    color: theme.colors.text,
    fontSize: 12,
    lineHeight: 17,
  },
  qaPlatform: {
    backgroundColor: theme.colors.surfaceAlt,
    borderRadius: theme.radius.sm,
    gap: 7,
    padding: theme.spacing.sm,
  },
  qaPlatformList: {
    gap: theme.spacing.sm,
  },
  qaPlatformMore: {
    color: theme.colors.muted,
    fontSize: 11,
    fontWeight: '800',
  },
  qaPlatformTitle: {
    color: theme.colors.ink,
    fontSize: 13,
    fontWeight: '900',
  },
  qaValidation: {
    backgroundColor: '#FBE7E1',
    borderColor: theme.colors.coral,
    borderRadius: theme.radius.sm,
    borderWidth: 1,
    gap: 8,
    padding: theme.spacing.sm,
  },
  qaValidationStat: {
    color: theme.colors.ink,
    flex: 1,
    fontSize: 11,
    fontWeight: '900',
    lineHeight: 15,
  },
  qaValidationStats: {
    flexDirection: 'row',
    gap: 8,
  },
  qaValidationTitle: {
    color: theme.colors.ink,
    fontSize: 13,
    fontWeight: '900',
  },
  qaValidationTop: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: theme.spacing.sm,
    justifyContent: 'space-between',
  },
  qaWorkflowRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 6,
  },
  qaWorkflowText: {
    color: theme.colors.text,
    flex: 1,
    fontSize: 12,
    fontWeight: '800',
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
