import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const VERCEL_DEPLOYMENT_REPORT_SCHEMA_VERSION = 'movebeta.vercel-deployment-readiness.v1';

export const vercelDeploymentEnvKeys = ['VERCEL_TOKEN', 'VERCEL_ORG_ID', 'VERCEL_PROJECT_ID'];

const forbiddenValuePattern =
  /(file:\/\/|content:\/\/|asset:\/\/|ph:\/\/|\/Users\/|\/private\/|\/var\/mobile\/|[A-Za-z]:\\|\.mov\b|\.mp4\b|BEGIN PRIVATE KEY|ghp_[A-Za-z0-9_]+|github_pat_[A-Za-z0-9_]+|pat_[A-Za-z0-9_]+|sk_live_[A-Za-z0-9_]+|sk_test_[A-Za-z0-9_]+|bearer\s+[A-Za-z0-9._-]+|eyJ[A-Za-z0-9_-]{20,})/i;

export function resolveProjectRoot() {
  return path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
}

export function resolveDefaultJsonOutputPath(rootDir = resolveProjectRoot()) {
  return path.join(rootDir, 'docs/sdlc/vercel-deployment-report.json');
}

export function resolveDefaultMarkdownOutputPath(rootDir = resolveProjectRoot()) {
  return path.join(rootDir, 'docs/sdlc/vercel-deployment-report.md');
}

function readTextIfExists(filePath) {
  if (!fs.existsSync(filePath)) return undefined;
  return fs.readFileSync(filePath, 'utf8');
}

function readJsonIfExists(filePath) {
  const text = readTextIfExists(filePath);
  if (!text) return undefined;
  return JSON.parse(text);
}

function hasText(value) {
  return typeof value === 'string' && value.trim().length > 0;
}

function envTemplateKeys(content = '') {
  return new Set(
    content
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line && !line.startsWith('#'))
      .map((line) => line.replace(/^export\s+/, '').split('=')[0]?.trim())
      .filter(Boolean),
  );
}

function templateValueIsEmpty(content = '', key) {
  const line = content
    .split(/\r?\n/)
    .map((candidate) => candidate.trim())
    .find((candidate) => candidate === `${key}=` || candidate.startsWith(`${key}=`));
  return line === `${key}=`;
}

function check({ action, detail, key, label, status }) {
  return { action, detail, key, label, status };
}

function command(key, label, value, purpose) {
  return { command: value, key, label, purpose };
}

function containsForbiddenValue(value) {
  if (typeof value === 'string') return forbiddenValuePattern.test(value);
  if (Array.isArray(value)) return value.some(containsForbiddenValue);
  if (value && typeof value === 'object') return Object.values(value).some(containsForbiddenValue);
  return false;
}

function vercelConfigStaticReady(config) {
  return (
    config?.framework === null &&
    config?.buildCommand === 'npm run export:web' &&
    config?.outputDirectory === 'dist' &&
    Array.isArray(config?.headers) &&
    Array.isArray(config?.rewrites)
  );
}

function pwaReportReady(report) {
  return report?.schemaVersion === 'movebeta.pwa-readiness.v1' && report?.summary?.status === 'ready';
}

function projectBindingState(projectConfig) {
  if (!projectConfig || typeof projectConfig !== 'object') return 'missing';
  return hasText(projectConfig.orgId) && hasText(projectConfig.projectId) ? 'present' : 'incomplete';
}

function reportStatus(checks) {
  if (checks.some((item) => item.status === 'blocked')) return 'blocked';
  if (checks.some((item) => item.status === 'action-needed')) return 'static-ready';
  return 'linked';
}

export function assertVercelDeploymentReportIsShareSafe(report) {
  if (containsForbiddenValue(report)) {
    throw new Error('Vercel deployment report contains credential values, local paths, raw artifacts, raw video references, or token-like data.');
  }
  return report;
}

