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
- Vitest beta memory tests for improved/sent entries, building and empty states, orphan skipping, entry limits, resolved
  cue titles, and private-note exclusion.
- Vitest drill practice repository tests for private completion/skipped records, local persistence, SQLite persistence,
  report-scoped deletion, and corrupted-storage tolerance.
- Vitest drill practice insight tests for completion rate, blocked/skipped state, orphan skipping, and empty state.
- Vitest privacy deletion tests for report, private training-log, drill-practice, coach-consent cleanup, orphan cleanup,
  and receipt copy.
- Vitest data portability tests for privacy-safe backup JSON, cue feedback backup/restore, non-mutating restore preview,
  existing-record conflict preview, restore receipt checksum copy, content-checksum verification and tamper rejection,
  legacy backup compatibility, restore into empty repositories, drill practice backup/restore, orphan skipping, and
  URI-like artifact rejection.
- Vitest project queue tests for active/repeat/sent counts, average effort, next-repeat priority, missing-report tolerance,
  and action generation.
- Vitest technique readiness tests for baseline, repeat, and recovery next-session recommendations.
- Vitest personal benchmark tests for best overall, wall-angle, grade, gym, latest-vs-best deltas, and empty state.
- Vitest session plan tests for baseline blocks, recovery intensity caps, repeat-project training blocks, and
  practice-reset planning from skipped drill logs.
- Vitest session closeout tests for baseline checklist, latest-report closeout actions, complete closeout evidence, and
  raw artifact/private-note rejection.
- Vitest training load tests for baseline, balanced, review, deload, configurable threshold behavior, and raw
  artifact/private-note rejection.
- Vitest pre-send guard tests for baseline, controlled-repeat, reset-first, hard-try window, blocked practice, and
  replaceable thresholds.
- Vitest cue pattern tests for persistent, emerging, cleared, and empty cue-history states.
- Vitest cue feedback insight tests for useful rate, top useful cue, review cue, orphan skipping, and empty state.
- Vitest progress filter tests for wall-angle, grade, and gym option derivation, report filtering, and active filter count.
- Vitest capture-calibration tests for ideal setup, review-grade setup, and blockers caused by privacy or poor pose input.
- Vitest capture prep protocol tests for baseline degradation, report-driven cue focus, setup blockers, retake guidance,
  and local privacy copy.
- Vitest progress insights tests for report ordering, trend deltas, annotation-aware smart matching, and empty-history handling.
- Vitest repeat matcher tests for comparable baseline selection, annotation-aware tag/project confidence, private-note
  exclusion, and empty candidate handling.
- Vitest attempt comparison tests for smart-baseline selection, metric deltas, cue status, and insufficient history.
- Vitest advanced drill pack tests for versioned schema output, practice-log intensity adaptation, cue-feedback variants,
  private-note/tag exclusion, privacy flags, and empty-cue handling.
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
  flags, private-note exclusion, no-invented-score metadata, clip intake manifests, reviewer onboarding packets, blank review
  worksheets, worksheet CSV export/escaping, and raw-artifact key rejection.
- Vitest completed worksheet dataset tests for final dataset composition, validation-gate compatibility, missing
  reviewer rejection, seed mismatch rejection, and out-of-range score rejection.
- Vitest in-app cue-validation gate tests for ready datasets, default production evidence gaps, and raw-artifact rejection.
- Vitest cue-validation gate parity tests that keep the in-app preview aligned with the CLI production validation gate.
- Vitest coach validation workflow tests for no-consent, active-consent, revoked/orphan consent exclusion, completed
  worksheet dataset readiness, status export, and raw-artifact blocking.
- Vitest cue validation dataset tests for schema version, production thresholds, wall-angle coverage, reviewer coverage,
  raw-artifact exclusion, and weak-score failures.
- Vitest cue validation dataset doctor tests for missing dataset evidence, parse-error evidence, ready summaries, and
  reviewer identity exclusion.
- Vitest performance-budget tests for local analysis duration thresholds, frame-rate evidence, and over-budget status.
- Vitest analysis evidence tests for versioned report timelines, pass/review/blocked summaries, legacy report fallback,
  and raw artifact rejection.
- Vitest analysis evidence export tests for evidence-only JSON, explicit negative privacy flags, and URI/path/secret
  rejection before sharing.
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
- Vitest coach packet tests for validation-aware cue trust, failed-cue downgrade, and reviewer/raw-artifact exclusion.
- Vitest prepared export share tests for stable file names, JSON/CSV content types, native file-share writes, unavailable
  sharing fallback, and write-failure fallback.
