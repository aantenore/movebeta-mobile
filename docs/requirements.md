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
- Show a local capture prep protocol before recording that derives setup, warm-up, record, verify, and retake guidance
  from capture calibration, latest local analysis quality, weakest movement metric, and primary cue evidence.
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
- Prepare a local cue-validation clip intake manifest from the study seed with consented clip coverage, wall-angle gaps,
  required coach review rows, and no packet payloads or raw artifacts.
- Prepare a share-safe cue-validation reviewer onboarding packet from the study seed with coach instructions, review
  criteria, command checklist, collection summary, and explicit exclusion of raw artifacts, local paths, credentials,
  reviewer identities, and invented scores.
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
- Generate a local session agenda from training load, next-session plan, and closeout evidence so climbers have a
  minute-by-minute plan with an intensity cap and privacy-safe local evidence.
- Prepare a share-safe local session agenda packet from the current agenda with schema version, summary, blocks,
  negative privacy flags, and raw-artifact rejection.
- Generate a local attempt pacing plan from the session agenda, training load, and pre-send guard so climbers know the
  rest windows, attempt budget, hard-try slots, and stop rules before adding intensity.
- Generate a local session closeout checklist from the next-session plan, pre-send guard, drill practice, repeat outcomes,
  and privacy boundary so climbers know what to log before the next local comparison.
- Generate a local training load balance from private effort, repeat outcome, and drill practice logs so climbers can
  keep the next session controlled or add one variable based on recent local evidence.
- Show a local pre-send guard that combines analysis quality, technique readiness, open fix cues, practice
  follow-through, repeat outcomes, and training load before recommending reset, controlled repeat, or hard-try windows.
- Summarize recurring coach cue patterns as persistent, emerging, or cleared across local reports.
- Summarize private cue usefulness feedback into useful rate, top useful cue, and review cue signals.
- Generate a local technique readiness plan from report trends, cue severity, private project status, effort, confidence,
  and drill evidence.
- Compare the latest local attempt with the best matching local baseline using configurable smart repeat matching across
  wall angle, gym, grade, title, cue overlap, recency, and private local annotation signals.
- Generate advanced drill packs locally from report cues, cue feedback, practice logs, wall angle, grade band, and
  pack-readiness scoring without exposing private notes or raw video artifacts.
- Apply capability-based Free, Pro, and Coach entitlements without hard-coding pricing into the movement engine.
- Show a configurable Plan tab with current plan, upgrade path, capability matrix, and provider-agnostic billing readiness.
- Show a configurable launch-readiness cockpit for stakeholder demo, internal native beta, and store-submission tracks.
- Generate store readiness metadata, privacy declarations, and screenshot plans from release configuration.
- Generate a share-safe store submission packet with listing metadata, privacy declarations, screenshot plan, copy-risk
  scan, commands, and no credential values or raw artifacts.
- Expose provider, active plan, privacy mode, and launch-readiness evidence in configuration.
- Generate a machine-detected launch-readiness report that separates configured evidence from detected evidence.
- Generate a native QA runbook for physical iOS and Android validation, including required workflows, performance
  budgets, privacy instructions, and a blocked draft evidence payload.
- Show a native QA evidence kit in the Plan tab with required physical-device runs, workflows, budgets, placeholder
  policy, and validator command.
- Prepare a share-safe native QA runbook packet from the Plan tab that packages physical-device workflows, budgets,
  blocked draft evidence, validator command, and privacy flags without raw video, local paths, or credential values.
- Show a provider readiness cockpit in the Plan tab that summarizes primary video provider, native target provider,
  fallback provider, runtime proof status, and local privacy boundary.
- Show a commercial readiness cockpit in the Plan tab that summarizes billing adapter selection, paid plan product
  mappings, receipt-validation mode, sandbox proof, entitlement-source boundary, and credential-free config hygiene.
- Prepare a share-safe commercial readiness packet from the Plan tab with adapter status, paid plan mapping gaps,
  receipt-validation status, sandbox proof, owner actions, and no payment data, receipt values, secrets, local paths, or
  raw artifacts.
- Show an in-app native QA evidence validator preview that reports ready runs, blocking checks, and raw-artifact
  exclusion before physical-device evidence is collected.
