# ADR 0002: Browser MoveNet Video Provider

Date: 2026-06-19

## Status

Accepted

## Context

MoveBeta needs real on-device pose extraction from local climbing videos while preserving the provider-agnostic movement
pipeline. Expo Go and the web preview cannot run a mobile native frame processor, but the browser can decode local videos
and run TensorFlow.js models without uploading raw video.

## Decision

Add `web-tfjs-movenet` as the preferred video provider for web builds. It loads TensorFlow.js MoveNet SinglePose
Lightning in the browser, seeks across the local video, maps MoveNet keypoints into the MoveBeta `PoseFrame` contract,
and passes those frames to the existing local analyzer.

If the browser runtime, video decoder, or model inference is unavailable, the repository falls back to
`local-video-fallback` so the product remains usable and testable.

## Consequences

- The web build now has a real local pose-estimation path for supported video sources.
- Raw video still stays on the device/browser and is not uploaded by the app.
- The native mobile release still needs a custom Expo build with MediaPipe, Core ML, or TFLite for production mobile
  inference.
- TensorFlow.js increases bundle size, so native providers should remain separately configurable rather than forcing the
  browser provider into every runtime.
