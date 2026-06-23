# Model Delivery Lifecycle Report

Generated: 2026-06-23T14:05:01.216Z

- Status: action
- Model: MoveNet SinglePose Lightning
- Delivery mode: same-origin-static
- Model URL: /models/movenet/singlepose/lightning/4/model.json
- Assets: 3
- Total bytes: 4963342
- Cache ready: no
- First use requires network: yes
- Download trigger: The model is vendored during build, then the browser downloads same-origin model assets on first online launch, service-worker install, or explicit warmup.
- Next action: Open the PWA online once or use Warm model before going offline.
- Credential values included: no
- Local paths included: no
- Raw artifacts included: no
- Raw video included: no

| Stage | Status | Detail | Next action |
| --- | --- | --- | --- |
| Build-time vendoring | ready | MoveNet SinglePose Lightning is vendored as same-origin static assets before release. | Refresh assets only when the model version changes. |
| App delivery | ready | The exported app serves /models/movenet/singlepose/lightning/4/model.json and weight shards from the app origin. | Deploy the exported PWA after static asset checks pass. |
| First online launch | action | The browser fetches model-assets.json and listed /models assets on first online launch or explicit warmup. | Open the PWA online once or use Warm model before going offline. |
| Offline reuse | action | Offline analysis should wait until every model asset is cached and integrity checks pass when supported. | Warm and verify the model cache online before offline analysis. |