- Let release owners paste native QA evidence JSON in the Plan tab and preview ready runs, blocking checks, parse
  errors, and raw-artifact rejection locally before committing proof artifacts.
- Let QA leads compose native QA evidence JSON in the Plan tab from structured Android/iOS physical-run measurements,
  normalize duration/performance values, and preview the same validator result before committing proof artifacts.
- Let QA leads prepare a share-safe native QA evidence export from composed measurements in the Plan tab before moving
  the JSON into release evidence.
- Show an evidence collection plan in the Plan tab with cue-validation clip targets, estimated coach review rows,
  required wall-angle coverage, native device checks, and external evidence owners.
- Show balanced cue-validation collection batches in the Plan tab, including per-wall-angle clip targets, estimated cue
  rows, estimated review rows, reviewer slots per cue, capture focus, and a privacy-first collection checklist.
- Prepare a share-safe validation collection packet from the Plan tab with balanced clip batches, reviewer slot
  templates, collection commands, and no raw video, local path, credential, or reviewer identity values.
- Prepare a share-safe validation pilot kit from the Plan tab with consent principles, wall-angle pilot sprints, capture
  setup guidance, coach review rules, closeout commands, and no raw video, identities, local paths, credentials, or
  invented scores.
- Prepare a share-safe field validation ops packet from the Plan tab that sequences consented packet preparation, real
  clip collection, coach worksheet review, physical-device QA, validation commands, and release promotion without raw
  video, identities, local paths, credentials, or invented scores.
- Show a release unblock checklist in the Plan tab that derives remaining external blockers from launch readiness and
  lists each required proof artifact, command, owner, affected track, and secret/env key name without exposing values.
- Show a release critical path in the Plan tab that sequences launch blockers by owner lane, dependency, command, proof
  artifact, and affected launch track.
- Prepare a share-safe release critical path packet from the Plan tab with ready, ready-to-start, blocked step counts,
  dependency keys, lane counts, commands, proof expectations, and explicit negative privacy flags.
- Prepare a share-safe release unblock packet from the Plan tab that packages external blockers, commands, proof
  expectations, owners, affected tracks, acceptance criteria, and env key names without credential values.
- Prepare a share-safe release blocker issue packet from the Plan tab that turns every external blocker into a GitHub
  issue draft with title, labels, owner, affected tracks, acceptance criteria, required proof, commands, env key names,
  and no credential values.
- Generate a durable release blocker issue report from app launch evidence so release owners can track issue-ready
  external blockers from CLI, handoff packets, and release gates without filing issues automatically.
- Prepare a share-safe release evidence packet from the Plan tab that aggregates launch readiness, model evidence,
  provider readiness, native QA runbook, blocker checklist, artifact paths, and release commands without secrets or raw
  local artifacts.
- Show release evidence reconciliation in the Plan tab so release owners can paste share-safe cue-validation, native QA,
  iOS toolchain, and store credential reports and preview which launch blockers and tracks would clear.
- Prepare a share-safe release evidence reconciliation packet from the Plan tab with current/projected readiness,
  cleared blocker count, proof gaps, report sources, commands, and explicit negative privacy flags.
- Generate a release handoff packet that summarizes commit, repo, product identity, gate status, launch blockers,
  screenshots, delivery artifacts, and verification commands for buyer or stakeholder review.
- Generate release source and web-dist archives with a SHA-256 manifest for integrity checks before handoff.
- Generate an iOS toolchain report that checks the selected Developer directory, full Xcode availability, workspace,
  Pods, and build-settings probe before marking iOS build evidence ready.
- Generate a store credentials report that checks EAS project binding, Expo token presence, App Store Connect credential
  key presence, and Google Play credential key presence without exposing any secret values.
- Prepare a share-safe store credentials setup packet from the Plan tab with EAS project binding, Expo token, App Store
  Connect, and Google Play key names, commands, readiness summary, and no credential values.
- Generate a share-safe environment template report that verifies `.env.example` covers runtime, smoke-test, and release
  credential key names while rejecting credential values, token-like strings, and local paths.
- Generate a machine-readable feature completion report that audits task plan, backlog, traceability, and launch-readiness
  evidence while separating internal implementation gaps from external data, device, account, and credential blockers.
