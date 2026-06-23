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
- Plan catalog tab with current tier, upgrade path, capability matrix, and provider-agnostic billing readiness.
- Launch readiness cockpit driven by replaceable evidence for demo, internal beta, and store-submission tracks.
- Durable per-report coach consent records with grant, revoke, and delete behavior.
- Local coach library queue from active consented reports with review priority, signal status, and privacy-safe context counts.
- Local coach team templates for high-priority reviews, follow-through reviews, signal retakes, and privacy-safe packet handoff.
- Versioned local coach library export that batches consented queue metadata and team templates without raw artifacts.
- Privacy deletion receipts that remove the local report, private training log, drill practice log, and coach consent
  record together.
- Privacy-safe local backup and restore JSON for reports, training logs, drill practice logs, and coach consent records
  without raw video, with an offline content checksum for restore verification.
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
- Share-safe cue-validation reviewer onboarding packet for coach instructions, review criteria, command checklist, and
  raw-video-free collection handoff.
- Analysis quality scoring for frame coverage, landmark coverage, and pose visibility.
- Capture-readiness guidance that turns weak video signal into concrete retake advice.
- Analysis trust summary that combines local quality, body coverage, cue evidence, runtime budget, evidence timeline, and
  privacy boundary into a coaching/review/retake decision.
- Share-safe analysis trust packet for exporting the local coaching/review/retake decision without raw media, landmarks,
  private notes, local paths, or token-like values.
- Analysis trust trend that aggregates coaching-ready, review-first, journal-only, and retake decisions across local
  reports without raw video or private notes.
- Share-safe analysis trust trend packet for exporting reliability status, counts, latest decision, and next action
  without raw media, report ids, private notes, local paths, or token-like values.
- Beta replay plan that turns local cue and metric evidence into setup, crux, and exit actions for the next attempt.
- Movement phase breakdown that scores launch, crux, and finish phases from local cues and timeline events.
- Cue trust scoring that grades each coaching cue from pose quality, timing evidence, runtime budget, and validation readiness.
- Report-level video analysis performance evidence with local duration, frame rate, and budget status.
- Local progress insights for best signal, next focus metric, and attempt-to-attempt trend deltas.
- Local progress filters for wall angle, grade, and gym.
- Personal benchmarks for best overall, wall angle, grade, and gym attempts after the active local filters.
- Next session plan that combines readiness, benchmarks, drills, and private project notes into a local training block.
- Share-safe technique readiness packet for exporting status, focus, warm-up, next action, risk, and drill guidance
  without raw media, report ids, private notes, local paths, or token-like values.
- Session agenda that composes training load, next-session plan, and closeout evidence into a local minute-by-minute
  plan with intensity labels and privacy-safe proof.
- Share-safe session agenda packet with versioned JSON, summary, block timing, intensity labels, and negative privacy
  flags.
- Attempt pacing plan that turns local agenda, load, and pre-send evidence into rest windows, attempt caps, hard-try
  slots, and stop rules before adding intensity.
- Share-safe attempt pacing packet with versioned JSON, attempt budget summary, rest windows, stop rules, and negative
  privacy flags.
- Local rest timer controls from attempt pacing steps for following in-session rest windows without cloud state.
- Session closeout checklist that turns the plan, pre-send guard, drill logs, repeat outcomes, and privacy boundary into
  the next local logging actions.
- Training load balance that summarizes recent private effort, repeat, and drill logs into a local recommendation without
  exposing raw video or private notes.
- Share-safe training load packet for exporting load status, score, window, derived counts, recommendation, next action,
  and signals without raw media, report ids, private notes, local paths, or token-like values.
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
- Model evidence sync from release reports, including automatic real-world validation promotion only after a share-safe
  cue-validation dataset doctor report is ready.
- Generated native QA runbook for physical iOS and Android validation, including workflow steps, performance budgets,
  and a draft evidence payload that remains blocked until real device values are entered.
- In-app native QA evidence kit in the Plan tab with required device runs, workflows, budgets, placeholder policy, and
  validator command before internal beta or store submission.
- In-app native QA evidence composer for Android/iOS physical-run measurements, with local validation before committing
  proof JSON.
- Share-safe native QA evidence composer export with schema version, validator summary, and raw path/token rejection.
- Cue-validation clip intake manifest for consented clip coverage, wall-angle gaps, required coach review rows, and
  raw-artifact-free handoff planning.
- In-app provider readiness cockpit in the Plan tab for primary video provider, fallback provider, native target, and
  local privacy boundary.
