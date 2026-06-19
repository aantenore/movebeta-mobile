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
- Coach library batch exports must use consented queue metadata and team templates only, with no raw video, URI, private
  notes, drill notes, pose frames, key frames, or landmarks.
- Cue-validation study seeds must include review tasks and thresholds only; reviewer scores must come from real reviewers
  and raw artifacts must stay out of the seed.
- Cue-validation review worksheets must keep reviewer identity and score fields blank until a real coach fills them.
- Cue-validation worksheet CSV exports must keep reviewer identity and score cells blank until a real coach fills them.
- Completed worksheet CSV processing must verify reviewer identity, score range, row identity, and seed match before
  building dataset JSON.

## Consent

Indoor climbing videos can include other people. The app should include capture reminders, avoid background identity
features, and provide clear export controls before any sharing workflow. Coach packets require explicit per-report
athlete consent for coach review and cue validation. Consent records are stored locally with grant, revoke, and delete
behavior alongside report history.
- Batch coach-library exports must remain local until the user explicitly shares them.
- Cue-validation study seeds must remain local until the user explicitly shares them with reviewers.
- Cue-validation review worksheets must remain local until the user explicitly shares them with reviewers.
- Cue-validation worksheet CSV exports must remain local until the user explicitly shares them with reviewers.
- Completed worksheet CSV files must remain local until the user explicitly validates and shares the resulting dataset.
- Sessions dataset preparation must keep the completed CSV and generated dataset in local UI state unless the user exports it.
- Prepared export sharing must be an explicit user action through the local device share sheet.

## Sensitive Data

Pose landmarks are biometric-adjacent movement data. They should be treated as sensitive even when no face recognition is
performed. Production builds should avoid collecting more landmarks than needed for coaching feedback.

## Model Governance

Every analysis report should record the provider, model identifier, analysis duration, budget status, and processed frame
rate. That makes regressions traceable when changing from fixture landmarks to MediaPipe, Core ML, or TFLite outputs.
