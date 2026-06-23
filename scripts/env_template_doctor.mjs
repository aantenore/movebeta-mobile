import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { storeCredentialEnvKeys } from './store_credentials_doctor.mjs';

export const ENV_TEMPLATE_REPORT_SCHEMA_VERSION = 'movebeta.env-template-report.v1';

export const envTemplateContract = [
  {
    key: 'runtime-public',
    label: 'Runtime public configuration',
    owner: 'engineering',
    requiredKeys: [
      'EXPO_PUBLIC_MOVEBETA_ANALYSIS_PROVIDER',
      'EXPO_PUBLIC_MOVEBETA_VIDEO_ANALYSIS_PROVIDER',
      'EXPO_PUBLIC_MOVEBETA_NATIVE_VIDEO_ANALYSIS_PROVIDER',
      'EXPO_PUBLIC_MOVEBETA_TFJS_MOVENET_MODEL_URL',
      'EXPO_PUBLIC_MOVEBETA_ACTIVE_PLAN',
      'EXPO_PUBLIC_MOVEBETA_PRIVACY_MODE',
      'EXPO_PUBLIC_MOVEBETA_API_BASE_URL',
      'EXPO_PUBLIC_MOVEBETA_LAUNCH_READINESS_EVIDENCE',
      'EXPO_PUBLIC_MOVEBETA_BILLING_READINESS',
      'EXPO_PUBLIC_MOVEBETA_MODEL_EVIDENCE',
      'EXPO_PUBLIC_MOVEBETA_RELEASE_REPOSITORY',
    ],
  },
  {
    key: 'local-operations',
    label: 'Local operation commands',
    owner: 'engineering',
    requiredKeys: ['MOVEBETA_SMOKE_URL'],
  },
  {
    key: 'release-credentials',
    label: 'Release credential key names',
    owner: 'release',
    requiredKeys: [
      ...storeCredentialEnvKeys.easToken,
      'VERCEL_TOKEN',
      'VERCEL_ORG_ID',
      'VERCEL_PROJECT_ID',
      ...storeCredentialEnvKeys.iosAscAppId,
      ...storeCredentialEnvKeys.iosAppleId,
      ...storeCredentialEnvKeys.iosApiKey,
      ...storeCredentialEnvKeys.androidServiceAccount,
    ],
    secretValuePolicy: 'empty-template-value',
  },
];

const forbiddenTemplateValuePattern =
  /(file:\/\/|content:\/\/|asset:\/\/|ph:\/\/|\/Users\/|\/private\/|\/var\/mobile\/|[A-Za-z]:\\|BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY|ghp_[A-Za-z0-9_]+|github_pat_[A-Za-z0-9_]+|pat_[A-Za-z0-9_]{12,}|sk_live_[A-Za-z0-9_]+|sk_test_[A-Za-z0-9_]+|bearer\s+[A-Za-z0-9._-]+|eyJ[A-Za-z0-9_-]{20,}|AKIA[0-9A-Z]{16}|AIza[0-9A-Za-z_-]{20,}|"private_key"\s*:|"client_email"\s*:)/i;

function resolveProjectRoot() {
  return path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
}

export function resolveDefaultEnvTemplatePath(rootDir = resolveProjectRoot()) {
  return path.join(rootDir, '.env.example');
}

export function resolveDefaultJsonPath(rootDir = resolveProjectRoot()) {
  return path.join(rootDir, 'docs/sdlc/env-template-report.json');
}

export function resolveDefaultMarkdownPath(rootDir = resolveProjectRoot()) {
  return path.join(rootDir, 'docs/sdlc/env-template-report.md');
}

