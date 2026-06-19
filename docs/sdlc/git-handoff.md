# Git Handoff

This deliverable is currently a project folder, not a connected Git repository. Commit and push handoff requires a real
remote owned by the project.

## Check Handoff State

```bash
npm run handoff:git
```

The command fails clearly when the folder has no Git repository, no `origin`, or a detached branch.

## First Push From This Folder

Use these commands only after choosing the target repository:

```bash
git init
git add .
git commit -m "feat: add on-device climbing video coach"
git branch -M main
git remote add origin <repository-url>
git push -u origin main
```

The existing `.gitignore` excludes local toolchains, dependencies, web exports, Android build output, iOS Pods, and cache
folders. Generated `ios` and `android` folders are ignored by default for a managed Expo workflow; include them only if
the project decides to own prebuilt native projects in Git.
