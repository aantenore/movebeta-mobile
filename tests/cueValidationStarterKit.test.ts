import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

import {
  buildCueValidationStarterKit,
  cueValidationStarterKitSchemaVersion,
  CueValidationStarterKitReportSchema,
  resolveCueValidationStarterKitPaths,
  writeCueValidationStarterKit,
} from '../scripts/cue_validation_starter_kit';
import { buildCueValidationStudySeed } from '../src/movement/cueValidationStudy';

function tempRoot() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'movebeta-cue-starter-'));
}

function readJson(filePath: string) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

describe('cue validation starter kit', () => {
  it('writes a share-safe empty starter kit without creating the final validation dataset', () => {
    const rootDir = tempRoot();

    try {
      const { kit, paths } = writeCueValidationStarterKit({
        generatedAt: '2026-06-23T09:00:00.000Z',
        reviewerCount: 2,
        rootDir,
      });

      expect(CueValidationStarterKitReportSchema.parse(kit.report)).toEqual(kit.report);
      expect(kit.report).toMatchObject({
        generatedAt: '2026-06-23T09:00:00.000Z',
        privacy: {
          rawVideoIncluded: false,
          reviewerIdentitiesIncluded: false,
          reviewerScoresInvented: false,
        },
        schemaVersion: cueValidationStarterKitSchemaVersion,
        sourceSeedProvided: false,
        status: 'needs-seed',
        summary: {
          clipCount: 0,
          cueCount: 0,
          reviewerCount: 2,
          worksheetRows: 0,
        },
      });
      expect(fs.existsSync(paths.seedPath)).toBe(true);
      expect(fs.existsSync(paths.clipIntakeManifestPath)).toBe(true);
      expect(fs.existsSync(paths.onboardingPath)).toBe(true);
      expect(fs.existsSync(paths.worksheetJsonPath)).toBe(true);
      expect(fs.existsSync(paths.worksheetCsvPath)).toBe(true);
      expect(fs.existsSync(paths.reportJsonPath)).toBe(true);
      expect(fs.existsSync(paths.reportMarkdownPath)).toBe(true);
      expect(fs.existsSync(path.join(rootDir, 'docs/validation/cue-validation-dataset.json'))).toBe(false);

      const csv = fs.readFileSync(paths.worksheetCsvPath, 'utf8');
      expect(csv).toBe(
        'worksheetRowId,clipId,packetReportId,consentRecordId,cueId,cueTitle,reviewerSlot,reviewerId,reviewerRole,reviewMode,relevance,timingAccuracy,drillFit,safetyLanguage,status\n',
      );
      expect(JSON.stringify(readJson(paths.reportJsonPath))).not.toMatch(/file:\/\/|\/private\/|\/Users\/|rawVideoUri|ghp_/i);
    } finally {
      fs.rmSync(rootDir, { force: true, recursive: true });
    }
  });

  it('uses an exported seed when provided and keeps generated artifacts relative in the report', () => {
    const rootDir = tempRoot();

    try {
      const inputSeedPath = path.join(rootDir, 'input-seed.json');
      const seed = buildCueValidationStudySeed([], [], {
        generatedAt: '2026-06-23T09:05:00.000Z',
      });
      fs.writeFileSync(inputSeedPath, `${JSON.stringify(seed, null, 2)}\n`);

      const { kit, paths } = writeCueValidationStarterKit({
        generatedAt: '2026-06-23T09:06:00.000Z',
        rootDir,
        seedPath: inputSeedPath,
      });

      expect(kit.report.sourceSeedProvided).toBe(true);
      expect(kit.report.artifacts.every((artifact) => !path.isAbsolute(artifact.path))).toBe(true);
      expect(readJson(paths.seedPath)).toMatchObject({
        generatedAt: '2026-06-23T09:05:00.000Z',
        schemaVersion: 'movebeta.cue-validation-study-seed.v1',
      });
    } finally {
      fs.rmSync(rootDir, { force: true, recursive: true });
    }
  });

  it('rejects unsafe source seed values before writing starter artifacts', () => {
    const seed = buildCueValidationStudySeed([], [], {
      generatedAt: '2026-06-23T09:10:00.000Z',
    });

    expect(() =>
      buildCueValidationStarterKit({
        generatedAt: '2026-06-23T09:11:00.000Z',
        seed: {
          ...seed,
          reviewerInstructions: [...seed.reviewerInstructions, 'Open file:///private/raw-beta.mov with ghp_1234567890abcdefTOKENVALUE.'],
        },
      }),
    ).toThrow(/starter kit contains credential values/i);
  });
});
