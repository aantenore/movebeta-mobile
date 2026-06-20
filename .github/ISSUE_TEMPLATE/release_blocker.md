---
name: Release blocker
about: Track one external proof or access item required before beta or store release.
title: "[Release Blocker] "
labels: release-blocker
assignees: ""
---

## Blocker

Describe the external proof, account access, credential setup, device run, or dataset that is still missing.

## Owner

Engineering / QA / Product / Release.

## Affected Tracks

Demo / internal native beta / store submission.

## Acceptance

- [ ] Acceptance criteria are copied from the release blocker issue packet.
- [ ] Required proof is attached as a share-safe report, screenshot, or CI/EAS output.
- [ ] Release readiness has been rerun after proof is available.

## Required Proof

List only share-safe artifact names, command output summaries, or report paths from the repository.

## Commands

```bash
npm run release:readiness
npm run release:check
```

## Secret Policy

Do not paste credential values, private keys, access tokens, raw videos, absolute local paths, or raw local artifacts.
