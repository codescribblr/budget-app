#!/bin/bash

# Database Migration Runner
# This script runs all SQL migration files against Supabase
#
# Usage:
#   ./scripts/run-migrations.sh
#
# Environment Variables Required:
#   SUPABASE_DB_URL - PostgreSQL connection string
#   Format: postgresql://postgres:[PASSWORD]@[HOST]:5432/postgres

set -e  # Exit on error

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
  echo -e "${RED}❌ Error: SUPABASE_DB_URL environment variable is not set${NC}"
  echo ""
  echo "Get your database URL from Supabase:"
  echo "1. Go to Project Settings > Database"
  echo "2. Copy the 'Connection string' under 'Connection pooling'"
  echo "3. Replace [YOUR-PASSWORD] with your database password"
  echo ""
  echo "Example:"
  echo "export SUPABASE_DB_URL='postgresql://postgres:your-password@db.xxx.supabase.co:5432/postgres'"
  exit 1
fi

echo -e "${BLUE}🚀 Starting database migrations...${NC}\n"

# Create migrations tracking table if it doesn't exist
echo -e "${YELLOW}📊 Creating migrations tracking table...${NC}"
if ! psql "$SUPABASE_DB_URL" -c "
  CREATE TABLE IF NOT EXISTS $MIGRATIONS_TABLE (
    id SERIAL PRIMARY KEY,
    migration_name TEXT NOT NULL UNIQUE,
    executed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  );
" 2>&1; then
  echo -e "${RED}❌ Failed to create migrations table${NC}"
  echo -e "${RED}   Check your SUPABASE_DB_URL and database connection${NC}"
  exit 2
fi

echo -e "${GREEN}✓${NC} Migrations table ready\n"

# Get list of executed migrations
EXECUTED_MIGRATIONS=$(psql "$SUPABASE_DB_URL" -t -c "SELECT migration_name FROM $MIGRATIONS_TABLE ORDER BY migration_name;" 2>/dev/null | tr -d ' ')

# Count executed migrations
EXECUTED_COUNT=$(echo "$EXECUTED_MIGRATIONS" | grep -c . || echo "0")
echo -e "${GREEN}✓${NC} Found $EXECUTED_COUNT previously executed migrations\n"

# Get all migration files
MIGRATION_FILES=$(ls -1 $MIGRATIONS_DIR/*.sql 2>/dev/null | sort)

if [ -z "$MIGRATION_FILES" ]; then
  echo -e "${RED}❌ No migration files found in $MIGRATIONS_DIR/${NC}"
  exit 1
fi

# Count total migrations
TOTAL_COUNT=$(echo "$MIGRATION_FILES" | wc -l | tr -d ' ')
echo -e "${BLUE}📁 Found $TOTAL_COUNT migration files${NC}\n"

# Track pending migrations
PENDING_COUNT=0

# Execute each migration
for MIGRATION_FILE in $MIGRATION_FILES; do
  MIGRATION_NAME=$(basename "$MIGRATION_FILE")
  
  # Check if migration has already been executed
  if echo "$EXECUTED_MIGRATIONS" | grep -q "^$MIGRATION_NAME$"; then
    echo -e "${GREEN}⏭${NC}  Skipping (already executed): $MIGRATION_NAME"
    continue
  fi
  
  PENDING_COUNT=$((PENDING_COUNT + 1))
  
  echo -e "${YELLOW}📝 Running migration: $MIGRATION_NAME${NC}"

  # Execute the migration
  if psql "$SUPABASE_DB_URL" -f "$MIGRATION_FILE" 2>&1; then
    # Record the migration as executed
    if ! psql "$SUPABASE_DB_URL" -c "INSERT INTO $MIGRATIONS_TABLE (migration_name) VALUES ('$MIGRATION_NAME');" 2>&1; then
      echo -e "${RED}❌ Failed to record migration${NC}"
      exit 1
    fi
    echo -e "${GREEN}✅ Migration completed: $MIGRATION_NAME${NC}\n"
  else
    echo -e "${RED}❌ Migration failed: $MIGRATION_NAME${NC}"
    echo -e "${RED}   Check the SQL syntax and database connection${NC}"
    exit 1
  fi
done

# Summary
echo ""
if [ $PENDING_COUNT -eq 0 ]; then
  echo -e "${GREEN}✨ No pending migrations to run${NC}"
else
  echo -e "${GREEN}✅ All $PENDING_COUNT pending migrations completed successfully!${NC}"
fi

