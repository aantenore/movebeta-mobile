# Model Download Plan Report

Generated: 2026-07-10T08:48:24.181Z

- Status: action
- Runtime: web
- Network: unknown
- Preference: wifi-only
- Download required: yes
- Offline ready: no
- Cache ready: no
- Update available: no
- Download trigger: First online PWA install, app reload, or Warm model
- Next action: Open the PWA online once or use Warm model to populate the cache.
- Total model bytes: 4963342
- Packaged bytes: 0
- Additional download bytes: 4963342
- Credential values included: no
- Local paths included: no
- Raw artifacts included: no
- Raw video included: no

| Step | Status | Timing | Detail | Action |
| --- | --- | --- | --- | --- |
| Package delivery | ready | During build/export | MoveNet SinglePose Lightning is shipped as same-origin static assets before deployment. | Keep /model-assets.json and listed /models files in the exported static build. |
| Download trigger | ready | First online PWA install, app reload, or Warm model | The model is vendored during build, then the service worker downloads same-origin model assets on first online install or explicit warmup. | Use the configured trigger while online before relying on offline analysis. |
| Cache warmup | action | Before offline use | Cache Storage still needs 3/3 model asset(s). | Warm the model cache while online. |
| Integrity check | ready | After cache warmup | Runtime integrity verification is not available in this environment. | Use browser Web Crypto SHA-256 support when available; otherwise rely on cache presence. |
| Offline use | action | Before the climbing session | Offline analysis depends on cached model assets being available on this device/browser. | Warm the model online, then switch offline and run a local smoke. |
