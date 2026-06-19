# MoveBeta Mobile

Cross-platform mobile prototype for an on-device climbing movement coach. The app analyzes a short climbing attempt,
extracts body landmarks locally, scores movement quality, and turns those signals into concrete coaching cues and drills.

The current build records video in-app, imports local climbing clips, previews the selected source, and runs a fully
local analysis workflow. Video recording uses a muted configurable profile, and local duration/dimensions are resolved
from the file before intake when the runtime can read them. Web runtimes try TensorFlow.js MoveNet for real pose
extraction and fall back to deterministic local landmarks when the browser cannot decode the source. Custom native
builds can use the local `movebeta-pose` Expo module: Apple Vision on iOS and ML Kit Pose Detection on Android, behind
the same pipeline contract. Reports are persisted locally, include analysis quality and performance evidence, can be
refreshed, exported as JSON, shared through the native share sheet, and deleted with their private training log, drill
practice log, and coach-consent record from the Sessions tab.

## Product Wedge

- Post-climb movement review for indoor climbing and board sessions.
- Video does not leave the device by default.
- Reports store only landmarks, metrics, cues, and timeline events.
- Local MVP workflow: record or import a video, run local analysis, review cues, export/delete the report.
- Freemium model: free local analysis and trend preview, paid deeper history, advanced drills, team tools, and optional
  encrypted sync.

## Screenshots

Current app screenshots are documented in [`docs/screenshots.md`](docs/screenshots.md) and generated from the exported
web build with `npm run store:screenshots`.

## Stack

- Expo SDK 56 and Expo Router.
- React Native 0.85 with TypeScript strict mode.
- Expo Camera, Image Picker, Media Library, and Expo Video for capture, import, permissions, and preview.
- Native video metadata reads through `movebeta-pose` with browser and picker/timer/default fallback.
- Video intake readiness for local URI validation, duration checks, resolution warnings, sampled-frame estimates, and
  recorder timing.
- Editable session metadata for attempt title, gym or wall, grade or focus, and wall angle.
- Capture setup calibration for privacy, framing, angle, distance, lighting, wall contrast, and phone stability before
  recording.
- TensorFlow.js MoveNet for browser-side pose extraction from local video sources.
- Reusable MoveNet keypoint mapper that converts model output into the normalized `PoseFrame` analysis contract.
- Local Expo native module for Apple Vision and Android ML Kit pose extraction.
- Zod contracts for movement data and report validation.
- Local rule engine for coaching cues.
- Local report repository with native SQLite storage and browser/mobile-safe persistence fallback.
- Selectable local session review with quality, performance, focus metric, primary cue, timeline, and privacy evidence.
- Private per-report training log with project status, cue usefulness feedback, effort, confidence, notes, tags, and local persistence.
- Progress project queue generated from private training logs with next-repeat prioritization.
- Capability-based Free, Pro, and Coach entitlement model with active plan configuration.
- Plan catalog tab with current tier, upgrade path, capability matrix, and billing-provider readiness.
- Launch readiness cockpit driven by replaceable evidence for demo, internal beta, and store-submission tracks.
- Durable per-report coach consent records with grant, revoke, and delete behavior.
- Local coach library queue from active consented reports with review priority, signal status, and privacy-safe context counts.
- Local coach team templates for high-priority reviews, follow-through reviews, signal retakes, and privacy-safe packet handoff.
- Versioned local coach library export that batches consented queue metadata and team templates without raw artifacts.
- Privacy deletion receipts that remove the local report, private training log, drill practice log, and coach consent
  record together.
- Privacy-safe local backup and restore JSON for reports, training logs, drill practice logs, and coach consent records
  without raw video.
- Explicitly consented coach review packets that include privacy-safe athlete context from local training logs, cue
  feedback, and drill practice while excluding raw video, video URI, key-frame landmarks, private notes, drill notes, and
  medical claims.
