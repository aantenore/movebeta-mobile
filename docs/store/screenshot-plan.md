# Screenshot Plan

Source of truth: `docs/store/store-manifest.json`, generated with `npm run store:manifest`.

Generate screenshots from the exported web build:

```bash
npm run export:web
npm run preview:web
MOVEBETA_SMOKE_URL=http://127.0.0.1:8082 npm run store:screenshots
```

## Required Screenshots

| File | View | Purpose |
| --- | --- | --- |
| `docs/store/screenshots/01-analyze.png` | Analyze | Shows on-device coach, capture setup, clip readiness, quality, cues, and timeline. |
| `docs/store/screenshots/02-drills.png` | Drills | Shows evidence-based weekly training plan and coach pack preview. |
| `docs/store/screenshots/03-progress.png` | Progress | Shows technique trend and attempt comparison. |
| `docs/store/screenshots/04-sessions.png` | Sessions | Shows local report history and coach packet action. |
| `docs/store/screenshots/05-privacy.png` | Privacy | Shows no-upload default, offline readiness, and diagnostics controls. |

## Review Rules

- Screenshots must not show raw video, real third-party faces, or personal identifiers.
- Screenshots must match the current app navigation and store copy.
- Privacy screenshot must show the no-upload default behavior.
