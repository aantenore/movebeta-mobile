# Release Readiness Report

Date: 2026-06-23
Version: 1.0.0

## Status

Go for runnable video MVP, stakeholder demo, web preview, and Android custom development build.

No-go for App Store / Play Store production with model-based technique claims until iOS is built with full Xcode and both
platforms are validated on physical climbing videos and devices.

## Verified Workflows

- Analyze tab loads the on-device coach.
- User can record or import a local climbing video source from the app surface.
- Camera recording uses a muted, configured video profile and avoids microphone permission by default.
- Local video duration and dimensions are resolved through the native bridge when available before intake and analysis.
- User can set session metadata for recorded/imported attempts before analysis.
- User can calibrate capture setup before recording, including framing, view angle, distance, lighting, wall contrast,
  phone stability, and visible bystanders.
- Coach recorder shows an on-device live recording guide with setup-aware prompts, coach-lens-specific filming focus,
  minimum-duration readiness, near-limit warnings, and progress before local analysis runs.
- Selected local videos render a preview card and route through local analysis.
- Selected videos show clip-readiness status, sampled-frame estimate, local-source guard, and duration/resolution warnings.
- Selected videos show a local clip triage decision with analyze, trim, retake, or blocked recommendation before the
  on-device model runs.
- Selected long videos can be analyzed with a full, early, middle, or late local analysis window without editing or
  uploading the original file.
- Local reports and evidence-only exports persist the effective analysis window as safe numeric metadata without raw video
  references.
- Reports show analysis quality, frame coverage, landmark coverage, visibility, and weak-input warnings.
- Reports show local analysis duration, processed-frame rate, and budget status.
- Reports include a versioned local analysis evidence timeline for input normalization, pose provider, signal quality,
  cue generation, runtime budget, and privacy boundary.
- Sessions prepares a versioned analysis evidence-only export with explicit negative privacy flags before sharing.
- Analyze converts video signal quality into ready, review, or retake guidance before coaching cues.
- Analyze and Sessions show a local analysis trust summary that combines signal quality, body coverage, cue evidence,
  runtime budget, evidence timeline, and privacy boundary into coaching-ready, review-first, journal-only, or retake
  decisions.
- Sessions prepares a share-safe analysis trust packet with versioned trust factors, report metadata, and explicit
  negative privacy flags before sharing.
- Progress shows an analysis trust trend across filtered local reports with latest decision, ready/review/retake counts,
  next action, and local-boundary status without raw video or private notes.
- Progress prepares a share-safe analysis trust trend packet with versioned reliability status, counts, latest decision,
  next action, and explicit negative privacy flags before sharing.
- Analyze turns the current cue and metric evidence into a local setup, crux, and exit beta replay plan before movement
  metrics.
- Analyze scores launch, crux, and finish phases from local cue and timeline evidence before movement metrics.
- Progress shows local history summary, best signal, next focus metric, next-session planning, technique readiness,
  share-safe technique readiness packet preparation, local session agenda, local training load, share-safe training load
  packet preparation, pre-send guard, personal benchmarks, recurring cue patterns, cue usefulness insights, practice
  consistency, attempt comparison, and trend deltas.
- Progress lowers the next-session plan to a practice reset when private drill logs show skipped drills exceeding
  completed drills.
- Progress shows a local session closeout checklist that turns the next-session plan, pre-send guard, drill
  follow-through, repeat outcome, and privacy boundary into post-session logging actions.
- Progress shows a local session agenda that composes training load, next-session plan phases, and closeout evidence into
  minute-based blocks with intensity labels and no raw artifacts.
- Progress prepares a share-safe session agenda packet with a stable schema, local-only timing/intensity evidence, and
  explicit negative privacy flags before sharing.
- Progress shows a local attempt pacing plan that turns agenda, load, and pre-send evidence into rest windows, attempt
  caps, hard-try slots, and stop rules before adding intensity.
- Progress prepares a share-safe attempt pacing packet with local-only attempt budget, rest, stop-rule evidence, and
  explicit negative privacy flags before sharing.
- Progress starts a local rest timer from attempt pacing steps and keeps the timer state on device.
- Progress summarizes recent private effort, repeat attempts, stalled outcomes, and drill follow-through into a local
  training-load recommendation without exposing private notes or raw video artifacts.
- Drills shows a weekly drill plan with priority, dosage, report evidence, private cue feedback adaptation, private
  practice logging, and coach pack preview.
- Web builds use TensorFlow.js MoveNet when local browser video decoding is available.
- MoveNet-shaped keypoints map through a reusable pose-frame contract before reaching the local movement analyzer.
- MoveNet model readiness loads the vendored same-origin static MoveNet graph and shards, then writes a durable local
  report with CPU backend, model source, model URL, load time, average and max inference time, memory evidence, and
  explicit synthetic-frame limitations.
- Model-analysis replay writes a durable local report proving MoveNet-shaped keypoints produce privacy-safe metrics and
  cues across bundled slab, vertical, and overhang attempts.
- Model verification suite writes durable JSON and Markdown evidence that aggregates MoveNet runtime budgets,
  model-shaped replay, wall-angle coverage, movement metric coverage, cue output coverage, privacy checks, and real
  validation status.
- Model delivery lifecycle writes durable JSON and Markdown evidence that separates build-time vendoring, configurable
  PWA model delivery policy, same-origin service-worker install download or warmup, content-addressed model update
  invalidation, pending PWA update handling, native bundle delivery, and offline cache reuse while distinguishing verified
  delivery-path evidence from each browser's current model cache state.
- Native QA runbook generation prepares iOS and Android physical-device validation workflows from the same workflow and
  budget contract used by the native QA evidence validator.
- Android custom native builds compile the `native-platform-pose` provider backed by ML Kit and local video metadata reads.
- iOS native source includes Apple Vision pose extraction, local video metadata reads, and local Photos asset resolution
  behind the same provider contract.
- Reserved native adapter keys for MediaPipe, Core ML, and TensorFlow Lite fail clearly until those adapters are
  implemented.
- User can select bundled local attempts and get distinct local analysis reports.
- Reports are persisted locally, refreshed on Sessions focus, exported as full JSON, and deleted with their private
  training log, drill practice log, and coach consent record.
- Prepared Sessions exports expose an explicit native share action after the payload is generated, write local
  `.json`/`.csv`/`.txt` files to cache when native file sharing is available, and fall back to text sharing otherwise.
- Sessions lets the user select a local report review with quality facts, performance facts, focus metric, primary cue,
  timeline markers, local privacy evidence, and the analysis evidence timeline.
- Sessions lets the user keep private per-report training notes with cue usefulness, project status, perceived effort,
  confidence, and local tags behind browser/local or native SQLite persistence.
- Progress converts private training logs into a local project queue with active project count, repeat count, sent count,
  effort, and next-repeat action.
- Sessions lets the user log comparable repeat outcomes after applying a beta plan, including improved/sent/fell/regressed
  state, attempt count, and resolved cues.
- Progress converts private repeat outcomes into success rate, improved/sent/stalled counts, resolved cue count, and
  next-repeat action.
- Progress converts improved and sent repeat outcomes into a local beta memory with reusable cue recommendations while
  excluding private notes.
- Progress filters local report history and the project queue by wall angle, grade, and gym.
- Native report persistence uses SQLite behind the same repository contract, with browser/local fallback storage.
- Sessions persists explicit per-report consent before preparing a coach review packet with privacy-safe athlete context
  from training-log scores, cue feedback, and drill practice, without raw video, URI, key-frame, landmark, private-note, or
  drill-note artifacts.
- Sessions shows a local coach library queue from active consented reports with review priority, signal status, feedback
  counts, practice counts, and no-raw-video evidence.
- Sessions generates local coach team templates from consented review signals for high-priority review, follow-through
  review, signal retakes, and privacy-safe packet handoff.
