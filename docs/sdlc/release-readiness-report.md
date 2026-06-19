# Release Readiness Report

Date: 2026-06-19
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
- Analyze converts video signal quality into ready, review, or retake guidance before coaching cues.
- Progress shows local history summary, best signal, next focus metric, technique readiness, personal benchmarks,
  attempt comparison, and trend deltas.
- Drills shows a weekly drill plan with priority, dosage, report evidence, and coach pack preview.
- Web builds use TensorFlow.js MoveNet when local browser video decoding is available.
- Android custom native builds compile the `native-platform-pose` provider backed by ML Kit and local video metadata reads.
- iOS native source includes Apple Vision pose extraction, local video metadata reads, and local Photos asset resolution
  behind the same provider contract.
- Reserved native adapter keys for MediaPipe, Core ML, and TensorFlow Lite fail clearly until those adapters are
  implemented.
- User can select bundled local attempts and get distinct local analysis reports.
- Reports are persisted locally, refreshed on Sessions focus, exported as full JSON, and deleted with their private
  training log plus coach consent record.
- Sessions lets the user select a local report review with quality facts, performance facts, focus metric, primary cue,
  timeline markers, and local privacy evidence.
- Sessions lets the user keep private per-report training notes with project status, perceived effort, confidence, and
  local tags behind browser/local or native SQLite persistence.
- Progress converts private training logs into a local project queue with active project count, repeat count, sent count,
  effort, and next-repeat action.
- Progress filters local report history and the project queue by wall angle, grade, and gym.
- Native report persistence uses SQLite behind the same repository contract, with browser/local fallback storage.
- Sessions persists explicit per-report consent before preparing a coach review packet without raw video, URI, key-frame, or landmark artifacts.
- Privacy can prepare a diagnostics support packet without raw video, URI, key-frame, landmark, account, or secret artifacts.
- Privacy can prepare and restore a versioned local backup JSON without raw video, video URI, audio, account identifiers,
  or secrets.
- Privacy shows an airplane-mode readiness self-check for local provider, storage, cloud sync, raw export, and report history.
- Store readiness manifest validates bundle identifier, Android package, permission copy, privacy declarations, listing
  copy, and screenshot plan.
- EAS release readiness validates remote app versioning, internal development/preview profiles, production app bundle
  output, production auto-increment, binary identifiers, submit profile presence, and absence of committed submit secrets.
- Store screenshots are captured from the exported app for Analyze, Drills, Progress, Sessions, and Privacy.
- Cue validation scoring harness and rubric are ready for consented coach review datasets.
- Cue validation dataset contract, template, and CLI gate are ready for real consented coach review studies.
- Free, Pro, and Coach capabilities are modeled through active-plan entitlements without hard-coded pricing.
- Exported reports expose privacy-safe metadata and do not include raw video URIs.
- Drills, Progress, and Privacy tabs navigate successfully.
- Mobile viewport at 390x844 and desktop viewport at 1280x900 render without smoke failures.

## Automated Gates

- `npm run typecheck`: passed.
- `npm test`: passed, 32 test files and 117 tests.
- `npm ci`: passed from `package-lock.json`.
- `npm run export:web`: passed, generated `dist`.
- `npm run security:audit`: passed at `--audit-level=high`.
- `npm run release:check`: passed.
- `npm run release:eas:check`: passed, with warnings for account-bound EAS project id, `EXPO_TOKEN`, App Store Connect,
  and Google Play credentials that must be supplied outside the repository.
- `tests/easReleaseChecks.test.ts`: passed and covers standard mode, strict mode, injected credential success, production
  build drift, and committed submit-secret rejection.
- `tests/sessionDetail.test.ts`: passed and covers session review status, focus metric, primary cue, quality facts,
  performance facts, timeline marker bounds, and privacy evidence.
- `tests/reportAnnotationRepository.test.ts`: passed and covers private training-log creation, updates, tag normalization,
  local persistence, SQLite persistence, delete behavior, and corrupted-storage tolerance.
- `tests/projectQueue.test.ts`: passed and covers active/repeat/sent counts, average effort, next-repeat priority,
  missing-report tolerance, and action generation.
- `tests/progressFilters.test.ts`: passed and covers wall-angle, grade, and gym option derivation, report filtering, and
  active filter counting.
