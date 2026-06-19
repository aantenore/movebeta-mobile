# Definition Of Done

An increment is done only when these checks are satisfied or an explicit residual risk is recorded.

## Product

- User workflow and non-goals are documented.
- Copy avoids medical, injury-prevention, or route-safety claims.
- Freemium or monetization changes do not alter privacy defaults.

## Engineering

- TypeScript strict mode passes.
- Movement and privacy logic has focused tests.
- Provider-specific behavior is isolated behind contracts.
- Configuration is documented in `.env.example`.

## UX

- Main tab flows render on mobile and web preview.
- Loading, empty, and report states are understandable.
- No horizontal overflow on narrow mobile viewport.

## Security And Privacy

- Raw video is not uploaded by default.
- High or critical dependency findings are triaged before release.
- Native camera/model changes include consent and data-retention review.

## Operations

- Release checklist is updated.
- Changelog is updated for user-visible changes.
- Rollback path is known.
- Incident follow-ups are tracked when defects are found.
