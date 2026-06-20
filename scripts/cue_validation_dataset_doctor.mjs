import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { validateCueValidationDataset } from './cue_validation_dataset_checks.mjs';

export const CUE_VALIDATION_DATASET_REPORT_SCHEMA_VERSION = 'movebeta.cue-validation-dataset-report.v1';

function resolveProjectRoot() {
  return path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
}

export function resolveDefaultDatasetPath(rootDir = resolveProjectRoot()) {
  return path.join(rootDir, 'docs/validation/cue-validation-dataset.json');
}

export function resolveDefaultJsonPath(rootDir = resolveProjectRoot()) {
  return path.join(rootDir, 'docs/sdlc/cue-validation-dataset-report.json');
}

export function resolveDefaultMarkdownPath(rootDir = resolveProjectRoot()) {
  return path.join(rootDir, 'docs/sdlc/cue-validation-dataset-report.md');
}

function failedChecks(validation) {
  return validation.checks
    .filter((check) => check.status !== 'pass')
    .map((check) => ({
      detail: check.detail,
      id: check.id,
      label: check.label,
      status: check.status,
    }));
}

function relativeDatasetPath(datasetPath) {
  return path.relative(path.resolve(path.dirname(datasetPath), '../..'), datasetPath);
}

function buildMissingReport({ datasetPath, generatedAt }) {
  return {
    datasetPath: relativeDatasetPath(datasetPath),
    failedChecks: [
      {
        detail: 'Create docs/validation/cue-validation-dataset.json from real consented coach review rows.',
        id: 'dataset-file',
        label: 'Dataset file',
        status: 'fail',
      },
    ],
    generatedAt,
    nextAction: 'Prepare a cue-validation study seed, collect real coach worksheet scores, compose the dataset JSON, then rerun this doctor.',
    privacy: {
      datasetIncluded: false,
      rawArtifactsIncluded: false,
      reviewerIdentitiesIncluded: false,
    },
    schemaVersion: CUE_VALIDATION_DATASET_REPORT_SCHEMA_VERSION,
    status: 'blocked',
    summary: {
      averageScore: 0,
      clipCount: 0,
      cueCount: 0,
      fileExists: false,
      failedChecks: 1,
      maxReviewerScoreSpreadPerCriterion: 0,
      ready: false,
      reviewCount: 0,
      totalChecks: 1,
      wallAngles: [],
    },
  };
}

function buildParseErrorReport({ datasetPath, error, generatedAt }) {
  return {
    datasetPath: relativeDatasetPath(datasetPath),
    failedChecks: [
      {
        detail: error instanceof Error ? error.message : 'Dataset JSON could not be parsed.',
        id: 'dataset-json',
        label: 'Dataset JSON',
        status: 'fail',
      },
    ],
    generatedAt,
    nextAction: 'Fix docs/validation/cue-validation-dataset.json syntax, then rerun this doctor.',
    privacy: {
      datasetIncluded: false,
      rawArtifactsIncluded: false,
      reviewerIdentitiesIncluded: false,
    },
    schemaVersion: CUE_VALIDATION_DATASET_REPORT_SCHEMA_VERSION,
    status: 'blocked',
    summary: {
      averageScore: 0,
      clipCount: 0,
      cueCount: 0,
      fileExists: true,
      failedChecks: 1,
      maxReviewerScoreSpreadPerCriterion: 0,
      ready: false,
      reviewCount: 0,
      totalChecks: 1,
      wallAngles: [],
    },
  };
}

/**
 * @param {{ dataset?: any, datasetPath?: string, generatedAt?: string }} [options]
 */
export function buildCueValidationDatasetReport({
  dataset,
  datasetPath = resolveDefaultDatasetPath(),
  generatedAt = new Date().toISOString(),
} = {}) {
  if (dataset === undefined) {
    return buildMissingReport({ datasetPath, generatedAt });
  }

  const validation = validateCueValidationDataset(dataset);
  const failed = failedChecks(validation);
  const ready = validation.ready === true;

  return {
    datasetPath: relativeDatasetPath(datasetPath),
    failedChecks: failed,
    generatedAt,
    nextAction: ready
      ? 'Cue-validation dataset is ready for production movement-quality claim review.'
      : failed[0]?.detail ?? 'Review cue-validation dataset checks before production claims.',
    privacy: {
      datasetIncluded: false,
      rawArtifactsIncluded: false,
      reviewerIdentitiesIncluded: false,
    },
    schemaVersion: CUE_VALIDATION_DATASET_REPORT_SCHEMA_VERSION,
    status: ready ? 'ready' : 'blocked',
    summary: {
      ...validation.summary,
      fileExists: true,
      failedChecks: failed.length,
      ready,
      totalChecks: validation.checks.length,
    },
  };
}

export function renderCueValidationDatasetMarkdown(report) {
  const rows = report.failedChecks.length
    ? report.failedChecks
        .map((check) => `| ${check.label} | ${check.status} | ${String(check.detail).replace(/\n/g, ' ')} |`)
        .join('\n')
    : '| None | pass | All cue-validation checks passed. |';

  return `# Cue Validation Dataset Report

Generated: ${report.generatedAt}

- Status: ${report.status}
- Dataset included: no
- Reviewer identities included: no
- Next action: ${report.nextAction}
- Clips: ${report.summary.clipCount}
- Reviews: ${report.summary.reviewCount}
- Max reviewer spread: ${report.summary.maxReviewerScoreSpreadPerCriterion ?? 0}/4
- Wall angles: ${report.summary.wallAngles.join(', ') || 'none'}

| Check | Status | Detail |
| --- | --- | --- |
${rows}
`;
}

/**
 * @param {{ datasetPath?: string, generatedAt?: string, jsonPath?: string, markdownPath?: string }} [options]
 */
export function writeCueValidationDatasetReport({
  datasetPath = resolveDefaultDatasetPath(),
  jsonPath = resolveDefaultJsonPath(),
  markdownPath = resolveDefaultMarkdownPath(),
  generatedAt,
} = {}) {
  let report;

  if (!fs.existsSync(datasetPath)) {
    report = buildMissingReport({ datasetPath, generatedAt: generatedAt ?? new Date().toISOString() });
  } else {
    try {
      report = buildCueValidationDatasetReport({
        dataset: JSON.parse(fs.readFileSync(datasetPath, 'utf8')),
        datasetPath,
        generatedAt: generatedAt ?? new Date().toISOString(),
      });
    } catch (error) {
      report = buildParseErrorReport({ datasetPath, error, generatedAt: generatedAt ?? new Date().toISOString() });
    }
  }

  fs.mkdirSync(path.dirname(jsonPath), { recursive: true });
  fs.writeFileSync(jsonPath, `${JSON.stringify(report, null, 2)}\n`);
  fs.writeFileSync(markdownPath, renderCueValidationDatasetMarkdown(report));
  return { jsonPath, markdownPath, report };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const { jsonPath, markdownPath, report } = writeCueValidationDatasetReport();
  console.log(`Wrote cue validation dataset report to ${jsonPath}`);
  console.log(`Wrote cue validation dataset summary to ${markdownPath}`);
  console.log(`Status: ${report.status}; next action: ${report.nextAction}`);
}
