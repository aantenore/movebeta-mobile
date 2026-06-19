# Git Handoff

This deliverable is connected to a private GitHub repository:

- Remote: `https://github.com/aantenore/movebeta-mobile.git`
- Default branch: `main`
- Visibility: private

## Check Handoff State

```bash
npm run handoff:git
```

The command prints the current branch and `origin`, and fails clearly when the folder has no Git repository, no `origin`,
or a detached branch.

## CI Workflow Template

The quality workflow is stored as a template at:

`docs/sdlc/ci-templates/github-actions-quality.yml`

Move it to `.github/workflows/quality.yml` after the GitHub token used for push has the `workflow` scope. GitHub rejects
OAuth pushes that create or update active workflow files without that scope.

The existing `.gitignore` excludes local toolchains, dependencies, web exports, Android build output, iOS Pods, and cache
folders. Generated `ios` and `android` folders are ignored by default for a managed Expo workflow; include them only if
the project decides to own prebuilt native projects in Git.
