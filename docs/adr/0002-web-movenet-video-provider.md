# ADR 0002: Browser MoveNet Video Provider

Date: 2026-06-19

## Status

Accepted, superseded in part by ADR 0004

## Context

MoveBeta needs real on-device pose extraction from local climbing videos while preserving the provider-agnostic movement
pipeline. Expo Go and the web preview cannot run a mobile native frame processor, but the browser can decode local videos
and run TensorFlow.js models without uploading raw video.

## Decision

Add `web-tfjs-movenet` as the preferred video provider for web builds. It loads TensorFlow.js MoveNet SinglePose
Lightning in the browser, seeks across the local video, maps MoveNet keypoints into the MoveBeta `PoseFrame` contract,
and passes those frames to the existing local analyzer.

The MoveNet keypoint-to-`PoseFrame` mapping lives in a reusable movement module rather than inside the browser provider.
Contract tests replay MoveNet-shaped keypoints through this mapper and then into the local analyzer, so future providers
must preserve the same normalized landmark boundary before producing coaching output.

Failure behavior for real user video is defined by ADR 0004. The deterministic fallback remains available only to tests
and fixtures.

## Consequences

- The web build now has a real local pose-estimation path for supported video sources.
- Raw video still stays on the device/browser and is not uploaded by the app.
- Native mobile inference uses the custom `movebeta-pose` Expo module backed by Apple Vision and Android ML Kit.
- TensorFlow.js increases bundle size, so native providers should remain separately configurable rather than forcing the
  browser provider into every runtime.
