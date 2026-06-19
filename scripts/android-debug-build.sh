#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
JAVA_HOME="${JAVA_HOME:-$ROOT_DIR/.tools/jdk/Contents/Home}"
ANDROID_HOME="${ANDROID_HOME:-$ROOT_DIR/.tools/android-sdk}"
ANDROID_SDK_ROOT="${ANDROID_SDK_ROOT:-$ANDROID_HOME}"

if [[ ! -x "$JAVA_HOME/bin/java" ]]; then
  echo "Missing local JDK at $JAVA_HOME. Install Temurin 17 or set JAVA_HOME." >&2
  exit 1
fi

if [[ ! -d "$ANDROID_HOME/platforms/android-36" ]]; then
  echo "Missing Android SDK platform android-36 at $ANDROID_HOME. Install the local SDK or set ANDROID_HOME." >&2
  exit 1
fi

export JAVA_HOME ANDROID_HOME ANDROID_SDK_ROOT
export PATH="$JAVA_HOME/bin:$ANDROID_HOME/platform-tools:$ANDROID_HOME/cmdline-tools/latest/bin:$PATH"

cd "$ROOT_DIR/android"
./gradlew :app:assembleDebug

cd "$ROOT_DIR"
node scripts/check_android_manifest.mjs
