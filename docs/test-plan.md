# MoveBeta Test Plan

## Automated

- TypeScript strict compile with `npm run typecheck`.
- Vitest domain tests for schemas, fixture frames, provider selection, local analysis, selected demo attempts,
  video source normalization, video intake readiness, TensorFlow.js provider availability, deterministic video pose
  fallback, editable session metadata persistence, local report persistence, SQLite report storage, export/delete behavior,
  corrupted storage handling, analysis quality warnings, and privacy metadata.
- Vitest video metadata tests for native metadata reads, browser fallback, and final picker/timer/default fallback.
- Vitest native pose bridge contract tests for the optional JavaScript module boundary, Expo module registration, Apple
  Vision iOS provider, and Android ML Kit provider.
- Vitest coach consent repository tests for local persistence, SQLite storage, revocation, deletion, and corrupted storage.
- Vitest session detail tests for focus metric selection, primary cue selection, quality/performance/privacy facts,
  normalized timeline markers, and weak-report risk status.
- Vitest report annotation tests for private training-log defaults, cue usefulness feedback, legacy migration, updates,
  repeat outcome logging/clearing, tag normalization, local persistence, SQLite persistence, delete behavior, and
  corrupted-storage tolerance.
- Vitest repeat outcome insight tests for progressing, stalled, orphan-skipping, and empty states.
- Vitest drill practice repository tests for private completion/skipped records, local persistence, SQLite persistence,
  report-scoped deletion, and corrupted-storage tolerance.
- Vitest drill practice insight tests for completion rate, blocked/skipped state, orphan skipping, and empty state.
- Vitest privacy deletion tests for report, private training-log, drill-practice, coach-consent cleanup, orphan cleanup,
  and receipt copy.
- Vitest data portability tests for privacy-safe backup JSON, cue feedback backup/restore, non-mutating restore preview,
  restore into empty repositories, drill practice backup/restore, orphan skipping, and URI-like artifact rejection.
- Vitest project queue tests for active/repeat/sent counts, average effort, next-repeat priority, missing-report tolerance,
  and action generation.
- Vitest technique readiness tests for baseline, repeat, and recovery next-session recommendations.
- Vitest personal benchmark tests for best overall, wall-angle, grade, gym, latest-vs-best deltas, and empty state.
- Vitest session plan tests for baseline blocks, recovery intensity caps, repeat-project training blocks, and
  practice-reset planning from skipped drill logs.
- Vitest cue pattern tests for persistent, emerging, cleared, and empty cue-history states.
- Vitest cue feedback insight tests for useful rate, top useful cue, review cue, orphan skipping, and empty state.
- Vitest progress filter tests for wall-angle, grade, and gym option derivation, report filtering, and active filter count.
- Vitest capture-calibration tests for ideal setup, review-grade setup, and blockers caused by privacy or poor pose input.
- Vitest progress insights tests for report ordering, trend deltas, and empty-history handling.
- Vitest attempt comparison tests for latest-vs-baseline ordering, metric deltas, cue status, and insufficient history.
- Vitest drill planner tests for cue deduplication, feedback-adapted reinforcement or variants, priority ordering,
  dosage, and empty cue reports.
- Vitest coach review packet tests for consent metadata, review rubric, privacy-safe athlete context, and raw
  video/landmark/note exclusion.
- Vitest coach library tests for active consent filtering, revoked/orphan consent skipping, review priority, low-signal
  status, athlete context counts, and private-note exclusion.
- Vitest coach team template tests for high-priority, follow-through, signal-retake, privacy-safe packet templates, and
  private/raw artifact exclusion.
- Vitest coach library export tests for versioned batch handoff, zero-count exports, privacy flags, summary copy, and
  injected raw-artifact key rejection.
- Vitest cue validation tests for pass, needs-review, and insufficient-data scoring.
- Vitest cue validation study seed tests for active cue-validation consent filtering, packet-only review tasks, privacy
  flags, private-note exclusion, no-invented-score metadata, blank review worksheets, worksheet CSV export/escaping, and
  raw-artifact key rejection.
- Vitest completed worksheet dataset tests for final dataset composition, validation-gate compatibility, missing
  reviewer rejection, seed mismatch rejection, and out-of-range score rejection.
- Vitest in-app cue-validation gate tests for ready datasets, default production evidence gaps, and raw-artifact rejection.
- Vitest cue-validation gate parity tests that keep the in-app preview aligned with the CLI production validation gate.
- Vitest cue validation dataset tests for schema version, production thresholds, wall-angle coverage, reviewer coverage,
  raw-artifact exclusion, and weak-score failures.
- Vitest performance-budget tests for local analysis duration thresholds, frame-rate evidence, and over-budget status.
- Vitest entitlement tests for Free, Pro, Coach capabilities, upgrade paths, and history limits.
- Vitest plan catalog tests for current tier status, highlighted upgrade unlocks, coach tier capabilities, and
  provider-agnostic recommendations.
- Vitest launch-readiness and config tests for default blockers, all-ready evidence, partial evidence overrides, and
  Expo/env launch evidence parsing.
