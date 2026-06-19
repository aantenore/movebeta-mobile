import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Cpu, Database, ShieldCheck, WifiOff } from 'lucide-react-native';

import { Header } from '@/components/Header';
import { Screen } from '@/components/Screen';
import { Section } from '@/components/Section';
import { appConfig } from '@/core/config';
import {
  assertDiagnosticPacketIsPrivacySafe,
  buildDiagnosticSupportPacket,
  createDiagnosticEvent,
  type DiagnosticSupportPacket,
} from '@/core/observability';
import { assessOfflineReadiness } from '@/core/offlineReadiness';
import {
  canAnalyzeOnDevice,
  canExportRawVideo,
  canPrepareCoachReviewPacket,
  canSyncToCloud,
  defaultPrivacyConsent,
} from '@/core/privacy';
import { theme } from '@/core/theme';
import { listReports } from '@/movement/repository';

const items = [
  {
    body: 'Pose inference runs through the configured local provider. The preview uses local fixture landmarks.',
    icon: Cpu,
    title: 'Local inference',
  },
  {
    body: 'The default report stores landmarks, scores, cues, and timeline events instead of uploading raw video.',
    icon: Database,
    title: 'Minimal artifacts',
  },
  {
    body: 'Cloud sync is a separate opt-in product layer, not required for the core coach workflow.',
    icon: WifiOff,
    title: 'Offline capable',
  },
  {
    body: 'Feedback is technique education, not medical diagnosis or injury prevention advice.',
    icon: ShieldCheck,
    title: 'Safety boundary',
  },
  {
    body: `Local analysis allowed: ${canAnalyzeOnDevice(defaultPrivacyConsent) ? 'yes' : 'no'} · raw video export: ${
      canExportRawVideo(defaultPrivacyConsent) ? 'enabled' : 'off'
    } · coach packet: ${canPrepareCoachReviewPacket(defaultPrivacyConsent) ? 'enabled' : 'requires consent'} · cloud sync: ${
      canSyncToCloud(defaultPrivacyConsent) ? 'enabled' : 'off'
    }.`,
    icon: ShieldCheck,
    title: 'Consent gates',
  },
] as const;

export function PrivacyScreen() {
  const [diagnostics, setDiagnostics] = useState<DiagnosticSupportPacket | null>(null);
  const [offlineReportCount, setOfflineReportCount] = useState(0);
  const offlineReadiness = assessOfflineReadiness({
    config: appConfig,
    consent: defaultPrivacyConsent,
    reportCount: offlineReportCount,
  });

  async function runOfflineCheck() {
    const reports = await listReports();
    setOfflineReportCount(reports.length);
  }

  async function prepareDiagnostics() {
    const reports = await listReports();
    const consent = { ...defaultPrivacyConsent, diagnosticsExport: true };
    const packet = buildDiagnosticSupportPacket({
      activePlan: appConfig.activePlan,
      analysisProvider: appConfig.analysisProvider,
      cloudSync: canSyncToCloud(consent),
      diagnosticsExport: consent.diagnosticsExport,
      events: [
        createDiagnosticEvent({
          context: {
            activePlan: appConfig.activePlan,
            analysisProvider: appConfig.analysisProvider,
            reportCount: reports.length,
          },
          message: 'Privacy-safe diagnostics prepared locally.',
          name: 'diagnostics.prepared',
          release: '1.0.0',
        }),
      ],
      privacyMode: appConfig.privacyMode,
      rawVideoExport: canExportRawVideo(consent),
      release: '1.0.0',
      reportSnapshots: reports.map((report) => ({
        analysisMs: report.performance.analysisMs,
        budgetStatus: report.performance.budgetStatus,
        framesPerSecond: report.performance.framesPerSecond,
        processedFrames: report.engine.processedFrames,
        provider: report.engine.provider,
        qualityScore: report.analysisQuality.score,
        storedArtifacts: report.privacy.storedArtifacts,
        videoLeavesDevice: report.privacy.videoLeavesDevice,
        warningCount: report.analysisQuality.warnings.length,
      })),
      videoAnalysisProvider: appConfig.videoAnalysisProvider,
    });

    setDiagnostics(assertDiagnosticPacketIsPrivacySafe(packet));
  }

  return (
    <Screen>
      <Header
        eyebrow="Privacy"
        title="No upload by default"
        subtitle={`Provider: ${appConfig.analysisProvider} · mode: ${appConfig.privacyMode}`}
      />

      <Section title="On-device policy">
        {items.map((item) => {
          const Icon = item.icon;
          return (
            <View key={item.title} style={styles.item}>
              <View style={styles.icon}>
                <Icon color={theme.colors.brand} size={21} />
              </View>
              <View style={styles.copy}>
                <Text style={styles.title}>{item.title}</Text>
                <Text style={styles.body}>{item.body}</Text>
              </View>
            </View>
          );
        })}
      </Section>

      <Section
        title="Airplane-mode readiness"
        caption="Check whether the default workflow can run without a network connection."
        trailing={
          <Pressable onPress={() => void runOfflineCheck()} style={styles.action}>
            <Text style={styles.actionText}>Check</Text>
          </Pressable>
        }
      >
        <View style={styles.offlineCard}>
          <View style={styles.diagnosticsTop}>
            <WifiOff color={offlineReadiness.status === 'blocked' ? theme.colors.coral : theme.colors.success} size={18} />
            <Text style={styles.diagnosticsTitle}>{offlineReadiness.title}</Text>
            <Text
              style={[
                styles.statusBadge,
                offlineReadiness.status === 'blocked' ? styles.statusBadgeBlocked : null,
                offlineReadiness.status === 'review' ? styles.statusBadgeReview : null,
              ]}
            >
              {offlineReadiness.status}
            </Text>
          </View>
          <Text style={styles.diagnosticsBody}>{offlineReadiness.action}</Text>
          <View style={styles.checkList}>
            {offlineReadiness.checks.map((check) => (
              <View key={check.id} style={styles.checkRow}>
                <View style={styles.checkCopy}>
                  <Text style={styles.checkLabel}>{check.label}</Text>
                  <Text style={styles.checkDetail}>{check.detail}</Text>
                </View>
                <Text style={[styles.checkStatus, check.status === 'fail' ? styles.checkStatusFail : null]}>
                  {check.status}
                </Text>
              </View>
            ))}
          </View>
        </View>
      </Section>

      <Section
        title="Diagnostics"
        caption="Prepare a local support packet without raw video, video URI, key frames, or pose landmarks."
        trailing={
          <Pressable onPress={() => void prepareDiagnostics()} style={styles.action}>
            <Text style={styles.actionText}>Prepare</Text>
          </Pressable>
        }
      >
        <View style={styles.diagnosticsCard}>
          <View style={styles.diagnosticsTop}>
            <ShieldCheck color={theme.colors.success} size={18} />
            <Text style={styles.diagnosticsTitle}>Privacy-safe support packet</Text>
          </View>
          <Text style={styles.diagnosticsBody}>
            Includes aggregate quality, provider, consent, and sanitized event data. Excludes raw media and pose artifacts.
          </Text>
          {diagnostics ? (
            <View style={styles.payloadBox}>
              <Text style={styles.payloadText}>{JSON.stringify(diagnostics, null, 2)}</Text>
            </View>
          ) : null}
        </View>
      </Section>
    </Screen>
  );
}

