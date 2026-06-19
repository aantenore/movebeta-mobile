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
- Prepare a local cue-validation study seed from active consented coach packets with packet-only review tasks, target
  thresholds, and no invented reviewer scores.
- Prepare a local cue-validation review worksheet from the study seed with blank reviewer identities, blank score fields,
  packet-only review mode, and no raw artifacts.
- Prepare a privacy-safe cue-validation worksheet CSV with stable headers, escaped cells, and blank reviewer/score cells.
- Generate a weekly drill plan from local report cues with priority, dosage, and evidence.
- Adapt weekly drill plans from private cue feedback by reinforcing useful cues and flagging unclear or not-useful cues
  for variants.
- Let users mark generated drills as completed or skipped in a private on-device practice log.
- Summarize private drill practice into completion rate, latest drill status, skipped cue review signal, and next
  practice recommendation.
- Show a key-frame pose overlay and timeline events.
- Show analysis quality, frame coverage, landmark coverage, visibility, and warnings before coaching cues.
- Convert analysis quality into capture-readiness guidance so users know when to trust cues or retake the clip.
- Block recording when capture setup has privacy or pose-extraction blockers.
- Measure local video analysis duration, budget status, and processed frame rate in each report.
- Keep raw video on-device by default.
- Persist local reports with native SQLite or browser/local fallback storage and support refresh, JSON export, and deletion.
- Delete a local analysis bundle as one privacy action, covering the report, private training log, drill practice log, and
  coach consent record while confirming that raw video was not included or uploaded.
- Export and restore a versioned local backup JSON containing reports, private training logs, drill practice logs, and
  coach consent records without raw video, video URI, audio, account identifiers, or secrets.
- Show a selectable session review for local reports with quality, performance, focus metric, primary cue, timeline, and
  privacy evidence.
- Let users keep private per-report training notes with project status, perceived effort, confidence, and local tags.
- Let users mark local coach cues as useful, unclear, or not useful inside the private per-report training log.
- Summarize private training logs into a local project queue with active projects, repeat count, sent count, effort, and
  next repeat action.
- Persist configured session metadata in reports, exports, trends, drills, and coach review packets.
- Persist per-report coach review consent records with grant, revoke, and delete behavior.
- Prepare a coach review packet only after explicit athlete consent, without raw video, video URI, or key-frame landmarks.
- Add privacy-safe athlete context to coach review packets from local training-log scores, cue feedback ratings, and drill
  practice counts while excluding private note text and drill notes.
- Show a local coach library queue from active consented reports with review priority, signal status, feedback counts,
  practice counts, and no raw video artifacts.
- Generate reusable local coach team templates from consented review signals for high-priority review, follow-through,
  signal retake, and privacy-safe packet review workflows.
- Prepare a versioned local coach library export from consented queue metadata and team templates without raw video,
  video URI, private notes, drill notes, pose frames, key frames, or landmarks.
- Prepare a local diagnostics support packet without raw video, video URI, key frames, pose landmarks, account identifiers, or secrets.
- Show an airplane-mode readiness self-check for local analysis, local storage, cloud sync, raw export, and report history.
- Summarize local report history into attempt count, average quality, best signal, next focus, and metric trends.
- Filter local progress history and project queue by wall angle, grade, and gym.
- Summarize personal benchmarks for best overall, wall angle, grade, and gym attempts from local report history.
- Generate a next-session plan from technique readiness, personal benchmarks, drill evidence, and private project notes.
- Adjust next-session plans from private drill practice consistency by lowering intensity and prescribing easier variants
  when skipped drills exceed completed drills.
- Summarize recurring coach cue patterns as persistent, emerging, or cleared across local reports.
- Summarize private cue usefulness feedback into useful rate, top useful cue, and review cue signals.
- Generate a local technique readiness plan from report trends, cue severity, private project status, effort, confidence,
  and drill evidence.
- Compare the latest local attempt with the previous report using metric deltas, quality delta, cue status, and a next-repeat recommendation.
- Apply capability-based Free, Pro, and Coach entitlements without hard-coding pricing into the movement engine.
- Show a configurable Plan tab with current plan, upgrade path, capability matrix, and billing-provider readiness.
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
- Corrupted local drill-practice storage must not block app startup or drill planning.
- Legacy training logs without cue feedback must remain readable and default to an empty feedback list.
- Local deletion must clean orphaned training-log, drill-practice, and consent records even when the report record is
  already missing.
- Backup restore must validate schema version, reject URI-like raw-video artifacts, and skip orphan training-log,
  drill-practice, or consent records whose reports are not present in the backup.
- Technique readiness must degrade to a baseline recommendation when no local reports exist.
- Personal benchmarks must return an empty state when no local reports exist and keep at least one top benchmark per
  supported segment when reports are present.
- Session planning must degrade to a baseline block when no reports exist and must avoid max-intensity guidance during
  recovery states.
- Cue pattern summaries must return an empty state without local cues and must keep cleared counts independent of UI
  display limits.
- Cue usefulness summaries must ignore orphan training logs and return an empty state before feedback exists.
- Adaptive drill plans must ignore orphan training logs and keep producing untested drill feedback when no cue feedback
  exists.
- Drill practice summaries must ignore orphan practice records and return an empty state before practice is logged.
- Coach review packets must ignore orphan training logs or drill records and must never include private note text or
  drill-practice notes.
- Coach library entries must ignore revoked or orphan consent records and expose only privacy-safe review metadata.
- Coach team templates must not include private notes, drill notes, raw video URIs, key frames, or landmarks.
- Coach library exports must validate schema version and reject forbidden raw artifact keys before handoff.
- Plan catalog copy must be generated from capability descriptors and plan entitlements without payment-provider coupling.
- Video analysis performance budgets must be testable without a native runtime and visible in local reports.
- Video metadata extraction must degrade to picker/timer values when native or browser metadata is unavailable.
- Pose providers should skip incomplete per-frame detections and fail only when too few complete frames remain.
- Cue validation datasets must reject raw video URIs, key frames, pose landmarks, and incomplete review coverage before
  production movement-quality claims.
- Cue validation study seeds must not include raw video, URI, pose frames, key frames, landmarks, private notes, drill
  notes, or generated reviewer scores.
- Cue validation review worksheets must keep reviewer identities and score fields empty until real coach review is entered.
- Cue validation worksheet CSV exports must reject raw artifact references and keep reviewer/score cells blank.
- Android builds must keep camera/import permissions aligned with the video workflow, exclude audio permission, and
  disable backup for sensitive local reports.
- The app must avoid medical or safety guarantees.

## Out Of Scope For This Prototype

- Native pose extraction inside Expo Go.
- Cloud sync, accounts, subscriptions, or payment integration.
- Injury-risk scoring.
- Automated grade prediction.
