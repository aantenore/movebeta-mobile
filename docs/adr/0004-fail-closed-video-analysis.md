# ADR 0004: Fail-Closed Real-Video Analysis

Date: 2026-07-10

## Status

Accepted

## Context

The deterministic video fallback creates pose-shaped data from metadata and fixture rules. It is useful for tests, but it
cannot support coaching claims about a recorded or imported climbing attempt. Silently using it after a model or decoder
failure can associate invented cues with a user's real video.

## Decision

Recorded and imported video must use the configured real pose provider: TensorFlow.js MoveNet on web or the native
platform pose module in custom mobile builds. Provider unavailability, decode failure, cancellation, or insufficient
frames stops the analysis without saving a report or displaying coaching cues. Synthetic providers remain available only
for bundled demos and automated tests.

Metric generation also fails closed at the metric boundary. Required joints below the configured confidence threshold,
insufficient per-metric coverage, or insufficient temporal resolution produce `insufficient-data`, not a clean score.
Older runs are cooperatively aborted and may not commit state or persistence after a newer run starts.

## Consequences

- The UI can show an actionable error instead of fabricated coaching feedback.
- Demo analysis remains runnable but transient and never appears in user history.
- Reports identify the pose model separately from the cue-engine version.
- Real-device validation is still required before production claims about cue accuracy.
