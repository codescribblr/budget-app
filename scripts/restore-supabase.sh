#!/bin/bash

# Supabase Database Restore Script
# Restores a database from a SQL backup file
#
# Usage:
#   ./scripts/restore-supabase.sh <backup_file>
#   ./scripts/restore-supabase.sh database/backups/backup_20250114_153045.sql
#
# Environment Variables Required:
#   SUPABASE_DB_URL - PostgreSQL connection string
#   Format: postgresql://postgres:[PASSWORD]@[HOST]:5432/postgres

set -e  # Exit on error

# Add PostgreSQL 17 to PATH if it exists
if [ -d "/opt/homebrew/opt/postgresql@17/bin" ]; then
  export PATH="/opt/homebrew/opt/postgresql@17/bin:$PATH"
fi

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🔄 Supabase Database Restore${NC}\n"

# Load environment variables from .env.local if it exists
if [ -f ".env.local" ]; then
  echo -e "${BLUE}📄 Loading database URL from .env.local${NC}"
  set -a  # automatically export all variables
  source .env.local
  set +a  # stop automatically exporting
  echo ""
fi

# Check if backup file is provided
if [ -z "$1" ]; then
  echo -e "${RED}❌ Error: No backup file specified${NC}"
  echo ""
  echo "Usage:"
  echo "  ./scripts/restore-supabase.sh <backup_file>"
  echo ""
  echo "Example:"
  echo "  ./scripts/restore-supabase.sh database/backups/backup_20250114_153045.sql"
  echo ""
  
  # List available backups
  if [ -d "database/backups" ]; then
    BACKUP_COUNT=$(ls -1 database/backups/backup_*.sql 2>/dev/null | wc -l | tr -d ' ')
    if [ "$BACKUP_COUNT" -gt 0 ]; then
      echo -e "${YELLOW}Available backups:${NC}"
      ls -lht database/backups/backup_*.sql | head -10 | awk '{print "  " $9 " (" $5 ", " $6 " " $7 " " $8 ")"}'
    fi
  fi
  
  exit 1
fi

BACKUP_FILE="$1"

# Validate backup file exists
if [ ! -f "$BACKUP_FILE" ]; then
  echo -e "${RED}❌ Error: Backup file not found: ${BACKUP_FILE}${NC}"
  exit 1
fi

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

# Get file info
FILE_SIZE=$(du -h "$BACKUP_FILE" | cut -f1)
FILE_DATE=$(stat -f "%Sm" -t "%Y-%m-%d %H:%M:%S" "$BACKUP_FILE" 2>/dev/null || stat -c "%y" "$BACKUP_FILE" 2>/dev/null | cut -d'.' -f1)

echo -e "${YELLOW}⚠️  WARNING: This will restore the database from backup${NC}"
echo -e "   This will DROP and recreate all tables, losing current data!"
echo ""
echo -e "   📁 Backup file: ${BACKUP_FILE}"
echo -e "   📊 File size: ${FILE_SIZE}"
echo -e "   📅 Created: ${FILE_DATE}"
echo ""

# Check if running in non-interactive mode (CI/CD)
if [ -n "$CI" ] || [ -n "$SKIP_CONFIRM" ]; then
  CONFIRM="yes"
  echo -e "${YELLOW}⚠️  Non-interactive mode: auto-confirming restore${NC}"
else
  read -p "Are you sure you want to continue? (yes/no): " CONFIRM
fi

if [ "$CONFIRM" != "yes" ]; then
  echo -e "${YELLOW}❌ Restore cancelled${NC}"
  exit 0
fi

echo ""
echo -e "${YELLOW}🔄 Restoring database...${NC}"
echo ""

# Restore the backup
if psql "$SUPABASE_DB_URL" -f "$BACKUP_FILE" 2>&1; then
  echo ""
  echo -e "${GREEN}✅ Database restored successfully!${NC}"
  echo ""
  echo -e "${YELLOW}🔄 Reloading PostgREST schema cache...${NC}"
  if psql "$SUPABASE_DB_URL" -c "NOTIFY pgrst, 'reload schema';" 2>&1; then
    echo -e "${GREEN}✅ Schema cache reloaded${NC}"
  else
    echo -e "${YELLOW}⚠️  Could not reload schema cache (this is normal if PostgREST is not listening)${NC}"
    echo -e "${YELLOW}   The schema will be reloaded automatically on next API request${NC}"
  fi
  echo ""
  echo -e "${GREEN}💡 Your database has been restored to the backup state${NC}"
else
  echo ""
  echo -e "${RED}❌ Restore failed${NC}"
  echo -e "${RED}   Check the backup file and database connection${NC}"
  exit 1
fi

