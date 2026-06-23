import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const VERCEL_WORKFLOW_REPORT_SCHEMA_VERSION = 'movebeta.vercel-workflow-readiness.v1';

export const vercelWorkflowRequiredSecrets = ['VERCEL_TOKEN', 'VERCEL_ORG_ID', 'VERCEL_PROJECT_ID'];

const requiredTemplateSnippets = [
  'name: Deploy Static PWA to Vercel',
  'push:',
  '- main',
  'workflow_dispatch:',
  'uses: actions/checkout@v4',
  'uses: actions/setup-node@v4',
  'node-version-file: package.json',
  'run: npm ci',
  'run: npm run release:check',
  'run: npm run export:web',
  'run: npm run model:movenet:assets:check',
  'run: npm run model:assets:provenance',
  'run: npm run web:pwa:check',
  'run: npm run web:vercel:check',
  'npx vercel pull --yes --environment=production --token=${{ secrets.VERCEL_TOKEN }}',
  'npx vercel build --prod --token=${{ secrets.VERCEL_TOKEN }}',
  'npx vercel deploy --prebuilt --prod --token=${{ secrets.VERCEL_TOKEN }}',
  'MOVEBETA_SMOKE_URL: ${{ steps.deploy.outputs.url }}',
  'python3 scripts/smoke_web_video.py',
  'uses: actions/upload-artifact@v4',
  'docs/sdlc/vercel-deployment-report.json',
  'docs/sdlc/movenet-static-assets-report.json',
  'docs/sdlc/model-asset-provenance-report.json',
  'docs/sdlc/model-asset-attribution.md',
  'dist/model-assets.json',
  'dist/sw.js',
];

const forbiddenValuePattern =
  /(file:\/\/|content:\/\/|asset:\/\/|ph:\/\/|\/Users\/|\/private\/|\/var\/mobile\/|[A-Za-z]:\\|\.mov\b|\.mp4\b|BEGIN PRIVATE KEY|ghp_[A-Za-z0-9_]+|github_pat_[A-Za-z0-9_]+|pat_[A-Za-z0-9_]+|sk_live_[A-Za-z0-9_]+|sk_test_[A-Za-z0-9_]+|bearer\s+[A-Za-z0-9._-]+|eyJ[A-Za-z0-9_-]{20,})/i;

export function resolveProjectRoot() {
  return path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
}

export function resolveDefaultJsonPath(rootDir = resolveProjectRoot()) {
  return path.join(rootDir, 'docs/sdlc/vercel-workflow-report.json');
}

export function resolveDefaultMarkdownPath(rootDir = resolveProjectRoot()) {
  return path.join(rootDir, 'docs/sdlc/vercel-workflow-report.md');
}

function readTextIfExists(filePath) {
  if (!fs.existsSync(filePath)) return undefined;
  return fs.readFileSync(filePath, 'utf8');
}

function check({ action, detail, key, label, status }) {
  return { action, detail, key, label, status };
}

function containsForbiddenValue(value) {
  if (typeof value === 'string') return forbiddenValuePattern.test(value);
  if (Array.isArray(value)) return value.some(containsForbiddenValue);
  if (value && typeof value === 'object') return Object.values(value).some(containsForbiddenValue);
  return false;
}

function reportStatus(checks) {
  if (checks.some((item) => item.status === 'blocked')) return 'blocked';
  if (checks.some((item) => item.status === 'action-needed')) return 'template-ready';
  return 'active-ready';
}

function missingSnippets(template = '') {
  return requiredTemplateSnippets.filter((snippet) => !template.includes(snippet));
}

function missingSecretReferences(template = '') {
  return vercelWorkflowRequiredSecrets.filter((secret) => !template.includes(`secrets.${secret}`));
}

export function assertVercelWorkflowReportIsShareSafe(report) {
  if (containsForbiddenValue(report)) {
    throw new Error('Vercel workflow report contains credential values, local paths, raw artifacts, raw video references, or token-like data.');
  }
  return report;
}

