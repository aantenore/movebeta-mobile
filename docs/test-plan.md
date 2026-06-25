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
- Vitest technique readiness packet tests for versioned packet generation, summary copy, report-id exclusion, negative
  privacy flags, and raw local artifact rejection.
- Vitest personal benchmark tests for best overall, wall-angle, grade, gym, latest-vs-best deltas, and empty state.
- Vitest session plan tests for baseline blocks, recovery intensity caps, repeat-project training blocks, and
  practice-reset planning from skipped drill logs.
- Vitest session agenda tests for baseline, controlled, deload, configurable block limits, share-safe agenda packets, and
  raw artifact/private-note rejection.
- Vitest attempt pacing tests for baseline, controlled, progress, reset, configurable rest/attempt limits, and raw
  artifact/private-note rejection, share-safe pacing packets, packet summaries, and rest timer formatting.
- Vitest session closeout tests for baseline checklist, latest-report closeout actions, complete closeout evidence, and
  raw artifact/private-note rejection.
- Vitest training load tests for baseline, balanced, review, deload, configurable threshold behavior, and raw
  artifact/private-note rejection.
- Vitest training load packet tests for versioned packet generation, summary copy, report-id exclusion, negative privacy
  flags, and raw local artifact rejection.
- Vitest pre-send guard tests for baseline, controlled-repeat, reset-first, hard-try window, blocked practice, and
  replaceable thresholds.
- Vitest cue pattern tests for persistent, emerging, cleared, and empty cue-history states.
- Vitest cue feedback insight tests for useful rate, top useful cue, review cue, orphan skipping, and empty state.
- Vitest progress filter tests for wall-angle, grade, and gym option derivation, report filtering, and active filter count.
- Vitest capture-calibration tests for ideal setup, review-grade setup, and blockers caused by privacy or poor pose input.
- Vitest live recording guide tests for setup review advice, coach-lens-specific recording prompts, minimum-duration
  analysis readiness, progress, and near-limit warnings.
- Vitest clip triage tests for local analyze, trim, retake, blocked, too-short, configurable score, and raw URI exclusion.
- Vitest analysis window tests for full, early, middle, late, active-duration, source preservation, sampled timestamp
  bounds, and report budget behavior.
- Vitest analysis evidence tests for report-level analysis-window metadata, timeline step generation, evidence-only export
  serialization, and raw URI/path exclusion.
- Vitest capture prep protocol tests for baseline degradation, report-driven cue focus, setup blockers, retake guidance,
  and local privacy copy.
- Vitest analysis trust tests for coaching-ready local reports, retake decisions from weak pose signal, local-only privacy
  boundary blocking, weighted factors, and raw artifact exclusion.
- Vitest analysis trust packet tests for versioned share-safe packet generation, retake decision export, summary copy,
  negative privacy flags, and raw path/artifact rejection.
- Vitest analysis trust trend tests for empty baselines, improving/degrading trend status, latest decision ordering,
  local-boundary crossings, and raw artifact exclusion.
- Vitest analysis trust trend packet tests for versioned packet generation, summary copy, report-id exclusion, negative
  privacy flags, and raw local artifact rejection.
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
- Vitest cue validation starter kit tests for share-safe blank artifact generation, optional exported seed input, no final
  dataset JSON creation, release evidence report parsing, and unsafe seed rejection.
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
- Vitest iOS toolchain setup packet tests for blocked and ready packet generation, sanitized command/proof copy, negative
  privacy flags, and local-path/token rejection before sharing.
- Vitest store credentials doctor tests for blocked/ready EAS credential states, secret-value exclusion, and durable
  JSON/Markdown report writes.
- Vitest store credentials setup packet tests for blocked/ready credential-group summaries, required key names, and
  credential/local-path/service-account body rejection before sharing.
- Vitest store credentials starter tests for stable setup packet generation, empty env-key template output, EAS project
  binding template output, ready/blocked group detection, deterministic paths, and credential/local-path/token rejection.
