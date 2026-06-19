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
