# iOS Toolchain Report

Generated: 2026-06-20T01:16:37.539Z

- Status: blocked
- Developer path: /Library/Developer/CommandLineTools
- Next action: Install full Xcode from Apple, open it once, accept licenses, then select its Developer directory.

| Check | Status | Detail | Action |
| --- | --- | --- | --- |
| Developer directory | pass | /Library/Developer/CommandLineTools | Install Xcode and select it with sudo xcode-select -s /Applications/Xcode.app/Contents/Developer. |
| Full Xcode | fail | Only Command Line Tools are selected; iOS simulator/device builds require full Xcode. | Install full Xcode from Apple, open it once, accept licenses, then select its Developer directory. |
| xcodebuild availability | fail | Command failed: xcodebuild -version xcode-select: error: tool 'xcodebuild' requires Xcode, but active developer directory '/Library/Developer/CommandLineTools' is a command line tools instance  | Run xcodebuild -version after installing Xcode. |
| iOS workspace | pass | ios/MoveBeta.xcworkspace exists. | Run npx expo prebuild --platform ios or npm run native:ios:pods to regenerate the workspace. |
| CocoaPods install | pass | Pods are installed and include MoveBetaPose. | Run npm run native:ios:pods. |
| Build settings probe | warn | Skipped until full Xcode, workspace, and pods are all ready. | Run xcodebuild -workspace ios/MoveBeta.xcworkspace -scheme MoveBeta -configuration Debug -sdk iphonesimulator -showBuildSettings. |
