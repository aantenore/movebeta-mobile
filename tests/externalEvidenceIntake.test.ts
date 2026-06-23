import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

import {
  assertExternalEvidenceIntakeIsShareSafe,
  buildExternalEvidenceIntakeReport,
  ExternalEvidenceIntakeReportSchema,
  externalEvidenceIntakeSchemaVersion,
} from '../src/core/externalEvidenceIntake';
import { defaultLaunchReadinessEvidence, type LaunchReadinessEvidence } from '../src/core/launchReadiness';
import {
  renderExternalEvidenceIntakeMarkdown,
  resolveExternalEvidenceIntakePaths,
  writeExternalEvidenceIntake,
} from '../scripts/external_evidence_intake';

function tempRoot() {
  const rootDir = fs.mkdtempSync(path.join(os.tmpdir(), 'movebeta-external-evidence-intake-'));
  fs.writeFileSync(
    path.join(rootDir, 'app.json'),
    `${JSON.stringify(
      {
        expo: {
          extra: {
            launchReadinessEvidence: {
              ...defaultLaunchReadinessEvidence,
              cueValidationDataset: false,
              easCredentials: false,
              easProject: false,
              iosBuild: false,
              nativeDeviceQa: false,
            },
          },
        },
      },
      null,
      2,
    )}\n`,
  );
  return rootDir;
}

function allReadyEvidence(): LaunchReadinessEvidence {
  return Object.fromEntries(Object.keys(defaultLaunchReadinessEvidence).map((key) => [key, true])) as LaunchReadinessEvidence;
}

describe('external evidence intake', () => {
  it('builds a share-safe intake report from external blocker proof requirements', () => {
    const report = buildExternalEvidenceIntakeReport({
      generatedAt: '2026-06-23T12:00:00.000Z',
    });

    expect(ExternalEvidenceIntakeReportSchema.parse(report)).toEqual(report);
    expect(report.schemaVersion).toBe(externalEvidenceIntakeSchemaVersion);
    expect(report.summary).toMatchObject({
      commandCount: 15,
      intakeItemCount: 5,
      ownerCount: 4,
      proofReferenceCount: 8,
      status: 'needs-evidence',
    });
    expect(report.intakeTemplate.items.find((item) => item.key === 'iosBuild')?.commands).toContain('npm run native:ios:pods');
    expect(report.intakeTemplate.items.find((item) => item.key === 'cueValidationDataset')?.commands).toContain(
      'npm run validation:cue:starter',
    );
    expect(JSON.stringify(report)).not.toMatch(/\/Users\/|file:\/\/|ghp_|BEGIN PRIVATE KEY|rawVideoUri/i);
    expect(report.intakeTemplate.items.flatMap((item) => item.proof).every((proof) => proof.evidenceReference === '')).toBe(true);
  });

  it('marks intake ready when all external blockers are already cleared', () => {
    const report = buildExternalEvidenceIntakeReport({
      evidence: allReadyEvidence(),
      generatedAt: '2026-06-23T12:05:00.000Z',
    });

    expect(report.summary).toMatchObject({
      commandCount: 0,
      intakeItemCount: 0,
      proofReferenceCount: 0,
      status: 'ready',
    });
    expect(report.intakeTemplate.items).toEqual([]);
  });

  it('writes durable report, template, and Markdown files', () => {
    const rootDir = tempRoot();

    try {
      const { paths, report } = writeExternalEvidenceIntake({
        appConfigPath: path.join(rootDir, 'app.json'),
        generatedAt: '2026-06-23T12:10:00.000Z',
        rootDir,
      });

      expect(fs.existsSync(paths.reportOutputPath)).toBe(true);
      expect(fs.existsSync(paths.markdownOutputPath)).toBe(true);
      expect(fs.existsSync(paths.templateOutputPath)).toBe(true);
      expect(JSON.parse(fs.readFileSync(paths.reportOutputPath, 'utf8'))).toEqual(report);
      expect(JSON.parse(fs.readFileSync(paths.templateOutputPath, 'utf8'))).toEqual(report.intakeTemplate);
      expect(renderExternalEvidenceIntakeMarkdown(report)).toContain('External Evidence Intake Report');
      expect(fs.readFileSync(paths.markdownOutputPath, 'utf8')).toContain('Proof references: 8');
    } finally {
      fs.rmSync(rootDir, { force: true, recursive: true });
    }
  });

  it('resolves stable output paths', () => {
    const paths = resolveExternalEvidenceIntakePaths('/tmp/project');

    expect(paths.reportOutputPath).toBe('/tmp/project/docs/sdlc/external-evidence-intake-report.json');
    expect(paths.templateOutputPath).toBe('/tmp/project/docs/sdlc/external-evidence-intake.template.json');
  });

  it('rejects local paths and token-like values before sharing', () => {
    const report = buildExternalEvidenceIntakeReport();

    expect(() =>
      assertExternalEvidenceIntakeIsShareSafe({
        ...report,
        intakeTemplate: {
          ...report.intakeTemplate,
          instructions: ['Attach /Users/antonio/private/raw-beta.mov and ghp_1234567890abcdefTOKENVALUE'],
        },
      }),
    ).toThrow(/External evidence intake contains credential values/i);
  });
});
