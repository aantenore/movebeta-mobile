# Delivery Contract: MoveBeta Mobile

## Objective

Ship a modular cross-platform prototype for an on-device climbing coach that can be safely evolved into a native mobile
product without coupling UI, model provider, storage, or monetization decisions.

## Scope

Must:
- Analyze a short attempt through a local pipeline.
- Keep raw video local by default.
- Produce schema-validated movement metrics, cues, and timeline events.
- Show analysis quality and warnings when pose visibility or frame coverage is weak.
- Keep provider-specific pose estimation behind a replaceable interface.
- Provide camera/import analysis plus selectable bundled local attempts as a demo fallback.
- Persist local reports with refresh, JSON export, and deletion controls.
- Provide automated quality gates and release handoff artifacts.

Should:
- Document privacy, safety, release, and incident practices.
- Track risks and next production steps.
- Keep native provider work isolated inside the local Expo module.

Could:
- Add encrypted sync, subscriptions, and team sharing in later increments.

Out of scope:
- App Store submission.
- Real native camera inference in Expo Go.
- Medical diagnosis, injury prediction, or safety guarantees.

## Assumptions

- Web preview uses `web-tfjs-movenet` when browser video decoding is available and falls back locally when needed.
- Native inference requires a custom native build with `native-platform-pose`.
- Users care more about private repeatable feedback than live wall-time coaching in the MVP.

## Acceptance Threshold

The increment is acceptable when typecheck, domain tests, MoveNet readiness, web export, browser smoke, and high-severity
dependency audit pass; all P0/P1 risks are either closed or tracked with an owner; no default workflow uploads raw video.

## Requirements

| ID | Requirement | Priority | Acceptance criteria | Verification |
| --- | --- | --- | --- | --- |
| R1 | Analyze locally | Must | A session can produce metrics, cues, timeline, and key frame without network calls | `npm test`, browser smoke |
| R2 | Provider agnostic | Must | UI depends on the pipeline, not a concrete native model | code review, unit tests |
| R3 | Privacy first | Must | Report marks video upload disabled and video leaving device false | `npm test`, privacy screen |
| R4 | Release gate | Must | One command runs typecheck, tests, export, and audit | `npm run release:check` |
| R5 | SDLC traceability | Should | Requirements, risks, ADRs, DoD, runbook, and release checklist exist | docs review |
| R6 | Local report lifecycle | Must | User can create, list, export, and delete local reports without uploading video | `npm test`, browser smoke |
| R7 | Camera/import workflow | Must | Runnable build records/imports a video source and preserves bundled demo attempts as fallback | `npm test`, browser smoke |
| R8 | Analysis quality | Must | Reports expose quality score and warnings for weak pose visibility or low frame coverage | `npm test`, coach screen |

## Architecture Approach

MoveBeta uses an Expo/React Native app shell, feature screens, reusable components, and a movement domain package. Native
pose estimation should implement `PoseEstimator`; storage and sync should be introduced behind separate repository
interfaces.

## Test Plan

- Unit/domain: movement schemas, fixture frames, analyzer, provider selection, privacy flags, analysis quality.
- Repository: report save/list/export/delete, local restore, corrupted storage handling.
- Build: TypeScript and Expo web export.
- Model: MoveNet readiness report with local load and inference budget checks.
- Security: high-severity dependency audit.
- Manual smoke: tab workflows, responsive layout, no console errors.
- Native future: camera permission, frame processing latency, airplane-mode analysis, thermal behavior.

## Delivery Mode

Current mode: code-only. Commit, push, PR, app distribution, or deployment require explicit maintainer approval.

## Risks And Decisions

| Risk/decision | Impact | Proposed handling |
| --- | --- | --- |
| Native provider needs device QA | Production mobile value depends on real videos | Validate on physical iOS/Android devices and climbing clips |
| Pose data privacy | User trust and legal risk | Minimal artifacts, explicit consent, local deletion |
| Coaching cue quality | Retention and safety positioning | Validate on real clips, keep educational language |
