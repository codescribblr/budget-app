#!/bin/bash

# Supabase Database Backup Script
# Creates a full SQL dump of your Supabase database
#
# Usage:
#   ./scripts/backup-supabase.sh
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

# Configuration
BACKUP_DIR="database/backups"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_FILE="${BACKUP_DIR}/backup_${TIMESTAMP}.sql"

echo -e "${BLUE}🗄️  Supabase Database Backup${NC}\n"

# Load environment variables from .env.local if it exists
if [ -f ".env.local" ]; then
  echo -e "${BLUE}📄 Loading database URL from .env.local${NC}"
  set -a  # automatically export all variables
  source .env.local
  set +a  # stop automatically exporting
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

# Create backup directory if it doesn't exist
mkdir -p "$BACKUP_DIR"

echo -e "${YELLOW}📦 Creating backup...${NC}"
echo -e "   Backup file: ${BACKUP_FILE}"
echo ""

# Create the backup using pg_dump
# --clean: Add DROP statements before CREATE
# --if-exists: Use IF EXISTS when dropping objects
# --no-owner: Don't output commands to set ownership
# --no-privileges: Don't output commands to set privileges
ERROR_OUTPUT=$(mktemp)
if pg_dump "$SUPABASE_DB_URL" \
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
  
  echo -e "${GREEN}✅ Backup completed successfully!${NC}"
  echo ""
  echo -e "   📁 File: ${BACKUP_FILE}"
  echo -e "   📊 Size: ${FILE_SIZE}"
  echo ""
  
  # Count number of backups
  BACKUP_COUNT=$(ls -1 "$BACKUP_DIR"/backup_*.sql 2>/dev/null | wc -l | tr -d ' ')
  echo -e "${BLUE}ℹ️  Total backups: ${BACKUP_COUNT}${NC}"
  
  # Show recent backups
  if [ "$BACKUP_COUNT" -gt 1 ]; then
    echo ""
    echo -e "${YELLOW}Recent backups:${NC}"
    ls -lht "$BACKUP_DIR"/backup_*.sql | head -5 | awk '{print "   " $9 " (" $5 ")"}'
  fi
  
  echo ""
  echo -e "${GREEN}💡 To restore this backup later, run:${NC}"
  echo -e "   ${BLUE}./scripts/restore-supabase.sh ${BACKUP_FILE}${NC}"
  
else
  echo -e "${RED}❌ Backup failed${NC}"

  # Check for version mismatch error
  if grep -q "server version mismatch" "$ERROR_OUTPUT"; then
    echo -e "${YELLOW}   Error: PostgreSQL version mismatch${NC}"
    echo ""
    echo -e "   Your local pg_dump is too old for the Supabase server."
    echo -e "   ${BLUE}To fix this, upgrade PostgreSQL:${NC}"
    echo ""
    echo -e "   ${GREEN}brew upgrade postgresql@17${NC}"
    echo -e "   ${GREEN}brew link postgresql@17${NC}"
    echo ""
    echo -e "   Or install the latest version:"
    echo -e "   ${GREEN}brew install postgresql@17${NC}"
  else
    echo -e "${RED}   Check your SUPABASE_DB_URL and database connection${NC}"
    echo ""
    echo -e "${YELLOW}Error details:${NC}"
    cat "$ERROR_OUTPUT"
  fi

  # Remove empty backup file if it was created
  if [ -f "$BACKUP_FILE" ] && [ ! -s "$BACKUP_FILE" ]; then
    rm "$BACKUP_FILE"
  fi

  rm -f "$ERROR_OUTPUT"
  exit 1
fi

rm -f "$ERROR_OUTPUT"