- Generate a cue-validation dataset report that checks missing, malformed, ready, or failed real-review dataset evidence
  without embedding dataset rows or reviewer identities.
- Validate reviewer consensus for cue-validation datasets, including distinct reviewers per cue and configurable maximum
  per-criterion score spread before promoting real-world movement-quality evidence.
- Generate a deterministic model-analysis replay report that feeds MoveNet-shaped keypoints through the app analyzer,
  cue generation, metrics, and privacy checks.
- Generate a model verification suite report that aggregates MoveNet runtime budgets, model-shaped replay coverage,
  wall-angle coverage, movement metric coverage, cue output coverage, privacy checks, and real-world validation status.
- Attach a versioned local analysis evidence timeline to each report, covering input normalization, pose provider, signal
  quality, cue generation, runtime budget, and privacy boundary without raw video artifacts.
- Prepare a privacy-safe analysis evidence export from a local report for QA or stakeholder handoff, excluding raw video,
  video URI, key frames, pose landmark payloads, local paths, and secrets.
- Show configurable in-app model evidence that summarizes local MoveNet readiness, model-shaped replay, and remaining
  real climbing-video validation evidence without claiming production accuracy early.
- Let the athlete choose a configurable coach lens for local analysis, including balanced, footwork, body-position, and
  power-conservation modes, with lens metadata saved in reports, exports, replay plans, drill plans, and coach packets.
- Sync in-app model evidence from the latest MoveNet readiness and model-analysis replay reports, and promote real-world
  validation only when the cue-validation dataset doctor report is ready and share-safe.
- Show a configurable safety-language guard that checks product and release copy for medical, injury-prevention,
  route-safety, and guaranteed-outcome claims before stakeholder handoff.
- Provide a GitHub Actions quality workflow template for pushes to `main` and pull requests, using lockfile-based
  dependency installation, the shared local release gate, and downloadable machine-readable release evidence after
  activation.
- Generate a GitHub workflow activation report that checks template presence, active workflow status, template parity,
  GitHub CLI availability, and OAuth `workflow` scope without exposing token values.
- Generate an offline dependency license report from the lockfile-installed package graph, including package counts,
  license summary, notice/attribution review packages, blocked packages, and local linked package handling.

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
- Coach lenses must be config-driven, default safely to balanced, stay compatible with legacy reports, and change only
  local thresholds, cue priority, beta-replay emphasis, and drill dosage guidance without sending video to cloud services.
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
- Feature completion reports must exclude credential values, raw artifacts, raw video, secrets, and local paths, and must
  fail closed when tracked open work lacks an explicit external-blocker reason.
- Validation pilot kits must keep raw video on-device, exclude athlete and coach identities, and keep reviewer score cells
  unfilled until real coach review is collected.
- Prepared exports must remain local until the user explicitly invokes the device share sheet.
- Prepared export file sharing must write only to app cache, infer stable file names and content types, avoid cloud
  dependencies, and fall back to text sharing if file sharing or file writes are unavailable.
- Plan catalog copy must be generated from capability descriptors and plan entitlements without payment-provider coupling.
- Billing readiness must be generated from replaceable configuration and the shared plan keys, must keep receipt or
  provider concerns outside pose analysis, and must reject token-like values, credential strings, raw video references,
  or local artifact paths in plan mappings.
- Commercial readiness packets must be schema-versioned, generated from the billing readiness summary, list owner actions
  without shelling into provider accounts, and reject token-like values, credential strings, payment data, receipt values,
  raw video references, or local artifact paths before sharing.
- Release gate execution must produce a machine-readable JSON report with ordered step results before launch-readiness
  detection can mark the release gate verified.
- iOS build evidence must come from the generated toolchain report and remain blocked unless full Xcode, workspace, Pods,
  and the build-settings probe are ready.
- Store credential evidence must come from a generated report that includes key names and readiness state only, never
  credential values, token-like strings, private keys, or local credential paths.
- Store submission packets must be schema-versioned, generated from the store readiness manifest, include safety-language
  review status, list submission commands, expose negative privacy flags, and reject token-like, local-path, or raw-artifact text.
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
- Model verification suite must write durable JSON and Markdown evidence, fail on local model runtime or replay
  regressions, stay `technical-ready` when only real-world validation is missing, and reject raw videos, local paths,
  credential values, and token-like strings before sharing.
