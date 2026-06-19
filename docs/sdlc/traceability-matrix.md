# Traceability Matrix

| Requirement | Source | Automated verification | Manual verification | Current status |
| --- | --- | --- | --- | --- |
| R1 local analysis report | `docs/requirements.md` | `tests/localMovementAnalyzer.test.ts` | Analyze tab smoke | Covered |
| R2 provider boundary | `docs/architecture.md` | provider tests | architecture review | Covered |
| R3 no upload by default | `docs/data-governance.md` | privacy assertions | Privacy tab smoke | Covered |
| R4 coaching cues | `docs/requirements.md` | cue generation tests | Coach and Drills tabs | Covered |
| R5 release quality gate | `docs/sdlc/delivery-contract.md` | `npm run release:check` | CI workflow review | Covered |
| R6 video record/import workflow | `docs/requirements.md` | `tests/videoWorkflow.test.ts` | native QA checklist | Contract covered |
| R7 report storage/delete/export contract | `docs/task-plan.md` | `tests/reportRepository.test.ts` | native SQLite QA | Covered |
| R8 real-clip validation | `docs/discovery.md`, `docs/validation/cue-validation-rubric.md` | `tests/cueValidationDataset.test.ts`, `tests/cueValidation.test.ts` | `npm run validation:cue` with real consented dataset | Gate covered; data needed |
| R9 consent gate defaults | `docs/data-governance.md` | `tests/privacyConsent.test.ts` | Privacy tab smoke | Covered |
| R10 provider failure clarity | `docs/architecture.md` | `tests/onDevicePipeline.failure.test.ts` | native adapter review | Covered |
| R11 privacy-safe diagnostics | `docs/sdlc/privacy-threat-model.md` | `tests/observability.test.ts` | Privacy diagnostics smoke | Covered |
| R12 native pose model adapter | `docs/architecture.md` | provider contract tests, Android debug build, iOS Pods | native adapter QA | Contract covered |
| R13 web MoveNet pose extraction provider | `docs/architecture.md` | `tests/videoWorkflow.test.ts` | browser local-video QA | Contract covered |
| R14 analysis quality warnings | `docs/requirements.md` | `tests/localMovementAnalyzer.test.ts` | Coach tab quality panel | Covered |
| R15 local progress history | `docs/requirements.md` | `tests/progressInsights.test.ts` | Progress tab smoke | Covered |
| R16 weekly drill plan | `docs/requirements.md` | `tests/drillPlanner.test.ts` | Drills tab smoke | Covered |
| R17 latest attempt comparison | `docs/requirements.md` | `tests/attemptComparison.test.ts`, `tests/progressInsights.test.ts` | Progress tab smoke | Covered |
| R18 consent-gated coach review packet | `docs/requirements.md` | `tests/coachReviewPacket.test.ts` | Sessions tab smoke | Covered |
| R19 cue validation scoring | `docs/requirements.md`, `docs/validation/cue-validation-rubric.md` | `tests/cueValidation.test.ts` | consented clip review | Harness covered |
| R20 capability-based freemium entitlements | `docs/requirements.md`, `docs/product-strategy.md` | `tests/entitlements.test.ts` | Progress and Drills smoke | Covered |
| R21 capture readiness guidance | `docs/requirements.md` | `tests/captureReadiness.test.ts` | Analyze tab smoke | Covered |
| R22 diagnostics support packet | `docs/requirements.md` | `tests/observability.test.ts` | Privacy tab smoke | Covered |
| R23 airplane-mode readiness self-check | `docs/requirements.md` | `tests/offlineReadiness.test.ts` | Privacy tab smoke | Covered |
| R24 video intake readiness | `docs/requirements.md` | `tests/videoIntake.test.ts`, `tests/videoWorkflow.test.ts` | Analyze tab smoke | Covered |
| R25 store readiness metadata | `docs/store/store-manifest.json` | `tests/storeReadiness.test.ts` | store screenshot review | Covered |
| R26 editable session metadata | `docs/requirements.md` | `tests/videoWorkflow.test.ts` | Analyze tab smoke | Covered |
| R27 capture setup calibration | `docs/requirements.md` | `tests/captureCalibration.test.ts` | Analyze tab smoke | Covered |
| R28 Android manifest privacy and permissions | `docs/requirements.md` | `tests/androidManifestChecks.test.ts`, `npm run native:android:debug` | APK permission review | Covered |
| R29 native QA evidence budget | `docs/sdlc/native-qa-matrix.md` | `tests/nativeQaEvidence.test.ts` | `npm run native:qa:validate` with real device evidence | Harness covered |
| R30 report-level video performance evidence | `docs/requirements.md` | `tests/performanceBudget.test.ts`, `tests/videoWorkflow.test.ts` | native QA evidence comparison | Covered |
| R31 durable coach consent records | `docs/requirements.md`, `docs/sdlc/privacy-threat-model.md` | `tests/coachConsentRepository.test.ts` | Sessions consent smoke | Covered |
| R32 video metadata and muted recording | `docs/requirements.md`, `docs/architecture.md` | `tests/videoMetadata.test.ts`, `tests/videoWorkflow.test.ts` | native camera/import metadata QA | Contract covered |
| R33 cue validation dataset readiness | `docs/requirements.md`, `docs/validation/cue-validation-rubric.md` | `tests/cueValidationDataset.test.ts` | consented coach review study | Gate covered |
| R34 EAS release readiness | `docs/sdlc/mobile-release-process.md`, `eas.json` | `tests/easReleaseChecks.test.ts`, `npm run release:eas:check` | `npm run release:eas:strict` with Expo, Apple, and Google credentials | Standard gate covered; credentials needed |
| R35 selectable session review detail | `docs/requirements.md` | `tests/sessionDetail.test.ts`, browser smoke | Sessions tab review panel | Covered |
| R36 private report training log | `docs/requirements.md` | `tests/reportAnnotationRepository.test.ts`, browser smoke | Sessions tab Training log panel | Covered |
| R37 training-log project queue | `docs/requirements.md` | `tests/projectQueue.test.ts`, browser smoke | Progress tab Project queue panel | Covered |
| R38 progress history filters | `docs/requirements.md` | `tests/progressFilters.test.ts`, browser smoke | Progress tab History filters panel | Covered |
| R39 privacy deletion bundle | `docs/requirements.md`, `docs/sdlc/privacy-threat-model.md` | `tests/privacyDeletion.test.ts`, browser smoke | Sessions tab Delete receipt | Covered |
| R40 local data portability | `docs/requirements.md`, `docs/data-governance.md` | `tests/dataPortability.test.ts`, browser smoke | Privacy tab Data portability panel | Covered |
| R41 technique readiness | `docs/requirements.md` | `tests/techniqueReadiness.test.ts`, browser smoke | Progress tab Technique readiness panel | Covered |
| R42 personal benchmarks | `docs/requirements.md` | `tests/personalBenchmarks.test.ts`, browser smoke | Progress tab Personal benchmarks panel | Covered |
