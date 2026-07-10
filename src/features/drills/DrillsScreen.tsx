import { useCallback, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { Target } from 'lucide-react-native';

import { Header } from '@/components/Header';
import { Pressable } from '@/components/Pressable';
import { PlanStatusCard } from '@/components/PlanStatusCard';
import { Screen } from '@/components/Screen';
import { Section } from '@/components/Section';
import { StateView } from '@/components/StateView';
import { appConfig } from '@/core/config';
import { hasCapability } from '@/core/entitlements';
import { selectionFeedback } from '@/core/haptics';
import { theme } from '@/core/theme';
import { buildAdvancedDrillPack, type AdvancedDrillPack } from '@/movement/drillPackPlanner';
import { buildDrillPlan, type DrillPlan, type DrillPlanItem } from '@/movement/drillPlanner';
import {
  createDrillPracticeRecord,
  drillPracticeRepository,
  type DrillPracticeRecord,
} from '@/movement/drillPracticeRepository';
import { reportAnnotationRepository } from '@/movement/reportAnnotationRepository';
import { listReports } from '@/movement/repository';

function emptyPlan(): DrillPlan {
  return {
    items: [],
    sourceReportCount: 0,
    weeklyLoad: 'No focused drill load until a report produces coach cues.',
  };
}

function emptyAdvancedPack(): AdvancedDrillPack {
  return buildAdvancedDrillPack([], [], [], {
    generatedAt: '1970-01-01T00:00:00.000Z',
  });
}

export function DrillsScreen() {
  const advancedPackIncluded = hasCapability(appConfig.activePlan, 'advanced-drill-packs');
  const [plan, setPlan] = useState<DrillPlan>(emptyPlan);
  const [advancedPack, setAdvancedPack] = useState<AdvancedDrillPack>(emptyAdvancedPack);
  const [practiceByDrill, setPracticeByDrill] = useState<Record<string, DrillPracticeRecord>>({});
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');

  async function refresh() {
    setLoading(true);
    setLoadError('');
    try {
      const reports = await listReports();
      const nextAnnotations = await reportAnnotationRepository.listAnnotations();
      const nextPractice = await drillPracticeRepository.listRecords();
      setPracticeByDrill(Object.fromEntries(nextPractice.map((record) => [record.drillId, record])));
      setPlan(buildDrillPlan(reports, nextAnnotations));
      setAdvancedPack(buildAdvancedDrillPack(reports, nextAnnotations, nextPractice));
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : 'Local drill evidence could not be loaded.');
    } finally {
      setLoading(false);
    }
  }

  async function savePractice(item: DrillPlanItem, status: DrillPracticeRecord['status']) {
    selectionFeedback();
    const record = await drillPracticeRepository.saveRecord(
      createDrillPracticeRecord({
        cueId: item.cueId,
        drillId: item.id,
        reportId: item.sourceReportId,
        status,
      }),
    );
    setPracticeByDrill((current) => ({
      ...current,
      [record.drillId]: record,
    }));
  }

  useFocusEffect(
    useCallback(() => {
      void refresh();
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

      {loading && plan.sourceReportCount === 0 ? (
        <StateView loading title="Loading drill evidence" message="Reading local cues and practice records." />
      ) : loadError ? (
        <StateView title="Drills unavailable" message={loadError} />
      ) : null}

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
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Feedback</Text>
                <Text style={styles.detailValue}>
                  {item.feedbackStatus} · {item.feedbackEvidence}
                </Text>
              </View>
              <View style={styles.practiceRow}>
                <View style={styles.practiceCopy}>
                  <Text style={styles.practiceLabel}>Practice log</Text>
                  <Text style={styles.practiceValue}>{practiceByDrill[item.id]?.status ?? 'not logged'}</Text>
                </View>
                <View style={styles.practiceActions}>
                  <Pressable
                    accessibilityLabel={`Mark ${item.title} done`}
                    onPress={() => void savePractice(item, 'completed')}
                    style={[
                      styles.practiceButton,
                      practiceByDrill[item.id]?.status === 'completed' ? styles.practiceButtonSelected : null,
                    ]}
                  >
                    <Text
                      style={[
                        styles.practiceButtonText,
                        practiceByDrill[item.id]?.status === 'completed' ? styles.practiceButtonTextSelected : null,
                      ]}
                    >
                      Done
                    </Text>
                  </Pressable>
                  <Pressable
                    accessibilityLabel={`Skip ${item.title}`}
                    onPress={() => void savePractice(item, 'skipped')}
                    style={[
                      styles.practiceButton,
                      practiceByDrill[item.id]?.status === 'skipped' ? styles.practiceButtonSelectedMuted : null,
                    ]}
                  >
                    <Text
                      style={[
                        styles.practiceButtonText,
                        practiceByDrill[item.id]?.status === 'skipped' ? styles.practiceButtonTextSelected : null,
                      ]}
                    >
                      Skip
                    </Text>
                  </Pressable>
                </View>
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

      <Section
        title="Advanced drill pack"
        caption={
          advancedPackIncluded
            ? 'Pro blocks built from local reports, cue feedback, and practice logs.'
            : 'Pro preview from local evidence.'
        }
      >
        <View style={styles.packSummary}>
          <View style={styles.packSummaryTop}>
            <Text style={styles.packLabel}>Pack status</Text>
            <Text style={styles.packBadge}>{advancedPackIncluded ? advancedPack.status : 'preview'}</Text>
          </View>
          <Text style={styles.packTitle}>{advancedPack.primaryFocus}</Text>
          <Text style={styles.packText}>{advancedPack.summary}</Text>
          <View style={styles.packMetaGrid}>
            <View style={styles.packMetaItem}>
              <Text style={styles.packMetaLabel}>Readiness</Text>
              <Text style={styles.packMetaValue}>{advancedPack.readinessScore}/100</Text>
            </View>
            <View style={styles.packMetaItem}>
              <Text style={styles.packMetaLabel}>Angle</Text>
              <Text style={styles.packMetaValue}>{advancedPack.wallAngleFocus ?? 'none'}</Text>
            </View>
            <View style={styles.packMetaItem}>
              <Text style={styles.packMetaLabel}>Signals</Text>
              <Text style={styles.packMetaValue}>
                {advancedPack.annotationSignalCount + advancedPack.practiceSignalCount}
              </Text>
            </View>
          </View>
        </View>

        {advancedPackIncluded && advancedPack.blocks.length > 0 ? (
          advancedPack.blocks.map((block) => (
            <View key={block.id} style={styles.packBlock}>
              <View style={styles.packBlockTop}>
                <Text style={styles.packBlockTitle}>{block.title}</Text>
                <Text style={styles.packBlockBadge}>{block.intensity}</Text>
              </View>
              <Text style={styles.packBlockText}>{block.adaptation}</Text>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Dose</Text>
                <Text style={styles.detailValue}>
                  {block.durationMinutes} min · {block.wallAngle} · {block.gradeBand}
                </Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Criteria</Text>
                <Text style={styles.detailValue}>{block.successCriteria}</Text>
              </View>
              <View style={styles.progressionList}>
                {block.progression.map((step, index) => (
                  <Text key={`${block.id}-step-${index}`} style={styles.progressionItem}>
                    {index + 1}. {step}
                  </Text>
                ))}
              </View>
            </View>
          ))
        ) : (
          <View style={styles.empty}>
            <Text style={styles.emptyTitle}>{advancedPackIncluded ? 'No advanced pack yet' : 'Advanced pack locked'}</Text>
            <Text style={styles.emptyText}>
              {advancedPackIncluded
                ? 'Run an analysis that produces coach cues, then return here.'
                : 'Weekly drills remain available on Free. Advanced progression blocks require Pro.'}
            </Text>
          </View>
        )}
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
    width: 78,
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
  packBadge: {
    backgroundColor: theme.colors.brand,
    borderRadius: theme.radius.sm,
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '900',
    overflow: 'hidden',
    paddingHorizontal: 9,
    paddingVertical: 6,
    textTransform: 'uppercase',
  },
  packBlock: {
    backgroundColor: theme.colors.surface,
    borderColor: theme.colors.line,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    gap: theme.spacing.sm,
    padding: theme.spacing.md,
  },
  packBlockBadge: {
    backgroundColor: theme.colors.surfaceAlt,
    borderRadius: theme.radius.sm,
    color: theme.colors.brandDark,
    fontSize: 11,
    fontWeight: '900',
    overflow: 'hidden',
    paddingHorizontal: 8,
    paddingVertical: 6,
    textTransform: 'uppercase',
  },
  packBlockText: {
    color: theme.colors.text,
    fontSize: 13,
    lineHeight: 18,
  },
  packBlockTitle: {
    color: theme.colors.ink,
    flex: 1,
    fontSize: 15,
    fontWeight: '900',
    lineHeight: 20,
  },
  packBlockTop: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: theme.spacing.sm,
    justifyContent: 'space-between',
  },
  packLabel: {
    color: theme.colors.brand,
    fontSize: 11,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  packMetaGrid: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
  },
  packMetaItem: {
    backgroundColor: theme.colors.surface,
    borderColor: theme.colors.line,
    borderRadius: theme.radius.sm,
    borderWidth: 1,
    flex: 1,
    gap: 2,
    padding: theme.spacing.sm,
  },
  packMetaLabel: {
    color: theme.colors.muted,
    fontSize: 10,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  packMetaValue: {
    color: theme.colors.ink,
    fontSize: 12,
    fontWeight: '900',
    textTransform: 'capitalize',
  },
  packSummary: {
    backgroundColor: theme.colors.brandSoft,
    borderRadius: theme.radius.md,
    gap: theme.spacing.sm,
    padding: theme.spacing.md,
  },
  packSummaryTop: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: theme.spacing.sm,
    justifyContent: 'space-between',
  },
  packText: {
    color: theme.colors.text,
    fontSize: 13,
    lineHeight: 18,
  },
  packTitle: {
    color: theme.colors.ink,
    fontSize: 14,
    fontWeight: '900',
  },
  practiceActions: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
  },
  practiceButton: {
    backgroundColor: theme.colors.surfaceAlt,
    borderColor: theme.colors.line,
    borderRadius: theme.radius.sm,
    borderWidth: 1,
    minWidth: 68,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 8,
  },
  practiceButtonSelected: {
    backgroundColor: theme.colors.success,
    borderColor: theme.colors.success,
  },
  practiceButtonSelectedMuted: {
    backgroundColor: theme.colors.brandDark,
    borderColor: theme.colors.brandDark,
  },
  practiceButtonText: {
    color: theme.colors.brandDark,
    fontSize: 12,
    fontWeight: '900',
    textAlign: 'center',
  },
  practiceButtonTextSelected: {
    color: '#FFFFFF',
  },
  practiceCopy: {
    flex: 1,
    gap: 2,
  },
  practiceLabel: {
    color: theme.colors.muted,
    fontSize: 11,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  practiceRow: {
    alignItems: 'center',
    backgroundColor: theme.colors.surfaceAlt,
    borderRadius: theme.radius.sm,
    flexDirection: 'row',
    gap: theme.spacing.sm,
    justifyContent: 'space-between',
    padding: theme.spacing.sm,
  },
  practiceValue: {
    color: theme.colors.ink,
    fontSize: 13,
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
  progressionItem: {
    color: theme.colors.text,
    fontSize: 12,
    fontWeight: '800',
    lineHeight: 18,
  },
  progressionList: {
    backgroundColor: theme.colors.surfaceAlt,
    borderRadius: theme.radius.sm,
    gap: 4,
    padding: theme.spacing.sm,
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
