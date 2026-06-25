# Web Smoke Report

Generated: 2026-06-25T09:21:47.476Z

- Status: pass
- Target: http://127.0.0.1:8083/
- Mode: local-static-dist
- Command: `MOVEBETA_SMOKE_URL=http://127.0.0.1:8083/ python3 scripts/smoke_web_video.py`
- Duration: 11911ms
- Checks: 4/4
- Next action: Keep the exported PWA smoke report fresh after UI, PWA, model-delivery, or release-evidence changes.
- Credential values included: no
- Local paths included: no
- Raw artifacts included: no
- Raw video included: no

| Check | Status | Detail |
| --- | --- | --- |
| Playwright exported-bundle smoke | pass | Runs the exported bundle in Playwright against the selected smoke URL. |
| Responsive release UI | pass | Covers mobile and desktop release workflows asserted by scripts/smoke_web_video.py. |
| PWA offline model cache | pass | Covers installable PWA, service worker, offline boot, and static model cache checks. |
| Report-derived expectations | pass | Uses SDLC report-derived counts for launch, feature, model, and PWA expectations. |