- Vitest native QA evidence validation tests for app/CLI parity, draft blocker state, ready physical-device evidence, and
  raw local artifact rejection.
- Vitest native QA evidence import tests for empty state, invalid JSON, ready evidence summaries, blocking checks, and
  raw local artifact rejection in the Plan-tab paste flow.
- Vitest native QA evidence composer tests for structured Android/iOS run inputs, second-to-millisecond normalization,
  incomplete workflow blocking, and raw artifact rejection through the shared validator.
- Vitest native QA evidence composer export tests for versioned share-safe payloads and raw URI/path/token rejection.
- Vitest native QA evidence starter tests for stable input template generation, blocked candidate output, final evidence
  write gating, validator-ready real-run input, and unsafe input rejection.
- Vitest evidence collection plan tests for cue-validation targets, estimated review rows, native QA workflow checks,
  configurable acceptance thresholds, balanced wall-angle batches, review-row distribution, and raw-artifact exclusion.
- Vitest validation collection packet tests for schema version, balanced batch derivation, reviewer slot templates,
  configurable acceptance thresholds, and raw path/token rejection.
- Vitest validation consent packet tests for versioned packet generation, configurable batch thresholds, athlete script,
  required metadata, negative privacy flags, and raw path/identity/token rejection.
- Vitest release unblock checklist tests for default external blockers, launch-readiness label/action parity, secret key
  name disclosure without secret values, and all-ready evidence state.
- Vitest release unblock checklist and critical path tests verify that each external blocker exposes complete
  starter-to-validation command sequences without secret values.
- Vitest release unblock packet tests for versioned share-safe packet generation, ready-state packet generation, and
  token/local-path rejection before sharing.
- Vitest release critical path tests for blocker dependency sequencing, parallel owner lanes, ready-to-start state,
  all-ready state, and raw artifact/path/token rejection.
- Vitest release evidence scenario tests for projected launch tracks, cleared blocker counts, prerequisite detection,
  all-ready state, current-evidence immutability, and raw artifact/path/token rejection.
- Vitest release evidence freshness tests for configurable artifact windows, stale evidence, missing/invalid timestamps,
  release report bundle mapping, and raw artifact/path/token rejection; `npm run release:freshness:doctor` writes durable
  JSON/Markdown freshness evidence and is included in `npm run release:check`.
- Vitest acquisition readiness packet tests for buyer due-diligence signal aggregation, ready/external-clearance/blocked
  states, due-diligence artifact inventory, command checklist, and credential/local-path/media/token rejection;
  `npm run release:acquisition` writes durable JSON/Markdown acquisition evidence and is included in release gates,
  freshness, and handoff artifacts.
- Vitest data-room index tests for categorized due-diligence artifacts, owner/status/sensitivity/location/refresh fields,
  external proof placeholders, missing internal artifact blocking, and credential/local-path/media/token rejection;
  `npm run release:data-room` writes durable JSON/Markdown data-room evidence and is included in release gates,
  freshness, and handoff artifacts.
- Vitest license review packet tests for dependency/model/notice obligation aggregation, blocked obligation handling,
  explicit no-clearance claim, external legal approval reference, and credential/local-path/media/token rejection;
  `npm run release:license-review` writes durable JSON/Markdown license evidence plus generated third-party notices and
  is included in release gates, freshness, handoff, acquisition, and data-room artifacts.
- Vitest web-smoke report tests for schema-versioned pass/fail output, sanitized diagnostics, JSON/Markdown writes,
  and release-gate/readiness/freshness/handoff/acquisition/data-room integration; `npm run web:smoke:report`
  serves the exported web bundle, runs the Playwright smoke runner, writes durable JSON/Markdown evidence, and is
  included in `npm run release:check`.
