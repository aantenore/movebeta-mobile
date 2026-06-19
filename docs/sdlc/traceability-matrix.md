# Traceability Matrix

| Requirement | Source | Automated verification | Manual verification | Current status |
| --- | --- | --- | --- | --- |
| R1 local analysis report | `docs/requirements.md` | `tests/localMovementAnalyzer.test.ts` | Analyze tab smoke | Covered |
| R2 provider boundary | `docs/architecture.md` | provider tests | architecture review | Covered |
| R3 no upload by default | `docs/data-governance.md` | privacy assertions | Privacy tab smoke | Covered |
| R4 coaching cues | `docs/requirements.md` | cue generation tests | Coach and Drills tabs | Covered |
| R5 release quality gate | `docs/sdlc/delivery-contract.md` | `tests/releaseGateReport.test.ts`, `npm run release:check` | CI workflow review | Covered with machine-readable gate report |
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
| R29 native QA evidence budget | `docs/sdlc/native-qa-matrix.md` | `tests/nativeQaEvidence.test.ts` | `npm run native:qa:validate` with real device evidence | Harness and placeholder rejection covered |
| R30 report-level video performance evidence | `docs/requirements.md` | `tests/performanceBudget.test.ts`, `tests/videoWorkflow.test.ts` | native QA evidence comparison | Covered |
| R31 durable coach consent records | `docs/requirements.md`, `docs/sdlc/privacy-threat-model.md` | `tests/coachConsentRepository.test.ts` | Sessions consent smoke | Covered |
| R32 video metadata and muted recording | `docs/requirements.md`, `docs/architecture.md` | `tests/videoMetadata.test.ts`, `tests/videoWorkflow.test.ts` | native camera/import metadata QA | Contract covered |
| R33 cue validation dataset readiness | `docs/requirements.md`, `docs/validation/cue-validation-rubric.md` | `tests/cueValidationDataset.test.ts` | versioned consented coach review study | Gate covered |
| R34 EAS release readiness | `docs/sdlc/mobile-release-process.md`, `eas.json` | `tests/easReleaseChecks.test.ts`, `npm run release:eas:check` | `npm run release:eas:strict` with Expo, Apple, and Google credentials | Standard gate covered; credentials needed |
| R35 selectable session review detail | `docs/requirements.md` | `tests/sessionDetail.test.ts`, browser smoke | Sessions tab review panel | Covered |
| R36 private report training log | `docs/requirements.md` | `tests/reportAnnotationRepository.test.ts`, browser smoke | Sessions tab Training log panel | Covered |
| R37 training-log project queue | `docs/requirements.md` | `tests/projectQueue.test.ts`, browser smoke | Progress tab Project queue panel | Covered |
| R38 progress history filters | `docs/requirements.md` | `tests/progressFilters.test.ts`, browser smoke | Progress tab History filters panel | Covered |
| R39 privacy deletion bundle | `docs/requirements.md`, `docs/sdlc/privacy-threat-model.md` | `tests/privacyDeletion.test.ts`, browser smoke | Sessions tab Delete receipt | Covered |
| R40 local data portability | `docs/requirements.md`, `docs/data-governance.md` | `tests/dataPortability.test.ts`, browser smoke | Privacy tab Data portability panel | Covered |
| R41 technique readiness | `docs/requirements.md` | `tests/techniqueReadiness.test.ts`, browser smoke | Progress tab Technique readiness panel | Covered |
| R42 personal benchmarks | `docs/requirements.md` | `tests/personalBenchmarks.test.ts`, browser smoke | Progress tab Personal benchmarks panel | Covered |
| R43 next-session planning | `docs/requirements.md` | `tests/sessionPlan.test.ts`, browser smoke | Progress tab Next session plan panel | Covered |
| R44 recurring cue patterns | `docs/requirements.md` | `tests/cuePatterns.test.ts`, browser smoke | Progress tab Cue patterns panel | Covered |
| R45 private cue usefulness feedback | `docs/requirements.md` | `tests/reportAnnotationRepository.test.ts`, `tests/dataPortability.test.ts`, browser smoke | Sessions tab Cue feedback controls | Covered |
| R46 cue usefulness insights | `docs/requirements.md` | `tests/cueFeedbackInsights.test.ts`, browser smoke | Progress tab Cue usefulness panel | Covered |
| R47 feedback-adapted drill plans | `docs/requirements.md` | `tests/drillPlanner.test.ts`, browser smoke | Drills tab Feedback row | Covered |
| R48 private drill practice log | `docs/requirements.md`, `docs/data-governance.md` | `tests/drillPracticeRepository.test.ts`, `tests/dataPortability.test.ts`, `tests/privacyDeletion.test.ts`, browser smoke | Drills tab Practice log controls | Covered |
| R49 practice consistency insights | `docs/requirements.md` | `tests/drillPracticeInsights.test.ts`, browser smoke | Progress tab Practice consistency panel | Covered |
| R50 practice-aware session planning | `docs/requirements.md` | `tests/sessionPlan.test.ts`, browser smoke | Progress tab Next session plan | Covered |
| R51 privacy-safe coach athlete context | `docs/requirements.md`, `docs/data-governance.md` | `tests/coachReviewPacket.test.ts`, browser smoke | Sessions tab consented Coach packet JSON | Covered |
| R52 freemium plan catalog | `docs/requirements.md`, `docs/product-strategy.md` | `tests/planCatalog.test.ts`, browser smoke | Plan tab catalog and upgrade path | Covered |
| R53 local coach library | `docs/requirements.md`, `docs/data-governance.md` | `tests/coachLibrary.test.ts`, browser smoke | Sessions tab Coach library queue | Covered |
| R54 local coach team templates | `docs/requirements.md`, `docs/product-strategy.md` | `tests/coachTeamTemplates.test.ts`, browser smoke | Sessions tab Team templates | Covered |
| R55 privacy-safe coach library export | `docs/requirements.md`, `docs/data-governance.md` | `tests/coachLibraryExport.test.ts`, browser smoke | Sessions tab Coach library export JSON | Covered |
| R56 cue-validation study seed | `docs/requirements.md`, `docs/validation/cue-validation-rubric.md` | `tests/cueValidationStudy.test.ts`, browser smoke | Sessions tab cue-validation seed JSON | Covered |
| R57 cue-validation review worksheet | `docs/requirements.md`, `docs/validation/cue-validation-rubric.md` | `tests/cueValidationStudy.test.ts`, browser smoke | Sessions tab cue-validation worksheet JSON | Covered |
| R58 cue-validation worksheet CSV | `docs/requirements.md`, `docs/validation/cue-validation-rubric.md` | `tests/cueValidationStudy.test.ts`, browser smoke | Sessions tab cue-validation worksheet CSV | Covered |
| R59 completed cue-validation dataset composer | `docs/requirements.md`, `docs/validation/cue-validation-rubric.md` | `tests/cueValidationStudy.test.ts`, `tests/cueValidationDataset.test.ts`, browser smoke | Sessions completed worksheet CSV to dataset JSON | Covered |
| R60 native prepared export share | `docs/requirements.md`, `docs/data-governance.md` | browser smoke | Sessions prepared export share action | Covered |
| R61 in-app cue-validation gate preview | `docs/requirements.md`, `docs/validation/cue-validation-rubric.md` | `tests/cueValidationDatasetGate.test.ts`, `tests/cueValidationGateParity.test.ts`, browser smoke | Sessions completed dataset gate preview | Covered |
| R62 launch-readiness cockpit | `docs/requirements.md`, `docs/sdlc/release-readiness-report.md` | `tests/launchReadiness.test.ts`, browser smoke | Plan tab Launch readiness | Covered |
| R63 machine-detected launch readiness | `docs/requirements.md`, `docs/sdlc/mobile-release-process.md` | `tests/launchReadinessDoctor.test.ts`, `npm run release:readiness` | `docs/sdlc/launch-readiness-report.json` | Covered with content validation for native QA and cue-validation evidence |
| R64 beta replay plan | `docs/requirements.md` | `tests/betaReplayPlan.test.ts`, browser smoke | Analyze tab Beta replay plan | Covered |
| R65 movement phase breakdown | `docs/requirements.md` | `tests/movementPhaseBreakdown.test.ts`, browser smoke | Analyze tab Movement phases | Covered |
| R66 cue trust scoring | `docs/requirements.md` | `tests/cueTrust.test.ts`, `tests/coachReviewPacket.test.ts`, browser smoke | Analyze tab Cue trust and Sessions coach packet JSON | Covered |
| R67 repeat outcome loop | `docs/requirements.md` | `tests/reportAnnotationRepository.test.ts`, `tests/repeatOutcomeInsights.test.ts`, `tests/sessionPlan.test.ts`, browser smoke | Sessions repeat outcome controls and Progress repeat outcome panel | Covered |
| R68 MoveNet model execution smoke | `docs/requirements.md` | `npm run model:movenet:smoke` | Real climbing-video QA with consented clips | Execution covered; video validation needed |
| R69 screenshot documentation | `docs/screenshots.md`, `docs/store/screenshot-plan.md` | `npm run store:screenshots` | Documentation gallery review | Covered |
| R70 MoveNet readiness report | `docs/requirements.md` | `tests/movenetReadinessReport.test.ts`, `tests/launchReadinessDoctor.test.ts`, `npm run model:movenet:readiness` | Real climbing-video QA with consented clips | Model budget covered; video validation needed |
| R71 native QA runbook | `docs/requirements.md`, `docs/sdlc/native-qa-matrix.md` | `tests/nativeQaRunbook.test.ts`, `tests/launchReadinessDoctor.test.ts`, `npm run native:qa:runbook` | Physical iOS and Android device runs | Runbook covered; device evidence needed |
| R72 MoveNet pose-frame contract | `docs/requirements.md`, `docs/adr/0002-web-movenet-video-provider.md` | `tests/movenetPoseMapper.test.ts` | Real climbing-video QA with consented clips | Contract covered; video validation needed |
| R72A model-analysis replay | `docs/requirements.md`, `src/movement/modelAnalysisReplay.ts` | `tests/modelAnalysisReplay.test.ts`, `npm run model:analysis:replay`, `npm run release:check` | `docs/sdlc/model-analysis-replay-report.json` | Covered for deterministic model-shaped keypoints; real video validation still needed |
| R73 native QA evidence kit | `docs/requirements.md`, `src/core/nativeQaEvidenceKit.ts` | `tests/nativeQaEvidenceKit.test.ts`, browser smoke | Plan tab Native QA evidence kit | Covered; physical device evidence still needed |
| R74 native QA validator preview | `docs/requirements.md`, `src/core/nativeQaEvidenceValidation.ts` | `tests/nativeQaEvidenceValidation.test.ts`, `tests/nativeQaEvidence.test.ts`, browser smoke | Plan tab Native QA evidence validator preview | Covered with app/CLI parity; physical device evidence still needed |
| R75 evidence collection plan | `docs/requirements.md`, `src/core/evidenceCollectionPlan.ts` | `tests/evidenceCollectionPlan.test.ts`, browser smoke | Plan tab Evidence collection plan | Covered; real clips, reviewers, and devices still needed |
| R76 release unblock checklist | `docs/requirements.md`, `src/core/releaseUnblockChecklist.ts` | `tests/releaseUnblockChecklist.test.ts`, browser smoke | Plan tab Release unblock checklist | Covered; full Xcode, physical-device QA, real cue-validation data, EAS project id, and credentials still needed |
| R77 release handoff packet | `docs/requirements.md`, `scripts/release_handoff_packet.mjs` | `tests/releaseHandoffPacket.test.ts`, `npm run release:handoff` | `docs/sdlc/release-handoff-packet.md` | Covered; packet reports remaining external blockers |
| R78 release archive integrity | `docs/requirements.md`, `scripts/release_archives.mjs` | `tests/releaseArchives.test.ts`, `npm run release:archives` | `../movebeta-mobile-release-archives.md` | Covered; archives are generated outside the source tree |
