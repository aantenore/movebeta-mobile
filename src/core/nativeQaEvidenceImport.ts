import {
  validateNativeQaEvidenceForApp,
  type NativeQaEvidenceCheck,
  type NativeQaEvidencePayload,
  type NativeQaEvidenceRunSummary,
} from './nativeQaEvidenceValidation';

export const nativeQaEvidenceImportSchemaVersion = 'movebeta.native-qa-evidence-import.v1';

export type NativeQaEvidenceImportPreview = {
  action: string;
  badge: string;
  blockingChecks: number;
  failedChecks: NativeQaEvidenceCheck[];
  parseError?: string;
  readyRuns: number;
  runSummaries: NativeQaEvidenceRunSummary[];
  schemaVersion: typeof nativeQaEvidenceImportSchemaVersion;
  status: 'blocked' | 'empty' | 'invalid-json' | 'ready';
  totalRuns: number;
};

function summarizeValidation(evidence: NativeQaEvidencePayload): NativeQaEvidenceImportPreview {
  const validation = validateNativeQaEvidenceForApp(evidence);
  const readyRuns = validation.runSummaries.filter((run) => run.status === 'pass').length;

  return {
    action: validation.ready
      ? 'Native QA evidence is ready for the release validator.'
      : 'Replace placeholders, failing workflows, slow runs, or raw artifact references before release.',
    badge: validation.ready ? 'Ready' : 'Blocked',
    blockingChecks: validation.failedChecks.length,
    failedChecks: validation.failedChecks.slice(0, 4),
    readyRuns,
    runSummaries: validation.runSummaries,
    schemaVersion: nativeQaEvidenceImportSchemaVersion,
    status: validation.ready ? 'ready' : 'blocked',
    totalRuns: validation.runSummaries.length,
  };
}

export function buildNativeQaEvidenceImportPreview(input: string): NativeQaEvidenceImportPreview {
  const trimmed = input.trim();

  if (trimmed.length === 0) {
    return {
      action: 'Paste native QA evidence JSON after physical iOS and Android runs to preview release readiness locally.',
      badge: 'Paste JSON',
      blockingChecks: 0,
      failedChecks: [],
      readyRuns: 0,
      runSummaries: [],
      schemaVersion: nativeQaEvidenceImportSchemaVersion,
      status: 'empty',
      totalRuns: 0,
    };
  }

  try {
    return summarizeValidation(JSON.parse(trimmed) as NativeQaEvidencePayload);
  } catch (error) {
    return {
      action: 'Fix the JSON syntax before validating native QA evidence.',
      badge: 'Invalid',
      blockingChecks: 1,
      failedChecks: [],
      parseError: error instanceof Error ? error.message : 'Native QA evidence JSON could not be parsed.',
      readyRuns: 0,
      runSummaries: [],
      schemaVersion: nativeQaEvidenceImportSchemaVersion,
      status: 'invalid-json',
      totalRuns: 0,
    };
  }
}
