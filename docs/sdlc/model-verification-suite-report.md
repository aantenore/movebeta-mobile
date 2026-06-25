# Model Verification Suite Report

Generated: 2026-06-25T07:59:49.266Z

- Status: technical-ready
- Technical ready: yes
- Passed checks: 8/9
- Blocked checks: 0
- External checks: 1
- Providers: web-tfjs-movenet
- Replay attempts: 3/3
- Wall angles: overhang, slab, vertical
- Metrics: flow, foot-cuts, hip-drift, lock-off, pause-time
- Cue outputs: 7
- Next action: npm run validation:cue
- Credential values included: no
- Local paths included: no
- Raw artifacts included: no
- Raw video included: no

| Check | Status | Owner | Command | Detail |
| --- | --- | --- | --- | --- |
| MoveNet runtime budget | pass | engineering | `npm run model:movenet:readiness` | 10ms load, 314ms avg inference, 316ms max inference |
| Model load budget | pass | engineering | `npm run model:movenet:readiness` | 10ms <= 25000ms load budget |
| Inference budget | pass | engineering | `npm run model:movenet:readiness` | 314ms avg and 316ms max inference are inside budget |
| Model-shaped analysis replay | pass | engineering | `npm run model:analysis:replay` | 3/3 model-shaped attempts passed |
| Wall-angle coverage | pass | engineering | `npm run model:analysis:replay` | overhang, slab, vertical |
| Movement metric coverage | pass | engineering | `npm run model:analysis:replay` | flow, foot-cuts, hip-drift, lock-off, pause-time |
| Cue output coverage | pass | engineering | `npm run model:analysis:replay` | 7 cue outputs across 3 replay attempts |
| Privacy boundary | pass | engineering | `npm run model:analysis:replay` | Replay report excludes raw video, local paths, and upload flags. |
| Real climbing validation | external-required | product | `npm run validation:cue` | Collect consented climbing clips, coach review rows, and physical-device evidence before production movement-quality claims. |