- Vitest release-gate report tests for pass/fail aggregation and ordered release step coverage.
- Vitest launch-readiness doctor tests for artifact detection, content validation of native QA and cue-validation dataset
  evidence, machine release-gate report detection, configured-evidence drift, and durable report writes.
- Vitest MoveNet readiness report tests for ready/degraded budget checks without loading the model in unit tests.
- Vitest MoveNet pose-mapper contract tests for required keypoint mapping, missing-keypoint errors, and mapped-frame
  analyzer compatibility.
- Vitest capture-readiness tests for ready, review, and retake recommendations from video signal quality.
- Vitest beta replay plan tests for setup/crux/exit action generation, timestamp ordering, and no-cue metric fallback.
- Vitest movement phase breakdown tests for launch/crux/finish scoring, primary phase selection, and smooth fallback.
- Vitest cue trust tests for signal-factor scoring, low-quality degradation, and real validation evidence downgrade.
- Vitest observability tests for sanitized diagnostic events and aggregate support packets without raw video artifacts.
- Vitest offline-readiness tests for ready, review, and blocked airplane-mode states.
- Vitest store-readiness tests for bundle/package identifiers, permission copy, privacy declaration, listing copy, and
  screenshot plan.
- Vitest Android manifest checks for camera/import permissions, audio exclusion, and disabled Android backup.
- Vitest native QA evidence tests for platform coverage, muted recording, metadata reads, workflow pass/fail state,
  latency budgets, battery budget, thermal state, and placeholder evidence rejection.
- Vitest native QA runbook tests for platform workflows, budget reuse, privacy-safe setup instructions, and blocked
  evidence drafts before real device values are entered.
- Vitest native QA evidence kit tests for Plan-tab workflow coverage, shared budgets, validator command, placeholder
  policy, and raw-artifact exclusion.
- Vitest native QA evidence validation tests for app/CLI parity, draft blocker state, ready physical-device evidence, and
  raw local artifact rejection.
- Vitest evidence collection plan tests for cue-validation targets, estimated review rows, native QA workflow checks,
  configurable acceptance thresholds, and raw-artifact exclusion.
- Vitest release unblock checklist tests for default external blockers, launch-readiness label/action parity, secret key
  name disclosure without secret values, and all-ready evidence state.
- Vitest launch-readiness doctor tests for store-manifest screenshot completeness, including newly declared screenshots.
- Vitest launch-readiness doctor tests for model-analysis replay detection, missing-report blocking, and failing-report
  blocking before launch tracks are ready.
- Vitest release handoff packet tests for release status aggregation, blocker tracks, screenshot completeness, verification
  commands, Markdown rendering, and durable JSON/Markdown writes.
- Vitest release archive manifest tests for SHA-256 checksums, archive byte sizes, repository metadata, worktree-state
  metadata, Markdown rendering, and durable JSON/Markdown writes.
- Vitest model-analysis replay tests for MoveNet-shaped keypoint conversion, bundled attempt coverage, privacy-safe
  outputs, metric/cue generation, and failing quality thresholds.
- Web export with `npm run export:web`.
- MoveNet model execution smoke with `npm run model:movenet:smoke`. This loads TensorFlow.js MoveNet SinglePose
  Lightning and runs inference on a synthetic local frame; it verifies model execution, not climbing-coach accuracy.
- MoveNet readiness report with `npm run model:movenet:readiness`, which writes
  `docs/sdlc/movenet-readiness-report.json` and is included in `npm run release:check`.
- Model-analysis replay with `npm run model:analysis:replay`, which writes
  `docs/sdlc/model-analysis-replay-report.json` and is included in `npm run release:check`.
- Playwright smoke against exported web bundle with `scripts/smoke_web_video.py`.
- Store screenshot generation with `npm run store:screenshots`.
- Android native debug build with `./gradlew :app:assembleDebug` plus merged manifest validation.
- iOS Pods install with `npm run native:ios:pods`.
- Native QA runbook generation with `npm run native:qa:runbook`.
- Native QA evidence validation with `npm run native:qa:validate` after real device runs are captured.
- Cue validation dataset validation with `npm run validation:cue` after consented coach review packets and reviews are
  captured.
- Launch readiness evidence report with `npm run release:readiness` after release gates and native artifacts are refreshed.
- Release handoff packet generation with `npm run release:handoff` after release readiness, screenshots, and archives are
  refreshed.
- Release archive generation with `npm run release:archives` after `npm run export:web`; writes source/web zip files,
  checksum manifests, and worktree-state evidence to the parent output directory.

## Browser Smoke

