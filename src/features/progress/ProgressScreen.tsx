import { useCallback, useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect } from 'expo-router';

import { Header } from '@/components/Header';
import { PlanStatusCard } from '@/components/PlanStatusCard';
import { Screen } from '@/components/Screen';
import { Section } from '@/components/Section';
import { appConfig } from '@/core/config';
import { limitHistoryForPlan } from '@/core/entitlements';
import { selectionFeedback } from '@/core/haptics';
import {
  buildAttemptPacingPacket,
  buildAttemptPacingPlan,
  formatAttemptPacingPacketSummary,
  formatRestTimerClock,
} from '@/movement/attemptPacing';
import { summarizeAnalysisTrustTrend } from '@/movement/analysisTrustTrend';
import { summarizeBetaMemory } from '@/movement/betaMemory';
import type { LocalAnalysisReport } from '@/movement/contracts';
import { summarizeCueFeedbackInsights } from '@/movement/cueFeedbackInsights';
import { summarizeCuePatterns } from '@/movement/cuePatterns';
import { summarizeDrillPracticeInsights } from '@/movement/drillPracticeInsights';
import { drillPracticeRepository, type DrillPracticeRecord } from '@/movement/drillPracticeRepository';
import { formatBenchmarkDelta, summarizePersonalBenchmarks } from '@/movement/personalBenchmarks';
import { buildPreSendGuard } from '@/movement/preSendGuard';
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
import { summarizeRepeatOutcomes } from '@/movement/repeatOutcomeInsights';
import { reportAnnotationRepository, type ReportAnnotation } from '@/movement/reportAnnotationRepository';
import { buildSessionCloseout } from '@/movement/sessionCloseout';
import { buildSessionAgenda, buildSessionAgendaPacket, formatSessionAgendaPacketSummary } from '@/movement/sessionAgenda';
import { buildSessionPlan } from '@/movement/sessionPlan';
import { buildTechniqueReadinessPlan } from '@/movement/techniqueReadiness';
import { summarizeTrainingLoad } from '@/movement/trainingLoad';
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
  const [drillPractice, setDrillPractice] = useState<DrillPracticeRecord[]>([]);
  const [filters, setFilters] = useState<ProgressFilters>(defaultProgressFilters);
  const [activeRestTimer, setActiveRestTimer] = useState<{ label: string; remainingSeconds: number; sourceStepId: string } | null>(null);
  const [preparedAgendaPacket, setPreparedAgendaPacket] = useState<{ body: string; title: string } | null>(null);
  const [preparedPacingPacket, setPreparedPacingPacket] = useState<{ body: string; title: string } | null>(null);
  const [reports, setReports] = useState<LocalAnalysisReport[]>([]);
  const visibleReports = useMemo(() => limitHistoryForPlan(reports, appConfig.activePlan), [reports]);
  const filterOptions = useMemo(() => deriveProgressFilterOptions(visibleReports), [visibleReports]);
  const filteredReports = useMemo(() => filterProgressReports(visibleReports, filters), [visibleReports, filters]);
  const summary = useMemo(() => summarizeProgress(filteredReports, annotations), [annotations, filteredReports]);
  const analysisTrustTrend = useMemo(() => summarizeAnalysisTrustTrend(filteredReports), [filteredReports]);
  const projectQueue = useMemo(() => summarizeProjectQueue(filteredReports, annotations), [annotations, filteredReports]);
  const readiness = useMemo(() => buildTechniqueReadinessPlan(filteredReports, annotations), [annotations, filteredReports]);
  const personalBenchmarks = useMemo(() => summarizePersonalBenchmarks(filteredReports), [filteredReports]);
  const sessionPlan = useMemo(
    () => buildSessionPlan(filteredReports, annotations, drillPractice),
    [annotations, drillPractice, filteredReports],
  );
  const sessionAgenda = useMemo(
    () => buildSessionAgenda({ annotations, drillPractice, reports: filteredReports }),
    [annotations, drillPractice, filteredReports],
  );
  const sessionCloseout = useMemo(
    () => buildSessionCloseout({ annotations, drillPractice, reports: filteredReports }),
    [annotations, drillPractice, filteredReports],
  );
  const attemptPacing = useMemo(
    () => buildAttemptPacingPlan({ annotations, drillPractice, reports: filteredReports }),
    [annotations, drillPractice, filteredReports],
  );
  const trainingLoad = useMemo(
    () => summarizeTrainingLoad({ annotations, drillPractice }),
    [annotations, drillPractice],
  );
  const preSendGuard = useMemo(
    () => buildPreSendGuard(filteredReports, annotations, drillPractice),
    [annotations, drillPractice, filteredReports],
  );
  const cuePatterns = useMemo(() => summarizeCuePatterns(filteredReports), [filteredReports]);
  const cueFeedbackInsights = useMemo(() => summarizeCueFeedbackInsights(filteredReports, annotations), [annotations, filteredReports]);
  const repeatOutcomeInsights = useMemo(() => summarizeRepeatOutcomes(filteredReports, annotations), [annotations, filteredReports]);
  const betaMemory = useMemo(() => summarizeBetaMemory(filteredReports, annotations), [annotations, filteredReports]);
  const drillPracticeInsights = useMemo(
    () => summarizeDrillPracticeInsights(filteredReports, drillPractice),
    [drillPractice, filteredReports],
  );
  const comparison = summary.attemptComparison;
  const activeFilters = activeProgressFilterCount(filters);

  function prepareAgendaPacket() {
    selectionFeedback();
    const packet = buildSessionAgendaPacket(sessionAgenda);
    setPreparedAgendaPacket({
      body: `${formatSessionAgendaPacketSummary(packet)}\n\n${JSON.stringify(packet, null, 2)}`,
      title: 'Prepared session agenda packet',
    });
  }

  function preparePacingPacket() {
    selectionFeedback();
    const packet = buildAttemptPacingPacket(attemptPacing);
    setPreparedPacingPacket({
      body: `${formatAttemptPacingPacketSummary(packet)}\n\n${JSON.stringify(packet, null, 2)}`,
      title: 'Prepared attempt pacing packet',
    });
  }

  function startRestTimer(stepId: string, label: string, seconds: number) {
    selectionFeedback();
    setActiveRestTimer({
      label,
      remainingSeconds: seconds,
      sourceStepId: stepId,
    });
  }

  async function refresh() {
    let nextReports = await listReports();

    if (nextReports.length === 0) {
      await Promise.all(listDemoAttempts().map((attempt) => analyzeDemoAttempt(attempt.session.id)));
      nextReports = await listReports();
    }

    const [nextAnnotations, nextDrillPractice] = await Promise.all([
      reportAnnotationRepository.listAnnotations(),
      drillPracticeRepository.listRecords(),
    ]);

    setReports(nextReports);
    setAnnotations(nextAnnotations);
    setDrillPractice(nextDrillPractice);
  }

  useFocusEffect(
    useCallback(() => {
      void refresh().catch(() => {
        setAnnotations([]);
        setDrillPractice([]);
        setReports([]);
      });
    }, []),
  );

  useEffect(() => {
    if (!activeRestTimer || activeRestTimer.remainingSeconds <= 0) return undefined;

    const timer = setInterval(() => {
      setActiveRestTimer((current) => {
        if (!current) return current;
        if (current.remainingSeconds <= 1) {
          return { ...current, remainingSeconds: 0 };
        }
        return { ...current, remainingSeconds: current.remainingSeconds - 1 };
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [activeRestTimer]);

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

      <Section title="Analysis trust trend" caption="Local reliability trend across the currently filtered reports.">
        <View style={styles.analysisTrustTrendCard}>
          <View style={styles.analysisTrustTrendHeader}>
            <View style={styles.analysisTrustTrendCopy}>
              <Text style={styles.analysisTrustTrendKicker}>{analysisTrustTrend.status}</Text>
              <Text style={styles.analysisTrustTrendTitle}>{analysisTrustTrend.summary}</Text>
              <Text style={styles.analysisTrustTrendMeta}>
                {analysisTrustTrend.reportCount} reports · avg {analysisTrustTrend.averageScore}/100
              </Text>
            </View>
            <View
              style={[
                styles.analysisTrustTrendScore,
                analysisTrustTrend.status === 'degrading' ? styles.analysisTrustTrendScoreLimit : null,
                analysisTrustTrend.status === 'stable-ready' || analysisTrustTrend.status === 'improving'
                  ? styles.analysisTrustTrendScoreReady
                  : null,
              ]}
            >
              <Text style={styles.analysisTrustTrendScoreValue}>{analysisTrustTrend.latest?.score ?? '-'}</Text>
              <Text style={styles.analysisTrustTrendScoreLabel}>Latest</Text>
            </View>
          </View>

          <View style={styles.analysisTrustTrendAction}>
            <Text style={styles.analysisTrustTrendActionLabel}>Next action</Text>
            <Text style={styles.analysisTrustTrendActionText}>{analysisTrustTrend.nextAction}</Text>
          </View>

          <View style={styles.analysisTrustTrendStats}>
            <View style={styles.analysisTrustTrendStat}>
              <Text style={styles.analysisTrustTrendStatValue}>{analysisTrustTrend.counts.coachReady}</Text>
              <Text style={styles.analysisTrustTrendStatLabel}>Ready reports</Text>
            </View>
            <View style={styles.analysisTrustTrendStat}>
              <Text style={styles.analysisTrustTrendStatValue}>{analysisTrustTrend.counts.reviewFirst}</Text>
              <Text style={styles.analysisTrustTrendStatLabel}>Review first</Text>
            </View>
            <View style={styles.analysisTrustTrendStat}>
              <Text style={styles.analysisTrustTrendStatValue}>
                {analysisTrustTrend.counts.retake + analysisTrustTrend.counts.journalOnly}
              </Text>
              <Text style={styles.analysisTrustTrendStatLabel}>Retake/journal</Text>
            </View>
          </View>

          {analysisTrustTrend.latest ? (
            <View style={styles.analysisTrustTrendLatest}>
              <Text style={styles.analysisTrustTrendLatestLabel}>Latest decision</Text>
              <Text style={styles.analysisTrustTrendLatestValue}>{analysisTrustTrend.latest.decision}</Text>
              <Text style={styles.analysisTrustTrendLatestMeta}>{analysisTrustTrend.latest.title}</Text>
            </View>
          ) : null}

          <View style={styles.analysisTrustTrendPrivacy}>
            <Text style={styles.analysisTrustTrendPrivacyText}>Raw video included: no</Text>
            <Text style={styles.analysisTrustTrendPrivacyText}>Private notes included: no</Text>
            <Text style={styles.analysisTrustTrendPrivacyText}>
              Local boundary crossings: {analysisTrustTrend.privacy.reportsCrossingLocalBoundary}
            </Text>
          </View>
        </View>
      </Section>

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

      <Section title="Session agenda" caption="A local agenda that combines load, session plan, and closeout evidence.">
        <View style={styles.sessionAgendaCard}>
          <View style={styles.sessionAgendaHeader}>
            <View style={styles.sessionAgendaCopy}>
              <Text style={styles.sessionAgendaKicker}>{sessionAgenda.status}</Text>
              <Text style={styles.sessionAgendaTitle}>{sessionAgenda.title}</Text>
              <Text style={styles.sessionAgendaMeta}>
                {sessionAgenda.summary.totalMinutes} min · {sessionAgenda.summary.blockCount} blocks · anchor {sessionAgenda.anchor}
              </Text>
            </View>
            <View
              style={[
                styles.sessionAgendaBadge,
                sessionAgenda.status === 'deload' ? styles.sessionAgendaBadgeLimit : null,
                sessionAgenda.status === 'progress' ? styles.sessionAgendaBadgeReady : null,
              ]}
            >
              <Text style={styles.sessionAgendaBadgeValue}>{sessionAgenda.summary.closeoutNeededCount}</Text>
              <Text style={styles.sessionAgendaBadgeLabel}>Open</Text>
            </View>
          </View>

          <View style={styles.sessionAgendaNextAction}>
            <Text style={styles.sessionAgendaNextActionLabel}>Next action</Text>
            <Text style={styles.sessionAgendaNextActionText}>{sessionAgenda.nextAction}</Text>
          </View>

          <View style={styles.sessionAgendaBlocks}>
            {sessionAgenda.blocks.map((block) => (
              <View key={block.id} style={styles.sessionAgendaBlock}>
                <View style={styles.sessionAgendaBlockHeader}>
                  <Text style={styles.sessionAgendaBlockLabel}>{block.label}</Text>
                  <Text
                    style={[
                      styles.sessionAgendaIntensity,
                      block.intensity === 'easy' ? styles.sessionAgendaIntensityEasy : null,
                      block.intensity === 'hard' ? styles.sessionAgendaIntensityHard : null,
                    ]}
                  >
                    {block.intensity}
                  </Text>
                </View>
                <Text style={styles.sessionAgendaBlockTitle}>
                  {block.title} · {block.durationMinutes} min
                </Text>
                <Text style={styles.sessionAgendaBlockInstruction}>{block.instruction}</Text>
                <Text style={styles.sessionAgendaBlockEvidence}>{block.evidence}</Text>
              </View>
            ))}
          </View>

          <View style={styles.sessionAgendaPrivacy}>
            <Text style={styles.sessionAgendaPrivacyText}>Raw video included: no</Text>
            <Text style={styles.sessionAgendaPrivacyText}>Private notes included: no</Text>
          </View>

          <View style={styles.sessionAgendaActions}>
            <Pressable accessibilityLabel="Prepare session agenda packet" onPress={prepareAgendaPacket} style={styles.sessionAgendaAction}>
              <Text style={styles.sessionAgendaActionText}>Agenda packet</Text>
            </Pressable>
          </View>
        </View>
      </Section>

      {preparedAgendaPacket ? (
        <Section title={preparedAgendaPacket.title} caption="Share-safe agenda evidence prepared locally.">
          <View style={styles.sessionAgendaPacketBox}>
            <Text selectable style={styles.sessionAgendaPacketText}>{preparedAgendaPacket.body}</Text>
          </View>
        </Section>
      ) : null}

      <Section title="Attempt pacing" caption="A local rest and attempt budget before adding intensity.">
        <View style={styles.attemptPacingCard}>
          <View style={styles.attemptPacingHeader}>
            <View style={styles.attemptPacingCopy}>
              <Text style={styles.attemptPacingKicker}>{attemptPacing.status}</Text>
              <Text style={styles.attemptPacingTitle}>{attemptPacing.title}</Text>
              <Text style={styles.attemptPacingMeta}>
                {attemptPacing.summary.maxTotalAttempts} max attempts · {attemptPacing.summary.maxHardAttempts} hard ·{' '}
                {attemptPacing.summary.restMinutes} min rest
              </Text>
            </View>
            <View
              style={[
                styles.attemptPacingBadge,
                attemptPacing.status === 'reset' ? styles.attemptPacingBadgeLimit : null,
                attemptPacing.status === 'progress' ? styles.attemptPacingBadgeReady : null,
              ]}
            >
              <Text style={styles.attemptPacingBadgeValue}>{attemptPacing.summary.attemptSlots}</Text>
              <Text style={styles.attemptPacingBadgeLabel}>Slots</Text>
            </View>
          </View>

          <View style={styles.attemptPacingNextAction}>
            <Text style={styles.attemptPacingNextActionLabel}>Next action</Text>
            <Text style={styles.attemptPacingNextActionText}>{attemptPacing.nextAction}</Text>
          </View>

          <View style={styles.attemptPacingSteps}>
            {attemptPacing.steps.map((step) => (
              <View key={step.id} style={styles.attemptPacingStep}>
                <View style={styles.attemptPacingStepHeader}>
                  <Text style={styles.attemptPacingStepLabel}>{step.label}</Text>
                  <Text
                    style={[
                      styles.attemptPacingIntensity,
                      step.intensity === 'easy' ? styles.attemptPacingIntensityEasy : null,
                      step.intensity === 'hard' ? styles.attemptPacingIntensityHard : null,
                    ]}
                  >
                    {step.intensity}
                  </Text>
                </View>
                <Text style={styles.attemptPacingStepTitle}>{step.title}</Text>
                <Text style={styles.attemptPacingStepInstruction}>{step.instruction}</Text>
                <Text style={styles.attemptPacingStepEvidence}>{step.evidence}</Text>
                {step.restAfterSeconds > 0 ? (
                  <View style={styles.attemptPacingStepFooter}>
                    <Text style={styles.attemptPacingStepRest}>Rest {Math.round(step.restAfterSeconds / 60)} min</Text>
                    <Pressable
                      accessibilityLabel={`Start rest timer for ${step.title}`}
                      onPress={() => startRestTimer(step.id, step.title, step.restAfterSeconds)}
                      style={styles.attemptPacingTimerButton}
                    >
                      <Text style={styles.attemptPacingTimerButtonText}>Start rest</Text>
                    </Pressable>
                  </View>
                ) : null}
              </View>
            ))}
          </View>

          {activeRestTimer ? (
            <View style={styles.attemptPacingTimerPanel}>
              <View style={styles.attemptPacingTimerCopy}>
                <Text style={styles.attemptPacingTimerLabel}>Rest timer</Text>
                <Text style={styles.attemptPacingTimerStep}>{activeRestTimer.label}</Text>
                <Text style={styles.attemptPacingTimerStatus}>
                  {activeRestTimer.remainingSeconds === 0 ? 'Ready for the next step.' : 'Stay with the current pacing plan.'}
                </Text>
              </View>
              <View style={styles.attemptPacingTimerValueBox}>
                <Text style={styles.attemptPacingTimerValue}>{formatRestTimerClock(activeRestTimer.remainingSeconds)}</Text>
                <Pressable
                  accessibilityLabel="Clear rest timer"
                  onPress={() => {
                    selectionFeedback();
                    setActiveRestTimer(null);
                  }}
                  style={styles.attemptPacingTimerClear}
                >
                  <Text style={styles.attemptPacingTimerClearText}>Clear</Text>
                </Pressable>
              </View>
            </View>
          ) : null}

          <View style={styles.attemptPacingRules}>
            {attemptPacing.stopRules.map((rule) => (
              <View key={rule.id} style={styles.attemptPacingRule}>
                <Text
                  style={[
                    styles.attemptPacingRuleStatus,
                    rule.status === 'limit' ? styles.attemptPacingRuleStatusLimit : null,
                    rule.status === 'ready' ? styles.attemptPacingRuleStatusReady : null,
                  ]}
                >
                  {rule.status}
                </Text>
                <Text style={styles.attemptPacingRuleTitle}>{rule.label}</Text>
                <Text style={styles.attemptPacingRuleDetail}>{rule.detail}</Text>
              </View>
            ))}
          </View>

          <View style={styles.sessionAgendaActions}>
            <Pressable accessibilityLabel="Prepare attempt pacing packet" onPress={preparePacingPacket} style={styles.sessionAgendaAction}>
              <Text style={styles.sessionAgendaActionText}>Pacing packet</Text>
            </Pressable>
          </View>
        </View>
      </Section>

      {preparedPacingPacket ? (
        <Section title={preparedPacingPacket.title} caption="Share-safe pacing evidence prepared locally.">
          <View style={styles.sessionAgendaPacketBox}>
            <Text selectable style={styles.sessionAgendaPacketText}>{preparedPacingPacket.body}</Text>
          </View>
        </Section>
      ) : null}

      <Section title="Session closeout" caption="A local checklist for what to log after the planned repeat.">
        <View style={styles.closeoutCard}>
          <View style={styles.closeoutHeader}>
            <View style={styles.closeoutCopy}>
              <Text style={styles.closeoutKicker}>{sessionCloseout.status}</Text>
              <Text style={styles.closeoutTitle}>{sessionCloseout.title}</Text>
              <Text style={styles.closeoutMeta}>Anchor: {sessionCloseout.anchor}</Text>
            </View>
            <View
              style={[
                styles.closeoutBadge,
                sessionCloseout.status === 'reset-first' ? styles.closeoutBadgeBlocked : null,
                sessionCloseout.status === 'evidence-complete' ? styles.closeoutBadgeReady : null,
              ]}
            >
              <Text style={styles.closeoutBadgeValue}>{sessionCloseout.summary.neededCount}</Text>
              <Text style={styles.closeoutBadgeLabel}>Needed</Text>
            </View>
          </View>

          <View style={styles.closeoutNextAction}>
            <Text style={styles.closeoutNextActionLabel}>Next action</Text>
            <Text style={styles.closeoutNextActionText}>{sessionCloseout.nextAction}</Text>
          </View>

          <View style={styles.closeoutActions}>
            {sessionCloseout.actions.map((action) => (
              <View key={action.id} style={styles.closeoutAction}>
                <View style={styles.closeoutActionHeader}>
                  <Text
                    style={[
                      styles.closeoutActionStatus,
                      action.status === 'blocked' ? styles.closeoutActionStatusBlocked : null,
                      action.status === 'ready' ? styles.closeoutActionStatusReady : null,
                    ]}
                  >
                    {action.status}
                  </Text>
                  <Text style={styles.closeoutActionSurface}>{action.ownerSurface}</Text>
                </View>
                <Text style={styles.closeoutActionTitle}>{action.label}</Text>
                <Text style={styles.closeoutActionDetail}>{action.detail}</Text>
              </View>
            ))}
          </View>

          <View style={styles.closeoutPrivacy}>
            <Text style={styles.closeoutPrivacyText}>Raw video included: no</Text>
            <Text style={styles.closeoutPrivacyText}>Private notes included: no</Text>
            <Text style={styles.closeoutPrivacyText}>Cloud upload required: no</Text>
          </View>
        </View>
      </Section>

      <Section title="Training load" caption="A local load check from private effort, repeat, and drill logs.">
        <View style={styles.trainingLoadCard}>
          <View style={styles.trainingLoadHeader}>
            <View style={styles.trainingLoadCopy}>
              <Text style={styles.trainingLoadKicker}>{trainingLoad.status}</Text>
              <Text style={styles.trainingLoadTitle}>{trainingLoad.title}</Text>
              <Text style={styles.trainingLoadMeta}>
                {trainingLoad.windowDays} days · avg effort {trainingLoad.summary.averageEffort || '-'} ·{' '}
                {trainingLoad.summary.repeatAttemptCount} repeats
              </Text>
            </View>
            <View
              style={[
                styles.trainingLoadScore,
                trainingLoad.status === 'deload' ? styles.trainingLoadScoreLimit : null,
                trainingLoad.status === 'balanced' ? styles.trainingLoadScoreReady : null,
              ]}
            >
              <Text style={styles.trainingLoadScoreValue}>{trainingLoad.trainingLoadScore}</Text>
              <Text style={styles.trainingLoadScoreLabel}>Load</Text>
            </View>
          </View>

          <View style={styles.trainingLoadRecommendation}>
            <Text style={styles.trainingLoadRecommendationLabel}>Recommendation</Text>
            <Text style={styles.trainingLoadRecommendationText}>{trainingLoad.recommendation}</Text>
            <Text style={styles.trainingLoadNextAction}>{trainingLoad.nextAction}</Text>
          </View>

          <View style={styles.trainingLoadStats}>
            <View style={styles.trainingLoadStat}>
              <Text style={styles.trainingLoadStatValue}>{trainingLoad.summary.highEffortSessionCount}</Text>
              <Text style={styles.trainingLoadStatLabel}>High effort</Text>
            </View>
            <View style={styles.trainingLoadStat}>
              <Text style={styles.trainingLoadStatValue}>{trainingLoad.summary.stalledRepeatCount}</Text>
              <Text style={styles.trainingLoadStatLabel}>Stalled</Text>
            </View>
            <View style={styles.trainingLoadStat}>
              <Text style={styles.trainingLoadStatValue}>{trainingLoad.summary.skippedDrillRate}%</Text>
              <Text style={styles.trainingLoadStatLabel}>Skipped</Text>
            </View>
          </View>

          <View style={styles.trainingLoadSignals}>
            {trainingLoad.signals.map((signal) => (
              <View key={signal.id} style={styles.trainingLoadSignal}>
                <Text
                  style={[
                    styles.trainingLoadSignalStatus,
                    signal.status === 'limit' ? styles.trainingLoadSignalStatusLimit : null,
                    signal.status === 'ready' ? styles.trainingLoadSignalStatusReady : null,
                  ]}
                >
                  {signal.status}
                </Text>
                <Text style={styles.trainingLoadSignalTitle}>{signal.label}</Text>
                <Text style={styles.trainingLoadSignalDetail}>{signal.detail}</Text>
              </View>
            ))}
          </View>
        </View>
      </Section>

      <Section
        title="Pre-send guard"
        caption="A local hard-try check from signal quality, open cues, practice follow-through, and repeat outcomes."
      >
        <View
          style={[
            styles.preSendGuardCard,
            preSendGuard.status === 'reset-first' ? styles.preSendGuardCardReset : null,
            preSendGuard.status === 'hard-try-window' ? styles.preSendGuardCardReady : null,
          ]}
        >
          <View style={styles.preSendGuardTop}>
            <View style={styles.preSendGuardScoreBox}>
              <Text style={styles.preSendGuardScore}>{preSendGuard.score}</Text>
              <Text style={styles.preSendGuardScoreLabel}>Guard</Text>
            </View>
            <View style={styles.preSendGuardCopy}>
              <View style={styles.preSendGuardTitleRow}>
                <Text style={styles.preSendGuardTitle}>{preSendGuard.headline}</Text>
                <Text
                  style={[
                    styles.preSendGuardBadge,
                    preSendGuard.status === 'reset-first' ? styles.preSendGuardBadgeReset : null,
                    preSendGuard.status === 'hard-try-window' ? styles.preSendGuardBadgeReady : null,
                  ]}
                >
                  {preSendGuard.status}
                </Text>
              </View>
              <Text style={styles.preSendGuardMeta}>Load cap: {preSendGuard.loadCap}</Text>
            </View>
          </View>

          <View style={styles.preSendGuardAction}>
            <Text style={styles.preSendGuardActionLabel}>Action</Text>
            <Text style={styles.preSendGuardActionText}>{preSendGuard.action}</Text>
          </View>

          <View style={styles.preSendGuardSignals}>
            {preSendGuard.signals.map((signal) => (
              <View
                key={signal.id}
                style={[
                  styles.preSendGuardSignal,
                  signal.severity === 'blocker' ? styles.preSendGuardSignalBlocker : null,
                  signal.severity === 'support' ? styles.preSendGuardSignalSupport : null,
                ]}
              >
                <Text
                  style={[
                    styles.preSendGuardSignalSeverity,
                    signal.severity === 'blocker' ? styles.preSendGuardSignalSeverityBlocker : null,
                    signal.severity === 'support' ? styles.preSendGuardSignalSeveritySupport : null,
                  ]}
                >
                  {signal.severity}
                </Text>
                <Text style={styles.preSendGuardSignalLabel}>{signal.label}</Text>
                <Text style={styles.preSendGuardSignalEvidence}>{signal.evidence}</Text>
              </View>
            ))}
          </View>
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

      <Section title="Cue patterns" caption="Recurring coach cues across local reports after the active filters.">
        {cuePatterns.patterns.length > 0 ? (
          <View style={styles.cuePatternCard}>
            <View style={styles.cuePatternSummary}>
              <View style={styles.cuePatternStat}>
                <Text style={styles.cuePatternStatValue}>{cuePatterns.latestCueCount}</Text>
                <Text style={styles.cuePatternStatLabel}>Latest cues</Text>
              </View>
              <View style={styles.cuePatternStat}>
                <Text style={styles.cuePatternStatValue}>{cuePatterns.patternCount}</Text>
                <Text style={styles.cuePatternStatLabel}>Patterns</Text>
              </View>
              <View style={styles.cuePatternStat}>
                <Text style={styles.cuePatternStatValue}>{cuePatterns.resolvedCount}</Text>
                <Text style={styles.cuePatternStatLabel}>Cleared</Text>
              </View>
            </View>

            <View style={styles.cuePatternList}>
              {cuePatterns.patterns.map((pattern) => (
                <View key={pattern.cueId} style={styles.cuePatternItem}>
                  <View style={styles.cuePatternHeader}>
                    <Text style={styles.cuePatternTitle}>{pattern.title}</Text>
                    <Text
                      style={[
                        styles.cuePatternBadge,
                        pattern.status === 'cleared' ? styles.cuePatternBadgeCleared : null,
                        pattern.status === 'persistent' ? styles.cuePatternBadgePersistent : null,
                      ]}
                    >
                      {pattern.status}
                    </Text>
                  </View>
                  <Text style={styles.cuePatternMeta}>
                    {pattern.reportCount} report{pattern.reportCount === 1 ? '' : 's'} · {pattern.severity} · latest{' '}
                    {pattern.latestReportTitle}
                  </Text>
                  <Text style={styles.cuePatternDrill}>{pattern.drill}</Text>
                </View>
              ))}
            </View>
          </View>
        ) : (
          <View style={styles.preview}>
            <Text style={styles.previewTitle}>No cue pattern yet</Text>
            <Text style={styles.previewText}>Run analyses with coach cues to reveal recurring or cleared patterns.</Text>
          </View>
        )}
      </Section>

      <Section title="Cue usefulness" caption="Private feedback on which local coach cues are actually helping.">
        {cueFeedbackInsights.feedbackCount > 0 ? (
          <View style={styles.cueUsefulnessCard}>
            <View style={styles.cueUsefulnessSummary}>
              <View style={styles.cueUsefulnessScore}>
                <Text style={styles.cueUsefulnessScoreValue}>{cueFeedbackInsights.usefulnessRate}%</Text>
                <Text style={styles.cueUsefulnessScoreLabel}>Useful rate</Text>
              </View>
              <View style={styles.cueUsefulnessCounts}>
                <Text style={styles.cueUsefulnessCountText}>Useful {cueFeedbackInsights.usefulCount}</Text>
                <Text style={styles.cueUsefulnessCountText}>Unclear {cueFeedbackInsights.unclearCount}</Text>
                <Text style={styles.cueUsefulnessCountText}>Not useful {cueFeedbackInsights.notUsefulCount}</Text>
              </View>
            </View>

            <View style={styles.cueUsefulnessGrid}>
              {cueFeedbackInsights.topUsefulCue ? (
                <View style={styles.cueUsefulnessItem}>
                  <Text style={styles.cueUsefulnessItemLabel}>Keep</Text>
                  <Text style={styles.cueUsefulnessItemTitle}>{cueFeedbackInsights.topUsefulCue.title}</Text>
                  <Text style={styles.cueUsefulnessItemMeta}>
                    {cueFeedbackInsights.topUsefulCue.usefulCount}/{cueFeedbackInsights.topUsefulCue.total} useful · latest{' '}
                    {cueFeedbackInsights.topUsefulCue.latestRating}
                  </Text>
                </View>
              ) : null}

              {cueFeedbackInsights.reviewCue ? (
                <View style={styles.cueUsefulnessItem}>
                  <Text style={styles.cueUsefulnessItemLabel}>Review</Text>
                  <Text style={styles.cueUsefulnessItemTitle}>{cueFeedbackInsights.reviewCue.title}</Text>
                  <Text style={styles.cueUsefulnessItemMeta}>
                    {cueFeedbackInsights.reviewCue.unclearCount + cueFeedbackInsights.reviewCue.notUsefulCount} review signal
                    {cueFeedbackInsights.reviewCue.unclearCount + cueFeedbackInsights.reviewCue.notUsefulCount === 1 ? '' : 's'}
                  </Text>
                </View>
              ) : null}
            </View>
          </View>
        ) : (
          <View style={styles.preview}>
            <Text style={styles.previewTitle}>No cue feedback yet</Text>
            <Text style={styles.previewText}>Mark cues as useful, unclear, or not useful in Sessions to tune future repeats.</Text>
          </View>
        )}
      </Section>

      <Section title="Repeat outcomes" caption="Private repeat results from Sessions after applying the beta plan.">
        {repeatOutcomeInsights.totalLogged > 0 ? (
          <View style={styles.repeatOutcomeCard}>
            <View style={styles.repeatOutcomeSummary}>
              <View
                style={[
                  styles.repeatOutcomeScore,
                  repeatOutcomeInsights.status === 'stalled' ? styles.repeatOutcomeScoreBlocked : null,
                  repeatOutcomeInsights.status === 'progressing' ? styles.repeatOutcomeScoreReady : null,
                ]}
              >
                <Text style={styles.repeatOutcomeScoreValue}>{repeatOutcomeInsights.successRate}%</Text>
                <Text style={styles.repeatOutcomeScoreLabel}>Success</Text>
              </View>
              <View style={styles.repeatOutcomeCounts}>
                <Text style={styles.repeatOutcomeCountText}>Improved {repeatOutcomeInsights.improvedCount}</Text>
                <Text style={styles.repeatOutcomeCountText}>Sent {repeatOutcomeInsights.sentCount}</Text>
                <Text style={styles.repeatOutcomeCountText}>Stalled {repeatOutcomeInsights.stalledCount}</Text>
              </View>
            </View>

            <Text style={styles.repeatOutcomeAction}>{repeatOutcomeInsights.action}</Text>

            <View style={styles.repeatOutcomeGrid}>
              {repeatOutcomeInsights.latest ? (
                <View style={styles.repeatOutcomeItem}>
                  <Text style={styles.repeatOutcomeItemLabel}>Latest</Text>
                  <Text style={styles.repeatOutcomeItemTitle}>{repeatOutcomeInsights.latest.title}</Text>
                  <Text style={styles.repeatOutcomeItemMeta}>
                    {repeatOutcomeInsights.latest.status} · {repeatOutcomeInsights.latest.attempts} repeat attempts
                  </Text>
                </View>
              ) : null}

              <View style={styles.repeatOutcomeItem}>
                <Text style={styles.repeatOutcomeItemLabel}>Resolved</Text>
                <Text style={styles.repeatOutcomeItemTitle}>{repeatOutcomeInsights.resolvedCueCount} cues</Text>
                <Text style={styles.repeatOutcomeItemMeta}>{repeatOutcomeInsights.attemptedCount} attempted repeats logged</Text>
              </View>
            </View>
          </View>
        ) : (
          <View style={styles.preview}>
            <Text style={styles.previewTitle}>No repeat outcome yet</Text>
            <Text style={styles.previewText}>Mark the repeat result in Sessions after trying the beta plan.</Text>
          </View>
        )}
      </Section>

      <Section title="Beta memory" caption="Successful local repeats converted into reusable beta cues without exposing private notes.">
        {betaMemory.totalSuccessful > 0 ? (
          <View style={styles.betaMemoryCard}>
            <View style={styles.betaMemorySummary}>
              <View style={styles.betaMemoryScore}>
                <Text style={styles.betaMemoryScoreValue}>{betaMemory.totalSuccessful}</Text>
                <Text style={styles.betaMemoryScoreLabel}>Stored</Text>
              </View>
              <View style={styles.betaMemoryCounts}>
                <Text style={styles.betaMemoryCountText}>Improved {betaMemory.improvedCount}</Text>
                <Text style={styles.betaMemoryCountText}>Sent {betaMemory.sentCount}</Text>
                <Text style={styles.betaMemoryCountText}>Status {betaMemory.status}</Text>
              </View>
            </View>

            <View style={styles.betaMemoryPattern}>
              <Text style={styles.betaMemoryPatternLabel}>Pattern</Text>
              <Text style={styles.betaMemoryPatternText}>{betaMemory.topPattern}</Text>
            </View>

            <Text style={styles.betaMemoryRecommendation}>{betaMemory.recommendation}</Text>

            <View style={styles.betaMemoryGrid}>
              {betaMemory.entries.map((entry) => (
                <View key={`${entry.reportId}-${entry.updatedAt}`} style={styles.betaMemoryItem}>
                  <View style={styles.betaMemoryItemHeader}>
                    <Text style={styles.betaMemoryItemLabel}>{entry.status}</Text>
                    <Text style={styles.betaMemoryItemAttempts}>{entry.attempts}x</Text>
                  </View>
                  <Text style={styles.betaMemoryItemTitle}>{entry.title}</Text>
                  <Text style={styles.betaMemoryItemMeta}>
                    {entry.wallAngle} · {entry.grade} · {entry.gym}
                  </Text>
                  <Text style={styles.betaMemoryItemEvidence}>{entry.evidence}</Text>
                  {entry.cueTitles.length > 0 ? (
                    <Text style={styles.betaMemoryItemCue}>Resolved: {entry.cueTitles.join(', ')}</Text>
                  ) : null}
                </View>
              ))}
            </View>
          </View>
        ) : (
          <View style={styles.preview}>
            <Text style={styles.previewTitle}>{betaMemory.status === 'building' ? 'Beta memory building' : 'No beta memory yet'}</Text>
            <Text style={styles.previewText}>{betaMemory.recommendation}</Text>
          </View>
        )}
      </Section>

      <Section title="Practice consistency" caption="Private drill completion history from the Drills tab.">
        {drillPracticeInsights.totalCount > 0 ? (
          <View style={styles.practiceConsistencyCard}>
            <View style={styles.practiceConsistencySummary}>
              <View
                style={[
                  styles.practiceConsistencyScore,
                  drillPracticeInsights.status === 'blocked' ? styles.practiceConsistencyScoreBlocked : null,
                  drillPracticeInsights.status === 'consistent' ? styles.practiceConsistencyScoreReady : null,
                ]}
              >
                <Text style={styles.practiceConsistencyScoreValue}>{drillPracticeInsights.completionRate}%</Text>
                <Text style={styles.practiceConsistencyScoreLabel}>Completion</Text>
              </View>
              <View style={styles.practiceConsistencyCounts}>
                <Text style={styles.practiceConsistencyCountText}>Done {drillPracticeInsights.completedCount}</Text>
                <Text style={styles.practiceConsistencyCountText}>Skipped {drillPracticeInsights.skippedCount}</Text>
                <Text style={styles.practiceConsistencyCountText}>Status {drillPracticeInsights.status}</Text>
              </View>
            </View>

            <Text style={styles.practiceConsistencyRecommendation}>{drillPracticeInsights.recommendation}</Text>

            <View style={styles.practiceConsistencyGrid}>
              {drillPracticeInsights.latest ? (
                <View style={styles.practiceConsistencyItem}>
                  <Text style={styles.practiceConsistencyItemLabel}>Latest</Text>
                  <Text style={styles.practiceConsistencyItemTitle}>{drillPracticeInsights.latest.title}</Text>
                  <Text style={styles.practiceConsistencyItemMeta}>
                    {drillPracticeInsights.latest.latestStatus} · {drillPracticeInsights.latest.latestReportTitle}
                  </Text>
                </View>
              ) : null}

              {drillPracticeInsights.skippedCue ? (
                <View style={styles.practiceConsistencyItem}>
                  <Text style={styles.practiceConsistencyItemLabel}>Review</Text>
                  <Text style={styles.practiceConsistencyItemTitle}>{drillPracticeInsights.skippedCue.title}</Text>
                  <Text style={styles.practiceConsistencyItemMeta}>
                    {drillPracticeInsights.skippedCue.skippedCount}/{drillPracticeInsights.skippedCue.total} skipped
                  </Text>
                </View>
              ) : null}
            </View>
          </View>
        ) : (
          <View style={styles.preview}>
            <Text style={styles.previewTitle}>No practice log yet</Text>
            <Text style={styles.previewText}>Mark a suggested drill as Done or Skip in Drills to measure follow-through.</Text>
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
            <Text style={styles.comparisonMatch}>
              Smart baseline: {comparison.baselineMatch.confidence} · {comparison.baselineMatch.score}/100
              {comparison.baselineMatch.reasons.length > 0
                ? ` · ${comparison.baselineMatch.reasons.slice(0, 2).map((reason) => reason.label).join(', ')}`
                : ''}
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
  analysisTrustTrendAction: {
    backgroundColor: theme.colors.surfaceAlt,
    borderRadius: theme.radius.sm,
    gap: 4,
    padding: theme.spacing.sm,
  },
  analysisTrustTrendActionLabel: {
    color: theme.colors.muted,
    fontSize: 10,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  analysisTrustTrendActionText: {
    color: theme.colors.text,
    fontSize: 13,
    fontWeight: '800',
    lineHeight: 18,
  },
  analysisTrustTrendCard: {
    backgroundColor: theme.colors.surface,
    borderColor: theme.colors.line,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    gap: theme.spacing.md,
    padding: theme.spacing.md,
  },
  analysisTrustTrendCopy: {
    flex: 1,
    gap: 4,
  },
  analysisTrustTrendHeader: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: theme.spacing.sm,
    justifyContent: 'space-between',
  },
  analysisTrustTrendKicker: {
    color: theme.colors.brand,
    fontSize: 11,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  analysisTrustTrendLatest: {
    borderColor: theme.colors.line,
    borderRadius: theme.radius.sm,
    borderWidth: 1,
    gap: 4,
    padding: theme.spacing.sm,
  },
  analysisTrustTrendLatestLabel: {
    color: theme.colors.muted,
    fontSize: 10,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  analysisTrustTrendLatestMeta: {
    color: theme.colors.muted,
    fontSize: 12,
    fontWeight: '800',
    lineHeight: 16,
  },
  analysisTrustTrendLatestValue: {
    color: theme.colors.ink,
    fontSize: 16,
    fontWeight: '900',
  },
  analysisTrustTrendMeta: {
    color: theme.colors.muted,
    fontSize: 12,
    fontWeight: '800',
    lineHeight: 17,
  },
  analysisTrustTrendPrivacy: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.sm,
  },
  analysisTrustTrendPrivacyText: {
    backgroundColor: theme.colors.brandSoft,
    borderRadius: theme.radius.sm,
    color: theme.colors.brand,
    fontSize: 11,
    fontWeight: '900',
    overflow: 'hidden',
    paddingHorizontal: 8,
    paddingVertical: 6,
  },
  analysisTrustTrendScore: {
    backgroundColor: theme.colors.brandSoft,
    borderRadius: theme.radius.sm,
    minWidth: 72,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: theme.spacing.sm,
  },
  analysisTrustTrendScoreLabel: {
    color: theme.colors.brand,
    fontSize: 10,
    fontWeight: '900',
    textAlign: 'center',
    textTransform: 'uppercase',
  },
  analysisTrustTrendScoreLimit: {
    backgroundColor: '#FFF0EC',
  },
  analysisTrustTrendScoreReady: {
    backgroundColor: '#E8F4EE',
  },
  analysisTrustTrendScoreValue: {
    color: theme.colors.ink,
    fontSize: 20,
    fontWeight: '900',
    textAlign: 'center',
  },
  analysisTrustTrendStat: {
    backgroundColor: theme.colors.surfaceAlt,
    borderRadius: theme.radius.sm,
    flex: 1,
    gap: 2,
    minWidth: 96,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: theme.spacing.sm,
  },
  analysisTrustTrendStatLabel: {
    color: theme.colors.muted,
    fontSize: 10,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  analysisTrustTrendStats: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.sm,
  },
  analysisTrustTrendStatValue: {
    color: theme.colors.ink,
    fontSize: 18,
    fontWeight: '900',
  },
  analysisTrustTrendTitle: {
    color: theme.colors.ink,
    fontSize: 17,
    fontWeight: '900',
    lineHeight: 21,
  },
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
  comparisonMatch: {
    color: theme.colors.brand,
    fontSize: 12,
    fontWeight: '900',
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
  cuePatternBadge: {
    backgroundColor: theme.colors.brandSoft,
    borderRadius: theme.radius.sm,
    color: theme.colors.brand,
    fontSize: 10,
    fontWeight: '900',
    overflow: 'hidden',
    paddingHorizontal: 8,
    paddingVertical: 5,
    textTransform: 'uppercase',
  },
  cuePatternBadgeCleared: {
    backgroundColor: '#E8F4EE',
    color: theme.colors.success,
  },
  cuePatternBadgePersistent: {
    backgroundColor: '#FFF0EC',
    color: theme.colors.coral,
  },
  cuePatternCard: {
    backgroundColor: theme.colors.surface,
    borderColor: theme.colors.line,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    gap: theme.spacing.md,
    padding: theme.spacing.md,
  },
  cuePatternDrill: {
    color: theme.colors.text,
    fontSize: 12,
    lineHeight: 17,
  },
  cuePatternHeader: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: theme.spacing.sm,
    justifyContent: 'space-between',
  },
  cuePatternItem: {
    backgroundColor: theme.colors.surfaceAlt,
    borderRadius: theme.radius.sm,
    gap: 5,
    padding: theme.spacing.sm,
  },
  cuePatternList: {
    gap: theme.spacing.sm,
  },
  cuePatternMeta: {
    color: theme.colors.muted,
    fontSize: 11,
    fontWeight: '800',
    lineHeight: 15,
  },
  cuePatternStat: {
    backgroundColor: theme.colors.surfaceAlt,
    borderRadius: theme.radius.sm,
    flex: 1,
    gap: 2,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: theme.spacing.sm,
  },
  cuePatternStatLabel: {
    color: theme.colors.muted,
    fontSize: 10,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  cuePatternStatValue: {
    color: theme.colors.ink,
    fontSize: 18,
    fontWeight: '900',
  },
  cuePatternSummary: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
  },
  cuePatternTitle: {
    color: theme.colors.ink,
    flex: 1,
    fontSize: 14,
    fontWeight: '900',
    lineHeight: 18,
  },
  cueUsefulnessCard: {
    backgroundColor: theme.colors.surface,
    borderColor: theme.colors.line,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    gap: theme.spacing.md,
    padding: theme.spacing.md,
  },
  cueUsefulnessCountText: {
    color: theme.colors.text,
    fontSize: 12,
    fontWeight: '900',
    lineHeight: 17,
  },
  cueUsefulnessCounts: {
    backgroundColor: theme.colors.surfaceAlt,
    borderRadius: theme.radius.sm,
    flex: 1,
    gap: 3,
    padding: theme.spacing.sm,
  },
  cueUsefulnessGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.sm,
  },
  cueUsefulnessItem: {
    backgroundColor: theme.colors.surfaceAlt,
    borderRadius: theme.radius.sm,
    flex: 1,
    gap: 4,
    minWidth: 146,
    padding: theme.spacing.sm,
  },
  cueUsefulnessItemLabel: {
    color: theme.colors.muted,
    fontSize: 10,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  cueUsefulnessItemMeta: {
    color: theme.colors.muted,
    fontSize: 11,
    fontWeight: '800',
    lineHeight: 15,
  },
  cueUsefulnessItemTitle: {
    color: theme.colors.ink,
    fontSize: 14,
    fontWeight: '900',
    lineHeight: 18,
  },
  cueUsefulnessScore: {
    alignItems: 'center',
    backgroundColor: theme.colors.moss,
    borderRadius: theme.radius.md,
    minWidth: 96,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: theme.spacing.sm,
  },
  cueUsefulnessScoreLabel: {
    color: '#F4FFF8',
    fontSize: 10,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  cueUsefulnessScoreValue: {
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: '900',
  },
  cueUsefulnessSummary: {
    alignItems: 'stretch',
    flexDirection: 'row',
    gap: theme.spacing.sm,
  },
  betaMemoryCard: {
    backgroundColor: theme.colors.surface,
    borderColor: theme.colors.line,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    gap: theme.spacing.md,
    padding: theme.spacing.md,
  },
  betaMemoryCountText: {
    color: theme.colors.text,
    fontSize: 12,
    fontWeight: '900',
    lineHeight: 17,
  },
  betaMemoryCounts: {
    backgroundColor: theme.colors.surfaceAlt,
    borderRadius: theme.radius.sm,
    flex: 1,
    gap: 3,
    padding: theme.spacing.sm,
  },
  betaMemoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.sm,
  },
  betaMemoryItem: {
    backgroundColor: theme.colors.surfaceAlt,
    borderRadius: theme.radius.sm,
    flex: 1,
    gap: 4,
    minWidth: 156,
    padding: theme.spacing.sm,
  },
  betaMemoryItemAttempts: {
    color: theme.colors.brand,
    fontSize: 11,
    fontWeight: '900',
  },
  betaMemoryItemCue: {
    color: theme.colors.success,
    fontSize: 11,
    fontWeight: '900',
    lineHeight: 15,
  },
  betaMemoryItemEvidence: {
    color: theme.colors.muted,
    fontSize: 11,
    fontWeight: '800',
    lineHeight: 15,
  },
  betaMemoryItemHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  betaMemoryItemLabel: {
    color: theme.colors.brand,
    fontSize: 10,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  betaMemoryItemMeta: {
    color: theme.colors.muted,
    fontSize: 11,
    fontWeight: '800',
    lineHeight: 15,
  },
  betaMemoryItemTitle: {
    color: theme.colors.ink,
    fontSize: 14,
    fontWeight: '900',
    lineHeight: 18,
  },
  betaMemoryPattern: {
    backgroundColor: theme.colors.brandSoft,
    borderRadius: theme.radius.sm,
    gap: 3,
    padding: theme.spacing.sm,
  },
  betaMemoryPatternLabel: {
    color: theme.colors.brand,
    fontSize: 10,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  betaMemoryPatternText: {
    color: theme.colors.brandDark,
    fontSize: 13,
    fontWeight: '900',
    lineHeight: 18,
  },
  betaMemoryRecommendation: {
    color: theme.colors.text,
    fontSize: 13,
    fontWeight: '800',
    lineHeight: 18,
  },
  betaMemoryScore: {
    alignItems: 'center',
    backgroundColor: theme.colors.moss,
    borderRadius: theme.radius.md,
    minWidth: 104,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: theme.spacing.sm,
  },
  betaMemoryScoreLabel: {
    color: '#F4FFF8',
    fontSize: 10,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  betaMemoryScoreValue: {
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: '900',
  },
  betaMemorySummary: {
    alignItems: 'stretch',
    flexDirection: 'row',
    gap: theme.spacing.sm,
  },
  repeatOutcomeAction: {
    color: theme.colors.text,
    fontSize: 13,
    fontWeight: '800',
    lineHeight: 18,
  },
  repeatOutcomeCard: {
    backgroundColor: theme.colors.surface,
    borderColor: theme.colors.line,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    gap: theme.spacing.md,
    padding: theme.spacing.md,
  },
  repeatOutcomeCountText: {
    color: theme.colors.text,
    fontSize: 12,
    fontWeight: '900',
    lineHeight: 17,
  },
  repeatOutcomeCounts: {
    backgroundColor: theme.colors.surfaceAlt,
    borderRadius: theme.radius.sm,
    flex: 1,
    gap: 3,
    padding: theme.spacing.sm,
  },
  repeatOutcomeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.sm,
  },
  repeatOutcomeItem: {
    backgroundColor: theme.colors.surfaceAlt,
    borderRadius: theme.radius.sm,
    flex: 1,
    gap: 4,
    minWidth: 146,
    padding: theme.spacing.sm,
  },
  repeatOutcomeItemLabel: {
    color: theme.colors.muted,
    fontSize: 10,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  repeatOutcomeItemMeta: {
    color: theme.colors.muted,
    fontSize: 11,
    fontWeight: '800',
    lineHeight: 15,
  },
  repeatOutcomeItemTitle: {
    color: theme.colors.ink,
    fontSize: 14,
    fontWeight: '900',
    lineHeight: 18,
  },
  repeatOutcomeScore: {
    alignItems: 'center',
    backgroundColor: theme.colors.brand,
    borderRadius: theme.radius.md,
    minWidth: 104,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: theme.spacing.sm,
  },
  repeatOutcomeScoreBlocked: {
    backgroundColor: theme.colors.coral,
  },
  repeatOutcomeScoreLabel: {
    color: '#F4FFF8',
    fontSize: 10,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  repeatOutcomeScoreReady: {
    backgroundColor: theme.colors.success,
  },
  repeatOutcomeScoreValue: {
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: '900',
  },
  repeatOutcomeSummary: {
    alignItems: 'stretch',
    flexDirection: 'row',
    gap: theme.spacing.sm,
  },
  practiceConsistencyCard: {
    backgroundColor: theme.colors.surface,
    borderColor: theme.colors.line,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    gap: theme.spacing.md,
    padding: theme.spacing.md,
  },
  practiceConsistencyCountText: {
    color: theme.colors.text,
    fontSize: 12,
    fontWeight: '900',
    lineHeight: 17,
  },
  practiceConsistencyCounts: {
    backgroundColor: theme.colors.surfaceAlt,
    borderRadius: theme.radius.sm,
    flex: 1,
    gap: 3,
    padding: theme.spacing.sm,
  },
  practiceConsistencyGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.sm,
  },
  practiceConsistencyItem: {
    backgroundColor: theme.colors.surfaceAlt,
    borderRadius: theme.radius.sm,
    flex: 1,
    gap: 4,
    minWidth: 146,
    padding: theme.spacing.sm,
  },
  practiceConsistencyItemLabel: {
    color: theme.colors.muted,
    fontSize: 10,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  practiceConsistencyItemMeta: {
    color: theme.colors.muted,
    fontSize: 11,
    fontWeight: '800',
    lineHeight: 15,
  },
  practiceConsistencyItemTitle: {
    color: theme.colors.ink,
    fontSize: 14,
    fontWeight: '900',
    lineHeight: 18,
  },
  practiceConsistencyRecommendation: {
    color: theme.colors.text,
    fontSize: 13,
    fontWeight: '800',
    lineHeight: 18,
  },
  practiceConsistencyScore: {
    alignItems: 'center',
    backgroundColor: theme.colors.brand,
    borderRadius: theme.radius.md,
    minWidth: 104,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: theme.spacing.sm,
  },
  practiceConsistencyScoreBlocked: {
    backgroundColor: theme.colors.coral,
  },
  practiceConsistencyScoreLabel: {
    color: '#F4FFF8',
    fontSize: 10,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  practiceConsistencyScoreReady: {
    backgroundColor: theme.colors.success,
  },
  practiceConsistencyScoreValue: {
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: '900',
  },
  practiceConsistencySummary: {
    alignItems: 'stretch',
    flexDirection: 'row',
    gap: theme.spacing.sm,
  },
  attemptPacingBadge: {
    alignItems: 'center',
    backgroundColor: theme.colors.brand,
    borderRadius: theme.radius.md,
    minWidth: 84,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: theme.spacing.sm,
  },
  attemptPacingBadgeLabel: {
    color: '#F4FFF8',
    fontSize: 10,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  attemptPacingBadgeLimit: {
    backgroundColor: theme.colors.coral,
  },
  attemptPacingBadgeReady: {
    backgroundColor: theme.colors.success,
  },
  attemptPacingBadgeValue: {
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: '900',
  },
  attemptPacingCard: {
    backgroundColor: theme.colors.surface,
    borderColor: theme.colors.line,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    gap: theme.spacing.md,
    padding: theme.spacing.md,
  },
  attemptPacingCopy: {
    flex: 1,
    gap: 4,
  },
  attemptPacingHeader: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.md,
    justifyContent: 'space-between',
  },
  attemptPacingIntensity: {
    backgroundColor: theme.colors.brandSoft,
    borderRadius: theme.radius.sm,
    color: theme.colors.brand,
    fontSize: 10,
    fontWeight: '900',
    overflow: 'hidden',
    paddingHorizontal: 7,
    paddingVertical: 4,
    textTransform: 'uppercase',
  },
  attemptPacingIntensityEasy: {
    backgroundColor: '#E8F4EE',
    color: theme.colors.success,
  },
  attemptPacingIntensityHard: {
    backgroundColor: '#FFF0EC',
    color: theme.colors.coral,
  },
  attemptPacingKicker: {
    color: theme.colors.muted,
    fontSize: 11,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  attemptPacingMeta: {
    color: theme.colors.muted,
    fontSize: 12,
    fontWeight: '800',
    lineHeight: 17,
  },
  attemptPacingNextAction: {
    backgroundColor: theme.colors.brandSoft,
    borderRadius: theme.radius.sm,
    gap: 3,
    padding: theme.spacing.sm,
  },
  attemptPacingNextActionLabel: {
    color: theme.colors.brand,
    fontSize: 10,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  attemptPacingNextActionText: {
    color: theme.colors.brandDark,
    fontSize: 13,
    fontWeight: '900',
    lineHeight: 18,
  },
  attemptPacingRule: {
    backgroundColor: theme.colors.surfaceAlt,
    borderRadius: theme.radius.sm,
    flex: 1,
    gap: 4,
    minWidth: 158,
    padding: theme.spacing.sm,
  },
  attemptPacingRuleDetail: {
    color: theme.colors.muted,
    fontSize: 11,
    fontWeight: '800',
    lineHeight: 15,
  },
  attemptPacingRules: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.sm,
  },
  attemptPacingRuleStatus: {
    color: theme.colors.amber,
    fontSize: 10,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  attemptPacingRuleStatusLimit: {
    color: theme.colors.coral,
  },
  attemptPacingRuleStatusReady: {
    color: theme.colors.success,
  },
  attemptPacingRuleTitle: {
    color: theme.colors.ink,
    fontSize: 13,
    fontWeight: '900',
    lineHeight: 17,
  },
  attemptPacingStep: {
    backgroundColor: theme.colors.surfaceAlt,
    borderRadius: theme.radius.sm,
    flex: 1,
    gap: 4,
    minWidth: 178,
    padding: theme.spacing.sm,
  },
  attemptPacingStepEvidence: {
    color: theme.colors.muted,
    fontSize: 11,
    fontWeight: '800',
    lineHeight: 15,
  },
  attemptPacingStepHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: theme.spacing.xs,
    justifyContent: 'space-between',
  },
  attemptPacingStepInstruction: {
    color: theme.colors.text,
    fontSize: 12,
    lineHeight: 17,
  },
  attemptPacingStepLabel: {
    color: theme.colors.muted,
    fontSize: 10,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  attemptPacingSteps: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.sm,
  },
  attemptPacingStepFooter: {
    alignItems: 'center',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.xs,
    justifyContent: 'space-between',
  },
  attemptPacingStepRest: {
    color: theme.colors.muted,
    fontSize: 11,
    fontWeight: '900',
  },
  attemptPacingStepTitle: {
    color: theme.colors.ink,
    fontSize: 14,
    fontWeight: '900',
    lineHeight: 18,
  },
  attemptPacingTimerButton: {
    backgroundColor: theme.colors.ink,
    borderRadius: theme.radius.sm,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 6,
  },
  attemptPacingTimerButtonText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '900',
  },
  attemptPacingTimerClear: {
    alignSelf: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: theme.radius.sm,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 6,
  },
  attemptPacingTimerClearText: {
    color: theme.colors.brand,
    fontSize: 11,
    fontWeight: '900',
  },
  attemptPacingTimerCopy: {
    flex: 1,
    gap: 3,
  },
  attemptPacingTimerLabel: {
    color: theme.colors.brand,
    fontSize: 10,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  attemptPacingTimerPanel: {
    alignItems: 'center',
    backgroundColor: theme.colors.brandSoft,
    borderRadius: theme.radius.md,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.md,
    justifyContent: 'space-between',
    padding: theme.spacing.md,
  },
  attemptPacingTimerStatus: {
    color: theme.colors.brandDark,
    fontSize: 12,
    fontWeight: '800',
    lineHeight: 16,
  },
  attemptPacingTimerStep: {
    color: theme.colors.ink,
    fontSize: 15,
    fontWeight: '900',
    lineHeight: 19,
  },
  attemptPacingTimerValue: {
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: '900',
  },
  attemptPacingTimerValueBox: {
    alignItems: 'center',
    backgroundColor: theme.colors.brand,
    borderRadius: theme.radius.md,
    gap: 6,
    minWidth: 92,
    padding: theme.spacing.sm,
  },
  attemptPacingTitle: {
    color: theme.colors.ink,
    fontSize: 18,
    fontWeight: '900',
    lineHeight: 22,
  },
  sessionAgendaBadge: {
    alignItems: 'center',
    backgroundColor: theme.colors.brand,
    borderRadius: theme.radius.md,
    minWidth: 84,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: theme.spacing.sm,
  },
  sessionAgendaBadgeLabel: {
    color: '#F4FFF8',
    fontSize: 10,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  sessionAgendaBadgeLimit: {
    backgroundColor: theme.colors.coral,
  },
  sessionAgendaBadgeReady: {
    backgroundColor: theme.colors.success,
  },
  sessionAgendaBadgeValue: {
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: '900',
  },
  sessionAgendaAction: {
    alignSelf: 'flex-start',
    backgroundColor: theme.colors.ink,
    borderRadius: theme.radius.sm,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
  },
  sessionAgendaActions: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.sm,
  },
  sessionAgendaActionText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '900',
  },
  sessionAgendaBlock: {
    backgroundColor: theme.colors.surfaceAlt,
    borderRadius: theme.radius.sm,
    flex: 1,
    gap: 4,
    minWidth: 178,
    padding: theme.spacing.sm,
  },
  sessionAgendaBlockEvidence: {
    color: theme.colors.muted,
    fontSize: 11,
    fontWeight: '800',
    lineHeight: 15,
  },
  sessionAgendaBlockHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: theme.spacing.xs,
    justifyContent: 'space-between',
  },
  sessionAgendaBlockInstruction: {
    color: theme.colors.text,
    fontSize: 12,
    lineHeight: 17,
  },
  sessionAgendaBlockLabel: {
    color: theme.colors.muted,
    fontSize: 10,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  sessionAgendaBlocks: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.sm,
  },
  sessionAgendaBlockTitle: {
    color: theme.colors.ink,
    fontSize: 14,
    fontWeight: '900',
    lineHeight: 18,
  },
  sessionAgendaCard: {
    backgroundColor: theme.colors.surface,
    borderColor: theme.colors.line,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    gap: theme.spacing.md,
    padding: theme.spacing.md,
  },
  sessionAgendaCopy: {
    flex: 1,
    gap: 4,
  },
  sessionAgendaHeader: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.md,
    justifyContent: 'space-between',
  },
  sessionAgendaIntensity: {
    backgroundColor: theme.colors.brandSoft,
    borderRadius: theme.radius.sm,
    color: theme.colors.brand,
    fontSize: 10,
    fontWeight: '900',
    overflow: 'hidden',
    paddingHorizontal: 7,
    paddingVertical: 4,
    textTransform: 'uppercase',
  },
  sessionAgendaIntensityEasy: {
    backgroundColor: '#E8F4EE',
    color: theme.colors.success,
  },
  sessionAgendaIntensityHard: {
    backgroundColor: '#FFF0EC',
    color: theme.colors.coral,
  },
  sessionAgendaKicker: {
    color: theme.colors.muted,
    fontSize: 11,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  sessionAgendaMeta: {
    color: theme.colors.muted,
    fontSize: 12,
    fontWeight: '800',
    lineHeight: 17,
  },
  sessionAgendaNextAction: {
    backgroundColor: theme.colors.brandSoft,
    borderRadius: theme.radius.sm,
    gap: 3,
    padding: theme.spacing.sm,
  },
  sessionAgendaNextActionLabel: {
    color: theme.colors.brand,
    fontSize: 10,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  sessionAgendaNextActionText: {
    color: theme.colors.brandDark,
    fontSize: 13,
    fontWeight: '900',
    lineHeight: 18,
  },
  sessionAgendaPacketBox: {
    backgroundColor: theme.colors.ink,
    borderRadius: theme.radius.md,
    padding: theme.spacing.md,
  },
  sessionAgendaPacketText: {
    color: '#F8FAFC',
    fontFamily: 'monospace',
    fontSize: 11,
    lineHeight: 16,
  },
  sessionAgendaPrivacy: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.sm,
  },
  sessionAgendaPrivacyText: {
    backgroundColor: '#E8F4EE',
    borderRadius: theme.radius.sm,
    color: theme.colors.success,
    fontSize: 11,
    fontWeight: '900',
    overflow: 'hidden',
    paddingHorizontal: 8,
    paddingVertical: 6,
  },
  sessionAgendaTitle: {
    color: theme.colors.ink,
    fontSize: 18,
    fontWeight: '900',
    lineHeight: 23,
  },
  closeoutAction: {
    backgroundColor: theme.colors.surfaceAlt,
    borderRadius: theme.radius.sm,
    flex: 1,
    gap: 4,
    minWidth: 152,
    padding: theme.spacing.sm,
  },
  closeoutActionDetail: {
    color: theme.colors.text,
    fontSize: 12,
    lineHeight: 17,
  },
  closeoutActionHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: theme.spacing.xs,
    justifyContent: 'space-between',
  },
  closeoutActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.sm,
  },
  closeoutActionStatus: {
    backgroundColor: theme.colors.brandSoft,
    borderRadius: theme.radius.sm,
    color: theme.colors.brand,
    fontSize: 10,
    fontWeight: '900',
    overflow: 'hidden',
    paddingHorizontal: 7,
    paddingVertical: 4,
    textTransform: 'uppercase',
  },
  closeoutActionStatusBlocked: {
    backgroundColor: '#FFF0EC',
    color: theme.colors.coral,
  },
  closeoutActionStatusReady: {
    backgroundColor: '#E8F4EE',
    color: theme.colors.success,
  },
  closeoutActionSurface: {
    color: theme.colors.muted,
    flexShrink: 1,
    fontSize: 10,
    fontWeight: '900',
    textAlign: 'right',
    textTransform: 'uppercase',
  },
  closeoutActionTitle: {
    color: theme.colors.ink,
    fontSize: 14,
    fontWeight: '900',
    lineHeight: 18,
  },
  closeoutBadge: {
    alignItems: 'center',
    backgroundColor: theme.colors.brand,
    borderRadius: theme.radius.md,
    minWidth: 84,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: theme.spacing.sm,
  },
  closeoutBadgeBlocked: {
    backgroundColor: theme.colors.coral,
  },
  closeoutBadgeLabel: {
    color: '#F4FFF8',
    fontSize: 10,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  closeoutBadgeReady: {
    backgroundColor: theme.colors.success,
  },
  closeoutBadgeValue: {
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: '900',
  },
  closeoutCard: {
    backgroundColor: theme.colors.surface,
    borderColor: theme.colors.line,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    gap: theme.spacing.md,
    padding: theme.spacing.md,
  },
  closeoutCopy: {
    flex: 1,
    gap: 4,
  },
  closeoutHeader: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.md,
    justifyContent: 'space-between',
  },
  closeoutKicker: {
    color: theme.colors.muted,
    fontSize: 11,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  closeoutMeta: {
    color: theme.colors.muted,
    fontSize: 12,
    fontWeight: '800',
    lineHeight: 17,
  },
  closeoutNextAction: {
    backgroundColor: theme.colors.brandSoft,
    borderRadius: theme.radius.sm,
    gap: 3,
    padding: theme.spacing.sm,
  },
  closeoutNextActionLabel: {
    color: theme.colors.brand,
    fontSize: 10,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  closeoutNextActionText: {
    color: theme.colors.brandDark,
    fontSize: 13,
    fontWeight: '900',
    lineHeight: 18,
  },
  closeoutPrivacy: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.sm,
  },
  closeoutPrivacyText: {
    backgroundColor: '#E8F4EE',
    borderRadius: theme.radius.sm,
    color: theme.colors.success,
    fontSize: 11,
    fontWeight: '900',
    overflow: 'hidden',
    paddingHorizontal: 8,
    paddingVertical: 6,
  },
  closeoutTitle: {
    color: theme.colors.ink,
    fontSize: 18,
    fontWeight: '900',
    lineHeight: 23,
  },
  trainingLoadCard: {
    backgroundColor: theme.colors.surface,
    borderColor: theme.colors.line,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    gap: theme.spacing.md,
    padding: theme.spacing.md,
  },
  trainingLoadCopy: {
    flex: 1,
    gap: 4,
  },
  trainingLoadHeader: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.md,
    justifyContent: 'space-between',
  },
  trainingLoadKicker: {
    color: theme.colors.muted,
    fontSize: 11,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  trainingLoadMeta: {
    color: theme.colors.muted,
    fontSize: 12,
    fontWeight: '800',
    lineHeight: 17,
  },
  trainingLoadNextAction: {
    color: theme.colors.text,
    fontSize: 12,
    fontWeight: '800',
    lineHeight: 17,
  },
  trainingLoadRecommendation: {
    backgroundColor: theme.colors.brandSoft,
    borderRadius: theme.radius.sm,
    gap: 4,
    padding: theme.spacing.sm,
  },
  trainingLoadRecommendationLabel: {
    color: theme.colors.brand,
    fontSize: 10,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  trainingLoadRecommendationText: {
    color: theme.colors.brandDark,
    fontSize: 13,
    fontWeight: '900',
    lineHeight: 18,
  },
  trainingLoadScore: {
    alignItems: 'center',
    backgroundColor: theme.colors.brand,
    borderRadius: theme.radius.md,
    minWidth: 86,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: theme.spacing.sm,
  },
  trainingLoadScoreLabel: {
    color: '#F4FFF8',
    fontSize: 10,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  trainingLoadScoreLimit: {
    backgroundColor: theme.colors.coral,
  },
  trainingLoadScoreReady: {
    backgroundColor: theme.colors.success,
  },
  trainingLoadScoreValue: {
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: '900',
  },
  trainingLoadSignal: {
    backgroundColor: theme.colors.surfaceAlt,
    borderRadius: theme.radius.sm,
    flex: 1,
    gap: 4,
    minWidth: 152,
    padding: theme.spacing.sm,
  },
  trainingLoadSignalDetail: {
    color: theme.colors.text,
    fontSize: 12,
    lineHeight: 17,
  },
  trainingLoadSignals: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.sm,
  },
  trainingLoadSignalStatus: {
    alignSelf: 'flex-start',
    backgroundColor: theme.colors.brandSoft,
    borderRadius: theme.radius.sm,
    color: theme.colors.brand,
    fontSize: 10,
    fontWeight: '900',
    overflow: 'hidden',
    paddingHorizontal: 7,
    paddingVertical: 4,
    textTransform: 'uppercase',
  },
  trainingLoadSignalStatusLimit: {
    backgroundColor: '#FFF0EC',
    color: theme.colors.coral,
  },
  trainingLoadSignalStatusReady: {
    backgroundColor: '#E8F4EE',
    color: theme.colors.success,
  },
  trainingLoadSignalTitle: {
    color: theme.colors.ink,
    fontSize: 14,
    fontWeight: '900',
    lineHeight: 18,
  },
  trainingLoadStat: {
    backgroundColor: theme.colors.surfaceAlt,
    borderRadius: theme.radius.sm,
    flex: 1,
    gap: 2,
    minWidth: 92,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: theme.spacing.sm,
  },
  trainingLoadStatLabel: {
    color: theme.colors.muted,
    fontSize: 10,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  trainingLoadStats: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.sm,
  },
  trainingLoadStatValue: {
    color: theme.colors.ink,
    fontSize: 18,
    fontWeight: '900',
  },
  trainingLoadTitle: {
    color: theme.colors.ink,
    fontSize: 18,
    fontWeight: '900',
    lineHeight: 23,
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
  preSendGuardAction: {
    backgroundColor: theme.colors.surfaceAlt,
    borderRadius: theme.radius.sm,
    gap: 4,
    padding: theme.spacing.sm,
  },
  preSendGuardActionLabel: {
    color: theme.colors.muted,
    fontSize: 10,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  preSendGuardActionText: {
    color: theme.colors.text,
    fontSize: 13,
    fontWeight: '800',
    lineHeight: 18,
  },
  preSendGuardBadge: {
    backgroundColor: theme.colors.brandSoft,
    borderRadius: theme.radius.sm,
    color: theme.colors.brand,
    fontSize: 10,
    fontWeight: '900',
    overflow: 'hidden',
    paddingHorizontal: 8,
    paddingVertical: 5,
    textTransform: 'uppercase',
  },
  preSendGuardBadgeReady: {
    backgroundColor: '#E8F4EE',
    color: theme.colors.success,
  },
  preSendGuardBadgeReset: {
    backgroundColor: '#FFF0EC',
    color: theme.colors.coral,
  },
  preSendGuardCard: {
    backgroundColor: theme.colors.surface,
    borderColor: theme.colors.line,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    gap: theme.spacing.md,
    padding: theme.spacing.md,
  },
  preSendGuardCardReady: {
    borderColor: theme.colors.success,
  },
  preSendGuardCardReset: {
    borderColor: theme.colors.coral,
  },
  preSendGuardCopy: {
    flex: 1,
    gap: 5,
  },
  preSendGuardMeta: {
    color: theme.colors.muted,
    fontSize: 12,
    fontWeight: '800',
    lineHeight: 17,
  },
  preSendGuardScore: {
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: '900',
  },
  preSendGuardScoreBox: {
    alignItems: 'center',
    backgroundColor: theme.colors.brandDark,
    borderRadius: theme.radius.md,
    minWidth: 74,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: theme.spacing.sm,
  },
  preSendGuardScoreLabel: {
    color: '#DCECF3',
    fontSize: 10,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  preSendGuardSignal: {
    backgroundColor: theme.colors.surfaceAlt,
    borderColor: theme.colors.line,
    borderRadius: theme.radius.sm,
    borderWidth: 1,
    flexGrow: 1,
    gap: 4,
    minWidth: 142,
    padding: theme.spacing.sm,
  },
  preSendGuardSignalBlocker: {
    backgroundColor: '#FFF0EC',
    borderColor: '#F2C8BA',
  },
  preSendGuardSignalEvidence: {
    color: theme.colors.muted,
    fontSize: 11,
    fontWeight: '800',
    lineHeight: 15,
  },
  preSendGuardSignalLabel: {
    color: theme.colors.ink,
    fontSize: 13,
    fontWeight: '900',
    lineHeight: 17,
  },
  preSendGuardSignals: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.sm,
  },
  preSendGuardSignalSeverity: {
    color: theme.colors.brand,
    fontSize: 10,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  preSendGuardSignalSeverityBlocker: {
    color: theme.colors.coral,
  },
  preSendGuardSignalSeveritySupport: {
    color: theme.colors.success,
  },
  preSendGuardSignalSupport: {
    backgroundColor: '#E8F4EE',
    borderColor: '#BBDDCB',
  },
  preSendGuardTitle: {
    color: theme.colors.ink,
    flex: 1,
    fontSize: 18,
    fontWeight: '900',
    lineHeight: 22,
  },
  preSendGuardTitleRow: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: theme.spacing.sm,
  },
  preSendGuardTop: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: theme.spacing.md,
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
