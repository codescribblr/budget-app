#!/usr/bin/env bash
set -euo pipefail
umask 077
work=$(mktemp -d)
trap 'rm -rf "$work"' EXIT
export GITHUB_ENV="${GITHUB_ENV:-$work/github-env}"
bash scripts/backup-with-metadata.sh "$work/files"
python3 - "$work/files" "$work/backup.tar.gz" <<'PACK'
from pathlib import Path
import sys, tarfile
with tarfile.open(sys.argv[2], 'w:gz') as archive:
    for path in sorted(Path(sys.argv[1]).iterdir()):
        archive.add(path, arcname=path.name, recursive=False)
PACK
# Prove this exact archive is recoverable before it can gate a migration.
python3 scripts/extract-private-backup.py "$work/backup.tar.gz" "$work/checked"
run="${GITHUB_RUN_ID:-manual-$(date -u +%Y%m%dT%H%M%SZ)}"
attempt="${GITHUB_RUN_ATTEMPT:-1}"
sha="${GITHUB_SHA:-$(git rev-parse HEAD)}"
node scripts/private-backup.mjs upload "$work/backup.tar.gz" "production/${run}-${attempt}-${sha}.tar.gz.enc"
