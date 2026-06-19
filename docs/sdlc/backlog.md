# Product Backlog

| ID | Epic | User story | Priority | Acceptance notes |
| --- | --- | --- | --- | --- |
| MB-001 | Native inference | As a climber, I can analyze an imported clip on my phone without cloud upload | Must | Custom native provider returns pose frames |
| MB-002 | Local storage | As a climber, I can keep and delete local reports | Done | SQLite native repository plus web/local fallback |
| MB-003 | Real clip validation | As a product team, we can measure cue usefulness on consented clips | Must | Dataset contract, template, CLI gate, scoring harness, and rubric ready; needs real consented clip set |
| MB-004 | Repeat comparison | As a climber, I can compare two attempts of the same move | Done | Latest-vs-baseline metrics, cue status, and recommendation in Progress |
| MB-005 | Pro history | As a paying user, I can track long-term technique trends | Done | Active plan entitlements gate recent vs unlimited history; optional sync future |
| MB-005A | Adaptive drills | As a climber, my drill plan reacts to which cues actually helped | Done | Private cue feedback marks drills as reinforce, variant, or untested without cloud sync |
| MB-006 | Coach review | As a coach, I can review athlete reports with consent | Done | Local coach review packet with consent metadata; multi-user workspace future |
| MB-007 | Dependency hygiene | As a maintainer, I receive dependency update PRs | Done | Dependabot configured for npm and GitHub Actions; `npm ci` and CI gate pass |
| MB-008 | Native release readiness | As a maintainer, I can create internal test builds | Should | EAS profiles, app identifiers, and standard validator are configured; strict gate needs real Expo, Apple, and Google credentials |
| MB-009 | Privacy-safe observability | As a maintainer, I can inspect diagnostics without leaking sensitive data | Done | Redaction utilities, aggregate support packet, Privacy UI, and smoke coverage |
