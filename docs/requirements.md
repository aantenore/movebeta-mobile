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
- Build a versioned cue-validation dataset JSON from a completed worksheet CSV only when reviewer identities and all 1-5 scores
  are present and every row matches the original study seed.
- Let users paste completed cue-validation worksheet CSV in Sessions and prepare the gate-compatible dataset JSON locally.
- Show a local cue-validation gate preview after dataset composition, including ready or needs-data status and failed checks.
- Show a local real-world validation campaign tracker with consented clip progress, review-row progress, wall-angle gaps,
  completed worksheet gate status, next action, and privacy-safe status export.
- Generate a weekly drill plan from local report cues with priority, dosage, and evidence.
- Adapt weekly drill plans from private cue feedback by reinforcing useful cues and flagging unclear or not-useful cues
  for variants.
- Let users mark generated drills as completed or skipped in a private on-device practice log.
- Summarize private drill practice into completion rate, latest drill status, skipped cue review signal, and next
  practice recommendation.
- Show a key-frame pose overlay and timeline events.
- Show analysis quality, frame coverage, landmark coverage, visibility, and warnings before coaching cues.
- Convert analysis quality into capture-readiness guidance so users know when to trust cues or retake the clip.
- Generate a local beta replay plan with setup, crux, and exit actions from report cues, timeline, and weakest metric.
- Generate a local movement phase breakdown that scores launch, crux, and finish phases from cues and timeline events.
- Block recording when capture setup has privacy or pose-extraction blockers.
- Measure local video analysis duration, budget status, and processed frame rate in each report.
- Keep raw video on-device by default.
- Persist local reports with native SQLite or browser/local fallback storage and support refresh, JSON export, and deletion.
- Share prepared Sessions exports through the native share sheet without adding cloud coupling.
- Share prepared Sessions exports as local `.json`, `.csv`, or `.txt` files when native file sharing is available, with a
  text-share fallback for web or unsupported runtimes.
- Delete a local analysis bundle as one privacy action, covering the report, private training log, drill practice log, and
  coach consent record while confirming that raw video was not included or uploaded.
- Export and restore a versioned local backup JSON containing reports, private training logs, drill practice logs, and
  coach consent records without raw video, video URI, audio, account identifiers, or secrets, including an offline
  content checksum for integrity checks.
- Preview a local backup restore before writing data and show a restore receipt after writing, including report,
  training-log, drill-practice, consent, new, existing, skipped orphan, integrity, and checksum evidence.
- Show a selectable session review for local reports with quality, performance, focus metric, primary cue, timeline, and
  privacy evidence.
- Let users keep private per-report training notes with project status, perceived effort, confidence, and local tags.
- Let users mark local coach cues as useful, unclear, or not useful inside the private per-report training log.
- Let users log the outcome of a comparable repeat attempt after applying a beta plan, including status, attempt count,
  and resolved cue ids.
- Summarize private training logs into a local project queue with active projects, repeat count, sent count, effort, and
  next repeat action.
- Summarize private repeat outcomes into success rate, improved/sent/stalled counts, resolved cue count, and a local
  next-repeat recommendation.
- Summarize improved and sent repeat outcomes into a local beta memory with reusable beta entries, resolved cue titles,
  top pattern, and privacy-safe recommendations.
- Persist configured session metadata in reports, exports, trends, drills, and coach review packets.
- Persist per-report coach review consent records with grant, revoke, and delete behavior.
- Prepare a coach review packet only after explicit athlete consent, without raw video, video URI, or key-frame landmarks.
- Add privacy-safe athlete context to coach review packets from local training-log scores, cue feedback ratings, and drill
  practice counts while excluding private note text and drill notes.
- Add completed real-review validation evidence to coach packet cue trust when a local validation campaign dataset exists,
  without exposing reviewer identities, raw video references, or private notes.
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
- Show a local pre-send guard that combines analysis quality, technique readiness, open fix cues, practice
  follow-through, repeat outcomes, and training load before recommending reset, controlled repeat, or hard-try windows.
