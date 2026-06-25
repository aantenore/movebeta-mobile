import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

import {
  cueValidationDatasetCompositionPacketSchemaVersion,
  CueValidationDatasetCompositionPacketSchema,
  resolveCueValidationDatasetCompositionPaths,
  writeCueValidationDatasetCompositionPacket,
} from '../scripts/cue_validation_dataset_composition_packet';
import { validateCueValidationDataset } from '../scripts/cue_validation_dataset_checks.mjs';
import { createCoachReviewConsentRecord } from '../src/movement/coachConsentRepository';
import type { LocalAnalysisReport } from '../src/movement/contracts';
import {
  buildCueValidationReviewWorksheet,
  buildCueValidationReviewWorksheetCsv,
  buildCueValidationStudySeed,
} from '../src/movement/cueValidationStudy';
import { localMovementAnalyzer } from '../src/movement/localAnalyzer';
import { samplePoseFrames, sampleSession } from '../src/movement/sampleSession';

function tempRoot() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'movebeta-cue-composition-'));
}

function writeJson(filePath: string, value: unknown) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`);
}

function writeText(filePath: string, value: string) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, value);
}

function readJson(filePath: string) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

async function buildReport(id: string): Promise<LocalAnalysisReport> {
  const report = await localMovementAnalyzer.analyze({
    frames: samplePoseFrames,
    session: {
      ...sampleSession,
      id,
      title: id,
    },
  });
  return {
    ...report,
    id,
    session: {
      ...report.session,
      id,
      title: id,
    },
  };
}

function completeWorksheetCsv(csv: string, score = 5) {
  const [headerLine, ...rows] = csv.trimEnd().split('\n');
  const headers = headerLine.split(',');
  const indexes = Object.fromEntries(headers.map((header, index) => [header, index]));

  return [
    headerLine,
    ...rows.map((row) => {
      const cells = row.split(',');
      const reviewerSlot = cells[indexes.reviewerSlot];
      cells[indexes.reviewerId] = `coach-${reviewerSlot}`;
      cells[indexes.relevance] = String(score);
      cells[indexes.timingAccuracy] = String(score);
      cells[indexes.drillFit] = String(score);
      cells[indexes.safetyLanguage] = String(score);
      cells[indexes.status] = 'reviewed';
      return cells.join(',');
    }),
  ].join('\n') + '\n';
}

async function writeReadyCompositionInputs(rootDir: string) {
  const report = await buildReport('composition-ready');
  const seed = buildCueValidationStudySeed(
    [report],
    [createCoachReviewConsentRecord(report.id, { grantedAt: '2026-06-24T08:00:00.000Z' })],
    {
      acceptance: {
        minClips: 1,
        minDistinctReviewersPerClip: 2,
        minReviewsPerCue: 2,
        requiredWallAngles: [report.session.wallAngle],
      },
      appVersion: '1.0.0-test',
      generatedAt: '2026-06-24T08:05:00.000Z',
    },
  );
  const worksheet = buildCueValidationReviewWorksheet(seed, { generatedAt: '2026-06-24T08:10:00.000Z' });
  const completedCsv = completeWorksheetCsv(buildCueValidationReviewWorksheetCsv(worksheet));
  const paths = resolveCueValidationDatasetCompositionPaths(rootDir);

  writeJson(paths.seedPath, seed);
  writeText(paths.worksheetCsvPath, completedCsv);

  return { paths, seed };
}

describe('cue validation dataset composition packet', () => {
  it('writes a share-safe needs-seed packet without creating a dataset', () => {
    const rootDir = tempRoot();

    try {
      const { packet, wroteDataset } = writeCueValidationDatasetCompositionPacket({
        generatedAt: '2026-06-24T08:00:00.000Z',
        rootDir,
      });
      const paths = resolveCueValidationDatasetCompositionPaths(rootDir);

      expect(CueValidationDatasetCompositionPacketSchema.parse(packet)).toEqual(packet);
      expect(packet).toMatchObject({
        schemaVersion: cueValidationDatasetCompositionPacketSchemaVersion,
        status: 'needs-seed',
        summary: {
          datasetWriteAttempted: false,
          sourceSeedProvided: false,
          sourceSeedStatus: 'missing',
          worksheetStatus: 'missing',
        },
      });
      expect(wroteDataset).toBe(false);
      expect(fs.existsSync(paths.datasetPath)).toBe(false);
      expect(fs.existsSync(paths.reportJsonPath)).toBe(true);
      expect(JSON.stringify(readJson(paths.reportJsonPath))).not.toMatch(/file:\/\/|\/Users\/|rawVideoUri|coach-\d|ghp_/i);
    } finally {
      fs.rmSync(rootDir, { force: true, recursive: true });
    }
  });

  it('reports ready-to-compose when the completed worksheet preflight is ready', async () => {
    const rootDir = tempRoot();

    try {
      const { paths, seed } = await writeReadyCompositionInputs(rootDir);
      const { packet, wroteDataset } = writeCueValidationDatasetCompositionPacket({
        generatedAt: '2026-06-24T08:20:00.000Z',
        rootDir,
      });

      expect(packet.status).toBe('ready-to-compose');
      expect(packet.summary).toMatchObject({
        completeWorksheetRows: seed.cueCount * 2,
        datasetStatus: 'missing',
        datasetWriteAttempted: false,
        expectedWorksheetRows: seed.cueCount * 2,
        missingReviewerIdCount: 0,
        missingScoreCount: 0,
        sourceSeedStatus: 'ready',
        worksheetStatus: 'ready',
      });
      expect(packet.nextAction).toContain('--write-dataset');
      expect(wroteDataset).toBe(false);
      expect(fs.existsSync(paths.datasetPath)).toBe(false);
    } finally {
      fs.rmSync(rootDir, { force: true, recursive: true });
    }
  });

  it('writes the dataset only when requested and the worksheet is ready', async () => {
    const rootDir = tempRoot();

    try {
      const { paths } = await writeReadyCompositionInputs(rootDir);
      const { packet, wroteDataset } = writeCueValidationDatasetCompositionPacket({
        generatedAt: '2026-06-24T08:30:00.000Z',
        rootDir,
        writeDataset: true,
      });
      const dataset = readJson(paths.datasetPath);

      expect(wroteDataset).toBe(true);
      expect(packet.status).toBe('ready-to-validate');
      expect(packet.summary.datasetStatus).toBe('written-needs-validation');
      expect(dataset).toMatchObject({
        generatedAt: '2026-06-24T08:30:00.000Z',
        schemaVersion: 'movebeta.cue-validation-dataset.v1',
      });
      expect(validateCueValidationDataset(dataset).ready).toBe(true);
      expect(JSON.stringify(packet)).not.toMatch(/coach-1|coach-2|\"relevance\":5|file:\/\/|\/Users\//i);
    } finally {
      fs.rmSync(rootDir, { force: true, recursive: true });
    }
  });

  it('blocks unsafe seeds without echoing raw local paths or tokens', () => {
    const rootDir = tempRoot();

    try {
      const seed = buildCueValidationStudySeed([], [], {
        generatedAt: '2026-06-24T08:35:00.000Z',
      });
      const paths = resolveCueValidationDatasetCompositionPaths(rootDir);
      writeJson(paths.seedPath, {
        ...seed,
        reviewerInstructions: [
          ...seed.reviewerInstructions,
          'Open file:///Users/antonio/private/raw.mov with ghp_1234567890abcdefTOKENVALUE.',
        ],
      });

      const { packet } = writeCueValidationDatasetCompositionPacket({
        generatedAt: '2026-06-24T08:40:00.000Z',
        rootDir,
      });

      expect(packet.status).toBe('blocked');
      expect(packet.summary.sourceSeedStatus).toBe('invalid');
      expect(JSON.stringify(packet)).not.toMatch(/file:\/\/|\/Users\/|ghp_|raw\.mov/i);
    } finally {
      fs.rmSync(rootDir, { force: true, recursive: true });
    }
  });
});
