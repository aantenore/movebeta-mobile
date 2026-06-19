import { z } from 'zod';

import type { LocalAnalysisReport } from './contracts';
import { isCoachReviewConsentActive, type CoachReviewConsentRecord } from './coachConsentRepository';
import type { DrillPracticeRecord } from './drillPracticeRepository';
import type { ReportAnnotation } from './reportAnnotationRepository';

export const CoachLibraryEntrySchema = z.object({
  athleteContextIncluded: z.literal(true),
  cueFeedbackCount: z.number().int().nonnegative(),
  drillPracticeCount: z.number().int().nonnegative(),
  fixCueCount: z.number().int().nonnegative(),
  grade: z.string(),
  grantedAt: z.string(),
  gym: z.string(),
  lastActivityAt: z.string(),
  packetReady: z.boolean(),
  policyVersion: z.string(),
  priority: z.enum(['high', 'medium', 'low']),
  rawVideoIncluded: z.literal(false),
  reportId: z.string(),
  reviewFocus: z.string(),
  signalStatus: z.enum(['ready', 'review-signal']),
  title: z.string(),
  videoLeavesDevice: z.literal(false),
  wallAngle: z.string(),
});

export const CoachLibrarySchema = z.object({
  activeConsentCount: z.number().int().nonnegative(),
  entries: z.array(CoachLibraryEntrySchema),
  highPriorityCount: z.number().int().nonnegative(),
  readyPacketCount: z.number().int().nonnegative(),
  revokedConsentCount: z.number().int().nonnegative(),
  totalReports: z.number().int().nonnegative(),
});

export type CoachLibraryEntry = z.infer<typeof CoachLibraryEntrySchema>;
export type CoachLibrary = z.infer<typeof CoachLibrarySchema>;

const priorityRank: Record<CoachLibraryEntry['priority'], number> = {
  high: 0,
  medium: 1,
  low: 2,
};

function maxIsoDate(values: string[]) {
  return values.filter(Boolean).sort((a, b) => b.localeCompare(a))[0] ?? new Date(0).toISOString();
}

function chooseReviewFocus(report: LocalAnalysisReport) {
  const fixCue = report.cues.find((cue) => cue.severity === 'fix');
  const watchCue = report.cues.find((cue) => cue.severity === 'watch');
  return fixCue?.title ?? watchCue?.title ?? 'Movement baseline review';
}

function choosePriority(report: LocalAnalysisReport, signalStatus: CoachLibraryEntry['signalStatus']): CoachLibraryEntry['priority'] {
  if (report.cues.some((cue) => cue.severity === 'fix')) return 'high';
  if (signalStatus === 'review-signal' || report.cues.some((cue) => cue.severity === 'watch')) return 'medium';
  return 'low';
}

export function buildCoachLibrary(
  reports: LocalAnalysisReport[],
  consents: CoachReviewConsentRecord[],
  annotations: ReportAnnotation[] = [],
  drillPractice: DrillPracticeRecord[] = [],
): CoachLibrary {
  const reportsById = new Map(reports.map((report) => [report.id, report]));
  const annotationByReport = new Map(annotations.map((annotation) => [annotation.reportId, annotation]));
  const drillPracticeByReport = new Map<string, DrillPracticeRecord[]>();

  for (const record of drillPractice) {
    if (!reportsById.has(record.reportId)) continue;
    drillPracticeByReport.set(record.reportId, [...(drillPracticeByReport.get(record.reportId) ?? []), record]);
  }

  const entries = consents.flatMap((consent) => {
    if (!isCoachReviewConsentActive(consent)) return [];

    const report = reportsById.get(consent.reportId);
    if (!report) return [];

    const annotation = annotationByReport.get(report.id);
    const practice = drillPracticeByReport.get(report.id) ?? [];
    const signalStatus = report.analysisQuality.score >= 70 && report.analysisQuality.warnings.length === 0 ? 'ready' : 'review-signal';
    const priority = choosePriority(report, signalStatus);
    const fixCueCount = report.cues.filter((cue) => cue.severity === 'fix').length;

    return [
      CoachLibraryEntrySchema.parse({
        athleteContextIncluded: true,
        cueFeedbackCount: annotation?.cueFeedback.length ?? 0,
        drillPracticeCount: practice.length,
        fixCueCount,
        grade: report.session.grade,
        grantedAt: consent.grantedAt,
        gym: report.session.gym,
        lastActivityAt: maxIsoDate([consent.grantedAt, annotation?.updatedAt ?? '', ...practice.map((record) => record.updatedAt)]),
        packetReady: true,
        policyVersion: consent.policyVersion,
        priority,
        rawVideoIncluded: false,
        reportId: report.id,
        reviewFocus: chooseReviewFocus(report),
        signalStatus,
        title: report.session.title,
        videoLeavesDevice: false,
        wallAngle: report.session.wallAngle,
      }),
    ];
  });

  entries.sort(
    (a, b) => priorityRank[a.priority] - priorityRank[b.priority] || b.lastActivityAt.localeCompare(a.lastActivityAt),
  );

  return CoachLibrarySchema.parse({
    activeConsentCount: entries.length,
    entries,
    highPriorityCount: entries.filter((entry) => entry.priority === 'high').length,
    readyPacketCount: entries.filter((entry) => entry.packetReady).length,
    revokedConsentCount: consents.filter((consent) => consent.revokedAt).length,
    totalReports: reports.length,
  });
}
