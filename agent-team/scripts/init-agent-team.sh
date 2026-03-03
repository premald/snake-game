#!/usr/bin/env bash
set -euo pipefail

TARGET_DIR=${1:-"."}

SOURCE_ROOT=$(cd "$(dirname "$0")/.." && pwd)

copy_dir() {
  local src="$1"
  local dest="$2"
  if [[ -e "$dest" ]]; then
    echo "Skip existing: $dest"
    return 0
  fi
  mkdir -p "$(dirname "$dest")"
  cp -R "$src" "$dest"
  echo "Copied: $dest"
}

copy_file() {
  local src="$1"
  local dest="$2"
  if [[ -e "$dest" ]]; then
    echo "Skip existing: $dest"
    return 0
  fi
  mkdir -p "$(dirname "$dest")"
  cp "$src" "$dest"
  echo "Copied: $dest"
}

copy_dir "$SOURCE_ROOT/src" "$TARGET_DIR/src"
copy_dir "$SOURCE_ROOT/config" "$TARGET_DIR/config"
copy_dir "$SOURCE_ROOT/docs" "$TARGET_DIR/docs"
copy_dir "$SOURCE_ROOT/scripts" "$TARGET_DIR/scripts"

copy_file "$SOURCE_ROOT/README.md" "$TARGET_DIR/README.agent-team.md"
copy_file "$SOURCE_ROOT/tsconfig.json" "$TARGET_DIR/tsconfig.agent-team.json"

echo "Agent team bootstrap complete."
