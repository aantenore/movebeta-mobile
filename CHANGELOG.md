# Changelog

## 1.0.0 - 2026-06-17

### Added

- On-device movement coaching prototype with local fixture pose provider.
- Three selectable bundled climbing attempts for the runnable camera/import workaround.
- Local report persistence with focus refresh, privacy-safe JSON export, and delete controls.
- Replaceable pose-estimator pipeline for MediaPipe, Core ML, and TensorFlow Lite adapters.
- Local movement analyzer for flow, pause, bent-arm load, hip drift, and foot-cut metrics.
- Coach, Sessions, Drills, Progress, and Privacy app screens.
- Domain tests, web export, browser smoke verification, and SDLC delivery artifacts.
- Browser-side TensorFlow.js MoveNet provider for local video pose extraction.
- Local Expo native pose module with Apple Vision and Android ML Kit adapters.
- Verified Android debug build with local JDK and Android SDK toolchain.
- Local iOS Ruby/CocoaPods bootstrap and verified Pods install for the native pose module.
- Analysis quality scoring and UI warnings for low-confidence pose input.
- Local progress history insights with attempt count, average quality, focus metric, and trend deltas.
- Weekly drill plan generated from local report cues with priority, dosage, and evidence.
- Latest-vs-baseline attempt comparison with metric deltas, cue status, and next-repeat recommendation.
- Native SQLite report repository with web/local fallback behind the same persistence contract.
- Consented coach review packet export with rubric and no raw video, URI, key-frame, or landmark artifacts.
- Cue validation scoring harness for pass, needs-review, and insufficient-data review outcomes.
- Capability-based Free, Pro, and Coach entitlements with active plan configuration and history limits.
- Capture-readiness guidance that tells users when a clip is ready, borderline, or should be retaken.
- Verified dependency hygiene with Dependabot, CI gates, and `npm ci` from the lockfile.
- Privacy-safe diagnostics support packet with aggregate report quality, provider, consent, and sanitized event data.
- Airplane-mode readiness self-check for local workflow, storage, sync, raw export, and report history.
- Video intake readiness with local-source validation, short-clip blocking, duration/resolution warnings, sampled-frame
  estimates, and recorder timer.
- Store readiness kit with generated listing metadata, privacy declarations, screenshot plan, and Playwright screenshot
  capture from the exported app.
- Editable session metadata for recorded/imported attempts, persisted into reports, exports, trends, drills, and coach
  packets.
- Pre-recording capture setup calibration with privacy, framing, distance, lighting, contrast, and phone stability checks.
- Android merged manifest validation for camera/import permissions, audio exclusion, and disabled report backup.
- Native QA evidence template and validator for platform coverage, airplane-mode workflow, latency, battery, and thermal budgets.
- Report-level video analysis performance evidence with duration, frame rate, and budget status.
- Explicit athlete consent gate before coach review packet preparation.
- Durable per-report coach review consent records with local persistence, revocation, and report-delete cleanup.
- Native video metadata extraction for duration/dimensions, configured muted recording, and partial-frame pose tolerance.
- Cue validation dataset contract, template, CLI readiness gate, and tests for consented coach review studies.
- EAS release readiness validator with standard and strict modes for app versioning, production artifact type, submit
  secrets, project id, and store credential prerequisites.
- Selectable local session review in Sessions with quality facts, performance facts, focus metric, primary cue, timeline
  markers, and local privacy evidence.
- Private per-report training log with project status, perceived effort, confidence, notes, tags, and local/SQLite
  persistence.
- Private per-cue usefulness feedback in local training logs with backup/restore migration coverage.
- Progress project queue derived from private training logs with active/repeat/sent counts and next-repeat action.
- Local Progress filters for wall angle, grade, and gym.
- Privacy deletion bundle that removes report, private training log, drill practice log, and coach consent records together
  with a local receipt.
- Privacy-safe local backup and restore JSON for reports, private training logs, drill practice logs, and coach consent
  records, with a deterministic offline content checksum.
- Local backup restore preview and restore receipt that validate schema/privacy and show restore, new, existing, skipped
  orphan, integrity status, and checksum evidence around local data writes.
- Technique readiness score with next action, warm-up, risk, and drill evidence from local progress plus private logs.
- Personal benchmarks for best overall, wall-angle, grade, and gym attempts with latest-vs-best deltas.
- Next-session planning with target, duration, intensity cap, ordered phases, and local evidence.
- Recurring cue pattern tracking for persistent, emerging, and cleared coach cues.
- Cue usefulness insights from private feedback with useful rate, top cue, and review cue signals.
- Feedback-adapted drill plans that reinforce useful cues and flag unclear or not-useful cues for variants.
- Private drill practice logging for completed or skipped suggested drills with backup, restore, and deletion coverage.
- Practice consistency insights from private drill logs with completion rate, latest status, and skipped-cue review.
- Practice-aware next-session planning that lowers intensity and prescribes easier variants when drills are repeatedly skipped.
- Privacy-safe athlete context inside consented coach review packets, including training-log scores, cue feedback ratings,
  and drill-practice counts without private note text or drill notes.
