import { z } from 'zod';

export const DiagnosticSeveritySchema = z.enum(['debug', 'info', 'warning', 'error']);

export const DiagnosticEventSchema = z.object({
  context: z.record(z.string(), z.string()).default({}),
  message: z.string(),
  name: z.string(),
  release: z.string(),
  severity: DiagnosticSeveritySchema,
  timestamp: z.string(),
});

export type DiagnosticEvent = z.infer<typeof DiagnosticEventSchema>;

export const DiagnosticReportSnapshotSchema = z.object({
  analysisMs: z.number().nonnegative(),
  budgetStatus: z.enum(['within-budget', 'over-budget', 'not-measured']),
  framesPerSecond: z.number().nonnegative(),
  processedFrames: z.number().int().nonnegative(),
  provider: z.string(),
  qualityScore: z.number().min(0).max(100),
  storedArtifacts: z.array(z.string()),
  videoLeavesDevice: z.boolean(),
  warningCount: z.number().int().nonnegative(),
});

export const DiagnosticSupportPacketSchema = z.object({
  app: z.object({
    activePlan: z.string(),
    analysisProvider: z.string(),
    privacyMode: z.string(),
    release: z.string(),
    videoAnalysisProvider: z.string(),
  }),
  consent: z.object({
    cloudSync: z.boolean(),
    diagnosticsExport: z.boolean(),
    localAnalysis: z.boolean(),
    rawVideoExport: z.boolean(),
  }),
  events: z.array(DiagnosticEventSchema),
  generatedAt: z.string(),
  history: z.object({
    averageQuality: z.number(),
    localOnlyReports: z.number().int().nonnegative(),
    overBudgetReports: z.number().int().nonnegative(),
    providers: z.array(z.string()),
    reportCount: z.number().int().nonnegative(),
    totalWarnings: z.number().int().nonnegative(),
  }),
  privacy: z.object({
    excludedArtifacts: z.array(z.string()),
    redaction: z.string(),
  }),
});

export type DiagnosticReportSnapshot = z.infer<typeof DiagnosticReportSnapshotSchema>;
export type DiagnosticSupportPacket = z.infer<typeof DiagnosticSupportPacketSchema>;

const sensitiveKeyPattern = /(video|landmark|frame|uri|token|secret|password|email)/i;

export function sanitizeDiagnostics(context: Record<string, unknown>) {
  return Object.fromEntries(
    Object.entries(context).map(([key, value]) => {
      if (sensitiveKeyPattern.test(key)) return [key, '[redacted]'];
      if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
        return [key, String(value)];
      }
      return [key, '[redacted]'];
    }),
  );
}

export function createDiagnosticEvent(input: {
  context?: Record<string, unknown>;
  message: string;
  name: string;
  release: string;
  severity?: z.infer<typeof DiagnosticSeveritySchema>;
}) {
  return DiagnosticEventSchema.parse({
    context: sanitizeDiagnostics(input.context ?? {}),
    message: input.message,
    name: input.name,
    release: input.release,
    severity: input.severity ?? 'info',
    timestamp: new Date().toISOString(),
  });
}

function average(values: number[]) {
  if (values.length === 0) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

export function buildDiagnosticSupportPacket(input: {
  activePlan: string;
  analysisProvider: string;
  cloudSync: boolean;
  diagnosticsExport: boolean;
  events?: DiagnosticEvent[];
  privacyMode: string;
  rawVideoExport: boolean;
  release: string;
  reportSnapshots: DiagnosticReportSnapshot[];
  videoAnalysisProvider: string;
}) {
  const reportSnapshots = DiagnosticReportSnapshotSchema.array().parse(input.reportSnapshots);
  const events = DiagnosticEventSchema.array().parse(input.events ?? []);
  const providers = Array.from(new Set(reportSnapshots.map((report) => report.provider))).sort();
  const reportCount = reportSnapshots.length;
  const localOnlyReports = reportSnapshots.filter((report) => !report.videoLeavesDevice).length;
  const overBudgetReports = reportSnapshots.filter((report) => report.budgetStatus === 'over-budget').length;
  const totalWarnings = reportSnapshots.reduce((sum, report) => sum + report.warningCount, 0);

  return DiagnosticSupportPacketSchema.parse({
    app: {
      activePlan: input.activePlan,
      analysisProvider: input.analysisProvider,
      privacyMode: input.privacyMode,
      release: input.release,
      videoAnalysisProvider: input.videoAnalysisProvider,
    },
    consent: {
      cloudSync: input.cloudSync,
      diagnosticsExport: input.diagnosticsExport,
      localAnalysis: true,
      rawVideoExport: input.rawVideoExport,
    },
    events,
    generatedAt: new Date().toISOString(),
    history: {
      averageQuality: Number(average(reportSnapshots.map((report) => report.qualityScore)).toFixed(1)),
      localOnlyReports,
      overBudgetReports,
      providers,
      reportCount,
      totalWarnings,
    },
    privacy: {
      excludedArtifacts: ['raw video', 'video URI', 'pose landmarks', 'key frames', 'account identifiers', 'secrets'],
      redaction: 'Only aggregate counts, quality scores, providers, and sanitized events are included.',
    },
  });
}

export function assertDiagnosticPacketIsPrivacySafe(packet: DiagnosticSupportPacket) {
  const serialized = JSON.stringify(packet);
  const forbiddenValuePattern = /(file:\/\/|ph:\/\/|content:\/\/|https?:\/\/|token-|secret-token|\[\s*\{\s*"x"\s*:)/i;

  if (forbiddenValuePattern.test(serialized)) {
    throw new Error('Diagnostic support packet contains raw video, URI, landmark, or secret-like artifacts.');
  }

  return packet;
}
