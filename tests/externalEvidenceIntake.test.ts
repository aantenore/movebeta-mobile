import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

import {
  assertExternalEvidenceIntakeIsShareSafe,
  buildExternalEvidenceIntakeReport,
  buildExternalEvidencePromotionReport,
  buildExternalEvidenceApplyReport,
  buildExternalEvidenceValidationReport,
  buildMissingExternalEvidenceValidationReport,
  ExternalEvidenceFilledIntakeSchema,
  ExternalEvidenceApplyReportSchema,
  ExternalEvidencePromotionReportSchema,
  ExternalEvidenceValidationReportSchema,
  ExternalEvidenceIntakeReportSchema,
  externalEvidenceApplyReportSchemaVersion,
  externalEvidenceIntakeSchemaVersion,
  externalEvidencePromotionReportSchemaVersion,
  externalEvidenceValidationReportSchemaVersion,
} from '../src/core/externalEvidenceIntake';
import { defaultLaunchReadinessEvidence, type LaunchReadinessEvidence } from '../src/core/launchReadiness';
import {
  renderExternalEvidenceIntakeMarkdown,
  resolveExternalEvidenceIntakePaths,
  writeExternalEvidenceIntake,
} from '../scripts/external_evidence_intake';
import {
  renderExternalEvidenceValidationMarkdown,
  resolveExternalEvidenceValidationPaths,
  writeExternalEvidenceValidationReport,
} from '../scripts/external_evidence_validate';
import {
  renderExternalEvidencePromotionMarkdown,
  resolveExternalEvidencePromotionPaths,
  writeExternalEvidencePromotionReport,
} from '../scripts/external_evidence_promote';
import {
  renderExternalEvidenceApplyMarkdown,
  resolveExternalEvidenceApplyPaths,
  writeExternalEvidenceApplyReport,
} from '../scripts/external_evidence_apply';

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

function filledDefaultIntake() {
  const intake = buildExternalEvidenceIntakeReport({
    generatedAt: '2026-06-23T12:20:00.000Z',
  }).intakeTemplate;

  return ExternalEvidenceFilledIntakeSchema.parse({
    ...intake,
    schemaVersion: 'movebeta.external-evidence-filled-intake.v1',
    items: intake.items.map((item) => ({
      ...item,
      proof: item.proof.map((proof, index) => ({
        ...proof,
        evidenceReference:
          proof.acceptedReferenceTypes.includes('relative-path') && index === 0
            ? proof.expectedProof.split(' ')[0]
            : `https://github.com/aantenore/movebeta-mobile/issues/${100 + index}`,
        evidenceReferenceType: proof.acceptedReferenceTypes.includes('relative-path') && index === 0 ? 'relative-path' : 'issue-url',
        notes: 'Reference reviewed without raw artifacts.',
        status: 'provided',
      })),
    })),
  });
}

