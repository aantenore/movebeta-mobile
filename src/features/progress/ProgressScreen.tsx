import { useCallback, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect } from 'expo-router';

import { Header } from '@/components/Header';
import { PlanStatusCard } from '@/components/PlanStatusCard';
import { Screen } from '@/components/Screen';
import { Section } from '@/components/Section';
import { appConfig } from '@/core/config';
import { limitHistoryForPlan } from '@/core/entitlements';
import { selectionFeedback } from '@/core/haptics';
import type { LocalAnalysisReport } from '@/movement/contracts';
import { formatBenchmarkDelta, summarizePersonalBenchmarks } from '@/movement/personalBenchmarks';
import {
  activeProgressFilterCount,
  defaultProgressFilters,
  deriveProgressFilterOptions,
  filterProgressReports,
  type ProgressFilters,
} from '@/movement/progressFilters';
import { analyzeDemoAttempt, listDemoAttempts, listReports } from '@/movement/repository';
import { summarizeProgress } from '@/movement/progressInsights';
import { summarizeProjectQueue } from '@/movement/projectQueue';
import { reportAnnotationRepository, type ReportAnnotation } from '@/movement/reportAnnotationRepository';
import { buildSessionPlan } from '@/movement/sessionPlan';
import { buildTechniqueReadinessPlan } from '@/movement/techniqueReadiness';
import { theme } from '@/core/theme';

type FilterChipProps = {
  label: string;
  onPress: () => void;
  selected: boolean;
};

function FilterChip({ label, onPress, selected }: FilterChipProps) {
  return (
    <Pressable
      accessibilityLabel={label}
      onPress={() => {
        selectionFeedback();
        onPress();
      }}
      style={[styles.filterChip, selected ? styles.filterChipSelected : null]}
    >
      <Text style={[styles.filterChipText, selected ? styles.filterChipTextSelected : null]}>{label}</Text>
    </Pressable>
  );
}

function FilterGroup({
  label,
  options,
}: {
  label: string;
  options: Array<{ label: string; onPress: () => void; selected: boolean }>;
}) {
  return (
    <View style={styles.filterGroup}>
      <Text style={styles.filterGroupLabel}>{label}</Text>
      <View style={styles.filterChips}>
        {options.map((option) => (
          <FilterChip key={`${label}-${option.label}`} {...option} />
        ))}
      </View>
    </View>
  );
}

