import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { validateAndroidManifest } from './android_manifest_checks.mjs';

const rootDir = dirname(dirname(fileURLToPath(import.meta.url)));
const manifestPath = join(
  rootDir,
  'android',
  'app',
  'build',
  'intermediates',
  'merged_manifests',
  'release',
  'processReleaseManifest',
  'AndroidManifest.xml',
);

if (!existsSync(manifestPath)) {
  throw new Error(`Missing merged release Android manifest at ${manifestPath}. Run npm run native:android:debug first.`);
}

const manifest = readFileSync(manifestPath, 'utf8');
const validation = validateAndroidManifest(manifest);
const failures = validation.checks.filter((check) => !check.pass);

if (failures.length > 0) {
  throw new Error(
    `Android manifest validation failed: ${failures.map((failure) => `${failure.id} (${failure.detail})`).join(', ')}`,
  );
}

console.log(`Android manifest validation passed: ${validation.checks.map((check) => check.id).join(', ')}`);
