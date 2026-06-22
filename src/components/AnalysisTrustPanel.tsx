import { StyleSheet, Text, View } from 'react-native';
import { ShieldCheck, TriangleAlert } from 'lucide-react-native';

import { theme } from '@/core/theme';
import { buildAnalysisTrustSummary, type AnalysisTrustDecision, type AnalysisTrustFactorStatus } from '@/movement/analysisTrust';
import type { LocalAnalysisReport } from '@/movement/contracts';

import { Section } from './Section';

function decisionColor(decision: AnalysisTrustDecision) {
  if (decision === 'coach-ready') return theme.colors.success;
  if (decision === 'review-first') return theme.colors.amber;
  return theme.colors.coral;
}

function factorStyle(status: AnalysisTrustFactorStatus) {
  if (status === 'pass') return styles.factorPass;
  if (status === 'watch') return styles.factorWatch;
  return styles.factorBlock;
}

export function AnalysisTrustPanel({ report }: { report: LocalAnalysisReport }) {
  const trust = buildAnalysisTrustSummary(report);
  const isReady = trust.decision === 'coach-ready';

  return (
    <Section
      caption="Local decision for whether this report should guide coaching, review, or retake."
      title="Analysis trust"
      trailing={
        <View style={[styles.badge, { backgroundColor: decisionColor(trust.decision) }]}>
          <Text style={styles.badgeText}>{trust.decision}</Text>
        </View>
      }
    >
      <View style={[styles.shell, isReady ? styles.shellReady : styles.shellReview]}>
        <View style={styles.top}>
          <View style={styles.titleRow}>
            {isReady ? (
              <ShieldCheck color={theme.colors.success} size={18} />
            ) : (
              <TriangleAlert color={decisionColor(trust.decision)} size={18} />
            )}
            <Text style={styles.title}>{trust.title}</Text>
          </View>
          <Text style={styles.score}>{trust.score}/100</Text>
        </View>

        <Text style={styles.summary}>{trust.summary}</Text>
        <Text style={styles.action}>{trust.recommendedAction}</Text>

        <View style={styles.factorList}>
          {trust.factors.map((factor) => (
            <View key={factor.id} style={styles.factor}>
              <View style={[styles.factorStatus, factorStyle(factor.status)]}>
                <Text style={styles.factorStatusText}>{factor.status}</Text>
              </View>
              <View style={styles.factorCopy}>
                <View style={styles.factorTop}>
                  <Text style={styles.factorLabel}>{factor.label}</Text>
                  <Text style={styles.factorValue}>{factor.valueLabel}</Text>
                </View>
                <Text style={styles.factorDetail}>{factor.detail}</Text>
              </View>
            </View>
          ))}
        </View>

        <Text style={styles.privacy}>
          Local only: {trust.privacy.localOnly ? 'yes' : 'no'} · raw video included: no
        </Text>
      </View>
    </Section>
  );
}

const styles = StyleSheet.create({
  action: {
    color: theme.colors.brandDark,
    fontSize: 13,
    fontWeight: '900',
    lineHeight: 18,
  },
  badge: {
    borderRadius: theme.radius.sm,
    paddingHorizontal: 9,
    paddingVertical: 6,
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  factor: {
    alignItems: 'flex-start',
    backgroundColor: theme.colors.surface,
    borderColor: theme.colors.line,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    flexDirection: 'row',
    gap: theme.spacing.sm,
    padding: theme.spacing.sm,
  },
  factorBlock: {
    backgroundColor: '#FFF0EC',
  },
  factorCopy: {
    flex: 1,
    gap: 4,
  },
  factorDetail: {
    color: theme.colors.muted,
    fontSize: 12,
    lineHeight: 16,
  },
  factorLabel: {
    color: theme.colors.ink,
    flex: 1,
    fontSize: 13,
    fontWeight: '900',
  },
  factorList: {
    gap: theme.spacing.sm,
  },
  factorPass: {
    backgroundColor: '#E6F3EC',
  },
  factorStatus: {
    borderRadius: theme.radius.sm,
    minWidth: 54,
    paddingHorizontal: 7,
    paddingVertical: 5,
  },
  factorStatusText: {
    color: theme.colors.brandDark,
    fontSize: 10,
    fontWeight: '900',
    textAlign: 'center',
    textTransform: 'uppercase',
  },
  factorTop: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: theme.spacing.sm,
    justifyContent: 'space-between',
  },
  factorValue: {
    color: theme.colors.brand,
    fontSize: 12,
    fontWeight: '900',
  },
  factorWatch: {
    backgroundColor: '#FFF5E7',
  },
  privacy: {
    color: theme.colors.muted,
    fontSize: 12,
    fontWeight: '900',
  },
  score: {
    color: theme.colors.brand,
    fontSize: 22,
    fontWeight: '900',
  },
  shell: {
    borderRadius: theme.radius.md,
    borderWidth: 1,
    gap: theme.spacing.md,
    padding: theme.spacing.md,
  },
  shellReady: {
    backgroundColor: '#E8F4EE',
    borderColor: '#BAD7C8',
  },
  shellReview: {
    backgroundColor: '#FFF5E7',
    borderColor: '#E5C58F',
  },
  summary: {
    color: theme.colors.text,
    fontSize: 13,
    lineHeight: 18,
  },
  title: {
    color: theme.colors.ink,
    flex: 1,
    fontSize: 17,
    fontWeight: '900',
  },
  titleRow: {
    alignItems: 'center',
    flex: 1,
    flexDirection: 'row',
    gap: 8,
  },
  top: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: theme.spacing.sm,
    justifyContent: 'space-between',
  },
});