- Sessions prepares a versioned coach library export from consented queue metadata and team templates without raw video,
  URI, private notes, drill notes, frames, key frames, or landmarks.
- Sessions prepares a cue-validation study seed from active consented coach packets with packet-only review tasks and no
  invented reviewer scores.
- Sessions prepares a cue-validation reviewer onboarding packet with coach instructions, review criteria, command checklist,
  collection summary, negative privacy flags, and raw-artifact rejection before coach worksheets are shared.
- Sessions prepares a cue-validation review worksheet from the study seed with null reviewer identities and null score
  fields for real coach completion.
- Sessions prepares a cue-validation worksheet CSV with stable headers, escaped values, blank reviewer/score cells, and
  raw-artifact text rejection.
- Sessions can compose validation dataset JSON from completed worksheet CSV only after real reviewer IDs and 1-5 scores
  are present and rows still match the original study seed.
- Sessions can preview cue-validation production readiness locally, and automated parity tests keep that preview aligned
  with the CLI gate used for release validation.
- Privacy can prepare a diagnostics support packet without raw video, URI, key-frame, landmark, account, or secret artifacts.
- Privacy can prepare and restore a versioned local backup JSON with reports, training logs, drill practice, and consent
  records without raw video, video URI, audio, account identifiers, or secrets, while exposing checksum state before and
  after restore.
- Privacy shows an airplane-mode readiness self-check for local provider, storage, cloud sync, raw export, and report history.
- Store readiness manifest validates bundle identifier, Android package, permission copy, privacy declarations, listing
  copy, and screenshot plan.
- EAS release readiness validates remote app versioning, internal development/preview profiles, production app bundle
  output, production auto-increment, binary identifiers, submit profile presence, and absence of committed submit secrets.
- Store screenshots are captured from the exported app for Analyze, Drills, Progress, Sessions, Plan, Release Unblock,
  Release Critical Path, Release Evidence Scenarios, Release Freshness, Model Delivery Lifecycle, Privacy, and Data
  Portability.
- Cue validation scoring harness and rubric are ready for consented coach review datasets.
- Cue validation dataset contract, template, and CLI gate are versioned and ready for real consented coach review studies.
- Free, Pro, and Coach capabilities are modeled through active-plan entitlements without hard-coded pricing.
- Plan tab shows the configured current tier, upgrade path, capability matrix, and provider-agnostic billing readiness from the
  shared entitlement catalog.
- Plan tab shows configurable model evidence for MoveNet execution, model-shaped replay, and remaining real-world
  validation, keeping local technical readiness separate from production movement-quality claims.
- Plan tab shows the model verification suite with runtime, replay, coverage, privacy, and real-validation status in one
  release-facing card.
- Plan tab shows configurable provider readiness for the primary video provider, local fallback, native target provider,
  runtime proof status, and local privacy boundary.
- Plan tab shows configurable commercial readiness for billing adapter status, paid plan mapping ratio,
  receipt-validation mode, sandbox proof, movement-domain isolation, and config hygiene without credential values.
- Plan tab prepares a share-safe commercial readiness packet with billing readiness summary, owner actions, and explicit
  payment-data, receipt-value, credential, local-path, raw-video, and raw-artifact exclusion flags.
- Plan tab prepares a share-safe native QA runbook packet with physical-device workflows, budgets, blocked draft
  evidence, validator command, and explicit credential/local-path/raw-video exclusion flags.
- Plan tab composes native QA evidence from structured Android/iOS physical-run measurements and reuses the same local
  validator preview before proof JSON is committed.
- Plan tab prepares a share-safe native QA evidence composer export with schema version, validator summary, and explicit
  raw path/token rejection.
- Plan tab shows launch-readiness tracks for stakeholder demo, internal native beta, and store submission, keeping
  MoveNet model readiness, model-analysis replay evidence, full-Xcode, physical-device QA, real cue-validation data, and
  EAS/store credentials visible as explicit blockers.
- Plan tab shows a release unblock checklist that derives external blockers from launch readiness and lists proof
  artifacts, release commands, owners, affected tracks, and credential key names without exposing secret values.
- Plan tab prepares a share-safe release unblock packet with commands, proof expectations, owners, tracks, acceptance
  criteria, env key names, and explicit credential/raw-artifact exclusion flags.
- Release blocker issue report regenerates the same external blocker issue drafts from launch evidence as durable JSON and
  Markdown, without filing issues automatically or exposing credentials, local paths, raw video, or raw artifacts.
- Release blocker issue filing plan turns the generated drafts into a share-safe dry-run GitHub filing plan, with
  exact-title existing issue detection in create mode and mutation gated behind `--create` plus
  `MOVEBETA_RELEASE_ISSUE_CREATE=1`.
- Plan tab shows the release blocker issue filing plan with planned/existing/created counts, command previews, filing
  status, and a share-safe JSON export from mobile-safe core logic.
- Plan tab shows a release critical path that sequences external blockers across real-world validation, native build/QA,
  and store-account lanes, including dependency keys and ready-to-start states.
- Plan tab prepares a share-safe release critical path packet with commands, proof expectations, dependencies, lane
  summaries, and explicit credential/local-path/raw-artifact exclusion flags.
- Plan tab shows release evidence scenarios that compare future proof-collection bundles before account, device, or
  coach-review work starts, including projected ready tracks, cleared blockers, missing prerequisites, and commands.
- Plan tab prepares a share-safe release evidence scenario packet with explicit credential/local-path/raw-artifact
  exclusion flags.
- Plan tab shows release evidence freshness for generated launch, model, feature-completion, blocker-issue, and
  store-submission reports, surfacing stale, missing, or invalid timestamps before handoff.
- Plan tab shows installable PWA readiness from the generated static report, including manifest, service worker,
  exported static assets, offline app boot cache assets, same-origin MoveNet cache assets, Vercel static config, SPA
  fallback, and no-backend status.
- Plan tab shows Static MoveNet assets from the generated report, including configured model URL, graph/shard counts,
  service-worker cache coverage, exported dist parity, and a share-safe packet export.
- Plan tab shows Model asset provenance from the generated report, including TensorFlow Hub source URL, SHA-256 parity,
  attribution notice status, explicit license-review state, and a share-safe packet export.
- Plan tab shows Model delivery lifecycle from the generated report and live runtime state, including build-time
  vendoring, configured PWA model-delivery policy, app-origin service-worker install or warmup, content-addressed model
  update invalidation, pending service-worker update handling, native bundle delivery, offline cache reuse, delivery-path
  verification, per-device cache state, and a share-safe packet export.
- Plan tab shows PWA runtime readiness from browser signals, including install prompt state, standalone mode, service
  worker/cache readiness, model-cache warmup status, model-integrity readiness, network state, update state, share-safe
  install guidance, and an explicit Warm model action with SHA-256 integrity verification for cached model assets when
  Web Crypto is available.
- Coach tab shows a PWA model-cache preflight before record/import, reuses shared browser cache helpers, exposes Warm
  model in the capture workflow, allows online real-video analysis, blocks offline real-video analysis when MoveNet
  assets are missing, and bypasses browser cache checks for native builds.
- Coach analysis automatically runs same-origin model warmup before online uncached real-video analysis, while preserving
  the offline block when model assets are not cached.
- Coach workflow derives Warming model/Analyzing/Recording labels and disabled capture/edit states from a tested contract
  to prevent duplicate record/import/analyze actions during local model preparation.
- Coach intake shows an analysis resource plan before execution, including sampled frames, runtime budget, decode-surface
  estimate, selected analysis window, and a `movebeta.analysis-resource-plan.v1` packet that excludes video URI and raw
  media.
- Coach intake shows an execution checklist before the model starts, combining clip intake, clip triage, model readiness,
  resource budget, and privacy boundary into ready, review, warmup-required, or blocked states plus a
  `movebeta.analysis-execution-plan.v1` packet.
