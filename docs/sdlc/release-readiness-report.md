# Release Readiness Report

Date: 2026-06-20
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
- Selected local videos render a preview card and route through local analysis.
- Selected videos show clip-readiness status, sampled-frame estimate, local-source guard, and duration/resolution warnings.
- Reports show analysis quality, frame coverage, landmark coverage, visibility, and weak-input warnings.
- Reports show local analysis duration, processed-frame rate, and budget status.
- Reports include a versioned local analysis evidence timeline for input normalization, pose provider, signal quality,
  cue generation, runtime budget, and privacy boundary.
- Sessions prepares a versioned analysis evidence-only export with explicit negative privacy flags before sharing.
- Analyze converts video signal quality into ready, review, or retake guidance before coaching cues.
- Analyze turns the current cue and metric evidence into a local setup, crux, and exit beta replay plan before movement
  metrics.
- Analyze scores launch, crux, and finish phases from local cue and timeline evidence before movement metrics.
- Progress shows local history summary, best signal, next focus metric, next-session planning, technique readiness,
  pre-send guard, personal benchmarks, recurring cue patterns, cue usefulness insights, practice consistency, attempt
  comparison, and trend deltas.
- Progress lowers the next-session plan to a practice reset when private drill logs show skipped drills exceeding
  completed drills.
- Drills shows a weekly drill plan with priority, dosage, report evidence, private cue feedback adaptation, private
  practice logging, and coach pack preview.
- Web builds use TensorFlow.js MoveNet when local browser video decoding is available.
- MoveNet-shaped keypoints map through a reusable pose-frame contract before reaching the local movement analyzer.
- MoveNet model readiness writes a durable local report with CPU backend, model load time, average and max inference
  time, memory evidence, and explicit synthetic-frame limitations.
- Model-analysis replay writes a durable local report proving MoveNet-shaped keypoints produce privacy-safe metrics and
  cues across bundled slab, vertical, and overhang attempts.
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
- Store screenshots are captured from the exported app for Analyze, Drills, Progress, Sessions, Plan, Release Unblock, and
  Privacy.
- Cue validation scoring harness and rubric are ready for consented coach review datasets.
- Cue validation dataset contract, template, and CLI gate are versioned and ready for real consented coach review studies.
- Free, Pro, and Coach capabilities are modeled through active-plan entitlements without hard-coded pricing.
- Plan tab shows the configured current tier, upgrade path, capability matrix, and billing-provider readiness from the
  shared entitlement catalog.
- Plan tab shows configurable model evidence for MoveNet execution, model-shaped replay, and remaining real-world
  validation, keeping local technical readiness separate from production movement-quality claims.
- Plan tab shows configurable provider readiness for the primary video provider, local fallback, native target provider,
  runtime proof status, and local privacy boundary.
- Plan tab prepares a share-safe native QA runbook packet with physical-device workflows, budgets, blocked draft
  evidence, validator command, and explicit credential/local-path/raw-video exclusion flags.
- Plan tab shows launch-readiness tracks for stakeholder demo, internal native beta, and store submission, keeping
  MoveNet model readiness, model-analysis replay evidence, full-Xcode, physical-device QA, real cue-validation data, and
  EAS/store credentials visible as explicit blockers.
- Plan tab shows a release unblock checklist that derives external blockers from launch readiness and lists proof
  artifacts, release commands, owners, affected tracks, and credential key names without exposing secret values.
- Plan tab prepares a share-safe release unblock packet with commands, proof expectations, owners, tracks, acceptance
  criteria, env key names, and explicit credential/raw-artifact exclusion flags.
- Plan tab shows a configurable safety-language guard for medical, injury-prevention, route-safety, and
  guaranteed-outcome copy risks across product and release copy.
- `npm run release:handoff` writes JSON and Markdown handoff packets with repo, commit, product identity, gate status,
  blockers, screenshots, artifacts, and verification commands.
- Launch-readiness evidence can come from Expo `extra.launchReadinessEvidence` or
  `EXPO_PUBLIC_MOVEBETA_LAUNCH_READINESS_EVIDENCE`, so release environments can update evidence without changing code.