- Analyze tab renders the on-device coach.
- Record and Import actions are visible on the Analyze tab.
- Session metadata inputs are visible on the Analyze tab.
- Capture setup calibration is visible on the Analyze tab and updates readiness state from ready to review.
- Imported/recorded videos render a preview card before metrics.
- Selected videos render clip-readiness status before analysis-dependent coaching output.
- Analysis quality renders before coaching cues and warns on weak pose confidence.
- Capture-readiness guidance renders before coaching cues and recommends whether to trust or retake the clip.
- Beta replay plan renders before movement metrics with setup, crux, and exit actions.
- Movement phase breakdown renders before movement metrics with the primary phase and phase scores.
- Cue trust renders before movement metrics with validation-readiness status and per-cue confidence scores.
- Selecting each bundled local attempt runs analysis and updates pose overlay, metrics, cues, and timeline.
- Sessions tab refreshes on focus and shows the latest local attempts.
- Sessions tab shows selectable session review detail with focus metric, primary cue, timeline, and local evidence.
- Sessions tab shows a private training log and allows cue usefulness, project status, effort, confidence, tags, and notes to be edited.
- Report export renders privacy-safe JSON and Delete removes the report, private training log, drill practice log, and
  coach consent record from local storage with a deletion receipt.
- Prepared Sessions exports show a native share action after an export is generated.
- Sessions tab shows a local coach library after consent with packet counts, review priority, signal status, and
  no-raw-video evidence.
- Sessions tab shows local team templates generated from consented coach library signals.
- Sessions tab prepares a versioned coach library export with privacy flags and team templates after consent.
- Sessions tab prepares a cue-validation study seed with packet-only review tasks and no invented scores after consent.
- Sessions tab prepares a cue-validation review worksheet with blank coach score rows after consent.
- Sessions tab prepares a cue-validation worksheet CSV for spreadsheet-based coach review collection after consent.
- Sessions tab builds a cue-validation dataset JSON from a completed worksheet CSV after reviewer IDs and scores are filled.
- Sessions tab shows the local cue-validation gate preview after dataset composition.
- Coach packet export requires persisted explicit consent and then renders review JSON with privacy-safe athlete context
  cue trust, and without raw video or private-note artifacts.
- Privacy diagnostics prepare a support packet without raw video, video URI, key-frame, landmark, account, or secret artifacts.
- Privacy data portability prepares a backup JSON, previews restore counts, and restores it locally without raw video
  leaving the device.
- Privacy airplane-mode readiness check confirms local workflow readiness after reports exist.
- Cue validation rubric can score coach reviews once consented clip packets are available.
- Cue validation dataset gate can reject incomplete studies before production movement-quality claims.
- Drills tab shows weekly drill plan, priority dosage, report evidence, private cue feedback adaptation, private practice
  logging, and coach pack preview.
- Progress tab shows movement score bars.
- Progress tab shows local history summary, current trend, and Pro history preview.
- Progress tab shows attempt comparison after at least two local reports.
- Progress tab shows a project queue derived from private training logs after a Sessions log is saved.
- Progress tab shows a next-session plan with target, duration, intensity cap, ordered phases, and practice-reset
  adaptation when drill follow-through is blocked.
- Progress tab shows technique readiness with score, next action, warm-up, and risk.
- Progress tab shows personal benchmarks for best overall and filtered style segments.
- Progress tab shows recurring cue patterns with latest cue count, total patterns, cleared count, and drill evidence.
- Progress tab shows cue usefulness insights from private Sessions feedback.
- Progress tab shows repeat-outcome success, improved/sent/stalled counts, and next-repeat action after a Sessions repeat
  outcome is logged.
- Progress tab shows practice consistency from private Drills completion/skipped logs.
- Progress tab filters history by wall angle, grade, and gym without leaving the local report boundary.
- Progress and Drills tabs show plan access gates driven by entitlement capabilities.
- Plan tab shows current tier, upgrade path, capability matrix, and provider readiness from the shared plan catalog.
- Plan tab shows launch readiness for stakeholder demo, internal native beta, and store submission.
- Plan tab shows the native QA evidence kit for Android/iOS physical-device runs, workflow count, placeholder policy, and
  validator command.
- Plan tab shows the native QA evidence validator preview with ready run count, blocking check count, and raw-artifact
  exclusion.
- Plan tab shows the evidence collection plan with clip, review-row, device-check, wall-angle, and owner targets.
- Plan tab shows the release unblock checklist with blocker count, owner count, release commands, proof artifacts, and
  credential key names for external store blockers.
- Privacy tab confirms no-upload default behavior.

Command used for local smoke:

```bash
node scripts/serve-web.mjs dist 8083
MOVEBETA_SMOKE_URL=http://127.0.0.1:8083 python3 scripts/smoke_web_video.py
```

## Native QA Before Store Submission

- Android custom dev build with `native-platform-pose`.
- iOS simulator/device build after full Xcode installation.
- Camera permission flow.
- Capture setup blocks recording when visible bystanders, cropped framing, backlighting, or unusable distance are selected.
- Imported video flow.
- Recorded video flow.
- Recorded videos are muted, use the configured quality/bitrate/file-size profile, and do not request microphone access.
- Native metadata read returns expected duration and dimensions for camera and imported clips.
- Too-short and remote video rejection.
- Video preview playback.
- On-device inference latency on recent and older devices.
- Report performance evidence matches the native QA device run.
- Battery and thermal behavior for repeated analysis.
- Airplane-mode analysis.
- Deletion of reports and optional video references.