- Coach capture shows device readiness before analysis, using available runtime, battery, compute, and storage signals,
  plus refresh and `movebeta.analysis-device-readiness.v1` packet actions without exporting raw media or local paths.
- Coach capture shows analysis run load for the active app session, including repeated-run cooldown, high-budget review,
  sustained runtime review, clear action, and `movebeta.analysis-run-load.v1` packet export without report ids or raw media.
- Plan tab shows a model download plan derived from lifecycle and runtime readiness, distinguishing native packaged
  delivery from PWA download timing, extra bytes, cache warmup, integrity, update activation, and offline-use steps.
- Coach PWA preflight blocks offline real-video analysis when a service-worker update is pending, preventing stale cached
  model assets from being treated as field-ready before refresh and warmup.
- Plan tab exposes an Activate update action that requests waiting service-worker activation, refreshes runtime/cache
  state, and prepares a `movebeta.pwa-update-activation.v1` packet with post-update model warmup guidance.
- Plan tab shows a PWA field readiness checklist that aggregates runtime, service-worker, model-cache, integrity, model
  download, and pending-update state before offline real-video gym use, and prepares a
  `movebeta.pwa-field-readiness.v1` packet.
- Plan tab shows Vercel static deployment readiness from the generated report, including prebuilt deploy mode, no-backend
  surface, project-binding action state, deployment-secret action state, and share-safe packet export.
- Plan tab shows Vercel workflow readiness from the generated report, including template-ready status, deferred active
  workflow action state, template parity checks, and share-safe packet export.
- Plan tab prepares a share-safe release evidence packet with launch readiness, model evidence, model verification suite
  report, provider readiness, native QA runbook, blocker checklist, relative artifact refs, release commands, and explicit
  credential/raw-artifact exclusion flags.
- Plan tab shows release evidence reconciliation for pasted cue-validation, native QA, iOS toolchain, and store
  credential reports, previews cleared blockers and projected launch tracks, and prepares a share-safe reconciliation
  packet before launch evidence is changed.
- Plan tab prepares a share-safe store submission packet with metadata, privacy declarations, screenshots, safety-language
  scan, submission commands, and explicit credential/raw-artifact exclusion flags.
- Plan tab prepares a share-safe store credentials setup packet with EAS project binding, Expo token, App Store Connect,
  and Google Play key names, release commands, and explicit credential/raw-artifact exclusion flags.
- Plan tab shows a machine-readable feature completion audit with task, backlog, traceability, internal-gap, and external
  blocker counts derived from release evidence.
- Plan tab shows balanced validation collection batches with per-wall-angle clip targets, review-row estimates, capture
  focus, and a privacy-first collection checklist derived from cue-validation acceptance thresholds.
- Plan tab prepares a share-safe validation collection packet with balanced batches, reviewer slot templates, collection
  commands, and negative privacy flags before product and coach handoff.
- Plan tab prepares a share-safe validation pilot kit with consent principles, wall-angle pilot sprints, capture setup
  guidance, coach review rules, closeout commands, and explicit identity/raw-video/score-invention exclusion flags.
- Plan tab prepares a share-safe validation consent packet with athlete consent copy, bystander policy, withdrawal
  handling, required metadata, wall-angle capture checks, and explicit identity/raw-video/token exclusion flags.
- Plan tab prepares a share-safe iOS toolchain setup packet with sanitized full-Xcode, Developer directory, workspace,
  Pods, build-settings, and build-log checks plus commands and proof expectations before iOS build handoff.
- Sessions prepares a cue-validation clip intake manifest from consented study seed data, showing clip coverage,
  wall-angle gaps, required coach review rows, negative privacy flags, and raw artifact rejection before coach worksheets
  are shared.
- Sessions prepares a cue-validation reviewer onboarding packet from consented study seed data, keeping raw video, local
  paths, credentials, reviewer identities, and invented scores out of the reviewer handoff.
- Plan tab shows a configurable safety-language guard for medical, injury-prevention, route-safety, and
  guaranteed-outcome copy risks across product and release copy.
- `npm run release:handoff` writes JSON and Markdown handoff packets with repo, commit, product identity, gate status,
  blockers, screenshots, artifacts, and verification commands.
- Launch-readiness evidence can come from Expo `extra.launchReadinessEvidence` or
  `EXPO_PUBLIC_MOVEBETA_LAUNCH_READINESS_EVIDENCE`, so release environments can update evidence without changing code.
- `npm run release:readiness` writes `docs/sdlc/launch-readiness-report.json` and distinguishes configured evidence from
  detected local artifacts, so stale launch flags become drift instead of silent readiness.
- `npm run release:blocker-issues` writes `docs/sdlc/release-blocker-issues-report.json` and
  `docs/sdlc/release-blocker-issues-report.md` with issue-ready external blocker drafts generated from current launch
  evidence.
- `npm run release:blocker-issues:file` writes `docs/sdlc/release-blocker-issue-filing-plan.json` and
  `docs/sdlc/release-blocker-issue-filing-plan.md` as a dry-run by default, with 5 planned issue filings in the latest
  local run.
- `npm run release:blocker-issues:links` writes `docs/sdlc/release-blocker-issue-web-links.json` and
  `docs/sdlc/release-blocker-issue-web-links.md` with 5/5 prefilled GitHub issue links ready for the configured
  `aantenore/movebeta-mobile` repository.
- `npm run web:pwa:check` writes `docs/sdlc/pwa-readiness-report.json` and
  `docs/sdlc/pwa-readiness-report.md`, verifying the installable static PWA path, offline app boot cache coverage,
  exact content-addressed service-worker cache versioning, same-origin model cache assets, exported model-delivery
  policy, and no API routes or backend.
- `npm run web:smoke:report` writes `docs/sdlc/web-smoke-report.json` and
  `docs/sdlc/web-smoke-report.md`, serving the exported bundle, running the Playwright smoke runner, and recording
  share-safe pass/fail evidence for release UI, PWA cache, model-delivery, and report-derived expectations.
- `npm run web:vercel:check` writes `docs/sdlc/vercel-deployment-report.json` and
  `docs/sdlc/vercel-deployment-report.md`, verifying static prebuilt deployment readiness without committing Vercel
  account values or adding backend routes.
- `npm run web:vercel:workflow` writes `docs/sdlc/vercel-workflow-report.json` and
  `docs/sdlc/vercel-workflow-report.md`, verifying the static production deployment workflow template before activation
  without committing Vercel credential values or a live GitHub Actions workflow.
- `npm run web:vercel:handoff` writes `docs/sdlc/vercel-deployment-handoff.json` and
  `docs/sdlc/vercel-deployment-handoff.md`, combining release gate, PWA, web smoke, Vercel deployment, and Vercel
  workflow evidence into no-backend prebuilt deploy, post-deploy smoke, inspect, and rollback phases.
- `npm run model:movenet:assets:check` writes `docs/sdlc/movenet-static-assets-report.json` and
  `docs/sdlc/movenet-static-assets-report.md`, verifying same-origin MoveNet graph/weight assets in `public` and
  exported `dist`, app config URL alignment, and service-worker model cache coverage.
- `npm run model:assets:provenance` writes `docs/sdlc/model-asset-provenance-report.json` and
  `docs/sdlc/model-asset-provenance-report.md`, verifying TensorFlow Hub source URLs, same-origin asset inventory,
  SHA-256 parity, attribution notice presence, and explicit license-review state.
- `npm run model:delivery:lifecycle` writes `docs/sdlc/model-delivery-lifecycle-report.json` and
  `docs/sdlc/model-delivery-lifecycle-report.md`, explaining build-time vendoring, the configured
  `precache-on-install` web download strategy, same-origin service-worker install fetch, explicit warmup, native bundle
  delivery, and offline cache reuse without raw artifacts or credentials.
