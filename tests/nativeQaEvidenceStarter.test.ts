import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

import {
  NativeQaEvidenceStarterReportSchema,
  buildNativeQaEvidenceComposerInputTemplate,
  nativeQaEvidenceStarterReportSchemaVersion,
  resolveNativeQaEvidenceStarterPaths,
  writeNativeQaEvidenceStarterKit,
} from '../scripts/native_qa_evidence_starter';
import { validateNativeQaEvidenceForApp } from '../src/core/nativeQaEvidenceValidation';

function tempRoot() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'movebeta-native-qa-starter-'));
}

function writeJson(filePath: string, value: unknown) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`);
}

function readJson(filePath: string) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function readyInput() {
  return {
    appVersion: '1.0.0',
    generatedAt: '2026-06-23T10:00:00.000Z',
    runs: [
      {
        allWorkflowsPassed: true,
        analysisSeconds: '7',
        batteryDropPct: '2',
        buildId: '1.0.0-internal-42',
        clipDurationSeconds: '10',
        clipId: 'qa-clip-android-001',
        deviceName: 'Pixel 9',
        osVersion: 'Android 16',
        platform: 'android',
        recordedAt: '2026-06-23T10:05:00.000Z',
        thermalState: 'nominal',
      },
      {
        allWorkflowsPassed: true,
        analysisSeconds: '7',
        batteryDropPct: '2',
        buildId: '1.0.0-internal-42',
        clipDurationSeconds: '10',
        clipId: 'qa-clip-ios-001',
        deviceName: 'iPhone 16',
        osVersion: 'iOS 20',
        platform: 'ios',
        recordedAt: '2026-06-23T10:10:00.000Z',
        thermalState: 'fair',
      },
    ],
    schemaVersion: 'movebeta.native-qa-evidence-composer-input.v1',
  };
}

describe('native QA evidence starter', () => {
  it('writes a share-safe input template and report without creating final evidence', () => {
    const rootDir = tempRoot();

    try {
      const { kit, paths } = writeNativeQaEvidenceStarterKit({
        generatedAt: '2026-06-23T10:00:00.000Z',
        rootDir,
      });

      expect(NativeQaEvidenceStarterReportSchema.parse(kit.report)).toEqual(kit.report);
      expect(kit.report).toMatchObject({
        generatedAt: '2026-06-23T10:00:00.000Z',
        schemaVersion: nativeQaEvidenceStarterReportSchemaVersion,
        sourceInputProvided: false,
        status: 'needs-device-evidence',
        summary: {
          candidateEvidenceReady: false,
          evidenceWritten: false,
          readyRuns: 0,
          totalRuns: 2,
        },
      });
      expect(fs.existsSync(paths.inputTemplatePath)).toBe(true);
      expect(fs.existsSync(paths.reportJsonPath)).toBe(true);
      expect(fs.existsSync(paths.reportMarkdownPath)).toBe(true);
      expect(fs.existsSync(paths.candidateEvidencePath)).toBe(false);
      expect(fs.existsSync(paths.composerExportPath)).toBe(false);
      expect(fs.existsSync(paths.evidencePath)).toBe(false);
      expect(JSON.stringify(readJson(paths.reportJsonPath))).not.toMatch(/file:\/\/|\/private\/|\/Users\/|ghp_/i);
    } finally {
      fs.rmSync(rootDir, { force: true, recursive: true });
    }
  });

  it('writes blocked candidate evidence from incomplete real-run input without finalizing proof', () => {
    const rootDir = tempRoot();

    try {
      const inputPath = path.join(rootDir, 'qa-input.json');
      const template = buildNativeQaEvidenceComposerInputTemplate();
      writeJson(inputPath, template);

      const { kit, paths } = writeNativeQaEvidenceStarterKit({
        generatedAt: '2026-06-23T10:20:00.000Z',
        inputPath,
        rootDir,
      });

      expect(kit.report.status).toBe('blocked');
      expect(kit.report.summary.evidenceWritten).toBe(false);
      expect(fs.existsSync(paths.candidateEvidencePath)).toBe(true);
      expect(fs.existsSync(paths.composerExportPath)).toBe(true);
      expect(fs.existsSync(paths.evidencePath)).toBe(false);
      expect(validateNativeQaEvidenceForApp(readJson(paths.candidateEvidencePath)).ready).toBe(false);
    } finally {
      fs.rmSync(rootDir, { force: true, recursive: true });
    }
  });

  it('writes final native QA evidence only when ready input passes validation and writeEvidence is set', () => {
    const rootDir = tempRoot();

    try {
      const inputPath = path.join(rootDir, 'qa-input.json');
      writeJson(inputPath, readyInput());

      const { kit, paths } = writeNativeQaEvidenceStarterKit({
        generatedAt: '2026-06-23T10:30:00.000Z',
        inputPath,
        rootDir,
        writeEvidence: true,
      });

      expect(kit.report.status).toBe('ready');
      expect(kit.report.summary).toMatchObject({
        candidateEvidenceReady: true,
        evidenceWritten: true,
        readyRuns: 2,
        totalRuns: 2,
      });
      expect(fs.existsSync(paths.evidencePath)).toBe(true);
      expect(validateNativeQaEvidenceForApp(readJson(paths.evidencePath)).ready).toBe(true);
    } finally {
      fs.rmSync(rootDir, { force: true, recursive: true });
    }
  });

  it('rejects unsafe input before writing candidate artifacts', () => {
    const rootDir = tempRoot();

    try {
      const inputPath = path.join(rootDir, 'qa-input.json');
      writeJson(inputPath, {
        ...readyInput(),
        runs: [
          {
            ...readyInput().runs[0],
            clipId: 'file:///private/raw-climb.mp4',
            notes: 'token ghp_1234567890abcdefTOKENVALUE',
          },
        ],
      });

      expect(() =>
        writeNativeQaEvidenceStarterKit({
          generatedAt: '2026-06-23T10:40:00.000Z',
          inputPath,
          rootDir,
        }),
      ).toThrow(/starter contains credential values/i);

      const paths = resolveNativeQaEvidenceStarterPaths(rootDir);
      expect(fs.existsSync(paths.candidateEvidencePath)).toBe(false);
      expect(fs.existsSync(paths.evidencePath)).toBe(false);
    } finally {
      fs.rmSync(rootDir, { force: true, recursive: true });
    }
  });
});
