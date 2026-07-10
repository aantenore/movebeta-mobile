# Android Native Build Dependency Incident

Date: 2026-07-10

## Summary

The Android debug build failed after Expo dependency alignment because permissive peer ranges resolved Reanimated,
Worklets, and Gesture Handler versions newer than the versions bundled for Expo SDK 56. Stale generated CMake and
autolinking output then preserved incompatible native paths across retries.

## Impact

`assembleDebug` could not complete the Reanimated/Worklets Prefab and CMake stages. TypeScript and unit tests remained
green, but no Android artifact could be trusted until the native dependency graph was aligned and regenerated.

## Root Cause

- Expo Router peer ranges allowed incompatible latest native packages to be selected.
- `react-native-worklets@0.9.2` violated the Expo Modules Core compatibility range.
- Generated Android/CMake output still referenced the previous dependency graph.

## Resolution

1. Aligned Expo packages with `npx expo install --fix`.
2. Added explicit Expo SDK 56 versions for Reanimated, Worklets, Gesture Handler, and Masked View.
3. Reinstalled from the lockfile and regenerated Android with a clean Expo prebuild.
4. Exported a deterministic development `NODE_ENV` in the Android build helper.
5. Rebuilt every ABI and validated the merged manifest.

## Verification

`scripts/android-debug-build.sh` completed `:app:assembleDebug` successfully across all configured ABIs and generated
the merged `release` manifest. The production manifest kept camera access, removed broad media, legacy storage, audio,
and overlay permissions contributed by dependencies, and disabled Android backup. Full iOS compilation remains an
external workstation prerequisite because full Xcode is not installed on this machine.
