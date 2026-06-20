import { z } from 'zod';

import { AnalysisEvidenceTimelineSchema, type LocalAnalysisReport } from './contracts';
import { summarizeAnalysisEvidence } from './analysisEvidence';

export const analysisEvidenceExportSchemaVersion = 'movebeta.analysis-evidence-export.v1';

export const AnalysisEvidenceExportSchema = z.object({
  generatedAt: z.string(),
  privacy: z.object({
    keyFramesIncluded: z.literal(false),
    landmarksIncluded: z.literal(false),
    rawVideoIncluded: z.literal(false),
    videoUriIncluded: z.literal(false),
  }),
  report: z.object({
    analysisQualityScore: z.number(),
    coachLens: z.object({
      key: z.string(),
      label: z.string(),
      summary: z.string(),
    }),
    engineModel: z.string(),
    engineProvider: z.string(),
    performanceBudgetStatus: z.string(),
    processedFrames: z.number().int().nonnegative(),
    reportId: z.string(),
    runsOnDevice: z.boolean(),
    session: z.object({
      grade: z.string(),
      gym: z.string(),
      title: z.string(),
      wallAngle: z.string(),
    }),
  }),
  schemaVersion: z.literal(analysisEvidenceExportSchemaVersion),
  summary: z.object({
    blocked: z.number().int().nonnegative(),
    pass: z.number().int().nonnegative(),
    review: z.number().int().nonnegative(),
    status: z.enum(['pass', 'review', 'blocked']),
    total: z.number().int().nonnegative(),
  }),
  timeline: AnalysisEvidenceTimelineSchema,
});

export type AnalysisEvidenceExport = z.infer<typeof AnalysisEvidenceExportSchema>;

const forbiddenExportPattern = /(file:\/\/|content:\/\/|ph:\/\/|\/users\/|\/var\/|\/private\/|videoUri|rawVideoUri|secret|token)/i;

function containsForbiddenExportEvidence(value: unknown): boolean {
  if (typeof value === 'string') return forbiddenExportPattern.test(value);
  if (Array.isArray(value)) return value.some(containsForbiddenExportEvidence);
  if (value && typeof value === 'object') {
    return Object.values(value).some(containsForbiddenExportEvidence);
  }
  return false;
}

export function assertAnalysisEvidenceExportIsPrivacySafe(exportBundle: AnalysisEvidenceExport) {
  if (containsForbiddenExportEvidence(exportBundle)) {
    throw new Error('Analysis evidence export contains raw artifact, URI, landmark, key frame, or secret-like evidence.');
  }
  return exportBundle;
}

export function buildAnalysisEvidenceExport(
  report: LocalAnalysisReport,
  options: { generatedAt?: string } = {},
): AnalysisEvidenceExport {
  const exportBundle = AnalysisEvidenceExportSchema.parse({
    generatedAt: options.generatedAt ?? report.analysisEvidence.generatedAt,
    privacy: {
      keyFramesIncluded: false,
      landmarksIncluded: false,
      rawVideoIncluded: false,
      videoUriIncluded: false,
    },
    report: {
      analysisQualityScore: report.analysisQuality.score,
      coachLens: report.engine.coachLens,
      engineModel: report.engine.model,
      engineProvider: report.engine.provider,
      performanceBudgetStatus: report.performance.budgetStatus,
      processedFrames: report.engine.processedFrames,
      reportId: report.id,
      runsOnDevice: report.engine.runsOnDevice,
      session: {
        grade: report.session.grade,
        gym: report.session.gym,
        title: report.session.title,
        wallAngle: report.session.wallAngle,
      },
    },
    schemaVersion: analysisEvidenceExportSchemaVersion,
    summary: summarizeAnalysisEvidence(report.analysisEvidence),
    timeline: report.analysisEvidence,
  });

  return assertAnalysisEvidenceExportIsPrivacySafe(exportBundle);
}