- `npm run release:check` writes `docs/sdlc/release-gate-report.json` with ordered pass/fail step evidence for quality,
  MoveNet readiness, model-analysis replay, model verification suite, native QA runbook, iOS toolchain doctor,
  cue-validation dataset doctor, store credential readiness, GitHub workflow activation, feature completion, store
  submission packet generation, release blocker issue report, filing-plan and web-link generation, web export, static
  MoveNet asset readiness, model asset provenance, model delivery lifecycle, PWA readiness, web smoke report, Vercel
  deployment readiness, Vercel workflow readiness, Vercel deployment handoff, EAS standard check,
  moderate-or-higher dependency audit, dependency license inventory, license review packet, acquisition readiness,
  data-room index, and release evidence freshness.
- `docs/sdlc/ci-templates/github-actions-quality.yml` defines the shared `npm run ci` release gate for pushes to `main`
  and pull requests, then uploads machine-readable release evidence artifacts, including blocker issue drafts, without
  committing generated CI outputs.
- `npm run native:ios:doctor` writes `docs/sdlc/ios-toolchain-report.json` and
  `docs/sdlc/ios-toolchain-report.md`, so full-Xcode blockers are captured as release evidence.
- `npm run release:credentials:doctor` writes `docs/sdlc/store-credentials-report.json` and
  `docs/sdlc/store-credentials-report.md`, so account-bound EAS/App Store/Play Store blockers are captured without
  exposing credential values.
- `npm run feature:doctor` writes `docs/sdlc/feature-completion-report.json` and
  `docs/sdlc/feature-completion-report.md`, so tracked work completion is separated from external data, device, account,
  and credential blockers.
- `npm run release:freshness:doctor` writes `docs/sdlc/release-freshness-report.json` and
  `docs/sdlc/release-freshness-report.md`, so generated release reports must stay inside configurable freshness windows
  before handoff or store work.
- `npm run release:license-review` writes `docs/sdlc/license-review-packet.json`,
  `docs/sdlc/license-review-packet.md`, and `docs/legal/THIRD_PARTY_NOTICES.md`, aggregating dependency, model, notice,
  and legal-clearance review evidence without claiming external legal approval.
- `npm run release:acquisition` writes `docs/sdlc/acquisition-readiness-packet.json` and
  `docs/sdlc/acquisition-readiness-packet.md`, aggregating product, technical, distribution, commercial, model,
  supply-review, and handoff signals for buyer due diligence without exposing private artifacts.
- `npm run release:data-room` writes `docs/sdlc/data-room-index.json` and `docs/sdlc/data-room-index.md`, categorizing
  buyer due-diligence artifacts by product, release, model, legal, distribution, commercial, native, validation,
  security, and archive scope with owner, status, sensitivity, location, and refresh command.
- `npm run validation:cue:doctor` writes `docs/sdlc/cue-validation-dataset-report.json` and
  `docs/sdlc/cue-validation-dataset-report.md`, so real-review dataset blockers are captured without embedding dataset
  rows or reviewer identities.
- `npm run release:archives` writes source and web-dist zip archives plus JSON and Markdown manifests with byte sizes,
  SHA-256 checksums, repository metadata, and worktree-state evidence.
- Launch-readiness detection validates model-analysis replay, native QA evidence, and cue-validation datasets with their
  production validators before marking those artifacts verified.
- Exported reports expose privacy-safe metadata and do not include raw video URIs.
- Drills, Progress, Sessions, Plan, and Privacy tabs navigate successfully.
- Mobile viewport at 390x844 and desktop viewport at 1280x900 render without smoke failures.

## Automated Gates

- `npm run typecheck`: passed.
- `npm test`: passed, 136 test files and 587 tests.
- `npm ci`: passed from `package-lock.json`.
- `npm run ci`: passed and executes the shared local release gate used by the GitHub Actions quality workflow template.
- `npm run export:web`: passed, generated `dist`.
- `npm run model:movenet:smoke`: passed and loaded TensorFlow.js MoveNet SinglePose Lightning from the vendored
  same-origin static model assets, then executed local inference on a synthetic 192x192 frame with the CPU backend.
- `npm run model:movenet:readiness`: passed and wrote `docs/sdlc/movenet-readiness-report.json` with status `ready`,
  CPU backend, model source `same-origin-static-assets`, model URL `/models/movenet/singlepose/lightning/4/model.json`,
  12ms load time, 297ms average inference, and 299ms max inference in the latest run.
- `npm run model:analysis:replay`: passed and wrote `docs/sdlc/model-analysis-replay-report.json` with 3/3 bundled
  attempts passing, minimum quality 100, provider `web-tfjs-movenet`, and privacy-safe output checks.
- `npm run model:verification:suite`: passed and wrote `docs/sdlc/model-verification-suite-report.json` plus
  `docs/sdlc/model-verification-suite-report.md` with status `technical-ready`, 8/9 checks passing, 0 blocked checks,
  and 1 external real-world validation check.
- `npm run model:movenet:assets:download`: passed and wrote `public/model-assets.json` plus same-origin MoveNet graph
  and 2 weight shard files under `public/models/movenet/singlepose/lightning/4`.
- `npm run model:movenet:assets:check`: passed and wrote `docs/sdlc/movenet-static-assets-report.json` plus
  `docs/sdlc/movenet-static-assets-report.md` with status `ready`, 7/7 checks, 3 source assets, 4 exported assets
  including the manifest, and service-worker model cache coverage.
- `npm run model:assets:provenance`: passed and wrote `docs/sdlc/model-asset-provenance-report.json` plus
  `docs/sdlc/model-asset-provenance-report.md` with status `review`, 5/6 verified checks, 1 license-review check,
  0 blocked checks, and SHA-256 parity across 3 vendored model files.
- `npm run model:delivery:lifecycle`: passed and wrote `docs/sdlc/model-delivery-lifecycle-report.json` plus
  `docs/sdlc/model-delivery-lifecycle-report.md` with status `ready`, same-origin static delivery mode, 3 model
  assets, 4,963,342 bytes, `precache-on-install` web strategy, delivery path verified, and browser cache warmup still
  per-device before offline gym use.
- `npm run model:evidence:sync`: passed and updated Expo `extra.modelEvidence` from the latest MoveNet readiness,
  model-analysis replay, and ready/share-safe cue-validation dataset reports while preserving real-world validation targets
  until the real dataset doctor is ready.
- `npm run native:qa:runbook`: passed and wrote `docs/sdlc/native-qa-runbook.json` with Android/iOS runbooks, privacy-safe
  setup instructions, seven workflows per platform, and an intentionally incomplete evidence draft for real-device QA.
- `npm run native:qa:starter`: passed and wrote `docs/sdlc/native-qa-evidence-starter-report.json` plus
  `docs/sdlc/native-qa-evidence-input.template.json` with status `needs-device-evidence`, candidate ready `false`, and
  final evidence written `false`.
- `npm run native:ios:doctor`: passed as a command and wrote `docs/sdlc/ios-toolchain-report.json` with status `blocked`
  because this machine has Command Line Tools selected instead of full Xcode.
- `npm run release:credentials:starter`: passed and wrote `docs/sdlc/store-credentials-setup-packet.json`,
  `docs/sdlc/store-credentials-setup-packet.md`, `docs/sdlc/store-credentials.env.template`, and
  `docs/sdlc/eas-project-binding.template.json` with status `blocked`, 0/4 credential groups present, and no Expo,
  Apple, Google, service-account, project-id, local-path, or token values serialized.
- `npm run release:credentials:doctor`: passed as a command and wrote `docs/sdlc/store-credentials-report.json` with
  status `blocked` because account-bound EAS project id, Expo token, App Store Connect, and Google Play credentials are
  not configured on this machine.
- `npm run release:github:doctor`: passed as a command and wrote `docs/sdlc/github-workflow-report.json` with status
  `blocked` because the current GitHub OAuth token lacks `workflow` scope and `.github/workflows/quality.yml` is not
  committed.