- Vitest Vercel deployment doctor tests for static-ready unlinked deployments, linked deployments without exposing
  secrets or project ids, blocked static/PWA drift, and JSON/Markdown report writes; `npm run web:vercel:check` writes
  durable static deployment readiness evidence and is included in `npm run release:check`.
- Vitest Vercel workflow doctor tests for template-ready deferred activation, active workflow/template parity,
  missing deployment contract snippets, active workflow drift, JSON/Markdown report writes, and raw credential-like
  value rejection; `npm run web:vercel:workflow` writes durable static deployment workflow evidence and is included in
  `npm run release:check`.
- Vitest Vercel deployment handoff tests for static-ready handoff state, blocked deployment evidence, prebuilt deploy
  command coverage, post-deploy smoke, rollback guidance, and credential/project-id/local-path/media/token rejection;
  `npm run web:vercel:handoff` writes durable JSON/Markdown handoff evidence and is included in release gates,
  freshness, handoff, acquisition, data-room, and release-evidence packets.
- Vitest PWA runtime readiness tests for standalone launches, browser install prompt availability, manual install
  fallback, native install path, and unsafe guidance packet rejection.
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
- Vitest release handoff packet tests for release status aggregation, blocker tracks, screenshot completeness, acquisition
  readiness evidence, verification commands, Markdown rendering, and durable JSON/Markdown writes.
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
- License review packet generation with `npm run release:license-review`, which writes
  `docs/sdlc/license-review-packet.json`, `docs/sdlc/license-review-packet.md`, and
  `docs/legal/THIRD_PARTY_NOTICES.md` without claiming external legal clearance.
- Web export with `npm run export:web`.
- MoveNet model execution smoke with `npm run model:movenet:smoke`. This loads TensorFlow.js MoveNet SinglePose
  Lightning from vendored same-origin static model assets when present and runs inference on a synthetic local frame; it
  verifies model execution, not climbing-coach accuracy.
- MoveNet readiness report with `npm run model:movenet:readiness`, which writes
  `docs/sdlc/movenet-readiness-report.json` from vendored same-origin static model assets when present and is included
  in `npm run release:check`.
- MoveNet static assets doctor with `npm run model:movenet:assets:check`, which verifies same-origin model graph and
  weight shards in `public` and exported `dist`, service-worker model cache coverage, app config URL alignment,
  JSON/Markdown evidence, and release-gate/freshness/handoff integration.
- Model asset provenance doctor with `npm run model:assets:provenance`, which verifies TensorFlow Hub source URLs,
  same-origin asset inventory, SHA-256 parity, attribution notice presence, explicit license-review state,
  release-gate/freshness/handoff/Vercel integration, and share-safety.
- Model delivery lifecycle report with `npm run model:delivery:lifecycle`, which explains build-time vendoring,
  same-origin browser download on first online launch or warmup, native bundle delivery, offline cache reuse, and
  share-safety.
- Vitest MoveNet static asset tests cover mocked TFHub downloads, absolute URL normalization into local shard paths,
  manifest hashing, missing-shard blockers, app model URL drift, JSON/Markdown report writes, and unsafe-value rejection.
- Vitest MoveNet readiness tests cover ready/degraded budget reports plus local static manifest resolution and IOHandler
  loading so the release gate does not regress to a TFHub fetch when vendored assets are present.
- Model-analysis replay with `npm run model:analysis:replay`, which writes
  `docs/sdlc/model-analysis-replay-report.json` and is included in `npm run release:check`.
- Model verification suite with `npm run model:verification:suite`, which writes
  `docs/sdlc/model-verification-suite-report.json` and
  `docs/sdlc/model-verification-suite-report.md`, aggregates local runtime/replay/coverage/privacy evidence, and is
  included in `npm run release:check`.
- Model evidence sync with `npm run model:evidence:sync`, which promotes the latest model reports into Expo
  `extra.modelEvidence` and promotes real-world validation only from a ready, share-safe cue-validation dataset report.
