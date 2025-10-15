#!/bin/bash

# Force Migration Script
# This script will run ALL migrations regardless of tracking table
# Use this if migrations didn't run properly the first time
#
# Usage:
#   ./scripts/force-migrate.sh
#
# Environment Variables Required:
#   SUPABASE_DB_URL - PostgreSQL connection string

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

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

echo -e "${BLUE}🚀 Force running all migrations...${NC}\n"

# Create migrations tracking table
echo -e "${YELLOW}📊 Creating migrations tracking table...${NC}"
psql "$SUPABASE_DB_URL" -c "
  CREATE TABLE IF NOT EXISTS _migrations (
    id SERIAL PRIMARY KEY,
    migration_name TEXT NOT NULL UNIQUE,
    executed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  );
" 2>&1

echo -e "${GREEN}✓${NC} Migrations table ready\n"

# Get list of migration files
MIGRATION_FILES=$(ls -1 migrations/*.sql 2>/dev/null | sort)

if [ -z "$MIGRATION_FILES" ]; then
  echo -e "${RED}❌ No migration files found in migrations/${NC}"
  exit 1
fi

# Count total migrations
TOTAL_COUNT=$(echo "$MIGRATION_FILES" | wc -l | tr -d ' ')
echo -e "${BLUE}📁 Found $TOTAL_COUNT migration files${NC}\n"

# Execute each migration
for MIGRATION_FILE in $MIGRATION_FILES; do
  MIGRATION_NAME=$(basename "$MIGRATION_FILE")
  
  echo -e "${YELLOW}📝 Running migration: $MIGRATION_NAME${NC}"

  # Execute the migration
  if psql "$SUPABASE_DB_URL" -f "$MIGRATION_FILE" 2>&1; then
    # Record the migration as executed (ignore if already exists)
    psql "$SUPABASE_DB_URL" -c "
      INSERT INTO _migrations (migration_name) 
      VALUES ('$MIGRATION_NAME')
      ON CONFLICT (migration_name) DO NOTHING;
    " 2>&1 > /dev/null
    echo -e "${GREEN}✅ Migration completed: $MIGRATION_NAME${NC}\n"
  else
    echo -e "${RED}❌ Migration failed: $MIGRATION_NAME${NC}"
    echo -e "${RED}   Check the SQL syntax and database connection${NC}"
    exit 1
  fi
done

# Reload PostgREST schema cache
echo ""
echo -e "${YELLOW}🔄 Reloading PostgREST schema cache...${NC}"
if psql "$SUPABASE_DB_URL" -c "NOTIFY pgrst, 'reload schema';" 2>&1; then
  echo -e "${GREEN}✅ Schema cache reloaded${NC}"
else
  echo -e "${YELLOW}⚠️  Could not reload schema cache${NC}"
  echo -e "${YELLOW}   Reload manually via Supabase Dashboard: Settings → API → Reload Schema${NC}"
fi

echo ""
echo -e "${GREEN}✅ All $TOTAL_COUNT migrations completed successfully!${NC}"
echo ""
echo -e "${BLUE}📊 Verifying schema...${NC}"

# Verify categories table
echo ""
echo -e "${YELLOW}Categories table columns:${NC}"
psql "$SUPABASE_DB_URL" -c "
  SELECT column_name, data_type, is_nullable, column_default 
  FROM information_schema.columns 
  WHERE table_schema = 'public' 
    AND table_name = 'categories' 
  ORDER BY ordinal_position;
" 2>/dev/null || echo "Table not found"

# Verify accounts table
echo ""
echo -e "${YELLOW}Accounts table columns:${NC}"
psql "$SUPABASE_DB_URL" -c "
  SELECT column_name, data_type, is_nullable, column_default 
  FROM information_schema.columns 
  WHERE table_schema = 'public' 
    AND table_name = 'accounts' 
  ORDER BY ordinal_position;
" 2>/dev/null || echo "Table not found"

echo ""
echo -e "${GREEN}✨ Done! Schema should now be up to date.${NC}"
echo -e "${YELLOW}⚠️  Remember to reload schema cache in Supabase Dashboard if needed${NC}"

