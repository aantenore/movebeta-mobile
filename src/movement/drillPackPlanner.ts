import { z } from 'zod';

import type { ClimbSession, LocalAnalysisReport } from './contracts';
import { buildDrillPlan, type DrillPlanItem, type DrillPlanPriority } from './drillPlanner';
import { summarizeDrillPracticeInsights } from './drillPracticeInsights';
import type { DrillPracticeRecord } from './drillPracticeRepository';
import type { CueFeedback, ReportAnnotation } from './reportAnnotationRepository';

export const AdvancedDrillPackBlockSchema = z.object({
  adaptation: z.string(),
  cueIds: z.array(z.string()),
  durationMinutes: z.number().int().positive(),
  evidence: z.string(),
  focus: z.string(),
  gradeBand: z.string(),
  id: z.string(),
  intensity: z.enum(['easy', 'moderate', 'hard']),
  progression: z.array(z.string()).min(3).max(4),
  sourceReportIds: z.array(z.string()),
  successCriteria: z.string(),
  title: z.string(),
  wallAngle: z.enum(['slab', 'vertical', 'overhang']),
});

export const AdvancedDrillPackSchema = z.object({
  annotationSignalCount: z.number().int().nonnegative(),
  blocks: z.array(AdvancedDrillPackBlockSchema),
  generatedAt: z.string(),
  localOnly: z.boolean(),
  practiceSignalCount: z.number().int().nonnegative(),
  primaryFocus: z.string(),
  privacy: z.object({
    privateNotesIncluded: z.literal(false),
    rawVideoIncluded: z.literal(false),
    videoLeavesDevice: z.literal(false),
  }),
  readinessScore: z.number().min(0).max(100),
  schemaVersion: z.literal('movebeta.advanced-drill-pack.v1'),
  sourceReportCount: z.number().int().nonnegative(),
  status: z.enum(['empty', 'preview', 'ready']),
  summary: z.string(),
  wallAngleFocus: z.enum(['slab', 'vertical', 'overhang']).nullable(),
  weeklyLoad: z.string(),
});

export type AdvancedDrillPackBlock = z.infer<typeof AdvancedDrillPackBlockSchema>;
export type AdvancedDrillPack = z.infer<typeof AdvancedDrillPackSchema>;

export type AdvancedDrillPackOptions = {
  generatedAt?: string;
  maxBlocks?: number;
  minReadyReports?: number;
  priorityDurations?: Record<DrillPlanPriority, number>;
};

const defaultAdvancedDrillPackOptions = {
  maxBlocks: 3,
  minReadyReports: 2,
  priorityDurations: {
    high: 18,
    maintenance: 10,
    medium: 14,
  },
} satisfies Required<Omit<AdvancedDrillPackOptions, 'generatedAt'>>;

function sortReports(reports: LocalAnalysisReport[]) {
  return [...reports].sort((a, b) => b.session.createdAt.localeCompare(a.session.createdAt));
}

function mostCommonWallAngle(reports: LocalAnalysisReport[]): ClimbSession['wallAngle'] | null {
  const counts = new Map<ClimbSession['wallAngle'], number>();
  for (const report of reports) {
    counts.set(report.session.wallAngle, (counts.get(report.session.wallAngle) ?? 0) + 1);
  }
  return [...counts.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))[0]?.[0] ?? null;
}

function averageQuality(reports: LocalAnalysisReport[]) {
  if (reports.length === 0) return 0;
  return Math.round(reports.reduce((sum, report) => sum + report.analysisQuality.score, 0) / reports.length);
}

function feedbackForCue(annotations: ReportAnnotation[], cueId: string): CueFeedback[] {
  return annotations.flatMap((annotation) => annotation.cueFeedback.filter((feedback) => feedback.cueId === cueId));
}

function feedbackSummary(feedback: CueFeedback[]) {
  const useful = feedback.filter((item) => item.rating === 'useful').length;
  const review = feedback.filter((item) => item.rating !== 'useful').length;
  if (useful > review) return 'Private cue feedback says this drill is worth reinforcing.';
  if (review > 0) return 'Private cue feedback asks for a constraint variant before more volume.';
  return 'No private cue feedback yet; keep the first block measurable.';
}

function reportForItem(reportsById: Map<string, LocalAnalysisReport>, item: DrillPlanItem) {
  return reportsById.get(item.sourceReportId);
}

function intensityFor(item: DrillPlanItem, practiceBlocked: boolean): AdvancedDrillPackBlock['intensity'] {
  if (practiceBlocked) return 'easy';
  if (item.priority === 'high') return 'moderate';
  if (item.priority === 'medium') return 'easy';
  return 'easy';
}

function blockProgression(item: DrillPlanItem, practiceBlocked: boolean) {
  const base = practiceBlocked
    ? ['Reset on easy terrain with the same movement cue.', 'Repeat the cue drill at conversational effort.']
    : ['Warm up with one low-intensity rehearsal.', 'Run the cue drill with full attention and no scoring pressure.'];
  return [
    ...base,
    item.feedbackStatus === 'variant' ? 'Switch to a smaller movement range if the cue still feels unclear.' : item.drill,
    'Film one controlled repeat and compare it with the smart baseline.',
  ];
}