- `npm run feature:doctor`: passed as a command and wrote `docs/sdlc/feature-completion-report.json` with status
  `external-blocked`, 191/194 tasks done, 145/147 backlog items done, 177/177 traceability rows covered, 0 internal gaps,
  and 10 external blockers across task, backlog, traceability, and launch evidence.
- `npm run release:blocker-issues`: passed and wrote `docs/sdlc/release-blocker-issues-report.json` plus
  `docs/sdlc/release-blocker-issues-report.md` with status `ready-to-file`, 5 issue drafts, 4 owners, 15 commands,
  8 proof artifacts, and credential key names only.
- `npm run release:blocker-issues:file`: passed and wrote `docs/sdlc/release-blocker-issue-filing-plan.json` plus
  `docs/sdlc/release-blocker-issue-filing-plan.md` with status `dry-run`, 5 planned issue filings, 0 created issues, and
  0 existing exact-title issues in the latest local run.
- `npm run release:blocker-issues:links`: passed and wrote `docs/sdlc/release-blocker-issue-web-links.json` plus
  `docs/sdlc/release-blocker-issue-web-links.md` with status `ready`, 5/5 ready links, and repository
  `aantenore/movebeta-mobile`.
- `npm run release:evidence:intake`: passed and wrote `docs/sdlc/external-evidence-intake-report.json`,
  `docs/sdlc/external-evidence-intake-report.md`, and `docs/sdlc/external-evidence-intake.template.json` with status
  `needs-evidence`, 5 intake items, 8 proof references, and no credential values, local paths, raw artifacts, or raw video.
- `npm run release:evidence:validate`: passed and wrote `docs/sdlc/external-evidence-validation-report.json` plus
  `docs/sdlc/external-evidence-validation-report.md` with status `needs-evidence`, 0/1 accepted proofs, missing filled
  input guidance, and no credential values, local paths, raw artifacts, or raw video.
- `npm run release:evidence:promote`: passed and wrote `docs/sdlc/external-evidence-promotion-report.json` plus
  `docs/sdlc/external-evidence-promotion-report.md` with status `needs-evidence`, validation status `needs-evidence`,
  candidate ready `false`, 0 promoted checks, and no credential values, local paths, raw artifacts, or raw video.
- `npm run release:evidence:apply`: passed and wrote `docs/sdlc/external-evidence-apply-report.json` plus
  `docs/sdlc/external-evidence-apply-report.md` with status `needs-evidence`, write requested `false`, applied `false`,
  0 applied checks, and no credential values, local paths, raw artifacts, or raw video.
- `npm run web:pwa:check`: passed and wrote `docs/sdlc/pwa-readiness-report.json` plus
  `docs/sdlc/pwa-readiness-report.md` with status `ready`, 11/11 checks, offline app boot cache coverage,
  exported model-delivery policy coverage, exact content-addressed service-worker cache versioning, and backend required
  `false`.
- `npm run web:smoke:report`: passed and wrote `docs/sdlc/web-smoke-report.json` plus
  `docs/sdlc/web-smoke-report.md` with status `pass`, 4/4 checks, release UI, responsive workflow, PWA offline model
  cache, and report-derived expectation coverage.
- `npm run web:vercel:check`: passed and wrote `docs/sdlc/vercel-deployment-report.json` plus
  `docs/sdlc/vercel-deployment-report.md` with status `static-ready`, 4/6 verified checks, 0 blocked checks, and 2
  account-binding/secret actions remaining outside the repository.
- `npm run web:vercel:workflow`: passed and wrote `docs/sdlc/vercel-workflow-report.json` plus
  `docs/sdlc/vercel-workflow-report.md` with status `template-ready`, 3/5 verified checks, 0 blocked checks, and 2
  workflow activation actions remaining outside the repository.
- `npm run web:vercel:handoff`: passed and wrote `docs/sdlc/vercel-deployment-handoff.json` plus
  `docs/sdlc/vercel-deployment-handoff.md` with status `handoff-ready`, 3/7 ready phases, 3 external actions,
  0 blocked phases, prebuilt deploy commands, post-deploy smoke, inspect, and rollback guidance.
- `npm run validation:cue:starter`: passed and wrote `docs/sdlc/cue-validation-starter-kit-report.json` plus blank
  seed, intake manifest, reviewer onboarding, and worksheet JSON/CSV artifacts with status `needs-seed`.
- `npm run validation:cue:doctor`: passed as a command and wrote
  `docs/sdlc/cue-validation-dataset-report.json` with status `blocked` because real consented coach-review dataset JSON
  is not present.
- `npm run security:audit`: passed at `--audit-level=moderate` with 0 reported vulnerabilities after the `uuid` override
  for the Expo `xcode` tooling chain.
- `npm run security:licenses`: passed as a command and wrote `docs/sdlc/dependency-license-report.json` with status
  `review`, 768 packages, 13 notice/attribution review packages, and 0 blocked packages.
- `npm run release:license-review`: passed and wrote `docs/sdlc/license-review-packet.json`,
  `docs/sdlc/license-review-packet.md`, and `docs/legal/THIRD_PARTY_NOTICES.md` with status `review`, 15 obligations,
  14 review obligations, 0 blocked obligations, and explicit no-legal-clearance claim.
- `npm run release:freshness:doctor`: passed as a command and wrote `docs/sdlc/release-freshness-report.json` with
  status `ready`, 33/33 fresh artifacts, and 0 stale artifacts.
- `npm run release:acquisition`: passed and wrote `docs/sdlc/acquisition-readiness-packet.json` plus
  `docs/sdlc/acquisition-readiness-packet.md` with status `needs-external-clearance`, 5/9 ready signals, 0 blocked
  signals, 3 review signals, 10 external blockers, and 18/18 due-diligence artifacts ready.
- `npm run release:data-room`: passed and wrote `docs/sdlc/data-room-index.json` plus
  `docs/sdlc/data-room-index.md` with status `needs-external-evidence`, 17/34 ready items, 14 external-required items,
  3 review items, 0 missing items, and 0 blocked items.
- `npm run release:check`: passed and wrote `docs/sdlc/release-gate-report.json` with 38/38 release steps passing.
- `npm run store:submission`: passed and wrote `docs/store/store-submission-packet.json` plus
  `docs/store/store-submission-packet.md` with metadata checks, safety-language review, screenshot count, submission
  commands, and privacy flags.
- `npm run release:archives`: passed and wrote `../movebeta-mobile-source.zip`, `../movebeta-mobile-web-dist.zip`,
  `../movebeta-mobile-release-archives.json`, and `../movebeta-mobile-release-archives.md`.
- `npm run release:eas:check`: passed, with warnings for account-bound EAS project id, `EXPO_TOKEN`, App Store Connect,
  and Google Play credentials that must be supplied outside the repository.
- `tests/easReleaseChecks.test.ts`: passed and covers standard mode, strict mode, injected credential success, production
  build drift, and committed submit-secret rejection.
- `tests/sessionDetail.test.ts`: passed and covers session review status, focus metric, primary cue, quality facts,
  performance facts, timeline marker bounds, and privacy evidence.
- `tests/analysisTrust.test.ts`: passed and covers coaching-ready local reports, retake decisions from weak pose signal,
  local-only privacy boundary blocking, weighted trust factors, and raw artifact exclusion.
- `tests/analysisTrustPacket.test.ts`: passed and covers versioned trust packet generation, retake decision export,
  summary copy, negative privacy flags, and raw path/artifact rejection.
- `tests/analysisTrustTrend.test.ts`: passed and covers empty baselines, improving/degrading trend status, latest report
  ordering, local-boundary crossings, share-safe trend packet generation, report-id exclusion, and raw artifact rejection.
- `tests/analysisEvidence.test.ts`: passed and covers versioned report timelines, privacy-safe step evidence, blocked
  weak-quality/over-budget/raw-artifact states, summaries, and legacy report fallback.
- `tests/analysisEvidenceExport.test.ts`: passed and covers versioned evidence-only exports, negative privacy flags, and
  URI/path/secret rejection before sharing.
