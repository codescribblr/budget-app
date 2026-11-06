#!/usr/bin/env bash
# Exit 0 = pending, 1 = none, 2 = failure. Errors must stop deployment.
set -euo pipefail
script_dir=$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)
trap 'exit 2' ERR
if [[ -z "${SUPABASE_DB_URL:-}" ]]; then
  echo 'SUPABASE_DB_URL is required' >&2
  exit 2
fi
exists=$(python3 "$script_dir/pg-with-url.py" psql -XAt -v ON_ERROR_STOP=1 -c "SELECT to_regclass('public._migrations') IS NOT NULL;")
executed=''
if [[ "$exists" == 't' ]]; then
  executed=$(python3 "$script_dir/pg-with-url.py" psql -XAt -v ON_ERROR_STOP=1 -c 'SELECT migration_name FROM public._migrations;')
elif [[ "$exists" != 'f' ]]; then
  echo 'Unexpected migration status response' >&2
  exit 2
fi
shopt -s nullglob
files=(migrations/*.sql)
if (( ${#files[@]} == 0 )); then
  echo 'No migration files found' >&2
  exit 2
fi
for file in "${files[@]}"; do
  if ! grep -Fxq -- "${file##*/}" <<< "$executed"; then exit 0; fi
done
exit 1
