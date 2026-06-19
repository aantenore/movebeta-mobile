# Contributing

## Delivery Mode

Default mode is code-only until a maintainer explicitly asks for a commit, branch push, pull request, or release. Keep
changes small, reviewable, and aligned with the provider-agnostic architecture.

## Local Quality Gate

```bash
npm ci
npm run release:check
```

## Change Workflow

1. Update or confirm the relevant requirement in `docs/requirements.md` or `docs/sdlc/delivery-contract.md`.
2. Add or update tests for changed domain behavior.
3. Keep raw video handling privacy-first by default.
4. Record consequential architecture choices as ADRs in `docs/adr/`.
5. Update `CHANGELOG.md` for user-visible or release-relevant changes.

## Code Style

- Use TypeScript strict mode.
- Keep modules configurable and replaceable.
- Keep comments in English and only where they clarify non-obvious intent.
- Do not hard-code provider-specific behavior into UI screens.

## Pull Request Expectations

Every PR should include scope, acceptance evidence, tests run, screenshots for UI changes, privacy impact, and rollback
notes when relevant.