- Provider-agnostic commercial readiness cockpit in the Plan tab for billing adapter selection, paid plan mappings,
  receipt-validation mode, sandbox proof, and credential-free configuration hygiene.
- Share-safe commercial readiness packet from the Plan tab for founder, product, engineering, and release handoff
  without payment data, receipt values, secrets, local paths, or raw artifacts.
- Share-safe validation pilot kit from the Plan tab with consent principles, wall-angle pilot sprints, capture setup,
  coach review rules, closeout commands, and no raw video, identities, local paths, credentials, or invented scores.
- Share-safe validation consent packet from the Plan tab with athlete script, bystander policy, withdrawal policy,
  per-wall-angle consent checks, and no raw video, identities, local paths, credentials, or token-like values.
- Machine-readable iOS toolchain doctor for full-Xcode, workspace, Pods, and build-settings readiness.
- Share-safe iOS toolchain setup packet from the Plan tab with sanitized full-Xcode/build unblock checks, commands, proof
  expectations, and no local paths, credentials, tokens, raw artifacts, or raw video.
- Machine-readable cue validation dataset doctor for missing, malformed, or incomplete real-review datasets.
- Machine-readable store credentials doctor for Expo, App Store Connect, and Google Play key presence without secret
  values.
- Machine-readable feature completion doctor for task, backlog, traceability, and launch-readiness drift, separating
  internal gaps from external data, device, account, and credential blockers.
- Store submission packet for metadata, privacy declarations, screenshots, copy-risk scan, and store commands without
  credentials or raw artifacts.
- Store credentials setup packet in the Plan tab for EAS project binding, Expo token, App Store Connect, and Play Console
  key names without credential values.
- In-app Native QA evidence validator preview with CLI parity tests and raw local artifact rejection before device
  evidence can satisfy release readiness.
- Evidence collection plan in the Plan tab with cue-validation clips, coach review rows, wall-angle coverage, native
  device checks, and external evidence owners derived from release contracts.
- Balanced validation collection batches in the Plan tab, with per-wall-angle clip targets, review-row estimates, and
  privacy-first capture checklist derived from acceptance thresholds.
- Share-safe validation collection packet from the Plan tab, with balanced batches, reviewer slot templates, workflow
  commands, and explicit raw-video/path/credential exclusion flags.
- Share-safe validation consent packet from the Plan tab, with local-analysis consent copy, per-batch metadata fields,
  withdrawal handling, and explicit raw-video/path/identity/token exclusion flags.
- Release unblock checklist in the Plan tab with launch-derived external blockers, proof artifacts, release commands,
  owners, affected tracks, and credential key names without secret values.
- Release critical path in the Plan tab that sequences external blockers across real-world validation, native build/QA,
  and store-account lanes with dependencies and share-safe packet export.
- Release evidence scenarios in the Plan tab that compare proof-collection bundles, projected ready tracks, cleared
  blockers, missing prerequisites, and share-safe packet export before account, device, or coach-review work starts.
- Release evidence freshness guard in the Plan tab and CLI to catch stale generated reports before handoff or store work.
- Model verification suite in the Plan tab and CLI to aggregate MoveNet runtime budgets, model-shaped replay coverage,
  wall-angle coverage, movement metric coverage, cue output coverage, privacy checks, and real-validation gaps.
- Release evidence packet in the Plan tab that aggregates launch, model, provider, native QA, iOS toolchain, and blocker
  evidence into one share-safe JSON handoff.
- Evidence reconciliation in the Plan tab that accepts share-safe release report JSON, previews which launch blockers
  would clear, and prepares a versioned no-secret reconciliation packet.
- Release blocker issue report CLI that regenerates issue-ready external blocker drafts from current launch evidence
  without filing GitHub issues or exposing secret values.
- Release blocker issue filing CLI that writes a dry-run filing plan by default and requires `--create` plus
  `MOVEBETA_RELEASE_ISSUE_CREATE=1` before creating GitHub issues.
- Plan tab release blocker issue filing export that prepares the same dry-run filing JSON from mobile-safe core logic,
  keeping Node and GitHub CLI mutation code out of the app runtime.
- Release blocker issue web-link export in the Plan tab and CLI that generates prefilled GitHub issue URLs from a
  configurable repository without exposing secrets or local artifacts.
- Installable static PWA export with manifest, service worker, Vercel static config, and no backend/API route requirement.
- Share-safe Vercel deployment readiness in the Plan tab and CLI for static prebuilt deployment checks, project binding,
  deployment-secret availability, prebuilt deploy commands, and no backend/API surface.
