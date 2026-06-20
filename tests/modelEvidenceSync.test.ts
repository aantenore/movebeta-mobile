import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';

import {
  buildModelEvidenceFromReports,
  MODEL_EVIDENCE_SYNC_SCHEMA_VERSION,
  realWorldValidationFromCueDatasetReport,
  syncModelEvidence,
} from '../scripts/sync_model_evidence.mjs';

const tmpRoots: string[] = [];

function makeTempDir() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'movebeta-model-evidence-'));
  tmpRoots.push(root);
  return root;
}

function writeJson(filePath: string, value: unknown) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`);
}

const moveNetReadinessReport = {
  averageInferenceMs: 280,
  backend: 'cpu',
  budget: {
    averageInferenceMs: 1500,
    loadMs: 25000,
    maxInferenceMs: 3000,
  },
  generatedAt: '2026-06-20T10:00:00.000Z',
  loadMs: 3100,
  maxInferenceMs: 310,
  model: 'MoveNet SinglePose Lightning',
  status: 'ready',
};

const modelAnalysisReplayReport = {
  attempts: [
    {
      privacySafe: true,
      provider: 'web-tfjs-movenet',
    },
    {
      privacySafe: true,
      provider: 'web-tfjs-movenet',
    },
  ],
  generatedAt: '2026-06-20T10:01:00.000Z',
  status: 'pass',
  summary: {
    minQualityScore: 96,
    passedAttempts: 2,
    totalAttempts: 2,
  },
};

const readyCueValidationDatasetReport = {
  generatedAt: '2026-06-20T10:02:00.000Z',
  nextAction: 'Cue-validation dataset is ready for production movement-quality claim review.',
  privacy: {
    datasetIncluded: false,
    rawArtifactsIncluded: false,
    reviewerIdentitiesIncluded: false,
  },
  schemaVersion: 'movebeta.cue-validation-dataset-report.v1',
  status: 'ready',
  summary: {
    averageScore: 4.7,
    clipCount: 21,
    cueCount: 63,
    fileExists: true,
    failedChecks: 0,
    ready: true,
    reviewCount: 126,
    totalChecks: 9,
    wallAngles: ['slab', 'vertical', 'overhang'],
  },
};

afterEach(() => {
  for (const root of tmpRoots.splice(0)) {
    fs.rmSync(root, { force: true, recursive: true });
  }
});

describe('model evidence sync', () => {
  it('builds app model evidence from the latest readiness and replay reports', () => {
    const evidence = buildModelEvidenceFromReports({
      existingModelEvidence: undefined,
      modelAnalysisReplayReport,
      moveNetReadinessReport,
    });

    expect(evidence).toMatchObject({
      analysisReplay: {
        generatedAt: '2026-06-20T10:01:00.000Z',
        passedAttempts: 2,
        privacySafe: true,
        status: 'pass',
        totalAttempts: 2,
      },
      readiness: {
        averageInferenceMs: 280,
        loadMs: 3100,
        status: 'ready',
      },
    });
    expect(evidence.realWorldValidation.status).toBe('needs-real-video');
  });

  it('promotes real-world model validation from a ready cue-validation dataset doctor report', () => {
    const realWorldValidation = realWorldValidationFromCueDatasetReport({
      cueValidationDatasetReport: readyCueValidationDatasetReport,
      existingRealWorldValidation: undefined,
    });

    expect(realWorldValidation).toEqual({
      estimatedReviewRows: 126,
      nextAction: 'Keep cue-validation dataset, model readiness, and physical-device evidence fresh before production movement-quality claims.',
      requiredClips: 21,
      requiredWallAngles: ['slab', 'vertical', 'overhang'],
      status: 'ready',
    });

    const evidence = buildModelEvidenceFromReports({
      cueValidationDatasetReport: readyCueValidationDatasetReport,
      existingModelEvidence: undefined,
      modelAnalysisReplayReport,
      moveNetReadinessReport,
    });

    expect(evidence.realWorldValidation.status).toBe('ready');
    expect(evidence.realWorldValidation.estimatedReviewRows).toBe(126);
  });

  it('does not promote real-world validation from cue reports that include raw or reviewer artifacts', () => {
    const existingRealWorldValidation = {
      estimatedReviewRows: 40,
      nextAction: 'Collect real review evidence.',
      requiredClips: 20,
      requiredWallAngles: ['slab', 'vertical', 'overhang'],
      status: 'needs-real-video',
    };
    const unsafeReport = {
      ...readyCueValidationDatasetReport,
      privacy: {
        ...readyCueValidationDatasetReport.privacy,
        reviewerIdentitiesIncluded: true,
      },
    };

    expect(
      realWorldValidationFromCueDatasetReport({
        cueValidationDatasetReport: unsafeReport,
        existingRealWorldValidation,
      }),
    ).toEqual(existingRealWorldValidation);
  });

  it('updates app.json extra.modelEvidence while preserving release configuration', () => {
    const root = makeTempDir();
    const appConfigPath = path.join(root, 'app.json');
    const cueReportPath = path.join(root, 'cue-validation-dataset-report.json');
    const readinessPath = path.join(root, 'movenet.json');
    const replayPath = path.join(root, 'replay.json');
    const realWorldValidation = {
      estimatedReviewRows: 88,
      nextAction: 'Collect gym clips.',
      requiredClips: 44,
      requiredWallAngles: ['slab'],
      status: 'needs-real-video',
    };

    writeJson(appConfigPath, {
      expo: {
        extra: {
          activePlan: 'free',
          modelEvidence: {
            realWorldValidation,
          },
        },
        name: 'MoveBeta',
      },
    });
    writeJson(readinessPath, moveNetReadinessReport);
    writeJson(replayPath, modelAnalysisReplayReport);
    writeJson(cueReportPath, readyCueValidationDatasetReport);

    const result = syncModelEvidence({
      appConfigPath,
      cueValidationDatasetReportPath: cueReportPath,
      modelAnalysisReplayPath: replayPath,
      moveNetReadinessPath: readinessPath,
    });
    const appConfig = JSON.parse(fs.readFileSync(appConfigPath, 'utf8'));

    expect(result.schemaVersion).toBe(MODEL_EVIDENCE_SYNC_SCHEMA_VERSION);
    expect(result.changed).toBe(true);
    expect(appConfig.expo.extra.activePlan).toBe('free');
    expect(appConfig.expo.extra.modelEvidence.realWorldValidation).toMatchObject({
      estimatedReviewRows: 126,
      requiredClips: 21,
      status: 'ready',
    });
    expect(appConfig.expo.extra.modelEvidence.readiness.generatedAt).toBe('2026-06-20T10:00:00.000Z');
    expect(appConfig.expo.extra.modelEvidence.analysisReplay.generatedAt).toBe('2026-06-20T10:01:00.000Z');
  });

  it('supports dry-run mode without writing app.json', () => {
    const root = makeTempDir();
    const appConfigPath = path.join(root, 'app.json');
    const readinessPath = path.join(root, 'movenet.json');
    const replayPath = path.join(root, 'replay.json');
    const originalConfig = {
      expo: {
        extra: {},
        name: 'MoveBeta',
      },
    };

    writeJson(appConfigPath, originalConfig);
    writeJson(readinessPath, moveNetReadinessReport);
    writeJson(replayPath, modelAnalysisReplayReport);

    const result = syncModelEvidence({
      appConfigPath,
      modelAnalysisReplayPath: replayPath,
      moveNetReadinessPath: readinessPath,
      write: false,
    });

    expect(result.changed).toBe(true);
    expect(JSON.parse(fs.readFileSync(appConfigPath, 'utf8'))).toEqual(originalConfig);
  });
});
