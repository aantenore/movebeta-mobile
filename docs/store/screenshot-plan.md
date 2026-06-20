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
| `docs/store/screenshots/03-progress.png` | Progress | Shows technique trend, repeat outcomes, and attempt comparison. |
| `docs/store/screenshots/04-sessions.png` | Sessions | Shows local report history and coach packet action. |
| `docs/store/screenshots/05-plan.png` | Plan | Shows freemium tier catalog, upgrade path, and capability matrix. |
| `docs/store/screenshots/06-privacy.png` | Privacy | Shows no-upload default, offline readiness, and diagnostics controls. |
| `docs/store/screenshots/07-release-unblock.png` | Plan | Shows release blockers, proof artifacts, commands, owners, and credential key names. |
| `docs/store/screenshots/08-data-portability.png` | Privacy | Shows checksum-aware local backup restore preview before storage is mutated. |
| `docs/store/screenshots/09-release-critical-path.png` | Plan | Shows release critical path lanes, dependencies, commands, and proof artifacts. |
| `docs/store/screenshots/10-release-evidence-scenarios.png` | Plan | Shows evidence scenarios, projected launch tracks, cleared blockers, and missing prerequisites. |
| `docs/store/screenshots/11-release-freshness.png` | Plan | Shows release evidence freshness, report ages, stale counts, and refresh commands. |

## Review Rules

- Screenshots must not show raw video, real third-party faces, or personal identifiers.
- Screenshots must match the current app navigation and store copy.
- Privacy screenshot must show the no-upload default behavior.
- `docs/screenshots.md` must reference the generated files so the repository documentation includes a visual gallery.