- Playwright smoke against exported web bundle with `scripts/smoke_web_video.py`, using generated SDLC reports for
  release count expectations instead of duplicated numeric literals.
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
- Store credentials starter with `npm run release:credentials:starter`, which writes the share-safe setup packet, empty
  env-key template, and EAS project binding template without exposing values and is included in `npm run release:check`.
- Store credentials setup packet from the Plan tab, which keeps release key names shareable without exposing values.
- Release blocker issue report with `npm run release:blocker-issues`, which writes
  `docs/sdlc/release-blocker-issues-report.json` and `docs/sdlc/release-blocker-issues-report.md`, keeps GitHub issue
  drafts share-safe, and is included in `npm run release:check`.
- Release blocker issue filing plan with `npm run release:blocker-issues:file`, which writes
  `docs/sdlc/release-blocker-issue-filing-plan.json` and `docs/sdlc/release-blocker-issue-filing-plan.md`, stays dry-run
  by default, and requires `--create` plus `MOVEBETA_RELEASE_ISSUE_CREATE=1` before GitHub issue mutation.
- Vitest release blocker issue filing tests cover the mobile-safe schema, dry-run export, exact-title existing issue
  handling, sanitized GitHub CLI failures, and JSON/Markdown artifact writes.
- Release blocker issue web links with `npm run release:blocker-issues:links`, which writes
  `docs/sdlc/release-blocker-issue-web-links.json` and `docs/sdlc/release-blocker-issue-web-links.md` from the same
  issue drafts and configurable GitHub repository.
- Vitest release blocker issue web-link tests cover repository normalization, missing repository state, URL length
  budget review, share-safe schema output, and JSON/Markdown artifact writes.
- Vitest external evidence intake tests cover blocker-derived proof references, accepted reference types, ready state,
  durable JSON/Markdown/template writes, stable output paths, and local-path/token rejection.
- Vitest external evidence validation tests cover filled proof-reference validation, accepted reference-type enforcement,
  missing filled-input reporting, durable JSON/Markdown writes, stable output paths, and share-safe output constraints.
- Vitest external evidence promotion tests cover validation-gated launch-readiness candidate generation, missing evidence
  baseline preservation, durable JSON/Markdown writes, stable output paths, and share-safe output constraints.
- Vitest external evidence apply tests cover dry-run default behavior, explicit write gating, app-config evidence merge,
  durable JSON/Markdown writes, stable output paths, and share-safe output constraints.
- PWA readiness doctor with `npm run web:pwa:check`, which validates the exported web build includes installable
  manifest metadata, service worker registration, PWA icons, same-origin static MoveNet cache assets, offline app boot
  pre-cache coverage, content-addressed service-worker cache versioning, Vercel static config, SPA fallback, and no
  backend/API route surface.
- Vitest PWA readiness tests cover ready static export fixtures, missing dist asset blockers, static or mismatched
  cache-version blockers, model-delivery policy export blockers, and JSON/Markdown report writes.
- Vitest PWA model delivery policy tests cover exported `model-delivery-policy.json`, service-worker policy lookup before
  model precache, cache-version inclusion, and lifecycle download-strategy reporting.
- Browser smoke verifies service worker installation, content-addressed cache keys, cache inventory, offline reload, and
  cached same-origin model policy and manifest access from the exported PWA.
- Browser smoke derives launch-track, feature-completion, model-verification, and PWA readiness count expectations from
  generated reports before asserting Plan-tab release UI.
- Vitest PWA runtime readiness tests cover model-cache ready, partial-cache pending, native bypass, install-prompt, and
  share-safety states.
- Browser smoke verifies the Plan tab model-cache preflight and prepared PWA install guidance include model-cache
  readiness.
- PWA runtime readiness tests cover SHA-256-supported model-integrity gating, fallback behavior, and share-safe install
  guidance fields.
