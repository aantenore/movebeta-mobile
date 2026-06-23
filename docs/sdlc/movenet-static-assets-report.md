# MoveNet Static Assets Report

Generated: 2026-06-23T12:25:21.219Z

- Status: ready
- Checks: 7/7
- Model: MoveNet SinglePose Lightning
- Model URL: /models/movenet/singlepose/lightning/4/model.json
- Source assets: 3
- Exported assets: 4
- Weight shards: 2
- Total bytes: 324508
- Credential values included: no
- Local paths included: no
- Raw video included: no
- Next action: Keep static MoveNet assets versioned and rerun web smoke after model updates.

| Check | Status | Detail | Action |
| --- | --- | --- | --- |
| Static asset manifest | verified | Static model asset manifest exists with the expected schema version. | Run npm run model:movenet:assets:download to refresh public/model-assets.json and model files. |
| App model URL | verified | App config points TensorFlow.js MoveNet at /models/movenet/singlepose/lightning/4/model.json. | Keep app.json expo.extra.tfjsMoveNetModelUrl aligned with the static manifest modelUrl. |
| Source model JSON | verified | Source model.json includes a TensorFlow.js weights manifest. | Download a valid TFJS graph model JSON before exporting the PWA. |
| Source weight shards | verified | Source model graph and 2 weight shard(s) are present and non-empty. | Keep every weight shard referenced by model.json present under public/models. |
| Service worker model cache | verified | Service worker pre-caches the static model asset manifest and serves model files cache-first. | Keep public/sw.js loading /model-assets.json and pre-caching listed model files. |
| Exported model assets | verified | Exported dist contains model-assets.json, model.json, and 2 weight shard(s). | Run npm run export:web after refreshing model assets so dist contains the same static model files. |
| Manifest asset list | verified | Static asset manifest lists every model graph and weight shard path. | Keep public/model-assets.json asset list aligned with model.json weight references. |
