import { useCallback, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { Download, Eye, RefreshCw, Repeat2, ShieldCheck, Trash2 } from 'lucide-react-native';

import { Header } from '@/components/Header';
import { MovementMetricRow } from '@/components/MovementMetricRow';
import { PoseOverlay } from '@/components/PoseOverlay';
import { Pressable } from '@/components/Pressable';
import { Screen } from '@/components/Screen';
import { Section } from '@/components/Section';
import { StateView } from '@/components/StateView';
import { confirmDestructiveAction } from '@/core/confirmation';
import { selectionFeedback } from '@/core/haptics';
import { sharePreparedExport } from '@/core/preparedExportShare';
import type { LocalAnalysisReport } from '@/movement/contracts';
import { assessCaptureReadiness } from '@/movement/captureReadiness';
import {
  clearActiveFocusedRepeat,
  loadActiveFocusedRepeat,
  saveActiveFocusedRepeat,
} from '@/movement/focusedRepeatRepository';
import { deleteLocalAnalysisBundle, exportReport, listReports } from '@/movement/repository';
import { theme } from '@/core/theme';

function formatAttemptDate(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString();
}

export function AttemptHistoryScreen() {
  const router = useRouter();
  const [reports, setReports] = useState<LocalAnalysisReport[]>([]);
  const [selectedReportId, setSelectedReportId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');

  const refresh = useCallback(async () => {
    setLoading(true);
    setMessage('');
    try {
      const nextReports = await listReports();
      setReports(nextReports);
      setSelectedReportId((current) =>
        current && nextReports.some((report) => report.id === current) ? current : null,
      );
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Local attempts could not be loaded.');
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void refresh();
    }, [refresh]),
  );

  const selectedReport = reports.find((report) => report.id === selectedReportId) ?? null;

  async function removeReport(report: LocalAnalysisReport) {
    const confirmed = await confirmDestructiveAction(
      'Delete this attempt?',
      'Its local metrics, cues, notes, and consent records will be removed. The original imported video is unchanged.',
    );
    if (!confirmed) return;

    if (loadActiveFocusedRepeat()?.baselineReportId === report.id) clearActiveFocusedRepeat();
    const result = await deleteLocalAnalysisBundle(report.id);
    setMessage(result.status === 'deleted' ? 'Attempt deleted from this device.' : 'Some local records need another delete attempt.');
    await refresh();
  }

  function repeatAttempt(report: LocalAnalysisReport) {
    if (assessCaptureReadiness(report.analysisQuality).status === 'retake') {
      setMessage('Retake this attempt with stronger pose coverage before using it as a repeat baseline.');
      return;
    }
    selectionFeedback();
    saveActiveFocusedRepeat(report);
    router.push('/');
  }

  async function shareReport(report: LocalAnalysisReport) {
    selectionFeedback();
    try {
      const exported = await exportReport(report.id);
      if (!exported) {
        setMessage('This attempt is no longer available.');
        return;
      }
      await sharePreparedExport({
        body: JSON.stringify(exported, null, 2),
        title: `${report.session.title} - MoveBeta analysis`,
      });
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'The local report could not be shared.');
    }
  }

  return (
    <Screen>
      <Header
        eyebrow="Attempts"
        title="Your local history"
        subtitle="Review movement evidence without uploading the selected video."
        action={
          <Pressable accessibilityLabel="Refresh attempt history" onPress={() => void refresh()} style={styles.iconButton}>
            <RefreshCw color={theme.colors.brand} size={18} />
          </Pressable>
        }
      />

      {message ? (
        <View accessibilityLiveRegion="polite" style={styles.message}>
          <Text style={styles.messageText}>{message}</Text>
        </View>
      ) : null}

      {loading && reports.length === 0 ? (
        <StateView loading title="Loading attempts" message="Reading analysis reports stored on this device." />
      ) : reports.length === 0 ? (
        <StateView title="No attempts yet" message="Analyze a climbing video from Coach to create your first report." />
      ) : (
        <View style={styles.attemptList}>
          {reports.map((report) => {
            const selected = report.id === selectedReportId;
            const primaryCue = report.cues[0];
            return (
              <View key={report.id} style={[styles.attempt, selected ? styles.attemptSelected : null]}>
                <View style={styles.attemptHeader}>
                  <View style={styles.attemptCopy}>
                    <Text style={styles.attemptTitle}>{report.session.title}</Text>
                    <Text style={styles.attemptMeta}>
                      {report.session.grade} · {report.session.wallAngle} · {formatAttemptDate(report.session.createdAt)}
                    </Text>
                  </View>
                  <View style={styles.qualityBadge}>
                    <Text style={styles.qualityValue}>{report.analysisQuality.score}</Text>
                    <Text style={styles.qualityLabel}>Pose</Text>
                  </View>
                </View>
                <Text style={styles.attemptFocus}>
                  {primaryCue ? `Next focus: ${primaryCue.title}` : 'No reliable correction from this clip'}
                </Text>
                <View style={styles.attemptActions}>
                  <Pressable
                    accessibilityLabel={`Review ${report.session.title}`}
                    onPress={() => {
                      selectionFeedback();
                      setSelectedReportId(selected ? null : report.id);
                    }}
                    style={[styles.secondaryAction, selected ? styles.secondaryActionSelected : null]}
                  >
                    <Eye color={selected ? '#FFFFFF' : theme.colors.brand} size={17} />
                    <Text style={[styles.secondaryActionText, selected ? styles.secondaryActionTextSelected : null]}>
                      {selected ? 'Close' : 'Review'}
                    </Text>
                  </Pressable>
                  <Pressable
                    accessibilityLabel={`Repeat ${report.session.title}`}
                    onPress={() => repeatAttempt(report)}
                    style={styles.secondaryAction}
                  >
                    <Repeat2 color={theme.colors.brand} size={17} />
                    <Text style={styles.secondaryActionText}>Repeat</Text>
                  </Pressable>
                  <Pressable
                    accessibilityLabel={`Share ${report.session.title}`}
                    onPress={() => void shareReport(report)}
                    style={styles.secondaryAction}
                  >
                    <Download color={theme.colors.brand} size={17} />
                    <Text style={styles.secondaryActionText}>Share report</Text>
                  </Pressable>
                  <Pressable
                    accessibilityLabel={`Delete ${report.session.title}`}
                    onPress={() => void removeReport(report)}
                    style={styles.deleteAction}
                  >
                    <Trash2 color={theme.colors.coral} size={17} />
                  </Pressable>
                </View>
              </View>
            );
          })}
        </View>
      )}

      {selectedReport ? (
        <View style={styles.detail}>
          <Section title="Priority correction" caption="The first focus selected for the next repeat.">
            <View style={styles.focusCard}>
              <ShieldCheck color={theme.colors.coral} size={21} />
              <View style={styles.focusCopy}>
                <Text style={styles.focusTitle}>{selectedReport.cues[0]?.title ?? 'Retake for better evidence'}</Text>
                <Text style={styles.focusBody}>
                  {selectedReport.cues[0]?.body ?? 'Keep the full body visible from a stable side or diagonal view.'}
                </Text>
                {selectedReport.cues[0]?.drill ? (
                  <Text style={styles.focusDrill}>{selectedReport.cues[0].drill}</Text>
                ) : null}
              </View>
            </View>
          </Section>

          <Section title="Key pose">
            <PoseOverlay frame={selectedReport.keyFrame} />
          </Section>

          <Section title="Movement signals">
            {selectedReport.metrics.map((metric) => (
              <MovementMetricRow key={metric.id} metric={metric} />
            ))}
          </Section>
        </View>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  attempt: {
    backgroundColor: theme.colors.surface,
    borderColor: theme.colors.line,
    borderRadius: theme.radius.lg,
    borderWidth: 1,
    gap: theme.spacing.md,
    padding: theme.spacing.md,
  },
  attemptActions: {
    alignItems: 'center',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.sm,
  },
  attemptCopy: {
    flex: 1,
    gap: 3,
    minWidth: 170,
  },
  attemptFocus: {
    color: theme.colors.text,
    fontSize: 13,
    fontWeight: '800',
    lineHeight: 18,
  },
  attemptHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.sm,
    justifyContent: 'space-between',
  },
  attemptList: {
    gap: theme.spacing.sm,
  },
  attemptMeta: {
    color: theme.colors.muted,
    fontSize: 12,
    textTransform: 'capitalize',
  },
  attemptSelected: {
    borderColor: theme.colors.brand,
  },
  attemptTitle: {
    color: theme.colors.ink,
    fontSize: 17,
    fontWeight: '900',
  },
  deleteAction: {
    alignItems: 'center',
    height: 42,
    justifyContent: 'center',
    width: 42,
  },
  detail: {
    gap: theme.spacing.lg,
  },
  focusBody: {
    color: theme.colors.text,
    fontSize: 13,
    lineHeight: 18,
  },
  focusCard: {
    alignItems: 'flex-start',
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
    gap: 6,
  },
  focusDrill: {
    color: theme.colors.brand,
    fontSize: 12,
    fontWeight: '900',
    lineHeight: 17,
  },
  focusTitle: {
    color: theme.colors.ink,
    fontSize: 17,
    fontWeight: '900',
  },
  iconButton: {
    alignItems: 'center',
    backgroundColor: theme.colors.brandSoft,
    borderRadius: theme.radius.sm,
    height: 42,
    justifyContent: 'center',
    width: 42,
  },
  message: {
    backgroundColor: theme.colors.brandSoft,
    borderRadius: theme.radius.sm,
    padding: theme.spacing.sm,
  },
  messageText: {
    color: theme.colors.text,
    fontSize: 13,
    lineHeight: 18,
  },
  qualityBadge: {
    alignItems: 'center',
    backgroundColor: theme.colors.surfaceAlt,
    borderRadius: theme.radius.sm,
    minWidth: 62,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  qualityLabel: {
    color: theme.colors.muted,
    fontSize: 9,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  qualityValue: {
    color: theme.colors.brand,
    fontSize: 20,
    fontVariant: ['tabular-nums'],
    fontWeight: '900',
  },
  secondaryAction: {
    alignItems: 'center',
    backgroundColor: theme.colors.brandSoft,
    borderRadius: theme.radius.sm,
    flexDirection: 'row',
    gap: 7,
    minHeight: 42,
    paddingHorizontal: 12,
  },
  secondaryActionSelected: {
    backgroundColor: theme.colors.brand,
  },
  secondaryActionText: {
    color: theme.colors.brand,
    fontSize: 12,
    fontWeight: '900',
  },
  secondaryActionTextSelected: {
    color: '#FFFFFF',
  },
});
