# MoveBeta Discovery Notes

## Feasibility

On-device climbing movement analysis is feasible for a narrow MVP. The safest first product is post-climb review of short
clips, not real-time coaching while a person is on the wall. Real-time feedback introduces latency, safety, distraction,
and mounting constraints.

## Technology Signals

- MediaPipe Pose Landmarker supports body landmark detection for images and video.
- Apple Vision supports human body pose detection and can be paired with Core ML workflows.
- VisionCamera provides a route to native camera frame processing in React Native custom builds.

## Product Risks

- Climbing movement is highly context-dependent; cues must stay humble and explainable.
- Poor camera angle can make landmarks unreliable.
- Gyms have privacy rules and may restrict filming.
- On-device models need battery and thermal testing on real phones.

## Recommended MVP

1. Record or import a short attempt.
2. Run local pose estimation.
3. Produce movement metrics and timestamped cues.
4. Let users repeat the climb and compare the next attempt.
5. Add paid longitudinal history only after cue quality is validated.
