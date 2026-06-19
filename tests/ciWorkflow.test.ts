import { existsSync, readFileSync } from 'node:fs';

import { describe, expect, it } from 'vitest';

const workflow = readFileSync('docs/sdlc/ci-templates/github-actions-quality.yml', 'utf8');
const packageJson = JSON.parse(readFileSync('package.json', 'utf8')) as {
  engines?: { node?: string };
  scripts?: Record<string, string>;
};

describe('GitHub Actions CI template', () => {
  it('keeps the active workflow out of the repo until GitHub workflow scope is available', () => {
    expect(existsSync('.github/workflows/ci.yml')).toBe(false);
    expect(existsSync('.github/workflows/quality.yml')).toBe(false);
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
    expect(workflow).toContain('docs/sdlc/native-qa-runbook.json');
  });
});
