#!/usr/bin/env bash
# One database connection holds the advisory lock for the complete migration phase.
set -euo pipefail
script_dir=$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)
exec python3 "$script_dir/migration-runner.py" "$@"
