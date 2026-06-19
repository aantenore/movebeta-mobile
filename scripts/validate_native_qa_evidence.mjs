import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { validateNativeQaEvidence } from './native_qa_evidence_checks.mjs';

const evidencePath = resolve(process.argv[2] ?? 'docs/sdlc/native-qa-evidence.json');

if (!existsSync(evidencePath)) {
  throw new Error(`Missing native QA evidence file at ${evidencePath}. Copy docs/sdlc/native-qa-evidence.template.json and fill it with real device results.`);
}

const evidence = JSON.parse(readFileSync(evidencePath, 'utf8'));
const validation = validateNativeQaEvidence(evidence);

for (const check of validation.checks) {
  console.log(`${check.status.toUpperCase()} ${check.id}: ${check.detail}`);
}

if (!validation.ready) {
  throw new Error('Native QA evidence is not ready for store submission.');
}

console.log('Native QA evidence validation passed.');