- Summarize recurring coach cue patterns as persistent, emerging, or cleared across local reports.
- Summarize private cue usefulness feedback into useful rate, top useful cue, and review cue signals.
- Generate a local technique readiness plan from report trends, cue severity, private project status, effort, confidence,
  and drill evidence.
- Compare the latest local attempt with the previous report using metric deltas, quality delta, cue status, and a next-repeat recommendation.
- Apply capability-based Free, Pro, and Coach entitlements without hard-coding pricing into the movement engine.
- Show a configurable Plan tab with current plan, upgrade path, capability matrix, and billing-provider readiness.
- Show a configurable launch-readiness cockpit for stakeholder demo, internal native beta, and store-submission tracks.
- Generate store readiness metadata, privacy declarations, and screenshot plans from release configuration.
- Expose provider, active plan, privacy mode, and launch-readiness evidence in configuration.
- Generate a machine-detected launch-readiness report that separates configured evidence from detected evidence.
- Generate a native QA runbook for physical iOS and Android validation, including required workflows, performance
  budgets, privacy instructions, and a blocked draft evidence payload.
- Show a native QA evidence kit in the Plan tab with required physical-device runs, workflows, budgets, placeholder
  policy, and validator command.
- Prepare a share-safe native QA runbook packet from the Plan tab that packages physical-device workflows, budgets,
  blocked draft evidence, validator command, and privacy flags without raw video, local paths, or credential values.
- Show an in-app native QA evidence validator preview that reports ready runs, blocking checks, and raw-artifact
  exclusion before physical-device evidence is collected.
- Let release owners paste native QA evidence JSON in the Plan tab and preview ready runs, blocking checks, parse
  errors, and raw-artifact rejection locally before committing proof artifacts.
- Show an evidence collection plan in the Plan tab with cue-validation clip targets, estimated coach review rows,
  required wall-angle coverage, native device checks, and external evidence owners.
- Show a release unblock checklist in the Plan tab that derives remaining external blockers from launch readiness and
  lists each required proof artifact, command, owner, affected track, and secret/env key name without exposing values.
- Prepare a share-safe release unblock packet from the Plan tab that packages external blockers, commands, proof
  expectations, owners, affected tracks, acceptance criteria, and env key names without credential values.
- Generate a release handoff packet that summarizes commit, repo, product identity, gate status, launch blockers,
  screenshots, delivery artifacts, and verification commands for buyer or stakeholder review.
- Generate release source and web-dist archives with a SHA-256 manifest for integrity checks before handoff.
- Generate a deterministic model-analysis replay report that feeds MoveNet-shaped keypoints through the app analyzer,
  cue generation, metrics, and privacy checks.
- Attach a versioned local analysis evidence timeline to each report, covering input normalization, pose provider, signal
  quality, cue generation, runtime budget, and privacy boundary without raw video artifacts.
- Prepare a privacy-safe analysis evidence export from a local report for QA or stakeholder handoff, excluding raw video,
  video URI, key frames, pose landmark payloads, local paths, and secrets.
- Show configurable in-app model evidence that summarizes local MoveNet readiness, model-shaped replay, and remaining
  real climbing-video validation evidence without claiming production accuracy early.
- Sync in-app model evidence from the latest MoveNet readiness and model-analysis replay reports without overwriting
  real-world validation targets.
- Show a configurable safety-language guard that checks product and release copy for medical, injury-prevention,
  route-safety, and guaranteed-outcome claims before stakeholder handoff.
- Provide a GitHub Actions quality workflow template for pushes to `main` and pull requests, using lockfile-based
  dependency installation, the shared local release gate, and downloadable machine-readable release evidence after
  activation.

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
- Backup restore and restore preview must validate schema version, reject URI-like raw-video artifacts, verify the
  content checksum when present, skip orphan training-log, drill-practice, or consent records whose reports are not
  present in the backup, show which incoming records already exist in the current local repository before writing, and
  include checksum verification state in the restore receipt after writing.
