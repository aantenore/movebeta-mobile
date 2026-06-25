import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { type ModelDeliveryLifecycle, buildModelDeliveryLifecycle } from '../src/core/modelDeliveryLifecycle';
import {
  buildModelDownloadPlan,
  type ModelDownloadPlan,
  type ModelDownloadPlanNetwork,
  type ModelDownloadPlanPreference,
} from '../src/core/modelDownloadPlan';

function resolveProjectRoot() {
  return path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
}

function readJsonIfExists(rootDir: string, relativePath: string) {
  const filePath = path.join(rootDir, relativePath);
  if (!fs.existsSync(filePath)) return undefined;
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function resolveLifecycle(rootDir: string, generatedAt: string): ModelDeliveryLifecycle {
  const existing = readJsonIfExists(rootDir, 'docs/sdlc/model-delivery-lifecycle-report.json') as
    | ModelDeliveryLifecycle
    | undefined;
  if (existing?.schemaVersion === 'movebeta.model-delivery-lifecycle.v1') return existing;

  return buildModelDeliveryLifecycle({
    generatedAt,
    modelDeliveryPolicy: readJsonIfExists(rootDir, 'public/model-delivery-policy.json'),
    pwaReadinessReport: readJsonIfExists(rootDir, 'docs/sdlc/pwa-readiness-report.json'),
    staticAssetsReport: readJsonIfExists(rootDir, 'docs/sdlc/movenet-static-assets-report.json'),
    webSmokeReport: readJsonIfExists(rootDir, 'docs/sdlc/web-smoke-report.json'),
  });
}

export function renderModelDownloadPlanMarkdown(plan: ModelDownloadPlan) {
  const rows = plan.steps
    .map((step) => `| ${step.label} | ${step.status} | ${step.timing} | ${step.detail} | ${step.action} |`)
    .join('\n');

  return `# Model Download Plan Report

Generated: ${plan.generatedAt}

- Status: ${plan.summary.status}
- Runtime: ${plan.summary.runtime}
- Network: ${plan.summary.network}
- Preference: ${plan.summary.preference}
- Download required: ${plan.summary.downloadRequired ? 'yes' : 'no'}
- Offline ready: ${plan.summary.offlineReady ? 'yes' : 'no'}
- Cache ready: ${plan.summary.cacheReady ? 'yes' : 'no'}
- Update available: ${plan.summary.updateAvailable ? 'yes' : 'no'}
- Download trigger: ${plan.summary.downloadTrigger}
- Next action: ${plan.summary.nextAction}
- Total model bytes: ${plan.model.totalBytes}
- Packaged bytes: ${plan.model.packagedBytes}
- Additional download bytes: ${plan.model.additionalDownloadBytes}
- Credential values included: no
- Local paths included: no
- Raw artifacts included: no
- Raw video included: no

| Step | Status | Timing | Detail | Action |
| --- | --- | --- | --- | --- |
${rows}
`;
}

export function writeModelDownloadPlanReport({
  generatedAt = new Date().toISOString(),
  jsonOutputPath,
  markdownOutputPath,
  network = 'unknown',
  preference = 'wifi-only',
  rootDir = resolveProjectRoot(),
}: {
  generatedAt?: string;
  jsonOutputPath?: string;
  markdownOutputPath?: string;
  network?: ModelDownloadPlanNetwork;
  preference?: ModelDownloadPlanPreference;
  rootDir?: string;
} = {}) {
  const lifecycle = resolveLifecycle(rootDir, generatedAt);
  const plan = buildModelDownloadPlan({
    generatedAt,
    lifecycle,
    network,
    preference,
  });
  const jsonTarget = jsonOutputPath ?? path.join(rootDir, 'docs/sdlc/model-download-plan-report.json');
  const markdownTarget = markdownOutputPath ?? path.join(rootDir, 'docs/sdlc/model-download-plan-report.md');

  fs.mkdirSync(path.dirname(jsonTarget), { recursive: true });
  fs.mkdirSync(path.dirname(markdownTarget), { recursive: true });
  fs.writeFileSync(jsonTarget, `${JSON.stringify(plan, null, 2)}\n`);
  fs.writeFileSync(markdownTarget, renderModelDownloadPlanMarkdown(plan));

  return { jsonTarget, markdownTarget, plan };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const { jsonTarget, markdownTarget, plan } = writeModelDownloadPlanReport();
  console.log(`Wrote model download plan report to ${jsonTarget}`);
  console.log(`Wrote model download plan summary to ${markdownTarget}`);
  console.log(
    `Status: ${plan.summary.status}; runtime: ${plan.summary.runtime}; additional bytes: ${plan.model.additionalDownloadBytes}`,
  );
}
