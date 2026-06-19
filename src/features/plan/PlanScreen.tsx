import { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { ArrowUpRight, CheckCircle2, Circle, Download, Share2, ShieldCheck, TriangleAlert } from 'lucide-react-native';

import { Header } from '@/components/Header';
import { Screen } from '@/components/Screen';
import { Section } from '@/components/Section';
import { appConfig } from '@/core/config';
import { buildEvidenceCollectionPlan } from '@/core/evidenceCollectionPlan';
import { buildLaunchReadinessSummary, type LaunchReadinessTrack } from '@/core/launchReadiness';
import { buildModelEvidenceSummary } from '@/core/modelEvidence';
import {
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
import { buildReleaseEvidencePacket, type ReleaseEvidencePacket } from '@/core/releaseEvidencePacket';
import { buildReleaseUnblockChecklist } from '@/core/releaseUnblockChecklist';
import { buildReleaseUnblockPacket } from '@/core/releaseUnblockPacket';
import { buildSafetyLanguageGuard, type SafetyLanguageSource } from '@/core/safetyLanguage';
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
  onRunChange,
  onUseComposedJson,
  preview,
  runs,
}: {
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

function EvidenceCollectionPlanCard({ plan }: { plan: ReturnType<typeof buildEvidenceCollectionPlan> }) {
  return (
    <View style={styles.evidencePlan}>
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
      </View>
      <Text style={styles.qaKitAction}>{plan.summary.action}</Text>
      <View style={styles.evidencePlanGrid}>
        <View style={styles.evidencePlanItem}>
          <Text style={styles.evidencePlanTitle}>Cue validation</Text>
          <Text style={styles.qaKitText}>
            {plan.cueValidation.minDistinctReviewersPerClip} coach reviewers per clip · average score at least{' '}
            {plan.cueValidation.minAverageCueScore}/5
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
  evidencePlan,
  launchReadiness,
  modelEvidence,
  recommendation,
  releaseUnblockChecklist,
}: {
  evidencePlan: ReturnType<typeof buildEvidenceCollectionPlan>;
  launchReadiness: ReturnType<typeof buildLaunchReadinessSummary>;
  modelEvidence: ReturnType<typeof buildModelEvidenceSummary>;
  recommendation: ReturnType<typeof buildPlanRecommendation>;
  releaseUnblockChecklist: ReturnType<typeof buildReleaseUnblockChecklist>;
}): SafetyLanguageSource[] {
  return [
    {
      key: 'plan-recommendation',
      label: 'Plan recommendation',
      text: `${recommendation.title} ${recommendation.action}`,
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
      key: 'evidence-collection',
      label: 'Evidence collection',
      text: `${evidencePlan.summary.action} ${evidencePlan.externalEvidence.map((item) => item.label).join(' ')}`,
    },
    {
      key: 'release-unblock',
      label: 'Release unblock',
      text: releaseUnblockChecklist.items
        .flatMap((item) => [item.action, item.secretPolicy, ...item.acceptance, ...item.proof])
        .join(' '),
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
  const catalog = buildPlanCatalog(appConfig.activePlan);
  const recommendation = buildPlanRecommendation(appConfig.activePlan);
  const evidencePlan = buildEvidenceCollectionPlan();
  const launchReadiness = buildLaunchReadinessSummary(appConfig.launchReadinessEvidence);
  const modelEvidence = buildModelEvidenceSummary(appConfig.modelEvidence);
  const nativeQaKit = buildNativeQaEvidenceKit();
  const nativeQaComposerPreview = buildNativeQaEvidenceComposerPreview({
    appVersion: '1.0.0',
    generatedAt: nativeQaComposerGeneratedAt,
    runs: nativeQaComposerRuns,
  });
  const nativeQaImportPreview = buildNativeQaEvidenceImportPreview(nativeQaEvidenceJson);
  const providerReadiness = buildProviderReadinessSummary(appConfig);
  const releaseUnblockChecklist = buildReleaseUnblockChecklist(appConfig.launchReadinessEvidence);
  const nativeQaRunbookPacket = buildNativeQaRunbookPacket();
  const releaseUnblockPacket = buildReleaseUnblockPacket({
    checklist: releaseUnblockChecklist,
  });
  const releaseEvidencePacket = buildReleaseEvidencePacket({
    evidenceCollectionPlan: evidencePlan,
    launchReadiness,
    modelEvidence,
    nativeQaRunbookPacket,
    providerReadiness,
    releaseUnblockPacket,
  });
  const safetyLanguageGuard = buildSafetyLanguageGuard(
    buildPlanSafetySources({
      evidencePlan,
      launchReadiness,
      modelEvidence,
      recommendation,
      releaseUnblockChecklist,
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

      <Section title="Model evidence" caption="Local model proof with real-world validation kept explicit.">
        <ModelEvidenceCard evidence={modelEvidence} />
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
          onPrepareRunbook={prepareNativeQaRunbookPacket}
          onUseComposedEvidence={useComposedNativeQaEvidence}
        />
      </Section>

      <Section title="Evidence collection plan" caption="Real-world validation targets derived from release contracts.">
        <EvidenceCollectionPlanCard plan={evidencePlan} />
      </Section>

      <Section title="Release unblock checklist" caption="External access and proof needed before native beta or store submission.">
        <ReleaseUnblockChecklistCard checklist={releaseUnblockChecklist} onPreparePacket={prepareReleaseUnblockPacket} />
      </Section>

      <Section title="Release evidence packet" caption="One share-safe packet for QA, product validation, and release owners.">
        <ReleaseEvidencePacketCard packet={releaseEvidencePacket} onPreparePacket={prepareReleaseEvidencePacket} />
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
        <View style={styles.readiness}>
          <Text style={styles.readinessTitle}>Provider status</Text>
          <Text style={styles.readinessBadge}>Not connected</Text>
          <Text style={styles.readinessText}>
            Keep store subscriptions or a provider such as RevenueCat outside the movement domain; map receipts back to
            the same plan keys.
          </Text>
        </View>
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
    gap: theme.spacing.sm,
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
