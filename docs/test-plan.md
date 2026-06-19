# MoveBeta Test Plan

## Automated

- TypeScript strict compile with `npm run typecheck`.
- Vitest domain tests for schemas, fixture frames, provider selection, local analysis, selected demo attempts,
  video source normalization, video intake readiness, TensorFlow.js provider availability, deterministic video pose
  fallback, editable session metadata persistence, local report persistence, SQLite report storage, export/delete behavior,
  corrupted storage handling, analysis quality warnings, and privacy metadata.
- Vitest video metadata tests for native metadata reads, browser fallback, and final picker/timer/default fallback.
- Vitest coach consent repository tests for local persistence, SQLite storage, revocation, deletion, and corrupted storage.
- Vitest session detail tests for focus metric selection, primary cue selection, quality/performance/privacy facts,
  normalized timeline markers, and weak-report risk status.
- Vitest report annotation tests for private training-log defaults, updates, tag normalization, local persistence, SQLite
  persistence, delete behavior, and corrupted-storage tolerance.
- Vitest privacy deletion tests for report, private training-log, coach-consent cleanup, orphan cleanup, and receipt copy.
- Vitest data portability tests for privacy-safe backup JSON, restore into empty repositories, orphan skipping, and
  URI-like artifact rejection.
- Vitest project queue tests for active/repeat/sent counts, average effort, next-repeat priority, missing-report tolerance,
  and action generation.
- Vitest technique readiness tests for baseline, repeat, and recovery next-session recommendations.
- Vitest personal benchmark tests for best overall, wall-angle, grade, gym, latest-vs-best deltas, and empty state.
- Vitest session plan tests for baseline blocks, recovery intensity caps, and repeat-project training blocks.
- Vitest cue pattern tests for persistent, emerging, cleared, and empty cue-history states.
- Vitest progress filter tests for wall-angle, grade, and gym option derivation, report filtering, and active filter count.
- Vitest capture-calibration tests for ideal setup, review-grade setup, and blockers caused by privacy or poor pose input.
- Vitest progress insights tests for report ordering, trend deltas, and empty-history handling.
- Vitest attempt comparison tests for latest-vs-baseline ordering, metric deltas, cue status, and insufficient history.
- Vitest drill planner tests for cue deduplication, priority ordering, dosage, and empty cue reports.
- Vitest coach review packet tests for consent metadata, review rubric, and raw video/landmark exclusion.
- Vitest cue validation tests for pass, needs-review, and insufficient-data scoring.
- Vitest cue validation dataset tests for production thresholds, wall-angle coverage, reviewer coverage, raw-artifact
  exclusion, and weak-score failures.
- Vitest performance-budget tests for local analysis duration thresholds, frame-rate evidence, and over-budget status.
- Vitest entitlement tests for Free, Pro, Coach capabilities, upgrade paths, and history limits.
- Vitest capture-readiness tests for ready, review, and retake recommendations from video signal quality.
- Vitest observability tests for sanitized diagnostic events and aggregate support packets without raw video artifacts.
- Vitest offline-readiness tests for ready, review, and blocked airplane-mode states.
- Vitest store-readiness tests for bundle/package identifiers, permission copy, privacy declaration, listing copy, and
  screenshot plan.
- Vitest Android manifest checks for camera/import permissions, audio exclusion, and disabled Android backup.
- Vitest native QA evidence tests for platform coverage, muted recording, metadata reads, workflow pass/fail state,
  latency budgets, battery budget, and thermal state.
- Web export with `npm run export:web`.
- Playwright smoke against exported web bundle with `scripts/smoke_web_video.py`.
- Store screenshot generation with `npm run store:screenshots`.
- Android native debug build with `./gradlew :app:assembleDebug` plus merged manifest validation.
- iOS Pods install with `npm run native:ios:pods`.
- Native QA evidence validation with `npm run native:qa:validate` after real device runs are captured.
- Cue validation dataset validation with `npm run validation:cue` after consented coach review packets and reviews are
  captured.

## Browser Smoke

- Analyze tab renders the on-device coach.
- Record and Import actions are visible on the Analyze tab.
- Session metadata inputs are visible on the Analyze tab.
- Capture setup calibration is visible on the Analyze tab and updates readiness state from ready to review.
- Imported/recorded videos render a preview card before metrics.
- Selected videos render clip-readiness status before analysis-dependent coaching output.
- Analysis quality renders before coaching cues and warns on weak pose confidence.
- Capture-readiness guidance renders before coaching cues and recommends whether to trust or retake the clip.
- Selecting each bundled local attempt runs analysis and updates pose overlay, metrics, cues, and timeline.
- Sessions tab refreshes on focus and shows the latest local attempts.
- Sessions tab shows selectable session review detail with focus metric, primary cue, timeline, and local evidence.
- Sessions tab shows a private training log and allows project status, effort, confidence, tags, and notes to be edited.
- Report export renders privacy-safe JSON and Delete removes the report, private training log, and coach consent record
  from local storage with a deletion receipt.
- Coach packet export requires persisted explicit consent and then renders review JSON without raw video artifacts.
- Privacy diagnostics prepare a support packet without raw video, video URI, key-frame, landmark, account, or secret artifacts.
- Privacy data portability prepares a backup JSON and restores it locally without raw video leaving the device.
- Privacy airplane-mode readiness check confirms local workflow readiness after reports exist.
- Cue validation rubric can score coach reviews once consented clip packets are available.
- Cue validation dataset gate can reject incomplete studies before production movement-quality claims.
- Drills tab shows weekly drill plan, priority dosage, evidence, and coach pack preview.
- Progress tab shows movement score bars.
- Progress tab shows local history summary, current trend, and Pro history preview.
- Progress tab shows attempt comparison after at least two local reports.
- Progress tab shows a project queue derived from private training logs after a Sessions log is saved.
- Progress tab shows a next-session plan with target, duration, intensity cap, and ordered phases.
- Progress tab shows technique readiness with score, next action, warm-up, and risk.
- Progress tab shows personal benchmarks for best overall and filtered style segments.
- Progress tab shows recurring cue patterns with latest cue count, total patterns, cleared count, and drill evidence.
- Progress tab filters history by wall angle, grade, and gym without leaving the local report boundary.
- Progress and Drills tabs show plan access gates driven by entitlement capabilities.
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
