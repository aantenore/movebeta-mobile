import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';

import {
  buildEnvTemplateReport,
  ENV_TEMPLATE_REPORT_SCHEMA_VERSION,
  envTemplateContract,
  parseEnvTemplate,
  renderEnvTemplateMarkdown,
  writeEnvTemplateReport,
} from '../scripts/env_template_doctor.mjs';

const tmpRoots: string[] = [];

function completeTemplate() {
  return envTemplateContract
    .flatMap((category) =>
      category.requiredKeys.map((key) => {
        if (category.key === 'release-credentials') return `${key}=`;
        if (key === 'MOVEBETA_SMOKE_URL') return `${key}=http://127.0.0.1:8082`;
        if (key === 'EXPO_PUBLIC_MOVEBETA_BILLING_READINESS') return `${key}=`;
        if (key === 'EXPO_PUBLIC_MOVEBETA_MODEL_EVIDENCE') return `${key}=`;
        if (key === 'EXPO_PUBLIC_MOVEBETA_LAUNCH_READINESS_EVIDENCE') {
          return `${key}={"releaseGate":true,"modelReadiness":true}`;
        }
        return `${key}=example`;
      }),
    )
    .join('\n');
}

function makeRoot() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'movebeta-env-template-'));
  tmpRoots.push(root);
  return root;
}

afterEach(() => {
  for (const root of tmpRoots.splice(0)) {
    fs.rmSync(root, { force: true, recursive: true });
  }
});

describe('environment template doctor', () => {
  it('parses comments, export assignments, and duplicate keys without storing values in reports', () => {
    const parsed = parseEnvTemplate(
      [
        '# comment',
        'export EXPO_PUBLIC_MOVEBETA_ACTIVE_PLAN=free',
        'EXPO_PUBLIC_MOVEBETA_ACTIVE_PLAN=pro',
        'not an assignment',
      ].join('\n'),
    );

    expect(parsed.keys).toEqual(['EXPO_PUBLIC_MOVEBETA_ACTIVE_PLAN', 'EXPO_PUBLIC_MOVEBETA_ACTIVE_PLAN']);
    expect(parsed.duplicateKeys).toEqual([{ key: 'EXPO_PUBLIC_MOVEBETA_ACTIVE_PLAN', lines: [2, 3] }]);
    expect(parsed.malformedLines).toEqual([{ line: 4 }]);
  });

  it('marks a complete share-safe template ready', () => {
    const report = buildEnvTemplateReport({
      content: completeTemplate(),
      generatedAt: '2026-06-20T13:00:00.000Z',
    });

    expect(report.schemaVersion).toBe(ENV_TEMPLATE_REPORT_SCHEMA_VERSION);
    expect(report.status).toBe('ready');
    expect(report.summary.missingKeyCount).toBe(0);
    expect(report.summary.unsafeValueCount).toBe(0);
    expect(renderEnvTemplateMarkdown(report)).toContain('# Environment Template Report');
  });

  it('reports missing runtime and release keys', () => {
    const report = buildEnvTemplateReport({
      content: [
        'EXPO_PUBLIC_MOVEBETA_ANALYSIS_PROVIDER=local-fixture',
        'MOVEBETA_SMOKE_URL=http://127.0.0.1:8082',
      ].join('\n'),
      generatedAt: '2026-06-20T13:05:00.000Z',
    });

    expect(report.status).toBe('blocked');
    expect(report.summary.missingKeyCount).toBeGreaterThan(0);
    expect(report.categories.find((category) => category.key === 'release-credentials')?.missingKeys).toContain('EXPO_TOKEN');
    expect(report.categories.find((category) => category.key === 'runtime-public')?.missingKeys).toContain(
      'EXPO_PUBLIC_MOVEBETA_MODEL_EVIDENCE',
    );
  });

  it('rejects credential values, token-like strings, and local paths without exposing the values', () => {
    const report = buildEnvTemplateReport({
      content: [
        completeTemplate(),
        'EXPO_TOKEN=expo-token',
        'EXPO_PUBLIC_MOVEBETA_MODEL_EVIDENCE=/Users/antonio/private/model.json',
      ].join('\n'),
      generatedAt: '2026-06-20T13:10:00.000Z',
    });

    expect(report.status).toBe('blocked');
    expect(report.unsafeValues.map((item: { key: string }) => item.key)).toEqual(
      expect.arrayContaining(['EXPO_TOKEN', 'EXPO_PUBLIC_MOVEBETA_MODEL_EVIDENCE']),
    );
    expect(JSON.stringify(report)).not.toContain('expo-token');
    expect(JSON.stringify(report)).not.toContain('/Users/antonio/private/model.json');
  });

  it('writes durable JSON and Markdown reports', () => {
    const rootDir = makeRoot();
    const envTemplatePath = path.join(rootDir, '.env.example');
    const jsonPath = path.join(rootDir, 'docs/sdlc/env-template-report.json');
    const markdownPath = path.join(rootDir, 'docs/sdlc/env-template-report.md');

    fs.writeFileSync(envTemplatePath, `${completeTemplate()}\n`);
    const { report } = writeEnvTemplateReport({
      envTemplatePath,
      generatedAt: '2026-06-20T13:15:00.000Z',
      jsonPath,
      markdownPath,
    });

    expect(JSON.parse(fs.readFileSync(jsonPath, 'utf8'))).toEqual(report);
    expect(fs.readFileSync(markdownPath, 'utf8')).toContain('Values included: no');
  });
});