- Privacy-safe diagnostics support packets that include only aggregate quality, provider, consent, and sanitized events.
- Airplane-mode readiness self-check for the local analysis workflow.
- Store readiness manifest, privacy declarations, listing copy, and automated screenshot capture.
- Cue validation scoring harness and rubric for consented coach review datasets.
- Versioned cue validation dataset gate for consented clip studies before production movement-quality claims.
- Local cue-validation study seed export from consented coach packets, with review tasks but no invented reviewer scores.
- Local cue-validation review worksheet export with blank coach score rows and no reviewer identity defaults.
- Privacy-safe cue-validation worksheet CSV export for spreadsheet-based coach review collection.
- Completed worksheet CSV composer for building versioned validation dataset JSON only after real coach scores are filled.
- Sessions dataset builder that accepts a completed worksheet CSV and prepares gate-compatible validation JSON locally.
- In-app cue-validation gate preview that reports whether the completed dataset is ready or which checks still need data.
- Analysis quality scoring for frame coverage, landmark coverage, and pose visibility.
- Capture-readiness guidance that turns weak video signal into concrete retake advice.
- Beta replay plan that turns local cue and metric evidence into setup, crux, and exit actions for the next attempt.
- Movement phase breakdown that scores launch, crux, and finish phases from local cues and timeline events.
- Cue trust scoring that grades each coaching cue from pose quality, timing evidence, runtime budget, and validation readiness.
- Report-level video analysis performance evidence with local duration, frame rate, and budget status.
- Local progress insights for best signal, next focus metric, and attempt-to-attempt trend deltas.
- Local progress filters for wall angle, grade, and gym.
- Personal benchmarks for best overall, wall angle, grade, and gym attempts after the active local filters.
- Next session plan that combines readiness, benchmarks, drills, and private project notes into a local training block.
- Recurring cue pattern tracking for persistent, emerging, and cleared technique issues.
- Cue usefulness insights that turn private cue feedback into useful, unclear, and review signals.
- Repeat-outcome logging for comparable attempts after applying a beta plan, including repeat status, attempts, and
  resolved cue tracking.
- Repeat-outcome Progress insights for success rate, stalled repeat detection, resolved cues, and next-repeat action.
- Technique readiness scoring that turns local trends and private training logs into next-session guidance.
- Latest attempt comparison against the previous local report with cue status and next-repeat guidance.
- Evidence-based weekly drill plans generated from local report cues.
- Feedback-adapted drill plans that reinforce useful cues and flag unclear or not-useful cues for variants.
- Private drill practice logging for completed or skipped suggested drills.
- Practice consistency insights from private drill completion and skip history.
- Practice-aware next-session planning that lowers intensity when suggested drills are repeatedly skipped.
- Replaceable pose-estimator boundary for native platform, MediaPipe, Core ML, or TensorFlow Lite builds.
- MoveNet model execution smoke for verifying that the local TensorFlow.js model loads and runs inference.
- MoveNet pose contract tests that replay model-shaped keypoints through the local movement analyzer.
- MoveNet readiness report with load-time, inference-time, backend, memory, budget checks, and explicit real-video
  validation limitations.
- Generated native QA runbook for physical iOS and Android validation, including workflow steps, performance budgets,
  and a draft evidence payload that remains blocked until real device values are entered.
- In-app native QA evidence kit in the Plan tab with required device runs, workflows, budgets, placeholder policy, and
  validator command before internal beta or store submission.
- In-app Native QA evidence validator preview with CLI parity tests and raw local artifact rejection before device
  evidence can satisfy release readiness.
- Evidence collection plan in the Plan tab with cue-validation clips, coach review rows, wall-angle coverage, native
  device checks, and external evidence owners derived from release contracts.
- Vitest for domain tests.

## Local Setup

```bash
npm install
npm run quality
npm run model:movenet:smoke
npm run model:movenet:readiness
npm run export:web
npm run preview:web
npm run store:manifest
npm run store:screenshots
npm run toolchain:ios
npm run native:android:debug
npm run native:android:manifest
npm run native:qa:runbook
npm run release:eas:check
npm run release:readiness
```

## Configuration

```bash
EXPO_PUBLIC_MOVEBETA_ANALYSIS_PROVIDER=local-fixture
EXPO_PUBLIC_MOVEBETA_VIDEO_ANALYSIS_PROVIDER=web-tfjs-movenet
EXPO_PUBLIC_MOVEBETA_NATIVE_VIDEO_ANALYSIS_PROVIDER=native-platform-pose
EXPO_PUBLIC_MOVEBETA_ACTIVE_PLAN=free
EXPO_PUBLIC_MOVEBETA_PRIVACY_MODE=on-device
EXPO_PUBLIC_MOVEBETA_API_BASE_URL=https://api.movebeta.example/v1
EXPO_PUBLIC_MOVEBETA_LAUNCH_READINESS_EVIDENCE={"releaseGate":true,"webSmoke":true,"privacyManifest":true,"storeListing":true,"modelReadiness":true,"nativeQaRunbook":true,"androidDebugBuild":true,"iosPods":true,"iosBuild":false,"nativeDeviceQa":false,"cueValidationDataset":false,"easProject":false,"easCredentials":false}
```

`EXPO_PUBLIC_MOVEBETA_LAUNCH_READINESS_EVIDENCE` accepts the same JSON shape as Expo `extra.launchReadinessEvidence`,
so CI, EAS profiles, or release managers can update launch evidence without changing application code.

