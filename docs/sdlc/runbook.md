# Operational Runbook

## Local Preview

```bash
npm ci
npm run release:check
npm run release:readiness
npm run preview:web
```

Open `http://localhost:8082/`.

## Smoke Procedure

1. Analyze tab shows on-device coach, metrics, cues, and timeline.
2. Sessions tab shows the latest local attempt.
3. Drills tab shows cue-derived drills.
4. Progress tab shows score bars.
5. Privacy tab states no-upload default.
6. Browser console has no errors.

## Common Failures

| Symptom | Likely cause | Action |
| --- | --- | --- |
| Native provider unavailable | Running outside custom native build | Use `local-fixture` or install native adapter |
| Web export fails | Route/import/type error | Run `npm run typecheck`, inspect Expo bundler output |
| Audit fails | High/critical dependency issue | Patch dependency or document temporary exception |
| Launch readiness drift | Configured evidence is true but local artifact/tool is missing | Run `npm run release:readiness`, refresh the artifact, or set the evidence flag false |
| Report has no cues | Thresholds too strict or low-quality landmarks | Review analyzer thresholds and frame data |

## Incident Trigger

Create an incident in `docs/incidents/` for release-blocking failures, privacy exposure, data loss, or repeated regression.
