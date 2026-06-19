#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
TOOLS_DIR="$ROOT_DIR/.tools"
SRC_DIR="$TOOLS_DIR/src"
RUBY_VERSION="${RUBY_VERSION:-3.3.11}"
RUBY_PREFIX="$TOOLS_DIR/ruby-$RUBY_VERSION"
LIBYAML_PREFIX="$TOOLS_DIR/libyaml-0.2.5"
RUBY_BUILD_DIR="$TOOLS_DIR/ruby-build"

mkdir -p "$SRC_DIR"

if [[ ! -d "$RUBY_BUILD_DIR/.git" ]]; then
  rm -rf "$RUBY_BUILD_DIR"
  git clone --depth 1 https://github.com/rbenv/ruby-build.git "$RUBY_BUILD_DIR"
fi

if [[ ! -f "$LIBYAML_PREFIX/include/yaml.h" ]]; then
  curl -L -o "$SRC_DIR/libyaml-0.2.5.tar.gz" https://pyyaml.org/download/libyaml/yaml-0.2.5.tar.gz
  rm -rf "$SRC_DIR/yaml-0.2.5"
  tar -xzf "$SRC_DIR/libyaml-0.2.5.tar.gz" -C "$SRC_DIR"
  (
    cd "$SRC_DIR/yaml-0.2.5"
    ./configure --prefix="$LIBYAML_PREFIX"
    make -j "$(sysctl -n hw.ncpu 2>/dev/null || echo 4)"
    make install
  )
fi

if [[ ! -x "$RUBY_PREFIX/bin/ruby" ]]; then
  RUBY_BUILD_CACHE_PATH="$SRC_DIR" \
  RUBY_CONFIGURE_OPTS="--with-libyaml-dir=$LIBYAML_PREFIX" \
  "$RUBY_BUILD_DIR/bin/ruby-build" "$RUBY_VERSION" "$RUBY_PREFIX"
fi

"$RUBY_PREFIX/bin/gem" install cocoapods -v 1.16.2 --no-document
"$RUBY_PREFIX/bin/pod" --version