- Vitest PWA update activation tests cover activated, requested, not-needed, unsupported, and unsafe-value rejection
  states; PWA dist tests verify the service worker exposes the explicit activation message.
- Vitest PWA model-cache warmup tests cover ready, partial, unsupported, and share-safety states.
- Browser smoke clicks the Plan tab Warm model action and verifies the prepared warmup packet before offline use.
  Browser smoke also clicks Activate update and verifies the `movebeta.pwa-update-activation.v1` packet.
- Vitest Coach PWA analysis preflight tests cover cached-web ready state, demo fallback, online real-video allow state,
  offline real-video block state, and native provider bypass.
- Vitest Coach PWA analysis preflight tests also cover `shouldWarmBeforeAnalysis`, proving automatic warmup is requested
  only for online uncached real-video analysis and not for cached, native, demo, or offline blocked states.
- Vitest Coach PWA analysis preflight tests cover pending PWA update behavior, blocking offline real-video analysis as a
  stale-model risk while allowing online analysis with explicit refresh guidance and automatic warmup when uncached.
- Vitest Coach workflow-state tests cover idle, model warmup, analysis, recording, and warmup-over-analysis priority for
  disabled controls and state copy.
- Vitest analysis resource plan tests cover short ready clips, long full-clip review, selected-window planning, remote
  source blocking, large decode-surface review, and share-safety rejection.
- Browser smoke verifies the Coach tab analysis resource card and prepared `movebeta.analysis-resource-plan.v1` packet.
- Vitest analysis execution plan tests cover ready cached analysis, online model warmup, offline uncached blocking,
  review-first clips, and share-safety rejection.
- Browser smoke verifies the Coach tab execution checklist and prepared `movebeta.analysis-execution-plan.v1` packet.
- Vitest analysis device readiness tests cover strong device signals, low battery, weak compute, low storage, native
  fallback, and share-safety rejection.
- Browser smoke verifies the Coach tab device readiness card and prepared `movebeta.analysis-device-readiness.v1` packet.
- Vitest analysis run-load tests cover empty ready state, repeated-run cooldown, old-record expiry, high budget review,
  sustained runtime review, and share-safety rejection.
- Browser smoke verifies the Coach tab run-load card and prepared `movebeta.analysis-run-load.v1` packet.
- PWA model-cache warmup tests cover integrity-supported partial state when cached assets do not all verify.
- Browser smoke verifies cached byte totals, verified asset counts, and SHA-256 integrity flags in the prepared warmup
  packet.
- Vitest model delivery lifecycle tests cover first-launch pending state, verified delivery path without warmed runtime
  cache, model asset versioning, pending service-worker update handling, warmed-cache ready state, native bundled
  delivery, static asset blockers, JSON/Markdown report writes, and unsafe-value rejection.
- Vitest model download plan tests cover native bundled delivery, cached PWA offline readiness, offline uncached PWA block
  state, pending update activation, and share-safety rejection.
- Browser smoke verifies the Plan tab model download plan card and prepared `movebeta.model-download-plan.v1` packet.
- Vitest PWA field readiness tests cover verified PWA cache readiness, native packaged readiness, pending-update blockers,
  missing-cache action state, unsupported-browser blockers, and share-safety rejection.
- Browser smoke verifies the Plan tab PWA field readiness card and prepared `movebeta.pwa-field-readiness.v1` packet.
- Vercel deployment readiness doctor with `npm run web:vercel:check`, which validates static prebuilt deployment
  configuration, no backend/API surface, empty Vercel secret template keys, project binding state, deployment-secret
  availability, and share-safe deploy commands.
- Vercel workflow readiness doctor with `npm run web:vercel:workflow`, which validates the documented production
  deploy workflow template, release gate ordering, static export/PWA/Vercel checks, prebuilt deploy command, post-deploy
  smoke, required GitHub secret names, artifact uploads, and active workflow parity.