- `tests/privacyDeletion.test.ts`: passed and covers report, private training-log, coach-consent cleanup, orphan cleanup,
  and privacy-safe deletion receipt copy.
- `tests/dataPortability.test.ts`: passed and covers privacy-safe backup JSON, restore into empty repositories, orphan
  skipping, and URI-like artifact rejection.
- `tests/techniqueReadiness.test.ts`: passed and covers baseline, repeat, and recovery next-session recommendations.
- `tests/personalBenchmarks.test.ts`: passed and covers best overall, wall-angle, grade, gym, latest-vs-best deltas,
  and empty local history behavior.
- `npm run store:manifest`: passed and generated `docs/store/store-manifest.json`.
- `MOVEBETA_SMOKE_URL=http://127.0.0.1:8083 npm run store:screenshots`: passed and generated five 780x1688 PNG screenshots.
- Playwright exported-bundle smoke: passed with `scripts/smoke_web_video.py`, including the Analysis quality panel on
  mobile and desktop viewports, session metadata inputs, capture setup calibration, video intake readiness,
  capture-readiness guidance, the Drills weekly plan, the Progress technique readiness panel, the Progress personal
  benchmarks panel, the Progress attempt
  comparison, the Progress history preview, Plan access cards, Progress history filters, the Sessions review detail, the
  Sessions private training log, the Progress project queue, the Sessions coach packet consent gate and export, the
  Sessions deletion receipt, the Privacy diagnostics packet, Privacy data portability backup/restore, and the Privacy
  airplane-mode readiness self-check.
- `npx expo prebuild --no-install`: passed.
- `npm run toolchain:ios`: passed and confirms local CocoaPods 1.16.2.
- Local CocoaPods 1.16.2 is installed under `.tools/ruby-3.3.11/bin/pod`.
- `npm run native:android:debug`: passed with local Temurin 17 JDK and Android SDK under `.tools`; the merged Android
  manifest check confirms `CAMERA` and `READ_MEDIA_VIDEO`, excludes `RECORD_AUDIO`, and keeps `allowBackup=false`.
- `tests/nativeQaEvidence.test.ts`: passed and covers device evidence requirements for platform coverage, camera/import
  workflows, muted recording, native metadata reads, airplane-mode analysis, latency, battery, and thermal budgets.
- `tests/cueValidationDataset.test.ts`: passed and covers dataset thresholds, wall-angle coverage, reviewer coverage,
  review modes, score quality, and raw-artifact exclusion.
- `npm run native:ios:pods`: passed with local Ruby 3.3.11 and CocoaPods 1.16.2; `MoveBetaPose` is installed as an iOS pod.
- `npm run handoff:git`: passed and reports `main` with origin `https://github.com/aantenore/movebeta-mobile.git`.
- Private GitHub repository `https://github.com/aantenore/movebeta-mobile` is created and `main` is pushed.
- iOS `xcodebuild -workspace ios/MoveBeta.xcworkspace -scheme MoveBeta -configuration Debug -sdk iphonesimulator -showBuildSettings`: blocked because this machine has Command Line Tools, not full Xcode.

## Known Residual Risks

- iOS build verification is blocked on this machine because full Xcode is not installed. CocoaPods is now verified with a
  local modern Ruby toolchain.
- Native release requires custom Expo development build validation on physical iOS and Android devices with real climbing
  clips. The validator and template now exist, but `docs/sdlc/native-qa-evidence.json` must be filled from real devices.
- Store-bound EAS submission requires `npx eas-cli@latest init` on the target Expo account, `extra.eas.projectId`,
  `EXPO_TOKEN`, App Store Connect credentials, and Google Play service account credentials before
  `npm run release:eas:strict` can pass.
- Production movement-quality claims require `docs/validation/cue-validation-dataset.json` to be filled with real
  consented coach review packets and pass `npm run validation:cue`.
- `npm audit` reports moderate vulnerabilities in the Expo config chain through `uuid`/`xcode`; the current suggested forced fix is breaking and is not applied in this release.
- GitHub Actions workflow activation is deferred because the available GitHub OAuth token lacks the `workflow` scope.
  The quality workflow is committed as `docs/sdlc/ci-templates/github-actions-quality.yml` and can be moved into
  `.github/workflows/quality.yml` after `gh auth refresh -h github.com -s workflow`.