- Vercel static production workflow template plus readiness doctor for GitHub Actions activation, required secret-name
  references, release gate ordering, post-deploy smoke, and artifact upload evidence without committed secret values.
- In-app PWA runtime readiness in the Plan tab for install prompt state, standalone mode, service worker/cache readiness,
  network state, update state, and share-safe install guidance.
- GitHub Actions quality workflow template for `main` and pull requests that installs from `package-lock.json`, runs the
  shared local release gate, and uploads machine-readable release evidence as build artifacts after activation.
- GitHub workflow activation doctor that checks template presence, active workflow status, GitHub CLI auth, OAuth
  scopes, and token exclusion before attempting workflow pushes.
- Dependency license doctor that creates an offline package/license inventory from lockfile-installed dependencies before
  release handoff.
- Vitest for domain tests.

## Local Setup

```bash
npm install
npm run quality
npm run model:movenet:smoke
npm run model:movenet:readiness
npm run model:analysis:replay
npm run model:verification:suite
npm run model:evidence:sync
npm run export:web
npm run preview:web
npm run store:manifest
npm run store:screenshots
npm run toolchain:ios
npm run native:android:debug
npm run native:android:manifest
npm run native:ios:doctor
npm run release:env:doctor
npm run release:credentials:doctor
npm run release:blocker-issues
npm run release:blocker-issues:file
npm run release:blocker-issues:links
npm run model:movenet:assets:download
npm run model:movenet:assets:check
npm run web:pwa:check
npm run web:vercel:check
npm run web:vercel:workflow
npm run native:qa:runbook
npm run ci
npm run release:eas:check
npm run release:readiness
```

## Configuration