function adaptationFor({
  feedback,
  item,
  practiceBlocked,
}: {
  feedback: CueFeedback[];
  item: DrillPlanItem;
  practiceBlocked: boolean;
}) {
  if (practiceBlocked) return 'Practice logs show this cue is getting skipped; lower intensity before adding another hard attempt.';
  if (item.feedbackStatus === 'variant') return 'Cue feedback needs review; use the easier variant and keep the same measurement target.';
  if (item.feedbackStatus === 'reinforce') return 'Useful cue feedback is positive; keep the same drill and add one filmed repeat.';
  return feedbackSummary(feedback);
}

function successCriteriaFor(item: DrillPlanItem) {
  if (item.priority === 'high') return 'Complete the block and improve the related cue status or metric score on the next local report.';
  if (item.priority === 'medium') return 'Complete two controlled repeats with no new watch-level cue for the same movement.';
  return 'Complete the maintenance set while keeping analysis quality above the latest report baseline.';
}

function readinessScore({
  annotationSignalCount,
  blockCount,
  practiceSignalCount,
  reportQuality,
  sourceReportCount,
}: {
  annotationSignalCount: number;
  blockCount: number;
  practiceSignalCount: number;
  reportQuality: number;
  sourceReportCount: number;
}) {
  const reportScore = Math.min(30, sourceReportCount * 10);
  const blockScore = Math.min(25, blockCount * 9);
  const annotationScore = Math.min(15, annotationSignalCount * 5);
  const practiceScore = Math.min(15, practiceSignalCount * 5);
  const qualityScore = Math.round(reportQuality * 0.15);
  return Math.max(0, Math.min(100, reportScore + blockScore + annotationScore + practiceScore + qualityScore));
}

function buildBlock({
  annotations,
  durationMinutes,
  item,
  practiceBlocked,
  reportsById,
}: {
  annotations: ReportAnnotation[];
  durationMinutes: number;
  item: DrillPlanItem;
  practiceBlocked: boolean;
  reportsById: Map<string, LocalAnalysisReport>;
}): AdvancedDrillPackBlock {
  const report = reportForItem(reportsById, item);
  const feedback = feedbackForCue(annotations, item.cueId);

  return AdvancedDrillPackBlockSchema.parse({
    adaptation: adaptationFor({ feedback, item, practiceBlocked }),
    cueIds: [item.cueId],
    durationMinutes,
    evidence: `${item.evidence} · ${feedbackSummary(feedback)}`,
    focus: item.focus,
    gradeBand: report?.session.grade ?? 'current project grade',
    id: `advanced-pack-${item.id}`,
    intensity: intensityFor(item, practiceBlocked),
    progression: blockProgression(item, practiceBlocked),
    sourceReportIds: [item.sourceReportId],
    successCriteria: successCriteriaFor(item),
    title: item.feedbackStatus === 'variant' ? `${item.title} variant pack` : `${item.title} progression`,
    wallAngle: report?.session.wallAngle ?? 'vertical',
  });
}

export function buildAdvancedDrillPack(
  reports: LocalAnalysisReport[],
  annotations: ReportAnnotation[] = [],
  practiceRecords: DrillPracticeRecord[] = [],
  options: AdvancedDrillPackOptions = {},
): AdvancedDrillPack {
  const config = {
    ...defaultAdvancedDrillPackOptions,
    ...options,
    priorityDurations: {
      ...defaultAdvancedDrillPackOptions.priorityDurations,
      ...options.priorityDurations,
    },
  };
  const orderedReports = sortReports(reports);
  const drillPlan = buildDrillPlan(orderedReports, annotations);
  const practiceSummary = summarizeDrillPracticeInsights(orderedReports, practiceRecords);
  const reportsById = new Map(orderedReports.map((report) => [report.id, report]));
  const selectedItems = drillPlan.items.slice(0, config.maxBlocks);
  const blocks = selectedItems.map((item) =>
    buildBlock({
      annotations,
      durationMinutes: config.priorityDurations[item.priority],
      item,
      practiceBlocked: practiceSummary.status === 'blocked' || practiceSummary.skippedCue?.cueId === item.cueId,
      reportsById,
    }),
  );
  const annotationSignalCount = annotations.filter((annotation) => orderedReports.some((report) => report.id === annotation.reportId)).length;
  const reportQuality = averageQuality(orderedReports);
  const wallAngleFocus = mostCommonWallAngle(orderedReports);
  const score = readinessScore({
    annotationSignalCount,
    blockCount: blocks.length,
    practiceSignalCount: practiceSummary.totalCount,
    reportQuality,
    sourceReportCount: orderedReports.length,
  });
  const status = blocks.length === 0 ? 'empty' : orderedReports.length >= config.minReadyReports ? 'ready' : 'preview';
  const primaryFocus = blocks[0]?.focus ?? 'No advanced focus yet';

  return AdvancedDrillPackSchema.parse({
    annotationSignalCount,
    blocks,
    generatedAt: options.generatedAt ?? new Date().toISOString(),
    localOnly: true,
    practiceSignalCount: practiceSummary.totalCount,
    primaryFocus,
    privacy: {
      privateNotesIncluded: false,
      rawVideoIncluded: false,
      videoLeavesDevice: false,
    },
    readinessScore: score,
    schemaVersion: 'movebeta.advanced-drill-pack.v1',
    sourceReportCount: orderedReports.length,
    status,
    summary:
      status === 'empty'
        ? 'Run an analysis with coach cues before building an advanced drill pack.'
        : `${blocks.length} block${blocks.length > 1 ? 's' : ''} for ${wallAngleFocus ?? 'current'} movement, ${score}/100 pack readiness.`,
    wallAngleFocus,
    weeklyLoad: drillPlan.weeklyLoad,
  });
}
