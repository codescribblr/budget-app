#!/bin/bash

# Check for Pending Migrations
# Returns exit code 0 if there are pending migrations, 1 if none
#
# Usage:
#   ./scripts/check-pending-migrations.sh
#
# Environment Variables Required:
#   SUPABASE_DB_URL - PostgreSQL connection string

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
MIGRATIONS_DIR="migrations"
MIGRATIONS_TABLE="_migrations"

# Validate environment variables
if [ -z "$SUPABASE_DB_URL" ]; then
  echo -e "${RED}❌ Error: SUPABASE_DB_URL environment variable is not set${NC}" >&2
  exit 1
fi

# Create migrations tracking table if it doesn't exist (silently)
psql "$SUPABASE_DB_URL" -c "
  CREATE TABLE IF NOT EXISTS $MIGRATIONS_TABLE (
    id SERIAL PRIMARY KEY,
    migration_name TEXT NOT NULL UNIQUE,
    executed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  );
" >/dev/null 2>&1 || true

# Get list of executed migrations
EXECUTED_MIGRATIONS=$(psql "$SUPABASE_DB_URL" -t -c "SELECT migration_name FROM $MIGRATIONS_TABLE ORDER BY migration_name;" 2>/dev/null | tr -d ' ' || echo "")

# Get all migration files
MIGRATION_FILES=$(ls -1 $MIGRATIONS_DIR/*.sql 2>/dev/null | sort || echo "")

if [ -z "$MIGRATION_FILES" ]; then
  # No migration files found
  exit 1
fi

# Check for pending migrations
PENDING_COUNT=0
for MIGRATION_FILE in $MIGRATION_FILES; do
  MIGRATION_NAME=$(basename "$MIGRATION_FILE")
  
  # Check if migration has already been executed
  if ! echo "$EXECUTED_MIGRATIONS" | grep -q "^$MIGRATION_NAME$"; then
    PENDING_COUNT=$((PENDING_COUNT + 1))
  fi
done

# Exit with 0 if there are pending migrations, 1 if none
if [ $PENDING_COUNT -gt 0 ]; then
  exit 0
else
  exit 1
fi