export function ProgressScreen() {
  const [annotations, setAnnotations] = useState<ReportAnnotation[]>([]);
  const [filters, setFilters] = useState<ProgressFilters>(defaultProgressFilters);
  const [reports, setReports] = useState<LocalAnalysisReport[]>([]);
  const visibleReports = useMemo(() => limitHistoryForPlan(reports, appConfig.activePlan), [reports]);
  const filterOptions = useMemo(() => deriveProgressFilterOptions(visibleReports), [visibleReports]);
  const filteredReports = useMemo(() => filterProgressReports(visibleReports, filters), [visibleReports, filters]);
  const summary = useMemo(() => summarizeProgress(filteredReports), [filteredReports]);
  const projectQueue = useMemo(() => summarizeProjectQueue(filteredReports, annotations), [annotations, filteredReports]);
  const readiness = useMemo(() => buildTechniqueReadinessPlan(filteredReports, annotations), [annotations, filteredReports]);
  const personalBenchmarks = useMemo(() => summarizePersonalBenchmarks(filteredReports), [filteredReports]);
  const sessionPlan = useMemo(() => buildSessionPlan(filteredReports, annotations), [annotations, filteredReports]);
  const comparison = summary.attemptComparison;
  const activeFilters = activeProgressFilterCount(filters);

  async function refresh() {
    let nextReports = await listReports();

    if (nextReports.length === 0) {
      await Promise.all(listDemoAttempts().map((attempt) => analyzeDemoAttempt(attempt.session.id)));
      nextReports = await listReports();
    }

    setReports(nextReports);
    setAnnotations(await reportAnnotationRepository.listAnnotations());
  }

  useFocusEffect(
    useCallback(() => {
      void refresh().catch(() => {
        setAnnotations([]);
        setReports([]);
      });
    }, []),
  );

  return (
    <Screen>
      <Header
        eyebrow="Progress"
        title="Technique trends"
        subtitle="Track movement quality over attempts: flow, pause time, foot cuts, hip drift, and bent-arm load."
      />

      <View style={styles.summaryGrid}>
        <View style={styles.summaryCard}>
          <Text style={styles.summaryLabel}>Attempts</Text>
          <Text style={styles.summaryValue}>{summary.attemptCount}</Text>
        </View>
        <View style={styles.summaryCard}>
          <Text style={styles.summaryLabel}>Avg quality</Text>
          <Text style={styles.summaryValue}>{summary.averageQuality}/100</Text>
        </View>
      </View>

      {summary.bestMetric && summary.focusMetric ? (
        <View style={styles.focusBand}>
          <View style={styles.focusItem}>
            <Text style={styles.focusLabel}>Best signal</Text>
            <Text style={styles.focusValue}>{summary.bestMetric.label}</Text>
            <Text style={styles.focusMeta}>{summary.bestMetric.score}/100</Text>
          </View>
          <View style={styles.focusItem}>
            <Text style={styles.focusLabel}>Next focus</Text>
            <Text style={styles.focusValue}>{summary.focusMetric.label}</Text>
            <Text style={styles.focusMeta}>{summary.focusMetric.score}/100</Text>
          </View>
        </View>
      ) : null}

      <Section title="Next session plan" caption="A local training block assembled from readiness, benchmarks, and private project notes.">
        <View style={styles.sessionPlanCard}>
          <View style={styles.sessionPlanHeader}>
            <View style={styles.sessionPlanCopy}>
              <Text style={styles.sessionPlanKicker}>{sessionPlan.status}</Text>
              <Text style={styles.sessionPlanTitle}>{sessionPlan.title}</Text>
              <Text style={styles.sessionPlanMeta}>
                {sessionPlan.durationMinutes} min · cap {sessionPlan.intensityCap} · anchor {sessionPlan.anchor}
              </Text>
            </View>
            <View style={styles.sessionPlanTarget}>
              <Text style={styles.sessionPlanTargetLabel}>Target</Text>
              <Text style={styles.sessionPlanTargetText}>{sessionPlan.target}</Text>
            </View>
          </View>

          <View style={styles.sessionPlanPhases}>
            {sessionPlan.phases.map((phase, index) => (
              <View key={phase.id} style={styles.sessionPlanPhase}>
                <Text style={styles.sessionPlanPhaseStep}>{index + 1}</Text>
                <View style={styles.sessionPlanPhaseCopy}>
                  <Text style={styles.sessionPlanPhaseTitle}>
                    {phase.title} · {phase.durationMinutes} min
                  </Text>
                  <Text style={styles.sessionPlanPhaseText}>{phase.instruction}</Text>
                  <Text style={styles.sessionPlanPhaseEvidence}>{phase.evidence}</Text>
                </View>
              </View>
            ))}
          </View>

          <Text style={styles.sessionPlanSafety}>{sessionPlan.safetyNote}</Text>
        </View>
      </Section>

      <Section
        title="Technique readiness"
        caption="Local reports and private training logs converted into the next-session decision."
      >
        <View style={styles.readinessCard}>
          <View style={styles.readinessTop}>
            <View style={styles.readinessScoreBox}>
              <Text style={styles.readinessScore}>{readiness.score}</Text>
              <Text style={styles.readinessScoreLabel}>Ready</Text>
            </View>
            <View style={styles.readinessCopy}>
              <View style={styles.readinessTitleRow}>
                <Text style={styles.readinessTitle}>{readiness.headline}</Text>
                <Text
                  style={[
                    styles.readinessBadge,
                    readiness.status === 'recover' ? styles.readinessBadgeRecover : null,
                    readiness.status === 'ready' ? styles.readinessBadgeReady : null,
                    readiness.status === 'baseline' ? styles.readinessBadgeBaseline : null,
                  ]}
                >
                  {readiness.status}
                </Text>
              </View>
              <Text style={styles.readinessMeta}>Focus: {readiness.focus}</Text>
            </View>
          </View>

          <View style={styles.readinessBlock}>
            <Text style={styles.readinessBlockLabel}>Next action</Text>
            <Text style={styles.readinessBlockText}>{readiness.nextAction}</Text>
          </View>
          <View style={styles.readinessBlock}>
            <Text style={styles.readinessBlockLabel}>Warm-up</Text>
            <Text style={styles.readinessBlockText}>{readiness.warmup}</Text>
          </View>
          <View style={styles.readinessBlock}>
            <Text style={styles.readinessBlockLabel}>Risk</Text>
            <Text style={styles.readinessBlockText}>{readiness.risk}</Text>
          </View>
        </View>
      </Section>

      <Section
        title="History filters"
        caption={`${filteredReports.length}/${visibleReports.length} local reports shown · ${activeFilters} active filters`}
        trailing={
          activeFilters > 0 ? (
            <Pressable
              accessibilityLabel="Clear progress filters"
              onPress={() => {
                selectionFeedback();
                setFilters(defaultProgressFilters);
              }}
              style={styles.clearFilters}
            >
              <Text style={styles.clearFiltersText}>Clear</Text>
            </Pressable>
          ) : null
        }
      >
        <View style={styles.filterPanel}>
          <FilterGroup
            label="Wall angle"
            options={[
              {
                label: 'All walls',
                onPress: () => setFilters((current) => ({ ...current, wallAngle: 'all' })),
                selected: filters.wallAngle === 'all',
              },
              ...filterOptions.wallAngles.map((wallAngle) => ({
                label: wallAngle,
                onPress: () => setFilters((current) => ({ ...current, wallAngle })),
                selected: filters.wallAngle === wallAngle,
              })),
            ]}
          />
          <FilterGroup
            label="Grade"
            options={[
              {
                label: 'All grades',
                onPress: () => setFilters((current) => ({ ...current, grade: 'all' })),
                selected: filters.grade === 'all',
              },
              ...filterOptions.grades.map((grade) => ({
                label: grade,
                onPress: () => setFilters((current) => ({ ...current, grade })),
                selected: filters.grade === grade,
              })),
            ]}
          />
          <FilterGroup
            label="Gym"
            options={[
              {
                label: 'All gyms',
                onPress: () => setFilters((current) => ({ ...current, gym: 'all' })),
                selected: filters.gym === 'all',
              },
              ...filterOptions.gyms.map((gym) => ({
                label: gym,
                onPress: () => setFilters((current) => ({ ...current, gym })),
                selected: filters.gym === gym,
              })),
            ]}
          />
        </View>
      </Section>

      <Section title="Personal benchmarks" caption="Best local attempts by style, grade, and gym after current filters.">
        {personalBenchmarks.bestOverall ? (
          <View style={styles.benchmarkCard}>
            <View style={styles.benchmarkHero}>
              <View>
                <Text style={styles.benchmarkKicker}>Best overall</Text>
                <Text style={styles.benchmarkTitle}>{personalBenchmarks.bestOverall.bestReport.session.title}</Text>
                <Text style={styles.benchmarkMeta}>
                  {personalBenchmarks.bestOverall.bestReport.session.gym} · {personalBenchmarks.bestOverall.bestReport.session.grade}
                </Text>
              </View>
              <View style={styles.benchmarkScoreBox}>
                <Text style={styles.benchmarkScore}>{personalBenchmarks.bestOverall.bestReport.analysisQuality.score}</Text>
                <Text style={styles.benchmarkScoreLabel}>Best</Text>
              </View>
            </View>
            <Text style={styles.benchmarkDelta}>
              Latest {formatBenchmarkDelta(personalBenchmarks.bestOverall.latestVsBestDelta)} ·{' '}
              {personalBenchmarks.bestOverall.reportCount} attempts
            </Text>

            <View style={styles.benchmarkGrid}>
              {personalBenchmarks.benchmarks.map((benchmark) => (
                <View key={`${benchmark.segment}-${benchmark.title}`} style={styles.benchmarkItem}>
                  <Text style={styles.benchmarkItemLabel}>{benchmark.title}</Text>
                  <Text style={styles.benchmarkItemValue}>{benchmark.bestReport.analysisQuality.score}/100</Text>
                  <Text style={styles.benchmarkItemMeta}>
                    {formatBenchmarkDelta(benchmark.latestVsBestDelta)} · avg {benchmark.averageQuality}
                  </Text>
                </View>
              ))}
            </View>
          </View>
        ) : (
          <View style={styles.preview}>
            <Text style={styles.previewTitle}>No benchmark yet</Text>
            <Text style={styles.previewText}>Run one local analysis to create the first personal benchmark.</Text>
          </View>
        )}
      </Section>

      <Section title="Project queue" caption="Private training-log status converted into the next local repeat.">
        <View style={styles.projectQueueCard}>
          <View style={styles.projectQueueStats}>
            <View style={styles.projectQueueStat}>
              <Text style={styles.projectQueueValue}>{projectQueue.activeCount}</Text>
              <Text style={styles.projectQueueLabel}>Active</Text>
            </View>
            <View style={styles.projectQueueStat}>
              <Text style={styles.projectQueueValue}>{projectQueue.repeatCount}</Text>
              <Text style={styles.projectQueueLabel}>Repeats</Text>
            </View>
            <View style={styles.projectQueueStat}>
              <Text style={styles.projectQueueValue}>{projectQueue.sentCount}</Text>
              <Text style={styles.projectQueueLabel}>Sent</Text>
            </View>
            <View style={styles.projectQueueStat}>
              <Text style={styles.projectQueueValue}>{projectQueue.averageEffort || '-'}</Text>
              <Text style={styles.projectQueueLabel}>Effort</Text>
            </View>
          </View>

          {projectQueue.nextProject ? (
            <View style={styles.nextProject}>
              <Text style={styles.nextProjectLabel}>Next repeat</Text>
              <Text style={styles.nextProjectTitle}>{projectQueue.nextProject.report.session.title}</Text>
              <Text style={styles.nextProjectAction}>{projectQueue.nextProject.action}</Text>
              <Text style={styles.nextProjectMeta}>
                {projectQueue.nextProject.annotation.projectStatus} · confidence{' '}
                {projectQueue.nextProject.annotation.confidence}/5 · effort{' '}
                {projectQueue.nextProject.annotation.perceivedEffort}/5
              </Text>
            </View>
          ) : (
            <View style={styles.previewCompact}>
              <Text style={styles.previewTitle}>No active projects yet</Text>
              <Text style={styles.previewText}>Save a Sessions training log as Project or Repeat to populate this queue.</Text>
            </View>
          )}
        </View>
      </Section>

      {comparison ? (
        <Section title="Attempt comparison" caption="Latest attempt measured against the previous local report.">
          <View style={styles.comparisonCard}>
            <View style={styles.comparisonHeader}>
              <View style={styles.comparisonTitleGroup}>
                <Text style={styles.comparisonLabel}>Latest</Text>
                <Text style={styles.comparisonTitle}>{comparison.currentReport.session.title}</Text>
              </View>
              <View style={styles.deltaPill}>
                <Text
                  style={[
                    styles.deltaPillText,
                    comparison.overallScoreDelta < 0 ? styles.deltaPillTextDown : null,
                  ]}
                >
                  {comparison.overallScoreDelta > 0 ? '+' : ''}
                  {comparison.overallScoreDelta}
                </Text>
              </View>
            </View>

            <Text style={styles.comparisonText}>{comparison.headline}</Text>
            <Text style={styles.comparisonMeta}>
              Baseline: {comparison.baselineReport.session.title} · Quality{' '}
              {comparison.qualityDelta > 0 ? '+' : ''}
              {comparison.qualityDelta}
            </Text>

            <View style={styles.comparisonStats}>
              <View style={styles.comparisonStat}>
                <Text style={styles.comparisonStatValue}>{comparison.improvedMetrics.length}</Text>
                <Text style={styles.comparisonStatLabel}>Improved</Text>
              </View>
              <View style={styles.comparisonStat}>
                <Text style={styles.comparisonStatValue}>{comparison.regressedMetrics.length}</Text>
                <Text style={styles.comparisonStatLabel}>Regressed</Text>
              </View>
              <View style={styles.comparisonStat}>
                <Text style={styles.comparisonStatValue}>{comparison.cueComparison.resolvedCues.length}</Text>
                <Text style={styles.comparisonStatLabel}>Cues cleared</Text>
              </View>
            </View>

            <Text style={styles.recommendation}>{comparison.recommendation}</Text>
          </View>
        </Section>
      ) : (
        <Section title="Attempt comparison" caption="Run two analyses of the same climb to unlock beta deltas.">
          <View style={styles.preview}>
            <Text style={styles.previewTitle}>Need one more attempt</Text>
            <Text style={styles.previewText}>The next repeat will unlock score deltas, cleared cues, and focus shifts.</Text>
          </View>
        </Section>
      )}

      <Section title="Current trend">
        <View style={styles.chart}>
          {summary.trends.map((trend) => (
            <View key={trend.id} style={styles.row}>
              <Text style={styles.label}>{trend.label}</Text>
              <View style={styles.track}>
                <View style={[styles.bar, { width: `${trend.currentScore}%` }]} />
              </View>
              <View style={styles.scoreGroup}>
                <Text style={styles.score}>{trend.currentScore}</Text>
                <Text style={[styles.delta, trend.direction === 'down' ? styles.deltaDown : null]}>
                  {trend.delta === null ? 'new' : `${trend.delta > 0 ? '+' : ''}${trend.delta}`}
                </Text>
              </View>
            </View>
          ))}
        </View>
      </Section>

      <Section title="Pro history preview" caption="Local-first history can later unlock filters, benchmarks, and coach sharing.">
        <View style={styles.preview}>
          <Text style={styles.previewTitle}>Next unlock</Text>
          <Text style={styles.previewText}>
            Compare trends by grade, wall angle, and gym while keeping raw video out of sync by default.
          </Text>
        </View>
      </Section>

      <Section title="Plan access" caption="History and coach features are capability-gated, not hard-coded to prices.">
        <PlanStatusCard
          capability="unlimited-history"
          includedText="Unlimited local history is enabled for this build."
          lockedText="Recent trends stay available; unlimited history is a Pro capability."
          plan={appConfig.activePlan}
          title="Unlimited local history"
        />
      </Section>
    </Screen>
  );
}