- Vitest observability tests for sanitized diagnostic events and aggregate support packets without raw video artifacts.
- Vitest offline-readiness tests for ready, review, and blocked airplane-mode states.
- Vitest store-readiness tests for bundle/package identifiers, permission copy, privacy declaration, listing copy, and
  screenshot plan.
- Vitest store-submission packet tests for versioned metadata packets, safety-language review state, submission commands,
  negative privacy flags, and token/path/raw-artifact rejection.
- Vitest Android manifest checks for camera/import permissions, audio exclusion, and disabled Android backup.
- Vitest native QA evidence tests for platform coverage, muted recording, metadata reads, workflow pass/fail state,
  latency budgets, battery budget, thermal state, and placeholder evidence rejection.
- Vitest native QA runbook tests for platform workflows, budget reuse, privacy-safe setup instructions, and blocked
  evidence drafts before real device values are entered.
- Vitest native QA evidence kit tests for Plan-tab workflow coverage, shared budgets, validator command, placeholder
  policy, and raw-artifact exclusion.
- Vitest native QA runbook packet tests for versioned share-safe packet generation, blocked placeholder evidence, and
  token-like value rejection before sharing.
- Vitest provider readiness tests for configured web MoveNet path, native platform provider review state, reserved
  provider blocking, fallback provider availability, and privacy-safe output.
- Vitest iOS toolchain doctor tests for Command Line Tools-only blocker detection, full-Xcode ready detection, and durable
  JSON/Markdown report writes.
- Vitest store credentials doctor tests for blocked/ready EAS credential states, secret-value exclusion, and durable
  JSON/Markdown report writes.
- Vitest store credentials setup packet tests for blocked/ready credential-group summaries, required key names, and
  credential/local-path/service-account body rejection before sharing.
- Vitest native QA evidence validation tests for app/CLI parity, draft blocker state, ready physical-device evidence, and
  raw local artifact rejection.
- Vitest native QA evidence import tests for empty state, invalid JSON, ready evidence summaries, blocking checks, and
  raw local artifact rejection in the Plan-tab paste flow.
- Vitest native QA evidence composer tests for structured Android/iOS run inputs, second-to-millisecond normalization,
  incomplete workflow blocking, and raw artifact rejection through the shared validator.
- Vitest native QA evidence composer export tests for versioned share-safe payloads and raw URI/path/token rejection.
- Vitest evidence collection plan tests for cue-validation targets, estimated review rows, native QA workflow checks,
  configurable acceptance thresholds, balanced wall-angle batches, review-row distribution, and raw-artifact exclusion.
- Vitest validation collection packet tests for schema version, balanced batch derivation, reviewer slot templates,
  configurable acceptance thresholds, and raw path/token rejection.
- Vitest release unblock checklist tests for default external blockers, launch-readiness label/action parity, secret key
  name disclosure without secret values, and all-ready evidence state.
- Vitest release unblock packet tests for versioned share-safe packet generation, ready-state packet generation, and
  token/local-path rejection before sharing.
- Vitest release critical path tests for blocker dependency sequencing, parallel owner lanes, ready-to-start state,
  all-ready state, and raw artifact/path/token rejection.
- Vitest release evidence scenario tests for projected launch tracks, cleared blocker counts, prerequisite detection,
  all-ready state, current-evidence immutability, and raw artifact/path/token rejection.
- Vitest release evidence freshness tests for configurable artifact windows, stale evidence, missing/invalid timestamps,
  release report bundle mapping, and raw artifact/path/token rejection; `npm run release:freshness:doctor` writes durable
  JSON/Markdown freshness evidence and is included in `npm run release:check`.
- Vitest release evidence packet tests for aggregated launch/model/provider/native QA evidence, all-ready state, artifact
  status mapping, and token/local-path rejection before sharing.
- Vitest release evidence reconciliation tests for report inference, projected launch readiness, independent store blocker
  clearing, invalid JSON handling, and raw artifact/path/token rejection.
- Vitest launch-readiness doctor tests for store-manifest screenshot completeness, including newly declared screenshots.
- Vitest launch-readiness doctor tests for model-analysis replay detection, missing-report blocking, and failing-report
  blocking before launch tracks are ready.
- Vitest model evidence tests for technical-ready, validated, degraded, missing, environment JSON, and privacy-safe states.
- Vitest model evidence sync tests for report-to-app-config mapping, real-world validation preservation, ready
  cue-validation dataset promotion, privacy-safe report gating, and dry-run mode.
- Vitest safety language tests for clear copy, risky claim detection, negated policy/disclaimer copy, replaceable rules,
  and visible issue limits.