function normalizeValue(value) {
  const trimmed = value.trim();
  if (
    (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
    (trimmed.startsWith("'") && trimmed.endsWith("'"))
  ) {
    return trimmed.slice(1, -1).trim();
  }
  return trimmed;
}

export function parseEnvTemplate(content) {
  const entries = [];
  const malformedLines = [];
  const seen = new Map();
  const duplicateKeys = [];

  content.split(/\r?\n/).forEach((line, index) => {
    const lineNumber = index + 1;
    const trimmed = line.trim();
    if (trimmed.length === 0 || trimmed.startsWith('#')) return;

    const assignment = trimmed.replace(/^export\s+/, '');
    const match = assignment.match(/^([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/);
    if (!match) {
      malformedLines.push({ line: lineNumber });
      return;
    }

    const key = match[1];
    const value = normalizeValue(match[2]);
    if (seen.has(key)) {
      duplicateKeys.push({ key, lines: [seen.get(key), lineNumber] });
    } else {
      seen.set(key, lineNumber);
    }

    entries.push({ key, line: lineNumber, value });
  });

  return {
    duplicateKeys,
    entries,
    keys: entries.map((entry) => entry.key),
    malformedLines,
  };
}

function requiredKeysByCategory(parsed) {
  const present = new Set(parsed.keys);
  return envTemplateContract.map((category) => ({
    key: category.key,
    label: category.label,
    missingKeys: category.requiredKeys.filter((key) => !present.has(key)),
    owner: category.owner,
    presentKeys: category.requiredKeys.filter((key) => present.has(key)),
    requiredKeys: category.requiredKeys,
    secretValuePolicy: category.secretValuePolicy ?? 'safe-example-value',
  }));
}

function unsafeTemplateValues(parsed) {
  const emptyValueKeys = new Set(
    envTemplateContract
      .filter((category) => category.secretValuePolicy === 'empty-template-value')
      .flatMap((category) => category.requiredKeys),
  );

  return parsed.entries
    .map((entry) => {
      if (entry.value.length === 0) return undefined;
      if (emptyValueKeys.has(entry.key)) {
        return {
          key: entry.key,
          line: entry.line,
          reason: 'credential template values must be empty',
        };
      }
      if (forbiddenTemplateValuePattern.test(entry.value)) {
        return {
          key: entry.key,
          line: entry.line,
          reason: 'template value looks like a secret, token, credential file, or local path',
        };
      }
      return undefined;
    })
    .filter(Boolean);
}

function buildChecks({ categories, duplicateKeys, malformedLines, unsafeValues }) {
  const categoryChecks = categories.map((category) => ({
    detail:
      category.missingKeys.length === 0
        ? `${category.presentKeys.length}/${category.requiredKeys.length} required keys are present.`
        : `Missing ${category.missingKeys.join(', ')}.`,
    id: `${category.key}-keys`,
    keys: category.requiredKeys,
    label: category.label,
    owner: category.owner,
    status: category.missingKeys.length === 0 ? 'pass' : 'fail',
  }));

  return [
    ...categoryChecks,
    {
      detail:
        unsafeValues.length === 0
          ? 'No credential values, token-like strings, or local paths were detected.'
          : `${unsafeValues.length} unsafe template value(s) detected.`,
      id: 'secret-free-template',
      keys: unsafeValues.map((item) => item.key),
      label: 'Secret-free template',
      owner: 'security',
      status: unsafeValues.length === 0 ? 'pass' : 'fail',
    },
    {
      detail:
        duplicateKeys.length === 0
          ? 'No duplicate env keys were detected.'
          : `${duplicateKeys.length} duplicate env key(s) detected.`,
      id: 'duplicate-template-keys',
      keys: duplicateKeys.map((item) => item.key),
      label: 'Duplicate key guard',
      owner: 'engineering',
      status: duplicateKeys.length === 0 ? 'pass' : 'fail',
    },
    {
      detail:
        malformedLines.length === 0
          ? 'Every non-comment line is a KEY=value assignment.'
          : `${malformedLines.length} malformed line(s) detected.`,
      id: 'template-syntax',
      keys: [],
      label: 'Template syntax',
      owner: 'engineering',
      status: malformedLines.length === 0 ? 'pass' : 'fail',
    },
  ];
}

/**
 * @param {{ content?: string, generatedAt?: string, templatePath?: string }} [options]
 */
export function buildEnvTemplateReport({
  content,
  generatedAt = new Date().toISOString(),
  templatePath = '.env.example',
} = {}) {
  const parsed = parseEnvTemplate(content ?? '');
  const categories = requiredKeysByCategory(parsed);
  const unsafeValues = unsafeTemplateValues(parsed);
  const checks = buildChecks({
    categories,
    duplicateKeys: parsed.duplicateKeys,
    malformedLines: parsed.malformedLines,
    unsafeValues,
  });
  const missingKeys = categories.flatMap((category) => category.missingKeys);
  const failedChecks = checks.filter((check) => check.status !== 'pass');

  return {
    categories,
    checks,
    generatedAt,
    nextAction:
      failedChecks.length === 0
        ? 'Use .env.example as the share-safe setup contract, then set credential values only in CI secrets or local shells.'
        : failedChecks[0].detail,
    privacy: {
      credentialValuesIncluded: false,
      localPathsIncluded: false,
      parsedValuesIncluded: false,
      secretsIncluded: false,
    },
    schemaVersion: ENV_TEMPLATE_REPORT_SCHEMA_VERSION,
    status: failedChecks.length === 0 ? 'ready' : 'blocked',
    summary: {
      duplicateKeyCount: parsed.duplicateKeys.length,
      malformedLineCount: parsed.malformedLines.length,
      missingKeyCount: missingKeys.length,
      presentKeyCount: new Set(parsed.keys).size,
      requiredKeyCount: envTemplateContract.reduce((count, category) => count + category.requiredKeys.length, 0),
      unsafeValueCount: unsafeValues.length,
    },
    templatePath,
    unsafeValues,
  };
}

export function renderEnvTemplateMarkdown(report) {
  const rows = report.checks
    .map((check) => `| ${check.label} | ${check.status} | ${check.detail} |`)
    .join('\n');
  const categoryRows = report.categories
    .map(
      (category) =>
        `| ${category.label} | ${category.owner} | ${category.presentKeys.length}/${category.requiredKeys.length} | ${category.missingKeys.join(', ') || 'none'} |`,
    )
    .join('\n');

  return `# Environment Template Report

Generated: ${report.generatedAt}

- Status: ${report.status}
- Template: ${report.templatePath}
- Values included: no
- Next action: ${report.nextAction}

| Check | Status | Detail |
| --- | --- | --- |
${rows}

| Category | Owner | Present | Missing keys |
| --- | --- | --- | --- |
${categoryRows}
`;
}

/**
 * @param {{ envTemplatePath?: string, generatedAt?: string, jsonPath?: string, markdownPath?: string }} [options]
 */
export function writeEnvTemplateReport({
  envTemplatePath = resolveDefaultEnvTemplatePath(),
  generatedAt,
  jsonPath = resolveDefaultJsonPath(),
  markdownPath = resolveDefaultMarkdownPath(),
} = {}) {
  const content = fs.readFileSync(envTemplatePath, 'utf8');
  const report = buildEnvTemplateReport({
    content,
    generatedAt,
    templatePath: path.relative(path.resolve(path.dirname(jsonPath), '../..'), envTemplatePath) || '.env.example',
  });

  fs.mkdirSync(path.dirname(jsonPath), { recursive: true });
  fs.writeFileSync(jsonPath, `${JSON.stringify(report, null, 2)}\n`);
  fs.writeFileSync(markdownPath, renderEnvTemplateMarkdown(report));

  return { jsonPath, markdownPath, report };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const { jsonPath, markdownPath, report } = writeEnvTemplateReport();
  console.log(`Wrote environment template report to ${jsonPath}`);
  console.log(`Wrote environment template summary to ${markdownPath}`);
  console.log(`Status: ${report.status}; next action: ${report.nextAction}`);
  if (report.status !== 'ready') {
    process.exitCode = 1;
  }
}