const styles = StyleSheet.create({
  chart: {
    backgroundColor: theme.colors.surface,
    borderColor: theme.colors.line,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    gap: theme.spacing.sm,
    padding: theme.spacing.md,
  },
  row: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: theme.spacing.sm,
  },
  label: {
    color: theme.colors.ink,
    fontSize: 13,
    fontWeight: '900',
    width: 106,
  },
  track: {
    backgroundColor: theme.colors.surfaceAlt,
    borderRadius: 999,
    flex: 1,
    height: 12,
    overflow: 'hidden',
  },
  bar: {
    backgroundColor: theme.colors.moss,
    borderRadius: 999,
    height: '100%',
  },
  comparisonCard: {
    backgroundColor: theme.colors.surface,
    borderColor: theme.colors.line,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    gap: theme.spacing.sm,
    padding: theme.spacing.md,
  },
  comparisonHeader: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: theme.spacing.sm,
    justifyContent: 'space-between',
  },
  comparisonLabel: {
    color: theme.colors.muted,
    fontSize: 11,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  comparisonMeta: {
    color: theme.colors.muted,
    fontSize: 12,
    fontWeight: '800',
    lineHeight: 17,
  },
  comparisonStat: {
    backgroundColor: theme.colors.surfaceAlt,
    borderRadius: theme.radius.sm,
    flex: 1,
    gap: 2,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: theme.spacing.sm,
  },
  comparisonStatLabel: {
    color: theme.colors.muted,
    fontSize: 10,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  comparisonStats: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
  },
  comparisonStatValue: {
    color: theme.colors.ink,
    fontSize: 18,
    fontWeight: '900',
  },
  comparisonText: {
    color: theme.colors.text,
    fontSize: 13,
    lineHeight: 18,
  },
  comparisonTitle: {
    color: theme.colors.ink,
    fontSize: 17,
    fontWeight: '900',
    lineHeight: 21,
  },
  comparisonTitleGroup: {
    flex: 1,
    gap: 3,
  },
  delta: {
    color: theme.colors.success,
    fontSize: 11,
    fontWeight: '900',
    textAlign: 'right',
  },
  deltaDown: {
    color: theme.colors.coral,
  },
  deltaPill: {
    backgroundColor: theme.colors.brandSoft,
    borderRadius: theme.radius.sm,
    minWidth: 48,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: theme.spacing.xs,
  },
  deltaPillText: {
    color: theme.colors.success,
    fontSize: 16,
    fontWeight: '900',
    textAlign: 'center',
  },
  deltaPillTextDown: {
    color: theme.colors.coral,
  },
  focusBand: {
    backgroundColor: theme.colors.brandDark,
    borderRadius: theme.radius.lg,
    flexDirection: 'row',
    gap: theme.spacing.sm,
    padding: theme.spacing.md,
  },
  focusItem: {
    flex: 1,
    gap: 3,
  },
  focusLabel: {
    color: '#DCECF3',
    fontSize: 11,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  focusMeta: {
    color: '#DCECF3',
    fontSize: 12,
    fontWeight: '900',
  },
  focusValue: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '900',
  },
  clearFilters: {
    backgroundColor: theme.colors.brandSoft,
    borderRadius: theme.radius.sm,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  clearFiltersText: {
    color: theme.colors.brand,
    fontSize: 12,
    fontWeight: '900',
  },
  filterPanel: {
    backgroundColor: theme.colors.surface,
    borderColor: theme.colors.line,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    gap: theme.spacing.md,
    padding: theme.spacing.md,
  },
  filterGroup: {
    gap: 8,
  },
  filterGroupLabel: {
    color: theme.colors.ink,
    fontSize: 12,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  filterChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.sm,
  },
  filterChip: {
    backgroundColor: theme.colors.surfaceAlt,
    borderColor: theme.colors.line,
    borderRadius: theme.radius.sm,
    borderWidth: 1,
    paddingHorizontal: 11,
    paddingVertical: 9,
  },
  filterChipSelected: {
    backgroundColor: theme.colors.brandDark,
    borderColor: theme.colors.brandDark,
  },
  filterChipText: {
    color: theme.colors.brandDark,
    fontSize: 12,
    fontWeight: '900',
  },
  filterChipTextSelected: {
    color: '#FFFFFF',
  },
  projectQueueCard: {
    backgroundColor: theme.colors.surface,
    borderColor: theme.colors.line,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    gap: theme.spacing.md,
    padding: theme.spacing.md,
  },
  sessionPlanCard: {
    backgroundColor: theme.colors.surface,
    borderColor: theme.colors.line,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    gap: theme.spacing.md,
    padding: theme.spacing.md,
  },
  sessionPlanCopy: {
    flex: 1,
    gap: 4,
  },
  sessionPlanHeader: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.md,
    justifyContent: 'space-between',
  },
  sessionPlanKicker: {
    color: theme.colors.muted,
    fontSize: 11,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  sessionPlanMeta: {
    color: theme.colors.muted,
    fontSize: 12,
    fontWeight: '800',
    lineHeight: 17,
  },
  sessionPlanPhases: {
    gap: theme.spacing.sm,
  },
  sessionPlanPhase: {
    alignItems: 'flex-start',
    backgroundColor: theme.colors.surfaceAlt,
    borderRadius: theme.radius.sm,
    flexDirection: 'row',
    gap: theme.spacing.sm,
    padding: theme.spacing.sm,
  },
  sessionPlanPhaseCopy: {
    flex: 1,
    gap: 3,
  },
  sessionPlanPhaseEvidence: {
    color: theme.colors.muted,
    fontSize: 11,
    fontWeight: '800',
    lineHeight: 15,
  },
  sessionPlanPhaseStep: {
    backgroundColor: theme.colors.brandDark,
    borderRadius: theme.radius.sm,
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '900',
    minWidth: 26,
    overflow: 'hidden',
    paddingVertical: 6,
    textAlign: 'center',
  },
  sessionPlanPhaseText: {
    color: theme.colors.text,
    fontSize: 12,
    lineHeight: 17,
  },
  sessionPlanPhaseTitle: {
    color: theme.colors.ink,
    fontSize: 13,
    fontWeight: '900',
    lineHeight: 17,
  },
  sessionPlanSafety: {
    color: theme.colors.coral,
    fontSize: 12,
    fontWeight: '900',
    lineHeight: 17,
  },
  sessionPlanTarget: {
    backgroundColor: theme.colors.brandSoft,
    borderRadius: theme.radius.sm,
    maxWidth: 180,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: theme.spacing.sm,
  },
  sessionPlanTargetLabel: {
    color: theme.colors.brand,
    fontSize: 10,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  sessionPlanTargetText: {
    color: theme.colors.brandDark,
    fontSize: 12,
    fontWeight: '900',
    lineHeight: 16,
  },
  sessionPlanTitle: {
    color: theme.colors.ink,
    fontSize: 19,
    fontWeight: '900',
    lineHeight: 23,
  },
  readinessBadge: {
    backgroundColor: theme.colors.brandSoft,
    borderRadius: theme.radius.sm,
    color: theme.colors.brand,
    fontSize: 11,
    fontWeight: '900',
    overflow: 'hidden',
    paddingHorizontal: 9,
    paddingVertical: 6,
    textTransform: 'uppercase',
  },
  readinessBadgeBaseline: {
    backgroundColor: theme.colors.surfaceAlt,
    color: theme.colors.muted,
  },
  readinessBadgeReady: {
    backgroundColor: '#E8F4EE',
    color: theme.colors.success,
  },
  readinessBadgeRecover: {
    backgroundColor: '#FFF0EC',
    color: theme.colors.coral,
  },
  readinessBlock: {
    backgroundColor: theme.colors.surfaceAlt,
    borderRadius: theme.radius.sm,
    gap: 4,
    padding: theme.spacing.sm,
  },
  readinessBlockLabel: {
    color: theme.colors.muted,
    fontSize: 10,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  readinessBlockText: {
    color: theme.colors.text,
    fontSize: 13,
    lineHeight: 18,
  },
  readinessCard: {
    backgroundColor: theme.colors.surface,
    borderColor: theme.colors.line,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    gap: theme.spacing.sm,
    padding: theme.spacing.md,
  },
  readinessCopy: {
    flex: 1,
    gap: 5,
  },
  readinessMeta: {
    color: theme.colors.muted,
    fontSize: 12,
    fontWeight: '800',
    lineHeight: 17,
  },
  readinessScore: {
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: '900',
  },
  readinessScoreBox: {
    alignItems: 'center',
    backgroundColor: theme.colors.brandDark,
    borderRadius: theme.radius.md,
    minWidth: 74,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: theme.spacing.sm,
  },
  readinessScoreLabel: {
    color: '#DCECF3',
    fontSize: 10,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  readinessTitle: {
    color: theme.colors.ink,
    flex: 1,
    fontSize: 18,
    fontWeight: '900',
    lineHeight: 22,
  },
  readinessTitleRow: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: theme.spacing.sm,
  },
  readinessTop: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: theme.spacing.md,
  },
  benchmarkCard: {
    backgroundColor: theme.colors.surface,
    borderColor: theme.colors.line,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    gap: theme.spacing.md,
    padding: theme.spacing.md,
  },
  benchmarkDelta: {
    color: theme.colors.brand,
    fontSize: 12,
    fontWeight: '900',
    lineHeight: 17,
  },
  benchmarkGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.sm,
  },
  benchmarkHero: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: theme.spacing.md,
    justifyContent: 'space-between',
  },
  benchmarkItem: {
    backgroundColor: theme.colors.surfaceAlt,
    borderRadius: theme.radius.sm,
    flexGrow: 1,
    gap: 3,
    minWidth: 128,
    padding: theme.spacing.sm,
  },
  benchmarkItemLabel: {
    color: theme.colors.muted,
    fontSize: 10,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  benchmarkItemMeta: {
    color: theme.colors.text,
    fontSize: 11,
    fontWeight: '800',
    lineHeight: 15,
  },
  benchmarkItemValue: {
    color: theme.colors.ink,
    fontSize: 18,
    fontWeight: '900',
  },
  benchmarkKicker: {
    color: theme.colors.muted,
    fontSize: 11,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  benchmarkMeta: {
    color: theme.colors.muted,
    fontSize: 12,
    fontWeight: '800',
    lineHeight: 17,
  },
  benchmarkScore: {
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: '900',
  },
  benchmarkScoreBox: {
    alignItems: 'center',
    backgroundColor: theme.colors.moss,
    borderRadius: theme.radius.md,
    minWidth: 70,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: theme.spacing.sm,
  },
  benchmarkScoreLabel: {
    color: '#F4FFF8',
    fontSize: 10,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  benchmarkTitle: {
    color: theme.colors.ink,
    fontSize: 18,
    fontWeight: '900',
    lineHeight: 22,
  },
  projectQueueStats: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.sm,
  },
  projectQueueStat: {
    backgroundColor: theme.colors.surfaceAlt,
    borderRadius: theme.radius.sm,
    flexGrow: 1,
    gap: 2,
    minWidth: 72,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: theme.spacing.sm,
  },
  projectQueueValue: {
    color: theme.colors.ink,
    fontSize: 18,
    fontWeight: '900',
  },
  projectQueueLabel: {
    color: theme.colors.muted,
    fontSize: 10,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  nextProject: {
    backgroundColor: theme.colors.brandDark,
    borderRadius: theme.radius.md,
    gap: 5,
    padding: theme.spacing.md,
  },
  nextProjectAction: {
    color: '#DCECF3',
    fontSize: 13,
    lineHeight: 18,
  },
  nextProjectLabel: {
    color: '#DCECF3',
    fontSize: 11,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  nextProjectMeta: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '900',
    lineHeight: 17,
  },
  nextProjectTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '900',
  },
  score: {
    color: theme.colors.ink,
    fontSize: 12,
    fontWeight: '900',
    textAlign: 'right',
  },
  scoreGroup: {
    alignItems: 'flex-end',
    width: 32,
  },
  summaryCard: {
    backgroundColor: theme.colors.surface,
    borderColor: theme.colors.line,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    flex: 1,
    gap: 5,
    padding: theme.spacing.md,
  },
  summaryGrid: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
  },
  summaryLabel: {
    color: theme.colors.muted,
    fontSize: 11,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  summaryValue: {
    color: theme.colors.ink,
    fontSize: 24,
    fontWeight: '900',
  },
  preview: {
    backgroundColor: theme.colors.surface,
    borderColor: theme.colors.line,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    gap: 5,
    padding: theme.spacing.md,
  },
  previewCompact: {
    backgroundColor: theme.colors.surfaceAlt,
    borderRadius: theme.radius.sm,
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
  recommendation: {
    color: theme.colors.brand,
    fontSize: 13,
    fontWeight: '900',
    lineHeight: 18,
  },
});