const styles = StyleSheet.create({
  item: {
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    borderColor: theme.colors.line,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    flexDirection: 'row',
    gap: theme.spacing.md,
    padding: theme.spacing.md,
  },
  icon: {
    alignItems: 'center',
    backgroundColor: theme.colors.brandSoft,
    borderRadius: theme.radius.sm,
    height: 42,
    justifyContent: 'center',
    width: 42,
  },
  copy: {
    flex: 1,
    gap: 3,
  },
  title: {
    color: theme.colors.ink,
    fontSize: 16,
    fontWeight: '900',
  },
  body: {
    color: theme.colors.muted,
    fontSize: 13,
    lineHeight: 18,
  },
  action: {
    backgroundColor: theme.colors.brand,
    borderRadius: theme.radius.sm,
    paddingHorizontal: 12,
    paddingVertical: 9,
  },
  actionText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '900',
  },
  diagnosticsBody: {
    color: theme.colors.muted,
    fontSize: 13,
    lineHeight: 18,
  },
  diagnosticsCard: {
    backgroundColor: theme.colors.surface,
    borderColor: theme.colors.line,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    gap: theme.spacing.sm,
    padding: theme.spacing.md,
  },
  diagnosticsTitle: {
    color: theme.colors.ink,
    flex: 1,
    fontSize: 15,
    fontWeight: '900',
  },
  diagnosticsTop: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: theme.spacing.sm,
  },
  checkCopy: {
    flex: 1,
    gap: 2,
  },
  checkDetail: {
    color: theme.colors.muted,
    fontSize: 12,
    fontWeight: '700',
    lineHeight: 16,
  },
  checkLabel: {
    color: theme.colors.ink,
    fontSize: 13,
    fontWeight: '900',
  },
  checkList: {
    gap: 7,
  },
  checkRow: {
    alignItems: 'center',
    backgroundColor: theme.colors.surfaceAlt,
    borderRadius: theme.radius.sm,
    flexDirection: 'row',
    gap: theme.spacing.sm,
    padding: theme.spacing.sm,
  },
  checkStatus: {
    color: theme.colors.brandDark,
    fontSize: 11,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  checkStatusFail: {
    color: theme.colors.coral,
  },
  offlineCard: {
    backgroundColor: theme.colors.surface,
    borderColor: theme.colors.line,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    gap: theme.spacing.sm,
    padding: theme.spacing.md,
  },
  payloadBox: {
    backgroundColor: theme.colors.surfaceAlt,
    borderRadius: theme.radius.sm,
    maxHeight: 240,
    overflow: 'hidden',
    padding: theme.spacing.sm,
  },
  payloadText: {
    color: theme.colors.text,
    fontFamily: 'monospace',
    fontSize: 11,
    lineHeight: 15,
  },
  statusBadge: {
    backgroundColor: '#E8F4EE',
    borderRadius: theme.radius.sm,
    color: theme.colors.success,
    fontSize: 11,
    fontWeight: '900',
    overflow: 'hidden',
    paddingHorizontal: 9,
    paddingVertical: 6,
    textTransform: 'uppercase',
  },
  statusBadgeBlocked: {
    backgroundColor: '#FBEDEA',
    color: theme.colors.coral,
  },
  statusBadgeReview: {
    backgroundColor: '#FFF3DF',
    color: theme.colors.amber,
  },
});
