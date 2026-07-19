# MoveBeta

## In plain English

MoveBeta helps indoor boulderers learn from a repeated attempt without uploading their video to an AI service. It analyzes a short clip on the device, points to one measurable movement to review, and lets the climber film the same problem again against a clear baseline.

**Example:** a climber repeatedly loses control on the same move. MoveBeta can highlight a measured signal such as lateral torso movement at the relevant moment, preserve that focus for the next attempt, and compare only compatible recordings of the same climb. It does not claim to know the one correct technique or replace a coach.

| Feature | What it means for a climber |
| --- | --- |
| On-device pose analysis | The selected video stays on the device instead of being sent to a remote inference service. |
| One synchronized movement focus | The feedback is tied to the relevant video moment rather than delivered as a vague score. |
| Attempt–focus–repeat loop | A climber can act on one observation and check the next attempt against the same baseline. |
| Compatibility checks | The app avoids presenting misleading comparisons between unrelated climbs or analysis providers. |
| Feedback, export, and deletion | People can challenge a cue and keep control of the derived history stored on their device. |

## Product scope

MoveBeta is a local-first climbing movement review app for indoor boulderers. A climber imports or records a short
attempt, reviews one pose-based movement focus at the relevant video moment, films the same climb again, and compares the
repeat against an explicit baseline.

The consumer app is intentionally narrow. It is not a guidebook, social network, universal AI coach, or medical tool.

## Product Loop

1. Record on iOS or Android, or import a local video in the installable PWA.
2. Run pose estimation and movement scoring on the device.
3. Review the video with a synchronized landmark overlay and one primary focus.
4. Mark the focus useful, unclear, or inaccurate.
5. Film a focused repeat with the project, baseline, and target cue preserved.
6. Compare only compatible attempts from the same climb.
7. Export or delete the derived local history at any time.

The selected video is not uploaded and is not stored in report history. Reports contain derived pose frames, quality
evidence, movement signals, and focus cues.

## Product Status

The exported PWA is a functional private beta. The real-video smoke test covers import, local MoveNet inference,
synchronized overlay, focus feedback, an explicit repeat, comparison, persistence, offline reload, and responsive
layouts.

The analysis is based on 2D pose proxies. It can measure low-movement time, elbow-flexion time, lateral torso offset,
and rapid ankle movement. It cannot prove foot contact, distance from the wall, intent, fatigue, injury risk, or the
single correct beta.
Production coaching claims remain blocked until a consented coach-reviewed dataset passes the thresholds in
[`docs/product-strategy.md`](docs/product-strategy.md).

Android native code builds locally. The iOS source parses, but full iOS compilation and physical-device inference still
require a machine with full Xcode. Store release also requires real-device QA, account credentials, and cue validation;
the repository does not pretend those external gates have passed.

## Screenshots

The current consumer flow is documented in [`docs/screenshots.md`](docs/screenshots.md). Regenerate it with:

```bash
MOVEBETA_TEST_VIDEO=/absolute/path/to/climbing.mp4 npm run store:screenshots
```

## Business Model

The private beta ships free with the complete local workflow and all locally stored reports visible. The launch
hypothesis is freemium: Free keeps the attempt-focus-repeat loop; Pro adds long-horizon project history, longitudinal
comparisons, and encrypted backup. A Coach workspace remains deferred until video review, athlete separation, consent,
billing, and cue validation are real workflows.

Billing is not implemented, and public configuration is not treated as a paid entitlement.

## Stack

- Expo SDK 56, Expo Router, React Native 0.85, and strict TypeScript.
- TensorFlow.js MoveNet with same-origin static model assets for the web PWA.
- A local Expo module using Apple Vision on iOS and ML Kit Accurate Pose Detection on Android.
- Expo Camera, Image Picker, and Video for capture, import, playback, and synchronized replay.
- Zod contracts for all movement, report, comparison, and configuration boundaries.
- SQLite on native and versioned local storage on web.
- Vitest for domain, privacy, persistence, model-contract, and release tests.
- Playwright for exported PWA, real-video, offline, and screenshot verification.

The pose provider is replaceable behind one pipeline contract. Provider and model identity are stored with every report,
and incompatible reports are rejected before comparison.

## Local Setup

Use Node 24 and install the locked dependencies:

```bash
npm ci
npm run quality
npm run export:web
npm run preview:web
```

The preview is available at [http://localhost:8082](http://localhost:8082).

Run the complete real-video web flow:

```bash
MOVEBETA_SMOKE_URL=http://127.0.0.1:8082 \
MOVEBETA_TEST_VIDEO=/absolute/path/to/climbing.mp4 \
python3 scripts/smoke_web_video.py
```

Useful release checks:

```bash
npm run web:pwa:check
npm run model:movenet:assets:check
npm run model:movenet:smoke
npm run native:android:debug
npm run native:ios:doctor
npm run release:check
```

`release:check` reports external blockers instead of fabricating evidence for physical devices, stores, or coach review.

## Configuration

Consumer defaults live in `app.json` and can be replaced at build time:

```bash
EXPO_PUBLIC_MOVEBETA_PRODUCT_EXPERIENCE=consumer
EXPO_PUBLIC_MOVEBETA_VIDEO_ANALYSIS_PROVIDER=web-tfjs-movenet
EXPO_PUBLIC_MOVEBETA_NATIVE_VIDEO_ANALYSIS_PROVIDER=native-platform-pose
EXPO_PUBLIC_MOVEBETA_TFJS_MOVENET_MODEL_URL=/models/movenet/singlepose/lightning/4/model.json
EXPO_PUBLIC_MOVEBETA_ACTIVE_PLAN=free
EXPO_PUBLIC_MOVEBETA_PRIVACY_MODE=on-device
```

`diagnostic` product experience is reserved for internal builds. It exposes model, validation, and release tooling that is
hidden from the consumer navigation.

## Model Delivery

MoveNet graph and weight shards are committed under `public/models/` with SHA-256 digests in
`public/model-assets.json`. The web export serves them from the app origin. The service worker caches the application
shell and model assets so later analyses can run offline; no inference backend or API route is required.

## Project Shape

```text
src/app/                 Expo Router entries
src/components/          Shared UI primitives
src/core/                Configuration, storage, entitlements, and product services
src/features/            Coach, Attempts, Progress, Settings, and internal screens
src/movement/            Pose contracts, providers, analyzer, comparison, and evidence
src/video/               Capture, import, metadata, intake, and sampling
modules/movebeta-pose/    Apple Vision and Android ML Kit Expo module
tests/                   Automated contract and regression tests
scripts/                 Build, smoke, screenshot, and release automation
docs/                    Product, architecture, validation, store, and SDLC evidence
```

## Native Builds

Expo Go cannot load the local pose module. Use a custom development build:

```bash
npx expo prebuild --no-install
npm run native:android:debug
npm run native:ios:pods
npm run native:ios:doctor
```

Android uses the bundled local JDK and SDK helpers. iOS compilation requires full Xcode; Command Line Tools alone are not
enough. Physical-device acceptance criteria and evidence templates live in `docs/sdlc/native-qa-runbook.json`.

## Documentation

- Product and business decisions: [`docs/product-strategy.md`](docs/product-strategy.md)
- Architecture: [`docs/architecture.md`](docs/architecture.md)
- Requirements: [`docs/requirements.md`](docs/requirements.md)
- Test plan: [`docs/test-plan.md`](docs/test-plan.md)
- Data governance: [`docs/data-governance.md`](docs/data-governance.md)
- Release evidence and external blockers: [`docs/sdlc/`](docs/sdlc/)
