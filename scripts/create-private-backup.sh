#!/usr/bin/env bash
set -euo pipefail
umask 077
work=$(mktemp -d)
trap 'rm -rf "$work"' EXIT
export GITHUB_ENV="${GITHUB_ENV:-$work/github-env}"
bash scripts/backup-with-metadata.sh "$work/files"
tar -czf "$work/backup.tar.gz" -C "$work/files" .
run="${GITHUB_RUN_ID:-manual-$(date -u +%Y%m%dT%H%M%SZ)}"
attempt="${GITHUB_RUN_ATTEMPT:-1}"
sha="${GITHUB_SHA:-$(git rev-parse HEAD)}"
node scripts/private-backup.mjs upload "$work/backup.tar.gz" "production/${run}-${attempt}-${sha}.tar.gz.enc"
