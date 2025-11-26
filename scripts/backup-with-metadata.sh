#!/bin/bash

# Database Backup with Metadata
# Creates a backup with deployment metadata (commit SHA, timestamp, etc.)
# Designed for use in CI/CD pipelines
#
# Usage:
#   ./scripts/backup-with-metadata.sh [output_dir]
#
# Environment Variables Required:
#   SUPABASE_DB_URL - PostgreSQL connection string
#   GITHUB_SHA - Git commit SHA (optional, for CI/CD)
#   GITHUB_RUN_ID - GitHub Actions run ID (optional)
#   GITHUB_REF - Git ref (optional)

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
OUTPUT_DIR="${1:-database/backups}"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_FILE="${OUTPUT_DIR}/backup_${TIMESTAMP}.sql"
METADATA_FILE="${OUTPUT_DIR}/backup_${TIMESTAMP}.metadata.json"

echo -e "${BLUE}🗄️  Creating database backup with metadata...${NC}\n"

# Validate environment variables
if [ -z "$SUPABASE_DB_URL" ]; then
  echo -e "${RED}❌ Error: SUPABASE_DB_URL environment variable is not set${NC}"
  exit 1
fi

# Create output directory if it doesn't exist
mkdir -p "$OUTPUT_DIR"

# Get commit information
COMMIT_SHA="${GITHUB_SHA:-$(git rev-parse HEAD 2>/dev/null || echo 'unknown')}"
COMMIT_SHORT="${COMMIT_SHA:0:7}"
RUN_ID="${GITHUB_RUN_ID:-unknown}"
GIT_REF="${GITHUB_REF:-$(git rev-parse --abbrev-ref HEAD 2>/dev/null || echo 'unknown')}"
BRANCH="${GIT_REF#refs/heads/}"

