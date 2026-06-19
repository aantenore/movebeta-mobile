import { useCallback, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { Target } from 'lucide-react-native';

import { Header } from '@/components/Header';
import { PlanStatusCard } from '@/components/PlanStatusCard';
import { Screen } from '@/components/Screen';
import { Section } from '@/components/Section';
import { appConfig } from '@/core/config';
import { theme } from '@/core/theme';
import { buildDrillPlan, type DrillPlan } from '@/movement/drillPlanner';
import { analyzeDemoAttempt, listDemoAttempts, listReports } from '@/movement/repository';

function emptyPlan(): DrillPlan {
  return {
    items: [],
    sourceReportCount: 0,
    weeklyLoad: 'No focused drill load until a report produces coach cues.',
  };
}

export function DrillsScreen() {
  const [plan, setPlan] = useState<DrillPlan>(emptyPlan);

  async function refresh() {
    let reports = await listReports();

    if (reports.length === 0) {
      await Promise.all(listDemoAttempts().map((attempt) => analyzeDemoAttempt(attempt.session.id)));
      reports = await listReports();
    }

    setPlan(buildDrillPlan(reports));
  }

  useFocusEffect(
    useCallback(() => {
      void refresh().catch(() => setPlan(emptyPlan()));
    }, []),
  );

  return (
    <Screen>
      <Header
        eyebrow="Drills"
        title="Practice from evidence"
        subtitle="Each drill is generated from a local movement cue, not a generic training plan."
      />

      <View style={styles.summary}>
        <Target color={theme.colors.brand} size={20} />
        <View style={styles.summaryCopy}>
          <Text style={styles.summaryLabel}>Weekly load</Text>
          <Text style={styles.summaryValue}>{plan.weeklyLoad}</Text>
          <Text style={styles.summaryMeta}>{plan.sourceReportCount} local reports scanned</Text>
        </View>
      </View>

      <Section title="Weekly drill plan">
        {plan.items.length > 0 ? (
          plan.items.map((item) => (
            <View key={item.id} style={[styles.drillCard, item.priority === 'high' ? styles.highPriority : null]}>
              <View style={styles.drillTop}>
                <Text style={styles.drillTitle}>{item.title}</Text>
                <Text style={[styles.priority, item.priority === 'high' ? styles.priorityHigh : null]}>
                  {item.priority}
                </Text>
              </View>
              <Text style={styles.drillText}>{item.drill}</Text>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Dosage</Text>
                <Text style={styles.detailValue}>{item.dosage}</Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Evidence</Text>
                <Text style={styles.detailValue}>{item.evidence}</Text>
              </View>
            </View>
          ))
        ) : (
          <View style={styles.empty}>
            <Text style={styles.emptyTitle}>No drill plan yet</Text>
            <Text style={styles.emptyText}>Run an analysis that produces coach cues, then return here.</Text>
          </View>
        )}
      </Section>

      <Section title="Coach pack preview" caption="Advanced packs can later layer benchmarks and coach-approved variants on top.">
        <View style={styles.preview}>
          <Text style={styles.previewTitle}>Next unlock</Text>
          <Text style={styles.previewText}>
            Save plan variants by grade, wall angle, and athlete goal while keeping report data local by default.
          </Text>
        </View>
      </Section>

      <Section title="Plan access" caption="Freemium gates are capability-based and can be swapped behind config.">
        <PlanStatusCard
          capability="advanced-drill-packs"
          includedText="Advanced drill packs are enabled for this build."
          lockedText="Weekly drills stay available; advanced coach-approved packs are a Pro capability."
          plan={appConfig.activePlan}
          title="Advanced drill packs"
        />
      </Section>
    </Screen>
  );
}

const styles = StyleSheet.create({
  detailLabel: {
    color: theme.colors.muted,
    fontSize: 11,
    fontWeight: '900',
    textTransform: 'uppercase',
    width: 70,
  },
  detailRow: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: theme.spacing.sm,
  },
  detailValue: {
    color: theme.colors.text,
    flex: 1,
    fontSize: 13,
    fontWeight: '800',
    lineHeight: 18,
  },
  drillCard: {
    backgroundColor: theme.colors.surface,
    borderColor: theme.colors.line,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    gap: theme.spacing.sm,
    padding: theme.spacing.md,
  },
  drillText: {
    color: theme.colors.text,
    fontSize: 14,
    lineHeight: 20,
  },
  drillTitle: {
    color: theme.colors.ink,
    flex: 1,
    fontSize: 16,
    fontWeight: '900',
  },
  drillTop: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: theme.spacing.sm,
    justifyContent: 'space-between',
  },
  empty: {
    backgroundColor: theme.colors.surface,
    borderColor: theme.colors.line,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    gap: 4,
    padding: theme.spacing.md,
  },
  emptyText: {
    color: theme.colors.muted,
    fontSize: 13,
    lineHeight: 18,
  },
  emptyTitle: {
    color: theme.colors.ink,
    fontSize: 16,
    fontWeight: '900',
  },
  highPriority: {
    borderColor: theme.colors.coral,
  },
  preview: {
    backgroundColor: theme.colors.surface,
    borderColor: theme.colors.line,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    gap: 5,
    padding: theme.spacing.md,
  },
  previewText: {
    color: theme.colors.text,
    fontSize: 13,
    lineHeight: 18,
  },
  previewTitle: {
    color: theme.colors.brand,
    fontSize: 14,
    fontWeight: '900',
  },
  priority: {
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
  priorityHigh: {
    backgroundColor: '#FFF0EC',
    color: theme.colors.coral,
  },
  summary: {
    alignItems: 'center',
    backgroundColor: theme.colors.brandSoft,
    borderRadius: theme.radius.lg,
    flexDirection: 'row',
    gap: theme.spacing.md,
    padding: theme.spacing.md,
  },
  summaryCopy: {
    flex: 1,
    gap: 3,
  },
  summaryLabel: {
    color: theme.colors.brand,
    fontSize: 11,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  summaryMeta: {
    color: theme.colors.muted,
    fontSize: 12,
    fontWeight: '800',
  },
  summaryValue: {
    color: theme.colors.ink,
    fontSize: 17,
    fontWeight: '900',
  },
});
