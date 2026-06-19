import { useCallback, useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { Download, Eye, NotebookPen, RefreshCw, Save, ShieldCheck, Trash2, UserCheck } from 'lucide-react-native';

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
import { theme } from '@/core/theme';
import { selectionFeedback } from '@/core/haptics';
import { formatAnalysisDuration, formatAnalysisFrameRate } from '@/video/performanceBudget';
import { buildSessionReviewDetail, type SessionReviewDetail, type SessionTimelineMarker } from '@/movement/sessionDetail';
import { drillPracticeRepository } from '@/movement/drillPracticeRepository';
import {
  createReportAnnotation,
  cueFeedbackRatings,
  reportAnnotationRepository,
  reportProjectStatuses,
  updateCueFeedback,
  updateReportAnnotation,
  type ReportAnnotation,
} from '@/movement/reportAnnotationRepository';

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

function CoachLibraryPanel({ library }: { library: CoachLibrary }) {
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
    </Section>
  );
}

export function SessionsScreen() {
  const [reports, setReports] = useState<LocalAnalysisReport[]>([]);
  const [coachConsentByReport, setCoachConsentByReport] = useState<Record<string, CoachReviewConsentRecord>>({});
  const [annotationByReport, setAnnotationByReport] = useState<Record<string, ReportAnnotation>>({});
  const [coachLibrary, setCoachLibrary] = useState<CoachLibrary>(() => buildCoachLibrary([], []));
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
    });
    assertCoachPacketIsPrivacySafe(packet);
    setPreparedExport({ body: JSON.stringify(packet, null, 2), title: 'Prepared coach packet' });
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

          <CoachLibraryPanel library={coachLibrary} />

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
        <Section title={preparedExport.title}>
          <View style={styles.exportBox}>
            <Text style={styles.exportText}>{preparedExport.body}</Text>
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
  libraryCard: {
    backgroundColor: theme.colors.surface,
    borderColor: theme.colors.line,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    gap: theme.spacing.sm,
    padding: theme.spacing.md,
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