# Get list of pending migrations (if any)
PENDING_MIGRATIONS=""
if command -v psql >/dev/null 2>&1; then
  # Try to get pending migrations
  MIGRATIONS_TABLE="_migrations"
  EXECUTED_MIGRATIONS=$(psql "$SUPABASE_DB_URL" -t -c "SELECT migration_name FROM $MIGRATIONS_TABLE ORDER BY migration_name;" 2>/dev/null | tr -d ' ' || echo "")
  
  if [ -d "migrations" ]; then
    for MIGRATION_FILE in migrations/*.sql; do
      if [ -f "$MIGRATION_FILE" ]; then
        MIGRATION_NAME=$(basename "$MIGRATION_FILE")
        if ! echo "$EXECUTED_MIGRATIONS" | grep -q "^$MIGRATION_NAME$"; then
          if [ -z "$PENDING_MIGRATIONS" ]; then
            PENDING_MIGRATIONS="$MIGRATION_NAME"
          else
            PENDING_MIGRATIONS="$PENDING_MIGRATIONS, $MIGRATION_NAME"
          fi
        fi
      fi
    done
  fi
fi

echo -e "${YELLOW}📦 Creating backup...${NC}"
echo -e "   Backup file: ${BACKUP_FILE}"
echo -e "   Commit: ${COMMIT_SHORT}"
echo -e "   Branch: ${BRANCH}"
if [ -n "$PENDING_MIGRATIONS" ]; then
  echo -e "   Pending migrations: ${PENDING_MIGRATIONS}"
fi
echo ""

# Detect server version and find matching pg_dump binary
PG_DUMP_CMD="pg_dump"
SERVER_VERSION=""

# Try to detect server version by querying the database
if command -v psql >/dev/null 2>&1 && [ -n "$SUPABASE_DB_URL" ]; then
  SERVER_VERSION=$(psql "$SUPABASE_DB_URL" -t -c "SELECT substring(version() from 'PostgreSQL ([0-9]+)')" 2>/dev/null | tr -d ' ' || echo "")
  if [ -n "$SERVER_VERSION" ]; then
    echo -e "${BLUE}🔍 Detected PostgreSQL server version: $SERVER_VERSION${NC}"
  fi
fi

# Find pg_dump binary matching server version, or fallback to available versions
if [ -n "$SERVER_VERSION" ]; then
  # Try to use the matching version
  if command -v "pg_dump-$SERVER_VERSION" >/dev/null 2>&1; then
    PG_DUMP_CMD="pg_dump-$SERVER_VERSION"
  elif [ -f "/usr/lib/postgresql/$SERVER_VERSION/bin/pg_dump" ]; then
    PG_DUMP_CMD="/usr/lib/postgresql/$SERVER_VERSION/bin/pg_dump"
  fi
fi

# Fallback to checking available versions in order (newest first)
if [ "$PG_DUMP_CMD" = "pg_dump" ]; then
  for VERSION in 17 16 15 14 13; do
    if command -v "pg_dump-$VERSION" >/dev/null 2>&1; then
      PG_DUMP_CMD="pg_dump-$VERSION"
      break
    elif [ -f "/usr/lib/postgresql/$VERSION/bin/pg_dump" ]; then
      PG_DUMP_CMD="/usr/lib/postgresql/$VERSION/bin/pg_dump"
      break
    fi
  done
fi

# Verify pg_dump version
if command -v "$PG_DUMP_CMD" >/dev/null 2>&1 || [ -f "$PG_DUMP_CMD" ]; then
  echo -e "${BLUE}Using: $($PG_DUMP_CMD --version 2>/dev/null || echo 'unknown version')${NC}"
else
  echo -e "${YELLOW}⚠️  Warning: Could not find pg_dump, using default${NC}"
fi

# Create the backup using pg_dump
ERROR_OUTPUT=$(mktemp)
if $PG_DUMP_CMD "$SUPABASE_DB_URL" \
  --clean \
  --if-exists \
  --no-owner \
  --no-privileges \
  --exclude-schema=auth \
  --exclude-schema=storage \
  --exclude-schema=realtime \
  --exclude-schema=extensions \
  --exclude-schema=graphql_public \
  --exclude-schema=pgbouncer \
  --exclude-schema=pgsodium \
  --exclude-schema=pgsodium_masks \
  --exclude-schema=supabase_functions \
  --exclude-schema=vault \
  > "$BACKUP_FILE" 2>"$ERROR_OUTPUT"; then
  
  # Get file size
  FILE_SIZE=$(du -h "$BACKUP_FILE" | cut -f1)
  FILE_SIZE_BYTES=$(stat -f%z "$BACKUP_FILE" 2>/dev/null || stat -c%s "$BACKUP_FILE" 2>/dev/null || echo "0")
  
  # Calculate checksums for verification
  SHA256_CHECKSUM=$(sha256sum "$BACKUP_FILE" 2>/dev/null | cut -d' ' -f1 || shasum -a 256 "$BACKUP_FILE" 2>/dev/null | cut -d' ' -f1 || echo "")
  MD5_CHECKSUM=$(md5sum "$BACKUP_FILE" 2>/dev/null | cut -d' ' -f1 || md5 "$BACKUP_FILE" 2>/dev/null | cut -d' ' -f4 || echo "")
  
  # Get database statistics for verification
  TABLE_COUNT=""
  ROW_COUNT=""
  if command -v psql >/dev/null 2>&1 && [ -n "$SUPABASE_DB_URL" ]; then
    # Count tables (excluding system schemas)
    TABLE_COUNT=$(psql "$SUPABASE_DB_URL" -t -c "
      SELECT COUNT(*) 
      FROM information_schema.tables 
      WHERE table_schema NOT IN ('pg_catalog', 'information_schema', 'auth', 'storage', 'realtime', 'extensions', 'graphql_public', 'pgbouncer', 'pgsodium', 'pgsodium_masks', 'supabase_functions', 'vault')
    " 2>/dev/null | tr -d ' ' || echo "")
    
    # Get approximate row count (sum of table sizes)
    ROW_COUNT=$(psql "$SUPABASE_DB_URL" -t -c "
      SELECT COALESCE(SUM(n_live_tup), 0)::bigint
      FROM pg_stat_user_tables
    " 2>/dev/null | tr -d ' ' || echo "")
  fi
  
  # Create metadata JSON
  cat > "$METADATA_FILE" <<EOF
{
  "backup_file": "$(basename "$BACKUP_FILE")",
  "timestamp": "$TIMESTAMP",
  "created_at": "$(date -u +"%Y-%m-%dT%H:%M:%SZ")",
  "commit_sha": "$COMMIT_SHA",
  "commit_short": "$COMMIT_SHORT",
  "branch": "$BRANCH",
  "git_ref": "$GIT_REF",
  "run_id": "$RUN_ID",
  "file_size": "$FILE_SIZE",
  "file_size_bytes": "$FILE_SIZE_BYTES",
  "sha256_checksum": "$SHA256_CHECKSUM",
  "md5_checksum": "$MD5_CHECKSUM",
  "table_count": "$TABLE_COUNT",
  "row_count": "$ROW_COUNT",
  "pending_migrations": "$PENDING_MIGRATIONS",
  "backup_type": "pre_migration",
  "pg_dump_version": "$($PG_DUMP_CMD --version 2>/dev/null || echo 'unknown')"
}
EOF
  
  echo -e "${GREEN}✅ Backup completed successfully!${NC}"
  echo ""
  echo -e "   📁 File: ${BACKUP_FILE}"
  echo -e "   📄 Metadata: ${METADATA_FILE}"
  echo -e "   📊 Size: ${FILE_SIZE}"
  echo ""
  echo -e "   Commit: ${COMMIT_SHORT}"
  echo -e "   Branch: ${BRANCH}"
  if [ -n "$PENDING_MIGRATIONS" ]; then
    echo -e "   Pending migrations: ${PENDING_MIGRATIONS}"
  fi
  echo ""
  
  # Output backup file path for use in CI/CD
  echo "BACKUP_FILE=${BACKUP_FILE}" >> "$GITHUB_ENV" 2>/dev/null || true
  echo "METADATA_FILE=${METADATA_FILE}" >> "$GITHUB_ENV" 2>/dev/null || true
  
else
  echo -e "${RED}❌ Backup failed${NC}"
  
  # Always show error details for debugging
  echo -e "${YELLOW}Error details:${NC}"
  cat "$ERROR_OUTPUT"
  echo ""
  
  # Check for version mismatch error
  if grep -qi "server version mismatch\|version mismatch" "$ERROR_OUTPUT"; then
    echo -e "${YELLOW}   Error: PostgreSQL version mismatch detected${NC}"
    echo -e "${BLUE}   Client version: $($PG_DUMP_CMD --version 2>/dev/null || echo 'unknown')${NC}"
    echo -e "${BLUE}   This usually means the pg_dump client version doesn't match the server version${NC}"
  else
    echo -e "${RED}   Check your SUPABASE_DB_URL and database connection${NC}"
  fi
  
  # Remove empty backup file if it was created
  if [ -f "$BACKUP_FILE" ] && [ ! -s "$BACKUP_FILE" ]; then
    rm "$BACKUP_FILE"
  fi
  
  rm -f "$ERROR_OUTPUT"
  exit 1
fi

rm -f "$ERROR_OUTPUT"