```bash
EXPO_PUBLIC_MOVEBETA_ANALYSIS_PROVIDER=local-fixture
EXPO_PUBLIC_MOVEBETA_VIDEO_ANALYSIS_PROVIDER=web-tfjs-movenet
EXPO_PUBLIC_MOVEBETA_NATIVE_VIDEO_ANALYSIS_PROVIDER=native-platform-pose
EXPO_PUBLIC_MOVEBETA_TFJS_MOVENET_MODEL_URL=/models/movenet/singlepose/lightning/4/model.json
EXPO_PUBLIC_MOVEBETA_ACTIVE_PLAN=free
EXPO_PUBLIC_MOVEBETA_PRIVACY_MODE=on-device
EXPO_PUBLIC_MOVEBETA_API_BASE_URL=https://api.movebeta.example/v1
EXPO_PUBLIC_MOVEBETA_RELEASE_REPOSITORY=aantenore/movebeta-mobile
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
- iOS toolchain report: `docs/sdlc/ios-toolchain-report.json`, `docs/sdlc/ios-toolchain-report.md`.
- Cue validation dataset report: `docs/sdlc/cue-validation-dataset-report.json`,
  `docs/sdlc/cue-validation-dataset-report.md`.
- Environment template report: `docs/sdlc/env-template-report.json`, `docs/sdlc/env-template-report.md`.
- Store credentials report: `docs/sdlc/store-credentials-report.json`, `docs/sdlc/store-credentials-report.md`.
- GitHub workflow report: `docs/sdlc/github-workflow-report.json`, `docs/sdlc/github-workflow-report.md`.
- Dependency license report: `docs/sdlc/dependency-license-report.json`,
  `docs/sdlc/dependency-license-report.md`.
- Model-analysis replay report: `docs/sdlc/model-analysis-replay-report.json`.
- MoveNet static assets report: `docs/sdlc/movenet-static-assets-report.json`,
  `docs/sdlc/movenet-static-assets-report.md`; model graph and weight shards live under
  `public/models/movenet/singlepose/lightning/4` and are listed in `public/model-assets.json`.
- Model asset provenance report: `docs/sdlc/model-asset-provenance-report.json`,
  `docs/sdlc/model-asset-provenance-report.md`, and the attribution notice at
  `docs/sdlc/model-asset-attribution.md`.
- Model verification suite report: `docs/sdlc/model-verification-suite-report.json`,
  `docs/sdlc/model-verification-suite-report.md`.
- Release blocker issue report: `docs/sdlc/release-blocker-issues-report.json`,
  `docs/sdlc/release-blocker-issues-report.md`.
- Release blocker issue filing plan: `docs/sdlc/release-blocker-issue-filing-plan.json`,
  `docs/sdlc/release-blocker-issue-filing-plan.md`.
- Release blocker issue web links: `docs/sdlc/release-blocker-issue-web-links.json`,
  `docs/sdlc/release-blocker-issue-web-links.md`.
- PWA readiness report: `docs/sdlc/pwa-readiness-report.json`, `docs/sdlc/pwa-readiness-report.md`.
- Vercel deployment report: `docs/sdlc/vercel-deployment-report.json`,
  `docs/sdlc/vercel-deployment-report.md`.
- Vercel workflow report: `docs/sdlc/vercel-workflow-report.json`, `docs/sdlc/vercel-workflow-report.md`.
- Release handoff packet for stakeholder or buyer review: `docs/sdlc/release-handoff-packet.md`,
  `docs/sdlc/release-handoff-packet.json`.
- Release archive integrity manifest: `../movebeta-mobile-release-archives.md`,
  `../movebeta-mobile-release-archives.json`, with SHA-256 checksums and worktree-state evidence.
- MoveNet model readiness report: `docs/sdlc/movenet-readiness-report.json`.
- Native QA runbook and device-evidence template: `docs/sdlc/native-qa-runbook.json`,
  `docs/sdlc/native-qa-evidence.template.json`.
- Native QA evidence kit contract: `src/core/nativeQaEvidenceKit.ts`.
- Store listing, privacy declarations, manifest, and screenshots: `docs/store/`.
- Git handoff and first-push procedure: `docs/sdlc/git-handoff.md`.
- Risk register, incident response, and ADRs: `docs/sdlc/risk-register.md`, `docs/sdlc/incident-response.md`, `docs/adr/`.
- CI workflow template: `docs/sdlc/ci-templates/github-actions-quality.yml`; move it to
  `.github/workflows/quality.yml` after the GitHub token has `workflow` scope.

The local release gate is:

```bash
npm run release:check
npm run model:movenet:assets:download
npm run model:analysis:replay
npm run model:movenet:assets:check
npm run model:assets:provenance
npm run model:verification:suite
npm run model:evidence:sync
npm run release:blocker-issues
npm run release:blocker-issues:file
npm run native:ios:doctor
npm run release:env:doctor
npm run release:credentials:doctor
npm run web:vercel:check
npm run web:vercel:workflow
npm run release:readiness
npm run release:archives
npm run release:handoff
```

Use `npm run release:full` to run the full local quality gate and refresh the machine-detected launch readiness report in
one command, including the release handoff packet.

The web app can be deployed as a static installable PWA without a backend. Run `npm run export:web`,
`npm run web:pwa:check`, `npm run web:vercel:check`, and `npm run web:vercel:workflow`; `vercel.json` points Vercel at
`dist` and does not define API routes or serverless functions. The Vercel doctors keep account binding, workflow
activation, and deployment token values outside source control while documenting prebuilt deploy commands and a static
GitHub Actions deployment template. Use Vercel plan selection according to the intended personal or commercial
deployment context.

The web MoveNet graph and weight shards are downloaded during setup or release with
`npm run model:movenet:assets:download`, then committed under `public/models/...` with SHA-256 digests in
`public/model-assets.json`. Runtime analysis loads the configured same-origin model URL instead of fetching model weights
from the upstream catalog during the first user analysis. The post-export step injects hashed Expo bundles, router
assets, and metadata into `dist/sw.js`; the service worker also caches `/model-assets.json` and every listed
`/models/...` asset, then derives the service-worker cache version from those app, shell, metadata, and model asset
contents so installed clients receive a fresh cache name when shipped assets change.
The Plan tab PWA runtime check reads Cache Storage for `/model-assets.json` and the listed same-origin model assets, so
offline video-analysis readiness is not claimed until the model cache is warm.
The Plan tab also includes a Warm model action that fetches and caches those same-origin model files explicitly and
prepares a share-safe warmup result before offline gym use. When Web Crypto is available, the warmup also compares cached
byte counts and SHA-256 digests against `model-assets.json` so the packet can distinguish cached assets from verified
assets.

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
npm run native:ios:doctor
npm run release:eas:check
npm run release:credentials:doctor
npx eas-cli@latest build -p ios --profile production
npx eas-cli@latest build -p android --profile production
```

Android debug build is verified locally with the bundled Temurin 17 JDK and local Android SDK under `.tools`. iOS source
is implemented and `pod install` is verified with the local Ruby/CocoaPods toolchain under `.tools/ruby-3.3.11`. The
Android build also validates the merged manifest for camera/import permissions, no audio permission, and disabled backup.
iOS compilation still requires full Xcode, while this machine currently exposes only Command Line Tools. Run
`npm run native:ios:doctor` to refresh the current blocker report before iOS beta or store work.
