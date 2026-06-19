# MoveBeta Data Governance

## Default Policy

- Raw video stays on the device.
- Standard recordings are muted because movement analysis does not need audio.
- Reports store pose landmarks, metrics, cues, timeline events, session metadata, and aggregate analysis performance.
- Android backup is disabled for local reports in the native manifest.
- Cloud sync is opt-in and should be encrypted.
- Users must be able to delete local analysis bundles, including the report, private training log, drill practice log, and
  coach consent record, without uploading or exporting raw video.
- Users must be able to create and restore a local backup of reports, private notes, drill practice records, and consent
  records without raw video, video URI, audio, account identifiers, or secrets.

## Consent

Indoor climbing videos can include other people. The app should include capture reminders, avoid background identity
features, and provide clear export controls before any sharing workflow. Coach packets require explicit per-report
athlete consent for coach review and cue validation. Consent records are stored locally with grant, revoke, and delete
behavior alongside report history.

## Sensitive Data

Pose landmarks are biometric-adjacent movement data. They should be treated as sensitive even when no face recognition is
performed. Production builds should avoid collecting more landmarks than needed for coaching feedback.

## Model Governance

Every analysis report should record the provider, model identifier, analysis duration, budget status, and processed frame
rate. That makes regressions traceable when changing from fixture landmarks to MediaPipe, Core ML, or TFLite outputs.
