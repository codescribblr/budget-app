#!/bin/bash

# Schema Checker
# This script checks what tables and columns exist in the Supabase database
#
# Usage:
#   ./scripts/check-schema.sh
#
# Environment Variables Required:
#   SUPABASE_DB_URL - PostgreSQL connection string

set -e

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

if [ -z "$SUPABASE_DB_URL" ]; then
  echo "❌ Error: SUPABASE_DB_URL environment variable is not set"
  exit 1
fi

echo -e "${BLUE}🔍 Checking database schema...${NC}\n"

# Check migrations table
echo -e "${YELLOW}📊 Executed migrations:${NC}"
psql "$SUPABASE_DB_URL" -c "SELECT migration_name, executed_at FROM _migrations ORDER BY executed_at;" 2>/dev/null || echo "No migrations table found"

echo ""
echo -e "${YELLOW}📋 Tables in public schema:${NC}"
psql "$SUPABASE_DB_URL" -c "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name;"

echo ""
echo -e "${YELLOW}📋 Columns in categories table:${NC}"
psql "$SUPABASE_DB_URL" -c "SELECT column_name, data_type, is_nullable, column_default FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'categories' ORDER BY ordinal_position;" 2>/dev/null || echo "Table 'categories' not found"

echo ""
echo -e "${YELLOW}📋 Columns in accounts table:${NC}"
psql "$SUPABASE_DB_URL" -c "SELECT column_name, data_type, is_nullable, column_default FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'accounts' ORDER BY ordinal_position;" 2>/dev/null || echo "Table 'accounts' not found"

echo ""
echo -e "${YELLOW}📋 Columns in credit_cards table:${NC}"
psql "$SUPABASE_DB_URL" -c "SELECT column_name, data_type, is_nullable, column_default FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'credit_cards' ORDER BY ordinal_position;" 2>/dev/null || echo "Table 'credit_cards' not found"

echo ""
echo -e "${GREEN}✅ Schema check complete${NC}"

