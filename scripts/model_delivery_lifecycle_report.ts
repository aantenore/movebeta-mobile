import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  buildModelDeliveryLifecycle,
  type ModelDeliveryLifecycle,
} from '../src/core/modelDeliveryLifecycle';

function resolveProjectRoot() {
  return path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
}

function readJsonIfExists(rootDir: string, relativePath: string) {
  const filePath = path.join(rootDir, relativePath);
  if (!fs.existsSync(filePath)) return undefined;
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

export function renderModelDeliveryLifecycleMarkdown(lifecycle: ModelDeliveryLifecycle) {
  const rows = lifecycle.stages
    .map((stage) => `| ${stage.label} | ${stage.status} | ${stage.detail} | ${stage.nextAction} |`)
    .join('\n');

  return `# Model Delivery Lifecycle Report

Generated: ${lifecycle.generatedAt}

- Status: ${lifecycle.summary.status}
- Model: ${lifecycle.model.name}
- Delivery mode: ${lifecycle.summary.deliveryMode}
- Download strategy: ${lifecycle.summary.downloadStrategy}
- Model URL: ${lifecycle.model.modelUrl}
- Assets: ${lifecycle.model.assetCount}
- Total bytes: ${lifecycle.model.totalBytes}
- Cache ready: ${lifecycle.summary.cacheReady ? 'yes' : 'no'}
- First use requires network: ${lifecycle.summary.firstUseRequiresNetwork ? 'yes' : 'no'}
- Download trigger: ${lifecycle.summary.downloadTrigger}
- Next action: ${lifecycle.summary.nextAction}
- Credential values included: no
- Local paths included: no
- Raw artifacts included: no
- Raw video included: no

| Stage | Status | Detail | Next action |
| --- | --- | --- | --- |
${rows}
`;
}

export function writeModelDeliveryLifecycleReport({
  generatedAt = new Date().toISOString(),
  jsonOutputPath,
  markdownOutputPath,
  rootDir = resolveProjectRoot(),
}: {
  generatedAt?: string;
  jsonOutputPath?: string;
  markdownOutputPath?: string;
  rootDir?: string;
} = {}) {
  const lifecycle = buildModelDeliveryLifecycle({
    generatedAt,
    modelDeliveryPolicy: readJsonIfExists(rootDir, 'public/model-delivery-policy.json'),
    staticAssetsReport: readJsonIfExists(rootDir, 'docs/sdlc/movenet-static-assets-report.json'),
  });
  const jsonTarget = jsonOutputPath ?? path.join(rootDir, 'docs/sdlc/model-delivery-lifecycle-report.json');
  const markdownTarget = markdownOutputPath ?? path.join(rootDir, 'docs/sdlc/model-delivery-lifecycle-report.md');

  fs.mkdirSync(path.dirname(jsonTarget), { recursive: true });
  fs.mkdirSync(path.dirname(markdownTarget), { recursive: true });
  fs.writeFileSync(jsonTarget, `${JSON.stringify(lifecycle, null, 2)}\n`);
  fs.writeFileSync(markdownTarget, renderModelDeliveryLifecycleMarkdown(lifecycle));

  return { jsonTarget, lifecycle, markdownTarget };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const { jsonTarget, lifecycle, markdownTarget } = writeModelDeliveryLifecycleReport();
  console.log(`Wrote model delivery lifecycle report to ${jsonTarget}`);
  console.log(`Wrote model delivery lifecycle summary to ${markdownTarget}`);
  console.log(`Status: ${lifecycle.summary.status}; mode: ${lifecycle.summary.deliveryMode}; cache ready: ${lifecycle.summary.cacheReady}`);
}