- Vercel deployment handoff packet with `npm run web:vercel:handoff`, which combines current release gate, PWA, smoke,
  deployment, and workflow reports into prebuilt deploy, post-deploy smoke, inspect, and rollback phases.
- Feature completion doctor with `npm run feature:doctor`, which writes `docs/sdlc/feature-completion-report.json`,
  separates internal implementation gaps from external evidence blockers, and is included in `npm run release:check`.
- Validation pilot kit from the Plan tab, which turns collection targets into consent-safe pilot sprints without raw
  video, athlete/coach identities, local paths, credential values, or invented scores.
- Validation consent packet from the Plan tab, which prepares athlete consent copy, bystander policy, withdrawal policy,
  and per-wall-angle capture checks without raw media, identities, local paths, credentials, or tokens.
- Field validation ops packet from the Plan tab, which composes evidence collection, validation pilot, and release unblock
  contracts into ordered real-world collection, validation, and promotion phases without raw video, identities, local
  paths, credential values, or invented scores.
- Cue validation starter kit with `npm run validation:cue:starter`, which writes the share-safe study seed, clip intake
  manifest, reviewer onboarding packet, blank worksheet JSON/CSV, and SDLC report without creating the final production
  dataset or inventing reviewer identities and scores.
- Cue validation dataset doctor with `npm run validation:cue:doctor`, which writes
  `docs/sdlc/cue-validation-dataset-report.json` and is included in `npm run release:check`.
- Native QA runbook generation with `npm run native:qa:runbook`.
- Native QA evidence starter with `npm run native:qa:starter`, which writes the structured fill-in template and SDLC
  report, composes candidate evidence from filled physical-device measurements, and writes final evidence only when the
  candidate passes validation and `--write-evidence` is provided.
- Native QA evidence validation with `npm run native:qa:validate` after real device runs are captured.
- Cue validation dataset validation with `npm run validation:cue` after consented coach review packets and reviews are
  captured.
- Launch readiness evidence report with `npm run release:readiness` after release gates and native artifacts are refreshed.
- License review packet generation with `npm run release:license-review` after dependency license and model provenance
  reports are refreshed.
- Acquisition readiness packet generation with `npm run release:acquisition` after release evidence, store metadata,
  commercial readiness, and handoff artifacts are refreshed.
- Data-room index generation with `npm run release:data-room` after acquisition, handoff, archive, and release evidence
  artifacts are refreshed.
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
- Analysis trust renders on Analyze and Sessions with local coaching-ready, review-first, journal-only, or retake factors.
- Analysis trust trend renders on Progress with latest decision, ready/review/retake counts, next action, and local-boundary status.
- Progress prepares a versioned analysis trust trend packet with raw media, report ids, private notes, local paths, and
  token-like values excluded before sharing.
- Beta replay plan renders before movement metrics with setup, crux, and exit actions.
- Movement phase breakdown renders before movement metrics with the primary phase and phase scores.
- Cue trust renders before movement metrics with validation-readiness status and per-cue confidence scores.
- Selecting each bundled local attempt runs analysis and updates pose overlay, metrics, cues, and timeline.
- Sessions tab refreshes on focus and shows the latest local attempts.
- Sessions tab shows selectable session review detail with focus metric, primary cue, timeline, and local evidence.
- Sessions tab shows the analysis evidence timeline for local report input, pose provider, quality, cue generation,
  runtime budget, and privacy boundary.
- Sessions tab shows the analysis trust summary for the selected report.
- Sessions tab prepares a versioned analysis trust packet with raw media, landmarks, private notes, local paths, and
  token-like values excluded before sharing.
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
- Progress tab shows a session agenda with load, plan, and closeout blocks, intensity labels, open closeout count, and
  privacy-safe local evidence.
- Progress tab prepares a session agenda packet with schema version, summary, negative privacy flags, and local JSON
  preview.
- Progress tab shows an attempt pacing plan with rest windows, attempt caps, hard-try slots, and stop rules from local
  agenda, load, and guard evidence.
