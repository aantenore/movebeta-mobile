# MoveBeta Requirements

## Functional

- Record a short climbing attempt in-app and normalize it as a local video source.
- Record local attempts with a configurable muted video profile and no default audio permission.
- Import a video from the media library and normalize it as a local video source.
- Read real local video duration and dimensions through the native bridge when available before intake and analysis.
- Let users set session metadata for recorded/imported attempts, including title, gym or wall, grade or focus, and wall
  angle.
- Let users calibrate capture setup before recording, including framing, view angle, distance, lighting, wall contrast,
  phone stability, and visible bystanders.
- Preview the selected local video before or after analysis.
- Validate selected video intake before analysis, including local URI, minimum duration, expected sampled frames, and
  resolution warnings.
- Analyze a short climbing attempt locally from camera, import, or fixture input in this runnable MVP.
- Keep camera capture, video import, fixture input, and native pose providers behind replaceable contracts.
- Let users choose between multiple bundled local attempts as a fallback/demo path.
- Produce pose-derived metrics: flow, pause time, bent-arm load, hip drift, and likely foot cuts.
- Generate coaching cues with timestamp, severity, explanation, and drill.
- Score coach cue validation reviews with a repeatable rubric for consented clip evaluation.
- Validate consented cue-review datasets with configurable thresholds for clip count, wall-angle coverage, reviewer
  coverage, review mode, score quality, and raw-artifact exclusion.
- Generate a weekly drill plan from local report cues with priority, dosage, and evidence.
- Show a key-frame pose overlay and timeline events.
- Show analysis quality, frame coverage, landmark coverage, visibility, and warnings before coaching cues.
- Convert analysis quality into capture-readiness guidance so users know when to trust cues or retake the clip.
- Block recording when capture setup has privacy or pose-extraction blockers.
- Measure local video analysis duration, budget status, and processed frame rate in each report.
- Keep raw video on-device by default.
- Persist local reports with native SQLite or browser/local fallback storage and support refresh, JSON export, and deletion.
- Delete a local analysis bundle as one privacy action, covering the report, private training log, and coach consent record
  while confirming that raw video was not included or uploaded.
- Export and restore a versioned local backup JSON containing reports, private training logs, and coach consent records
  without raw video, video URI, audio, account identifiers, or secrets.
- Show a selectable session review for local reports with quality, performance, focus metric, primary cue, timeline, and
  privacy evidence.
- Let users keep private per-report training notes with project status, perceived effort, confidence, and local tags.
- Summarize private training logs into a local project queue with active projects, repeat count, sent count, effort, and
  next repeat action.
- Persist configured session metadata in reports, exports, trends, drills, and coach review packets.
- Persist per-report coach review consent records with grant, revoke, and delete behavior.
- Prepare a coach review packet only after explicit athlete consent, without raw video, video URI, or key-frame landmarks.
- Prepare a local diagnostics support packet without raw video, video URI, key frames, pose landmarks, account identifiers, or secrets.
- Show an airplane-mode readiness self-check for local analysis, local storage, cloud sync, raw export, and report history.
- Summarize local report history into attempt count, average quality, best signal, next focus, and metric trends.
- Filter local progress history and project queue by wall angle, grade, and gym.
- Compare the latest local attempt with the previous report using metric deltas, quality delta, cue status, and a next-repeat recommendation.
- Apply capability-based Free, Pro, and Coach entitlements without hard-coding pricing into the movement engine.
- Generate store readiness metadata, privacy declarations, and screenshot plans from release configuration.
- Expose provider, active plan, and privacy mode in configuration.

## Non-Functional

- The UI must work on small mobile screens and web preview.
- Domain logic must be testable without a camera or native runtime.
- Native pose providers must be replaceable through one interface.
- Reports must be schema-validated before display or storage.
- Corrupted local report storage must not block app startup.
- Corrupted local consent storage must not block app startup or session history.
- Corrupted local training-log storage must not block app startup or session history.
- Local deletion must clean orphaned training-log and consent records even when the report record is already missing.
- Backup restore must validate schema version, reject URI-like raw-video artifacts, and skip orphan training-log or
  consent records whose reports are not present in the backup.
- Video analysis performance budgets must be testable without a native runtime and visible in local reports.
- Video metadata extraction must degrade to picker/timer values when native or browser metadata is unavailable.
- Pose providers should skip incomplete per-frame detections and fail only when too few complete frames remain.
- Cue validation datasets must reject raw video URIs, key frames, pose landmarks, and incomplete review coverage before
  production movement-quality claims.
- Android builds must keep camera/import permissions aligned with the video workflow, exclude audio permission, and
  disable backup for sensitive local reports.
- The app must avoid medical or safety guarantees.

## Out Of Scope For This Prototype

- Native pose extraction inside Expo Go.
- Cloud sync, accounts, subscriptions, or payment integration.
- Injury-risk scoring.
- Automated grade prediction.
