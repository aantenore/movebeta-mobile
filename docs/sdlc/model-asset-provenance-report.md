# Model Asset Provenance Report

Generated: 2026-06-25T08:27:16.302Z

- Status: review
- Checks: 5/6 verified
- Review checks: 1
- Blocked checks: 0
- Model: MoveNet SinglePose Lightning
- Source provider: TensorFlow Hub
- Source model URL: https://tfhub.dev/google/tfjs-model/movenet/singlepose/lightning/4/model.json?tfjs-format=file
- Files: 3
- Total bytes: 4963342
- Credential values included: no
- Local paths included: no
- Raw video included: no
- Next action: Review upstream model terms before commercial distribution and keep the attribution notice in release evidence.

| Check | Status | Detail | Action |
| --- | --- | --- | --- |
| Manifest schema | verified | Static model asset manifest uses the expected schema. | Run npm run model:movenet:assets:download before provenance review. |
| Official source URL | verified | Manifest source URLs point to the TensorFlow Hub MoveNet SinglePose Lightning model path. | Keep MoveNet source URLs pinned to the official TensorFlow Hub model path. |
| Asset inventory | verified | Manifest lists 3 same-origin model asset file(s). | Keep model asset paths same-origin under /models and aligned with the file inventory. |
| Hash integrity | verified | Every model file exists locally and matches its recorded SHA-256 digest. | Regenerate public/model-assets.json whenever a model graph or shard changes. |
| Attribution notice | verified | Attribution notice names the model, source, manifest, and provenance refresh command. | Keep docs/sdlc/model-asset-attribution.md with release evidence and shipped documentation. |
| License review | review | The doctor tracks provenance and attribution evidence, but it does not infer final commercial legal clearance from the downloaded files. | Review upstream model terms from the source catalog before commercial distribution. |
