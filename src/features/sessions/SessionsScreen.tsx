import { useCallback, useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { Download, Eye, NotebookPen, RefreshCw, Save, Share2, ShieldCheck, Target, Trash2, UserCheck } from 'lucide-react-native';

import { Header } from '@/components/Header';
import { MovementCueCard } from '@/components/MovementCueCard';
import { MovementMetricRow } from '@/components/MovementMetricRow';
import { Screen } from '@/components/Screen';
import { Section } from '@/components/Section';
import {
  coachConsentRepository,
  consentRecordToPrivacyConsent,
  createCoachReviewConsentRecord,
  isCoachReviewConsentActive,
  type CoachReviewConsentRecord,
} from '@/movement/coachConsentRepository';
import { buildCoachLibrary, type CoachLibrary } from '@/movement/coachLibrary';
import { deleteLocalAnalysisBundle, exportReport, formatAnalysisBundleDeletionReceipt, listReports } from '@/movement/repository';
import type { LocalAnalysisReport } from '@/movement/contracts';
import { assertCoachPacketIsPrivacySafe, buildCoachReviewPacket } from '@/movement/coachReviewPacket';
import {
  formatCueValidationGateFailures,
  formatCueValidationGateSummary,
  validateCueValidationCompletedDataset,
} from '@/movement/cueValidationDataset';
import {
  assertCoachLibraryExportIsPrivacySafe,
  buildCoachLibraryExport,
  formatCoachLibraryExportSummary,
} from '@/movement/coachLibraryExport';
import {
  assertCueValidationReviewWorksheetIsPrivacySafe,
  assertCueValidationReviewWorksheetCsvIsPrivacySafe,
  assertCueValidationStudySeedIsPrivacySafe,
  buildCueValidationDatasetFromCompletedWorksheetCsv,
  buildCueValidationReviewWorksheet,
  buildCueValidationReviewWorksheetCsv,
  buildCueValidationStudySeed,
  formatCueValidationCompletedDatasetSummary,
  formatCueValidationReviewWorksheetSummary,
  formatCueValidationStudySeedSummary,
} from '@/movement/cueValidationStudy';
import { theme } from '@/core/theme';
import { sharePreparedExport as sharePreparedExportFile } from '@/core/preparedExportShare';
import { selectionFeedback } from '@/core/haptics';
import { formatAnalysisDuration, formatAnalysisFrameRate } from '@/video/performanceBudget';
import { buildSessionReviewDetail, type SessionReviewDetail, type SessionTimelineMarker } from '@/movement/sessionDetail';
import { summarizeAnalysisEvidence } from '@/movement/analysisEvidence';
import { assertAnalysisEvidenceExportIsPrivacySafe, buildAnalysisEvidenceExport } from '@/movement/analysisEvidenceExport';
import { drillPracticeRepository, type DrillPracticeRecord } from '@/movement/drillPracticeRepository';
import {
  createReportAnnotation,
  cueFeedbackRatings,
  repeatAttemptOptions,
  repeatOutcomeStatuses,
  reportAnnotationRepository,
  reportProjectStatuses,
  updateCueFeedback,
  updateRepeatOutcome,
  updateReportAnnotation,
  type ReportAnnotation,
} from '@/movement/reportAnnotationRepository';
import { buildCoachTeamTemplates } from '@/movement/coachTeamTemplates';
import {
  buildCoachValidationWorkflow,
  buildCueTrustValidationEvidenceForReport,
  type CoachValidationWorkflow,
} from '@/movement/coachValidationWorkflow';

const scoreOptions = [1, 2, 3, 4, 5] as const;

const projectStatusLabels: Record<ReportAnnotation['projectStatus'], string> = {
  archived: 'Archive',
  project: 'Project',
  repeat: 'Repeat',
  sent: 'Sent',
};

const cueFeedbackLabels: Record<ReportAnnotation['cueFeedback'][number]['rating'], string> = {
  'not-useful': 'Not useful',
  unclear: 'Unclear',
  useful: 'Useful',
};

const repeatOutcomeLabels: Record<NonNullable<ReportAnnotation['repeatOutcome']>['status'], string> = {
  fell: 'Fell',
  improved: 'Improved',
  'not-tried': 'Not tried',
  regressed: 'Regressed',
  sent: 'Sent',
};

function statusStyles(status: SessionReviewDetail['status']) {
  if (status === 'risk') {
    return {
      badge: styles.reviewBadgeRisk,
      shell: styles.reviewRisk,
    };
  }
  if (status === 'review') {
    return {
      badge: styles.reviewBadgeCaveat,
      shell: styles.reviewCaveat,
    };
  }
  return {
    badge: styles.reviewBadgeStrong,
    shell: styles.reviewStrong,
  };
}

function SessionFactGrid({ facts }: { facts: SessionReviewDetail['qualityFacts'] }) {
  return (
    <View style={styles.factGrid}>
      {facts.map((fact) => (
        <View key={fact.label} style={styles.fact}>
          <Text style={styles.factValue}>{fact.value}</Text>
          <Text style={styles.factLabel}>{fact.label}</Text>
          <Text style={styles.factDetail}>{fact.detail}</Text>
        </View>
      ))}
    </View>
  );
}

function TimelineMarkerRow({ marker }: { marker: SessionTimelineMarker }) {
  return (
    <View style={styles.timelineRow}>
      <Text style={styles.timelineTime}>{marker.timeLabel}</Text>
      <View style={styles.timelineTrack}>
        <View style={[styles.timelineDot, { left: `${marker.positionPercent}%` }]} />
      </View>
      <View style={styles.timelineCopy}>
        <Text style={styles.timelineLabel}>{marker.label}</Text>
        <Text style={styles.timelineType}>{marker.type}</Text>
      </View>
    </View>
  );
}

function evidenceStatusStyle(status: LocalAnalysisReport['analysisEvidence']['steps'][number]['status']) {
  if (status === 'blocked') return styles.evidenceStatusBlocked;
  if (status === 'review') return styles.evidenceStatusReview;
  return styles.evidenceStatusPass;
}

function AnalysisEvidencePanel({ report }: { report: LocalAnalysisReport }) {
  const summary = summarizeAnalysisEvidence(report.analysisEvidence);
  const hasSteps = report.analysisEvidence.steps.length > 0;

  return (
    <Section
      title="Analysis evidence"
      caption={
        hasSteps
          ? `${summary.pass}/${summary.total} checks pass · ${summary.review} review · ${summary.blocked} blocked`
          : 'Legacy report without generated evidence steps.'
      }
    >
      {hasSteps ? (
        <View style={styles.evidenceList}>
          {report.analysisEvidence.steps.map((step) => (
            <View key={step.id} style={styles.evidenceRow}>
              <View style={[styles.evidenceStatus, evidenceStatusStyle(step.status)]}>
                <Text style={styles.evidenceStatusText}>{step.status}</Text>
              </View>
              <View style={styles.evidenceCopy}>
                <Text style={styles.evidenceTitle}>{step.label}</Text>
                <Text style={styles.evidenceDetail}>{step.detail}</Text>
                <Text style={styles.evidenceMeta}>{step.evidence}</Text>
              </View>
            </View>
          ))}
        </View>
      ) : (
        <View style={styles.empty}>
          <Text style={styles.emptyTitle}>Evidence timeline not generated</Text>
          <Text style={styles.emptyText}>Run the analysis again to attach the local execution evidence timeline.</Text>
        </View>
      )}
    </Section>
  );
}

function SessionReviewPanel({ detail, report }: { detail: SessionReviewDetail; report: LocalAnalysisReport }) {
  const reviewStyles = statusStyles(detail.status);

  return (
    <Section
      caption={`${report.session.gym} · ${report.session.grade} · ${report.session.wallAngle}`}
      title="Session review"
      trailing={
        <View style={[styles.reviewBadge, reviewStyles.badge]}>
          <Text style={styles.reviewBadgeText}>{detail.status}</Text>
        </View>
      }
    >
      <View style={[styles.reviewShell, reviewStyles.shell]}>
        <View style={styles.reviewTop}>
          <View style={styles.reviewTitleRow}>
            <ShieldCheck color={detail.status === 'risk' ? theme.colors.coral : theme.colors.success} size={18} />
            <Text style={styles.reviewTitle}>{detail.title}</Text>
          </View>
          <Text style={styles.reviewSummary}>{detail.summary}</Text>
        </View>

        <SessionFactGrid facts={detail.qualityFacts} />
        <SessionFactGrid facts={detail.performanceFacts} />
      </View>

      {detail.focusMetric ? (
        <Section
          caption={detail.bestMetric ? `Best signal: ${detail.bestMetric.label} (${detail.bestMetric.score}/100)` : undefined}
          title="Focus metric"
        >
          <MovementMetricRow metric={detail.focusMetric} />
        </Section>
      ) : null}

      {detail.primaryCue ? (
        <Section title="Primary cue" caption="Highest-priority cue for the next repeat.">
          <MovementCueCard cue={detail.primaryCue} />
        </Section>
      ) : null}

      <Section title="Timeline" caption="Cue and movement markers normalized across the attempt.">
        <View style={styles.timelineList}>
          {detail.timelineMarkers.map((marker) => (
            <TimelineMarkerRow key={marker.id} marker={marker} />
          ))}
        </View>
      </Section>

      <Section title="Local evidence" caption="Release-safe facts included in export and coach review decisions.">
        <SessionFactGrid facts={detail.privacyFacts} />
      </Section>

      <AnalysisEvidencePanel report={report} />
    </Section>
  );
}

function RatingChips({
  label,
  onChange,
  value,
}: {
  label: string;
  onChange: (value: number) => void;
  value: number;
}) {
  return (
    <View style={styles.logGroup}>
      <Text style={styles.logLabel}>{label}</Text>
      <View style={styles.logOptions}>
        {scoreOptions.map((score) => {
          const selected = value === score;
          return (
            <Pressable
              accessibilityLabel={`${label} ${score}`}
              key={`${label}-${score}`}
              onPress={() => onChange(score)}
              style={[styles.scoreChip, selected ? styles.scoreChipSelected : null]}
            >
              <Text style={[styles.scoreChipText, selected ? styles.scoreChipTextSelected : null]}>{score}</Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

function TrainingLogPanel({
  annotation,
  onChange,
  onSave,
  report,
}: {
  annotation: ReportAnnotation;
  onChange: (annotation: ReportAnnotation) => void;
  onSave: () => void;
  report: LocalAnalysisReport;
}) {
  const repeatOutcome =
    annotation.repeatOutcome ?? {
      attempts: 0,
      resolvedCueIds: [],
      status: 'not-tried' as const,
      updatedAt: annotation.updatedAt,
    };
  const resolvedCueIds = new Set(repeatOutcome.resolvedCueIds);
  const updateOutcome = (updates: Partial<typeof repeatOutcome>) =>
    onChange(
      updateRepeatOutcome(annotation, {
        ...repeatOutcome,
        ...updates,
      }),
    );

  return (
    <Section
      caption="Private on-device notes stay with the local report and are deleted with it."
      title="Training log"
      trailing={
        <Pressable onPress={onSave} style={styles.saveAction}>
          <Save color="#FFFFFF" size={15} />
          <Text style={styles.saveActionText}>Save</Text>
        </Pressable>
      }
    >
      <View style={styles.logShell}>
        <View style={styles.logTitleRow}>
          <NotebookPen color={theme.colors.brand} size={18} />
          <Text style={styles.logTitle}>Private beta notes</Text>
        </View>

        <View style={styles.logGroup}>
          <Text style={styles.logLabel}>Project status</Text>
          <View style={styles.logOptions}>
            {reportProjectStatuses.map((status) => {
              const selected = annotation.projectStatus === status;
              return (
                <Pressable
                  accessibilityLabel={`Project status ${projectStatusLabels[status]}`}
                  key={status}
                  onPress={() => onChange(updateReportAnnotation(annotation, { projectStatus: status }))}
                  style={[styles.statusChip, selected ? styles.statusChipSelected : null]}
                >
                  <Text style={[styles.statusChipText, selected ? styles.statusChipTextSelected : null]}>
                    {projectStatusLabels[status]}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        <View style={styles.logScores}>
          <RatingChips
            label="Effort"
            onChange={(perceivedEffort) => onChange(updateReportAnnotation(annotation, { perceivedEffort }))}
            value={annotation.perceivedEffort}
          />
          <RatingChips
            label="Confidence"
            onChange={(confidence) => onChange(updateReportAnnotation(annotation, { confidence }))}
            value={annotation.confidence}
          />
        </View>

        <View style={styles.logGroup}>
          <View style={styles.logTitleRow}>
            <Target color={theme.colors.brand} size={18} />
            <Text style={styles.logTitle}>Repeat outcome</Text>
          </View>
          <View style={styles.logOptions}>
            {repeatOutcomeStatuses.map((status) => {
              const selected = repeatOutcome.status === status;
              return (
                <Pressable
                  accessibilityLabel={`Repeat outcome ${repeatOutcomeLabels[status]}`}
                  key={status}
                  onPress={() => updateOutcome({ status })}
                  style={[styles.statusChip, selected ? styles.statusChipSelected : null]}
                >
                  <Text style={[styles.statusChipText, selected ? styles.statusChipTextSelected : null]}>
                    {repeatOutcomeLabels[status]}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          <Text style={styles.logLabel}>Repeat attempts</Text>
          <View style={styles.logOptions}>
            {repeatAttemptOptions.map((attempts) => {
              const selected = repeatOutcome.attempts === attempts;
              return (
                <Pressable
                  accessibilityLabel={`Repeat attempts ${attempts}`}
                  key={`attempts-${attempts}`}
                  onPress={() => updateOutcome({ attempts })}
                  style={[styles.scoreChip, selected ? styles.scoreChipSelected : null]}
                >
                  <Text style={[styles.scoreChipText, selected ? styles.scoreChipTextSelected : null]}>{attempts}</Text>
                </Pressable>
              );
            })}
          </View>

          {report.cues.length > 0 ? (
            <>
              <Text style={styles.logLabel}>Resolved cues</Text>
              <View style={styles.resolvedCueList}>
                {report.cues.map((cue) => {
                  const selected = resolvedCueIds.has(cue.id);
                  const nextCueIds = selected
                    ? repeatOutcome.resolvedCueIds.filter((cueId) => cueId !== cue.id)
                    : [...repeatOutcome.resolvedCueIds, cue.id];

                  return (
                    <Pressable
                      accessibilityLabel={`Resolved cue ${cue.title}`}
                      key={`resolved-${cue.id}`}
                      onPress={() => updateOutcome({ resolvedCueIds: nextCueIds })}
                      style={[styles.resolvedCueChip, selected ? styles.resolvedCueChipSelected : null]}
                    >
                      <Text style={[styles.resolvedCueText, selected ? styles.resolvedCueTextSelected : null]}>
                        {cue.title}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </>
          ) : null}
        </View>

        {report.cues.length > 0 ? (
          <View style={styles.logGroup}>
            <Text style={styles.logLabel}>Cue feedback</Text>
            <View style={styles.cueFeedbackList}>
              {report.cues.map((cue) => {
                const selectedFeedback = annotation.cueFeedback.find((feedback) => feedback.cueId === cue.id);
                return (
                  <View key={cue.id} style={styles.cueFeedbackItem}>
                    <Text style={styles.cueFeedbackTitle}>{cue.title}</Text>
                    <View style={styles.logOptions}>
                      {cueFeedbackRatings.map((rating) => {
                        const selected = selectedFeedback?.rating === rating;
                        return (
                          <Pressable
                            accessibilityLabel={`Cue feedback ${cue.id} ${cueFeedbackLabels[rating]}`}
                            key={`${cue.id}-${rating}`}
                            onPress={() =>
                              onChange(
                                updateCueFeedback(annotation, {
                                  cueId: cue.id,
                                  rating,
                                }),
                              )
                            }
                            style={[styles.cueFeedbackChip, selected ? styles.cueFeedbackChipSelected : null]}
                          >
                            <Text
                              style={[
                                styles.cueFeedbackChipText,
                                selected ? styles.cueFeedbackChipTextSelected : null,
                              ]}
                            >
                              {cueFeedbackLabels[rating]}
                            </Text>
                          </Pressable>
                        );
                      })}
                    </View>
                  </View>
                );
              })}
            </View>
          </View>
        ) : null}

        <View style={styles.logGroup}>
          <Text style={styles.logLabel}>Private note</Text>
          <TextInput
            accessibilityLabel="Private training note"
            multiline
            onChangeText={(privateNote) => onChange(updateReportAnnotation(annotation, { privateNote }))}
            placeholder="Example: Left hip in before the crux, breathe, then commit to the right hand."
            placeholderTextColor={theme.colors.muted}
            style={styles.logInput}
            value={annotation.privateNote}
          />
        </View>

        <View style={styles.logGroup}>
          <Text style={styles.logLabel}>Tags</Text>
          <TextInput
            accessibilityLabel="Training log tags"
            onChangeText={(value) =>
              onChange(updateReportAnnotation(annotation, { tags: value.split(',').map((tag) => tag.trim()) }))
            }
            placeholder="board, crux, footwork"
            placeholderTextColor={theme.colors.muted}
            style={styles.tagInput}
            value={annotation.tags.join(', ')}
          />
        </View>
      </View>
    </Section>
  );
}

function CoachLibraryPanel({
  library,
  onPrepareExport,
  onPrepareValidationSeed,
  onPrepareValidationWorksheet,
  onPrepareValidationWorksheetCsv,
}: {
  library: CoachLibrary;
  onPrepareExport?: () => void;
  onPrepareValidationSeed?: () => void;
  onPrepareValidationWorksheet?: () => void;
  onPrepareValidationWorksheetCsv?: () => void;
}) {
  const templatePlan = buildCoachTeamTemplates(library);

  return (
    <Section title="Coach library" caption="Local review queue built only from reports with active coach consent.">
      <View style={styles.libraryStats}>
        <View style={styles.libraryStat}>
          <Text style={styles.libraryStatValue}>{library.activeConsentCount}</Text>
          <Text style={styles.libraryStatLabel}>Consented packets</Text>
        </View>
        <View style={styles.libraryStat}>
          <Text style={styles.libraryStatValue}>{library.readyPacketCount}</Text>
          <Text style={styles.libraryStatLabel}>Ready packets</Text>
        </View>
        <View style={styles.libraryStat}>
          <Text style={styles.libraryStatValue}>{library.highPriorityCount}</Text>
          <Text style={styles.libraryStatLabel}>High priority</Text>
        </View>
      </View>

      {library.entries.length > 0 && onPrepareExport ? (
        <View style={styles.libraryActionRow}>
          <Pressable accessibilityLabel="Export coach library" onPress={onPrepareExport} style={styles.secondaryAction}>
            <Download color={theme.colors.brand} size={16} />
            <Text style={styles.secondaryActionText}>Export library</Text>
          </Pressable>
          {onPrepareValidationSeed ? (
            <Pressable
              accessibilityLabel="Prepare cue validation seed"
              onPress={onPrepareValidationSeed}
              style={styles.secondaryAction}
            >
              <ShieldCheck color={theme.colors.brand} size={16} />
              <Text style={styles.secondaryActionText}>Validation seed</Text>
            </Pressable>
          ) : null}
          {onPrepareValidationWorksheet ? (
            <Pressable
              accessibilityLabel="Prepare cue validation worksheet"
              onPress={onPrepareValidationWorksheet}
              style={styles.secondaryAction}
            >
              <NotebookPen color={theme.colors.brand} size={16} />
              <Text style={styles.secondaryActionText}>Review worksheet</Text>
            </Pressable>
          ) : null}
          {onPrepareValidationWorksheetCsv ? (
            <Pressable
              accessibilityLabel="Prepare cue validation worksheet CSV"
              onPress={onPrepareValidationWorksheetCsv}
              style={styles.secondaryAction}
            >
              <Download color={theme.colors.brand} size={16} />
              <Text style={styles.secondaryActionText}>Worksheet CSV</Text>
            </Pressable>
          ) : null}
        </View>
      ) : null}

      {library.entries.length > 0 ? (
        <View style={styles.libraryList}>
          {library.entries.map((entry) => (
            <View key={entry.reportId} style={styles.libraryCard}>
              <View style={styles.libraryTop}>
                <View style={styles.libraryTitleGroup}>
                  <Text style={styles.libraryTitle}>{entry.title}</Text>
                  <Text style={styles.libraryMeta}>
                    {entry.gym} · {entry.grade} · {entry.wallAngle}
                  </Text>
                </View>
                <Text style={[styles.libraryBadge, entry.priority === 'high' ? styles.libraryBadgeHigh : null]}>
                  {entry.priority}
                </Text>
              </View>
              <Text style={styles.libraryFocus}>{entry.reviewFocus}</Text>
              <View style={styles.libraryEvidenceRow}>
                <Text style={styles.libraryEvidence}>Feedback {entry.cueFeedbackCount}</Text>
                <Text style={styles.libraryEvidence}>Practice {entry.drillPracticeCount}</Text>
                <Text style={styles.libraryEvidence}>{entry.signalStatus === 'ready' ? 'Signal ready' : 'Review signal'}</Text>
              </View>
              <Text style={styles.libraryPrivacy}>
                Raw video included: no · video leaves device: no · athlete context included
              </Text>
            </View>
          ))}
        </View>
      ) : (
        <View style={styles.empty}>
          <Text style={styles.emptyTitle}>No consented coach packets yet</Text>
          <Text style={styles.emptyText}>Grant consent on a local report to add it to the coach library.</Text>
        </View>
      )}

      {templatePlan.templates.length > 0 ? (
        <View style={styles.templateShell}>
          <Text style={styles.templateHeading}>Team templates</Text>
          {templatePlan.templates.map((template) => (
            <View key={template.id} style={styles.templateCard}>
              <View style={styles.libraryTop}>
                <View style={styles.libraryTitleGroup}>
                  <Text style={styles.templateTitle}>{template.title}</Text>
                  <Text style={styles.libraryMeta}>{template.audience}</Text>
                </View>
                <Text style={styles.libraryBadge}>{template.priority}</Text>
              </View>
              <Text style={styles.libraryFocus}>{template.focus}</Text>
              <Text style={styles.templateFormat}>{template.sessionFormat}</Text>
              <Text style={styles.libraryPrivacy}>{template.privacyNote}</Text>
            </View>
          ))}
        </View>
      ) : null}
    </Section>
  );
}

function ValidationCampaignPanel({
  onPrepareStatusExport,
  workflow,
}: {
  onPrepareStatusExport: () => void;
  workflow: CoachValidationWorkflow;
}) {
  const statusLabel: Record<CoachValidationWorkflow['status'], string> = {
    blocked: 'Blocked',
    'needs-consent': 'Consent',
    'needs-review': 'Review',
    ready: 'Ready',
  };
  const isReady = workflow.status === 'ready';

  return (
    <Section title="Validation campaign" caption="Real-world cue evidence tracker derived from local consent and review contracts.">
      <View style={styles.campaignShell}>
        <View style={styles.libraryTop}>
          <View style={styles.libraryTitleGroup}>
            <Text style={styles.campaignTitle}>{statusLabel[workflow.status]}</Text>
            <Text style={styles.libraryMeta}>{workflow.seedSummary}</Text>
          </View>
          <Text style={[styles.libraryBadge, isReady ? styles.libraryBadgeReady : styles.libraryBadgeHigh]}>
            {workflow.status}
          </Text>
        </View>
        <View style={styles.libraryStats}>
          <View style={styles.libraryStat}>
            <Text style={styles.libraryStatValue}>
              {workflow.progress.consentedClipCount}/{workflow.progress.targetClipCount}
            </Text>
            <Text style={styles.libraryStatLabel}>Clips</Text>
          </View>
          <View style={styles.libraryStat}>
            <Text style={styles.libraryStatValue}>
              {workflow.progress.reviewCount}/{workflow.progress.estimatedTargetReviewRows}
            </Text>
            <Text style={styles.libraryStatLabel}>Reviews</Text>
          </View>
          <View style={styles.libraryStat}>
            <Text style={styles.libraryStatValue}>{workflow.progress.missingWallAngles.length}</Text>
            <Text style={styles.libraryStatLabel}>Angles missing</Text>
          </View>
        </View>
        <Text style={styles.libraryFocus}>{workflow.action}</Text>
        <Text style={styles.libraryPrivacy}>{workflow.worksheetSummary}</Text>
        {workflow.errors.length > 0 ? (
          <View style={styles.campaignErrors}>
            {workflow.errors.map((error) => (
              <Text key={error} style={styles.campaignError}>
                {error}
              </Text>
            ))}
          </View>
        ) : null}
        <View style={styles.libraryActionRow}>
          <Pressable accessibilityLabel="Export validation campaign status" onPress={onPrepareStatusExport} style={styles.secondaryAction}>
            <Download color={theme.colors.brand} size={16} />
            <Text style={styles.secondaryActionText}>Export status</Text>
          </Pressable>
        </View>
      </View>
    </Section>
  );
}

export function SessionsScreen() {
  const [reports, setReports] = useState<LocalAnalysisReport[]>([]);
  const [coachConsentByReport, setCoachConsentByReport] = useState<Record<string, CoachReviewConsentRecord>>({});
  const [annotationByReport, setAnnotationByReport] = useState<Record<string, ReportAnnotation>>({});
  const [coachLibrary, setCoachLibrary] = useState<CoachLibrary>(() => buildCoachLibrary([], []));
  const [completedWorksheetCsv, setCompletedWorksheetCsv] = useState('');
  const [drillPracticeRecords, setDrillPracticeRecords] = useState<DrillPracticeRecord[]>([]);
  const [preparedExport, setPreparedExport] = useState<{ body: string; title: string } | null>(null);
  const [draftAnnotation, setDraftAnnotation] = useState<ReportAnnotation | null>(null);
  const [selectedReportId, setSelectedReportId] = useState<string | null>(null);

  async function refresh() {
    const [nextReports, consents, annotations, drillPractice] = await Promise.all([
      listReports(),
      coachConsentRepository.listConsents(),
      reportAnnotationRepository.listAnnotations(),
      drillPracticeRepository.listRecords(),
    ]);
    const reportIds = new Set(nextReports.map((report) => report.id));
    const scopedAnnotations = annotations.filter((annotation) => reportIds.has(annotation.reportId));
    setReports(nextReports);
    setSelectedReportId((current) => (current && reportIds.has(current) ? current : nextReports[0]?.id ?? null));
    setAnnotationByReport(
      Object.fromEntries(
        scopedAnnotations.map((annotation) => [annotation.reportId, annotation]),
      ),
    );
    setCoachConsentByReport(
      Object.fromEntries(
        consents
          .filter((consent) => reportIds.has(consent.reportId) && isCoachReviewConsentActive(consent))
          .map((consent) => [consent.reportId, consent]),
      ),
    );
    setCoachLibrary(buildCoachLibrary(nextReports, consents, scopedAnnotations, drillPractice));
    setDrillPracticeRecords(drillPractice);
  }

  async function remove(reportId: string) {
    selectionFeedback();
    const deletion = await deleteLocalAnalysisBundle(reportId);
    setPreparedExport({
      body: formatAnalysisBundleDeletionReceipt(deletion),
      title: 'Local deletion receipt',
    });
    setSelectedReportId((current) => (current === reportId ? null : current));
    await refresh();
  }

  async function toggleCoachConsent(reportId: string) {
    selectionFeedback();
    setPreparedExport(null);

    const activeConsent = coachConsentByReport[reportId];
    if (activeConsent) {
      await coachConsentRepository.revokeConsent(reportId);
    } else {
      await coachConsentRepository.saveConsent(createCoachReviewConsentRecord(reportId));
    }
    await refresh();
  }

  async function prepareExport(reportId: string) {
    selectionFeedback();
    const report = await exportReport(reportId);
    setPreparedExport(report ? { body: JSON.stringify(report, null, 2), title: 'Prepared full report' } : null);
  }

  async function prepareAnalysisEvidenceExport(reportId: string) {
    selectionFeedback();
    const report = await exportReport(reportId);
    if (!report) {
      setPreparedExport(null);
      return;
    }

    try {
      const evidenceExport = buildAnalysisEvidenceExport(report);
      assertAnalysisEvidenceExportIsPrivacySafe(evidenceExport);
      setPreparedExport({
        body: JSON.stringify(evidenceExport, null, 2),
        title: 'Prepared analysis evidence',
      });
    } catch (error) {
      setPreparedExport({
        body: error instanceof Error ? error.message : 'Analysis evidence export could not be prepared.',
        title: 'Analysis evidence blocked',
      });
    }
  }

  async function prepareCoachPacket(reportId: string) {
    selectionFeedback();
    const report = await exportReport(reportId);
    if (!report) {
      setPreparedExport(null);
      return;
    }

    const consentRecord = coachConsentByReport[reportId] ?? (await coachConsentRepository.getConsent(reportId));
    if (!isCoachReviewConsentActive(consentRecord)) {
      setPreparedExport({
        body: 'Coach packet export requires explicit athlete consent for coach review and cue validation.',
        title: 'Consent required',
      });
      return;
    }

    const packet = buildCoachReviewPacket(report, {
      annotation: annotationByReport[reportId] ?? (await reportAnnotationRepository.getAnnotation(reportId)),
      consent: consentRecordToPrivacyConsent(consentRecord),
      consentGrantedAt: consentRecord.grantedAt,
      drillPractice: await drillPracticeRepository.listRecordsForReport(reportId),
      validation: buildCueTrustValidationEvidenceForReport(coachValidationWorkflow, report),
    });
    assertCoachPacketIsPrivacySafe(packet);
    setPreparedExport({ body: JSON.stringify(packet, null, 2), title: 'Prepared coach packet' });
  }

  function prepareCoachLibraryExport() {
    selectionFeedback();
    const templatePlan = buildCoachTeamTemplates(coachLibrary);
    const exportBundle = buildCoachLibraryExport(coachLibrary, { templatePlan });
    assertCoachLibraryExportIsPrivacySafe(exportBundle);
    setPreparedExport({
      body: `${formatCoachLibraryExportSummary(exportBundle)}\n\n${JSON.stringify(exportBundle, null, 2)}`,
      title: 'Prepared coach library export',
    });
  }

  async function buildCurrentCueValidationStudySeed() {
    const drillPractice = await drillPracticeRepository.listRecords();
    return buildCueValidationStudySeed(reports, Object.values(coachConsentByReport), {
      annotations: Object.values(annotationByReport),
      drillPractice,
    });
  }

  async function prepareCueValidationStudySeed() {
    selectionFeedback();
    const seed = await buildCurrentCueValidationStudySeed();
    assertCueValidationStudySeedIsPrivacySafe(seed);
    setPreparedExport({
      body: `${formatCueValidationStudySeedSummary(seed)}\n\n${JSON.stringify(seed, null, 2)}`,
      title: 'Prepared cue validation seed',
    });
  }

  async function prepareCueValidationReviewWorksheet() {
    selectionFeedback();
    const seed = await buildCurrentCueValidationStudySeed();
    assertCueValidationStudySeedIsPrivacySafe(seed);
    const worksheet = buildCueValidationReviewWorksheet(seed);
    assertCueValidationReviewWorksheetIsPrivacySafe(worksheet);
    setPreparedExport({
      body: `${formatCueValidationReviewWorksheetSummary(worksheet)}\n\n${JSON.stringify(worksheet, null, 2)}`,
      title: 'Prepared cue validation worksheet',
    });
  }

  async function prepareCueValidationReviewWorksheetCsv() {
    selectionFeedback();
    const seed = await buildCurrentCueValidationStudySeed();
    assertCueValidationStudySeedIsPrivacySafe(seed);
    const worksheet = buildCueValidationReviewWorksheet(seed);
    assertCueValidationReviewWorksheetIsPrivacySafe(worksheet);
    const csv = buildCueValidationReviewWorksheetCsv(worksheet);
    assertCueValidationReviewWorksheetCsvIsPrivacySafe(csv);
    setCompletedWorksheetCsv(csv);
    setPreparedExport({
      body: `${formatCueValidationReviewWorksheetSummary(worksheet)}\n\n${csv}`,
      title: 'Prepared cue validation worksheet CSV',
    });
  }

  async function prepareCueValidationDatasetFromCompletedWorksheetCsv() {
    selectionFeedback();
    try {
      const seed = await buildCurrentCueValidationStudySeed();
      assertCueValidationStudySeedIsPrivacySafe(seed);
      const dataset = buildCueValidationDatasetFromCompletedWorksheetCsv(seed, completedWorksheetCsv);
      const gate = validateCueValidationCompletedDataset(dataset);
      setPreparedExport({
        body: [
          formatCueValidationCompletedDatasetSummary(dataset),
          formatCueValidationGateSummary(gate),
          formatCueValidationGateFailures(gate),
          '',
          JSON.stringify(dataset, null, 2),
        ].join('\n'),
        title: 'Prepared cue validation dataset',
      });
    } catch (error) {
      setPreparedExport({
        body: error instanceof Error ? error.message : 'Completed cue validation worksheet CSV could not be parsed.',
        title: 'Validation dataset blocked',
      });
    }
  }

  function prepareValidationCampaignStatus() {
    selectionFeedback();
    setPreparedExport({
      body: coachValidationWorkflow.shareableStatusJson,
      title: 'Prepared validation campaign status',
    });
  }

  async function sharePreparedExport() {
    if (!preparedExport) return;
    selectionFeedback();
    try {
      await sharePreparedExportFile({
        body: preparedExport.body,
        title: preparedExport.title,
      });
    } catch (error) {
      setPreparedExport({
        body: error instanceof Error ? error.message : 'Prepared export could not be shared from this device.',
        title: 'Share failed',
      });
    }
  }

  async function saveTrainingLog(annotation: ReportAnnotation) {
    selectionFeedback();
    const saved = await reportAnnotationRepository.saveAnnotation(updateReportAnnotation(annotation, {}));
    setAnnotationByReport((current) => ({
      ...current,
      [saved.reportId]: saved,
    }));
    setDraftAnnotation(saved);
  }

  useFocusEffect(
    useCallback(() => {
      void refresh();
    }, []),
  );

  const selectedReport = reports.find((report) => report.id === selectedReportId) ?? reports[0] ?? null;
  const selectedReview = selectedReport ? buildSessionReviewDetail(selectedReport) : null;
  const coachValidationWorkflow = buildCoachValidationWorkflow(reports, Object.values(coachConsentByReport), {
    annotations: Object.values(annotationByReport),
    completedWorksheetCsv,
    drillPractice: drillPracticeRecords,
  });

  useEffect(() => {
    if (!selectedReport) {
      setDraftAnnotation(null);
      return;
    }

    setDraftAnnotation(annotationByReport[selectedReport.id] ?? createReportAnnotation(selectedReport.id));
  }, [annotationByReport, selectedReport]);

  return (
    <Screen>
      <Header
        eyebrow="Sessions"
        title="Local attempts"
        subtitle="Reports are stored as landmarks and metrics; the original video can stay on the device."
        action={
          <Pressable onPress={() => void refresh()} style={styles.action}>
            <RefreshCw color={theme.colors.brand} size={16} />
            <Text style={styles.actionText}>Refresh</Text>
          </Pressable>
        }
      />

      {reports.length > 0 ? (
        <>
          {reports.map((report) => (
            <View key={report.id} style={styles.session}>
              <Text style={styles.title}>{report.session.title}</Text>
              <Text style={styles.meta}>
                {report.session.gym} · {report.session.grade} · {(report.session.durationMs / 1000).toFixed(1)}s
              </Text>
              <Text style={styles.meta}>
                Analysis {formatAnalysisDuration(report.performance.analysisMs)} · {report.performance.budgetStatus} ·{' '}
                {formatAnalysisFrameRate(report.performance.framesPerSecond)}
              </Text>
              <Text style={styles.privacy}>{report.privacy.retention}</Text>
              <View style={styles.sessionActions}>
                <Pressable
                  onPress={() => {
                    selectionFeedback();
                    setSelectedReportId(report.id);
                  }}
                  style={[styles.secondaryAction, selectedReport?.id === report.id ? styles.reviewSelected : null]}
                >
                  <Eye color={selectedReport?.id === report.id ? '#FFFFFF' : theme.colors.brand} size={16} />
                  <Text style={[styles.secondaryActionText, selectedReport?.id === report.id ? styles.reviewSelectedText : null]}>
                    Review
                  </Text>
                </Pressable>
                <Pressable onPress={() => void prepareExport(report.id)} style={styles.secondaryAction}>
                  <Download color={theme.colors.brand} size={16} />
                  <Text style={styles.secondaryActionText}>Export</Text>
                </Pressable>
                <Pressable onPress={() => void prepareAnalysisEvidenceExport(report.id)} style={styles.secondaryAction}>
                  <ShieldCheck color={theme.colors.brand} size={16} />
                  <Text style={styles.secondaryActionText}>Evidence</Text>
                </Pressable>
                <Pressable
                  onPress={() => void toggleCoachConsent(report.id)}
                  style={[styles.secondaryAction, coachConsentByReport[report.id] ? styles.consentSelected : null]}
                >
                  <UserCheck color={coachConsentByReport[report.id] ? '#FFFFFF' : theme.colors.brand} size={16} />
                  <Text style={[styles.secondaryActionText, coachConsentByReport[report.id] ? styles.consentSelectedText : null]}>
                    Consent
                  </Text>
                </Pressable>
                <Pressable onPress={() => void prepareCoachPacket(report.id)} style={styles.secondaryAction}>
                  <UserCheck color={theme.colors.brand} size={16} />
                  <Text style={styles.secondaryActionText}>Coach packet</Text>
                </Pressable>
                <Pressable
                  accessibilityLabel={`Delete ${report.session.title}`}
                  onPress={() => void remove(report.id)}
                  style={styles.deleteAction}
                >
                  <Trash2 color={theme.colors.coral} size={16} />
                  <Text style={styles.deleteActionText}>Delete</Text>
                </Pressable>
              </View>
            </View>
          ))}

          <CoachLibraryPanel
            library={coachLibrary}
            onPrepareExport={prepareCoachLibraryExport}
            onPrepareValidationSeed={() => void prepareCueValidationStudySeed()}
            onPrepareValidationWorksheet={() => void prepareCueValidationReviewWorksheet()}
            onPrepareValidationWorksheetCsv={() => void prepareCueValidationReviewWorksheetCsv()}
          />

          <ValidationCampaignPanel
            onPrepareStatusExport={prepareValidationCampaignStatus}
            workflow={coachValidationWorkflow}
          />

          {coachLibrary.entries.length > 0 ? (
            <Section title="Validation dataset" caption="Completed worksheet CSV to gate-ready JSON.">
              <TextInput
                accessibilityLabel="Completed cue validation worksheet CSV"
                multiline
                onChangeText={setCompletedWorksheetCsv}
                placeholder="worksheetRowId,clipId,packetReportId,..."
                placeholderTextColor={theme.colors.muted}
                style={styles.csvInput}
                value={completedWorksheetCsv}
              />
              <Pressable
                accessibilityLabel="Build cue validation dataset"
                onPress={() => void prepareCueValidationDatasetFromCompletedWorksheetCsv()}
                style={styles.action}
              >
                <ShieldCheck color={theme.colors.brand} size={16} />
                <Text style={styles.actionText}>Build dataset</Text>
              </Pressable>
            </Section>
          ) : null}

          {selectedReport && selectedReview ? <SessionReviewPanel detail={selectedReview} report={selectedReport} /> : null}

          {draftAnnotation && selectedReport ? (
            <TrainingLogPanel
              annotation={draftAnnotation}
              onChange={setDraftAnnotation}
              onSave={() => void saveTrainingLog(draftAnnotation)}
              report={selectedReport}
            />
          ) : null}

        </>
      ) : (
        <View style={styles.empty}>
          <Text style={styles.emptyTitle}>No local reports yet</Text>
          <Text style={styles.emptyText}>Run an analysis from the Analyze tab, then refresh this list.</Text>
        </View>
      )}

      {preparedExport ? (
        <Section
          title={preparedExport.title}
          trailing={
            <Pressable accessibilityLabel="Share prepared export" onPress={() => void sharePreparedExport()} style={styles.action}>
              <Share2 color={theme.colors.brand} size={16} />
              <Text style={styles.actionText}>Share</Text>
            </Pressable>
          }
        >
          <View style={styles.exportBox}>
            <Text selectable style={styles.exportText}>{preparedExport.body}</Text>
          </View>
        </Section>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  action: {
    alignItems: 'center',
    backgroundColor: theme.colors.brandSoft,
    borderRadius: theme.radius.sm,
    flexDirection: 'row',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 9,
  },
  actionText: {
    color: theme.colors.brand,
    fontSize: 12,
    fontWeight: '900',
  },
  session: {
    backgroundColor: theme.colors.brandDark,
    borderRadius: theme.radius.lg,
    gap: theme.spacing.sm,
    padding: theme.spacing.lg,
  },
  title: {
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: '900',
  },
  meta: {
    color: '#DCECF3',
    fontSize: 13,
    fontWeight: '800',
  },
  privacy: {
    color: '#FFFFFF',
    fontSize: 13,
    lineHeight: 18,
  },
  sessionActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.sm,
    paddingTop: theme.spacing.xs,
  },
  secondaryAction: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: theme.radius.sm,
    flexDirection: 'row',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  secondaryActionText: {
    color: theme.colors.brand,
    fontSize: 12,
    fontWeight: '900',
  },
  reviewSelected: {
    backgroundColor: theme.colors.brand,
  },
  reviewSelectedText: {
    color: '#FFFFFF',
  },
  consentSelected: {
    backgroundColor: theme.colors.success,
  },
  consentSelectedText: {
    color: '#FFFFFF',
  },
  deleteAction: {
    alignItems: 'center',
    backgroundColor: '#FFF0EC',
    borderRadius: theme.radius.sm,
    flexDirection: 'row',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  deleteActionText: {
    color: theme.colors.coral,
    fontSize: 12,
    fontWeight: '900',
  },
  empty: {
    backgroundColor: theme.colors.surface,
    borderColor: theme.colors.line,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    gap: 4,
    padding: theme.spacing.lg,
  },
  emptyTitle: {
    color: theme.colors.ink,
    fontSize: 18,
    fontWeight: '900',
  },
  emptyText: {
    color: theme.colors.muted,
    fontSize: 13,
    lineHeight: 18,
  },
  campaignError: {
    color: theme.colors.coral,
    fontSize: 12,
    fontWeight: '800',
    lineHeight: 17,
  },
  campaignErrors: {
    backgroundColor: '#FFF0EC',
    borderRadius: theme.radius.sm,
    gap: 5,
    padding: theme.spacing.sm,
  },
  campaignShell: {
    backgroundColor: theme.colors.surfaceAlt,
    borderColor: theme.colors.line,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    gap: theme.spacing.sm,
    padding: theme.spacing.md,
  },
  campaignTitle: {
    color: theme.colors.ink,
    fontSize: 18,
    fontWeight: '900',
  },
  libraryBadge: {
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
  libraryBadgeHigh: {
    backgroundColor: '#FFF0EC',
    color: theme.colors.coral,
  },
  libraryBadgeReady: {
    backgroundColor: '#E6F3EC',
    color: theme.colors.success,
  },
  libraryCard: {
    backgroundColor: theme.colors.surface,
    borderColor: theme.colors.line,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    gap: theme.spacing.sm,
    padding: theme.spacing.md,
  },
  libraryActionRow: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.sm,
  },
  libraryEvidence: {
    backgroundColor: theme.colors.surfaceAlt,
    borderRadius: theme.radius.sm,
    color: theme.colors.brandDark,
    fontSize: 11,
    fontWeight: '900',
    overflow: 'hidden',
    paddingHorizontal: 8,
    paddingVertical: 5,
  },
  libraryEvidenceRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 7,
  },
  libraryFocus: {
    color: theme.colors.text,
    fontSize: 13,
    fontWeight: '800',
    lineHeight: 18,
  },
  libraryList: {
    gap: theme.spacing.sm,
  },
  libraryMeta: {
    color: theme.colors.muted,
    fontSize: 12,
    fontWeight: '800',
  },
  libraryPrivacy: {
    color: theme.colors.muted,
    fontSize: 12,
    lineHeight: 17,
  },
  libraryStat: {
    backgroundColor: theme.colors.surface,
    borderColor: theme.colors.line,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    flex: 1,
    minWidth: 112,
    padding: theme.spacing.md,
  },
  libraryStatLabel: {
    color: theme.colors.muted,
    fontSize: 11,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  libraryStats: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.sm,
  },
  libraryStatValue: {
    color: theme.colors.brandDark,
    fontSize: 22,
    fontWeight: '900',
  },
  libraryTitle: {
    color: theme.colors.ink,
    fontSize: 17,
    fontWeight: '900',
  },
  libraryTitleGroup: {
    flex: 1,
    gap: 3,
  },
  libraryTop: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: theme.spacing.sm,
    justifyContent: 'space-between',
  },
  templateCard: {
    backgroundColor: theme.colors.surface,
    borderColor: '#BAD7C8',
    borderRadius: theme.radius.md,
    borderWidth: 1,
    gap: theme.spacing.sm,
    padding: theme.spacing.md,
  },
  templateFormat: {
    color: theme.colors.brandDark,
    fontSize: 12,
    fontWeight: '900',
  },
  templateHeading: {
    color: theme.colors.ink,
    fontSize: 15,
    fontWeight: '900',
  },
  templateShell: {
    backgroundColor: '#E8F4EE',
    borderColor: '#BAD7C8',
    borderRadius: theme.radius.md,
    borderWidth: 1,
    gap: theme.spacing.sm,
    padding: theme.spacing.md,
  },
  templateTitle: {
    color: theme.colors.ink,
    fontSize: 15,
    fontWeight: '900',
  },
  reviewBadge: {
    borderRadius: theme.radius.sm,
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  reviewBadgeStrong: {
    backgroundColor: theme.colors.success,
  },
  reviewBadgeCaveat: {
    backgroundColor: theme.colors.amber,
  },
  reviewBadgeRisk: {
    backgroundColor: theme.colors.coral,
  },
  reviewBadgeText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  reviewShell: {
    borderRadius: theme.radius.md,
    gap: theme.spacing.md,
    padding: theme.spacing.md,
  },
  reviewStrong: {
    backgroundColor: '#E8F4EE',
    borderColor: '#BAD7C8',
    borderWidth: 1,
  },
  reviewCaveat: {
    backgroundColor: '#FFF5E7',
    borderColor: '#E5C58F',
    borderWidth: 1,
  },
  reviewRisk: {
    backgroundColor: '#FFF0EC',
    borderColor: '#E8B5A7',
    borderWidth: 1,
  },
  reviewTop: {
    gap: 5,
  },
  reviewTitleRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  reviewTitle: {
    color: theme.colors.ink,
    flex: 1,
    fontSize: 17,
    fontWeight: '900',
  },
  reviewSummary: {
    color: theme.colors.text,
    fontSize: 13,
    lineHeight: 19,
  },
  factGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.sm,
  },
  fact: {
    backgroundColor: theme.colors.surface,
    borderColor: theme.colors.line,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    flexGrow: 1,
    flexShrink: 1,
    gap: 4,
    minWidth: 126,
    padding: theme.spacing.md,
  },
  factValue: {
    color: theme.colors.brandDark,
    fontSize: 17,
    fontWeight: '900',
  },
  factLabel: {
    color: theme.colors.ink,
    fontSize: 12,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  factDetail: {
    color: theme.colors.muted,
    fontSize: 12,
    lineHeight: 16,
  },
  timelineList: {
    gap: theme.spacing.sm,
  },
  timelineRow: {
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    borderColor: theme.colors.line,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    flexDirection: 'row',
    gap: theme.spacing.sm,
    padding: theme.spacing.md,
  },
  timelineTime: {
    color: theme.colors.brandDark,
    fontSize: 13,
    fontWeight: '900',
    minWidth: 40,
  },
  timelineTrack: {
    backgroundColor: theme.colors.surfaceAlt,
    borderRadius: 999,
    height: 8,
    overflow: 'visible',
    position: 'relative',
    width: 72,
  },
  timelineDot: {
    backgroundColor: theme.colors.brand,
    borderRadius: 999,
    height: 10,
    marginLeft: -5,
    position: 'absolute',
    top: -1,
    width: 10,
  },
  timelineCopy: {
    flex: 1,
    gap: 3,
  },
  timelineLabel: {
    color: theme.colors.ink,
    fontSize: 13,
    fontWeight: '900',
  },
  timelineType: {
    color: theme.colors.muted,
    fontSize: 11,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  evidenceCopy: {
    flex: 1,
    gap: 4,
  },
  evidenceDetail: {
    color: theme.colors.text,
    fontSize: 12,
    lineHeight: 17,
  },
  evidenceList: {
    gap: theme.spacing.sm,
  },
  evidenceMeta: {
    color: theme.colors.muted,
    fontSize: 11,
    fontWeight: '800',
    lineHeight: 15,
  },
  evidenceRow: {
    alignItems: 'flex-start',
    backgroundColor: theme.colors.surface,
    borderColor: theme.colors.line,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    flexDirection: 'row',
    gap: theme.spacing.sm,
    padding: theme.spacing.md,
  },
  evidenceStatus: {
    borderRadius: theme.radius.sm,
    minWidth: 68,
    paddingHorizontal: 8,
    paddingVertical: 6,
  },
  evidenceStatusBlocked: {
    backgroundColor: '#FFF0EC',
  },
  evidenceStatusPass: {
    backgroundColor: '#E6F3EC',
  },
  evidenceStatusReview: {
    backgroundColor: '#FFF5E7',
  },
  evidenceStatusText: {
    color: theme.colors.brandDark,
    fontSize: 10,
    fontWeight: '900',
    textAlign: 'center',
    textTransform: 'uppercase',
  },
  evidenceTitle: {
    color: theme.colors.ink,
    fontSize: 13,
    fontWeight: '900',
  },
  saveAction: {
    alignItems: 'center',
    backgroundColor: theme.colors.brand,
    borderRadius: theme.radius.sm,
    flexDirection: 'row',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  saveActionText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '900',
  },
  logShell: {
    backgroundColor: theme.colors.surface,
    borderColor: theme.colors.line,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    gap: theme.spacing.md,
    padding: theme.spacing.md,
  },
  logTitleRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  logTitle: {
    color: theme.colors.ink,
    fontSize: 16,
    fontWeight: '900',
  },
  logGroup: {
    gap: 8,
  },
  logLabel: {
    color: theme.colors.ink,
    fontSize: 12,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  logOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.sm,
  },
  resolvedCueChip: {
    backgroundColor: theme.colors.surfaceAlt,
    borderColor: theme.colors.line,
    borderRadius: theme.radius.sm,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  resolvedCueChipSelected: {
    backgroundColor: '#E8F4EE',
    borderColor: '#BAD7C8',
  },
  resolvedCueList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.sm,
  },
  resolvedCueText: {
    color: theme.colors.brandDark,
    fontSize: 12,
    fontWeight: '900',
  },
  resolvedCueTextSelected: {
    color: theme.colors.success,
  },
  statusChip: {
    backgroundColor: theme.colors.surfaceAlt,
    borderColor: theme.colors.line,
    borderRadius: theme.radius.sm,
    borderWidth: 1,
    paddingHorizontal: 11,
    paddingVertical: 9,
  },
  statusChipSelected: {
    backgroundColor: theme.colors.brandDark,
    borderColor: theme.colors.brandDark,
  },
  statusChipText: {
    color: theme.colors.brandDark,
    fontSize: 12,
    fontWeight: '900',
  },
  statusChipTextSelected: {
    color: '#FFFFFF',
  },
  logScores: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.md,
  },
  cueFeedbackChip: {
    backgroundColor: theme.colors.surface,
    borderColor: theme.colors.line,
    borderRadius: theme.radius.sm,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  cueFeedbackChipSelected: {
    backgroundColor: theme.colors.brandDark,
    borderColor: theme.colors.brandDark,
  },
  cueFeedbackChipText: {
    color: theme.colors.brandDark,
    fontSize: 12,
    fontWeight: '900',
  },
  cueFeedbackChipTextSelected: {
    color: '#FFFFFF',
  },
  cueFeedbackItem: {
    backgroundColor: theme.colors.surfaceAlt,
    borderRadius: theme.radius.sm,
    gap: 8,
    padding: theme.spacing.sm,
  },
  cueFeedbackList: {
    gap: theme.spacing.sm,
  },
  cueFeedbackTitle: {
    color: theme.colors.ink,
    fontSize: 13,
    fontWeight: '900',
    lineHeight: 17,
  },
  scoreChip: {
    alignItems: 'center',
    backgroundColor: theme.colors.surfaceAlt,
    borderColor: theme.colors.line,
    borderRadius: theme.radius.sm,
    borderWidth: 1,
    height: 34,
    justifyContent: 'center',
    width: 34,
  },
  scoreChipSelected: {
    backgroundColor: theme.colors.moss,
    borderColor: theme.colors.moss,
  },
  scoreChipText: {
    color: theme.colors.brandDark,
    fontSize: 13,
    fontWeight: '900',
  },
  scoreChipTextSelected: {
    color: '#FFFFFF',
  },
  logInput: {
    backgroundColor: theme.colors.surfaceAlt,
    borderColor: theme.colors.line,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    color: theme.colors.text,
    fontSize: 14,
    lineHeight: 20,
    minHeight: 104,
    padding: theme.spacing.md,
    textAlignVertical: 'top',
  },
  csvInput: {
    backgroundColor: theme.colors.surfaceAlt,
    borderColor: theme.colors.line,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    color: theme.colors.text,
    fontFamily: 'monospace',
    fontSize: 11,
    lineHeight: 16,
    minHeight: 152,
    padding: theme.spacing.md,
    textAlignVertical: 'top',
  },
  tagInput: {
    backgroundColor: theme.colors.surfaceAlt,
    borderColor: theme.colors.line,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    color: theme.colors.text,
    fontSize: 14,
    padding: theme.spacing.md,
  },
  exportBox: {
    backgroundColor: theme.colors.surface,
    borderColor: theme.colors.line,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    padding: theme.spacing.md,
  },
  exportText: {
    color: theme.colors.text,
    fontFamily: 'monospace',
    fontSize: 11,
    lineHeight: 15,
  },
});