- `tests/reportAnnotationRepository.test.ts`: passed and covers private training-log creation, cue usefulness feedback,
  repeat outcome logging/clearing, legacy migration, updates, tag normalization, local persistence, SQLite persistence,
  delete behavior, and corrupted-storage tolerance.
- `tests/repeatOutcomeInsights.test.ts`: passed and covers progressing outcomes, stalled outcomes, orphan skipping, and
  empty state behavior.
- `tests/betaMemory.test.ts`: passed and covers improved/sent beta entries, building and empty states, orphan skipping,
  entry limits, resolved cue titles, and private-note exclusion.
- `tests/drillPracticeRepository.test.ts`: passed and covers private completion/skipped records, local persistence,
  SQLite persistence, report-scoped deletion, and corrupted-storage tolerance.
- `tests/drillPracticeInsights.test.ts`: passed and covers completion rate, blocked/skipped state, orphan skipping, and
  empty practice state.
- `tests/projectQueue.test.ts`: passed and covers active/repeat/sent counts, average effort, next-repeat priority,
  missing-report tolerance, and action generation.
- `tests/progressFilters.test.ts`: passed and covers wall-angle, grade, and gym option derivation, report filtering, and
  active filter counting.
- `tests/privacyDeletion.test.ts`: passed and covers report, private training-log, drill-practice, coach-consent cleanup,
  orphan cleanup, and privacy-safe deletion receipt copy.
- `tests/dataPortability.test.ts`: passed and covers privacy-safe backup JSON, cue feedback backup/restore, non-mutating
  restore preview, existing-record conflict preview, checksum restore receipt, restore into empty repositories, drill
  practice backup/restore, orphan skipping, and URI-like artifact rejection.
- `tests/techniqueReadiness.test.ts`: passed and covers baseline, repeat, recovery next-session recommendations,
  share-safe readiness packet generation, report-id exclusion, and raw artifact rejection.
- `tests/personalBenchmarks.test.ts`: passed and covers best overall, wall-angle, grade, gym, latest-vs-best deltas,
  and empty local history behavior.
- `tests/sessionPlan.test.ts`: passed and covers baseline blocks, recovery intensity caps, repeat-project planning, and
  practice-reset planning from skipped drill logs.
- `tests/preSendGuard.test.ts`: passed and covers baseline, controlled-repeat, reset-first, hard-try window, blocked
  practice, and replaceable threshold behavior.
- `tests/trainingLoad.test.ts`: passed and covers baseline, balanced, review, deload, configurable high-effort
  thresholds, share-safe training load packet generation, report-id exclusion, negative privacy flags, and raw artifact
  rejection.
- `tests/coachReviewPacket.test.ts`: passed and covers `movebeta.coach-review.v2`, consent metadata, review rubric,
  cue trust export, validation-aware cue trust downgrade, reviewer identity exclusion, privacy-safe athlete context,
  private-note exclusion, drill-note exclusion, and raw video/landmark exclusion.
- `tests/coachLibrary.test.ts`: passed and covers active consent filtering, revoked/orphan consent skipping, review
  priority, low-signal status, athlete context counts, and private-note exclusion.
- `tests/coachTeamTemplates.test.ts`: passed and covers high-priority, follow-through, signal-retake, privacy-safe
  packet templates, and private/raw artifact exclusion.
- `tests/coachLibraryExport.test.ts`: passed and covers versioned batch export, zero-count exports, privacy flags,
  summary copy, private-note exclusion, and injected raw-artifact key rejection.
- `tests/cueValidationStudy.test.ts`: passed and covers active cue-validation consent filtering, packet-only review
  tasks, privacy flags, private-note exclusion, no-invented-score metadata, blank review worksheets, worksheet CSV export,
  CSV escaping, completed dataset composition, validation-gate compatibility, and injected raw-artifact key rejection.
- `tests/coachValidationWorkflow.test.ts`: passed and covers real-world validation campaign states for missing consent,
  active consent, revoked/orphan consent exclusion, completed worksheet readiness, privacy-safe status export, and
  raw-artifact blocking.
- `tests/planCatalog.test.ts`: passed and covers current tier status, highlighted upgrade unlocks, Coach capabilities,
  centralized capability copy, and provider-agnostic recommendations.
- `tests/launchReadiness.test.ts` and `tests/config.test.ts`: passed and cover default blocker status, all-ready
  evidence, partial evidence overrides, MoveNet readiness evidence, native QA runbook evidence, launch evidence parsing
  from Expo/env configuration, and stale legacy Expo manifest fallback to bundled app extra.
- `tests/releaseGateReport.test.ts`: passed and covers release gate pass/fail aggregation plus ordered gate step evidence,
  including model asset provenance.
- `tests/modelAssetProvenanceDoctor.test.mjs`: passed and covers source URL validation, same-origin asset inventory,
  SHA-256 parity, attribution notice checks, durable JSON/Markdown writes, review state, and unsafe-value rejection.
- `tests/cueValidationDatasetDoctor.test.ts`: passed and covers missing dataset evidence, parse-error evidence, ready
  summaries, durable JSON/Markdown writes, and reviewer identity exclusion.
- `tests/iosToolchainDoctor.test.ts`: passed and covers Command Line Tools-only blocker detection, full-Xcode ready
  detection, and durable JSON/Markdown artifact writes.
- `tests/iosToolchainSetupPacket.test.ts`: passed and covers blocked and ready setup packet generation, sanitized
  command/proof copy, negative privacy flags, and local-path/token rejection.
- `tests/ciWorkflow.test.ts`: passed and covers GitHub Actions template trigger coverage, deferred active-workflow
  activation, Node version sourcing from `package.json`, lockfile installs, shared `npm run ci` execution, and release
  evidence artifact upload.
- `tests/githubWorkflowDoctor.test.ts`: passed and covers OAuth scope parsing, missing workflow-scope blocker evidence,
  active workflow/template parity, durable JSON/Markdown writes, and token-value exclusion.
- `tests/dependencyLicenseDoctor.test.ts`: passed and covers permissive, dual, missing, restricted, review, and local
  linked package license handling plus durable JSON/Markdown writes and secret/path exclusion.
- `tests/launchReadinessDoctor.test.ts`: passed and covers local artifact detection, configured evidence drift, iOS
  toolchain report detection, and durable launch readiness report writes, including machine release-gate report detection
  and content validation for native QA evidence and cue-validation datasets.
- `tests/nativeQaRunbook.test.ts`: passed and covers platform workflow instructions, generated evidence drafts, and the
  expected validator failure until real physical-device values are entered.
- `tests/nativeQaEvidenceKit.test.ts`: passed and covers Plan-tab native QA workflows, shared budgets, placeholder
  policy, validator command, and raw-artifact exclusion.
- `tests/nativeQaRunbookPacket.test.ts`: passed and covers versioned packet generation from the native QA evidence kit,
  blocked placeholder evidence, explicit privacy flags, and injected token-like value rejection before sharing.
- `tests/providerReadiness.test.ts`: passed and covers configured web MoveNet readiness, native-platform review status,
  reserved provider blocking, fallback availability, and local privacy boundary status.
- `tests/nativeQaEvidenceValidation.test.ts`: passed and covers app/CLI parity for ready evidence, blocked draft
  evidence, run summaries, and raw local artifact rejection.
- `tests/nativeQaEvidenceImport.test.ts`: passed and covers empty paste state, invalid JSON, ready native QA evidence
  summaries, blocking-check counts, and raw local artifact rejection.
- `tests/nativeQaEvidenceComposer.test.ts`: passed and covers structured physical-run composition, second-to-millisecond
  normalization, incomplete workflow blocking, versioned share-safe export generation, and raw artifact/path/token
  rejection.
- `tests/preparedExportShare.test.ts`: passed and covers stable file names, JSON/CSV content types, native file-share
  writes, unavailable sharing fallback, and write-failure fallback.