export function buildVercelDeploymentReport({
  env = process.env,
  generatedAt = new Date().toISOString(),
  rootDir = resolveProjectRoot(),
} = {}) {
  const vercelConfig = readJsonIfExists(path.join(rootDir, 'vercel.json'));
  const pwaReadiness = readJsonIfExists(path.join(rootDir, 'docs/sdlc/pwa-readiness-report.json'));
  const envTemplate = readTextIfExists(path.join(rootDir, '.env.example')) ?? '';
  const projectConfig = readJsonIfExists(path.join(rootDir, '.vercel/project.json'));
  const keys = envTemplateKeys(envTemplate);
  const missingTemplateKeys = vercelDeploymentEnvKeys.filter((key) => !keys.has(key));
  const nonEmptyTemplateKeys = vercelDeploymentEnvKeys.filter((key) => keys.has(key) && !templateValueIsEmpty(envTemplate, key));
  const envKeysPresent = vercelDeploymentEnvKeys.filter((key) => hasText(env[key]));
  const envKeysMissing = vercelDeploymentEnvKeys.filter((key) => !hasText(env[key]));
  const bindingState = projectBindingState(projectConfig);

  const checks = [
    check({
      action: 'Keep vercel.json static-first with outputDirectory dist.',
      detail: vercelConfigStaticReady(vercelConfig)
        ? 'vercel.json uses npm run export:web, outputDirectory dist, static headers, and SPA fallback.'
        : 'vercel.json is missing the static Expo export contract.',
      key: 'vercel-static-config',
      label: 'Vercel static config',
      status: vercelConfigStaticReady(vercelConfig) ? 'verified' : 'blocked',
    }),
    check({
      action: 'Run npm run export:web && npm run web:pwa:check before deployment.',
      detail: pwaReportReady(pwaReadiness)
        ? 'PWA readiness report is ready, including manifest, service worker, static assets, and no-backend checks.'
        : 'PWA readiness report is missing or not ready.',
      key: 'pwa-readiness',
      label: 'PWA readiness evidence',
      status: pwaReportReady(pwaReadiness) ? 'verified' : 'blocked',
    }),
    check({
      action: 'Do not add api, pages/api, or functions until a paid backend path is explicitly selected.',
      detail:
        !fs.existsSync(path.join(rootDir, 'api')) &&
        !fs.existsSync(path.join(rootDir, 'pages/api')) &&
        !fs.existsSync(path.join(rootDir, 'functions'))
          ? 'No Vercel API routes, functions directory, or backend surface is present.'
          : 'A backend/API surface is present and must be reviewed before claiming no-backend deployment.',
      key: 'no-backend-surface',
      label: 'No backend surface',
      status:
        !fs.existsSync(path.join(rootDir, 'api')) &&
        !fs.existsSync(path.join(rootDir, 'pages/api')) &&
        !fs.existsSync(path.join(rootDir, 'functions'))
          ? 'verified'
          : 'blocked',
    }),
    check({
      action: 'Keep VERCEL_TOKEN, VERCEL_ORG_ID, and VERCEL_PROJECT_ID documented with empty template values.',
      detail:
        missingTemplateKeys.length === 0 && nonEmptyTemplateKeys.length === 0
          ? 'Vercel deployment key names are documented in .env.example with empty template values.'
          : `Missing or non-empty Vercel template keys: ${[...missingTemplateKeys, ...nonEmptyTemplateKeys].join(', ')}.`,
      key: 'env-template',
      label: 'Deployment env template',
      status: missingTemplateKeys.length === 0 && nonEmptyTemplateKeys.length === 0 ? 'verified' : 'blocked',
    }),
    check({
      action: 'Run vercel link or vercel pull on the target Vercel account when ready to deploy.',
      detail:
        bindingState === 'present'
          ? '.vercel/project.json is present with project and organization identifiers.'
          : '.vercel/project.json is not present; deployment can still be configured from Vercel Git integration or CI secrets.',
      key: 'project-binding',
      label: 'Vercel project binding',
      status: bindingState === 'present' ? 'verified' : 'action-needed',
    }),
    check({
      action: 'Set Vercel credential values only in local shell, CI secrets, or Vercel project settings.',
      detail:
        envKeysMissing.length === 0
          ? 'All Vercel deployment env keys are present in the current environment.'
          : `Current shell is missing deployment values for ${envKeysMissing.join(', ')}.`,
      key: 'deployment-secrets',
      label: 'Deployment secret availability',
      status: envKeysMissing.length === 0 ? 'verified' : 'action-needed',
    }),
  ];
  const status = reportStatus(checks);
  const actionNeededCount = checks.filter((item) => item.status === 'action-needed').length;
  const blockedCount = checks.filter((item) => item.status === 'blocked').length;
  const verifiedCount = checks.filter((item) => item.status === 'verified').length;
  const report = {
    checks,
    commands: [
      command('export-web', 'Export web PWA', 'npm run export:web', 'Build the static web output into dist.'),
      command('pwa-check', 'Validate PWA output', 'npm run web:pwa:check', 'Verify manifest, service worker, static assets, and no-backend path.'),
      command('vercel-pull', 'Pull Vercel project settings', 'npx vercel pull --yes --environment=production --token=$VERCEL_TOKEN', 'Bind local configuration to the selected Vercel project without committing secret values.'),
      command('vercel-build', 'Build prebuilt Vercel artifact', 'npx vercel build --prod --token=$VERCEL_TOKEN', 'Build Vercel output from the static project configuration.'),
      command('vercel-deploy', 'Deploy prebuilt production artifact', 'npx vercel deploy --prebuilt --prod --token=$VERCEL_TOKEN', 'Deploy the prebuilt static PWA to production.'),
      command('post-deploy-smoke', 'Smoke deployed PWA', 'MOVEBETA_SMOKE_URL=<deployment-url> python3 scripts/smoke_web_video.py', 'Verify the deployed URL renders the installable PWA and app workflows.'),
    ],
    deploymentMode: 'static-prebuilt',
    envKeys: vercelDeploymentEnvKeys,
    generatedAt,
    privacy: {
      backendRequired: false,
      credentialValuesIncluded: false,
      localPathsIncluded: false,
      projectIdValuesIncluded: false,
      rawArtifactsIncluded: false,
      rawVideoIncluded: false,
      tokenLikeValuesIncluded: false,
    },
    schemaVersion: VERCEL_DEPLOYMENT_REPORT_SCHEMA_VERSION,
    summary: {
      actionNeededCount,
      blockedCount,
      checkCount: checks.length,
      envKeysMissing,
      envKeysPresent,
      nextAction:
        status === 'blocked'
          ? checks.find((item) => item.status === 'blocked')?.action
          : status === 'static-ready'
            ? 'Connect the Vercel project and deployment secrets, then run the prebuilt deploy commands and post-deploy smoke.'
            : 'Run the prebuilt Vercel deploy commands and post-deploy smoke against the deployment URL.',
      projectBinding: bindingState,
      status,
      verifiedCount,
    },
  };

  return assertVercelDeploymentReportIsShareSafe(report);
}

