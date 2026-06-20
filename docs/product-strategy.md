# MoveBeta Product Strategy

MoveBeta is an on-device climbing coach for indoor climbers who already film attempts but do not get structured feedback.
The core promise is simple: record an attempt, keep the video local, and receive movement cues that are specific enough to
repeat on the next go.

## Market Read

Training apps, coaching marketplaces, and emerging video-analysis apps exist, but most products either focus on plans,
content, or cloud-assisted review. MoveBeta should compete on privacy, immediacy, and movement specificity rather than
trying to be another generic training diary.

## Target Users

- Beginner to intermediate indoor climbers who want actionable technique feedback.
- Board climbers who repeat short attempts and can compare movement quality over time.
- Coaches and gyms who want a privacy-preserving review workflow for classes.

## Freemium Model

- Free: local analysis for limited recent sessions, basic metrics, and three cue categories.
- Pro: unlimited local history, trend dashboards, advanced drill packs, side-by-side repeats, and exportable reports.
- Coach: athlete libraries, team tags, shared drill plans, consent workflows, and gym-level templates.
- Optional add-on: encrypted sync and backup for users who explicitly opt in.

The app now models these tiers as replaceable entitlements. `EXPO_PUBLIC_MOVEBETA_ACTIVE_PLAN` or Expo `extra.activePlan`
selects the current plan; product surfaces read capabilities instead of hard-coding prices or payment providers.
The Plan tab turns the same entitlement contract into a catalog, upgrade path, and capability matrix while leaving checkout
to a replaceable store-subscription or billing provider integration.
Commercial readiness now tracks that future integration separately from movement analysis: billing adapter, paid plan
product mappings, receipt-validation mode, sandbox proof, and config hygiene are visible without committing to a vendor.
The launch-readiness cockpit reads `EXPO_PUBLIC_MOVEBETA_LAUNCH_READINESS_EVIDENCE` or Expo
`extra.launchReadinessEvidence`, letting release evidence advance from CI, EAS, or a release manager without changing UI
code.
The Sessions coach library gives the Coach tier a local-first review queue before any multi-account or cloud workspace is
introduced.
Local team templates turn consented review queues into reusable class and project workflows without introducing cloud
sharing before privacy validation is complete.
The versioned coach library export gives the Coach tier a concrete batch handoff artifact for clinics or remote review
while keeping raw video, pose artifacts, and private notes outside the bundle.
The cue-validation study seed shortens the path from local coach review to product evidence: coaches can score
packet-only tasks later without the app inventing validation results.
The review worksheet makes that evidence loop operational by giving each required coach slot a blank row while keeping
validation score entry outside automated generation.
The worksheet CSV makes the same loop usable with spreadsheet-based review collection before a dedicated coach portal is
worth building.
The completed-worksheet composer closes the evidence loop by producing validation-gate JSON only from real reviewer rows
that still match the original consented seed.

## Differentiation

- On-device first: no raw video upload in the default product loop.
- Modular model layer: MediaPipe, Core ML, or TFLite can be swapped behind one provider contract.
- Explainable cues: every cue maps to a visible metric or timeline event.
- Safety-aware positioning: movement education, not medical diagnosis or injury prediction.

## MVP Success Metrics

- Activation: first completed local analysis.
- Retention: users repeat the same climb after reading a cue.
- Quality: users mark a cue as useful or not useful.
- Trust: low opt-out rate for local report storage.
- Monetization: conversion from free local analysis to Pro trend history.
