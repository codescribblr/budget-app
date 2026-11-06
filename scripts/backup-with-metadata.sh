#!/usr/bin/env bash
# Private, temporary application-schema dump. Managed Supabase data is excluded.
set -euo pipefail
script_dir=$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)
umask 077
: "${SUPABASE_DB_URL:?SUPABASE_DB_URL is required}"
output="${1:-database/backups}"
mkdir -p "$output"
timestamp=$(date -u +%Y%m%d_%H%M%S)
backup="$output/backup_$timestamp.sql"
metadata="$output/backup_$timestamp.metadata.json"
errors=$(mktemp)
trap 'rm -f "$errors"' EXIT
# Parse the URL into libpq variables without credential-bearing process arguments.
server=$(python3 "$script_dir/pg-with-url.py" psql -XAt -v ON_ERROR_STOP=1 -c "SELECT current_setting('server_version_num')::integer / 10000;")
client=$(pg_dump --version | sed -E 's/.* ([0-9]+)\..*/\1/')
[[ "$server" == "$client" ]] || { echo 'PostgreSQL client must match server major version' >&2; exit 1; }
if ! python3 "$script_dir/pg-with-url.py" pg_dump --clean --if-exists --no-owner --no-privileges \
  --exclude-schema=auth --exclude-schema=storage --exclude-schema=realtime \
  --exclude-schema=extensions --exclude-schema=graphql_public \
  --exclude-schema=pgbouncer --exclude-schema=pgsodium --exclude-schema=pgsodium_masks \
  --exclude-schema=supabase_functions --exclude-schema=vault \
  > "$backup" 2> "$errors"; then
  rm -f "$backup"
  echo 'Database dump failed; private PostgreSQL output withheld' >&2
  exit 1
fi
export BACKUP_COMMIT="${GITHUB_SHA:-$(git rev-parse HEAD)}"
export BACKUP_RUN="${GITHUB_RUN_ID:-manual}"
python3 - "$backup" "$metadata" <<'METADATA'
import hashlib, json, os, sys
from datetime import datetime, timezone
from pathlib import Path
backup, metadata = map(Path, sys.argv[1:])
data = backup.read_bytes()
if not data: raise SystemExit('Empty database backup')
metadata.write_text(json.dumps({
    'backup_file': backup.name,
    'created_at': datetime.now(timezone.utc).isoformat(),
    'commit_sha': os.environ['BACKUP_COMMIT'],
    'run_id': os.environ['BACKUP_RUN'],
    'sha256_checksum': hashlib.sha256(data).hexdigest(),
    'file_size_bytes': len(data),
    'backup_type': 'pre_migration',
    'scope': 'Application schemas; excludes managed Supabase schemas, object contents, ownership and grants',
}, indent=2))
METADATA
printf 'Application database dump and SHA-256 metadata created privately\n'
