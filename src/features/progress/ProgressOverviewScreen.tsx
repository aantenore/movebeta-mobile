import { useCallback, useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { ArrowDown, ArrowUp, Minus, Repeat2, Target, TrendingUp } from 'lucide-react-native';

import { Header } from '@/components/Header';
import { Screen } from '@/components/Screen';
import { Section } from '@/components/Section';
import { StateView } from '@/components/StateView';
import { theme } from '@/core/theme';
import { minimumMeaningfulScoreDelta } from '@/movement/attemptComparison';
import type { LocalAnalysisReport } from '@/movement/contracts';
import { summarizeProgress } from '@/movement/progressInsights';
import { listReports } from '@/movement/repository';

function TrendIcon({ direction }: { direction: 'down' | 'flat' | 'new' | 'up' }) {
  if (direction === 'up') return <ArrowUp color={theme.colors.success} size={18} />;
  if (direction === 'down') return <ArrowDown color={theme.colors.coral} size={18} />;
  return <Minus color={theme.colors.muted} size={18} />;
}

export function ProgressOverviewScreen() {
  const [reports, setReports] = useState<LocalAnalysisReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const refresh = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      setReports(await listReports());
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : 'Progress could not be loaded.');
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void refresh();
    }, [refresh]),
  );

  const summary = useMemo(() => summarizeProgress(reports), [reports]);
  const meaningfulOverallDelta =
    summary.attemptComparison &&
    Math.abs(summary.attemptComparison.overallScoreDelta) >= minimumMeaningfulScoreDelta
      ? summary.attemptComparison.overallScoreDelta
      : 0;

  return (
    <Screen>
      <Header
        eyebrow="Progress"
        title="What changed"
        subtitle="Use compatible repeats to separate a measured signal change from a different camera angle or low-quality clip."
      />

      {loading && reports.length === 0 ? (
        <StateView loading title="Loading progress" message="Reading movement reports stored on this device." />
      ) : error ? (
        <StateView title="Progress unavailable" message={error} />
      ) : reports.length === 0 ? (
        <StateView title="No progress yet" message="Analyze one attempt, then film a focused repeat of the same climb." />
      ) : (
        <>
          <View style={styles.summaryGrid}>
            <View style={styles.summaryCard}>
              <Text style={styles.summaryValue}>{summary.attemptCount}</Text>
              <Text style={styles.summaryLabel}>Attempts</Text>
            </View>
            <View style={styles.summaryCard}>
              <Text style={styles.summaryValue}>{summary.averageQuality}</Text>
              <Text style={styles.summaryLabel}>Avg pose quality</Text>
            </View>
          </View>

          {summary.focusMetric ? (
            <Section title="Current focus" caption="The lowest measured movement score in your latest attempt.">
              <View style={styles.focusCard}>
                <Target color={theme.colors.coral} size={23} />
                <View style={styles.focusCopy}>
                  <Text style={styles.focusTitle}>{summary.focusMetric.label}</Text>
                  <Text style={styles.focusBody}>{summary.focusMetric.helper}</Text>
                </View>
                <Text style={styles.focusScore}>{summary.focusMetric.score}</Text>
              </View>
            </Section>
          ) : null}

          {summary.attemptComparison ? (
            <Section title="Latest repeat" caption="Attempts are linked using project details and compatible capture metadata.">
              <View style={styles.comparisonCard}>
                <View style={styles.comparisonHeader}>
                  <Repeat2 color={theme.colors.brand} size={22} />
                  <Text style={styles.comparisonTitle}>{summary.attemptComparison.headline}</Text>
                </View>
                <Text style={styles.comparisonBody}>{summary.attemptComparison.recommendation}</Text>
                <View style={styles.comparisonStats}>
                  <View style={styles.comparisonStat}>
                    <Text
                      style={[
                        styles.comparisonValue,
                        meaningfulOverallDelta >= minimumMeaningfulScoreDelta
                          ? styles.valuePositive
                          : null,
                        meaningfulOverallDelta <= -minimumMeaningfulScoreDelta
                          ? styles.valueNegative
                          : null,
                      ]}
                    >
                      {meaningfulOverallDelta > 0 ? '+' : ''}
                      {meaningfulOverallDelta}
                    </Text>
                    <Text style={styles.comparisonLabel}>Signal delta</Text>
                  </View>
                  <View style={styles.comparisonStat}>
                    <Text style={styles.comparisonValue}>{summary.attemptComparison.cueComparison.resolvedCues.length}</Text>
                    <Text style={styles.comparisonLabel}>Signals absent</Text>
                  </View>
                </View>
              </View>
            </Section>
          ) : (
            <View style={styles.repeatEmpty}>
              <Repeat2 color={theme.colors.brand} size={21} />
              <View style={styles.repeatEmptyCopy}>
                <Text style={styles.repeatEmptyTitle}>One more comparable attempt</Text>
                <Text style={styles.repeatEmptyBody}>
                  From Coach, choose Film focused repeat after an analysis to create a direct comparison.
                </Text>
              </View>
            </View>
          )}

          <Section title="Latest movement signals">
            <View style={styles.trendList}>
              {summary.trends.map((trend) => (
                <View key={trend.id} style={styles.trendRow}>
                  <TrendIcon direction={trend.direction} />
                  <View style={styles.trendCopy}>
                    <Text style={styles.trendLabel}>{trend.label}</Text>
                    <Text style={styles.trendMeta}>
                      {trend.delta === null
                        ? 'First measured attempt'
                        : `${trend.delta > 0 ? '+' : ''}${trend.delta} from previous attempt`}
                    </Text>
                  </View>
                  <Text style={styles.trendScore}>{trend.currentScore}</Text>
                </View>
              ))}
            </View>
          </Section>
        </>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  comparisonBody: {
    color: theme.colors.text,
    fontSize: 13,
    lineHeight: 19,
  },
  comparisonCard: {
    backgroundColor: theme.colors.brandSoft,
    borderRadius: theme.radius.lg,
    gap: theme.spacing.md,
    padding: theme.spacing.md,
  },
  comparisonHeader: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: theme.spacing.sm,
  },
  comparisonLabel: {
    color: theme.colors.muted,
    fontSize: 10,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  comparisonStat: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.sm,
    flex: 1,
    gap: 2,
    minWidth: 110,
    padding: theme.spacing.sm,
  },
  comparisonStats: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.sm,
  },
  comparisonTitle: {
    color: theme.colors.ink,
    flex: 1,
    fontSize: 17,
    fontWeight: '900',
    lineHeight: 22,
  },
  comparisonValue: {
    color: theme.colors.ink,
    fontSize: 22,
    fontVariant: ['tabular-nums'],
    fontWeight: '900',
  },
  focusBody: {
    color: theme.colors.muted,
    fontSize: 12,
    lineHeight: 17,
  },
  focusCard: {
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    borderColor: '#E9C7BF',
    borderLeftColor: theme.colors.coral,
    borderLeftWidth: 4,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    flexDirection: 'row',
    gap: theme.spacing.sm,
    padding: theme.spacing.md,
  },
  focusCopy: {
    flex: 1,
    gap: 3,
  },
  focusScore: {
    color: theme.colors.coral,
    fontSize: 24,
    fontVariant: ['tabular-nums'],
    fontWeight: '900',
  },
  focusTitle: {
    color: theme.colors.ink,
    fontSize: 17,
    fontWeight: '900',
  },
  repeatEmpty: {
    alignItems: 'flex-start',
    backgroundColor: theme.colors.surface,
    borderColor: theme.colors.line,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    flexDirection: 'row',
    gap: theme.spacing.sm,
    padding: theme.spacing.md,
  },
  repeatEmptyBody: {
    color: theme.colors.muted,
    fontSize: 12,
    lineHeight: 17,
  },
  repeatEmptyCopy: {
    flex: 1,
    gap: 3,
  },
  repeatEmptyTitle: {
    color: theme.colors.ink,
    fontSize: 15,
    fontWeight: '900',
  },
  summaryCard: {
    backgroundColor: theme.colors.brandDark,
    borderRadius: theme.radius.md,
    flex: 1,
    gap: 3,
    minWidth: 130,
    padding: theme.spacing.md,
  },
  summaryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.sm,
  },
  summaryLabel: {
    color: '#DCECF3',
    fontSize: 11,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  summaryValue: {
    color: '#FFFFFF',
    fontSize: 28,
    fontVariant: ['tabular-nums'],
    fontWeight: '900',
  },
  trendCopy: {
    flex: 1,
    gap: 2,
  },
  trendLabel: {
    color: theme.colors.ink,
    fontSize: 14,
    fontWeight: '900',
  },
  trendList: {
    gap: 8,
  },
  trendMeta: {
    color: theme.colors.muted,
    fontSize: 11,
  },
  trendRow: {
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    borderColor: theme.colors.line,
    borderRadius: theme.radius.sm,
    borderWidth: 1,
    flexDirection: 'row',
    gap: theme.spacing.sm,
    minHeight: 58,
    padding: theme.spacing.sm,
  },
  trendScore: {
    color: theme.colors.brand,
    fontSize: 20,
    fontVariant: ['tabular-nums'],
    fontWeight: '900',
  },
  valueNegative: {
    color: theme.colors.coral,
  },
  valuePositive: {
    color: theme.colors.success,
  },
});
