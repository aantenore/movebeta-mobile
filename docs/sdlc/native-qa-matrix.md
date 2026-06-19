# Native QA Matrix

| Area | iOS | Android | Acceptance |
| --- | --- | --- | --- |
| Camera permission | Required | Required | Copy matches behavior and denial is recoverable |
| Video recording | Required | Required | Recorded clip is returned, previewed, analyzed, and report is saved |
| Muted recording profile | Required | Required | Recording uses configured quality/bitrate/file-size profile and no microphone permission |
| Video import | Required | Required | Selected video analyzed locally |
| Video metadata | Required | Required | Native bridge returns duration and dimensions for camera/import clips or the app degrades safely |
| Video preview | Required | Required | Selected source plays with native controls and does not block analysis |
| Airplane mode | Required | Required | Analysis still works without network |
| Platform pose adapter | Apple Vision via `movebeta-pose` | ML Kit via `movebeta-pose` | Provider returns normalized frames |
| Android debug build | N/A | Verified locally | `:app:assembleDebug` completes successfully |
| Android merged manifest | N/A | Verified locally | `CAMERA` and `READ_MEDIA_VIDEO` present, `RECORD_AUDIO` absent, `allowBackup=false` |
| iOS Pods | Verified locally with Ruby 3.3.11 and CocoaPods 1.16.2 | N/A | `npm run native:ios:pods` completes and installs `MoveBetaPose` |
| iOS simulator/device build | Blocked until full Xcode is installed | N/A | `npm run native:ios:doctor` reports `ready`, then `npx expo run:ios` or Xcode workspace build completes |
| Latency | iPhone 13+, older supported device | mid-range Android, older supported device | 10s clips <= 8s analysis, 45s clips <= 25s, 60s clips <= 35s |
| Report evidence | Required | Required | Saved report performance fields match the measured device run |
| Thermal/battery | 5 repeated analyses | 5 repeated analyses | Thermal state nominal/fair and battery drop <= 4% per evidence run |
| Deletion | Required | Required | Report removed from local storage |
| Diagnostics | Required | Required | No raw video, landmarks, file URI, or secrets in export |

## Evidence File

Generate the current runbook first:

```bash
npm run native:qa:runbook
```

Then copy either `docs/sdlc/native-qa-runbook.json` → `evidenceDraft` or
`docs/sdlc/native-qa-evidence.template.json` to `docs/sdlc/native-qa-evidence.json`, replace placeholders with real
device results, and run:

```bash
npm run native:qa:validate
```

The Plan tab also shows a Native QA evidence kit and validator preview. It mirrors the CLI validator for ready runs,
placeholder blockers, and raw local artifact rejection, but the CLI remains the release authority.