export function buildVercelWorkflowReport({
  generatedAt = new Date().toISOString(),
  rootDir = resolveProjectRoot(),
} = {}) {
  const templatePath = path.join(rootDir, 'docs/sdlc/ci-templates/vercel-static-deploy.yml');
  const activeWorkflowPath = path.join(rootDir, '.github/workflows/vercel-static-deploy.yml');
  const template = readTextIfExists(templatePath);
  const activeWorkflow = readTextIfExists(activeWorkflowPath);
  const templateExists = typeof template === 'string';
  const activeWorkflowExists = typeof activeWorkflow === 'string';
  const activeMatchesTemplate = templateExists && activeWorkflowExists && activeWorkflow === template;
  const templateMissingSnippets = missingSnippets(template);
  const missingSecrets = missingSecretReferences(template);

  const checks = [
    check({
      action: 'Keep docs/sdlc/ci-templates/vercel-static-deploy.yml committed as the activation source.',
      detail: templateExists
        ? 'Vercel static deployment workflow template exists in docs/sdlc/ci-templates.'
        : 'Vercel static deployment workflow template is missing.',
      key: 'workflow-template',
      label: 'Workflow template',
      status: templateExists ? 'verified' : 'blocked',
    }),
    check({
      action: 'Keep the template on main push plus manual workflow_dispatch, with release gate before deployment.',
      detail:
        templateMissingSnippets.length === 0
          ? 'Template contains release gate, static export, PWA/Vercel checks, prebuilt deployment, deployed smoke, and artifact upload.'
          : `Template is missing required snippets: ${templateMissingSnippets.join(', ')}.`,
      key: 'template-contract',
      label: 'Template deployment contract',
      status: templateMissingSnippets.length === 0 ? 'verified' : 'blocked',
    }),
    check({
      action: 'Reference only GitHub secret names for Vercel deployment credentials.',
      detail:
        missingSecrets.length === 0
          ? 'Template references VERCEL_TOKEN, VERCEL_ORG_ID, and VERCEL_PROJECT_ID through GitHub secrets.'
          : `Template is missing Vercel secret references: ${missingSecrets.join(', ')}.`,
      key: 'secret-references',
      label: 'Secret references',
      status: missingSecrets.length === 0 ? 'verified' : 'blocked',
    }),
    check({
      action: 'Copy the template to .github/workflows/vercel-static-deploy.yml only after the GitHub token has workflow scope and Vercel secrets exist.',
      detail: activeWorkflowExists
        ? '.github/workflows/vercel-static-deploy.yml is committed.'
        : '.github/workflows/vercel-static-deploy.yml is not committed; activation is intentionally deferred.',
      key: 'active-workflow',
      label: 'Active workflow file',
      status: activeWorkflowExists ? 'verified' : 'action-needed',
    }),
    check({
      action: 'Keep the active Vercel workflow byte-for-byte aligned with the documented template.',
      detail: activeWorkflowExists
        ? activeMatchesTemplate
          ? 'Active workflow matches the documented Vercel template.'
          : 'Active workflow differs from the documented Vercel template.'
        : 'Skipped until the active Vercel workflow file is committed.',
      key: 'active-template-parity',
      label: 'Active/template parity',
      status: activeWorkflowExists ? (activeMatchesTemplate ? 'verified' : 'blocked') : 'action-needed',
    }),
  ];
  const status = reportStatus(checks);
  const report = {
    checks,
    generatedAt,
    privacy: {
      credentialValuesIncluded: false,
      localPathsIncluded: false,
      rawArtifactsIncluded: false,
      rawVideoIncluded: false,
      secretValuesIncluded: false,
      tokenLikeValuesIncluded: false,
    },
    schemaVersion: VERCEL_WORKFLOW_REPORT_SCHEMA_VERSION,
    summary: {
      actionNeededCount: checks.filter((item) => item.status === 'action-needed').length,
      activeMatchesTemplate,
      activeWorkflowExists,
      blockedCount: checks.filter((item) => item.status === 'blocked').length,
      checkCount: checks.length,
      nextAction:
        status === 'blocked'
          ? checks.find((item) => item.status === 'blocked')?.action
          : status === 'template-ready'
            ? 'Add Vercel GitHub secrets and copy the template to .github/workflows/vercel-static-deploy.yml when workflow scope is available.'
            : 'Push the active workflow and confirm Vercel production deployment plus post-deploy smoke pass.',
      status,
      templateExists,
      verifiedCount: checks.filter((item) => item.status === 'verified').length,
    },
    templatePath: 'docs/sdlc/ci-templates/vercel-static-deploy.yml',
    workflowPath: '.github/workflows/vercel-static-deploy.yml',
  };

  return assertVercelWorkflowReportIsShareSafe(report);
}

export function renderVercelWorkflowMarkdown(report) {
  const rows = report.checks
    .map((item) => `| ${item.label} | ${item.status} | ${item.detail.replace(/\n/g, ' ')} | ${item.action} |`)
    .join('\n');

  return `# Vercel Workflow Report

Generated: ${report.generatedAt}

- Status: ${report.summary.status}
- Checks: ${report.summary.verifiedCount}/${report.summary.checkCount}
- Action needed: ${report.summary.actionNeededCount}
- Blocked checks: ${report.summary.blockedCount}
- Template path: ${report.templatePath}
- Active workflow path: ${report.workflowPath}
- Credential values included: no
- Secret values included: no
- Next action: ${report.summary.nextAction}

| Check | Status | Detail | Action |
| --- | --- | --- | --- |
${rows}
`;
}

export function writeVercelWorkflowReport({
  jsonPath = resolveDefaultJsonPath(),
  markdownPath = resolveDefaultMarkdownPath(),
  report,
} = {}) {
  const rootDir = path.resolve(path.dirname(jsonPath), '../..');
  const nextReport = report ?? buildVercelWorkflowReport({ rootDir });
  fs.mkdirSync(path.dirname(jsonPath), { recursive: true });
  fs.writeFileSync(jsonPath, `${JSON.stringify(nextReport, null, 2)}\n`);
  fs.writeFileSync(markdownPath, renderVercelWorkflowMarkdown(nextReport));
  return { jsonPath, markdownPath, report: nextReport };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const { jsonPath, markdownPath, report } = writeVercelWorkflowReport();
  console.log(`Wrote Vercel workflow report to ${jsonPath}`);
  console.log(`Wrote Vercel workflow summary to ${markdownPath}`);
  console.log(`Status: ${report.summary.status}; checks: ${report.summary.verifiedCount}/${report.summary.checkCount}; action needed: ${report.summary.actionNeededCount}`);
  if (report.summary.status === 'blocked') {
    process.exitCode = 1;
  }
}