- Vitest release handoff packet tests for release status aggregation, blocker tracks, screenshot completeness, verification
  commands, Markdown rendering, and durable JSON/Markdown writes.
- Vitest release archive manifest tests for SHA-256 checksums, archive byte sizes, repository metadata, worktree-state
  metadata, Markdown rendering, and durable JSON/Markdown writes.
- Vitest CI workflow template tests for GitHub Actions trigger coverage, deferred active-workflow activation, Node
  version sourcing, lockfile install, shared release gate execution, and release evidence artifact upload.
- Vitest GitHub workflow doctor tests for OAuth scope parsing, blocked activation evidence, active workflow/template
  parity, durable JSON/Markdown writes, and token-value exclusion.
- Vitest dependency license doctor tests for permissive, dual-license, missing, restricted, review, and local linked
  package handling plus durable JSON/Markdown writes and path/token exclusion.
- Vitest model-analysis replay tests for MoveNet-shaped keypoint conversion, bundled attempt coverage, privacy-safe
  outputs, metric/cue generation, and failing quality thresholds.
- Vitest coach lens tests for supported lens config, safe default parsing, threshold overrides, cue sorting, local analyzer
  metadata, beta replay focus, drill dosage hints, evidence exports, and coach packet metadata.
- Vitest cue-validation reviewer consensus tests for app/CLI gate parity, distinct reviewers per cue, configurable score
  spread thresholds, privacy-safe reliability summaries, workflow blocking, dataset doctor summaries, and collection-plan
  copy.
- GitHub Actions quality workflow template with `npm run ci` on pushes to `main` and pull requests; activate after the
  GitHub token has `workflow` scope.
- GitHub workflow activation doctor with `npm run release:github:doctor`, which writes
  `docs/sdlc/github-workflow-report.json` and is included in `npm run release:check`.
- Dependency license inventory with `npm run security:licenses`, which writes
  `docs/sdlc/dependency-license-report.json` and is included in `npm run release:check`.
- Web export with `npm run export:web`.
- MoveNet model execution smoke with `npm run model:movenet:smoke`. This loads TensorFlow.js MoveNet SinglePose
  Lightning and runs inference on a synthetic local frame; it verifies model execution, not climbing-coach accuracy.
- MoveNet readiness report with `npm run model:movenet:readiness`, which writes
  `docs/sdlc/movenet-readiness-report.json` and is included in `npm run release:check`.
- Model-analysis replay with `npm run model:analysis:replay`, which writes
  `docs/sdlc/model-analysis-replay-report.json` and is included in `npm run release:check`.
- Model verification suite with `npm run model:verification:suite`, which writes
  `docs/sdlc/model-verification-suite-report.json` and
  `docs/sdlc/model-verification-suite-report.md`, aggregates local runtime/replay/coverage/privacy evidence, and is
  included in `npm run release:check`.
- Model evidence sync with `npm run model:evidence:sync`, which promotes the latest model reports into Expo
  `extra.modelEvidence` and promotes real-world validation only from a ready, share-safe cue-validation dataset report.
- Playwright smoke against exported web bundle with `scripts/smoke_web_video.py`.
- Store screenshot generation with `npm run store:screenshots`.
- Android native debug build with `./gradlew :app:assembleDebug` plus merged manifest validation.
- iOS Pods install with `npm run native:ios:pods`.
- iOS toolchain doctor with `npm run native:ios:doctor`, which writes `docs/sdlc/ios-toolchain-report.json` and is
  included in `npm run release:check`.
- Environment template doctor with `npm run release:env:doctor`, which writes
  `docs/sdlc/env-template-report.json`, verifies `.env.example` covers runtime/smoke/release key names, and rejects
  credential values, token-like strings, and local paths.
- Store credentials doctor with `npm run release:credentials:doctor`, which writes
  `docs/sdlc/store-credentials-report.json` and is included in `npm run release:check`.
- Store credentials setup packet from the Plan tab, which keeps release key names shareable without exposing values.
- Release blocker issue report with `npm run release:blocker-issues`, which writes
  `docs/sdlc/release-blocker-issues-report.json` and `docs/sdlc/release-blocker-issues-report.md`, keeps GitHub issue
  drafts share-safe, and is included in `npm run release:check`.
- Feature completion doctor with `npm run feature:doctor`, which writes `docs/sdlc/feature-completion-report.json`,
  separates internal implementation gaps from external evidence blockers, and is included in `npm run release:check`.
- Validation pilot kit from the Plan tab, which turns collection targets into consent-safe pilot sprints without raw
  video, athlete/coach identities, local paths, credential values, or invented scores.
