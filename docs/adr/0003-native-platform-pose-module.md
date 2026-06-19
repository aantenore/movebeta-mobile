# ADR 0003: Native Platform Pose Module

Date: 2026-06-19
Status: Accepted

## Context

MoveBeta needs real on-device video pose extraction for mobile builds. Expo Go cannot run custom native frame extraction
or native ML bridges, while the web build can use TensorFlow.js only when the browser can decode the selected local
video. The app already has a provider contract, so the native solution should be replaceable and isolated.

## Decision

Add a local Expo module named `movebeta-pose` under `modules/movebeta-pose`.

- iOS uses Apple Vision `VNDetectHumanBodyPoseRequest`.
- Android uses Google ML Kit Pose Detection accurate mode.
- JavaScript calls the module through `native-platform-pose`.
- The domain pipeline still consumes normalized `PoseFrame[]`, so reports, cues, and storage do not depend on the native
  provider implementation.

## Consequences

- Android native debug build is verified with `:app:assembleDebug`.
- iOS source is implemented, but local iOS verification requires full Xcode and a modern Ruby/CocoaPods environment.
- MediaPipe, custom Core ML, or TensorFlow Lite can still be added later behind the same provider boundary if latency or
  landmark quality requires it.
