# Security Policy

## Supported Surface

This prototype is not a production medical, safety, or biometric decision system. Security review focuses on local video
privacy, landmark/report handling, dependency risk, and explicit consent before sync or export.

## Reporting

For private vulnerability handling, do not create public issues with sensitive details. Share:

- affected version or commit;
- reproduction steps;
- impact;
- whether raw video, landmarks, or personal data are exposed;
- suggested mitigation when known.

## Baseline Controls

- Raw video must stay on-device unless a user explicitly exports or opts into sync.
- Reports should store minimal landmarks, metrics, cues, and session metadata.
- Secrets must not be committed.
- Dependency vulnerabilities at high or critical severity block release until triaged.
- Native camera and model adapters require a privacy review before merge.
