# Web Smoke Report

Generated: 2026-07-10T08:48:32.996Z

- Status: pass
- Target: http://127.0.0.1:8083/
- Mode: local-static-dist
- Command: `MOVEBETA_SMOKE_URL=http://127.0.0.1:8083/ python3 scripts/smoke_web_video.py`
- Duration: 8431ms
- Checks: 4/4
- Next action: Keep the exported PWA smoke report fresh after UI, PWA, model-delivery, or release-evidence changes.
- Credential values included: no
- Local paths included: no
- Raw artifacts included: no
- Raw video included: no
- Real-video inference: pass (12 frames, quality 86/100)

| Check | Status | Detail |
| --- | --- | --- |
| Playwright exported-bundle smoke | pass | Runs the exported bundle in Playwright against the selected smoke URL. |
| Responsive release UI | pass | Covers mobile and desktop release workflows asserted by scripts/smoke_web_video.py. |
| PWA offline model cache | pass | Covers installable PWA, service worker, offline boot, and static model cache checks. |
| Current product contracts | pass | Verifies fail-closed video controls, transient demos, free-plan gates, and local history boundaries. |
