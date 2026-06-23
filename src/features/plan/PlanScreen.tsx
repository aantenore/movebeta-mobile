import { useEffect, useState } from 'react';
import { Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import Constants from 'expo-constants';
import { ArrowUpRight, CheckCircle2, Circle, Download, Share2, ShieldCheck, TriangleAlert } from 'lucide-react-native';

import { Header } from '@/components/Header';
import { Screen } from '@/components/Screen';
import { Section } from '@/components/Section';
import { buildBillingReadinessSummary } from '@/core/billingReadiness';
import { buildCommercialReadinessPacket } from '@/core/commercialReadinessPacket';
import { appConfig } from '@/core/config';
import appJson from '../../../app.json';
import featureCompletionReport from '../../../docs/sdlc/feature-completion-report.json';
import iosToolchainReport from '../../../docs/sdlc/ios-toolchain-report.json';
import modelAssetProvenanceReport from '../../../docs/sdlc/model-asset-provenance-report.json';
import launchReadinessReport from '../../../docs/sdlc/launch-readiness-report.json';
import modelAnalysisReplayReport from '../../../docs/sdlc/model-analysis-replay-report.json';
import modelVerificationSuiteReport from '../../../docs/sdlc/model-verification-suite-report.json';
import moveNetReadinessReport from '../../../docs/sdlc/movenet-readiness-report.json';
import moveNetStaticAssetsReport from '../../../docs/sdlc/movenet-static-assets-report.json';
import pwaReadinessReport from '../../../docs/sdlc/pwa-readiness-report.json';
import storeSubmissionReport from '../../../docs/store/store-submission-packet.json';
import vercelDeploymentReport from '../../../docs/sdlc/vercel-deployment-report.json';
import vercelWorkflowReport from '../../../docs/sdlc/vercel-workflow-report.json';
import { buildEvidenceCollectionPlan } from '@/core/evidenceCollectionPlan';
import { buildFieldValidationOpsPacket, type FieldValidationOpsPacket } from '@/core/fieldValidationOpsPacket';
import { buildLaunchReadinessSummary, type LaunchReadinessTrack } from '@/core/launchReadiness';
import { buildModelEvidenceSummary } from '@/core/modelEvidence';
import { buildModelVerificationSuite, type ModelVerificationSuite } from '@/core/modelVerificationSuite';
import { buildIosToolchainSetupPacket, type IosToolchainSetupPacket } from '@/core/iosToolchainSetupPacket';
import {
  buildNativeQaEvidenceComposerExport,
  buildNativeQaEvidenceComposerPreview,
  type NativeQaEvidenceComposerPreview,
  type NativeQaEvidenceComposerRun,
} from '@/core/nativeQaEvidenceComposer';
import { buildNativeQaEvidenceImportPreview, type NativeQaEvidenceImportPreview } from '@/core/nativeQaEvidenceImport';
import { buildNativeQaEvidenceKit } from '@/core/nativeQaEvidenceKit';
import { buildNativeQaRunbookPacket } from '@/core/nativeQaRunbookPacket';
import { buildNativeQaEvidenceDraft, validateNativeQaEvidenceForApp } from '@/core/nativeQaEvidenceValidation';
import { theme } from '@/core/theme';
import { buildPlanCatalog, buildPlanRecommendation, type PlanCatalogItem } from '@/core/planCatalog';
import { buildProviderReadinessSummary, type ProviderReadinessStatus } from '@/core/providerReadiness';
import { buildReleaseBlockerIssuePacket, type ReleaseBlockerIssuePacket } from '@/core/releaseBlockerIssuePacket';
import {
  buildReleaseBlockerIssueFilingPlan,
  type ReleaseBlockerIssueFilingPlan,
} from '@/core/releaseBlockerIssueFilingPlan';
import {
  buildReleaseBlockerIssueWebLinksPacket,
  type ReleaseBlockerIssueWebLinksPacket,
} from '@/core/releaseBlockerIssueWebLinks';
import { buildReleaseCriticalPath, type ReleaseCriticalPath } from '@/core/releaseCriticalPath';
import {
  buildReleaseEvidenceReconciliation,
  parseReleaseEvidenceReconciliationInput,
  type ReleaseEvidenceReconciliation,
} from '@/core/releaseEvidenceReconciliation';
import {
  buildReleaseEvidenceFreshness,
  buildReleaseEvidenceFreshnessArtifactInputs,
  type ReleaseEvidenceFreshness,
} from '@/core/releaseEvidenceFreshness';
import {
  buildPwaInstallGuidancePacket,
  buildPwaRuntimeReadiness,
  type PwaRuntimeProbe,
  type PwaRuntimeReadiness,
} from '@/core/pwaRuntimeReadiness';
import { buildReleaseEvidenceScenarioPlanner, type ReleaseEvidenceScenarioPlanner } from '@/core/releaseEvidenceScenarios';
import { buildReleaseEvidencePacket, type ReleaseEvidencePacket } from '@/core/releaseEvidencePacket';
import { buildReleaseUnblockChecklist } from '@/core/releaseUnblockChecklist';
import { buildReleaseUnblockPacket } from '@/core/releaseUnblockPacket';
import { buildSafetyLanguageGuard, type SafetyLanguageSource } from '@/core/safetyLanguage';
import { buildStoreCredentialsSetupPacket, type StoreCredentialsSetupPacket } from '@/core/storeCredentialsSetupPacket';
import { buildStoreReadinessManifest, type ExpoStoreConfig } from '@/core/storeReadiness';
import { buildStoreSubmissionPacket, type StoreSubmissionPacket } from '@/core/storeSubmissionPacket';
import { buildValidationCollectionPacket } from '@/core/validationCollectionPacket';
import { buildValidationConsentPacket, type ValidationConsentPacket } from '@/core/validationConsentPacket';
import { buildValidationPilotKit, type ValidationPilotKit } from '@/core/validationPilotKit';
import { sharePreparedExport as sharePreparedExportFile } from '@/core/preparedExportShare';
import { selectionFeedback } from '@/core/haptics';

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

function providerStatusLabel(status: ProviderReadinessStatus) {
  if (status === 'ready') return 'Ready';
  if (status === 'blocked') return 'Blocked';
  return 'Review';
}

type FeatureCompletionReport = typeof featureCompletionReport;
type ModelAssetProvenanceReport = typeof modelAssetProvenanceReport;
type MoveNetStaticAssetsReport = typeof moveNetStaticAssetsReport;
type VercelDeploymentReport = typeof vercelDeploymentReport;
type VercelWorkflowReport = typeof vercelWorkflowReport;

function featureCompletionStatusLabel(status: FeatureCompletionReport['status']) {
  if (status === 'ready') return 'Ready';
  if (status === 'external-blocked') return 'External';
  return 'Gaps';
}

function reconciliationStatusLabel(status: ReleaseEvidenceReconciliation['summary']['status']) {
  if (status === 'ready') return 'Ready';
  if (status === 'would-improve') return 'Improves';
  if (status === 'invalid-evidence') return 'Invalid';
  return 'Blocked';
}

function criticalPathStatusLabel(status: ReleaseCriticalPath['steps'][number]['status']) {
  if (status === 'ready') return 'Ready';
  if (status === 'ready-to-start') return 'Start';
  return 'Blocked';
}

function releaseScenarioStatusLabel(status: ReleaseEvidenceScenarioPlanner['scenarios'][number]['status']) {
  if (status === 'ready') return 'Ready';
  if (status === 'would-improve') return 'Improves';
  if (status === 'needs-prerequisite') return 'Prereq';
  return 'No impact';
}

function freshnessStatusLabel(status: ReleaseEvidenceFreshness['artifacts'][number]['status']) {
  if (status === 'fresh') return 'Fresh';
  if (status === 'stale') return 'Stale';
  if (status === 'invalid-date') return 'Invalid';
  return 'Missing';
}

function vercelDeploymentStatusLabel(status: VercelDeploymentReport['summary']['status']) {
  if (status === 'linked') return 'Linked';
  if (status === 'static-ready') return 'Static';
  return 'Blocked';
}

function vercelWorkflowStatusLabel(status: VercelWorkflowReport['summary']['status']) {
  if (status === 'active-ready') return 'Active';
  if (status === 'template-ready') return 'Template';
  return 'Blocked';
}

function pwaRuntimeStatusLabel(status: PwaRuntimeReadiness['summary']['status']) {
  if (status === 'installed') return 'Installed';
  if (status === 'installable') return 'Install';
  if (status === 'runtime-ready') return 'Ready';
  if (status === 'native') return 'Native';
  return 'Blocked';
}

function staticAssetStatusLabel(status: MoveNetStaticAssetsReport['summary']['status']) {
  return status === 'ready' ? 'Ready' : 'Blocked';
}

function modelAssetProvenanceStatusLabel(status: ModelAssetProvenanceReport['summary']['status']) {
  if (status === 'ready') return 'Ready';
  if (status === 'review') return 'Review';
  return 'Blocked';
}

function formatBytes(value: number) {
  if (value >= 1_000_000) return `${Math.round(value / 100_000) / 10} MB`;
  if (value >= 1_000) return `${Math.round(value / 100) / 10} KB`;
  return `${value} B`;
}

type BeforeInstallPromptEventLike = Event & {
  prompt?: () => Promise<void>;
  userChoice?: Promise<{ outcome?: string }>;
};

function nativePwaProbe(): PwaRuntimeProbe {
  return {
    cacheApiSupported: false,
    installPromptAvailable: false,
    installedStandalone: false,
    online: true,
    runtime: 'native',
    serviceWorkerControlled: false,
    serviceWorkerRegistered: false,
    serviceWorkerSupported: false,
    updateAvailable: false,
  };
}

function browserPwaProbe(patch: Partial<PwaRuntimeProbe> = {}): PwaRuntimeProbe {
  if (Platform.OS !== 'web' || typeof window === 'undefined' || typeof navigator === 'undefined') {
    return nativePwaProbe();
  }

  const navigatorWithStandalone = navigator as Navigator & { standalone?: boolean };
  const serviceWorkerContainer = navigator.serviceWorker;

  return {
    cacheApiSupported: 'caches' in window,
    installPromptAvailable: false,
    installedStandalone:
      window.matchMedia?.('(display-mode: standalone)')?.matches === true || navigatorWithStandalone.standalone === true,
    online: navigator.onLine !== false,
    runtime: 'web',
    serviceWorkerControlled: Boolean(serviceWorkerContainer?.controller),
    serviceWorkerRegistered: false,
    serviceWorkerSupported: 'serviceWorker' in navigator,
    updateAvailable: false,
    ...patch,
  };
}

function usePwaRuntimeReadiness() {
  const [deferredInstallPrompt, setDeferredInstallPrompt] = useState<BeforeInstallPromptEventLike | null>(null);
  const [probe, setProbe] = useState<PwaRuntimeProbe>(() => browserPwaProbe());

  useEffect(() => {
    if (Platform.OS !== 'web' || typeof window === 'undefined' || typeof navigator === 'undefined') {
      setProbe(nativePwaProbe());
      return undefined;
    }

    let cancelled = false;

    const mergeProbe = (patch: Partial<PwaRuntimeProbe> = {}) => {
      if (cancelled) return;
      setProbe((current) =>
        browserPwaProbe({
          installPromptAvailable: current.installPromptAvailable,
          serviceWorkerRegistered: current.serviceWorkerRegistered,
          updateAvailable: current.updateAvailable,
          ...patch,
        }),
      );
    };

    const refreshServiceWorkerState = async () => {
      if (!('serviceWorker' in navigator)) {
        mergeProbe({ serviceWorkerRegistered: false, serviceWorkerSupported: false });
        return;
      }

      const registration = await navigator.serviceWorker.getRegistration?.();
      const updateAvailable = Boolean(registration?.waiting || registration?.installing);
      mergeProbe({
        serviceWorkerRegistered: Boolean(registration),
        updateAvailable,
      });

      registration?.addEventListener('updatefound', () => {
        mergeProbe({
          serviceWorkerRegistered: true,
          updateAvailable: true,
        });
      });
    };

    const handleBeforeInstallPrompt = (event: Event) => {
      event.preventDefault();
      const promptEvent = event as BeforeInstallPromptEventLike;
      setDeferredInstallPrompt(promptEvent);
      mergeProbe({ installPromptAvailable: true });
    };
    const handleOnlineState = () => mergeProbe();
    const handleControllerChange = () => mergeProbe({ serviceWorkerControlled: true, serviceWorkerRegistered: true });

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('online', handleOnlineState);
    window.addEventListener('offline', handleOnlineState);
    navigator.serviceWorker?.addEventListener('controllerchange', handleControllerChange);
    void refreshServiceWorkerState();
    void navigator.serviceWorker?.ready.then(() => mergeProbe({ serviceWorkerRegistered: true }));

    return () => {
      cancelled = true;
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('online', handleOnlineState);
      window.removeEventListener('offline', handleOnlineState);
      navigator.serviceWorker?.removeEventListener('controllerchange', handleControllerChange);
    };
  }, []);

  async function promptInstall() {
    if (!deferredInstallPrompt?.prompt) return;
    await deferredInstallPrompt.prompt();
    const choice = await deferredInstallPrompt.userChoice?.catch(() => undefined);
    setDeferredInstallPrompt(null);
    setProbe((current) =>
      browserPwaProbe({
        installPromptAvailable: false,
        installedStandalone: choice?.outcome === 'accepted' || current.installedStandalone,
        serviceWorkerRegistered: current.serviceWorkerRegistered,
        updateAvailable: current.updateAvailable,
      }),
    );
  }

  return {
    promptInstall,
    readiness: buildPwaRuntimeReadiness(probe),
  };
}

const defaultNativeQaComposerRuns: NativeQaEvidenceComposerRun[] = [
  {
    allWorkflowsPassed: false,
    analysisSeconds: '',
    batteryDropPct: '',
    buildId: '',
    clipDurationSeconds: '10',
    clipId: '',
    deviceName: '',
    osVersion: '',
    platform: 'android',
    thermalState: 'nominal',
  },
  {
    allWorkflowsPassed: false,
    analysisSeconds: '',
    batteryDropPct: '',
    buildId: '',
    clipDurationSeconds: '10',
    clipId: '',
    deviceName: '',
    osVersion: '',
    platform: 'ios',
    thermalState: 'nominal',
  },
];

function buildRuntimeStoreReadinessManifest() {
  const expo = Constants.expoConfig;
  const staticExpo = appJson.expo;
  const extra = expo?.extra as { storeReadinessConfig?: ExpoStoreConfig } | undefined;
  const staticExtra = staticExpo.extra as { storeReadinessConfig?: ExpoStoreConfig } | undefined;
  const fallback = extra?.storeReadinessConfig ?? staticExtra?.storeReadinessConfig ?? {};

  return buildStoreReadinessManifest({
    android: {
      package: expo?.android?.package ?? fallback.android?.package ?? staticExpo.android?.package,
      permissions: expo?.android?.permissions ?? fallback.android?.permissions ?? staticExpo.android?.permissions,
    },
    ios: {
      bundleIdentifier: expo?.ios?.bundleIdentifier ?? fallback.ios?.bundleIdentifier ?? staticExpo.ios?.bundleIdentifier,
      infoPlist:
        (expo?.ios?.infoPlist as Record<string, string> | undefined) ?? fallback.ios?.infoPlist ?? staticExpo.ios?.infoPlist,
    },
    name: expo?.name ?? fallback.name ?? staticExpo.name,
    version: expo?.version ?? fallback.version ?? staticExpo.version,
  });
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

function FeatureCompletionCard({ report }: { report: FeatureCompletionReport }) {
  const isReady = report.status === 'ready';
  const hasInternalGaps = report.summary.internalGapCount > 0;

  return (
    <View style={styles.qaKit}>
      <View style={styles.qaValidationTop}>
        <View style={styles.launchTrackTitleGroup}>
          <Text style={styles.qaValidationTitle}>Feature completion audit</Text>
          <Text style={styles.qaKitText}>{report.summary.nextAction}</Text>
        </View>
        <Text style={[styles.launchStatus, isReady ? styles.launchStatusReady : hasInternalGaps ? styles.launchStatusBlocked : null]}>
          {featureCompletionStatusLabel(report.status)}
        </Text>
      </View>
      <View style={styles.qaKitHero}>
        <View style={styles.qaKitMetric}>
          <Text style={styles.qaKitMetricValue}>
            {report.summary.taskDoneCount}/{report.summary.taskItemCount}
          </Text>
          <Text style={styles.qaKitMetricLabel}>tasks</Text>
        </View>
        <View style={styles.qaKitMetric}>
          <Text style={styles.qaKitMetricValue}>
            {report.summary.backlogDoneCount}/{report.summary.backlogItemCount}
          </Text>
          <Text style={styles.qaKitMetricLabel}>backlog</Text>
        </View>
        <View style={styles.qaKitMetric}>
          <Text style={styles.qaKitMetricValue}>{report.summary.internalGapCount}</Text>
          <Text style={styles.qaKitMetricLabel}>internal gaps</Text>
        </View>
      </View>
      <View style={styles.qaPlatformList}>
        {report.launchReadiness.openChecks.slice(0, 5).map((check) => (
          <View key={check.key} style={styles.qaWorkflowRow}>
            <TriangleAlert color={theme.colors.amber} size={14} />
            <View style={styles.launchTrackTitleGroup}>
              <Text style={styles.qaWorkflowText}>{check.label}</Text>
              <Text style={styles.qaPlatformMore}>
                {check.owner}: {check.action}
              </Text>
            </View>
          </View>
        ))}
      </View>
    </View>
  );
}

function NativeQaEvidenceImportPanel({
  input,
  onChange,
  onClear,
  preview,
}: {
  input: string;
  onChange: (value: string) => void;
  onClear: () => void;
  preview: NativeQaEvidenceImportPreview;
}) {
  const isReady = preview.status === 'ready';
  const isEmpty = preview.status === 'empty';
  const isInvalid = preview.status === 'invalid-json';

  return (
    <View style={styles.nativeEvidenceImport}>
      <View style={styles.qaValidationTop}>
        <View style={styles.launchTrackTitleGroup}>
          <Text style={styles.qaValidationTitle}>Physical-device evidence import</Text>
          <Text style={styles.qaKitText}>Paste the local runbook JSON to preview the same checks before committing proof.</Text>
        </View>
        <Text
          style={[
            styles.launchStatus,
            isReady ? styles.launchStatusReady : isEmpty ? null : styles.launchStatusBlocked,
          ]}
        >
          {preview.badge}
        </Text>
      </View>
      <TextInput
        accessibilityLabel="Paste native QA evidence JSON"
        multiline
        onChangeText={onChange}
        placeholder='{"appVersion":"1.0.0","generatedAt":"...","runs":[...]}'
        placeholderTextColor={theme.colors.muted}
        style={styles.nativeEvidenceInput}
        value={input}
      />
      <View style={styles.nativeEvidenceStats}>
        <Text style={styles.qaValidationStat}>
          {preview.readyRuns}/{preview.totalRuns} ready runs
        </Text>
        <Text style={styles.qaValidationStat}>{preview.blockingChecks} blocking checks</Text>
        <Text style={styles.qaValidationStat}>Local only</Text>
      </View>
      <Text style={styles.qaKitAction}>{preview.action}</Text>
      {isInvalid && preview.parseError ? <Text style={styles.nativeEvidenceError}>{preview.parseError}</Text> : null}
      {preview.failedChecks.length > 0 ? (
        <View style={styles.qaPlatformList}>
          {preview.failedChecks.map((check) => (
            <View key={check.id} style={styles.qaWorkflowRow}>
              <TriangleAlert color={theme.colors.coral} size={14} />
              <View style={styles.launchTrackTitleGroup}>
                <Text style={styles.qaWorkflowText}>{check.label}</Text>
                <Text style={styles.qaPlatformMore}>{check.detail}</Text>
              </View>
            </View>
          ))}
        </View>
      ) : null}
      {preview.runSummaries.length > 0 ? (
        <View style={styles.nativeRunList}>
          {preview.runSummaries.map((run) => (
            <View key={`${run.platform}-${run.totalChecks}`} style={styles.nativeRunRow}>
              {run.status === 'pass' ? (
                <CheckCircle2 color={theme.colors.success} size={14} />
              ) : (
                <TriangleAlert color={theme.colors.coral} size={14} />
              )}
              <Text style={styles.nativeRunLabel}>
                {run.platform}: {run.passedChecks}/{run.totalChecks} checks
              </Text>
            </View>
          ))}
        </View>
      ) : null}
      {input.trim().length > 0 ? (
        <View style={styles.nativeEvidenceActions}>
          <Pressable accessibilityLabel="Clear native QA evidence JSON" onPress={onClear} style={styles.nativeEvidenceButton}>
            <Text style={styles.nativeEvidenceButtonText}>Clear</Text>
          </Pressable>
        </View>
      ) : null}
    </View>
  );
}

function NativeQaComposerInput({
  label,
  onChange,
  placeholder,
  value,
}: {
  label: string;
  onChange: (value: string) => void;
  placeholder?: string;
  value: string;
}) {
  return (
    <View style={styles.composerField}>
      <Text style={styles.composerLabel}>{label}</Text>
      <TextInput
        onChangeText={onChange}
        placeholder={placeholder}
        placeholderTextColor={theme.colors.muted}
        style={styles.composerInput}
        value={value}
      />
    </View>
  );
}

function NativeQaComposerRunCard({
  onChange,
  run,
}: {
  onChange: (platform: NativeQaEvidenceComposerRun['platform'], patch: Partial<NativeQaEvidenceComposerRun>) => void;
  run: NativeQaEvidenceComposerRun;
}) {
  const label = run.platform === 'android' ? 'Android physical run' : 'iOS physical run';

  return (
    <View style={styles.composerRun}>
      <View style={styles.qaValidationTop}>
        <Text style={styles.qaPlatformTitle}>{label}</Text>
        <Pressable
          accessibilityLabel={`Toggle ${run.platform} workflow pass state`}
          onPress={() => onChange(run.platform, { allWorkflowsPassed: !run.allWorkflowsPassed })}
          style={[styles.composerToggle, run.allWorkflowsPassed ? styles.composerToggleReady : null]}
        >
          <Text style={[styles.composerToggleText, run.allWorkflowsPassed ? styles.composerToggleTextReady : null]}>
            {run.allWorkflowsPassed ? 'Workflows pass' : 'Mark pass'}
          </Text>
        </Pressable>
      </View>
      <View style={styles.composerGrid}>
        <NativeQaComposerInput
          label="Device"
          onChange={(value) => onChange(run.platform, { deviceName: value })}
          placeholder={run.platform === 'android' ? 'Pixel 9' : 'iPhone 16'}
          value={String(run.deviceName ?? '')}
        />
        <NativeQaComposerInput
          label="OS"
          onChange={(value) => onChange(run.platform, { osVersion: value })}
          placeholder={run.platform === 'android' ? 'Android 16' : 'iOS 20'}
          value={String(run.osVersion ?? '')}
        />
        <NativeQaComposerInput
          label="Build"
          onChange={(value) => onChange(run.platform, { buildId: value })}
          placeholder="1.0.0-internal-42"
          value={String(run.buildId ?? '')}
        />
        <NativeQaComposerInput
          label="Clip id"
          onChange={(value) => onChange(run.platform, { clipId: value })}
          placeholder={`${run.platform}-qa-clip-001`}
          value={String(run.clipId ?? '')}
        />
        <NativeQaComposerInput
          label="Clip seconds"
          onChange={(value) => onChange(run.platform, { clipDurationSeconds: value })}
          placeholder="10"
          value={String(run.clipDurationSeconds ?? '')}
        />
        <NativeQaComposerInput
          label="Analysis seconds"
          onChange={(value) => onChange(run.platform, { analysisSeconds: value })}
          placeholder="7"
          value={String(run.analysisSeconds ?? '')}
        />
        <NativeQaComposerInput
          label="Battery %"
          onChange={(value) => onChange(run.platform, { batteryDropPct: value })}
          placeholder="2"
          value={String(run.batteryDropPct ?? '')}
        />
        <NativeQaComposerInput
          label="Thermal"
          onChange={(value) => onChange(run.platform, { thermalState: value })}
          placeholder="nominal"
          value={String(run.thermalState ?? '')}
        />
      </View>
    </View>
  );
}

function NativeQaEvidenceComposerPanel({
  onPrepareComposedExport,
  onRunChange,
  onUseComposedJson,
  preview,
  runs,
}: {
  onPrepareComposedExport: () => void;
  onRunChange: (platform: NativeQaEvidenceComposerRun['platform'], patch: Partial<NativeQaEvidenceComposerRun>) => void;
  onUseComposedJson: () => void;
  preview: NativeQaEvidenceComposerPreview;
  runs: NativeQaEvidenceComposerRun[];
}) {
  const isReady = preview.status === 'ready';

  return (
    <View style={styles.nativeEvidenceComposer}>
      <View style={styles.qaValidationTop}>
        <View style={styles.launchTrackTitleGroup}>
          <Text style={styles.qaValidationTitle}>Native QA evidence composer</Text>
          <Text style={styles.qaKitText}>Build validator-ready evidence from real device measurements without pasting raw file paths.</Text>
        </View>
        <Text style={[styles.launchStatus, isReady ? styles.launchStatusReady : styles.launchStatusBlocked]}>
          {preview.badge}
        </Text>
      </View>
      <View style={styles.qaValidationStats}>
        <Text style={styles.qaValidationStat}>
          {preview.readyRuns}/{preview.totalRuns} ready runs
        </Text>
        <Text style={styles.qaValidationStat}>{preview.blockingChecks} blocking checks</Text>
        <Text style={styles.qaValidationStat}>Local only</Text>
      </View>
      <Text style={styles.qaKitAction}>{preview.action}</Text>
      <View style={styles.composerRuns}>
        {runs.map((run) => (
          <NativeQaComposerRunCard key={run.platform} onChange={onRunChange} run={run} />
        ))}
      </View>
      <View style={styles.planActionRow}>
        <Pressable accessibilityLabel="Use composed native QA evidence JSON" onPress={onUseComposedJson} style={styles.planAction}>
          <Download color={theme.colors.brand} size={16} />
          <Text style={styles.planActionText}>Use composed JSON</Text>
        </Pressable>
        <Pressable accessibilityLabel="Prepare composed native QA evidence export" onPress={onPrepareComposedExport} style={styles.planAction}>
          <Share2 color={theme.colors.brand} size={16} />
          <Text style={styles.planActionText}>Evidence JSON</Text>
        </Pressable>
      </View>
    </View>
  );
}

function NativeQaEvidenceKitCard({
  composerPreview,
  composerRuns,
  importInput,
  importPreview,
  kit,
  onClearImport,
  onComposerRunChange,
  onImportChange,
  onPrepareComposedExport,
  onPrepareRunbook,
  onUseComposedEvidence,
}: {
  composerPreview: NativeQaEvidenceComposerPreview;
  composerRuns: NativeQaEvidenceComposerRun[];
  importInput: string;
  importPreview: NativeQaEvidenceImportPreview;
  kit: ReturnType<typeof buildNativeQaEvidenceKit>;
  onClearImport: () => void;
  onComposerRunChange: (
    platform: NativeQaEvidenceComposerRun['platform'],
    patch: Partial<NativeQaEvidenceComposerRun>,
  ) => void;
  onImportChange: (value: string) => void;
  onPrepareComposedExport: () => void;
  onPrepareRunbook: () => void;
  onUseComposedEvidence: () => void;
}) {
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
      <View style={styles.planActionRow}>
        <Pressable accessibilityLabel="Prepare native QA runbook" onPress={onPrepareRunbook} style={styles.planAction}>
          <Download color={theme.colors.brand} size={16} />
          <Text style={styles.planActionText}>QA runbook</Text>
        </Pressable>
      </View>
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
      <NativeQaEvidenceComposerPanel
        onPrepareComposedExport={onPrepareComposedExport}
        onRunChange={onComposerRunChange}
        onUseComposedJson={onUseComposedEvidence}
        preview={composerPreview}
        runs={composerRuns}
      />
      <NativeQaEvidenceImportPanel
        input={importInput}
        onChange={onImportChange}
        onClear={onClearImport}
        preview={importPreview}
      />
    </View>
  );
}

function ModelEvidenceCard({ evidence }: { evidence: ReturnType<typeof buildModelEvidenceSummary> }) {
  const isReady = evidence.status === 'ready';
  const isDegraded = evidence.status === 'degraded' || evidence.status === 'missing';

  return (
    <View style={styles.qaKit}>
      <View style={styles.qaValidationTop}>
        <View style={styles.launchTrackTitleGroup}>
          <Text style={styles.qaValidationTitle}>{evidence.modelName}</Text>
          <Text style={styles.qaKitText}>{evidence.provider}</Text>
        </View>
        <Text style={[styles.launchStatus, isReady ? styles.launchStatusReady : isDegraded ? styles.launchStatusBlocked : null]}>
          {evidence.badge}
        </Text>
      </View>
      <View style={styles.qaKitHero}>
        {evidence.metrics.map((metric) => (
          <View key={metric.key} style={styles.qaKitMetric}>
            <Text style={styles.qaKitMetricValue}>{metric.value}</Text>
            <Text style={styles.qaKitMetricLabel}>{metric.label}</Text>
          </View>
        ))}
      </View>
      <Text style={styles.qaKitAction}>{evidence.action}</Text>
      <Text style={styles.qaKitText}>{evidence.limitation}</Text>
      <View style={styles.qaPlatformList}>
        {evidence.checks.map((check) => (
          <View key={check.key} style={styles.qaWorkflowRow}>
            {check.status === 'ready' ? (
              <CheckCircle2 color={theme.colors.success} size={14} />
            ) : (
              <TriangleAlert color={check.status === 'blocked' ? theme.colors.coral : theme.colors.amber} size={14} />
            )}
            <View style={styles.launchTrackTitleGroup}>
              <Text style={styles.qaWorkflowText}>{check.label}</Text>
              <Text style={styles.qaPlatformMore}>{check.detail}</Text>
            </View>
          </View>
        ))}
      </View>
    </View>
  );
}

function ModelVerificationSuiteCard({ suite }: { suite: ModelVerificationSuite }) {
  const isReady = suite.status === 'ready';
  const isBlocked = suite.status === 'blocked';

  return (
    <View style={styles.qaKit}>
      <View style={styles.qaValidationTop}>
        <View style={styles.launchTrackTitleGroup}>
          <Text style={styles.qaValidationTitle}>Model verification suite</Text>
          <Text style={styles.qaKitText}>{suite.summary.nextAction}</Text>
        </View>
        <Text style={[styles.launchStatus, isReady ? styles.launchStatusReady : isBlocked ? styles.launchStatusBlocked : null]}>
          {suite.status === 'technical-ready' ? 'Technical' : suite.status}
        </Text>
      </View>
      <View style={styles.qaKitHero}>
        <View style={styles.qaKitMetric}>
          <Text style={styles.qaKitMetricValue}>
            {suite.summary.passedChecks}/{suite.summary.totalChecks}
          </Text>
          <Text style={styles.qaKitMetricLabel}>checks</Text>
        </View>
        <View style={styles.qaKitMetric}>
          <Text style={styles.qaKitMetricValue}>
            {suite.coverage.replayAttempts.passed}/{suite.coverage.replayAttempts.total}
          </Text>
          <Text style={styles.qaKitMetricLabel}>replays</Text>
        </View>
        <View style={styles.qaKitMetric}>
          <Text style={styles.qaKitMetricValue}>{suite.coverage.wallAngles.covered.length}</Text>
          <Text style={styles.qaKitMetricLabel}>wall angles</Text>
        </View>
      </View>
      <Text style={styles.qaKitAction}>
        {suite.summary.technicalReady
          ? 'Runtime, replay, cue, metric, wall-angle, and privacy checks pass locally.'
          : 'Technical model verification is blocked.'}
      </Text>
      <Text style={styles.qaKitText}>
        Providers: {suite.coverage.providers.join(', ') || 'none'} · Metrics: {suite.coverage.metricIds.join(', ') || 'none'} · Cue outputs:{' '}
        {suite.coverage.cueCount}
      </Text>
      <View style={styles.qaPlatformList}>
        {suite.checks.map((check) => (
          <View key={check.key} style={styles.qaWorkflowRow}>
            {check.status === 'pass' ? (
              <CheckCircle2 color={theme.colors.success} size={14} />
            ) : (
              <TriangleAlert color={check.status === 'blocked' ? theme.colors.coral : theme.colors.amber} size={14} />
            )}
            <View style={styles.launchTrackTitleGroup}>
              <Text style={styles.qaWorkflowText}>{check.label}</Text>
              <Text style={styles.qaPlatformMore}>{check.detail}</Text>
            </View>
          </View>
        ))}
      </View>
    </View>
  );
}

function ProviderReadinessCard({ readiness }: { readiness: ReturnType<typeof buildProviderReadinessSummary> }) {
  const isReady = readiness.status === 'ready';
  const isBlocked = readiness.status === 'blocked';

  return (
    <View style={styles.qaKit}>
      <View style={styles.qaValidationTop}>
        <View style={styles.launchTrackTitleGroup}>
          <Text style={styles.qaValidationTitle}>{readiness.title}</Text>
          <Text style={styles.qaKitText}>{readiness.action}</Text>
        </View>
        <Text style={[styles.launchStatus, isReady ? styles.launchStatusReady : isBlocked ? styles.launchStatusBlocked : null]}>
          {providerStatusLabel(readiness.status)}
        </Text>
      </View>
      <View style={styles.qaKitHero}>
        <View style={styles.qaKitMetric}>
          <Text style={styles.providerMetricValue}>{readiness.primaryProvider}</Text>
          <Text style={styles.qaKitMetricLabel}>primary</Text>
        </View>
        <View style={styles.qaKitMetric}>
          <Text style={styles.providerMetricValue}>{readiness.fallbackProvider}</Text>
          <Text style={styles.qaKitMetricLabel}>fallback</Text>
        </View>
        <View style={styles.qaKitMetric}>
          <Text style={styles.providerMetricValue}>{readiness.nativeProvider ?? 'not-set'}</Text>
          <Text style={styles.qaKitMetricLabel}>native target</Text>
        </View>
      </View>
      <View style={styles.qaPlatformList}>
        {readiness.checks.map((check) => (
          <View key={check.id} style={styles.qaWorkflowRow}>
            {check.status === 'ready' ? (
              <CheckCircle2 color={theme.colors.success} size={14} />
            ) : (
              <TriangleAlert color={check.status === 'blocked' ? theme.colors.coral : theme.colors.amber} size={14} />
            )}
            <View style={styles.launchTrackTitleGroup}>
              <Text style={styles.qaWorkflowText}>{check.label}</Text>
              <Text style={styles.qaPlatformMore}>{check.detail}</Text>
            </View>
          </View>
        ))}
      </View>
    </View>
  );
}

function CommercialReadinessCard({
  onPreparePacket,
  readiness,
}: {
  onPreparePacket: () => void;
  readiness: ReturnType<typeof buildBillingReadinessSummary>;
}) {
  const isReady = readiness.status === 'ready';
  const isBlocked = readiness.status === 'blocked';

  return (
    <View style={styles.qaKit}>
      <View style={styles.qaValidationTop}>
        <View style={styles.launchTrackTitleGroup}>
          <Text style={styles.qaValidationTitle}>{readiness.title}</Text>
          <Text style={styles.qaKitText}>{readiness.action}</Text>
        </View>
        <Text style={[styles.launchStatus, isReady ? styles.launchStatusReady : isBlocked ? styles.launchStatusBlocked : null]}>
          {readiness.badge}
        </Text>
      </View>
      <View style={styles.qaKitHero}>
        <View style={styles.qaKitMetric}>
          <Text style={styles.providerMetricValue}>{readiness.providerLabel}</Text>
          <Text style={styles.qaKitMetricLabel}>provider</Text>
        </View>
        <View style={styles.qaKitMetric}>
          <Text style={styles.qaKitMetricValue}>{readiness.planMappingRatio}</Text>
          <Text style={styles.qaKitMetricLabel}>paid plans</Text>
        </View>
        <View style={styles.qaKitMetric}>
          <Text style={styles.providerMetricValue}>{readiness.receiptValidationLabel}</Text>
          <Text style={styles.qaKitMetricLabel}>receipts</Text>
        </View>
      </View>
      <View style={styles.planActionRow}>
        <Pressable accessibilityLabel="Prepare commercial readiness packet" onPress={onPreparePacket} style={styles.planAction}>
          <Download color={theme.colors.brand} size={16} />
          <Text style={styles.planActionText}>Commercial packet</Text>
        </Pressable>
      </View>
      <View style={styles.qaPlatformList}>
        {readiness.checks.map((check) => (
          <View key={check.id} style={styles.qaWorkflowRow}>
            {check.status === 'ready' ? (
              <CheckCircle2 color={theme.colors.success} size={14} />
            ) : (
              <TriangleAlert color={check.status === 'blocked' ? theme.colors.coral : theme.colors.amber} size={14} />
            )}
            <View style={styles.launchTrackTitleGroup}>
              <Text style={styles.qaWorkflowText}>{check.label}</Text>
              <Text style={styles.qaPlatformMore}>{check.detail}</Text>
            </View>
          </View>
        ))}
      </View>
    </View>
  );
}

function EvidenceCollectionPlanCard({
  consentPacket,
  onPrepareConsentPacket,
  onPreparePacket,
  onPreparePilotKit,
  plan,
  pilotKit,
}: {
  consentPacket: ValidationConsentPacket;
  onPrepareConsentPacket: () => void;
  onPreparePacket: () => void;
  onPreparePilotKit: () => void;
  plan: ReturnType<typeof buildEvidenceCollectionPlan>;
  pilotKit: ValidationPilotKit;
}) {
  return (
    <View style={styles.evidencePlan}>
      <View style={styles.evidencePlanTop}>
        <View style={styles.launchTrackTitleGroup}>
          <Text style={styles.evidencePlanTitle}>Validation collection</Text>
          <Text style={styles.qaPlatformMore}>Share-safe packet for product and coach reviewers.</Text>
        </View>
      </View>
      <View style={styles.planActionRow}>
        <Pressable accessibilityLabel="Prepare validation consent packet" onPress={onPrepareConsentPacket} style={styles.planAction}>
          <ShieldCheck color={theme.colors.brand} size={15} />
          <Text style={styles.planActionText}>Consent packet</Text>
        </Pressable>
        <Pressable accessibilityLabel="Prepare validation collection packet" onPress={onPreparePacket} style={styles.planAction}>
          <Download color={theme.colors.brand} size={15} />
          <Text style={styles.planActionText}>Packet</Text>
        </Pressable>
        <Pressable accessibilityLabel="Prepare validation pilot kit" onPress={onPreparePilotKit} style={styles.planAction}>
          <ShieldCheck color={theme.colors.brand} size={15} />
          <Text style={styles.planActionText}>Pilot kit</Text>
        </Pressable>
      </View>
      <View style={styles.evidencePlanHero}>
        <View style={styles.qaKitMetric}>
          <Text style={styles.qaKitMetricValue}>{plan.cueValidation.minClips}</Text>
          <Text style={styles.qaKitMetricLabel}>clips</Text>
        </View>
        <View style={styles.qaKitMetric}>
          <Text style={styles.qaKitMetricValue}>{plan.summary.estimatedReviewRows}</Text>
          <Text style={styles.qaKitMetricLabel}>review rows</Text>
        </View>
        <View style={styles.qaKitMetric}>
          <Text style={styles.qaKitMetricValue}>{plan.nativeQa.nativeWorkflowChecks}</Text>
          <Text style={styles.qaKitMetricLabel}>device checks</Text>
        </View>
        <View style={styles.qaKitMetric}>
          <Text style={styles.qaKitMetricValue}>{pilotKit.summary.pilotSprintCount}</Text>
          <Text style={styles.qaKitMetricLabel}>pilot sprints</Text>
        </View>
        <View style={styles.qaKitMetric}>
          <Text style={styles.qaKitMetricValue}>{consentPacket.summary.consentStepCount}</Text>
          <Text style={styles.qaKitMetricLabel}>consent steps</Text>
        </View>
      </View>
      <Text style={styles.qaKitAction}>{plan.summary.action}</Text>
      <View style={styles.evidencePlanGrid}>
        <View style={styles.evidencePlanItem}>
          <Text style={styles.evidencePlanTitle}>Cue validation</Text>
          <Text style={styles.qaKitText}>
            {plan.cueValidation.minDistinctReviewersPerCue} coach reviewers per cue · average score at least{' '}
            {plan.cueValidation.minAverageCueScore}/5 · max spread {plan.cueValidation.maxReviewerScoreSpreadPerCriterion}/4
          </Text>
          <Text style={styles.qaPlatformMore}>Angles: {plan.cueValidation.requiredWallAngles.join(', ')}</Text>
        </View>
        <View style={styles.evidencePlanItem}>
          <Text style={styles.evidencePlanTitle}>Native QA</Text>
          <Text style={styles.qaKitText}>
            {plan.nativeQa.requiredRuns} physical runs · {plan.nativeQa.requiredWorkflows.length} workflows per platform
          </Text>
          <Text style={styles.qaPlatformMore}>Battery budget: {plan.nativeQa.maxBatteryDropPct}% per run</Text>
        </View>
      </View>
      <View style={styles.evidencePlanItem}>
        <Text style={styles.evidencePlanTitle}>Balanced clip batches</Text>
        <View style={styles.qaPlatformList}>
          {plan.cueValidation.collectionBatches.map((batch) => (
            <View key={batch.wallAngle} style={styles.qaWorkflowRow}>
              <Circle color={theme.colors.brand} size={12} />
              <View style={styles.launchTrackTitleGroup}>
                <Text style={styles.qaWorkflowText}>
                  {batch.wallAngle}: {batch.targetClipCount} clips · {batch.estimatedReviewRows} review rows
                </Text>
                <Text style={styles.qaPlatformMore}>{batch.captureFocus}</Text>
              </View>
            </View>
          ))}
        </View>
      </View>
      <View style={styles.evidencePlanItem}>
        <Text style={styles.evidencePlanTitle}>Pilot protocol</Text>
        <View style={styles.qaPlatformList}>
          {pilotKit.protocol.consentPrinciples.slice(0, 3).map((item) => (
            <View key={item} style={styles.qaWorkflowRow}>
              <ShieldCheck color={theme.colors.success} size={14} />
              <Text style={styles.qaWorkflowText}>{item}</Text>
            </View>
          ))}
        </View>
      </View>
      <View style={styles.evidencePlanItem}>
        <Text style={styles.evidencePlanTitle}>Collection checklist</Text>
        <View style={styles.qaPlatformList}>
          {plan.cueValidation.collectionChecklist.map((item) => (
            <View key={item} style={styles.qaWorkflowRow}>
              <CheckCircle2 color={theme.colors.success} size={14} />
              <Text style={styles.qaWorkflowText}>{item}</Text>
            </View>
          ))}
        </View>
      </View>
      <View style={styles.qaPlatformList}>
        {plan.externalEvidence.map((item) => (
          <View key={item.key} style={styles.qaWorkflowRow}>
            <TriangleAlert color={theme.colors.amber} size={14} />
            <Text style={styles.qaWorkflowText}>
              {item.owner}: {item.label}
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
}

function ReleaseUnblockChecklistCard({
  checklist,
  onPreparePacket,
}: {
  checklist: ReturnType<typeof buildReleaseUnblockChecklist>;
  onPreparePacket: () => void;
}) {
  const isReady = checklist.summary.status === 'ready';

  return (
    <View style={styles.releaseUnblock}>
      <View style={styles.releaseUnblockHero}>
        <View style={styles.qaKitMetric}>
          <Text style={styles.qaKitMetricValue}>{checklist.summary.blockedItems}</Text>
          <Text style={styles.qaKitMetricLabel}>blockers</Text>
        </View>
        <View style={styles.qaKitMetric}>
          <Text style={styles.qaKitMetricValue}>{checklist.summary.ownerCount}</Text>
          <Text style={styles.qaKitMetricLabel}>owners</Text>
        </View>
        <View style={styles.qaKitMetric}>
          <Text style={styles.qaKitMetricValue}>{checklist.summary.commandCount}</Text>
          <Text style={styles.qaKitMetricLabel}>commands</Text>
        </View>
      </View>
      <Text style={styles.qaKitAction}>{checklist.summary.nextAction}</Text>
      <View style={styles.planActionRow}>
        <Pressable accessibilityLabel="Prepare release unblock packet" onPress={onPreparePacket} style={styles.planAction}>
          <Download color={theme.colors.brand} size={16} />
          <Text style={styles.planActionText}>Prepare packet</Text>
        </Pressable>
      </View>
      {isReady ? (
        <View style={styles.releaseReadyRow}>
          <CheckCircle2 color={theme.colors.success} size={15} />
          <Text style={styles.qaWorkflowText}>All external release blockers are cleared.</Text>
        </View>
      ) : (
        <View style={styles.releaseUnblockList}>
          {checklist.items.map((item) => (
            <View key={item.key} style={styles.releaseUnblockItem}>
              <View style={styles.releaseUnblockTop}>
                <View style={styles.launchTrackTitleGroup}>
                  <Text style={styles.releaseUnblockTitle}>{item.label}</Text>
                  <Text style={styles.releaseUnblockMeta}>
                    {item.owner} · {item.tracks.join(', ')}
                  </Text>
                </View>
                <Text style={[styles.launchStatus, styles.launchStatusBlocked]}>{item.status}</Text>
              </View>
              <Text style={styles.qaKitText}>{item.proof[0]}</Text>
              <Text style={styles.qaPlatformMore}>{item.commands[0]}</Text>
              {item.envKeys.length > 0 ? <Text style={styles.qaPlatformMore}>Keys: {item.envKeys.join(', ')}</Text> : null}
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

function ReleaseCriticalPathCard({
  onPreparePacket,
  path,
}: {
  onPreparePacket: () => void;
  path: ReleaseCriticalPath;
}) {
  const isReady = path.summary.status === 'ready';

  return (
    <View style={styles.releaseEvidencePacket}>
      <View style={styles.releaseUnblockHero}>
        <View style={styles.qaKitMetric}>
          <Text style={styles.qaKitMetricValue}>
            {path.summary.readySteps}/{path.summary.stepCount}
          </Text>
          <Text style={styles.qaKitMetricLabel}>ready steps</Text>
        </View>
        <View style={styles.qaKitMetric}>
          <Text style={styles.qaKitMetricValue}>{path.summary.readyToStartSteps}</Text>
          <Text style={styles.qaKitMetricLabel}>can start</Text>
        </View>
        <View style={styles.qaKitMetric}>
          <Text style={styles.qaKitMetricValue}>{path.summary.laneCount}</Text>
          <Text style={styles.qaKitMetricLabel}>lanes</Text>
        </View>
      </View>
      <View style={styles.qaValidationTop}>
        <View style={styles.launchTrackTitleGroup}>
          <Text style={styles.qaValidationTitle}>Release critical path</Text>
          <Text style={styles.qaKitText}>{path.summary.nextAction}</Text>
        </View>
        <Text style={[styles.launchStatus, isReady ? styles.launchStatusReady : styles.launchStatusBlocked]}>
          {isReady ? 'Ready' : 'Blocked'}
        </Text>
      </View>
      <View style={styles.planActionRow}>
        <Pressable accessibilityLabel="Prepare release critical path packet" onPress={onPreparePacket} style={styles.planAction}>
          <Download color={theme.colors.brand} size={16} />
          <Text style={styles.planActionText}>Critical path packet</Text>
        </Pressable>
      </View>
      <View style={styles.releaseUnblockList}>
        {path.steps.map((step) => (
          <View key={step.key} style={styles.releaseUnblockItem}>
            <View style={styles.releaseUnblockTop}>
              <View style={styles.launchTrackTitleGroup}>
                <Text style={styles.releaseUnblockTitle}>
                  {step.sequence}. {step.label}
                </Text>
                <Text style={styles.releaseUnblockMeta}>
                  {step.lane} · {step.owner} · {step.tracks.join(', ')}
                </Text>
              </View>
              <Text
                style={[
                  styles.launchStatus,
                  step.status === 'ready'
                    ? styles.launchStatusReady
                    : step.status === 'blocked'
                      ? styles.launchStatusBlocked
                      : null,
                ]}
              >
                {criticalPathStatusLabel(step.status)}
              </Text>
            </View>
            <Text style={styles.qaKitText}>{step.action}</Text>
            <Text style={styles.qaPlatformMore}>
              {step.commands[0]} · {step.proof[0]}
            </Text>
            {step.blockedBy.length > 0 ? <Text style={styles.qaPlatformMore}>Blocked by: {step.blockedBy.join(', ')}</Text> : null}
          </View>
        ))}
      </View>
    </View>
  );
}

function ReleaseEvidenceScenarioCard({
  onPreparePacket,
  planner,
}: {
  onPreparePacket: () => void;
  planner: ReleaseEvidenceScenarioPlanner;
}) {
  const isReady = planner.summary.status === 'ready' || planner.summary.status === 'scenario-ready';

  return (
    <View style={styles.releaseEvidencePacket}>
      <View style={styles.releaseUnblockHero}>
        <View style={styles.qaKitMetric}>
          <Text style={styles.qaKitMetricValue}>
            {planner.summary.maxProjectedReadyTracks}/{planner.summary.totalTracks}
          </Text>
          <Text style={styles.qaKitMetricLabel}>best tracks</Text>
        </View>
        <View style={styles.qaKitMetric}>
          <Text style={styles.qaKitMetricValue}>{planner.summary.maxClearedBlockers}</Text>
          <Text style={styles.qaKitMetricLabel}>max clears</Text>
        </View>
        <View style={styles.qaKitMetric}>
          <Text style={styles.qaKitMetricValue}>{planner.summary.scenarioCount}</Text>
          <Text style={styles.qaKitMetricLabel}>scenarios</Text>
        </View>
      </View>
      <View style={styles.qaValidationTop}>
        <View style={styles.launchTrackTitleGroup}>
          <Text style={styles.qaValidationTitle}>Release evidence scenarios</Text>
          <Text style={styles.qaKitText}>{planner.summary.nextAction}</Text>
        </View>
        <Text style={[styles.launchStatus, isReady ? styles.launchStatusReady : styles.launchStatusBlocked]}>
          {planner.summary.status === 'ready' ? 'Ready' : planner.summary.status === 'scenario-ready' ? 'Scenario' : 'Blocked'}
        </Text>
      </View>
      <View style={styles.planActionRow}>
        <Pressable accessibilityLabel="Prepare release evidence scenario packet" onPress={onPreparePacket} style={styles.planAction}>
          <Download color={theme.colors.brand} size={16} />
          <Text style={styles.planActionText}>Scenario packet</Text>
        </Pressable>
      </View>
      <View style={styles.releaseUnblockList}>
        {planner.scenarios.map((scenario) => (
          <View key={scenario.key} style={styles.releaseUnblockItem}>
            <View style={styles.releaseUnblockTop}>
              <View style={styles.launchTrackTitleGroup}>
                <Text style={styles.releaseUnblockTitle}>
                  {scenario.sequence}. {scenario.label}
                </Text>
                <Text style={styles.releaseUnblockMeta}>
                  {scenario.summary.projectedReadyTracks}/{scenario.summary.totalTracks} tracks · clears{' '}
                  {scenario.summary.clearedBlockerCount}
                </Text>
              </View>
              <Text
                style={[
                  styles.launchStatus,
                  scenario.status === 'ready'
                    ? styles.launchStatusReady
                    : scenario.status === 'needs-prerequisite'
                      ? styles.launchStatusBlocked
                      : null,
                ]}
              >
                {releaseScenarioStatusLabel(scenario.status)}
              </Text>
            </View>
            <Text style={styles.qaKitText}>{scenario.description}</Text>
            <Text style={styles.qaPlatformMore}>
              {scenario.commands[0]} · {scenario.proof[0]}
            </Text>
            {scenario.missingPrerequisites.length > 0 ? (
              <Text style={styles.qaPlatformMore}>
                Needs: {scenario.missingPrerequisites.map((item) => item.label).join(', ')}
              </Text>
            ) : null}
          </View>
        ))}
      </View>
    </View>
  );
}

function ReleaseEvidenceFreshnessCard({
  freshness,
}: {
  freshness: ReleaseEvidenceFreshness;
}) {
  const isReady = freshness.summary.status === 'ready';

  return (
    <View style={styles.releaseEvidencePacket}>
      <View style={styles.releaseUnblockHero}>
        <View style={styles.qaKitMetric}>
          <Text style={styles.qaKitMetricValue}>
            {freshness.summary.freshCount}/{freshness.summary.artifactCount}
          </Text>
          <Text style={styles.qaKitMetricLabel}>fresh</Text>
        </View>
        <View style={styles.qaKitMetric}>
          <Text style={styles.qaKitMetricValue}>{freshness.summary.staleCount}</Text>
          <Text style={styles.qaKitMetricLabel}>stale</Text>
        </View>
        <View style={styles.qaKitMetric}>
          <Text style={styles.qaKitMetricValue}>{freshness.summary.maxObservedAgeHours}h</Text>
          <Text style={styles.qaKitMetricLabel}>oldest</Text>
        </View>
      </View>
      <View style={styles.qaValidationTop}>
        <View style={styles.launchTrackTitleGroup}>
          <Text style={styles.qaValidationTitle}>Release evidence freshness</Text>
          <Text style={styles.qaKitText}>{freshness.summary.nextAction}</Text>
        </View>
        <Text style={[styles.launchStatus, isReady ? styles.launchStatusReady : styles.launchStatusBlocked]}>
          {isReady ? 'Fresh' : freshness.summary.status}
        </Text>
      </View>
      <View style={styles.releaseUnblockList}>
        {freshness.artifacts.map((artifact) => (
          <View key={artifact.key} style={styles.releaseUnblockItem}>
            <View style={styles.releaseUnblockTop}>
              <View style={styles.launchTrackTitleGroup}>
                <Text style={styles.releaseUnblockTitle}>{artifact.label}</Text>
                <Text style={styles.releaseUnblockMeta}>
                  {artifact.owner} · {artifact.requiredFor.join(', ')}
                </Text>
              </View>
              <Text style={[styles.launchStatus, artifact.status === 'fresh' ? styles.launchStatusReady : styles.launchStatusBlocked]}>
                {freshnessStatusLabel(artifact.status)}
              </Text>
            </View>
            <Text style={styles.qaKitText}>{artifact.detail}</Text>
            <Text style={styles.qaPlatformMore}>{artifact.refreshCommand}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

function ReleaseEvidenceReconciliationCard({
  input,
  onChange,
  onClear,
  onPreparePacket,
  reconciliation,
}: {
  input: string;
  onChange: (value: string) => void;
  onClear: () => void;
  onPreparePacket: () => void;
  reconciliation: ReleaseEvidenceReconciliation;
}) {
  const isReady = reconciliation.summary.status === 'ready';
  const isInvalid = reconciliation.summary.status === 'invalid-evidence';
  const wouldImprove = reconciliation.summary.status === 'would-improve';

  return (
    <View style={styles.releaseEvidencePacket}>
      <View style={styles.releaseUnblockHero}>
        <View style={styles.qaKitMetric}>
          <Text style={styles.qaKitMetricValue}>{reconciliation.summary.clearedBlockerCount}</Text>
          <Text style={styles.qaKitMetricLabel}>would clear</Text>
        </View>
        <View style={styles.qaKitMetric}>
          <Text style={styles.qaKitMetricValue}>
            {reconciliation.summary.projectedReadyTracks}/{reconciliation.summary.totalTracks}
          </Text>
          <Text style={styles.qaKitMetricLabel}>projected tracks</Text>
        </View>
        <View style={styles.qaKitMetric}>
          <Text style={styles.qaKitMetricValue}>{reconciliation.summary.missingProofCount}</Text>
          <Text style={styles.qaKitMetricLabel}>proof gaps</Text>
        </View>
      </View>
      <View style={styles.qaValidationTop}>
        <View style={styles.launchTrackTitleGroup}>
          <Text style={styles.qaValidationTitle}>Release evidence reconciliation</Text>
          <Text style={styles.qaKitText}>{reconciliation.summary.nextAction}</Text>
        </View>
        <Text
          style={[
            styles.launchStatus,
            isReady ? styles.launchStatusReady : isInvalid ? styles.launchStatusBlocked : wouldImprove ? null : styles.launchStatusBlocked,
          ]}
        >
          {reconciliationStatusLabel(reconciliation.summary.status)}
        </Text>
      </View>
      <TextInput
        accessibilityLabel="Paste release evidence JSON"
        multiline
        onChangeText={onChange}
        placeholder='{"cueValidationDatasetReport":{...},"nativeQaEvidence":{...},"iosToolchainReport":{...},"storeCredentialsReport":{...}}'
        placeholderTextColor={theme.colors.muted}
        style={styles.nativeEvidenceInput}
        value={input}
      />
      <View style={styles.qaValidationStats}>
        <Text style={styles.qaValidationStat}>
          {reconciliation.summary.currentReadyTracks}/{reconciliation.summary.totalTracks} current tracks
        </Text>
        <Text style={styles.qaValidationStat}>{reconciliation.summary.blockerCount} current blockers</Text>
        <Text style={styles.qaValidationStat}>Share-safe only</Text>
      </View>
      {reconciliation.parseError ? <Text style={styles.nativeEvidenceError}>{reconciliation.parseError}</Text> : null}
      <View style={styles.planActionRow}>
        <Pressable accessibilityLabel="Prepare release evidence reconciliation packet" onPress={onPreparePacket} style={styles.planAction}>
          <Download color={theme.colors.brand} size={16} />
          <Text style={styles.planActionText}>Reconciliation packet</Text>
        </Pressable>
        {input.trim().length > 0 ? (
          <Pressable accessibilityLabel="Clear release evidence JSON" onPress={onClear} style={styles.planAction}>
            <Circle color={theme.colors.brand} size={16} />
            <Text style={styles.planActionText}>Clear</Text>
          </Pressable>
        ) : null}
      </View>
      <View style={styles.releaseUnblockList}>
        {reconciliation.items.map((item) => (
          <View key={item.key} style={styles.releaseUnblockItem}>
            <View style={styles.releaseUnblockTop}>
              <View style={styles.launchTrackTitleGroup}>
                <Text style={styles.releaseUnblockTitle}>{item.label}</Text>
                <Text style={styles.releaseUnblockMeta}>
                  {item.source} · {item.tracks.join(', ')}
                </Text>
              </View>
              <Text
                style={[
                  styles.launchStatus,
                  item.importedStatus === 'ready'
                    ? styles.launchStatusReady
                    : item.importedStatus === 'missing'
                      ? null
                      : styles.launchStatusBlocked,
                ]}
              >
                {item.importedStatus}
              </Text>
            </View>
            <Text style={styles.qaKitText}>{item.detail}</Text>
            <Text style={styles.qaPlatformMore}>
              {item.command} · {item.proof[0]}
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
}

function ReleaseBlockerIssueCard({
  onPreparePacket,
  packet,
}: {
  onPreparePacket: () => void;
  packet: ReleaseBlockerIssuePacket;
}) {
  const isReady = packet.summary.status === 'ready';

  return (
    <View style={styles.releaseEvidencePacket}>
      <View style={styles.releaseUnblockHero}>
        <View style={styles.qaKitMetric}>
          <Text style={styles.qaKitMetricValue}>{packet.summary.issueCount}</Text>
          <Text style={styles.qaKitMetricLabel}>issues</Text>
        </View>
        <View style={styles.qaKitMetric}>
          <Text style={styles.qaKitMetricValue}>{packet.summary.ownerCount}</Text>
          <Text style={styles.qaKitMetricLabel}>owners</Text>
        </View>
        <View style={styles.qaKitMetric}>
          <Text style={styles.qaKitMetricValue}>{packet.summary.credentialKeyNameCount}</Text>
          <Text style={styles.qaKitMetricLabel}>key names</Text>
        </View>
      </View>
      <View style={styles.qaValidationTop}>
        <View style={styles.launchTrackTitleGroup}>
          <Text style={styles.qaValidationTitle}>Release blocker issues</Text>
          <Text style={styles.qaKitText}>{packet.summary.nextAction}</Text>
        </View>
        <Text style={[styles.launchStatus, isReady ? styles.launchStatusReady : styles.launchStatusBlocked]}>
          {isReady ? 'Ready' : 'File'}
        </Text>
      </View>
      <View style={styles.planActionRow}>
        <Pressable accessibilityLabel="Prepare release blocker issue packet" onPress={onPreparePacket} style={styles.planAction}>
          <Download color={theme.colors.brand} size={16} />
          <Text style={styles.planActionText}>Issue packet</Text>
        </Pressable>
      </View>
      {isReady ? (
        <View style={styles.releaseReadyRow}>
          <CheckCircle2 color={theme.colors.success} size={15} />
          <Text style={styles.qaWorkflowText}>No release blocker issues need filing.</Text>
        </View>
      ) : (
        <View style={styles.releaseUnblockList}>
          {packet.issues.map((issue) => (
            <View key={issue.key} style={styles.releaseUnblockItem}>
              <View style={styles.releaseUnblockTop}>
                <View style={styles.launchTrackTitleGroup}>
                  <Text style={styles.releaseUnblockTitle}>{issue.title}</Text>
                  <Text style={styles.releaseUnblockMeta}>
                    {issue.owner} · {issue.tracks.join(', ')}
                  </Text>
                </View>
                <Text style={[styles.launchStatus, styles.launchStatusBlocked]}>{issue.status}</Text>
              </View>
              <Text style={styles.qaKitText}>{issue.proof[0]}</Text>
              <Text style={styles.qaPlatformMore}>{issue.commands[0] ?? 'Proof-only issue'}</Text>
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

function ReleaseBlockerIssueFilingCard({
  onPreparePlan,
  plan,
}: {
  onPreparePlan: () => void;
  plan: ReleaseBlockerIssueFilingPlan;
}) {
  const isClear = plan.summary.issueCount === 0 || plan.summary.status === 'filed';

  return (
    <View style={styles.releaseEvidencePacket}>
      <View style={styles.releaseUnblockHero}>
        <View style={styles.qaKitMetric}>
          <Text style={styles.qaKitMetricValue}>{plan.summary.plannedCount}</Text>
          <Text style={styles.qaKitMetricLabel}>planned</Text>
        </View>
        <View style={styles.qaKitMetric}>
          <Text style={styles.qaKitMetricValue}>{plan.summary.existingCount}</Text>
          <Text style={styles.qaKitMetricLabel}>existing</Text>
        </View>
        <View style={styles.qaKitMetric}>
          <Text style={styles.qaKitMetricValue}>{plan.summary.createdCount}</Text>
          <Text style={styles.qaKitMetricLabel}>created</Text>
        </View>
      </View>
      <View style={styles.qaValidationTop}>
        <View style={styles.launchTrackTitleGroup}>
          <Text style={styles.qaValidationTitle}>Release blocker issue filing</Text>
          <Text style={styles.qaKitText}>{plan.summary.nextAction}</Text>
        </View>
        <Text style={[styles.launchStatus, isClear ? styles.launchStatusReady : styles.launchStatusBlocked]}>
          {plan.summary.status}
        </Text>
      </View>
      <View style={styles.planActionRow}>
        <Pressable accessibilityLabel="Prepare release blocker issue filing plan" onPress={onPreparePlan} style={styles.planAction}>
          <Download color={theme.colors.brand} size={16} />
          <Text style={styles.planActionText}>Filing plan</Text>
        </Pressable>
      </View>
      <View style={styles.releaseUnblockList}>
        {plan.issues.map((issue) => (
          <View key={issue.key} style={styles.releaseUnblockItem}>
            <View style={styles.releaseUnblockTop}>
              <View style={styles.launchTrackTitleGroup}>
                <Text style={styles.releaseUnblockTitle}>{issue.title}</Text>
                <Text style={styles.releaseUnblockMeta}>
                  {issue.owner} · {issue.tracks.join(', ')}
                </Text>
              </View>
              <Text style={[styles.launchStatus, issue.filingStatus === 'failed' ? styles.launchStatusBlocked : null]}>
                {issue.filingStatus}
              </Text>
            </View>
            <Text style={styles.qaKitText}>{issue.commandPreview}</Text>
            <Text style={styles.qaPlatformMore}>
              {issue.bodyPreviewLineCount} body lines · {issue.labels.slice(0, 3).join(', ')}
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
}

function ReleaseBlockerIssueWebLinksCard({
  onPreparePacket,
  packet,
}: {
  onPreparePacket: () => void;
  packet: ReleaseBlockerIssueWebLinksPacket;
}) {
  const isReady = packet.summary.status === 'ready';

  return (
    <View style={styles.releaseEvidencePacket}>
      <View style={styles.releaseUnblockHero}>
        <View style={styles.qaKitMetric}>
          <Text style={styles.qaKitMetricValue}>{packet.summary.readyLinkCount}</Text>
          <Text style={styles.qaKitMetricLabel}>ready links</Text>
        </View>
        <View style={styles.qaKitMetric}>
          <Text style={styles.qaKitMetricValue}>{packet.summary.blockedLinkCount}</Text>
          <Text style={styles.qaKitMetricLabel}>blocked links</Text>
        </View>
        <View style={styles.qaKitMetric}>
          <Text style={styles.qaKitMetricValue}>{packet.summary.maxUrlLength}</Text>
          <Text style={styles.qaKitMetricLabel}>max chars</Text>
        </View>
      </View>
      <View style={styles.qaValidationTop}>
        <View style={styles.launchTrackTitleGroup}>
          <Text style={styles.qaValidationTitle}>Release blocker issue links</Text>
          <Text style={styles.qaKitText}>{packet.summary.nextAction}</Text>
        </View>
        <Text style={[styles.launchStatus, isReady ? styles.launchStatusReady : styles.launchStatusBlocked]}>
          {packet.summary.status}
        </Text>
      </View>
      <View style={styles.planActionRow}>
        <Pressable accessibilityLabel="Prepare release blocker issue web links" onPress={onPreparePacket} style={styles.planAction}>
          <Download color={theme.colors.brand} size={16} />
          <Text style={styles.planActionText}>Issue links</Text>
        </Pressable>
      </View>
      <View style={styles.releaseUnblockList}>
        {packet.issues.map((issue) => (
          <View key={issue.key} style={styles.releaseUnblockItem}>
            <View style={styles.releaseUnblockTop}>
              <View style={styles.launchTrackTitleGroup}>
                <Text style={styles.releaseUnblockTitle}>{issue.title}</Text>
                <Text style={styles.releaseUnblockMeta}>
                  {issue.owner} · {issue.tracks.join(', ')}
                </Text>
              </View>
              <Text style={[styles.launchStatus, issue.status === 'ready' ? styles.launchStatusReady : styles.launchStatusBlocked]}>
                {issue.status}
              </Text>
            </View>
            <Text style={styles.qaKitText}>{issue.webUrl ? 'Prefilled GitHub issue URL ready.' : 'Repository configuration required.'}</Text>
            <Text style={styles.qaPlatformMore}>
              {issue.bodyPreviewLineCount} body lines · {issue.urlLength}/{packet.summary.urlLengthBudget} chars
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
}

function MoveNetStaticAssetsCard({
  onPreparePacket,
  report,
}: {
  onPreparePacket: () => void;
  report: MoveNetStaticAssetsReport;
}) {
  const isReady = report.summary.status === 'ready';

  return (
    <View style={styles.releaseEvidencePacket}>
      <View style={styles.releaseUnblockHero}>
        <View style={styles.qaKitMetric}>
          <Text style={styles.qaKitMetricValue}>
            {report.summary.verifiedCount}/{report.summary.checkCount}
          </Text>
          <Text style={styles.qaKitMetricLabel}>checks</Text>
        </View>
        <View style={styles.qaKitMetric}>
          <Text style={styles.qaKitMetricValue}>{report.summary.shardCount}</Text>
          <Text style={styles.qaKitMetricLabel}>shards</Text>
        </View>
        <View style={styles.qaKitMetric}>
          <Text style={styles.providerMetricValue}>{formatBytes(report.summary.totalBytes)}</Text>
          <Text style={styles.qaKitMetricLabel}>bundle</Text>
        </View>
      </View>
      <View style={styles.qaValidationTop}>
        <View style={styles.launchTrackTitleGroup}>
          <Text style={styles.qaValidationTitle}>Static MoveNet assets</Text>
          <Text style={styles.qaKitText}>{report.summary.nextAction}</Text>
        </View>
        <Text style={[styles.launchStatus, isReady ? styles.launchStatusReady : styles.launchStatusBlocked]}>
          {staticAssetStatusLabel(report.summary.status)}
        </Text>
      </View>
      <View style={styles.planActionRow}>
        <Pressable accessibilityLabel="Prepare MoveNet static assets packet" onPress={onPreparePacket} style={styles.planAction}>
          <Download color={theme.colors.brand} size={16} />
          <Text style={styles.planActionText}>Model assets</Text>
        </Pressable>
      </View>
      <Text style={styles.qaKitText}>{report.modelUrl}</Text>
      <View style={styles.releaseUnblockList}>
        {report.checks.map((check) => (
          <View key={check.key} style={styles.releaseUnblockItem}>
            <View style={styles.releaseUnblockTop}>
              <View style={styles.launchTrackTitleGroup}>
                <Text style={styles.releaseUnblockTitle}>{check.label}</Text>
                <Text style={styles.releaseUnblockMeta}>{check.detail}</Text>
              </View>
              <Text style={[styles.launchStatus, check.status === 'verified' ? styles.launchStatusReady : styles.launchStatusBlocked]}>
                {check.status}
              </Text>
            </View>
          </View>
        ))}
      </View>
    </View>
  );
}

function ModelAssetProvenanceCard({
  onPreparePacket,
  report,
}: {
  onPreparePacket: () => void;
  report: ModelAssetProvenanceReport;
}) {
  const isBlocked = report.summary.status === 'blocked';

  return (
    <View style={styles.releaseEvidencePacket}>
      <View style={styles.releaseUnblockHero}>
        <View style={styles.qaKitMetric}>
          <Text style={styles.qaKitMetricValue}>
            {report.summary.verifiedCount}/{report.summary.checkCount}
          </Text>
          <Text style={styles.qaKitMetricLabel}>checks</Text>
        </View>
        <View style={styles.qaKitMetric}>
          <Text style={styles.qaKitMetricValue}>{report.summary.reviewCount}</Text>
          <Text style={styles.qaKitMetricLabel}>review</Text>
        </View>
        <View style={styles.qaKitMetric}>
          <Text style={styles.providerMetricValue}>{formatBytes(report.summary.totalBytes)}</Text>
          <Text style={styles.qaKitMetricLabel}>bundle</Text>
        </View>
      </View>
      <View style={styles.qaValidationTop}>
        <View style={styles.launchTrackTitleGroup}>
          <Text style={styles.qaValidationTitle}>Model asset provenance</Text>
          <Text style={styles.qaKitText}>{report.summary.nextAction}</Text>
        </View>
        <Text style={[styles.launchStatus, isBlocked ? styles.launchStatusBlocked : styles.launchStatusReady]}>
          {modelAssetProvenanceStatusLabel(report.summary.status)}
        </Text>
      </View>
      <View style={styles.planActionRow}>
        <Pressable accessibilityLabel="Prepare model asset provenance packet" onPress={onPreparePacket} style={styles.planAction}>
          <Download color={theme.colors.brand} size={16} />
          <Text style={styles.planActionText}>Provenance</Text>
        </Pressable>
      </View>
      <Text style={styles.qaKitText}>{report.source.modelUrl}</Text>
      <View style={styles.releaseUnblockList}>
        {report.checks.map((check) => (
          <View key={check.key} style={styles.releaseUnblockItem}>
            <View style={styles.releaseUnblockTop}>
              <View style={styles.launchTrackTitleGroup}>
                <Text style={styles.releaseUnblockTitle}>{check.label}</Text>
                <Text style={styles.releaseUnblockMeta}>{check.detail}</Text>
              </View>
              <Text style={[styles.launchStatus, check.status === 'blocked' ? styles.launchStatusBlocked : styles.launchStatusReady]}>
                {check.status}
              </Text>
            </View>
          </View>
        ))}
      </View>
    </View>
  );
}

function PwaReadinessCard({ report }: { report: typeof pwaReadinessReport }) {
  const isReady = report.summary.status === 'ready';

  return (
    <View style={styles.releaseEvidencePacket}>
      <View style={styles.releaseUnblockHero}>
        <View style={styles.qaKitMetric}>
          <Text style={styles.qaKitMetricValue}>
            {report.summary.verifiedCount}/{report.summary.checkCount}
          </Text>
          <Text style={styles.qaKitMetricLabel}>checks</Text>
        </View>
        <View style={styles.qaKitMetric}>
          <Text style={styles.qaKitMetricValue}>{report.privacy.backendRequired ? 'yes' : 'no'}</Text>
          <Text style={styles.qaKitMetricLabel}>backend</Text>
        </View>
      </View>
      <View style={styles.qaValidationTop}>
        <View style={styles.launchTrackTitleGroup}>
          <Text style={styles.qaValidationTitle}>Installable PWA</Text>
          <Text style={styles.qaKitText}>{report.summary.nextAction}</Text>
        </View>
        <Text style={[styles.launchStatus, isReady ? styles.launchStatusReady : styles.launchStatusBlocked]}>
          {report.summary.status}
        </Text>
      </View>
      <View style={styles.releaseUnblockList}>
        {report.checks.map((check) => (
          <View key={check.key} style={styles.releaseUnblockItem}>
            <View style={styles.releaseUnblockTop}>
              <View style={styles.launchTrackTitleGroup}>
                <Text style={styles.releaseUnblockTitle}>{check.label}</Text>
                <Text style={styles.releaseUnblockMeta}>{check.detail}</Text>
              </View>
              <Text style={[styles.launchStatus, check.status === 'verified' ? styles.launchStatusReady : styles.launchStatusBlocked]}>
                {check.status}
              </Text>
            </View>
          </View>
        ))}
      </View>
    </View>
  );
}

function PwaRuntimeCard({
  onInstall,
  readiness,
}: {
  onInstall: () => void;
  readiness: PwaRuntimeReadiness;
}) {
  const isReady =
    readiness.summary.status === 'installed' ||
    readiness.summary.status === 'installable' ||
    readiness.summary.status === 'runtime-ready' ||
    readiness.summary.status === 'native';
  const isBlocked = readiness.summary.status === 'unsupported';

  return (
    <View style={styles.releaseEvidencePacket}>
      <View style={styles.releaseUnblockHero}>
        <View style={styles.qaKitMetric}>
          <Text style={styles.providerMetricValue}>{pwaRuntimeStatusLabel(readiness.summary.status)}</Text>
          <Text style={styles.qaKitMetricLabel}>install</Text>
        </View>
        <View style={styles.qaKitMetric}>
          <Text style={styles.qaKitMetricValue}>{readiness.summary.offlineReady ? 'yes' : 'no'}</Text>
          <Text style={styles.qaKitMetricLabel}>offline</Text>
        </View>
        <View style={styles.qaKitMetric}>
          <Text style={styles.qaKitMetricValue}>{readiness.summary.updateAvailable ? 'yes' : 'no'}</Text>
          <Text style={styles.qaKitMetricLabel}>update</Text>
        </View>
      </View>
      <View style={styles.qaValidationTop}>
        <View style={styles.launchTrackTitleGroup}>
          <Text style={styles.qaValidationTitle}>PWA runtime</Text>
          <Text style={styles.qaKitText}>{readiness.summary.nextAction}</Text>
        </View>
        <Text style={[styles.launchStatus, isReady ? styles.launchStatusReady : isBlocked ? styles.launchStatusBlocked : null]}>
          {pwaRuntimeStatusLabel(readiness.summary.status)}
        </Text>
      </View>
      <View style={styles.planActionRow}>
        <Pressable accessibilityLabel="Install app or prepare PWA install guidance" onPress={onInstall} style={styles.planAction}>
          <Download color={theme.colors.brand} size={16} />
          <Text style={styles.planActionText}>Install app</Text>
        </Pressable>
      </View>
      <View style={styles.releaseUnblockList}>
        {readiness.checks.map((check) => (
          <View key={check.key} style={styles.releaseUnblockItem}>
            <View style={styles.releaseUnblockTop}>
              <View style={styles.launchTrackTitleGroup}>
                <Text style={styles.releaseUnblockTitle}>{check.label}</Text>
                <Text style={styles.releaseUnblockMeta}>{check.detail}</Text>
              </View>
              <Text
                style={[
                  styles.launchStatus,
                  check.status === 'ready' ? styles.launchStatusReady : check.status === 'blocked' ? styles.launchStatusBlocked : null,
                ]}
              >
                {check.status}
              </Text>
            </View>
            <Text style={styles.qaPlatformMore}>{check.action}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

function VercelDeploymentCard({
  onPreparePacket,
  report,
}: {
  onPreparePacket: () => void;
  report: VercelDeploymentReport;
}) {
  const isLinked = report.summary.status === 'linked';
  const isBlocked = report.summary.status === 'blocked';

  return (
    <View style={styles.releaseEvidencePacket}>
      <View style={styles.releaseUnblockHero}>
        <View style={styles.qaKitMetric}>
          <Text style={styles.qaKitMetricValue}>
            {report.summary.verifiedCount}/{report.summary.checkCount}
          </Text>
          <Text style={styles.qaKitMetricLabel}>checks</Text>
        </View>
        <View style={styles.qaKitMetric}>
          <Text style={styles.qaKitMetricValue}>{report.summary.actionNeededCount}</Text>
          <Text style={styles.qaKitMetricLabel}>actions</Text>
        </View>
        <View style={styles.qaKitMetric}>
          <Text style={styles.qaKitMetricValue}>{report.privacy.backendRequired ? 'yes' : 'no'}</Text>
          <Text style={styles.qaKitMetricLabel}>backend</Text>
        </View>
      </View>
      <View style={styles.qaValidationTop}>
        <View style={styles.launchTrackTitleGroup}>
          <Text style={styles.qaValidationTitle}>Vercel deployment</Text>
          <Text style={styles.qaKitText}>{report.summary.nextAction}</Text>
        </View>
        <Text style={[styles.launchStatus, isLinked ? styles.launchStatusReady : isBlocked ? styles.launchStatusBlocked : null]}>
          {vercelDeploymentStatusLabel(report.summary.status)}
        </Text>
      </View>
      <View style={styles.planActionRow}>
        <Pressable accessibilityLabel="Prepare Vercel deployment packet" onPress={onPreparePacket} style={styles.planAction}>
          <Download color={theme.colors.brand} size={16} />
          <Text style={styles.planActionText}>Vercel packet</Text>
        </Pressable>
      </View>
      <View style={styles.releaseUnblockList}>
        {report.checks.map((check) => (
          <View key={check.key} style={styles.releaseUnblockItem}>
            <View style={styles.releaseUnblockTop}>
              <View style={styles.launchTrackTitleGroup}>
                <Text style={styles.releaseUnblockTitle}>{check.label}</Text>
                <Text style={styles.releaseUnblockMeta}>{check.detail}</Text>
              </View>
              <Text style={[styles.launchStatus, check.status === 'verified' ? styles.launchStatusReady : check.status === 'blocked' ? styles.launchStatusBlocked : null]}>
                {check.status}
              </Text>
            </View>
          </View>
        ))}
      </View>
    </View>
  );
}

function VercelWorkflowCard({
  onPreparePacket,
  report,
}: {
  onPreparePacket: () => void;
  report: VercelWorkflowReport;
}) {
  const isActive = report.summary.status === 'active-ready';
  const isBlocked = report.summary.status === 'blocked';

  return (
    <View style={styles.releaseEvidencePacket}>
      <View style={styles.releaseUnblockHero}>
        <View style={styles.qaKitMetric}>
          <Text style={styles.qaKitMetricValue}>
            {report.summary.verifiedCount}/{report.summary.checkCount}
          </Text>
          <Text style={styles.qaKitMetricLabel}>checks</Text>
        </View>
        <View style={styles.qaKitMetric}>
          <Text style={styles.qaKitMetricValue}>{report.summary.actionNeededCount}</Text>
          <Text style={styles.qaKitMetricLabel}>actions</Text>
        </View>
        <View style={styles.qaKitMetric}>
          <Text style={styles.qaKitMetricValue}>{report.summary.activeWorkflowExists ? 'yes' : 'no'}</Text>
          <Text style={styles.qaKitMetricLabel}>active</Text>
        </View>
      </View>
      <View style={styles.qaValidationTop}>
        <View style={styles.launchTrackTitleGroup}>
          <Text style={styles.qaValidationTitle}>Vercel workflow</Text>
          <Text style={styles.qaKitText}>{report.summary.nextAction}</Text>
        </View>
        <Text style={[styles.launchStatus, isActive ? styles.launchStatusReady : isBlocked ? styles.launchStatusBlocked : null]}>
          {vercelWorkflowStatusLabel(report.summary.status)}
        </Text>
      </View>
      <View style={styles.planActionRow}>
        <Pressable accessibilityLabel="Prepare Vercel workflow packet" onPress={onPreparePacket} style={styles.planAction}>
          <Download color={theme.colors.brand} size={16} />
          <Text style={styles.planActionText}>Workflow packet</Text>
        </Pressable>
      </View>
      <View style={styles.releaseUnblockList}>
        {report.checks.map((check) => (
          <View key={check.key} style={styles.releaseUnblockItem}>
            <View style={styles.releaseUnblockTop}>
              <View style={styles.launchTrackTitleGroup}>
                <Text style={styles.releaseUnblockTitle}>{check.label}</Text>
                <Text style={styles.releaseUnblockMeta}>{check.detail}</Text>
              </View>
              <Text style={[styles.launchStatus, check.status === 'verified' ? styles.launchStatusReady : check.status === 'blocked' ? styles.launchStatusBlocked : null]}>
                {check.status}
              </Text>
            </View>
          </View>
        ))}
      </View>
    </View>
  );
}

function FieldValidationOpsCard({
  onPreparePacket,
  packet,
}: {
  onPreparePacket: () => void;
  packet: FieldValidationOpsPacket;
}) {
  return (
    <View style={styles.releaseEvidencePacket}>
      <View style={styles.releaseUnblockHero}>
        <View style={styles.qaKitMetric}>
          <Text style={styles.qaKitMetricValue}>{packet.summary.targetClips}</Text>
          <Text style={styles.qaKitMetricLabel}>clips</Text>
        </View>
        <View style={styles.qaKitMetric}>
          <Text style={styles.qaKitMetricValue}>{packet.summary.coachReviewRows}</Text>
          <Text style={styles.qaKitMetricLabel}>review rows</Text>
        </View>
        <View style={styles.qaKitMetric}>
          <Text style={styles.qaKitMetricValue}>{packet.summary.deviceRuns}</Text>
          <Text style={styles.qaKitMetricLabel}>device runs</Text>
        </View>
      </View>
      <View style={styles.qaValidationTop}>
        <View style={styles.launchTrackTitleGroup}>
          <Text style={styles.qaValidationTitle}>Field validation ops</Text>
          <Text style={styles.qaKitText}>{packet.summary.nextAction}</Text>
        </View>
        <Text style={styles.launchStatus}>Coordinate</Text>
      </View>
      <View style={styles.planActionRow}>
        <Pressable accessibilityLabel="Prepare field validation ops packet" onPress={onPreparePacket} style={styles.planAction}>
          <Download color={theme.colors.brand} size={16} />
          <Text style={styles.planActionText}>Ops packet</Text>
        </Pressable>
      </View>
      <View style={styles.qaPlatformList}>
        {packet.phases.map((phase) => (
          <View key={phase.key} style={styles.qaWorkflowRow}>
            {phase.status === 'ready-to-run' ? (
              <CheckCircle2 color={theme.colors.success} size={14} />
            ) : (
              <TriangleAlert color={theme.colors.amber} size={14} />
            )}
            <View style={styles.launchTrackTitleGroup}>
              <Text style={styles.qaWorkflowText}>{phase.label}</Text>
              <Text style={styles.qaPlatformMore}>
                {phase.duration} · {phase.owner} · {phase.commands[0].command}
              </Text>
            </View>
          </View>
        ))}
      </View>
    </View>
  );
}

function IosToolchainSetupCard({
  onPreparePacket,
  packet,
}: {
  onPreparePacket: () => void;
  packet: IosToolchainSetupPacket;
}) {
  const isReady = packet.summary.status === 'ready-for-ios-build';

  return (
    <View style={styles.releaseEvidencePacket}>
      <View style={styles.releaseUnblockHero}>
        <View style={styles.qaKitMetric}>
          <Text style={styles.qaKitMetricValue}>
            {packet.summary.readyCheckCount}/{packet.summary.totalCheckCount}
          </Text>
          <Text style={styles.qaKitMetricLabel}>ready checks</Text>
        </View>
        <View style={styles.qaKitMetric}>
          <Text style={styles.qaKitMetricValue}>{packet.summary.blockedCheckCount}</Text>
          <Text style={styles.qaKitMetricLabel}>blocked</Text>
        </View>
        <View style={styles.qaKitMetric}>
          <Text style={styles.providerMetricValue}>{packet.reportStatus}</Text>
          <Text style={styles.qaKitMetricLabel}>doctor</Text>
        </View>
      </View>
      <View style={styles.qaValidationTop}>
        <View style={styles.launchTrackTitleGroup}>
          <Text style={styles.qaValidationTitle}>iOS toolchain setup</Text>
          <Text style={styles.qaKitText}>{packet.summary.nextAction}</Text>
        </View>
        <Text style={[styles.launchStatus, isReady ? styles.launchStatusReady : styles.launchStatusBlocked]}>
          {isReady ? 'Ready' : 'Blocked'}
        </Text>
      </View>
      <View style={styles.planActionRow}>
        <Pressable accessibilityLabel="Prepare iOS toolchain setup packet" onPress={onPreparePacket} style={styles.planAction}>
          <Download color={theme.colors.brand} size={16} />
          <Text style={styles.planActionText}>iOS packet</Text>
        </Pressable>
      </View>
      <View style={styles.qaPlatformList}>
        {packet.checks.map((check) => (
          <View key={check.key} style={styles.qaWorkflowRow}>
            {check.status === 'ready' ? (
              <CheckCircle2 color={theme.colors.success} size={14} />
            ) : (
              <TriangleAlert color={check.status === 'blocked' ? theme.colors.coral : theme.colors.amber} size={14} />
            )}
            <View style={styles.launchTrackTitleGroup}>
              <Text style={styles.qaWorkflowText}>{check.label}</Text>
              <Text style={styles.qaPlatformMore}>{check.action}</Text>
            </View>
          </View>
        ))}
      </View>
    </View>
  );
}

function ReleaseEvidencePacketCard({
  onPreparePacket,
  packet,
}: {
  onPreparePacket: () => void;
  packet: ReleaseEvidencePacket;
}) {
  const isReady = packet.summary.status === 'ready';

  return (
    <View style={styles.releaseEvidencePacket}>
      <View style={styles.releaseUnblockHero}>
        <View style={styles.qaKitMetric}>
          <Text style={styles.qaKitMetricValue}>{packet.summary.blockerCount}</Text>
          <Text style={styles.qaKitMetricLabel}>blockers</Text>
        </View>
        <View style={styles.qaKitMetric}>
          <Text style={styles.qaKitMetricValue}>{packet.summary.artifactCount}</Text>
          <Text style={styles.qaKitMetricLabel}>artifacts</Text>
        </View>
        <View style={styles.qaKitMetric}>
          <Text style={styles.qaKitMetricValue}>{packet.summary.commandCount}</Text>
          <Text style={styles.qaKitMetricLabel}>commands</Text>
        </View>
      </View>
      <View style={styles.qaValidationTop}>
        <View style={styles.launchTrackTitleGroup}>
          <Text style={styles.qaValidationTitle}>Release evidence packet</Text>
          <Text style={styles.qaKitText}>{packet.summary.nextAction}</Text>
        </View>
        <Text style={[styles.launchStatus, isReady ? styles.launchStatusReady : styles.launchStatusBlocked]}>
          {isReady ? 'Ready' : 'Collect'}
        </Text>
      </View>
      <View style={styles.planActionRow}>
        <Pressable accessibilityLabel="Prepare release evidence packet" onPress={onPreparePacket} style={styles.planAction}>
          <Download color={theme.colors.brand} size={16} />
          <Text style={styles.planActionText}>Evidence packet</Text>
        </Pressable>
      </View>
      <View style={styles.qaPlatformList}>
        {packet.artifacts.map((artifact) => (
          <View key={artifact.key} style={styles.qaWorkflowRow}>
            {artifact.status === 'ready' ? (
              <CheckCircle2 color={theme.colors.success} size={14} />
            ) : (
              <TriangleAlert color={artifact.status === 'blocked' ? theme.colors.coral : theme.colors.amber} size={14} />
            )}
            <View style={styles.launchTrackTitleGroup}>
              <Text style={styles.qaWorkflowText}>{artifact.label}</Text>
              <Text style={styles.qaPlatformMore}>{artifact.command}</Text>
            </View>
          </View>
        ))}
      </View>
    </View>
  );
}

function StoreSubmissionPacketCard({
  credentialsPacket,
  onPrepareCredentialsPacket,
  onPreparePacket,
  packet,
}: {
  credentialsPacket: StoreCredentialsSetupPacket;
  onPrepareCredentialsPacket: () => void;
  onPreparePacket: () => void;
  packet: StoreSubmissionPacket;
}) {
  const isReady = packet.summary.status === 'metadata-ready';

  return (
    <View style={styles.releaseEvidencePacket}>
      <View style={styles.releaseUnblockHero}>
        <View style={styles.qaKitMetric}>
          <Text style={styles.qaKitMetricValue}>
            {packet.summary.checksPassed}/{packet.summary.checkCount}
          </Text>
          <Text style={styles.qaKitMetricLabel}>checks</Text>
        </View>
        <View style={styles.qaKitMetric}>
          <Text style={styles.qaKitMetricValue}>{packet.summary.screenshotCount}</Text>
          <Text style={styles.qaKitMetricLabel}>screens</Text>
        </View>
        <View style={styles.qaKitMetric}>
          <Text style={styles.qaKitMetricValue}>{packet.summary.copyIssueCount}</Text>
          <Text style={styles.qaKitMetricLabel}>copy issues</Text>
        </View>
      </View>
      <View style={styles.qaValidationTop}>
        <View style={styles.launchTrackTitleGroup}>
          <Text style={styles.qaValidationTitle}>Store submission packet</Text>
          <Text style={styles.qaKitText}>{packet.summary.nextAction}</Text>
        </View>
        <Text style={[styles.launchStatus, isReady ? styles.launchStatusReady : styles.launchStatusBlocked]}>
          {isReady ? 'Ready' : 'Review'}
        </Text>
      </View>
      <View style={styles.planActionRow}>
        <Pressable accessibilityLabel="Prepare store submission packet" onPress={onPreparePacket} style={styles.planAction}>
          <Download color={theme.colors.brand} size={16} />
          <Text style={styles.planActionText}>Store packet</Text>
        </Pressable>
        <Pressable
          accessibilityLabel="Prepare store credentials setup packet"
          onPress={onPrepareCredentialsPacket}
          style={styles.planAction}
        >
          <ShieldCheck color={theme.colors.brand} size={16} />
          <Text style={styles.planActionText}>Credentials packet</Text>
        </Pressable>
      </View>
      <View style={styles.qaPlatformList}>
        <View style={styles.qaWorkflowRow}>
          {credentialsPacket.summary.status === 'ready' ? (
            <CheckCircle2 color={theme.colors.success} size={14} />
          ) : (
            <TriangleAlert color={theme.colors.amber} size={14} />
          )}
          <View style={styles.launchTrackTitleGroup}>
            <Text style={styles.qaWorkflowText}>
              {credentialsPacket.summary.presentGroupCount}/{credentialsPacket.summary.totalGroupCount} credential groups ready
            </Text>
            <Text style={styles.qaPlatformMore}>{credentialsPacket.summary.nextAction}</Text>
          </View>
        </View>
        <View style={styles.qaWorkflowRow}>
          <CheckCircle2 color={theme.colors.success} size={14} />
          <View style={styles.launchTrackTitleGroup}>
            <Text style={styles.qaWorkflowText}>{packet.summary.iosBundleIdentifier}</Text>
            <Text style={styles.qaPlatformMore}>iOS bundle identifier</Text>
          </View>
        </View>
        <View style={styles.qaWorkflowRow}>
          <CheckCircle2 color={theme.colors.success} size={14} />
          <View style={styles.launchTrackTitleGroup}>
            <Text style={styles.qaWorkflowText}>{packet.summary.androidPackage}</Text>
            <Text style={styles.qaPlatformMore}>Android package</Text>
          </View>
        </View>
      </View>
    </View>
  );
}

function SafetyLanguageGuardCard({ guard }: { guard: ReturnType<typeof buildSafetyLanguageGuard> }) {
  const isClear = guard.status === 'clear';

  return (
    <View style={styles.qaKit}>
      <View style={styles.qaKitHero}>
        <View style={styles.qaKitMetric}>
          <Text style={styles.qaKitMetricValue}>{guard.scannedSourceCount}</Text>
          <Text style={styles.qaKitMetricLabel}>sources</Text>
        </View>
        <View style={styles.qaKitMetric}>
          <Text style={styles.qaKitMetricValue}>{guard.blockerCount}</Text>
          <Text style={styles.qaKitMetricLabel}>blockers</Text>
        </View>
        <View style={styles.qaKitMetric}>
          <Text style={styles.qaKitMetricValue}>{guard.warningCount}</Text>
          <Text style={styles.qaKitMetricLabel}>warnings</Text>
        </View>
      </View>
      <View style={styles.qaValidationTop}>
        <View style={styles.launchTrackTitleGroup}>
          <Text style={styles.qaValidationTitle}>Copy risk status</Text>
          <Text style={styles.qaKitText}>{guard.recommendation}</Text>
        </View>
        <Text style={[styles.launchStatus, isClear ? styles.launchStatusReady : styles.launchStatusBlocked]}>
          {isClear ? 'Clear' : 'Review'}
        </Text>
      </View>
      {guard.issues.length > 0 ? (
        <View style={styles.qaPlatformList}>
          {guard.issues.map((issue) => (
            <View key={issue.key} style={styles.releaseUnblockItem}>
              <View style={styles.releaseUnblockTop}>
                <View style={styles.launchTrackTitleGroup}>
                  <Text style={styles.releaseUnblockTitle}>{issue.label}</Text>
                  <Text style={styles.releaseUnblockMeta}>{issue.sourceLabel}</Text>
                </View>
                <Text style={[styles.launchStatus, issue.severity === 'blocker' ? styles.launchStatusBlocked : null]}>
                  {issue.severity}
                </Text>
              </View>
              <Text style={styles.qaKitText}>{issue.guidance}</Text>
              <Text style={styles.qaPlatformMore}>{issue.excerpt}</Text>
            </View>
          ))}
        </View>
      ) : (
        <View style={styles.releaseReadyRow}>
          <CheckCircle2 color={theme.colors.success} size={15} />
          <Text style={styles.qaWorkflowText}>No medical, injury-prevention, or route-safety claims found in checked Plan copy.</Text>
        </View>
      )}
    </View>
  );
}

function buildPlanSafetySources({
  commercialReadiness,
  evidencePlan,
  launchReadiness,
  modelEvidence,
  modelAssetProvenance,
  moveNetStaticAssets,
  modelVerificationSuite,
  recommendation,
  releaseCriticalPath,
  releaseEvidenceFreshness,
  releaseEvidenceScenarioPlanner,
  releaseEvidenceReconciliation,
  releaseBlockerIssueFilingPlan,
  releaseBlockerIssueWebLinksPacket,
  pwaReadiness,
  pwaRuntimeReadiness,
  vercelDeploymentReadiness,
  vercelWorkflowReadiness,
  releaseUnblockChecklist,
  validationConsentPacket,
  iosToolchainSetupPacket,
}: {
  commercialReadiness: ReturnType<typeof buildBillingReadinessSummary>;
  evidencePlan: ReturnType<typeof buildEvidenceCollectionPlan>;
  iosToolchainSetupPacket: IosToolchainSetupPacket;
  launchReadiness: ReturnType<typeof buildLaunchReadinessSummary>;
  modelEvidence: ReturnType<typeof buildModelEvidenceSummary>;
  modelAssetProvenance: ModelAssetProvenanceReport;
  moveNetStaticAssets: MoveNetStaticAssetsReport;
  modelVerificationSuite: ModelVerificationSuite;
  recommendation: ReturnType<typeof buildPlanRecommendation>;
  releaseCriticalPath: ReleaseCriticalPath;
  releaseEvidenceFreshness: ReleaseEvidenceFreshness;
  releaseEvidenceScenarioPlanner: ReleaseEvidenceScenarioPlanner;
  releaseEvidenceReconciliation: ReleaseEvidenceReconciliation;
  releaseBlockerIssueFilingPlan: ReleaseBlockerIssueFilingPlan;
  releaseBlockerIssueWebLinksPacket: ReleaseBlockerIssueWebLinksPacket;
  pwaReadiness: typeof pwaReadinessReport;
  pwaRuntimeReadiness: PwaRuntimeReadiness;
  vercelDeploymentReadiness: VercelDeploymentReport;
  vercelWorkflowReadiness: VercelWorkflowReport;
  releaseUnblockChecklist: ReturnType<typeof buildReleaseUnblockChecklist>;
  validationConsentPacket: ValidationConsentPacket;
}): SafetyLanguageSource[] {
  return [
    {
      key: 'plan-recommendation',
      label: 'Plan recommendation',
      text: `${recommendation.title} ${recommendation.action}`,
    },
    {
      key: 'commercial-readiness',
      label: 'Commercial readiness',
      text: [commercialReadiness.action, ...commercialReadiness.checks.map((check) => check.detail)].join(' '),
    },
    {
      key: 'launch-readiness',
      label: 'Launch readiness',
      text: [
        launchReadiness.nextAction,
        ...launchReadiness.tracks.flatMap((track) => [track.summary, track.action, ...track.checks.map((check) => check.action)]),
      ].join(' '),
    },
    {
      key: 'model-evidence',
      label: 'Model evidence',
      text: [modelEvidence.action, modelEvidence.limitation, ...modelEvidence.checks.map((check) => check.detail)].join(' '),
    },
    {
      key: 'model-verification-suite',
      label: 'Model verification suite',
      text: [
        modelVerificationSuite.summary.nextAction,
        ...modelVerificationSuite.checks.map((check) => `${check.label} ${check.detail} ${check.command}`),
      ].join(' '),
    },
    {
      key: 'movenet-static-assets',
      label: 'MoveNet static assets',
      text: [
        moveNetStaticAssets.summary.nextAction,
        moveNetStaticAssets.modelUrl,
        ...moveNetStaticAssets.checks.map((check) => `${check.label} ${check.detail} ${check.action}`),
      ].join(' '),
    },
    {
      key: 'model-asset-provenance',
      label: 'Model asset provenance',
      text: [
        modelAssetProvenance.summary.nextAction,
        modelAssetProvenance.source.modelUrl,
        ...modelAssetProvenance.checks.map((check) => `${check.label} ${check.detail} ${check.action}`),
      ].join(' '),
    },
    {
      key: 'evidence-collection',
      label: 'Evidence collection',
      text: [
        evidencePlan.summary.action,
        ...evidencePlan.externalEvidence.map((item) => item.label),
        ...evidencePlan.cueValidation.collectionBatches.map((batch) => batch.captureFocus),
        ...evidencePlan.cueValidation.collectionChecklist,
      ].join(' '),
    },
    {
      key: 'validation-consent',
      label: 'Validation consent',
      text: [
        validationConsentPacket.summary.nextAction,
        validationConsentPacket.consentProtocol.athleteScript,
        validationConsentPacket.consentProtocol.bystanderPolicy,
        validationConsentPacket.consentProtocol.retentionPolicy,
        validationConsentPacket.consentProtocol.withdrawalPolicy,
        ...validationConsentPacket.consentProtocol.consentChecks,
      ].join(' '),
    },
    {
      key: 'ios-toolchain-setup',
      label: 'iOS toolchain setup',
      text: [
        iosToolchainSetupPacket.summary.nextAction,
        ...iosToolchainSetupPacket.checks.flatMap((check) => [check.label, check.action, ...check.proof]),
        ...iosToolchainSetupPacket.commands.map((command) => `${command.command} ${command.purpose}`),
      ].join(' '),
    },
    {
      key: 'release-unblock',
      label: 'Release unblock',
      text: releaseUnblockChecklist.items
        .flatMap((item) => [item.action, item.secretPolicy, ...item.acceptance, ...item.proof])
        .join(' '),
    },
    {
      key: 'release-evidence-reconciliation',
      label: 'Release evidence reconciliation',
      text: [
        releaseEvidenceReconciliation.summary.nextAction,
        ...releaseEvidenceReconciliation.items.flatMap((item) => [item.label, item.detail, item.command, ...item.proof]),
      ].join(' '),
    },
    {
      key: 'release-blocker-issue-filing',
      label: 'Release blocker issue filing',
      text: [
        releaseBlockerIssueFilingPlan.summary.nextAction,
        ...releaseBlockerIssueFilingPlan.issues.flatMap((issue) => [
          issue.title,
          issue.commandPreview,
          issue.filingStatus,
          ...issue.labels,
        ]),
      ].join(' '),
    },
    {
      key: 'release-blocker-issue-links',
      label: 'Release blocker issue links',
      text: [
        releaseBlockerIssueWebLinksPacket.summary.nextAction,
        ...releaseBlockerIssueWebLinksPacket.issues.flatMap((issue) => [
          issue.title,
          issue.status,
          ...issue.labels,
        ]),
      ].join(' '),
    },
    {
      key: 'release-critical-path',
      label: 'Release critical path',
      text: [
        releaseCriticalPath.summary.nextAction,
        ...releaseCriticalPath.steps.flatMap((step) => [step.label, step.action, ...step.acceptance, ...step.commands]),
      ].join(' '),
    },
    {
      key: 'release-evidence-scenarios',
      label: 'Release evidence scenarios',
      text: [
        releaseEvidenceScenarioPlanner.summary.nextAction,
        ...releaseEvidenceScenarioPlanner.scenarios.flatMap((scenario) => [
          scenario.label,
          scenario.description,
          scenario.summary.nextAction,
          ...scenario.acceptance,
          ...scenario.commands,
        ]),
      ].join(' '),
    },
    {
      key: 'release-evidence-freshness',
      label: 'Release evidence freshness',
      text: [
        releaseEvidenceFreshness.summary.nextAction,
        ...releaseEvidenceFreshness.artifacts.flatMap((artifact) => [
          artifact.label,
          artifact.detail,
          artifact.refreshCommand,
        ]),
      ].join(' '),
    },
    {
      key: 'pwa-readiness',
      label: 'PWA readiness',
      text: [
        pwaReadiness.summary.nextAction,
        ...pwaReadiness.checks.flatMap((check) => [check.label, check.detail, check.status]),
      ].join(' '),
    },
    {
      key: 'pwa-runtime-readiness',
      label: 'PWA runtime readiness',
      text: [
        pwaRuntimeReadiness.summary.nextAction,
        pwaRuntimeReadiness.summary.status,
        ...pwaRuntimeReadiness.checks.flatMap((check) => [check.label, check.detail, check.status, check.action]),
      ].join(' '),
    },
    {
      key: 'vercel-deployment-readiness',
      label: 'Vercel deployment readiness',
      text: [
        vercelDeploymentReadiness.summary.nextAction,
        ...vercelDeploymentReadiness.checks.flatMap((check) => [check.label, check.detail, check.status, check.action]),
        ...vercelDeploymentReadiness.commands.map((command) => `${command.command} ${command.purpose}`),
      ].join(' '),
    },
    {
      key: 'vercel-workflow-readiness',
      label: 'Vercel workflow readiness',
      text: [
        vercelWorkflowReadiness.summary.nextAction,
        ...vercelWorkflowReadiness.checks.flatMap((check) => [check.label, check.detail, check.status, check.action]),
      ].join(' '),
    },
  ];
}

export function PlanScreen() {
  const [nativeQaComposerGeneratedAt] = useState(() => new Date().toISOString());
  const [nativeQaComposerRuns, setNativeQaComposerRuns] = useState<NativeQaEvidenceComposerRun[]>(
    defaultNativeQaComposerRuns,
  );
  const [nativeQaEvidenceJson, setNativeQaEvidenceJson] = useState('');
  const [preparedPlanExport, setPreparedPlanExport] = useState<{ body: string; title: string } | null>(null);
  const [releaseEvidenceReconciliationJson, setReleaseEvidenceReconciliationJson] = useState('');
  const pwaRuntime = usePwaRuntimeReadiness();
  const catalog = buildPlanCatalog(appConfig.activePlan);
  const recommendation = buildPlanRecommendation(appConfig.activePlan);
  const evidencePlan = buildEvidenceCollectionPlan();
  const validationConsentPacket = buildValidationConsentPacket({ plan: evidencePlan });
  const validationPilotKit = buildValidationPilotKit({ plan: evidencePlan });
  const launchReadiness = buildLaunchReadinessSummary(appConfig.launchReadinessEvidence);
  const modelEvidence = buildModelEvidenceSummary(appConfig.modelEvidence);
  const modelVerificationSuite = buildModelVerificationSuite({
    modelAnalysisReplayReport,
    moveNetReadinessReport,
    realWorldValidation: appConfig.modelEvidence?.realWorldValidation,
  });
  const iosToolchainSetupPacket = buildIosToolchainSetupPacket({
    report: iosToolchainReport,
  });
  const nativeQaKit = buildNativeQaEvidenceKit();
  const nativeQaComposerPreview = buildNativeQaEvidenceComposerPreview({
    appVersion: '1.0.0',
    generatedAt: nativeQaComposerGeneratedAt,
    runs: nativeQaComposerRuns,
  });
  const nativeQaImportPreview = buildNativeQaEvidenceImportPreview(nativeQaEvidenceJson);
  const providerReadiness = buildProviderReadinessSummary(appConfig);
  const commercialReadiness = buildBillingReadinessSummary(appConfig.billingReadiness);
  const releaseUnblockChecklist = buildReleaseUnblockChecklist(appConfig.launchReadinessEvidence);
  const releaseCriticalPath = buildReleaseCriticalPath({
    checklist: releaseUnblockChecklist,
    evidence: appConfig.launchReadinessEvidence,
  });
  const releaseEvidenceScenarioPlanner = buildReleaseEvidenceScenarioPlanner({
    currentEvidence: appConfig.launchReadinessEvidence,
  });
  const releaseEvidenceFreshness = buildReleaseEvidenceFreshness({
    artifacts: buildReleaseEvidenceFreshnessArtifactInputs(
      {
        featureCompletionReport,
        launchReadinessReport,
        modelAssetProvenanceReport,
        modelAnalysisReplayReport,
        moveNetStaticAssetsReport,
        modelVerificationSuiteReport,
        moveNetReadinessReport,
        pwaReadinessReport,
        storeSubmissionPacket: storeSubmissionReport,
        vercelDeploymentReport,
        vercelWorkflowReport,
      },
      { includeMissing: false },
    ),
  });
  const releaseEvidenceReconciliationInput = parseReleaseEvidenceReconciliationInput(releaseEvidenceReconciliationJson);
  const releaseEvidenceReconciliation = buildReleaseEvidenceReconciliation({
    currentEvidence: appConfig.launchReadinessEvidence,
    importedEvidence: releaseEvidenceReconciliationInput.bundle,
    parseError: releaseEvidenceReconciliationInput.parseError,
  });
  const nativeQaRunbookPacket = buildNativeQaRunbookPacket();
  const releaseUnblockPacket = buildReleaseUnblockPacket({
    checklist: releaseUnblockChecklist,
  });
  const releaseBlockerIssuePacket = buildReleaseBlockerIssuePacket({
    checklist: releaseUnblockChecklist,
  });
  const releaseBlockerIssueFilingPlan = buildReleaseBlockerIssueFilingPlan({
    packet: releaseBlockerIssuePacket,
  });
  const releaseBlockerIssueWebLinksPacket = buildReleaseBlockerIssueWebLinksPacket({
    packet: releaseBlockerIssuePacket,
    repository: appConfig.releaseRepository,
  });
  const fieldValidationOpsPacket = buildFieldValidationOpsPacket({
    evidencePlan,
    releaseUnblockChecklist,
    validationPilotKit,
  });
  const releaseEvidencePacket = buildReleaseEvidencePacket({
    evidenceCollectionPlan: evidencePlan,
    launchReadiness,
    modelEvidence,
    nativeQaRunbookPacket,
    providerReadiness,
    releaseUnblockPacket,
  });
  const storeSubmissionPacket = buildStoreSubmissionPacket({
    manifest: buildRuntimeStoreReadinessManifest(),
  });
  const staticEasProjectId = (appJson.expo.extra as { eas?: { projectId?: string } } | undefined)?.eas?.projectId;
  const storeCredentialsSetupPacket = buildStoreCredentialsSetupPacket({
    androidPackage: storeSubmissionPacket.summary.androidPackage,
    easProjectConfigured: typeof staticEasProjectId === 'string' && Boolean(staticEasProjectId.trim()),
    iosBundleIdentifier: storeSubmissionPacket.summary.iosBundleIdentifier,
    name: appJson.expo.name,
    slug: appJson.expo.slug,
  });
  const safetyLanguageGuard = buildSafetyLanguageGuard(
    buildPlanSafetySources({
      commercialReadiness,
      evidencePlan,
      iosToolchainSetupPacket,
      launchReadiness,
      modelEvidence,
      modelAssetProvenance: modelAssetProvenanceReport,
      moveNetStaticAssets: moveNetStaticAssetsReport,
      modelVerificationSuite,
      recommendation,
      releaseCriticalPath,
      releaseEvidenceFreshness,
      releaseEvidenceScenarioPlanner,
      releaseEvidenceReconciliation,
      releaseBlockerIssueFilingPlan,
      releaseBlockerIssueWebLinksPacket,
      pwaReadiness: pwaReadinessReport,
      pwaRuntimeReadiness: pwaRuntime.readiness,
      vercelDeploymentReadiness: vercelDeploymentReport,
      vercelWorkflowReadiness: vercelWorkflowReport,
      releaseUnblockChecklist,
      validationConsentPacket,
    }),
  );
  const groupedCapabilities = catalog
    .find((item) => item.key === 'coach')
    ?.capabilities.reduce<Record<string, PlanCatalogItem['capabilities']>>((groups, capability) => {
      groups[capability.group] = [...(groups[capability.group] ?? []), capability];
      return groups;
    }, {});

  function prepareReleaseUnblockPacket() {
    selectionFeedback();
    setPreparedPlanExport({
      body: JSON.stringify(releaseUnblockPacket, null, 2),
      title: 'Prepared release unblock packet',
    });
  }

  function prepareReleaseBlockerIssuePacket() {
    selectionFeedback();
    setPreparedPlanExport({
      body: JSON.stringify(releaseBlockerIssuePacket, null, 2),
      title: 'Prepared release blocker issue packet',
    });
  }

  function prepareReleaseBlockerIssueFilingPlan() {
    selectionFeedback();
    setPreparedPlanExport({
      body: JSON.stringify(releaseBlockerIssueFilingPlan, null, 2),
      title: 'Prepared release blocker issue filing plan',
    });
  }

  function prepareReleaseBlockerIssueWebLinksPacket() {
    selectionFeedback();
    setPreparedPlanExport({
      body: JSON.stringify(releaseBlockerIssueWebLinksPacket, null, 2),
      title: 'Prepared release blocker issue web links',
    });
  }

  function prepareReleaseCriticalPathPacket() {
    selectionFeedback();
    setPreparedPlanExport({
      body: JSON.stringify(releaseCriticalPath, null, 2),
      title: 'Prepared release critical path',
    });
  }

  function prepareReleaseEvidenceScenarioPacket() {
    selectionFeedback();
    setPreparedPlanExport({
      body: JSON.stringify(releaseEvidenceScenarioPlanner, null, 2),
      title: 'Prepared release evidence scenarios',
    });
  }

  function prepareNativeQaRunbookPacket() {
    selectionFeedback();
    setPreparedPlanExport({
      body: JSON.stringify(nativeQaRunbookPacket, null, 2),
      title: 'Prepared native QA runbook',
    });
  }

  function prepareReleaseEvidencePacket() {
    selectionFeedback();
    setPreparedPlanExport({
      body: JSON.stringify(releaseEvidencePacket, null, 2),
      title: 'Prepared release evidence packet',
    });
  }

  function prepareReleaseEvidenceReconciliationPacket() {
    selectionFeedback();
    setPreparedPlanExport({
      body: JSON.stringify(releaseEvidenceReconciliation, null, 2),
      title: 'Prepared release evidence reconciliation',
    });
  }

  function prepareFieldValidationOpsPacket() {
    selectionFeedback();
    setPreparedPlanExport({
      body: JSON.stringify(fieldValidationOpsPacket, null, 2),
      title: 'Prepared field validation ops packet',
    });
  }

  function prepareIosToolchainSetupPacket() {
    selectionFeedback();
    setPreparedPlanExport({
      body: JSON.stringify(iosToolchainSetupPacket, null, 2),
      title: 'Prepared iOS toolchain setup packet',
    });
  }

  function prepareValidationCollectionPacket() {
    selectionFeedback();
    const packet = buildValidationCollectionPacket({
      plan: evidencePlan,
    });
    setPreparedPlanExport({
      body: JSON.stringify(packet, null, 2),
      title: 'Prepared validation collection packet',
    });
  }

  function prepareValidationConsentPacket() {
    selectionFeedback();
    setPreparedPlanExport({
      body: JSON.stringify(validationConsentPacket, null, 2),
      title: 'Prepared validation consent packet',
    });
  }

  function prepareValidationPilotKit() {
    selectionFeedback();
    setPreparedPlanExport({
      body: JSON.stringify(validationPilotKit, null, 2),
      title: 'Prepared validation pilot kit',
    });
  }

  function prepareStoreSubmissionPacket() {
    selectionFeedback();
    setPreparedPlanExport({
      body: JSON.stringify(storeSubmissionPacket, null, 2),
      title: 'Prepared store submission packet',
    });
  }

  function prepareStoreCredentialsSetupPacket() {
    selectionFeedback();
    setPreparedPlanExport({
      body: JSON.stringify(storeCredentialsSetupPacket, null, 2),
      title: 'Prepared store credentials setup packet',
    });
  }

  function prepareCommercialReadinessPacket() {
    selectionFeedback();
    const packet = buildCommercialReadinessPacket({
      readiness: commercialReadiness,
    });
    setPreparedPlanExport({
      body: JSON.stringify(packet, null, 2),
      title: 'Prepared commercial readiness packet',
    });
  }

  function prepareVercelDeploymentPacket() {
    selectionFeedback();
    setPreparedPlanExport({
      body: JSON.stringify(vercelDeploymentReport, null, 2),
      title: 'Prepared Vercel deployment packet',
    });
  }

  function prepareVercelWorkflowPacket() {
    selectionFeedback();
    setPreparedPlanExport({
      body: JSON.stringify(vercelWorkflowReport, null, 2),
      title: 'Prepared Vercel workflow packet',
    });
  }

  function prepareMoveNetStaticAssetsPacket() {
    selectionFeedback();
    setPreparedPlanExport({
      body: JSON.stringify(moveNetStaticAssetsReport, null, 2),
      title: 'Prepared MoveNet static assets packet',
    });
  }

  function prepareModelAssetProvenancePacket() {
    selectionFeedback();
    setPreparedPlanExport({
      body: JSON.stringify(modelAssetProvenanceReport, null, 2),
      title: 'Prepared model asset provenance packet',
    });
  }

  async function preparePwaInstallGuidance() {
    selectionFeedback();
    await pwaRuntime.promptInstall();
    const packet = buildPwaInstallGuidancePacket(pwaRuntime.readiness);
    setPreparedPlanExport({
      body: JSON.stringify(packet, null, 2),
      title: 'Prepared PWA install guidance',
    });
  }

  function updateNativeQaComposerRun(
    platform: NativeQaEvidenceComposerRun['platform'],
    patch: Partial<NativeQaEvidenceComposerRun>,
  ) {
    setNativeQaComposerRuns((runs) => runs.map((run) => (run.platform === platform ? { ...run, ...patch } : run)));
  }

  function useComposedNativeQaEvidence() {
    selectionFeedback();
    setNativeQaEvidenceJson(nativeQaComposerPreview.payloadJson);
  }

  function prepareComposedNativeQaEvidenceExport() {
    selectionFeedback();
    try {
      const packet = buildNativeQaEvidenceComposerExport({
        preview: nativeQaComposerPreview,
      });
      setPreparedPlanExport({
        body: JSON.stringify(packet, null, 2),
        title: 'Prepared native QA evidence JSON',
      });
    } catch (error) {
      setPreparedPlanExport({
        body: error instanceof Error ? error.message : 'Native QA evidence export could not be prepared.',
        title: 'Native QA evidence blocked',
      });
    }
  }

  async function sharePreparedPlanExport() {
    if (!preparedPlanExport) return;
    selectionFeedback();
    try {
      await sharePreparedExportFile(preparedPlanExport);
    } catch (error) {
      setPreparedPlanExport({
        body: error instanceof Error ? error.message : 'Prepared plan export could not be shared from this device.',
        title: 'Share failed',
      });
    }
  }

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

      <Section title="Feature completion" caption="Machine-readable audit of tracked tasks, backlog, traceability, and launch blockers.">
        <FeatureCompletionCard report={featureCompletionReport} />
      </Section>

      <Section title="Model evidence" caption="Local model proof with real-world validation kept explicit.">
        <ModelEvidenceCard evidence={modelEvidence} />
      </Section>

      <Section title="Model verification suite" caption="Aggregated local proof for runtime, replay, privacy, and validation gaps.">
        <ModelVerificationSuiteCard suite={modelVerificationSuite} />
        <MoveNetStaticAssetsCard onPreparePacket={prepareMoveNetStaticAssetsPacket} report={moveNetStaticAssetsReport} />
        <ModelAssetProvenanceCard onPreparePacket={prepareModelAssetProvenancePacket} report={modelAssetProvenanceReport} />
      </Section>

      <Section title="Provider readiness" caption="Configured model providers, runtime fallback, and native-build proof status.">
        <ProviderReadinessCard readiness={providerReadiness} />
      </Section>

      <Section title="Native QA evidence kit" caption="Physical-device evidence checklist for internal beta and store readiness.">
        <NativeQaEvidenceKitCard
          composerPreview={nativeQaComposerPreview}
          composerRuns={nativeQaComposerRuns}
          importInput={nativeQaEvidenceJson}
          importPreview={nativeQaImportPreview}
          kit={nativeQaKit}
          onClearImport={() => setNativeQaEvidenceJson('')}
          onComposerRunChange={updateNativeQaComposerRun}
          onImportChange={setNativeQaEvidenceJson}
          onPrepareComposedExport={prepareComposedNativeQaEvidenceExport}
          onPrepareRunbook={prepareNativeQaRunbookPacket}
          onUseComposedEvidence={useComposedNativeQaEvidence}
        />
      </Section>

      <Section title="iOS toolchain setup" caption="Share-safe full-Xcode and iOS build unblock plan derived from the current doctor report.">
        <IosToolchainSetupCard onPreparePacket={prepareIosToolchainSetupPacket} packet={iosToolchainSetupPacket} />
      </Section>

      <Section title="Evidence collection plan" caption="Real-world validation targets derived from release contracts.">
        <EvidenceCollectionPlanCard
          consentPacket={validationConsentPacket}
          onPrepareConsentPacket={prepareValidationConsentPacket}
          onPreparePacket={prepareValidationCollectionPacket}
          onPreparePilotKit={prepareValidationPilotKit}
          pilotKit={validationPilotKit}
          plan={evidencePlan}
        />
      </Section>

      <Section title="Field validation ops" caption="Operational run plan for real clips, coach review rows, device QA, and release promotion.">
        <FieldValidationOpsCard onPreparePacket={prepareFieldValidationOpsPacket} packet={fieldValidationOpsPacket} />
      </Section>

      <Section title="Release unblock checklist" caption="External access and proof needed before native beta or store submission.">
        <ReleaseUnblockChecklistCard checklist={releaseUnblockChecklist} onPreparePacket={prepareReleaseUnblockPacket} />
      </Section>

      <Section title="Release critical path" caption="Parallel owner lanes and dependencies for clearing external launch blockers.">
        <ReleaseCriticalPathCard onPreparePacket={prepareReleaseCriticalPathPacket} path={releaseCriticalPath} />
      </Section>

      <Section title="Release evidence scenarios" caption="Compare proof bundles before collecting account, device, or coach-review evidence.">
        <ReleaseEvidenceScenarioCard
          onPreparePacket={prepareReleaseEvidenceScenarioPacket}
          planner={releaseEvidenceScenarioPlanner}
        />
      </Section>

      <Section title="Release evidence freshness" caption="Checks that generated release evidence is recent enough for handoff.">
        <ReleaseEvidenceFreshnessCard freshness={releaseEvidenceFreshness} />
      </Section>

      <Section title="Installable PWA" caption="Static Vercel-ready web install path with no backend requirement.">
        <PwaReadinessCard report={pwaReadinessReport} />
        <PwaRuntimeCard onInstall={() => void preparePwaInstallGuidance()} readiness={pwaRuntime.readiness} />
      </Section>

      <Section title="Vercel deployment" caption="Static prebuilt deployment readiness without backend or committed secrets.">
        <VercelDeploymentCard onPreparePacket={prepareVercelDeploymentPacket} report={vercelDeploymentReport} />
        <VercelWorkflowCard onPreparePacket={prepareVercelWorkflowPacket} report={vercelWorkflowReport} />
      </Section>

      <Section title="Evidence reconciliation" caption="Paste share-safe release reports to preview which launch blockers would clear.">
        <ReleaseEvidenceReconciliationCard
          input={releaseEvidenceReconciliationJson}
          onChange={setReleaseEvidenceReconciliationJson}
          onClear={() => setReleaseEvidenceReconciliationJson('')}
          onPreparePacket={prepareReleaseEvidenceReconciliationPacket}
          reconciliation={releaseEvidenceReconciliation}
        />
      </Section>

      <Section title="Release blocker issues" caption="Issue-ready external blocker drafts for GitHub tracking without secrets.">
        <ReleaseBlockerIssueCard onPreparePacket={prepareReleaseBlockerIssuePacket} packet={releaseBlockerIssuePacket} />
      </Section>

      <Section title="Release blocker issue filing" caption="Dry-run GitHub filing plan for external blocker tracking.">
        <ReleaseBlockerIssueFilingCard
          onPreparePlan={prepareReleaseBlockerIssueFilingPlan}
          plan={releaseBlockerIssueFilingPlan}
        />
      </Section>

      <Section title="Release blocker issue links" caption="Prefilled GitHub issue URLs for mobile or browser-based filing.">
        <ReleaseBlockerIssueWebLinksCard
          onPreparePacket={prepareReleaseBlockerIssueWebLinksPacket}
          packet={releaseBlockerIssueWebLinksPacket}
        />
      </Section>

      <Section title="Release evidence packet" caption="One share-safe packet for QA, product validation, and release owners.">
        <ReleaseEvidencePacketCard packet={releaseEvidencePacket} onPreparePacket={prepareReleaseEvidencePacket} />
      </Section>

      <Section title="Store submission packet" caption="Metadata, privacy declarations, screenshots, and copy checks before App Store or Play handoff.">
        <StoreSubmissionPacketCard
          credentialsPacket={storeCredentialsSetupPacket}
          onPrepareCredentialsPacket={prepareStoreCredentialsSetupPacket}
          onPreparePacket={prepareStoreSubmissionPacket}
          packet={storeSubmissionPacket}
        />
      </Section>

      {preparedPlanExport ? (
        <Section
          title={preparedPlanExport.title}
          trailing={
            <Pressable accessibilityLabel="Share prepared plan export" onPress={() => void sharePreparedPlanExport()} style={styles.planAction}>
              <Share2 color={theme.colors.brand} size={16} />
              <Text style={styles.planActionText}>Share</Text>
            </Pressable>
          }
        >
          <View style={styles.planExportBox}>
            <Text selectable style={styles.planExportText}>{preparedPlanExport.body}</Text>
          </View>
        </Section>
      ) : null}

      <Section title="Safety language guard" caption="Checks product and release copy for medical or route-safety guarantees.">
        <SafetyLanguageGuardCard guard={safetyLanguageGuard} />
      </Section>

      <Section title="Commercial readiness" caption="Checkout can be connected later without changing analysis contracts.">
        <CommercialReadinessCard onPreparePacket={prepareCommercialReadinessPacket} readiness={commercialReadiness} />
      </Section>
    </Screen>
  );
}

const styles = StyleSheet.create({
  evidencePlan: {
    backgroundColor: theme.colors.surface,
    borderColor: theme.colors.line,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    gap: theme.spacing.sm,
    padding: theme.spacing.md,
  },
  evidencePlanGrid: {
    gap: theme.spacing.sm,
  },
  evidencePlanHero: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.sm,
  },
  evidencePlanTop: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: theme.spacing.sm,
    justifyContent: 'space-between',
  },
  evidencePlanItem: {
    backgroundColor: theme.colors.surfaceAlt,
    borderRadius: theme.radius.sm,
    gap: 5,
    padding: theme.spacing.sm,
  },
  evidencePlanTitle: {
    color: theme.colors.ink,
    fontSize: 13,
    fontWeight: '900',
  },
  composerField: {
    flex: 1,
    gap: 4,
    minWidth: 118,
  },
  composerGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.sm,
  },
  composerInput: {
    backgroundColor: '#FFFFFF',
    borderColor: theme.colors.line,
    borderRadius: theme.radius.sm,
    borderWidth: 1,
    color: theme.colors.ink,
    fontSize: 12,
    fontWeight: '800',
    minHeight: 38,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 8,
  },
  composerLabel: {
    color: theme.colors.muted,
    fontSize: 10,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  composerRun: {
    backgroundColor: '#FFFFFF',
    borderColor: theme.colors.line,
    borderRadius: theme.radius.sm,
    borderWidth: 1,
    gap: theme.spacing.sm,
    padding: theme.spacing.sm,
  },
  composerRuns: {
    gap: theme.spacing.sm,
  },
  composerToggle: {
    backgroundColor: '#FFF5E7',
    borderRadius: theme.radius.sm,
    paddingHorizontal: 9,
    paddingVertical: 6,
  },
  composerToggleReady: {
    backgroundColor: '#E6F3EC',
  },
  composerToggleText: {
    color: theme.colors.amber,
    fontSize: 11,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  composerToggleTextReady: {
    color: theme.colors.success,
  },
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
  providerMetricValue: {
    color: theme.colors.brand,
    fontSize: 11,
    fontWeight: '900',
    lineHeight: 15,
  },
  planAction: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderColor: theme.colors.line,
    borderRadius: theme.radius.sm,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  planActionRow: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.sm,
  },
  planActionText: {
    color: theme.colors.brand,
    fontSize: 12,
    fontWeight: '900',
  },
  planExportBox: {
    backgroundColor: theme.colors.surface,
    borderColor: theme.colors.line,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    padding: theme.spacing.md,
  },
  planExportText: {
    color: theme.colors.text,
    fontFamily: 'Courier',
    fontSize: 11,
    lineHeight: 15,
  },
  nativeEvidenceActions: {
    alignItems: 'flex-start',
  },
  nativeEvidenceButton: {
    backgroundColor: theme.colors.brand,
    borderRadius: theme.radius.sm,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: 9,
  },
  nativeEvidenceButtonText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '900',
  },
  nativeEvidenceError: {
    color: theme.colors.coral,
    fontSize: 12,
    fontWeight: '800',
    lineHeight: 17,
  },
  nativeEvidenceImport: {
    backgroundColor: theme.colors.surfaceAlt,
    borderColor: theme.colors.line,
    borderRadius: theme.radius.sm,
    borderWidth: 1,
    gap: theme.spacing.sm,
    padding: theme.spacing.sm,
  },
  nativeEvidenceComposer: {
    backgroundColor: theme.colors.surfaceAlt,
    borderColor: theme.colors.line,
    borderRadius: theme.radius.sm,
    borderWidth: 1,
    gap: theme.spacing.sm,
    padding: theme.spacing.sm,
  },
  nativeEvidenceInput: {
    backgroundColor: '#FFFFFF',
    borderColor: theme.colors.line,
    borderRadius: theme.radius.sm,
    borderWidth: 1,
    color: theme.colors.ink,
    fontFamily: 'Courier',
    fontSize: 12,
    minHeight: 96,
    padding: theme.spacing.sm,
    textAlignVertical: 'top',
  },
  nativeEvidenceStats: {
    flexDirection: 'row',
    gap: 8,
  },
  nativeRunLabel: {
    color: theme.colors.text,
    flex: 1,
    fontSize: 12,
    fontWeight: '800',
  },
  nativeRunList: {
    gap: 6,
  },
  nativeRunRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 6,
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
    minWidth: 98,
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
  releaseReadyRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 6,
  },
  releaseEvidencePacket: {
    backgroundColor: theme.colors.surface,
    borderColor: theme.colors.line,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    gap: theme.spacing.sm,
    padding: theme.spacing.md,
  },
  releaseUnblock: {
    backgroundColor: theme.colors.surface,
    borderColor: theme.colors.line,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    gap: theme.spacing.sm,
    padding: theme.spacing.md,
  },
  releaseUnblockHero: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
  },
  releaseUnblockItem: {
    backgroundColor: theme.colors.surfaceAlt,
    borderRadius: theme.radius.sm,
    gap: 6,
    padding: theme.spacing.sm,
  },
  releaseUnblockList: {
    gap: theme.spacing.sm,
  },
  releaseUnblockMeta: {
    color: theme.colors.muted,
    fontSize: 11,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  releaseUnblockTitle: {
    color: theme.colors.ink,
    fontSize: 13,
    fontWeight: '900',
  },
  releaseUnblockTop: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: theme.spacing.sm,
    justifyContent: 'space-between',
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