- Technique readiness must degrade to a baseline recommendation when no local reports exist.
- Beta replay plans must degrade to weakest-metric guidance when no cue crosses a coaching threshold.
- Movement phase breakdowns must degrade to smooth phase guidance when no disruptive cue or timeline event is present.
- Cue trust scoring must downgrade cue confidence when pose quality, timing evidence, runtime budget, or validation
  readiness is weak.
- Personal benchmarks must return an empty state when no local reports exist and keep at least one top benchmark per
  supported segment when reports are present.
- Session planning must degrade to a baseline block when no reports exist and must avoid max-intensity guidance during
  recovery states.
- Pre-send guard thresholds must be replaceable, degrade to baseline before local reports exist, and avoid medical or
  safety guarantees while keeping hard-try recommendations dependent on local evidence.
- Cue pattern summaries must return an empty state without local cues and must keep cleared counts independent of UI
  display limits.
- Cue usefulness summaries must ignore orphan training logs and return an empty state before feedback exists.
- Adaptive drill plans must ignore orphan training logs and keep producing untested drill feedback when no cue feedback
  exists.
- Drill practice summaries must ignore orphan practice records and return an empty state before practice is logged.
- Coach review packets must ignore orphan training logs or drill records and must never include private note text or
  drill-practice notes.
- Coach review packets must include cue trust summaries without exposing raw video, key frames, landmarks, private notes,
  or drill-practice notes.
- Coach review packet cue trust must accept optional validation evidence from completed local campaign datasets, reduce
  trust for failed or unreviewed cues, and keep reviewer identities out of the packet.
- Coach library entries must ignore revoked or orphan consent records and expose only privacy-safe review metadata.
- Coach team templates must not include private notes, drill notes, raw video URIs, key frames, or landmarks.
- Coach library exports must validate schema version and reject forbidden raw artifact keys before handoff.
- Prepared exports must remain local until the user explicitly invokes the device share sheet.
- Prepared export file sharing must write only to app cache, infer stable file names and content types, avoid cloud
  dependencies, and fall back to text sharing if file sharing or file writes are unavailable.
- Plan catalog copy must be generated from capability descriptors and plan entitlements without payment-provider coupling.
- Release gate execution must produce a machine-readable JSON report with ordered step results before launch-readiness
  detection can mark the release gate verified.
- Launch-readiness status must be generated from a replaceable evidence object and keep external blockers explicit.
- Launch-readiness reports must mark configured-but-missing machine evidence as drift.
- Launch-readiness detection must validate native QA evidence and cue-validation dataset content before marking either
  artifact as verified.
- Launch-readiness detection must validate the model-analysis replay report before marking model-shaped cue evidence as
  verified.
- Video analysis performance budgets must be testable without a native runtime and visible in local reports.
- Video metadata extraction must degrade to picker/timer values when native or browser metadata is unavailable.
- Pose providers should skip incomplete per-frame detections and fail only when too few complete frames remain.
- The TensorFlow.js MoveNet provider must have an automated model-execution smoke that loads the model and runs local
  inference without a camera or cloud runtime.
- MoveNet keypoint mapping must stay isolated behind a reusable contract that converts model output into normalized
  `PoseFrame` data before the local movement analyzer consumes it.
- MoveNet readiness must produce a durable local JSON report with model load time, average and worst inference time,
  backend, memory evidence, budget checks, and explicit limitations for synthetic-frame testing.
- Model-analysis replay must run through the same normalized pose-frame and local analyzer contracts used by the app,
  cover the bundled slab, vertical, and overhang attempts, write durable JSON evidence, and state that it does not replace
  real-video physical-device validation.
- Analysis evidence timelines must be versioned, privacy-safe, legacy-report compatible, recomputed after runtime
  measurement, and must block or review weak signal, over-budget runtime, missing cues, upload-enabled reports, or raw
  artifact references.
- Analysis evidence exports must be schema-versioned, derive from the report timeline, include explicit negative privacy
  flags, reject URI/path/secret-like evidence, and use the same local prepared-export share flow as other Sessions exports.
- In-app model evidence must be driven by replaceable configuration, keep local technical readiness distinct from
  real-world validation, and avoid raw video, URI, local-path, or secret-like evidence fields.