export function renderVercelDeploymentMarkdown(report) {
  const checkRows = report.checks
    .map((item) => `| ${item.label} | ${item.status} | ${item.detail} | ${item.action} |`)
    .join('\n');
  const commandRows = report.commands
    .map((item) => `| ${item.label} | \`${item.command}\` | ${item.purpose} |`)
    .join('\n');

  return `# Vercel Deployment Readiness Report

Generated: ${report.generatedAt}

- Status: ${report.summary.status}
- Deployment mode: ${report.deploymentMode}
- Checks: ${report.summary.verifiedCount}/${report.summary.checkCount}
- Action needed: ${report.summary.actionNeededCount}
- Blocked checks: ${report.summary.blockedCount}
- Project binding: ${report.summary.projectBinding}
- Backend required: no
- Credential values included: no
- Project id values included: no
- Next action: ${report.summary.nextAction}

| Check | Status | Detail | Action |
| --- | --- | --- | --- |
${checkRows}

| Command | Value | Purpose |
| --- | --- | --- |
${commandRows}
`;
}

export function writeVercelDeploymentReport({
  jsonOutputPath = resolveDefaultJsonOutputPath(),
  markdownOutputPath = resolveDefaultMarkdownOutputPath(),
  report,
} = {}) {
  const nextReport = report ?? buildVercelDeploymentReport({
    rootDir: path.resolve(path.dirname(jsonOutputPath), '../..'),
  });
  fs.mkdirSync(path.dirname(jsonOutputPath), { recursive: true });
  fs.mkdirSync(path.dirname(markdownOutputPath), { recursive: true });
  fs.writeFileSync(jsonOutputPath, `${JSON.stringify(nextReport, null, 2)}\n`);
  fs.writeFileSync(markdownOutputPath, renderVercelDeploymentMarkdown(nextReport));
  return { jsonOutputPath, markdownOutputPath, report: nextReport };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const { jsonOutputPath, markdownOutputPath, report } = writeVercelDeploymentReport();
  console.log(`Wrote Vercel deployment report to ${jsonOutputPath}`);
  console.log(`Wrote Vercel deployment summary to ${markdownOutputPath}`);
  console.log(`Status: ${report.summary.status}; checks: ${report.summary.verifiedCount}/${report.summary.checkCount}; action needed: ${report.summary.actionNeededCount}`);
  if (report.summary.status === 'blocked') {
    process.exitCode = 1;
  }
}
