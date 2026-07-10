# iOS Toolchain Setup Packet

Generated: 2026-07-10T08:48:14.102Z

- Status: needs-full-xcode
- Report status: blocked
- Checks ready: 2/6
- Blocked checks: 3
- Next action: Install and select full Xcode, rerun npm run native:ios:doctor, then run an iOS simulator or device build.
- Credential values included: no
- Local paths included: no
- Raw artifacts included: no
- Raw video included: no

## Checks

| Check | Status | Owner | Action | Proof |
| --- | --- | --- | --- | --- |
| Full Xcode installed | blocked | engineering | Install full Xcode from Apple, open it once, accept licenses, then rerun the iOS toolchain doctor. | docs/sdlc/ios-toolchain-report.json reports fullXcode true |
| Developer directory selected | blocked | engineering | Select the full Xcode Developer directory using the standard Xcode selection workflow, then rerun the doctor. | docs/sdlc/ios-toolchain-report.json reports commandLineToolsOnly false |
| iOS workspace present | ready | engineering | Keep the generated iOS workspace present before build verification. | docs/sdlc/ios-toolchain-report.json reports workspaceExists true |
| CocoaPods installed | ready | engineering | Run the local CocoaPods install command until MoveBetaPose is installed. | docs/sdlc/ios-toolchain-report.json reports podsInstalled true |
| Build settings probe | review | engineering | Run the build-settings probe after full Xcode, workspace, and Pods are ready. | docs/sdlc/ios-toolchain-report.json reports buildSettingsProbe pass |
| iOS build log captured | blocked | release | Run an iOS simulator or device build and capture a share-safe build log before physical-device QA. | iOS simulator or device build log |

## Commands

| Command | Owner | Value | Purpose |
| --- | --- | --- | --- |
| Refresh iOS toolchain report | engineering | `npm run native:ios:doctor` | Refresh full-Xcode, workspace, Pods, and build-settings evidence. |
| Refresh iOS Pods | engineering | `npm run native:ios:pods` | Install or repair iOS Pods for the native pose module. |
| Run iOS device build | release | `npx expo run:ios --device` | Verify the native app shell and local analysis on iOS after full Xcode is ready. |