- Cue-validation dataset readiness must fail when reviewer score spread exceeds the configured per-criterion threshold,
  and reliability summaries must omit reviewer identities, raw video, key frames, landmarks, video URIs, and local paths.
- Analysis evidence timelines must be versioned, privacy-safe, legacy-report compatible, recomputed after runtime
  measurement, and must block or review weak signal, over-budget runtime, missing cues, upload-enabled reports, or raw
  artifact references.
- Analysis evidence exports must be schema-versioned, derive from the report timeline, include explicit negative privacy
  flags, reject URI/path/secret-like evidence, and use the same local prepared-export share flow as other Sessions exports.
- In-app model evidence must be driven by replaceable configuration, keep local technical readiness distinct from
  real-world validation, and avoid raw video, URI, local-path, or secret-like evidence fields.
- Model evidence sync must preserve existing real-world validation thresholds until a ready, share-safe cue-validation
  dataset doctor report exists, support dry-run output, and update only Expo `extra.modelEvidence` from machine-readable
  release reports.
- Safety-language checks must use replaceable rules, ignore explicit negated policy/disclaimer copy, limit visible
  findings, and keep recommendations framed as educational movement feedback.
- Release evidence packets must use relative repository artifact names only, exclude credential values, raw video, raw
  local artifact references, local filesystem paths, and token-like strings, and remain schema-versioned.
- Store credentials setup packets must include only required key names and commands, reject credential values, local paths,
  raw artifacts, and token-like strings, and avoid printing the EAS project id value.
- Environment template validation must keep release credential example values empty, include all public runtime and local
  operation keys used by release commands, and fail when token-like strings or local paths appear in `.env.example`.
- Native QA runbooks must be generated from the same workflow and budget contract used by the native QA validator, and
  generated drafts must remain invalid until real device evidence replaces pending/null values.
- Native QA runbook packets must be schema-versioned, generated from the same native QA evidence kit shown in the app,
  include explicit negative flags for secrets, credential values, local paths, and raw video, and reject token-like or
  local-path evidence before sharing.
- Provider readiness must be derived from provider capability metadata and app configuration, not product-screen string
  matching, and reserved native providers must remain blocked until an adapter is installed.
- Native QA evidence validation must reject placeholder device identities, build ids, and clip ids even when workflow
  statuses are marked as passing.
- Native QA evidence kit copy must stay parity-tested with the validator workflow and budget contract and must not include
  raw video, video URI, or local file URI fields.
- In-app native QA validation must stay parity-tested with the CLI release validator and reject raw local video
  references, URI fields, local paths, and secret-like keys.
- Native QA evidence import previews must parse untrusted JSON without crashing, reuse the app validator, keep evidence
  local, surface invalid JSON separately from failed checks, and avoid accepting raw artifact or secret-like fields.
- Native QA evidence composition must reuse the shared native QA workflow/budget contract, keep incomplete workflow
  evidence blocked, normalize seconds to milliseconds, and reject raw local artifact references through the validator.
- Native QA evidence composer exports must be schema-versioned and reject raw video URIs, local paths, credential
  values, and token-like strings before sharing.
- Evidence collection planning must be derived from cue-validation acceptance thresholds and native QA budgets rather
  than hard-coded in the UI, and per-wall-angle collection batches must rebalance automatically when clip thresholds or
  required wall angles change.
- Validation collection packets must be schema-versioned, generated from the current evidence collection plan, keep
  reviewer identities as empty slots until real coaches are assigned, and reject raw video URIs, local paths, credential
  values, and token-like strings before sharing.
- Field validation ops packets must be generated from existing evidence collection, validation pilot, and release unblock
  contracts; phase order, owners, commands, and artifact names must remain share-safe and reject raw video references,
  local paths, credential values, token-like strings, and invented reviewer data.
- Capture prep protocols must be generated from local setup calibration and optional local reports, keep raw video on
  device, avoid medical or guaranteed-outcome claims, and degrade to a baseline protocol before any report exists.
- Release unblock planning must derive blocker labels, owners, actions, and statuses from launch-readiness checks while
  keeping proof artifacts, commands, and credential key names in a replaceable release contract.