- Progress tab prepares an attempt pacing packet with schema version, summary, negative privacy flags, and local JSON
  preview.
- Progress tab starts and clears a local rest timer from attempt pacing steps.
- Progress tab shows a session closeout checklist with training-log, drill follow-through, repeat-outcome, and privacy
  boundary actions before the next local comparison.
- Progress tab shows a training load balance with recent effort, repeat, skipped-drill signals, recommendation, and
  privacy-safe derived counts.
- Progress prepares a versioned training load packet with raw media, report ids, private notes, local paths, and
  token-like values excluded before sharing.
- Progress tab shows a pre-send guard with score, load cap, action, and local evidence signals before hard tries.
- Progress tab shows technique readiness with score, next action, warm-up, and risk.
- Progress prepares a versioned technique readiness packet with raw media, report ids, private notes, local paths, and
  token-like values excluded before sharing.
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
- Analyze tab recorder shows the live recording guide with setup-aware prompts, coach-lens-specific filming focus,
  minimum-duration readiness, and progress before local analysis.
- Sessions validation campaign shows reviewer consensus, prepared dataset exports include reliability and max spread, and
  Plan evidence collection shows the configured max reviewer score spread.
- Plan tab shows provider readiness for primary video provider, fallback provider, native target, and device-proof state.
- Plan tab shows the native QA evidence kit for Android/iOS physical-device runs, workflow count, placeholder policy, and
  validator command.
- Plan tab shows the native QA evidence validator preview with ready run count, blocking check count, and raw-artifact
  exclusion.
- Plan tab shows the native QA evidence composer for structured Android/iOS physical-run measurements and can reuse the
  composed JSON in the local import preview.
- Plan tab prepares an iOS toolchain setup packet with sanitized full-Xcode, Developer directory, workspace, Pods,
  build-settings, and build-log checks while excluding local paths, credentials, raw artifacts, raw video, and tokens.
- Plan tab prepares a native QA runbook packet with raw video, credential values, and local paths excluded before
  sharing.
- Plan tab shows the evidence collection plan with clip, review-row, device-check, wall-angle, owner targets, balanced
  clip batches, and privacy-first collection checklist.
- Plan tab prepares a validation collection packet with balanced batches, reviewer slots, collection commands, and
  credential/local-path/raw-video flags excluded before sharing.
- Plan tab prepares a validation consent packet with consent copy, bystander/withdrawal policy, required metadata, and
  credential/local-path/raw-video/identity flags excluded before sharing.
- Plan tab shows the release unblock checklist with blocker count, owner count, release commands, proof artifacts, and
  credential key names for external store blockers.
- Plan tab prepares a release unblock packet with credential values excluded before sharing.
- Plan tab shows the release critical path with ready, ready-to-start, lane, dependency, command, and proof information
  for the remaining external launch blockers.
- Plan tab prepares a release critical path packet with raw videos, local paths, credential values, and token-like
  strings excluded before sharing.
- Plan tab shows release blocker progress with owner, dependency, missing proof count, accepted reference types, current
  command, and next action for every remaining external launch blocker.
- Plan tab prepares a release blocker progress packet with raw videos, local paths, credential values, raw artifacts, and
  token-like strings excluded before sharing.
- Vitest release blocker progress tests cover default missing-proof/dependency-blocked aggregation, accepted proof
  references after dependency clearance, and unsafe value rejection.
- Plan tab shows release blocker issue drafts with issue count, owners, credential key names, titles, labels, commands,
  proof expectations, and the repository GitHub issue template path.
- Plan tab prepares a release blocker issue packet with credential values, raw video, raw artifacts, and local paths
  excluded before sharing.
- CLI release blocker issue report generates the same issue-ready external blocker drafts for handoff evidence without
  filing GitHub issues automatically.
