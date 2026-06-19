# MoveBeta Task Plan

| ID | Task | Status |
| --- | --- | --- |
| T01 | Define on-device climbing coach product direction | Done |
| T02 | Replace guide-style app surface with coach, sessions, drills, progress, privacy | Done |
| T03 | Add movement schemas for video, landmarks, sessions, metrics, cues, reports | Done |
| T04 | Add replaceable pose-estimator provider boundary | Done |
| T05 | Implement local movement analyzer and fixture provider | Done |
| T06 | Add domain tests for privacy, contracts, provider selection, and cue generation | Done |
| T07 | Run typecheck, tests, web export, and browser smoke | Done |
| T08 | Build native Apple Vision and Android ML Kit platform adapter | Done |
| T09 | Add persistent local report storage, export, refresh, and deletion controls | Done |
| T10 | Validate cue quality with real climbing clips | External data needed |
| T11 | Add SDLC delivery contract, DoD, release checklist, runbook, and risk register | Done |
| T12 | Add CI workflow, PR/issue templates, dependency update policy, and release gate scripts | Done |
| T13 | Add consent policy, report repository contract, failure-mode tests, and mobile release config | Done |
| T14 | Add selectable bundled attempts as a camera/import workaround for the runnable MVP | Done |
| T15 | Add real video record, import, preview, source normalization, and local video fallback analysis | Done |
| T16 | Validate native camera/import flows on physical iOS and Android devices | Next |
| T17 | Add browser-side TensorFlow.js MoveNet provider for local video pose extraction | Done |
| T18 | Install local Android toolchain and verify native Android debug build | Done |
| T19 | Install local Ruby/CocoaPods and verify iOS Pods | Done |
| T20 | Install full Xcode and verify iOS simulator/device build | Next |
| T21 | Add analysis quality scoring and low-confidence video warnings | Done |
| T22 | Add Git handoff check and first-push procedure | Done |
| T23 | Add local progress history insights and trend deltas | Done |
| T24 | Add weekly drill plan from local report cues | Done |
| T25 | Add latest-vs-baseline attempt comparison | Done |
| T26 | Add consented coach review packet export | Done |
| T27 | Add cue validation scoring harness and rubric | Done |
| T28 | Add capability-based Free, Pro, and Coach entitlements | Done |
| T29 | Add capture-readiness guidance from local video signal quality | Done |
| T30 | Add privacy-safe diagnostics support packet | Done |
| T31 | Add airplane-mode readiness self-check | Done |
| T32 | Add video intake readiness, local URI guard, duration guard, frame estimate, and recorder timer | Done |
| T33 | Add store readiness manifest, privacy declarations, listing copy, and screenshot automation | Done |
| T34 | Add editable session metadata for recorded/imported attempts and persist it through reports | Done |
| T35 | Add pre-recording capture setup calibration with privacy and pose-quality blockers | Done |
| T36 | Add Android merged manifest validation for video permissions, no audio permission, and disabled backup | Done |
| T37 | Add native QA evidence template, performance budgets, and validation script | Done |
| T38 | Add report-level video analysis performance evidence and budget status | Done |
| T39 | Require explicit athlete consent before coach packet preparation | Done |
| T40 | Persist per-report coach review consent with grant, revoke, and delete behavior | Done |
| T41 | Add native video metadata extraction, muted recording profile, and partial-frame pose tolerance | Done |
| T42 | Add cue validation dataset contract, template, CLI gate, and tests | Done |
| T43 | Add EAS release config validator, strict credential gate, and regression tests | Done |
| T44 | Add selectable local session review with focus metric, primary cue, timeline, and evidence facts | Done |
| T45 | Add private per-report training log with project status, effort, confidence, note, tags, and local persistence | Done |
| T46 | Add Progress project queue from private training logs with next-repeat prioritization | Done |
| T47 | Add local Progress filters by wall angle, grade, and gym | Done |
| T48 | Add privacy deletion bundle for reports, training logs, consent records, and deletion receipts | Done |
| T49 | Create private GitHub repository and push main handoff snapshot | Done |
| T50 | Add privacy-safe local data backup and restore for reports, training logs, and consent records | Done |
| T51 | Add technique readiness scoring from trends, cues, project status, effort, confidence, and drills | Done |
| T52 | Add personal benchmarks for best overall, wall angle, grade, and gym attempts | Done |
| T53 | Add next-session planning from readiness, benchmarks, drills, and private project notes | Done |
| T54 | Add recurring cue pattern tracking for persistent, emerging, and cleared technique issues | Done |
| T55 | Add private per-cue usefulness feedback inside local training logs | Done |
| T56 | Add cue usefulness insights from private cue feedback | Done |
| T57 | Adapt drill plans from private cue feedback | Done |
| T58 | Add private drill practice logging with backup, restore, and deletion coverage | Done |
| T59 | Add Progress practice consistency insights from private drill logs | Done |
| T60 | Make next-session planning adapt to blocked practice consistency | Done |
| T61 | Add privacy-safe athlete context to consented coach review packets | Done |
| T62 | Add configurable freemium plan catalog and Plan tab | Done |
| T63 | Add local coach library from active consented reports | Done |
| T64 | Add local coach team templates from consented review signals | Done |
| T65 | Add privacy-safe coach library batch export | Done |
| T66 | Add local cue-validation study seed export from consented packets | Done |
| T67 | Add local cue-validation review worksheet export | Done |
| T68 | Add privacy-safe cue-validation worksheet CSV export | Done |
| T69 | Add completed cue-validation worksheet dataset composer | Done |
| T70 | Add Sessions UI for completed worksheet CSV to validation dataset JSON | Done |
| T71 | Add native share action for prepared Sessions exports | Done |
| T72 | Add in-app cue-validation gate preview for completed datasets | Done |
| T73 | Add parity coverage between the in-app and CLI cue-validation gates | Done |
| T74 | Add configurable launch-readiness cockpit for demo, beta, and store tracks | Done |
| T75 | Add machine-detected launch-readiness doctor and durable report | Done |
| T76 | Add local beta replay plan from cue and metric evidence | Done |
| T77 | Add movement phase breakdown from cue and timeline evidence | Done |
| T78 | Add local cue trust scoring for Analyze and coach packet exports | Done |
| T79 | Add private repeat-outcome logging and Progress insights | Done |
| T80 | Add MoveNet model execution smoke for local inference verification | Done |
| T81 | Add generated screenshot gallery to documentation | Done |
| T82 | Add MoveNet readiness report and launch-readiness gate | Done |
| T83 | Add native QA runbook generator and launch-readiness gate | Done |
| T84 | Extract and test MoveNet keypoint mapping into the movement report contract | Done |
| T85 | Reject placeholder native QA evidence in the release validator | Done |
| T86 | Validate native QA and cue-validation dataset content inside launch-readiness detection | Done |
| T87 | Add machine-readable release gate report and launch-readiness detection | Done |
| T88 | Add in-app native QA evidence kit for physical-device readiness | Done |
| T89 | Add in-app native QA evidence validator preview with CLI parity | Done |
| T90 | Add evidence collection plan for validation and device QA targets | Done |
| T91 | Add release unblock checklist for external store and beta blockers | Done |
| T92 | Add release handoff packet generator for stakeholder delivery | Done |
| T93 | Add release archive checksum manifest generator | Done |
| T94 | Add model-analysis replay report for MoveNet-shaped cue evidence | Done |
| T95 | Add model-analysis replay validation to launch readiness | Done |
| T96 | Add local pre-send guard from readiness, cue, practice, and repeat evidence | Done |
| T97 | Add local beta memory from improved and sent repeat outcomes | Done |
| T98 | Add configurable in-app model evidence for local readiness and real-video validation gaps | Done |
| T99 | Add configurable safety-language guard for product and release copy | Done |
| T100 | Add model evidence sync command from machine-readable model reports | Done |
| T101 | Add native QA evidence JSON import preview to the Plan tab | Done |
| T102 | Add real-world validation campaign tracker from cue-validation contracts | Done |
| T103 | Feed completed validation campaign evidence into coach packet cue trust | Done |
| T104 | Add file-based native sharing for prepared Sessions exports | Done |
| T105 | Add versioned analysis evidence timeline to local reports | Done |
| T106 | Add privacy-safe analysis evidence-only export | Done |
| T107 | Add share-safe release unblock packet from Plan | Done |
| T108 | Add share-safe native QA runbook packet from Plan | Done |
| T109 | Add configurable provider readiness cockpit to Plan | Done |
| T110 | Add iOS toolchain doctor and launch-readiness integration | Done |
| T111 | Add share-safe release evidence packet to Plan | Done |
| T112 | Add store credentials doctor and launch-readiness integration | Done |
| T113 | Add native QA evidence composer to Plan | Done |
| T114 | Add cue validation dataset doctor and release evidence integration | Done |
| T115 | Add share-safe native QA evidence composer export | Done |
