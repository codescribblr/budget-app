#!/bin/bash

# Verify Migration Status
# Checks if a migration was correctly executed by verifying expected database changes
#
# Usage:
#   ./scripts/verify-migration-status.sh [migration_name]
#
# If no migration name is provided, checks all recorded migrations
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
MIGRATIONS_TABLE="_migrations"
MIGRATION_NAME="${1:-}"

# Validate environment variables
if [ -z "$SUPABASE_DB_URL" ]; then
  echo -e "${RED}❌ Error: SUPABASE_DB_URL environment variable is not set${NC}" >&2
  exit 1
fi

echo -e "${BLUE}🔍 Verifying migration status...${NC}\n"

# Function to verify migration 085
verify_migration_085() {
  echo -e "${YELLOW}Checking migration: 085_migrate_user_groups_to_recommendations.sql${NC}"
  
  # Check if merchant_recommendations table exists
  TABLE_EXISTS=$(psql "$SUPABASE_DB_URL" -t -c "
    SELECT EXISTS (
      SELECT FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name = 'merchant_recommendations'
    );
  " 2>/dev/null | tr -d ' ' || echo "false")
  
  if [ "$TABLE_EXISTS" != "t" ]; then
    echo -e "${RED}  ❌ merchant_recommendations table does not exist${NC}"
    echo -e "${RED}     Migration 084 may not have run successfully${NC}"
    return 1
  fi
  
  # Check if there are any recommendations
  REC_COUNT=$(psql "$SUPABASE_DB_URL" -t -c "
    SELECT COUNT(*) FROM merchant_recommendations;
  " 2>/dev/null | tr -d ' ' || echo "0")
  
  # Check if there are any user groups that should have been migrated
  USER_GROUP_COUNT=$(psql "$SUPABASE_DB_URL" -t -c "
    SELECT COUNT(*) FROM merchant_groups 
    WHERE global_merchant_id IS NULL;
  " 2>/dev/null | tr -d ' ' || echo "0")
  
  echo -e "  Found $REC_COUNT recommendations"
  echo -e "  Found $USER_GROUP_COUNT unmigrated user groups"
  
  if [ "$REC_COUNT" -eq "0" ] && [ "$USER_GROUP_COUNT" -gt "0" ]; then
    echo -e "${YELLOW}  ⚠️  Warning: Migration may not have run successfully${NC}"
    echo -e "${YELLOW}     There are user groups that should have been migrated${NC}"
    return 1
  else
    echo -e "${GREEN}  ✅ Migration appears to have run successfully${NC}"
    return 0
  fi
}

# Function to list all recorded migrations
list_recorded_migrations() {
  echo -e "${BLUE}📋 Recorded migrations:${NC}\n"
  
  psql "$SUPABASE_DB_URL" -c "
    SELECT 
      migration_name,
      executed_at,
      id
    FROM $MIGRATIONS_TABLE
    ORDER BY executed_at DESC;
  " 2>&1 || {
    echo -e "${RED}❌ Failed to query migrations table${NC}"
    exit 1
  }
  
  echo ""
}

# Main logic
if [ -z "$MIGRATION_NAME" ]; then
  # List all migrations
  list_recorded_migrations
  
  # Check for specific migrations that need verification
  MIGRATION_085_RECORDED=$(psql "$SUPABASE_DB_URL" -t -c "
    SELECT COUNT(*) FROM $MIGRATIONS_TABLE 
    WHERE migration_name = '085_migrate_user_groups_to_recommendations.sql';
  " 2>/dev/null | tr -d ' ' || echo "0")
  
  if [ "$MIGRATION_085_RECORDED" -gt "0" ]; then
    echo ""
    verify_migration_085
  fi
else
  # Verify specific migration
  case "$MIGRATION_NAME" in
    "085_migrate_user_groups_to_recommendations.sql"|"085")
      verify_migration_085
      ;;
    *)
      echo -e "${YELLOW}⚠️  No specific verification logic for: $MIGRATION_NAME${NC}"
      echo -e "${YELLOW}   Checking if it's recorded...${NC}"
      
      RECORDED=$(psql "$SUPABASE_DB_URL" -t -c "
        SELECT COUNT(*) FROM $MIGRATIONS_TABLE 
        WHERE migration_name = '$MIGRATION_NAME';
      " 2>/dev/null | tr -d ' ' || echo "0")
      
      if [ "$RECORDED" -gt "0" ]; then
        echo -e "${GREEN}✅ Migration is recorded in _migrations table${NC}"
      else
        echo -e "${YELLOW}⚠️  Migration is NOT recorded${NC}"
      fi
      ;;
  esac
fi

echo ""
echo -e "${BLUE}💡 Tip: If a migration was incorrectly recorded, you can remove it with:${NC}"
echo -e "${BLUE}   psql \$SUPABASE_DB_URL -c \"DELETE FROM $MIGRATIONS_TABLE WHERE migration_name = 'migration_name.sql';\"${NC}"
