# Versioning Policy

MoveBeta uses SemVer for the JavaScript package and mobile app version.

## Current Version

- `package.json`: `1.0.0`
- `app.json expo.version`: `1.0.0`
- `ios.buildNumber`: `1`
- `android.versionCode`: starts at `1`; production submission uses EAS `autoIncrement`
- `eas.json cli.appVersionSource`: `remote`

## Rules

- Patch: bug fixes, copy, docs, test-only changes, non-breaking internal improvements.
- Minor: new user-visible workflow or provider capability that preserves existing behavior.
- Major: breaking storage, report schema, consent model, or provider contract changes.

## Mobile Release Rules

- Increment app version for external beta/store submissions.
- Increment native build number for every binary submitted to a store or internal tester track.
- Keep EAS production builds on `autoIncrement` and `appVersionSource=remote`.
- Update `CHANGELOG.md` before tagging or submitting.
- Record any schema migration and rollback notes in the release checklist.

## Prototype Note

The project is versioned as `1.0.0` because it is a packaged prototype artifact. Before a public beta, decide whether to
move to `0.x` pre-release tags or keep `1.x` as internal product versioning.
