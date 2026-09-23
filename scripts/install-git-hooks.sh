#!/bin/sh
# Install repo git hooks into the shared hooks directory (including worktrees).
set -e

common=$(git rev-parse --git-common-dir 2>/dev/null) || exit 0
case "$common" in
  /*) ;;
  *) common="$(pwd)/$common" ;;
esac

mkdir -p "$common/hooks"
cp scripts/pre-push-main-build.sh "$common/hooks/pre-push"
chmod +x "$common/hooks/pre-push" scripts/pre-push-main-build.sh
