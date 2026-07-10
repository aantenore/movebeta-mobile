import { useCallback, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { Database, Download, ShieldCheck, Trash2, Video, WifiOff } from 'lucide-react-native';

import { Header } from '@/components/Header';
import { Pressable } from '@/components/Pressable';
import { Screen } from '@/components/Screen';
import { Section } from '@/components/Section';
import { confirmDestructiveAction } from '@/core/confirmation';
import { sharePreparedExport } from '@/core/preparedExportShare';
import { theme } from '@/core/theme';
import { createLocalDataBackup } from '@/movement/dataPortability';
import { clearActiveFocusedRepeat } from '@/movement/focusedRepeatRepository';
import { deleteLocalAnalysisBundle, listReports } from '@/movement/repository';
import { cleanupOwnedCameraVideos } from '@/video/localVideoRetention';

const privacyFacts = [
  {
    body: 'Pose estimation and movement scoring run on the phone or in the installed PWA.',
    icon: ShieldCheck,
    title: 'Analysis stays local',
  },
  {
    body: 'Reports store derived landmarks, scores, and cues. They do not store the selected video URI.',
    icon: Video,
    title: 'Videos are not added to history',
  },
  {
    body: 'An account and cloud connection are not required for the coaching loop.',
    icon: WifiOff,
    title: 'Offline-first',
  },
] as const;

export function ProductSettingsScreen() {
  const [reportCount, setReportCount] = useState(0);
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);

  const refresh = useCallback(async () => {
    try {
      setReportCount((await listReports()).length);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Local data could not be read.');
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void refresh();
    }, [refresh]),
  );

  async function exportLocalData() {
    setBusy(true);
    setMessage('');
    try {
      const backup = await createLocalDataBackup();
      await sharePreparedExport({ body: JSON.stringify(backup, null, 2), title: 'MoveBeta local data backup' });
      setMessage('Local backup prepared. It contains derived reports and settings, never raw video.');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'The local backup could not be prepared.');
    } finally {
      setBusy(false);
    }
  }

  async function deleteHistory() {
    if (reportCount === 0) return;
    const confirmed = await confirmDestructiveAction(
      'Delete all local attempts?',
      'This removes reports, cues, notes, drill records, and consent records from this device. Imported videos are unchanged.',
    );
    if (!confirmed) return;

    setBusy(true);
    setMessage('');
    try {
      const reports = await listReports();
      const results = await Promise.all(reports.map((report) => deleteLocalAnalysisBundle(report.id)));
      clearActiveFocusedRepeat();
      await cleanupOwnedCameraVideos();
      const incomplete = results.filter((result) => result.status !== 'deleted').length;
      await refresh();
      setMessage(
        incomplete === 0
          ? 'All local attempt history was deleted.'
          : `${incomplete} attempt bundle(s) need another delete attempt.`,
      );
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Local history could not be deleted.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <Screen>
      <Header
        eyebrow="Settings"
        title="Privacy & data"
        subtitle="MoveBeta is usable without an account and keeps the core coaching workflow on this device."
      />

      <Section title="Privacy boundary">
        <View style={styles.factList}>
          {privacyFacts.map((fact) => {
            const Icon = fact.icon;
            return (
              <View key={fact.title} style={styles.fact}>
                <View style={styles.factIcon}>
                  <Icon color={theme.colors.brand} size={21} />
                </View>
                <View style={styles.factCopy}>
                  <Text style={styles.factTitle}>{fact.title}</Text>
                  <Text style={styles.factBody}>{fact.body}</Text>
                </View>
              </View>
            );
          })}
        </View>
      </Section>

      <Section title="Local history" caption="You control the derived reports stored by the app.">
        <View style={styles.dataCard}>
          <Database color={theme.colors.brand} size={23} />
          <View style={styles.dataCopy}>
            <Text style={styles.dataValue}>{reportCount}</Text>
            <Text style={styles.dataLabel}>attempt report{reportCount === 1 ? '' : 's'} on this device</Text>
          </View>
        </View>
        <View style={styles.actions}>
          <Pressable
            accessibilityLabel="Export local MoveBeta data"
            disabled={busy}
            onPress={() => void exportLocalData()}
            style={[styles.primaryAction, busy ? styles.disabled : null]}
          >
            <Download color="#FFFFFF" size={18} />
            <Text style={styles.primaryActionText}>Export data</Text>
          </Pressable>
          <Pressable
            accessibilityLabel="Delete all local attempt history"
            accessibilityState={{ disabled: busy || reportCount === 0 }}
            disabled={busy || reportCount === 0}
            onPress={() => void deleteHistory()}
            style={[styles.deleteAction, busy || reportCount === 0 ? styles.disabled : null]}
          >
            <Trash2 color={theme.colors.coral} size={18} />
            <Text style={styles.deleteActionText}>Delete history</Text>
          </Pressable>
        </View>
        {message ? (
          <View accessibilityLiveRegion="polite" style={styles.message}>
            <Text style={styles.messageText}>{message}</Text>
          </View>
        ) : null}
      </Section>

      <View style={styles.safety}>
        <ShieldCheck color={theme.colors.amber} size={20} />
        <Text style={styles.safetyText}>
          Movement feedback is educational. It cannot replace a climbing coach, spotting, medical advice, or gym safety rules.
        </Text>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  actions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.sm,
  },
  dataCard: {
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    borderColor: theme.colors.line,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    flexDirection: 'row',
    gap: theme.spacing.md,
    padding: theme.spacing.md,
  },
  dataCopy: {
    flex: 1,
    gap: 2,
  },
  dataLabel: {
    color: theme.colors.muted,
    fontSize: 12,
  },
  dataValue: {
    color: theme.colors.ink,
    fontSize: 25,
    fontVariant: ['tabular-nums'],
    fontWeight: '900',
  },
  deleteAction: {
    alignItems: 'center',
    backgroundColor: '#FBEDEA',
    borderRadius: theme.radius.sm,
    flex: 1,
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'center',
    minHeight: 46,
    minWidth: 150,
    paddingHorizontal: 14,
  },
  deleteActionText: {
    color: theme.colors.coral,
    fontSize: 13,
    fontWeight: '900',
  },
  disabled: {
    opacity: 0.45,
  },
  fact: {
    alignItems: 'flex-start',
    backgroundColor: theme.colors.surface,
    borderColor: theme.colors.line,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    flexDirection: 'row',
    gap: theme.spacing.md,
    padding: theme.spacing.md,
  },
  factBody: {
    color: theme.colors.muted,
    fontSize: 13,
    lineHeight: 18,
  },
  factCopy: {
    flex: 1,
    gap: 3,
  },
  factIcon: {
    alignItems: 'center',
    backgroundColor: theme.colors.brandSoft,
    borderRadius: theme.radius.sm,
    height: 40,
    justifyContent: 'center',
    width: 40,
  },
  factList: {
    gap: theme.spacing.sm,
  },
  factTitle: {
    color: theme.colors.ink,
    fontSize: 15,
    fontWeight: '900',
  },
  message: {
    backgroundColor: theme.colors.brandSoft,
    borderRadius: theme.radius.sm,
    padding: theme.spacing.sm,
  },
  messageText: {
    color: theme.colors.text,
    fontSize: 12,
    lineHeight: 17,
  },
  primaryAction: {
    alignItems: 'center',
    backgroundColor: theme.colors.brand,
    borderRadius: theme.radius.sm,
    flex: 1,
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'center',
    minHeight: 46,
    minWidth: 150,
    paddingHorizontal: 14,
  },
  primaryActionText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '900',
  },
  safety: {
    alignItems: 'flex-start',
    backgroundColor: '#FFF3DF',
    borderRadius: theme.radius.md,
    flexDirection: 'row',
    gap: theme.spacing.sm,
    padding: theme.spacing.md,
  },
  safetyText: {
    color: theme.colors.text,
    flex: 1,
    fontSize: 12,
    lineHeight: 17,
  },
});