describe('external evidence intake', () => {
  it('builds a share-safe intake report from external blocker proof requirements', () => {
    const report = buildExternalEvidenceIntakeReport({
      generatedAt: '2026-06-23T12:00:00.000Z',
    });

    expect(ExternalEvidenceIntakeReportSchema.parse(report)).toEqual(report);
    expect(report.schemaVersion).toBe(externalEvidenceIntakeSchemaVersion);
    expect(report.summary).toMatchObject({
      commandCount: 17,
      intakeItemCount: 5,
      ownerCount: 4,
      proofReferenceCount: 8,
      status: 'needs-evidence',
    });
    expect(report.intakeTemplate.items.find((item) => item.key === 'iosBuild')?.commands).toContain('npm run native:ios:pods');
    expect(report.intakeTemplate.items.find((item) => item.key === 'iosBuild')?.proof[0]?.acceptedReferenceTypes).toContain('issue-url');
    expect(report.intakeTemplate.items.find((item) => item.key === 'cueValidationDataset')?.commands).toContain(
      'npm run validation:cue:starter',
    );
    expect(report.intakeTemplate.items.find((item) => item.key === 'cueValidationDataset')?.commands).toContain(
      'npm run validation:cue:composition -- --write-dataset',
    );
    expect(JSON.stringify(report)).not.toMatch(/\/Users\/|file:\/\/|ghp_|BEGIN PRIVATE KEY|rawVideoUri/i);
    expect(report.intakeTemplate.items.flatMap((item) => item.proof).every((proof) => proof.evidenceReference === '')).toBe(true);
    expect(report.intakeTemplate.items.flatMap((item) => item.proof).every((proof) => proof.evidenceReferenceType === '')).toBe(true);
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

  it('validates a filled intake only when every proof has an accepted share-safe reference', () => {
    const filled = filledDefaultIntake();

    const report = buildExternalEvidenceValidationReport({
      generatedAt: '2026-06-23T12:25:00.000Z',
      input: filled,
    });

    expect(ExternalEvidenceValidationReportSchema.parse(report)).toEqual(report);
    expect(report.schemaVersion).toBe(externalEvidenceValidationReportSchemaVersion);
    expect(report.summary).toMatchObject({
      acceptedProofs: 8,
      failedChecks: 0,
      missingProofs: 0,
      providedProofs: 8,
      requiredProofs: 8,
    });
    expect(report.status).toBe('ready');
    expect(renderExternalEvidenceValidationMarkdown(report)).toContain('Accepted proofs: 8');
  });

  it('builds a launch-readiness promotion candidate only after validation is ready', () => {
    const report = buildExternalEvidencePromotionReport({
      generatedAt: '2026-06-23T12:28:00.000Z',
      input: filledDefaultIntake(),
    });

    expect(ExternalEvidencePromotionReportSchema.parse(report)).toEqual(report);
    expect(report.schemaVersion).toBe(externalEvidencePromotionReportSchemaVersion);
    expect(report.status).toBe('ready-to-apply');
    expect(report.summary).toMatchObject({
      blockedCheckCount: 0,
      candidateReady: true,
      promotedCheckCount: 5,
      validationStatus: 'ready',
    });
    expect(report.candidateEvidence).toMatchObject({
      cueValidationDataset: true,
      easCredentials: true,
      easProject: true,
      iosBuild: true,
      nativeDeviceQa: true,
    });
    expect(renderExternalEvidencePromotionMarkdown(report)).toContain('Candidate ready: yes');
  });

  it('builds an apply report that stays dry-run until write is explicitly requested', () => {
    const promotionReport = buildExternalEvidencePromotionReport({
      generatedAt: '2026-06-23T12:28:00.000Z',
      input: filledDefaultIntake(),
    });
    const report = buildExternalEvidenceApplyReport({
      generatedAt: '2026-06-23T12:29:00.000Z',
      promotionReport,
      writeRequested: false,
    });

    expect(ExternalEvidenceApplyReportSchema.parse(report)).toEqual(report);
    expect(report.schemaVersion).toBe(externalEvidenceApplyReportSchemaVersion);
    expect(report.status).toBe('ready-to-apply');
    expect(report.summary).toMatchObject({
      applied: false,
      appliedCheckCount: 0,
      candidateReady: true,
      promotedCheckCount: 5,
      writeRequested: false,
    });
    expect(renderExternalEvidenceApplyMarkdown(report)).toContain('Write requested: no');
  });

  it('reports applied only when a ready promotion is written with explicit approval', () => {
    const promotionReport = buildExternalEvidencePromotionReport({
      generatedAt: '2026-06-23T12:28:00.000Z',
      input: filledDefaultIntake(),
    });
    const report = buildExternalEvidenceApplyReport({
      applied: true,
      generatedAt: '2026-06-23T12:29:30.000Z',
      promotionReport,
      writeRequested: true,
    });

    expect(report.status).toBe('applied');
    expect(report.summary).toMatchObject({
      applied: true,
      appliedCheckCount: 5,
      candidateReady: true,
      writeRequested: true,
    });
  });

  it('reports missing filled intake as needs-evidence without failing the command contract', () => {
    const report = buildMissingExternalEvidenceValidationReport({
      generatedAt: '2026-06-23T12:30:00.000Z',
      inputPath: 'docs/sdlc/external-evidence-intake.filled.json',
    });

    expect(report).toMatchObject({
      status: 'needs-evidence',
      summary: {
        acceptedProofs: 0,
        failedChecks: 1,
        missingProofs: 1,
      },
    });
  });

  it('does not promote launch-readiness evidence while filled intake is missing', () => {
    const report = buildExternalEvidencePromotionReport({
      generatedAt: '2026-06-23T12:31:00.000Z',
      validationReport: buildMissingExternalEvidenceValidationReport({
        generatedAt: '2026-06-23T12:31:00.000Z',
        inputPath: 'docs/sdlc/external-evidence-intake.filled.json',
      }),
    });

    expect(report.status).toBe('needs-evidence');
    expect(report.summary.candidateReady).toBe(false);
    expect(report.summary.promotedCheckCount).toBe(0);
    expect(report.candidateEvidence).toMatchObject({
      cueValidationDataset: false,
      easCredentials: false,
      easProject: false,
      iosBuild: false,
      nativeDeviceQa: false,
    });
  });

  it('does not apply launch-readiness evidence while promotion needs evidence', () => {
    const promotionReport = buildExternalEvidencePromotionReport({
      generatedAt: '2026-06-23T12:31:00.000Z',
      validationReport: buildMissingExternalEvidenceValidationReport({
        generatedAt: '2026-06-23T12:31:00.000Z',
        inputPath: 'docs/sdlc/external-evidence-intake.filled.json',
      }),
    });
    const report = buildExternalEvidenceApplyReport({
      applied: true,
      generatedAt: '2026-06-23T12:31:30.000Z',
      promotionReport,
      writeRequested: true,
    });

    expect(report.status).toBe('needs-evidence');
    expect(report.summary).toMatchObject({
      applied: false,
      appliedCheckCount: 0,
      candidateReady: false,
      writeRequested: true,
    });
  });

  it('marks validation ready when a filled intake has no open external proof rows', () => {
    const intake = buildExternalEvidenceIntakeReport({
      evidence: allReadyEvidence(),
      generatedAt: '2026-06-23T12:32:00.000Z',
    }).intakeTemplate;
    const report = buildExternalEvidenceValidationReport({
      generatedAt: '2026-06-23T12:33:00.000Z',
      input: ExternalEvidenceFilledIntakeSchema.parse({
        ...intake,
        schemaVersion: 'movebeta.external-evidence-filled-intake.v1',
      }),
    });

    expect(report.status).toBe('ready');
    expect(report.summary.requiredProofs).toBe(0);
    expect(report.checks).toEqual([]);
  });

  it('writes durable validation report and Markdown files', () => {
    const rootDir = tempRoot();

    try {
      const paths = resolveExternalEvidenceValidationPaths(rootDir);
      const { report, reportOutputPath, markdownOutputPath } = writeExternalEvidenceValidationReport({
        generatedAt: '2026-06-23T12:35:00.000Z',
        inputPath: paths.inputPath,
        markdownOutputPath: paths.markdownOutputPath,
        reportOutputPath: paths.reportOutputPath,
        rootDir,
      });

      expect(report.status).toBe('needs-evidence');
      expect(reportOutputPath).toBe(paths.reportOutputPath);
      expect(markdownOutputPath).toBe(paths.markdownOutputPath);
      expect(JSON.parse(fs.readFileSync(paths.reportOutputPath, 'utf8'))).toEqual(report);
      expect(fs.readFileSync(paths.markdownOutputPath, 'utf8')).toContain('External Evidence Validation Report');
    } finally {
      fs.rmSync(rootDir, { force: true, recursive: true });
    }
  });

  it('writes durable promotion report and Markdown files', () => {
    const rootDir = tempRoot();

    try {
      const paths = resolveExternalEvidencePromotionPaths(rootDir);
      const { report, reportOutputPath, markdownOutputPath } = writeExternalEvidencePromotionReport({
        generatedAt: '2026-06-23T12:40:00.000Z',
        inputPath: paths.inputPath,
        markdownOutputPath: paths.markdownOutputPath,
        reportOutputPath: paths.reportOutputPath,
        rootDir,
      });

      expect(report.status).toBe('needs-evidence');
      expect(report.summary.candidateReady).toBe(false);
      expect(reportOutputPath).toBe(paths.reportOutputPath);
      expect(markdownOutputPath).toBe(paths.markdownOutputPath);
      expect(JSON.parse(fs.readFileSync(paths.reportOutputPath, 'utf8'))).toEqual(report);
      expect(fs.readFileSync(paths.markdownOutputPath, 'utf8')).toContain('External Evidence Promotion Report');
    } finally {
      fs.rmSync(rootDir, { force: true, recursive: true });
    }
  });

  it('writes durable apply report without mutating app config by default', () => {
    const rootDir = tempRoot();

    try {
      const paths = resolveExternalEvidenceApplyPaths(rootDir);
      const before = fs.readFileSync(paths.appConfigPath, 'utf8');
      const { report, reportOutputPath, markdownOutputPath } = writeExternalEvidenceApplyReport({
        generatedAt: '2026-06-23T12:41:00.000Z',
        markdownOutputPath: paths.markdownOutputPath,
        promotionReportPath: paths.promotionReportPath,
        reportOutputPath: paths.reportOutputPath,
        rootDir,
      });

      expect(report.status).toBe('needs-evidence');
      expect(report.summary.applied).toBe(false);
      expect(fs.readFileSync(paths.appConfigPath, 'utf8')).toBe(before);
      expect(reportOutputPath).toBe(paths.reportOutputPath);
      expect(markdownOutputPath).toBe(paths.markdownOutputPath);
      expect(JSON.parse(fs.readFileSync(paths.reportOutputPath, 'utf8'))).toEqual(report);
      expect(fs.readFileSync(paths.markdownOutputPath, 'utf8')).toContain('External Evidence Apply Report');
    } finally {
      fs.rmSync(rootDir, { force: true, recursive: true });
    }
  });

  it('applies ready launch evidence to app config only when write is requested', () => {
    const rootDir = tempRoot();

    try {
      const paths = resolveExternalEvidenceApplyPaths(rootDir);
      const promotionReport = buildExternalEvidencePromotionReport({
        baselineEvidence: defaultLaunchReadinessEvidence,
        generatedAt: '2026-06-23T12:42:00.000Z',
        input: filledDefaultIntake(),
      });
      fs.mkdirSync(path.dirname(paths.promotionReportPath), { recursive: true });
      fs.writeFileSync(paths.promotionReportPath, `${JSON.stringify(promotionReport, null, 2)}\n`);

      const { report } = writeExternalEvidenceApplyReport({
        generatedAt: '2026-06-23T12:43:00.000Z',
        markdownOutputPath: paths.markdownOutputPath,
        promotionReportPath: paths.promotionReportPath,
        reportOutputPath: paths.reportOutputPath,
        rootDir,
        writeAppConfig: true,
      });
      const evidence = JSON.parse(fs.readFileSync(paths.appConfigPath, 'utf8')).expo.extra.launchReadinessEvidence;

      expect(report.status).toBe('applied');
      expect(evidence).toMatchObject({
        cueValidationDataset: true,
        easCredentials: true,
        easProject: true,
        iosBuild: true,
        nativeDeviceQa: true,
      });
    } finally {
      fs.rmSync(rootDir, { force: true, recursive: true });
    }
  });

  it('resolves stable output paths', () => {
    const paths = resolveExternalEvidenceIntakePaths('/tmp/project');
    const validationPaths = resolveExternalEvidenceValidationPaths('/tmp/project');
    const promotionPaths = resolveExternalEvidencePromotionPaths('/tmp/project');
    const applyPaths = resolveExternalEvidenceApplyPaths('/tmp/project');

    expect(paths.reportOutputPath).toBe('/tmp/project/docs/sdlc/external-evidence-intake-report.json');
    expect(paths.templateOutputPath).toBe('/tmp/project/docs/sdlc/external-evidence-intake.template.json');
    expect(validationPaths.reportOutputPath).toBe('/tmp/project/docs/sdlc/external-evidence-validation-report.json');
    expect(validationPaths.inputPath).toBe('/tmp/project/docs/sdlc/external-evidence-intake.filled.json');
    expect(promotionPaths.reportOutputPath).toBe('/tmp/project/docs/sdlc/external-evidence-promotion-report.json');
    expect(promotionPaths.inputPath).toBe('/tmp/project/docs/sdlc/external-evidence-intake.filled.json');
    expect(applyPaths.reportOutputPath).toBe('/tmp/project/docs/sdlc/external-evidence-apply-report.json');
    expect(applyPaths.promotionReportPath).toBe('/tmp/project/docs/sdlc/external-evidence-promotion-report.json');
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
