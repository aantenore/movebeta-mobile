# Privacy Threat Model

## Assets

- Raw climbing videos.
- Pose landmarks and derived movement metrics.
- Session metadata.
- Consent preferences.
- Diagnostic events.

## Trust Boundaries

- Device media library to app sandbox.
- App sandbox to optional diagnostics export.
- Future app sandbox to encrypted sync.
- Future coach/team sharing boundary.

## Threats And Controls

| Threat | Impact | Control |
| --- | --- | --- |
| Raw video uploaded without consent | High privacy breach | Consent gates, default local mode, release checklist |
| Landmark data treated as harmless telemetry | Biometric-adjacent leakage | Minimize artifacts, redact diagnostics, document retention |
| Diagnostics include private file URIs or frame data | Privacy leakage | `sanitizeDiagnostics` redacts sensitive keys |
| Coach packet prepared without athlete consent | Trust and policy risk | Explicit per-report coach review and cue validation consent gate |
| Gym bystanders captured | Consent and policy risk | Capture setup blockers, capture reminders, and export controls |
| Deletion does not remove all local report-adjacent data | Trust and compliance risk | Privacy deletion bundle removes reports, private training logs, and coach consent records together |
| Consent state lost between sessions | Trust and auditability risk | Durable local consent records with grant, revoke, and report-delete cleanup |

## Open Items

- Add encrypted multi-user consent records before future cloud coach/team workspaces.
- Define encrypted sync threat model before implementing cloud features.