- Field validation ops packet from the Plan tab, which composes evidence collection, validation pilot, and release unblock
  contracts into ordered real-world collection, validation, and promotion phases without raw video, identities, local
  paths, credential values, or invented scores.
- Cue validation dataset doctor with `npm run validation:cue:doctor`, which writes
  `docs/sdlc/cue-validation-dataset-report.json` and is included in `npm run release:check`.
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
- Capture prep protocol is visible on the Analyze tab with setup, warm-up, record, verify, privacy, and retake guidance.
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
- Sessions tab shows the analysis evidence timeline for local report input, pose provider, quality, cue generation,
  runtime budget, and privacy boundary.
- Sessions tab prepares a versioned analysis evidence-only export from a local report.
- Sessions tab shows a private training log and allows cue usefulness, project status, effort, confidence, tags, and notes to be edited.
- Report export renders privacy-safe JSON and Delete removes the report, private training log, drill practice log, and
  coach consent record from local storage with a deletion receipt.
- Prepared Sessions exports show a native share action after an export is generated and use file sharing when available.
- Sessions tab shows a local coach library after consent with packet counts, review priority, signal status, and
  no-raw-video evidence.
- Sessions tab shows local team templates generated from consented coach library signals.
- Sessions tab prepares a versioned coach library export with privacy flags and team templates after consent.
- Sessions tab prepares a cue-validation study seed with packet-only review tasks and no invented scores after consent.
- Sessions tab prepares a cue-validation clip intake manifest with consented clip coverage and no raw artifacts after consent.
- Sessions tab prepares a cue-validation reviewer onboarding packet with coach instructions, review criteria, and no raw
  artifacts after consent.
- Sessions tab prepares a cue-validation review worksheet with blank coach score rows after consent.
- Sessions tab prepares a cue-validation worksheet CSV for spreadsheet-based coach review collection after consent.
- Sessions tab builds a cue-validation dataset JSON from a completed worksheet CSV after reviewer IDs and scores are filled.
- Sessions tab shows the local cue-validation gate preview after dataset composition.
- Coach packet export requires persisted explicit consent and then renders review JSON with privacy-safe athlete context
  cue trust, and without raw video or private-note artifacts.
- Privacy diagnostics prepare a support packet without raw video, video URI, key-frame, landmark, account, or secret artifacts.
- Privacy data portability prepares a backup JSON with an offline checksum, previews restore, new, existing, skipped, and
  integrity status, writes checksum state into the restore receipt, and restores it locally without raw video leaving the
  device.
- Privacy airplane-mode readiness check confirms local workflow readiness after reports exist.
- Cue validation rubric can score coach reviews once consented clip packets are available.
- Cue validation dataset gate can reject incomplete studies before production movement-quality claims.
- Drills tab shows weekly drill plan, priority dosage, report evidence, private cue feedback adaptation, and private
  practice logging.
- Drills tab shows an advanced drill pack with readiness, wall-angle focus, local signal count, block progression, and
  plan access gating.
- Progress tab shows movement score bars.
- Progress tab shows local history summary, current trend, and Pro history preview.
- Progress tab shows attempt comparison after at least two local reports.
- Progress tab shows smart baseline confidence and match reasons for attempt comparison.
- Progress tab shows a project queue derived from private training logs after a Sessions log is saved.
- Progress tab shows a next-session plan with target, duration, intensity cap, ordered phases, and practice-reset
  adaptation when drill follow-through is blocked.
- Progress tab shows a session closeout checklist with training-log, drill follow-through, repeat-outcome, and privacy
  boundary actions before the next local comparison.
- Progress tab shows a training load balance with recent effort, repeat, skipped-drill signals, recommendation, and
  privacy-safe derived counts.
- Progress tab shows a pre-send guard with score, load cap, action, and local evidence signals before hard tries.
- Progress tab shows technique readiness with score, next action, warm-up, and risk.
- Progress tab shows personal benchmarks for best overall and filtered style segments.
- Progress tab shows recurring cue patterns with latest cue count, total patterns, cleared count, and drill evidence.
- Progress tab shows cue usefulness insights from private Sessions feedback.
- Progress tab shows repeat-outcome success, improved/sent/stalled counts, and next-repeat action after a Sessions repeat
  outcome is logged.
