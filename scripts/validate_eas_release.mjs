import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { validateEasReleaseReadiness } from './eas_release_checks.mjs';

const rootDir = dirname(dirname(fileURLToPath(import.meta.url)));
const strict = process.argv.includes('--strict');

function readJson(relativePath) {
  return JSON.parse(readFileSync(join(rootDir, relativePath), 'utf8'));
}

function statusLabel(status) {
  if (status === 'pass') return 'PASS';
  if (status === 'warn') return 'WARN';
  return 'FAIL';
}

const appConfig = readJson('app.json').expo;
const easConfig = readJson('eas.json');
const validation = validateEasReleaseReadiness({
  appConfig,
  easConfig,
  env: process.env,
  strict,
});

console.log(`EAS release readiness (${strict ? 'strict' : 'standard'})`);

for (const item of validation.checks) {
  console.log(`[${statusLabel(item.status)}] ${item.label}: ${item.detail}`);
}

if (!validation.ready) {
  console.error(strict ? 'EAS strict release gate failed.' : 'EAS release gate failed.');
  process.exitCode = 1;
}