- Configurable Plan tab with freemium upgrade path, capability matrix, and billing-provider readiness without payment
  provider coupling.
- Local coach library queue in Sessions from active consented reports with review priority, signal status, feedback counts,
  practice counts, and no raw video artifacts.
- Local coach team templates generated from consented review signals for high-priority review, follow-through, signal
  retakes, and privacy-safe packet handoff.
- Versioned local coach library export from consented queue metadata and team templates, with guardrails against private
  notes, drill notes, raw video URIs, frames, key frames, and landmarks.
- Local cue-validation study seed export for consented coach packets, including packet-only review tasks and explicit
  no-invented-score privacy metadata.
- Local cue-validation review worksheet export with blank coach score rows, null reviewer identities, and privacy
  guardrails against raw artifacts or invented evidence.
- Privacy-safe cue-validation worksheet CSV export with stable headers, blank reviewer/score cells, and CSV escaping.
- Completed cue-validation worksheet CSV parser and dataset composer with row matching, 1-5 score validation, and
  compatibility with the production validation gate.
- Sessions UI for pasting completed cue-validation worksheet CSV and preparing gate-compatible dataset JSON locally.
- Versioned cue-validation dataset JSON contract required by the production validation gate.
- Native share action for prepared Sessions exports.
- In-app cue-validation gate preview for completed validation datasets.
- Automated parity coverage between the in-app cue-validation gate preview and the CLI production gate.
- Configurable Plan launch-readiness cockpit for demo, internal beta, and store-submission tracks.
- Launch-readiness evidence configuration through Expo extra or `EXPO_PUBLIC_MOVEBETA_LAUNCH_READINESS_EVIDENCE`.
- Machine-readable release gate report generated by `npm run release:check` with ordered step results.
- Machine-detected launch readiness doctor with a durable JSON report for release evidence drift.
- Launch readiness detector now validates native QA evidence and cue-validation datasets before marking them verified.
- Local beta replay plan in Analyze with setup, crux, and exit actions derived from cue and metric evidence.
- Local movement phase breakdown for launch, crux, and finish rehearsal priorities.
- Local cue trust scoring in Analyze and coach packet exports, with privacy-safe signal factors and validation-readiness status.
- Private repeat-outcome logging in Sessions and Progress insights for success rate, stalled repeats, resolved cues, and
  next-repeat action.
- MoveNet model execution smoke that loads TensorFlow.js MoveNet SinglePose Lightning and runs local inference on a
  synthetic frame.
- MoveNet readiness report with load/inference budgets, memory evidence, launch-readiness detection, and release-gate
  integration.
- Reusable MoveNet pose mapper with contract tests that replay model-shaped keypoints through the movement analyzer.
- Deterministic model-analysis replay report that feeds MoveNet-shaped keypoints through metrics, cues, quality checks,
  and privacy-safe output checks across bundled slab, vertical, and overhang attempts.
- Launch-readiness validation for the model-analysis replay report, so demo, beta, and store tracks expose model-shaped
  cue evidence as a first-class readiness check.
- Dependency audit hardening with a `uuid` 11.1.1 override for the Expo `xcode` tooling chain and a moderate-or-higher
  audit gate.
- GitHub Actions quality workflow template for pushes to `main` and pull requests, running the shared local release gate
  from lockfile-installed dependencies and uploading release evidence artifacts after activation.
- Native pose bridge contract coverage for the optional Expo module boundary, Apple Vision iOS provider, and Android ML
  Kit provider, plus Expo system UI support for the configured light interface style.
- Native QA runbook generator with platform workflow steps, shared performance budgets, privacy instructions, and blocked
  evidence drafts for physical-device validation.
- Native QA evidence validator now rejects placeholder device/build/clip values instead of accepting filled-out templates.
- In-app Native QA evidence kit in the Plan tab with physical-device runs, workflow coverage, shared budgets,
  placeholder policy, and validator command.
- In-app Native QA evidence validator preview with app/CLI parity coverage, blocking-check summaries, and raw local
  artifact rejection.
- Evidence collection plan in the Plan tab with cue-validation clip targets, estimated coach review rows, wall-angle
  coverage, native device checks, and external evidence owners derived from release contracts.
- Release unblock checklist in the Plan tab with launch-derived blockers, proof artifacts, commands, owners, affected
  tracks, and credential key names for beta and store release.
- Release handoff packet generator that writes stakeholder-ready JSON and Markdown from release gates, launch readiness,
  screenshots, commit metadata, artifacts, commands, and remaining external blockers.
- Release source and web-dist archive generator with byte-size, SHA-256, commit, remote, branch, and worktree-state
  manifests for verifiable handoff packages.
- Documentation screenshot gallery generated from the exported web build.
