#!/usr/bin/env bash
set -euo pipefail

if ! git rev-parse --is-inside-work-tree >/dev/null 2>&1; then
  echo "No Git repository found. Initialize one before commit or push handoff."
  exit 2
fi

if ! git remote get-url origin >/dev/null 2>&1; then
  echo "No origin remote configured. Add a repository remote before pushing."
  exit 3
fi

current_branch="$(git branch --show-current)"
if [[ -z "$current_branch" ]]; then
  echo "Detached HEAD. Create or switch to a branch before pushing."
  exit 4
fi

echo "Git handoff target:"
echo "  branch: $current_branch"
echo "  origin: $(git remote get-url origin)"
echo
echo "Working tree status:"
git status --short
