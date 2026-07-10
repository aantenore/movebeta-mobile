# Real Climbing Video Smoke Evidence

Date: 2026-07-10

## Fixture

- Source: [Pexels clip 5382881](https://www.pexels.com/video/woman-in-activewear-climbing-up-the-wall-5382881/).
- Local-only test copy: not committed.
- Media: 12.76 seconds, 720x1280 MP4.
- SHA-256: `f7ae1d5d02f34e9a376012ba988400f5d928cb173848710aaf02412467699f14`.

## Execution

The exported PWA was opened in Chromium, the clip was selected through the same browser file-picker path used by the
product, and analysis was started explicitly after metadata entry. The shipped same-origin MoveNet SinglePose Lightning
graph processed 37 frames. The same clip was then imported as an explicit focused repeat.

## Result

- Repeat pose quality: 80/100.
- Movement continuity, low-movement time, elbow-flexion time, and torso offset: measured.
- Rapid ankle movement: insufficient evidence and therefore not scored.
- Focused repeat linkage, target cue persistence, and comparison: pass.
- Video and overlay rendered at matching dimensions; synchronized replay changed the media timestamp.
- Persisted provider: `web-tfjs-movenet`.
- Persisted pose model: `movenet-singlepose-lightning-v4`.
- Persisted cue engine: `movebeta-cue-engine-v2.0.0`.
- Persisted video URI or `blob:` reference: none.
- Desktop, 320 px mobile, PWA offline boot, and model-cache checks: pass.

A more difficult side-on bouldering clip (`Pexels 7591535`) produced 68 pose frames but only 54/100 quality, no measured
signals, and no cues. The app requested a retake. This is useful negative-path evidence that low-confidence climbing
footage fails closed.

This validates execution, overlay geometry, local persistence, offline behavior, repeat linkage, and fail-closed quality
gating. It does not validate that a generated focus is correct climbing coaching. That still requires the consented,
original-video coach study in the product strategy.
