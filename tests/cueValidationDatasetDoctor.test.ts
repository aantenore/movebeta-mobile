import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';

import {
  buildCueValidationDatasetReport,
  CUE_VALIDATION_DATASET_REPORT_SCHEMA_VERSION,
  writeCueValidationDatasetReport,
} from '../scripts/cue_validation_dataset_doctor.mjs';

const tmpRoots: string[] = [];

function makeRoot() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'movebeta-cue-doctor-'));
  tmpRoots.push(root);
  return root;
}

function cueClip(wallAngle: 'slab' | 'vertical' | 'overhang', index: number) {
  const cueId = `cue-${index}`;
  return {
    clipId: `clip-${index}`,
    consentRecordId: `consent-${index}`,
    packet: {
      analysis: {
        cues: [{ id: cueId, title: `Cue ${index}` }],
      },
      consent: {
        rawVideoIncluded: false,
        videoLeavesDevice: false,
      },
      reportId: `analysis-${index}`,
      session: { wallAngle },
    },
    reviews: [
      {
        cueId,
        drillFit: 5,
        relevance: 5,
        reviewMode: 'packet-only',
        reviewerId: `coach-${index}-a`,
        reviewerRole: 'coach',
        safetyLanguage: 5,
        timingAccuracy: 5,
      },
      {
        cueId,
        drillFit: 4,
        relevance: 4,
        reviewMode: 'packet-only',
        reviewerId: `coach-${index}-b`,
        reviewerRole: 'coach',
        safetyLanguage: 5,
        timingAccuracy: 4,
      },
    ],
  };
}

function readyDataset() {
  return {
    acceptance: {
      minClips: 3,
      minDistinctReviewersPerClip: 2,
      minReviewsPerCue: 2,
    },
    appVersion: '1.0.0',
    clips: [cueClip('slab', 1), cueClip('vertical', 2), cueClip('overhang', 3)],
    generatedAt: '2026-06-20T00:00:00.000Z',
    schemaVersion: 'movebeta.cue-validation-dataset.v1',
  };
}

afterEach(() => {
  for (const root of tmpRoots.splice(0)) {
    fs.rmSync(root, { force: true, recursive: true });
  }
});

describe('cue validation dataset doctor', () => {
  it('reports a blocked state when the dataset file is missing', () => {
    const root = makeRoot();
    const { report } = writeCueValidationDatasetReport({
      datasetPath: path.join(root, 'docs/validation/cue-validation-dataset.json'),
      generatedAt: '2026-06-20T00:00:00.000Z',
      jsonPath: path.join(root, 'docs/sdlc/cue-validation-dataset-report.json'),
      markdownPath: path.join(root, 'docs/sdlc/cue-validation-dataset-report.md'),
    });

    expect(report).toMatchObject({
      schemaVersion: CUE_VALIDATION_DATASET_REPORT_SCHEMA_VERSION,
      status: 'blocked',
      summary: {
        fileExists: false,
        ready: false,
      },
    });
    expect(report.failedChecks[0]?.id).toBe('dataset-file');
  });

  it('summarizes a ready dataset without copying reviewer identities', () => {
    const report = buildCueValidationDatasetReport({
      dataset: readyDataset(),
      datasetPath: '/tmp/project/docs/validation/cue-validation-dataset.json',
      generatedAt: '2026-06-20T00:00:00.000Z',
    });

    expect(report).toMatchObject({
      status: 'ready',
      summary: {
        clipCount: 3,
        failedChecks: 0,
        ready: true,
        reviewCount: 6,
        wallAngles: ['overhang', 'slab', 'vertical'],
      },
    });
    expect(JSON.stringify(report)).not.toMatch(/coach-1-a|coach-2-b|rawVideoUri/i);
  });

  it('writes JSON and Markdown parse-error evidence without throwing', () => {
    const root = makeRoot();
    const datasetPath = path.join(root, 'docs/validation/cue-validation-dataset.json');
    fs.mkdirSync(path.dirname(datasetPath), { recursive: true });
    fs.writeFileSync(datasetPath, '{bad');

    const { jsonPath, markdownPath, report } = writeCueValidationDatasetReport({
      datasetPath,
      generatedAt: '2026-06-20T00:00:00.000Z',
      jsonPath: path.join(root, 'docs/sdlc/cue-validation-dataset-report.json'),
      markdownPath: path.join(root, 'docs/sdlc/cue-validation-dataset-report.md'),
    });

    expect(report.status).toBe('blocked');
    expect(report.failedChecks[0]?.id).toBe('dataset-json');
    expect(fs.readFileSync(jsonPath, 'utf8')).toContain('"schemaVersion": "movebeta.cue-validation-dataset-report.v1"');
    expect(fs.readFileSync(markdownPath, 'utf8')).toContain('Cue Validation Dataset Report');
  });
});
