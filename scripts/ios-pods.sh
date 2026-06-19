#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
LOCAL_RUBY="$ROOT_DIR/.tools/ruby-3.3.11/bin"

if [[ -x "$LOCAL_RUBY/ruby" ]]; then
  export PATH="$LOCAL_RUBY:$PATH"
fi

if ! command -v pod >/dev/null 2>&1; then
  echo "Missing CocoaPods. Install it with the local Ruby: gem install cocoapods -v 1.16.2" >&2
  exit 1
fi

cd "$ROOT_DIR/ios"
pod install