- `tests/sessionCloseout.test.ts`: passed and covers baseline closeout, latest-report logging actions, completed closeout
  evidence, privacy flags, and raw artifact/private-note rejection.
- `tests/sessionAgenda.test.ts`: passed and covers baseline, controlled, deload, configurable block limits, share-safe
  agenda packets, packet summaries, and raw artifact/private-note rejection.
- `tests/attemptPacing.test.ts`: passed and covers baseline, controlled, progress, reset, configurable rest/attempt
  limits, stop rules, share-safe pacing packets, packet summaries, rest timer formatting, and raw artifact/private-note
  rejection.
- `tests/evidenceCollectionPlan.test.ts`: passed and covers validation clip targets, estimated review rows, native QA
  workflow checks, configurable acceptance thresholds, balanced wall-angle batches, review-row distribution, and
  privacy-safe collection planning.
- `tests/validationCollectionPacket.test.ts`: passed and covers versioned validation collection packets, balanced batch
  derivation, reviewer slot templates, configurable acceptance thresholds, and raw path/token rejection.
- `tests/validationConsentPacket.test.ts`: passed and covers versioned validation consent packets, configurable batch
  thresholds, athlete consent copy, required metadata, negative privacy flags, and raw path/identity/token rejection.
- `tests/validationPilotKit.test.ts`: passed and covers versioned pilot kits, consent-safe wall-angle sprints,
  configurable acceptance thresholds, and raw path/token/raw-video rejection.
- `tests/releaseUnblockChecklist.test.ts`: passed and covers default external blockers, launch-readiness label/action
  parity, credential key-name disclosure without secret values, and all-ready evidence state.
- `tests/releaseUnblockPacket.test.ts`: passed and covers versioned packet generation, ready packet generation, and
  injected token/local-path rejection before sharing.
- `tests/releaseBlockerIssueReport.test.ts`: passed and covers launch-evidence input, durable JSON/Markdown issue draft
  writes, issue ordering, and credential/local-path/raw-artifact rejection before sharing.
- `tests/releaseBlockerIssueFiling.test.ts`: passed and covers mobile-safe schema validation, dry-run filing plan
  generation, JSON/Markdown artifact writes, exact-title existing issue skipping, GitHub CLI failure capture, and
  credential/local-path/raw-artifact exclusion inherited from the issue packet.
- `tests/releaseCriticalPath.test.ts`: passed and covers external blocker dependency sequencing, parallel lane grouping,
  upstream evidence effects, all-ready state, and raw artifact/path/token rejection.
- `tests/releaseEvidenceScenarios.test.ts`: passed and covers projected launch tracks, cleared blocker counts,
  prerequisite detection, all-ready state, current-evidence immutability, and raw artifact/path/token rejection.
- `tests/releaseEvidenceFreshness.test.ts`: passed and covers configurable artifact windows, stale evidence,
  missing/invalid timestamps, release report bundle mapping, and raw artifact/path/token rejection.
- `tests/releaseEvidencePacket.test.ts`: passed and covers aggregated launch/model/provider/native QA evidence, all-ready
  state, artifact status mapping, and credential/local-path rejection before sharing.
- `tests/releaseEvidenceReconciliation.test.ts`: passed and covers report inference, projected launch readiness,
  independent store blocker clearing, invalid JSON handling, and raw artifact/path/token rejection.
- `tests/storeSubmissionPacket.test.ts`: passed and covers versioned store metadata packets, risky-copy review state,
  command checklist, negative privacy flags, and token/local-path rejection before sharing.
- `tests/commercialReadinessPacket.test.ts`: passed and covers versioned commercial readiness packets, ready-state action
  reduction, negative privacy flags, and credential/local-path/payment-data rejection before sharing.
- `tests/storeCredentialsDoctor.test.ts`: passed and covers blocked local credentials, injected ready credentials,
  durable JSON/Markdown writes, and credential value exclusion.
- `tests/storeCredentialsSetupPacket.test.ts`: passed and covers blocked/ready setup packets, required credential key names,
  and credential/local-path/service-account body rejection before sharing.
- `tests/featureCompletionDoctor.test.ts`: passed and covers external-blocker classification, internal-gap detection,
  durable JSON/Markdown writes, and secret/local-artifact exclusion.
- `tests/liveRecordingGuide.test.ts`: passed and covers setup review advice, coach-lens-specific recording prompts,
  minimum-duration readiness, progress, and near-limit warnings.
- `tests/clipTriage.test.ts`: passed and covers local analyze, trim, retake, blocked, too-short, configurable score, and
  raw URI exclusion.
- `tests/analysisWindow.test.ts`: passed and covers full, early, middle, late, active-duration, source preservation, and
  window labels.
- `tests/videoWorkflow.test.ts`: passed and covers analysis-window timestamp bounds plus active-window performance budget
  behavior.
- `tests/analysisEvidence.test.ts`: passed and covers analysis-window timeline evidence and raw video reference exclusion.
- `tests/analysisEvidenceExport.test.ts`: passed and covers analysis-window export metadata without raw artifact leakage.
- `tests/releaseHandoffPacket.test.ts`: passed and covers release status aggregation, blocker tracks, screenshot
  completeness, explicit delivered-commit pinning, verification commands, Markdown rendering, and durable JSON/Markdown writes.
- `tests/movenetReadinessReport.test.ts`: passed and covers ready/degraded model readiness budget checks plus local
  static MoveNet manifest resolution and IOHandler loading without loading the full model in unit tests.
- `tests/modelEvidence.test.ts`: passed and covers technical-ready, validated, degraded, missing, environment JSON, and
  privacy-safe model evidence states.
- `tests/modelEvidenceSync.test.ts`: passed and covers report-to-app-config mapping, real-world validation preservation,
  and dry-run mode.
- `tests/safetyLanguage.test.ts`: passed and covers clear copy, risky claim detection, negated policy/disclaimer copy,
  replaceable rules, and visible issue limits.
- `tests/movenetPoseMapper.test.ts`: passed and covers MoveNet required keypoint mapping, missing-keypoint failure, and
  mapped-frame compatibility with the local movement analyzer report contract.
- `tests/betaReplayPlan.test.ts`: passed and covers setup/crux/exit action generation, timestamp ordering, and weakest
  metric fallback when no cue crosses threshold.
- `tests/movementPhaseBreakdown.test.ts`: passed and covers launch/crux/finish scoring, primary phase selection, and
  smooth fallback.
- `tests/cueTrust.test.ts`: passed and covers local cue trust scoring, low-quality/runtime downgrade, and real validation
  evidence downgrade.
- `tests/cuePatterns.test.ts`: passed and covers persistent, emerging, cleared, and empty cue-history states.
- `tests/cueFeedbackInsights.test.ts`: passed and covers useful rate, top useful cue, review cue, orphan skipping, and
  empty feedback state.
