# GitHub Workflow Report

Generated: 2026-06-20T02:06:46.680Z

- Status: blocked
- Token included: no
- Next action: Copy the quality workflow template to .github/workflows/quality.yml after the GitHub token has workflow scope.

| Check | Status | Detail | Action |
| --- | --- | --- | --- |
| Workflow template | pass | docs/sdlc/ci-templates/github-actions-quality.yml exists. | Restore docs/sdlc/ci-templates/github-actions-quality.yml before CI activation. |
| Active workflow file | fail | .github/workflows/quality.yml is not committed. | Copy the quality workflow template to .github/workflows/quality.yml after the GitHub token has workflow scope. |
| Workflow/template parity | warn | Skipped until the active workflow file is committed. | Keep .github/workflows/quality.yml byte-for-byte aligned with docs/sdlc/ci-templates/github-actions-quality.yml. |
| GitHub CLI | pass | gh version 2.95.0 (2026-06-17) | Install GitHub CLI and authenticate before activating repository workflows. |
| GitHub workflow OAuth scope | fail | github.com   X Failed to log in to github.com account aantenore (keyring)   - Active account: true   - The token in keyring is invalid.   - To re-authenticate, run: gh auth refresh -h github.com   - To forget about this account, run: gh auth logout -h github.com -u aantenore | Run gh auth refresh -h github.com -s workflow, then copy the template to .github/workflows/quality.yml and push. |
