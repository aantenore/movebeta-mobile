# Incident Response

## Severity

| Severity | Meaning | Response |
| --- | --- | --- |
| P0 | Data loss, privacy exposure, destructive behavior, production outage | Stop release, preserve evidence, notify owner |
| P1 | Core analysis workflow broken or release blocked | Triage immediately, fix or rollback, add regression test |
| P2 | Important issue with workaround | Fix in current milestone when practical |
| P3 | Minor defect or cleanup | Track in backlog |

## Template

Create incidents at `docs/incidents/YYYY-MM-DD-short-title.md`.

```markdown
# Incident: title

Date:
Severity:
Status:

## Impact

## Detection

## Timeline

## Root Cause Hypothesis

## Fix

## Verification

## Regression Prevention

## Follow-Ups
| Action | Owner | Priority | Status |
| --- | --- | --- | --- |
```