- `npm run release:readiness` writes `docs/sdlc/launch-readiness-report.json` and distinguishes configured evidence from
  detected local artifacts, so stale launch flags become drift instead of silent readiness.
- `npm run release:check` writes `docs/sdlc/release-gate-report.json` with ordered pass/fail step evidence for quality,
  MoveNet readiness, model-analysis replay, native QA runbook, iOS toolchain doctor, web export, EAS standard check, and
  moderate-or-higher dependency audit.
- `npm run native:ios:doctor` writes `docs/sdlc/ios-toolchain-report.json` and
  `docs/sdlc/ios-toolchain-report.md`, so full-Xcode blockers are captured as release evidence.
- `npm run release:archives` writes source and web-dist zip archives plus JSON and Markdown manifests with byte sizes,
  SHA-256 checksums, repository metadata, and worktree-state evidence.
- Launch-readiness detection validates model-analysis replay, native QA evidence, and cue-validation datasets with their
  production validators before marking those artifacts verified.
- Exported reports expose privacy-safe metadata and do not include raw video URIs.
- Drills, Progress, Sessions, Plan, and Privacy tabs navigate successfully.
- Mobile viewport at 390x844 and desktop viewport at 1280x900 render without smoke failures.

## Automated Gates

- `npm run typecheck`: passed.
- `npm test`: passed, 78 test files and 302 tests.
- `npm ci`: passed from `package-lock.json`.
- `npm run ci`: passed and executes the shared local release gate used by the GitHub Actions quality workflow template.
- `npm run export:web`: passed, generated `dist`.
- `npm run model:movenet:smoke`: passed and loaded TensorFlow.js MoveNet SinglePose Lightning, then executed local
  inference on a synthetic 192x192 frame with the CPU backend.
- `npm run model:movenet:readiness`: passed and wrote `docs/sdlc/movenet-readiness-report.json` with status `ready`,
  CPU backend, 6145ms load time, 329ms average inference, and 336ms max inference in the latest run.
- `npm run model:analysis:replay`: passed and wrote `docs/sdlc/model-analysis-replay-report.json` with 3/3 bundled
  attempts passing, minimum quality 100, provider `web-tfjs-movenet`, and privacy-safe output checks.
- `npm run model:evidence:sync`: passed and updated Expo `extra.modelEvidence` from the latest MoveNet readiness and
  model-analysis replay reports while preserving real-world validation targets.
- `npm run native:qa:runbook`: passed and wrote `docs/sdlc/native-qa-runbook.json` with Android/iOS runbooks, privacy-safe
  setup instructions, seven workflows per platform, and an intentionally incomplete evidence draft for real-device QA.
- `npm run native:ios:doctor`: passed as a command and wrote `docs/sdlc/ios-toolchain-report.json` with status `blocked`
  because this machine has Command Line Tools selected instead of full Xcode.
- `npm run security:audit`: passed at `--audit-level=moderate` with 0 reported vulnerabilities after the `uuid` override
  for the Expo `xcode` tooling chain.
- `npm run release:check`: passed and wrote `docs/sdlc/release-gate-report.json` with 8/8 release steps passing.
- `npm run release:archives`: passed and wrote `../movebeta-mobile-source.zip`, `../movebeta-mobile-web-dist.zip`,
  `../movebeta-mobile-release-archives.json`, and `../movebeta-mobile-release-archives.md`.
- `npm run release:eas:check`: passed, with warnings for account-bound EAS project id, `EXPO_TOKEN`, App Store Connect,
  and Google Play credentials that must be supplied outside the repository.
- `tests/easReleaseChecks.test.ts`: passed and covers standard mode, strict mode, injected credential success, production
  build drift, and committed submit-secret rejection.
- `tests/sessionDetail.test.ts`: passed and covers session review status, focus metric, primary cue, quality facts,
  performance facts, timeline marker bounds, and privacy evidence.
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
- `tests/techniqueReadiness.test.ts`: passed and covers baseline, repeat, and recovery next-session recommendations.
- `tests/personalBenchmarks.test.ts`: passed and covers best overall, wall-angle, grade, gym, latest-vs-best deltas,
  and empty local history behavior.
