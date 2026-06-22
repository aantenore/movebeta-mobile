import { z } from 'zod';

import { AnalysisTrustSummarySchema, buildAnalysisTrustSummary } from './analysisTrust';
import type { LocalAnalysisReport } from './contracts';

export const analysisTrustPacketSchemaVersion = 'movebeta.analysis-trust-packet.v1';

export const AnalysisTrustPacketSchema = z.object({
  generatedAt: z.string(),
  privacy: z.object({
    keyFramesIncluded: z.literal(false),
    landmarksIncluded: z.literal(false),
    privateNotesIncluded: z.literal(false),
    rawVideoIncluded: z.literal(false),
    tokenLikeValuesIncluded: z.literal(false),
    videoUriIncluded: z.literal(false),
  }),
  report: z.object({
    analysisQualityScore: z.number().int().min(0).max(100),
    coachLens: z.object({
      key: z.string(),
      label: z.string(),
      summary: z.string(),
    }),
    evidenceGeneratedAt: z.string(),
    performanceBudgetStatus: z.string(),
    provider: z.string(),
    reportId: z.string(),
    runsOnDevice: z.boolean(),
    session: z.object({
      grade: z.string(),
      gym: z.string(),
      title: z.string(),
      wallAngle: z.string(),
    }),
  }),
  schemaVersion: z.literal(analysisTrustPacketSchemaVersion),
  trust: AnalysisTrustSummarySchema,
});

export type AnalysisTrustPacket = z.infer<typeof AnalysisTrustPacketSchema>;

const forbiddenTrustPacketPattern =
  /(file:\/\/|content:\/\/|ph:\/\/|\/users\/|\/var\/|\/private\/|rawVideo|videoUri|privateNote|secret|token|BEGIN PRIVATE KEY)/i;

function containsForbiddenValue(value: unknown): boolean {
  if (typeof value === 'string') return forbiddenTrustPacketPattern.test(value);
  if (Array.isArray(value)) return value.some(containsForbiddenValue);
  if (value && typeof value === 'object') return Object.values(value).some(containsForbiddenValue);
  return false;
}

export function assertAnalysisTrustPacketIsPrivacySafe(packet: AnalysisTrustPacket) {
  if (containsForbiddenValue(packet)) {
    throw new Error('Analysis trust packet contains raw video, URI, private note, local path, or secret-like evidence.');
  }

  return packet;
}

export function buildAnalysisTrustPacket(
  report: LocalAnalysisReport,
  options: { generatedAt?: string } = {},
): AnalysisTrustPacket {
  const packet = AnalysisTrustPacketSchema.parse({
    generatedAt: options.generatedAt ?? report.analysisEvidence.generatedAt,
    privacy: {
      keyFramesIncluded: false,
      landmarksIncluded: false,
      privateNotesIncluded: false,
      rawVideoIncluded: false,
      tokenLikeValuesIncluded: false,
      videoUriIncluded: false,
    },
    report: {
      analysisQualityScore: report.analysisQuality.score,
      coachLens: report.engine.coachLens,
      evidenceGeneratedAt: report.analysisEvidence.generatedAt,
      performanceBudgetStatus: report.performance.budgetStatus,
      provider: report.engine.provider,
      reportId: report.id,
      runsOnDevice: report.engine.runsOnDevice,
      session: {
        grade: report.session.grade,
        gym: report.session.gym,
        title: report.session.title,
        wallAngle: report.session.wallAngle,
      },
    },
    schemaVersion: analysisTrustPacketSchemaVersion,
    trust: buildAnalysisTrustSummary(report),
  });

  return assertAnalysisTrustPacketIsPrivacySafe(packet);
}

export function formatAnalysisTrustPacketSummary(packet: AnalysisTrustPacket) {
  return [
    `Analysis trust: ${packet.trust.decision} (${packet.trust.score}/100)`,
    `Report: ${packet.report.session.title} · ${packet.report.session.grade} · ${packet.report.session.wallAngle}`,
    `Action: ${packet.trust.recommendedAction}`,
    `Privacy: raw video no · URI no · private notes no · landmarks no`,
  ].join('\n');
}