- Release unblock packets must be schema-versioned, generated from the release unblock checklist, include explicit
  negative flags for credential values, local paths, and raw artifacts, and reject token-like or local-path evidence before
  sharing.
- Release critical path packets must be schema-versioned, derived from launch-readiness and release-unblock contracts,
  preserve dependency order without mutating evidence, and reject raw videos, local paths, credential values, and
  token-like strings before sharing.
- Release evidence scenario planning must derive future proof-collection bundles from launch-readiness and critical-path
  contracts, compare projected ready tracks and cleared blockers without mutating current evidence, surface missing
  prerequisites, and reject raw videos, local paths, credential values, and token-like strings before sharing.
- Release evidence freshness checks must be generated from machine-readable release reports, apply configurable freshness
  windows per artifact, surface stale, missing, and invalid timestamps, and reject raw videos, local paths, credential
  values, and token-like strings before sharing.
- Release blocker issue packets must be schema-versioned, generated from the release unblock checklist, point to the
  repository issue template, include only share-safe issue drafts, and reject token-like values, credential strings,
  absolute local paths, raw artifacts, or raw video references before sharing.
- Release blocker issue reports must write JSON and Markdown artifacts from current launch evidence, preserve the same
  share-safe issue draft contract, stay fresh through release evidence freshness checks, and be included in release
  handoff evidence.
- Session closeout packets must be schema-versioned, generated from local reports and private local logs, include only
  derived checklist evidence, and reject raw video references, local paths, landmarks, private note text, or token-like
  data before display or sharing.
- Training load summaries must be schema-versioned, use configurable lookback and limit thresholds, include only derived
  effort/repeat/drill counts, and reject raw video references, local paths, landmarks, private note text, or token-like
  data before display or sharing.
- Release evidence reconciliation must infer supported report schemas from pasted JSON, reject malformed, raw-artifact,
  local-path, credential-value, or token-like evidence, and project launch readiness without mutating current evidence.
- Release handoff packets must be generated from existing machine-readable reports and store manifests, include no secret
  values, and fail screenshot completeness when the manifest declares a missing screenshot.
- Release archive manifests must include file size, SHA-256 digest, repository commit, branch, remote URL, and worktree
  state for every generated delivery archive.
- CI workflow template configuration must use the repository `ci` script, derive the Node version from `package.json`,
  target `main` and pull requests, and upload release evidence without committing CI-generated outputs.
- GitHub workflow activation evidence must be generated without committing active workflow files when the current token
  lacks `workflow` scope, and must not include OAuth token values.
- Dependency license evidence must handle dual permissive/copyleft license expressions, treat local linked packages as
  internal, flag notice/attribution obligations for review, block missing or restricted third-party licenses, and avoid
  absolute local paths or secret-like values.
- Repeat-outcome storage must support explicit clearing, deduplicate resolved cue ids, ignore orphan logs in summaries,
  and degrade to an empty state before data exists.
- Smart repeat matching must stay local, ignore private note text, expose match confidence and reasons, and fall back to
  chronological comparison only when no stronger comparable baseline exists.
- Advanced drill packs must stay local, include privacy flags, exclude private note text and raw artifacts, and adapt
  intensity or variants from private cue feedback and practice follow-through.
- Beta memory must ignore orphan annotations, remain useful without resolved cue ids, limit visible entries through a
  replaceable option, and exclude private note text.
- Cue validation datasets must reject missing schema versions, raw video URIs, key frames, pose landmarks, and incomplete
  review coverage before production movement-quality claims.
- Cue validation dataset reports must summarize validator status and failed checks without copying reviewer identities or
  completed worksheet rows into SDLC evidence.
- In-app cue-validation gate previews must use local dataset content only and must not upload or fetch validation data.
- Real-world validation campaign tracking must derive seed, worksheet, dataset, gate, progress, and status export from
  existing cue-validation contracts, keep acceptance thresholds replaceable, avoid hidden IO, and exclude raw artifacts.
- Cue validation study seeds must not include raw video, URI, pose frames, key frames, landmarks, private notes, drill
  notes, or generated reviewer scores.
- Cue validation clip intake manifests must be schema-versioned, derive clip/review-row/coverage status from the study
  seed, exclude coach packet payloads, and reject raw video URI/path text.
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