- `npm run store:manifest`: passed and generated `docs/store/store-manifest.json`.
- `MOVEBETA_SMOKE_URL=http://127.0.0.1:8083 npm run store:screenshots`: passed and generated twelve 780x1688 PNG screenshots.
- `npm run web:smoke:report`: passed with `scripts/smoke_web_video.py`, including the Analysis quality panel on
  mobile and desktop viewports, session metadata inputs, capture setup calibration, video intake readiness, clip triage,
  analysis-window visibility,
  capture-readiness guidance, analysis trust summary, beta replay plan, movement phase breakdown, cue trust scoring, the Drills weekly plan, feedback-adapted drills, private drill practice logging, the Progress analysis trust trend, the Progress analysis trust trend packet, the Progress next-session plan, session agenda, session agenda packet, attempt pacing, attempt pacing packet, rest timer, session closeout checklist, local training load, the Progress training load packet, practice-reset planning, the Progress technique readiness, the Progress technique readiness packet
  panel, the Progress personal benchmarks panel, the Progress cue patterns panel, the Progress cue usefulness panel, the Progress practice consistency panel, the Progress attempt
  comparison, the Progress history preview, Plan access cards, Progress history filters, the Sessions review detail, the
  Sessions analysis trust summary, the Sessions analysis trust packet, the Sessions analysis evidence timeline, the Sessions analysis evidence export, the Sessions cue feedback controls, the Sessions repeat outcome controls, the Sessions private training log, the Progress
  repeat outcome panel, the Sessions coach library queue, team templates,
  coach library export, cue-validation study seed, cue-validation clip intake manifest, cue-validation review worksheet, worksheet CSV, completed validation
  dataset composition, prepared export share action, the Progress project queue, the Sessions coach packet consent gate,
  privacy-safe athlete context, cue trust packet JSON, validation campaign tracker, validation status export, and export, the
  Plan tab catalog, upgrade path, capability matrix, launch readiness, model evidence, model verification suite, provider readiness, native QA evidence kit, native QA
  runbook packet export, native QA validator preview, native QA evidence composer, native QA evidence composer export,
  native QA evidence import preview, feature completion audit, iOS toolchain setup packet export, evidence collection plan, validation consent packet export, validation pilot kit export, release unblock checklist, release unblock packet export, release critical path, release evidence scenarios, release evidence freshness, static MoveNet assets, installable PWA readiness, Vercel deployment readiness, Vercel workflow readiness, release evidence reconciliation, release blocker issue filing plan export, release evidence packet export with store credentials report evidence, safety-language guard, provider-agnostic commercial readiness, commercial readiness packet export, the Sessions deletion receipt, the Privacy diagnostics
  packet, Privacy data portability backup/restore checksum and conflict preview, and the Privacy airplane-mode readiness
  self-check.
- Browser smoke now verifies service worker installation, cache inventory, offline reload, and cached same-origin model
  manifest access from the exported PWA.
- Browser smoke verifies the Plan tab PWA runtime model-cache preflight and confirms the prepared install guidance packet
  includes `modelCacheReady`, expected model asset counts, verified asset counts, cached bytes, and integrity flags.
- Browser smoke verifies the Coach tab model-cache preflight shows cached model counts and the dedicated Warm model
  action before capture.
- Browser smoke derives launch-track, feature-completion, model-verification, and PWA readiness count assertions from
  generated SDLC reports before checking the Plan release UI, avoiding stale hard-coded release counts, and persists
  pass/fail evidence in `docs/sdlc/web-smoke-report.json`.
- Browser smoke clicks the Plan tab Warm model action and verifies the share-safe model-cache warmup packet.
- Browser smoke verifies the prepared warmup packet includes cached byte totals, verified asset counts, and SHA-256
  integrity flags.
- `npx expo prebuild --no-install`: passed.
- `npm run toolchain:ios`: passed and confirms local CocoaPods 1.16.2.
- Local CocoaPods 1.16.2 is installed under `.tools/ruby-3.3.11/bin/pod`.
- `npm run native:android:debug`: passed with local Temurin 17 JDK and Android SDK under `.tools`; the merged Android
  manifest check confirms `CAMERA` and `READ_MEDIA_VIDEO`, excludes `RECORD_AUDIO`, and keeps `allowBackup=false`.
- `tests/nativeQaEvidence.test.ts`: passed and covers device evidence requirements for platform coverage, camera/import
  workflows, muted recording, native metadata reads, airplane-mode analysis, latency, battery, thermal budgets, and
  placeholder plus raw local artifact rejection.
- `tests/cueValidationDataset.test.ts`: passed and covers dataset schema version, thresholds, wall-angle coverage,
  reviewer coverage, review modes, score quality, and raw-artifact exclusion.
- `tests/cueValidationDatasetGate.test.ts`: passed and covers in-app gate-ready state, production evidence gaps, and
  raw-artifact rejection.
- `tests/cueValidationGateParity.test.ts`: passed and covers app/CLI parity for ready datasets, production evidence
  gaps, and raw-artifact rejection.
- `npm run native:ios:pods`: passed with local Ruby 3.3.11 and CocoaPods 1.16.2; `MoveBetaPose` is installed as an iOS pod.
- `npm run native:ios:doctor`: passed as a command and reports Developer directory `/Library/Developer/CommandLineTools`,
  workspace ready, Pods ready, full Xcode missing, and build-settings probe skipped until full Xcode is installed.
- `tests/nativePoseBridge.test.ts`: passed and covers the optional JavaScript native module boundary, Expo module
  registration, Apple Vision iOS provider, local Photos resolution, and Android ML Kit frame extraction.
- `npm run release:readiness`: passed and generated `docs/sdlc/launch-readiness-report.json` with stakeholder demo ready,
  MoveNet readiness, model-analysis replay, and native QA runbook verified, internal native beta blocked by missing
  physical-device QA evidence, and store submission blocked by missing full Xcode, physical-device QA, real cue-validation
  data, EAS project binding, and store credentials.
- `npm run release:handoff`: passed and generated `docs/sdlc/release-handoff-packet.json` plus
  `docs/sdlc/release-handoff-packet.md` with 12/12 screenshots, 5 external blockers, 49 current artifacts including the
  release blocker issue filing plan, release blocker issue web links, MoveNet static assets report, model asset
  provenance report, model delivery lifecycle report, license review packet, third-party notices, PWA readiness report,
  web smoke report, Vercel deployment report, Vercel workflow report, acquisition readiness packet, data-room index,
  release archive artifacts, and 31 verification commands.
- Coach now exposes the shared model download timing plan before capture, so PWA users can see first-online-launch,
  warmup, cache, offline, and native bundled delivery state without opening the Plan tab.
- Coach now exposes the shared PWA field-readiness checklist before capture, so offline gym readiness can be checked
  directly before recording or importing real video.
- Coach now exposes a session-launch checklist before capture, aggregating capture setup, model readiness, field
  readiness, device readiness, run-load, and privacy boundary into one share-safe ready/review/blocked packet.
- `npm run handoff:git`: passed and reports `main` with origin `https://github.com/aantenore/movebeta-mobile.git`.
- Private GitHub repository `https://github.com/aantenore/movebeta-mobile` is created and `main` is pushed.
- iOS `xcodebuild -workspace ios/MoveBeta.xcworkspace -scheme MoveBeta -configuration Debug -sdk iphonesimulator -showBuildSettings`: blocked by the generated iOS toolchain report because this machine has Command Line Tools, not full Xcode.

## Known Residual Risks

- iOS build verification is blocked on this machine because full Xcode is not installed or selected. CocoaPods is verified
  with a local modern Ruby toolchain, and `npm run native:ios:doctor` now preserves the blocker as JSON/Markdown evidence.
- Native release requires custom Expo development build validation on physical iOS and Android devices with real climbing
  clips. The validator, template, and runbook now exist, but `docs/sdlc/native-qa-evidence.json` must be filled from real
  devices.
- The MoveNet smoke, readiness report, and pose-mapper contract verify model execution and app data-contract compatibility
  on synthetic/model-shaped inputs only. Real climbing-video model validation still requires physical-device QA plus
  consented climbing clips.
- Store-bound EAS submission requires `npx eas-cli@latest init` on the target Expo account, `extra.eas.projectId`,
  `EXPO_TOKEN`, App Store Connect credentials, and Google Play service account credentials before
  `npm run release:eas:strict` can pass.
- Production movement-quality claims require the cue-validation review worksheet to be filled with real reviewer scores,
  composed into `docs/validation/cue-validation-dataset.json`, and pass `npm run validation:cue`.
- GitHub Actions workflow activation is deferred because the available GitHub OAuth token lacks the `workflow` scope.
  The quality workflow is committed as `docs/sdlc/ci-templates/github-actions-quality.yml` and can be moved into
  `.github/workflows/quality.yml` after `gh auth refresh -h github.com -s workflow`.
