# Real-Video MoveNet Smoke Evidence

Date: 2026-07-10

## Fixture

- Source: TensorFlow.js pose-detection repository test data, `pose_1.mp4`.
- Local-only test copy: not committed.
- SHA-256: `a581dd3c6495c4257a8f7756c6c59b445e8949eec0bc2637ba5283bfa7d71930`.

## Execution

The exported PWA was opened in Chromium, the clip was selected through the same browser file-picker path used by the
product, and analysis was started explicitly after metadata entry. The shipped same-origin MoveNet SinglePose Lightning
graph processed 12 frames.

## Result

- Analysis quality: 86/100.
- Flow, pause time, bent-arm load, hip drift, and foot-cut metrics: measured.
- Persisted provider: `web-tfjs-movenet`.
- Persisted pose model: `movenet-singlepose-lightning-v4`.
- Persisted cue engine: `movebeta-cue-engine-v2.0.0`.
- Persisted video URI or `blob:` reference: none.
- Desktop, 320 px mobile, PWA offline boot, and model-cache checks: pass.

This is execution and integration evidence, not validation of climbing-coaching accuracy. Accuracy still requires the
versioned consented climbing dataset and coach-review gate described in the validation plan.