- CLI release blocker issue filing plan turns those drafts into a share-safe dry-run plan, detects existing exact-title
  GitHub issues in create mode, records planned/existing/created/failed statuses, and keeps mutation behind explicit
  opt-in.
- Plan tab shows release blocker issue filing metrics, command previews, filing statuses, and prepares the same versioned
  dry-run filing JSON without bundling Node or GitHub CLI mutation code.
- Plan tab shows release blocker issue web-link metrics and prepares a versioned prefilled-link packet from mobile-safe
  core logic without bundling Node or GitHub CLI mutation code.
- Exported web build includes installable PWA metadata and service worker registration, and the PWA readiness doctor
  verifies the static Vercel deployment path before release handoff.
- Plan tab shows Vercel deployment readiness and prepares a Vercel packet with backend-required false, static-ready
  status, prebuilt deploy commands, and no committed credential/project id values.
- Plan tab shows Vercel workflow readiness and prepares a workflow packet with template-ready status, deferred activation
  actions, active workflow parity state, and no committed credential values.
- Plan tab shows PWA runtime readiness and prepares PWA install guidance with raw video, local paths, and credential
  values excluded before sharing.
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
- Plan tab prepares a store release account runbook with ordered metadata, account, credential, native QA, strict-gate,
  and submit phases while excluding credential values, project id values, local paths, raw artifacts, raw video, and
  token-like values.
- Vitest store release account runbook tests cover default blocked state, ready-for-strict-gate state, ready-for-submit
  state, and unsafe value rejection.
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

Coach model download timing coverage:

- `tests/modelDownloadPlan.test.ts` covers the shared native/PWA download-plan contract used by Plan and Coach.
- Browser smoke verifies the Coach Model download timing card, download trigger step, and share-safe
  `movebeta.model-download-plan.v1` packet before capture.
- `tests/pwaFieldReadiness.test.ts` covers the shared PWA field-readiness contract used by Plan and Coach.
- Browser smoke verifies the Coach Field readiness card, runtime-surface step, and share-safe
  `movebeta.pwa-field-readiness.v1` packet before capture.
- `tests/coachSessionLaunch.test.ts` covers the Coach session-launch contract across ready, review, blocked, cooldown,
  and unsafe-export states.
- Browser smoke verifies the Coach Session launch card, model-readiness step, and share-safe
  `movebeta.coach-session-launch.v1` packet before capture.

Cue-validation worksheet preflight coverage:

- `tests/cueValidationWorksheetPreflight.test.ts` covers empty, blank, completed, and raw-artifact worksheet CSV states.
- `tests/coachValidationWorkflow.test.ts` verifies the preflight stays aligned with the Sessions validation workflow.
- Browser smoke verifies the Sessions Worksheet preflight panel, share-safe preflight packet, and ready transition after
  completing reviewer and score cells.
- `tests/cueValidationStudy.test.ts` covers the reviewer assignment packet, including reviewer-slot row counts,
  score-cell counts, worksheet filters, status, negative privacy flags, and raw-artifact/token rejection.
- Browser smoke verifies the Sessions Assignments action and share-safe `movebeta.cue-validation-reviewer-assignment.v1`
  packet before worksheet completion.
- `tests/cueValidationStudy.test.ts` covers the collection runbook across needs-review, ready-for-dataset, and unsafe
  export states, including phase owners, current phase, worksheet preflight status, and negative privacy flags.
- Browser smoke verifies the Sessions Runbook action and share-safe `movebeta.cue-validation-collection-runbook.v1`
  packet before worksheet completion.

## Native QA Before Store Submission

- Android custom dev build with `native-platform-pose`.
- iOS simulator/device build after full Xcode installation.
- iOS toolchain setup packet export before the iOS build blocker is assigned or handed off.
- Camera permission flow.
- Capture setup blocks recording when visible bystanders, cropped framing, backlighting, or unusable distance are selected.
- Recorder live guide prompts are visible during recording without requiring network or cloud analysis.
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
