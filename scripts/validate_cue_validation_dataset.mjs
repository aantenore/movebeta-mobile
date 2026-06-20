import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { validateCueValidationDataset } from './cue_validation_dataset_checks.mjs';

const datasetPath = resolve(process.argv[2] ?? 'docs/validation/cue-validation-dataset.json');

if (!existsSync(datasetPath)) {
  throw new Error(
    `Missing cue validation dataset at ${datasetPath}. Copy docs/validation/cue-validation-dataset.template.json, replace placeholders with consented coach review packets and reviews, then rerun this command.`,
  );
}

const dataset = JSON.parse(readFileSync(datasetPath, 'utf8'));
const validation = validateCueValidationDataset(dataset);

for (const check of validation.checks) {
  console.log(`${check.status.toUpperCase()} ${check.id}: ${check.detail}`);
}

console.log(
  `SUMMARY clips=${validation.summary.clipCount} cues=${validation.summary.cueCount} reviews=${validation.summary.reviewCount} average=${validation.summary.averageScore}/5 maxSpread=${validation.summary.maxReviewerScoreSpreadPerCriterion}/4 wallAngles=${validation.summary.wallAngles.join(',')}`,
);

if (!validation.ready) {
  throw new Error('Cue validation dataset is not ready for production movement-quality claims.');
}

console.log('Cue validation dataset passed.');
