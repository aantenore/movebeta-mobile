# Model Delivery Lifecycle Report

Generated: 2026-06-23T22:21:59.767Z

- Status: ready
- Model: MoveNet SinglePose Lightning
- Delivery mode: same-origin-static
- Download strategy: precache-on-install
- Model URL: /models/movenet/singlepose/lightning/4/model.json
- Assets: 3
- Total bytes: 4963342
- Cache ready: no
- Content-addressed cache: yes
- Delivery path verified: yes
- First use requires network: yes
- Update available: no
- Download trigger: The model is vendored during build, then the service worker downloads same-origin model assets on first online install or explicit warmup.
- Update trigger: Model updates ship with a new static deploy; the content-addressed service-worker cache version invalidates old app and model assets.
- Next action: Model delivery path is verified; warm the model cache on each target browser before offline gym use.
- Credential values included: no
- Local paths included: no
- Raw artifacts included: no
- Raw video included: no

| Stage | Status | Detail | Next action |
| --- | --- | --- | --- |
| Build-time vendoring | ready | MoveNet SinglePose Lightning is vendored as same-origin static assets before release. | Refresh assets only when the model version changes. |
| App delivery | ready | The exported app serves /models/movenet/singlepose/lightning/4/model.json and weight shards from the app origin. | Deploy the exported PWA after static asset checks pass. |
| Asset versioning | ready | Service-worker cache versioning is derived from app shell, metadata, exported assets, and static model assets. | Rerun export, PWA check, and web smoke whenever the model graph or weight shards change. |
| First online launch | ready | The exported PWA delivery path verifies service-worker model caching; each installed browser still downloads assets on first online launch or explicit warmup. | Keep web smoke and PWA readiness evidence fresh after model or service-worker changes. |
| Offline reuse | ready | Offline reuse is verified as an app delivery path; each browser must warm and keep model assets cached before offline analysis. | Warm the model cache online on each target browser before offline gym use. |
