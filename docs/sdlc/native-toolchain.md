# Native Toolchain

## Android

Local Android verification uses project-local tooling:

- Temurin 17 JDK in `.tools/jdk`.
- Android SDK in `.tools/android-sdk`.
- Android platform 36, build tools 36.0.0, NDK 27.1.12297006, and CMake 3.22.1.

Run:

```bash
npm run native:android:debug
```

The debug APK is generated at:

```text
android/app/build/outputs/apk/debug/app-debug.apk
```

## iOS

Local iOS Pods verification uses a project-local Ruby/CocoaPods toolchain:

- Ruby 3.3.11 in `.tools/ruby-3.3.11`.
- libyaml 0.2.5 in `.tools/libyaml-0.2.5`.
- CocoaPods 1.16.2 installed into the local Ruby gem path.

Bootstrap or repair the local Ruby/CocoaPods toolchain with:

```bash
npm run toolchain:ios
```

Install Pods with:

```bash
npm run native:ios:pods
```

Generate the machine-readable iOS readiness report with:

```bash
npm run native:ios:doctor
```

The doctor writes `docs/sdlc/ios-toolchain-report.json` and `docs/sdlc/ios-toolchain-report.md`. It reports selected
Developer directory, full Xcode availability, workspace presence, Pods state, and whether `xcodebuild` can load the
MoveBeta workspace build settings. The command exits successfully even when the report status is `blocked`, so release
automation can keep a durable blocker artifact.

Full iOS compilation still requires Xcode, not just Command Line Tools. After Xcode is installed, run:

```bash
npx expo run:ios
```

or open:

```text
ios/MoveBeta.xcworkspace
```