- Progress tab shows beta memory after improved or sent repeat outcomes without exposing private note text.
- Progress tab shows practice consistency from private Drills completion/skipped logs.
- Progress tab filters history by wall angle, grade, and gym without leaving the local report boundary.
- Progress and Drills tabs show plan access gates driven by entitlement capabilities.
- Plan tab shows current tier, upgrade path, capability matrix, and provider readiness from the shared plan catalog.
- Plan tab shows commercial readiness from billing config, including adapter status, paid plan mapping ratio,
  receipt-validation mode, sandbox proof, and credential-free config hygiene.
- Plan tab prepares a commercial readiness packet with billing adapter, paid plan mapping, receipt-validation, sandbox,
  movement-boundary, owner-action, and negative privacy flags before sharing.
- Plan tab shows launch readiness for stakeholder demo, internal native beta, and store submission.
- Plan tab shows model evidence for MoveNet execution, model-shaped replay, and remaining real-video validation without
  production accuracy claims.
- Analyze tab shows the Coach lens selector, default Balanced metadata, and lens options for footwork, body position, and
  power conservation before local camera, import, or demo analysis.
- Sessions validation campaign shows reviewer consensus, prepared dataset exports include reliability and max spread, and
  Plan evidence collection shows the configured max reviewer score spread.
- Plan tab shows provider readiness for primary video provider, fallback provider, native target, and device-proof state.
- Plan tab shows the native QA evidence kit for Android/iOS physical-device runs, workflow count, placeholder policy, and
  validator command.
- Plan tab shows the native QA evidence validator preview with ready run count, blocking check count, and raw-artifact
  exclusion.
- Plan tab shows the native QA evidence composer for structured Android/iOS physical-run measurements and can reuse the
  composed JSON in the local import preview.
- Plan tab prepares a native QA runbook packet with raw video, credential values, and local paths excluded before
  sharing.
- Plan tab shows the evidence collection plan with clip, review-row, device-check, wall-angle, owner targets, balanced
  clip batches, and privacy-first collection checklist.
- Plan tab prepares a validation collection packet with balanced batches, reviewer slots, collection commands, and
  credential/local-path/raw-video flags excluded before sharing.
- Plan tab shows the release unblock checklist with blocker count, owner count, release commands, proof artifacts, and
  credential key names for external store blockers.
- Plan tab prepares a release unblock packet with credential values excluded before sharing.
- Plan tab shows the release critical path with ready, ready-to-start, lane, dependency, command, and proof information
  for the remaining external launch blockers.
- Plan tab prepares a release critical path packet with raw videos, local paths, credential values, and token-like
  strings excluded before sharing.
- Plan tab shows release blocker issue drafts with issue count, owners, credential key names, titles, labels, commands,
  proof expectations, and the repository GitHub issue template path.
- Plan tab prepares a release blocker issue packet with credential values, raw video, raw artifacts, and local paths
  excluded before sharing.
- CLI release blocker issue report generates the same issue-ready external blocker drafts for handoff evidence without
  filing GitHub issues automatically.
- Plan tab prepares a release evidence packet with launch, model, provider, native QA, blocker, artifact, and command
  evidence while excluding raw video, local paths, and credential values.
- Plan tab shows the model verification suite with local runtime, replay, wall-angle, movement metric, cue output,
  privacy, and real-validation status.
- Plan tab shows evidence reconciliation for pasted share-safe release reports, projected launch tracks, cleared blockers,
  proof gaps, and missing report sources.
- Plan tab prepares a release evidence reconciliation packet with credential values, raw artifacts, local paths, and
  token-like values excluded before sharing.
- Plan tab prepares a store submission packet with metadata, privacy declarations, screenshots, copy checks, and
  submission commands while excluding credentials and raw artifacts.
- Plan tab prepares a store credentials setup packet with EAS/App Store/Play key names and release commands while
  excluding credential values, local paths, and raw artifacts.
- Plan tab shows safety-language guard status for medical, injury-prevention, route-safety, and guaranteed-outcome copy
  risks.
- Privacy tab confirms no-upload default behavior.

Commercial readiness automated coverage:

```bash
npx vitest run tests/billingReadiness.test.ts tests/commercialReadinessPacket.test.ts tests/config.test.ts
```

- `tests/billingReadiness.test.ts` covers the default not-connected state, a ready RevenueCat-style adapter, missing paid
  plan mappings, missing receipt validation, and rejection of token-like or local artifact mapping values.
- `tests/commercialReadinessPacket.test.ts` covers versioned packet generation, ready-state action reduction, negative
  privacy flags, and token/local-path/payment-data rejection.
- `tests/config.test.ts` covers `EXPO_PUBLIC_MOVEBETA_BILLING_READINESS` JSON parsing and the default Expo `extra`
  commercial readiness config.

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
