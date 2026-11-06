#!/usr/bin/env bash
# GitHub Ubuntu runner; no connection URL is printed or included in argv.
set -euo pipefail
script_dir=$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)
: "${SUPABASE_DB_URL:?SUPABASE_DB_URL is required}"
sudo apt-get update -qq
sudo apt-get install -y -qq postgresql-client ca-certificates curl gnupg lsb-release
major=$(python3 "$script_dir/pg-with-url.py" psql -XAt -v ON_ERROR_STOP=1 -c "SELECT current_setting('server_version_num')::integer / 10000;")
[[ "$major" =~ ^[0-9]{2}$ ]] || { echo 'Invalid server version' >&2; exit 1; }
sudo install -d /etc/apt/keyrings
curl -fsSL https://www.postgresql.org/media/keys/ACCC4CF8.asc | sudo gpg --dearmor --yes -o /etc/apt/keyrings/postgresql.gpg
printf 'deb [signed-by=/etc/apt/keyrings/postgresql.gpg] https://apt.postgresql.org/pub/repos/apt %s-pgdg main\n' "$(lsb_release -cs)" | sudo tee /etc/apt/sources.list.d/pgdg.list >/dev/null
sudo apt-get update -qq
sudo apt-get install -y -qq "postgresql-client-$major"
printf '/usr/lib/postgresql/%s/bin\n' "$major" >> "$GITHUB_PATH"
