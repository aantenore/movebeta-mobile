import { existsSync, readFileSync } from 'node:fs';

import { describe, expect, it } from 'vitest';

const templateWorkflowPath = 'docs/sdlc/ci-templates/github-actions-quality.yml';
const workflow = readFileSync(templateWorkflowPath, 'utf8');
const vercelWorkflowPath = 'docs/sdlc/ci-templates/vercel-static-deploy.yml';
const vercelWorkflow = readFileSync(vercelWorkflowPath, 'utf8');
const packageJson = JSON.parse(readFileSync('package.json', 'utf8')) as {
  engines?: { node?: string };
  scripts?: Record<string, string>;
};

describe('GitHub Actions CI template', () => {
  it('keeps the active workflow out of the repo until GitHub workflow scope is available', () => {
    expect(existsSync('.github/workflows/ci.yml')).toBe(false);
    expect(existsSync('.github/workflows/quality.yml')).toBe(false);
    expect(existsSync('.github/workflows/vercel-static-deploy.yml')).toBe(false);
  });

  it('runs the shared local release gate on pushes and pull requests when activated', () => {
    expect(packageJson.engines?.node).toBe('>=24 <25');
    expect(packageJson.scripts?.ci).toBe('npm run release:check');
    expect(workflow).toContain('push:');
    expect(workflow).toContain('branches:');
    expect(workflow).toContain('- main');
    expect(workflow).toContain('pull_request:');
    expect(workflow).toContain('uses: actions/checkout@v4');
    expect(workflow).toContain('uses: actions/setup-node@v4');
    expect(workflow).toContain('node-version-file: package.json');
    expect(workflow).toContain('run: npm ci');
    expect(workflow).toContain('run: npm run ci');
  });

  it('keeps release evidence downloadable without requiring committed CI outputs when activated', () => {
    expect(workflow).toContain('uses: actions/upload-artifact@v4');
    expect(workflow).toContain('if: always()');
    expect(workflow).toContain('docs/sdlc/release-gate-report.json');
    expect(workflow).toContain('docs/sdlc/movenet-readiness-report.json');
    expect(workflow).toContain('docs/sdlc/model-analysis-replay-report.json');
    expect(workflow).toContain('docs/sdlc/model-verification-suite-report.json');
    expect(workflow).toContain('docs/sdlc/native-qa-runbook.json');
    expect(workflow).toContain('docs/sdlc/ios-toolchain-report.json');
    expect(workflow).toContain('docs/sdlc/store-credentials-report.json');
    expect(workflow).toContain('docs/sdlc/cue-validation-dataset-report.json');
    expect(workflow).toContain('docs/sdlc/launch-readiness-report.json');
    expect(workflow).toContain('docs/sdlc/release-blocker-issues-report.json');
    expect(workflow).toContain('docs/store/store-submission-packet.json');
  });

  it('provides a static Vercel PWA deploy template without committing an active workflow', () => {
    expect(vercelWorkflow).toContain('name: Deploy Static PWA to Vercel');
    expect(vercelWorkflow).toContain('push:');
    expect(vercelWorkflow).toContain('- main');
    expect(vercelWorkflow).toContain('workflow_dispatch:');
    expect(vercelWorkflow).toContain('uses: actions/checkout@v4');
    expect(vercelWorkflow).toContain('uses: actions/setup-node@v4');
    expect(vercelWorkflow).toContain('node-version-file: package.json');
    expect(vercelWorkflow).toContain('run: npm ci');
    expect(vercelWorkflow).toContain('run: npm run release:check');
    expect(vercelWorkflow).toContain('run: npm run export:web');
    expect(vercelWorkflow).toContain('run: npm run web:pwa:check');
    expect(vercelWorkflow).toContain('run: npm run web:vercel:check');
    expect(vercelWorkflow).toContain('secrets.VERCEL_TOKEN');
    expect(vercelWorkflow).toContain('secrets.VERCEL_ORG_ID');
    expect(vercelWorkflow).toContain('secrets.VERCEL_PROJECT_ID');
    expect(vercelWorkflow).toContain('npx vercel pull --yes --environment=production --token=${{ secrets.VERCEL_TOKEN }}');
    expect(vercelWorkflow).toContain('npx vercel build --prod --token=${{ secrets.VERCEL_TOKEN }}');
    expect(vercelWorkflow).toContain('npx vercel deploy --prebuilt --prod --token=${{ secrets.VERCEL_TOKEN }}');
    expect(vercelWorkflow).toContain('MOVEBETA_SMOKE_URL: ${{ steps.deploy.outputs.url }}');
    expect(vercelWorkflow).toContain('python3 scripts/smoke_web_video.py');
    expect(vercelWorkflow).toContain('uses: actions/upload-artifact@v4');
    expect(vercelWorkflow).toContain('docs/sdlc/release-gate-report.json');
    expect(vercelWorkflow).toContain('docs/sdlc/vercel-deployment-report.json');
    expect(vercelWorkflow).toContain('dist/sw.js');
  });
});