- `tests/sessionPlan.test.ts`: passed and covers baseline blocks, recovery intensity caps, repeat-project planning, and
  practice-reset planning from skipped drill logs.
- `tests/preSendGuard.test.ts`: passed and covers baseline, controlled-repeat, reset-first, hard-try window, blocked
  practice, and replaceable threshold behavior.
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
  evidence, partial evidence overrides, MoveNet readiness evidence, native QA runbook evidence, and launch evidence parsing
  from Expo/env configuration.
- `tests/releaseGateReport.test.ts`: passed and covers release gate pass/fail aggregation plus ordered gate step evidence.
- `tests/iosToolchainDoctor.test.ts`: passed and covers Command Line Tools-only blocker detection, full-Xcode ready
  detection, and durable JSON/Markdown artifact writes.
- `tests/ciWorkflow.test.ts`: passed and covers GitHub Actions template trigger coverage, deferred active-workflow
  activation, Node version sourcing from `package.json`, lockfile installs, shared `npm run ci` execution, and release
  evidence artifact upload.
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
- `tests/preparedExportShare.test.ts`: passed and covers stable file names, JSON/CSV content types, native file-share
  writes, unavailable sharing fallback, and write-failure fallback.
- `tests/evidenceCollectionPlan.test.ts`: passed and covers validation clip targets, estimated review rows, native QA
  workflow checks, configurable acceptance thresholds, and privacy-safe collection planning.
- `tests/releaseUnblockChecklist.test.ts`: passed and covers default external blockers, launch-readiness label/action
  parity, credential key-name disclosure without secret values, and all-ready evidence state.
- `tests/releaseUnblockPacket.test.ts`: passed and covers versioned packet generation, ready packet generation, and
  injected token/local-path rejection before sharing.
- `tests/releaseHandoffPacket.test.ts`: passed and covers release status aggregation, blocker tracks, screenshot
  completeness, verification commands, Markdown rendering, and durable JSON/Markdown writes.
- `tests/movenetReadinessReport.test.ts`: passed and covers ready/degraded model readiness budget checks without loading
  the model in unit tests.
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
- `MOVEBETA_SMOKE_URL=http://127.0.0.1:8082 npm run store:screenshots`: passed and generated eight 780x1688 PNG screenshots.
- Playwright exported-bundle smoke: passed with `scripts/smoke_web_video.py`, including the Analysis quality panel on
  mobile and desktop viewports, session metadata inputs, capture setup calibration, video intake readiness,
  capture-readiness guidance, beta replay plan, movement phase breakdown, cue trust scoring, the Drills weekly plan, feedback-adapted drills, private drill practice logging, the Progress next-session plan, practice-reset planning, the Progress technique readiness
  panel, the Progress personal benchmarks panel, the Progress cue patterns panel, the Progress cue usefulness panel, the Progress practice consistency panel, the Progress attempt
  comparison, the Progress history preview, Plan access cards, Progress history filters, the Sessions review detail, the
  Sessions analysis evidence timeline, the Sessions analysis evidence export, the Sessions cue feedback controls, the Sessions repeat outcome controls, the Sessions private training log, the Progress
  repeat outcome panel, the Sessions coach library queue, team templates,
  coach library export, cue-validation study seed, cue-validation review worksheet, worksheet CSV, completed validation
  dataset composition, prepared export share action, the Progress project queue, the Sessions coach packet consent gate,
  privacy-safe athlete context, cue trust packet JSON, validation campaign tracker, validation status export, and export, the
  Plan tab catalog, upgrade path, capability matrix, launch readiness, model evidence, provider readiness, native QA evidence kit, native QA
  runbook packet export, native QA validator preview, native QA evidence import preview, evidence collection plan, release unblock checklist, release unblock packet export, safety-language guard, and billing-provider readiness, the Sessions deletion receipt, the Privacy diagnostics
  packet, Privacy data portability backup/restore checksum and conflict preview, and the Privacy airplane-mode readiness
  self-check.
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
  `docs/sdlc/release-handoff-packet.md` with 8/8 screenshots, 5 external blockers, release archive artifacts, current
  artifacts, and verification commands.
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