Supported local provider keys:

- `local-fixture`: deterministic preview provider for tests and web demos.
- `local-video-fallback`: deterministic local video adapter for Expo/web runtimes without native frame processors.
- `web-tfjs-movenet`: browser-side TensorFlow.js MoveNet provider for local video pose extraction.
- `native-platform-pose`: local Expo module using Apple Vision on iOS and ML Kit on Android.
- `native-mediapipe`: reserved future native bridge for MediaPipe Pose Landmarker; rejected clearly in this build.
- `native-coreml`: reserved future iOS bridge for a custom Core ML pose model; rejected clearly in this build.
- `native-tflite`: reserved future Android/iOS TensorFlow Lite bridge; rejected clearly in this build.

## Project Shape

```text
src/
  app/                  Expo navigation entries
  components/           Shared interface primitives
  core/                 Theme, haptics, configuration
  features/             Product screens
  movement/             On-device movement contracts, provider boundary, pipeline, analyzer
  video/                Video capture/import normalization, intake readiness, and source configuration
tests/                  Domain and privacy tests
docs/                   Product, architecture, requirements, and test notes
```

## Software Lifecycle

MoveBeta now includes lightweight SDLC artifacts for the full product loop:

- Delivery contract and acceptance threshold: `docs/sdlc/delivery-contract.md`.
- Definition of Done and quality gates: `docs/sdlc/definition-of-done.md`.
- Requirement-to-test traceability: `docs/sdlc/traceability-matrix.md`.
- Release checklist and operational runbook: `docs/sdlc/release-checklist.md`, `docs/sdlc/runbook.md`.
- Release readiness report for this build: `docs/sdlc/release-readiness-report.md`.
- Machine-readable release gate report: `docs/sdlc/release-gate-report.json`.
- Machine-detected launch readiness report: `docs/sdlc/launch-readiness-report.json`.
- MoveNet model readiness report: `docs/sdlc/movenet-readiness-report.json`.
- Native QA runbook and device-evidence template: `docs/sdlc/native-qa-runbook.json`,
  `docs/sdlc/native-qa-evidence.template.json`.
- Native QA evidence kit contract: `src/core/nativeQaEvidenceKit.ts`.
- Store listing, privacy declarations, manifest, and screenshots: `docs/store/`.
- Git handoff and first-push procedure: `docs/sdlc/git-handoff.md`.
- Risk register, incident response, and ADRs: `docs/sdlc/risk-register.md`, `docs/sdlc/incident-response.md`, `docs/adr/`.
- CI workflow: `.github/workflows/quality.yml`.

The local release gate is:

```bash
npm run release:check
npm run release:readiness
```

Use `npm run release:full` to run the full local quality gate and refresh the machine-detected launch readiness report in
one command.

The EAS release gates are:

```bash
npm run release:eas:check
npm run release:eas:strict
```

`release:eas:check` validates the committed build and submit configuration while reporting account-bound Expo, Apple,
and Google prerequisites as warnings. `release:eas:strict` must pass before submitting to TestFlight, Play internal
testing, or production, and expects the project id plus store credentials to be injected from environment or CI secrets.

Native store validation uses `docs/sdlc/native-qa-runbook.json` as the executable test plan and
`docs/sdlc/native-qa-evidence.template.json` as the run template. Generate the current runbook with
`npm run native:qa:runbook`, copy the runbook evidence draft or template to `docs/sdlc/native-qa-evidence.json`, fill
real iOS and Android device runs, then execute `npm run native:qa:validate`.
Cue-quality validation uses `docs/validation/cue-validation-dataset.template.json` as the study template. Copy it to
`docs/validation/cue-validation-dataset.json`, fill consented coach review packets and reviews, then execute
`npm run validation:cue`.

## Native Build Note

Expo Go cannot run the native pose bridge. Use a custom Expo development build or native run:

```bash
npx expo prebuild --no-install
npm run toolchain:ios
npm run native:android:debug
npm run native:ios:pods
npm run release:eas:check
npx eas-cli@latest build -p ios --profile production
npx eas-cli@latest build -p android --profile production
```

Android debug build is verified locally with the bundled Temurin 17 JDK and local Android SDK under `.tools`. iOS source
is implemented and `pod install` is verified with the local Ruby/CocoaPods toolchain under `.tools/ruby-3.3.11`. The
Android build also validates the merged manifest for camera/import permissions, no audio permission, and disabled backup.
iOS compilation still requires full Xcode, while this machine currently exposes only Command Line Tools.