- Model evidence sync must preserve existing real-world validation thresholds, support dry-run output, and update only
  Expo `extra.modelEvidence` from machine-readable release reports.
- Safety-language checks must use replaceable rules, ignore explicit negated policy/disclaimer copy, limit visible
  findings, and keep recommendations framed as educational movement feedback.
- Native QA runbooks must be generated from the same workflow and budget contract used by the native QA validator, and
  generated drafts must remain invalid until real device evidence replaces pending/null values.
- Native QA runbook packets must be schema-versioned, generated from the same native QA evidence kit shown in the app,
  include explicit negative flags for secrets, credential values, local paths, and raw video, and reject token-like or
  local-path evidence before sharing.
- Native QA evidence validation must reject placeholder device identities, build ids, and clip ids even when workflow
  statuses are marked as passing.
- Native QA evidence kit copy must stay parity-tested with the validator workflow and budget contract and must not include
  raw video, video URI, or local file URI fields.
- In-app native QA validation must stay parity-tested with the CLI release validator and reject raw local video
  references, URI fields, local paths, and secret-like keys.
- Native QA evidence import previews must parse untrusted JSON without crashing, reuse the app validator, keep evidence
  local, surface invalid JSON separately from failed checks, and avoid accepting raw artifact or secret-like fields.
- Evidence collection planning must be derived from cue-validation acceptance thresholds and native QA budgets rather
  than hard-coded in the UI.
- Release unblock planning must derive blocker labels, owners, actions, and statuses from launch-readiness checks while
  keeping proof artifacts, commands, and credential key names in a replaceable release contract.
- Release unblock packets must be schema-versioned, generated from the release unblock checklist, include explicit
  negative flags for credential values, local paths, and raw artifacts, and reject token-like or local-path evidence before
  sharing.
- Release handoff packets must be generated from existing machine-readable reports and store manifests, include no secret
  values, and fail screenshot completeness when the manifest declares a missing screenshot.
- Release archive manifests must include file size, SHA-256 digest, repository commit, branch, remote URL, and worktree
  state for every generated delivery archive.
- CI workflow template configuration must use the repository `ci` script, derive the Node version from `package.json`,
  target `main` and pull requests, and upload release evidence without committing CI-generated outputs.
- Repeat-outcome storage must support explicit clearing, deduplicate resolved cue ids, ignore orphan logs in summaries,
  and degrade to an empty state before data exists.
- Beta memory must ignore orphan annotations, remain useful without resolved cue ids, limit visible entries through a
  replaceable option, and exclude private note text.
- Cue validation datasets must reject missing schema versions, raw video URIs, key frames, pose landmarks, and incomplete
  review coverage before production movement-quality claims.
- In-app cue-validation gate previews must use local dataset content only and must not upload or fetch validation data.
- Real-world validation campaign tracking must derive seed, worksheet, dataset, gate, progress, and status export from
  existing cue-validation contracts, keep acceptance thresholds replaceable, avoid hidden IO, and exclude raw artifacts.
- Cue validation study seeds must not include raw video, URI, pose frames, key frames, landmarks, private notes, drill
  notes, or generated reviewer scores.
- Cue validation review worksheets must keep reviewer identities and score fields empty until real coach review is entered.
- Cue validation worksheet CSV exports must reject raw artifact references and keep reviewer/score cells blank.
- Completed worksheet CSV imports must reject missing reviewer identities, missing scores, out-of-range scores, duplicate
  rows, unknown rows, and rows that do not match the source study seed.
- Completed worksheet dataset preparation must surface parse or validation failures without crashing the Sessions UI.
- Android builds must keep camera/import permissions aligned with the video workflow, exclude audio permission, and
  disable backup for sensitive local reports.
- The app must avoid medical or safety guarantees.

## Out Of Scope For This Prototype

- Native pose extraction inside Expo Go.
- Cloud sync, accounts, subscriptions, or payment integration.
- Injury-risk scoring.
- Automated grade prediction.
