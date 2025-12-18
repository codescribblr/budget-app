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
  echo ""
  echo -e "${YELLOW}⚠️  Important: If your password contains special characters (@, :, /, #, etc.),${NC}"
  echo -e "${YELLOW}   they must be URL-encoded in the connection string.${NC}"
  exit 1
fi

# Parse connection URL to extract components for psql
# Format: postgresql://[user[:password]@]host[:port][/database]
# Use Python to properly parse and URL-decode the connection string
PSQL_CONN=$(python3 -c "
import sys
import urllib.parse
import re

url = sys.argv[1]

# Handle URL encoding issues - ensure password is properly encoded
# If the URL doesn't start with a scheme, try to fix it
if not url.startswith('postgresql://') and not url.startswith('postgres://'):
    url = 'postgresql://' + url

try:
    parsed = urllib.parse.urlparse(url)
    
    # Try to access port - this will raise ValueError if URL is malformed
    # We catch this specifically to provide better error message
    try:
        _ = parsed.port  # This access might raise ValueError if port is invalid
    except ValueError as port_error:
        # URL parsing failed due to malformed port (likely password contains special chars)
        error_msg = str(port_error)
        if 'Port could not be cast' in error_msg:
            print(f'Error: Invalid URL format - password likely contains special characters', file=sys.stderr)
            print(f'Details: {error_msg}', file=sys.stderr)
            print(f'', file=sys.stderr)
            print(f'The password in your SUPABASE_DB_URL contains special characters that must be URL-encoded.', file=sys.stderr)
            print(f'', file=sys.stderr)
            print(f'Common special characters and their encodings:', file=sys.stderr)
            print(f'  @  ->  %40', file=sys.stderr)
            print(f'  :  ->  %3A', file=sys.stderr)
            print(f'  /  ->  %2F', file=sys.stderr)
            print(f'  #  ->  %23', file=sys.stderr)
            print(f'  %  ->  %25', file=sys.stderr)
            print(f'  &  ->  %26', file=sys.stderr)
            print(f'  =  ->  %3D', file=sys.stderr)
            print(f'', file=sys.stderr)
            print(f'To encode your password, run:', file=sys.stderr)
            print(f'  python3 -c \"import urllib.parse; print(urllib.parse.quote(\'your-password\'))\"', file=sys.stderr)
            print(f'', file=sys.stderr)
            print(f'Then update your SUPABASE_DB_URL with the encoded password.', file=sys.stderr)
            sys.exit(1)
        else:
            raise  # Re-raise if it's a different ValueError
    
    user = parsed.username or 'postgres'
    password = parsed.password or ''
    host = parsed.hostname or 'localhost'
    
    # Safely parse port
    port = 5432  # default
    if parsed.port is not None:
        try:
            port = int(parsed.port)
        except (ValueError, TypeError):
            # Fallback: check if hostname contains port info
            if ':' in host:
                host_parts = host.rsplit(':', 1)
                try:
                    port = int(host_parts[1])
                    host = host_parts[0]
                except (ValueError, IndexError):
                    pass
    
    database = parsed.path.lstrip('/') or 'postgres'
    
    # URL-decode password and username
    password_decoded = urllib.parse.unquote(password) if password else ''
    user_decoded = urllib.parse.unquote(user) if user else 'postgres'
    
    # Use PGPASSWORD environment variable for password to avoid shell escaping issues
    print(f'PGPASSWORD={password_decoded}')
    print(f'export PGPASSWORD')
    print(f'-h {host} -p {port} -U {user_decoded} -d {database}')
except Exception as e:
    print(f'Error parsing URL: {e}', file=sys.stderr)
    print(f'URL format should be: postgresql://user:password@host:port/database', file=sys.stderr)
    print(f'If your password contains special characters, they must be URL-encoded.', file=sys.stderr)
    sys.exit(1)
" "$SUPABASE_DB_URL")

# Check if parsing succeeded
if [ -z "$PSQL_CONN" ] || echo "$PSQL_CONN" | grep -q "Error parsing URL"; then
  echo -e "${RED}❌ Failed to parse SUPABASE_DB_URL${NC}"
  echo -e "${RED}   Make sure your password is properly URL-encoded${NC}"
  echo -e "${YELLOW}   Special characters in passwords should be URL-encoded (e.g., @ becomes %40)${NC}"
  exit 1
fi

# Extract PGPASSWORD and psql connection params
PGPASSWORD_VAL=$(echo "$PSQL_CONN" | head -1 | sed 's/PGPASSWORD=//')
PSQL_PARAMS=$(echo "$PSQL_CONN" | tail -1)

# Validate that we got the required values
if [ -z "$PSQL_PARAMS" ]; then
  echo -e "${RED}❌ Failed to extract connection parameters from SUPABASE_DB_URL${NC}"
  exit 1
fi

# Export password for psql
export PGPASSWORD="$PGPASSWORD_VAL"

echo -e "${BLUE}🚀 Starting database migrations...${NC}\n"

# Check PostgreSQL version on server
echo -e "${YELLOW}🔍 Checking PostgreSQL version...${NC}"
PG_VERSION=$(psql $PSQL_PARAMS -t -c "SELECT version();" 2>/dev/null | head -1)
if [ -n "$PG_VERSION" ]; then
  echo -e "${BLUE}   Server: $PG_VERSION${NC}"
  # Extract version number (e.g., "PostgreSQL 15.4" -> "15")
  SERVER_MAJOR=$(echo "$PG_VERSION" | grep -oE 'PostgreSQL [0-9]+' | grep -oE '[0-9]+' | head -1)
  CLIENT_VERSION=$(psql --version | grep -oE '[0-9]+\.[0-9]+' | head -1)
  CLIENT_MAJOR=$(echo "$CLIENT_VERSION" | cut -d. -f1)
  echo -e "${BLUE}   Client: PostgreSQL $CLIENT_VERSION${NC}"
  if [ "$SERVER_MAJOR" != "$CLIENT_MAJOR" ]; then
    echo -e "${YELLOW}⚠️  Warning: Server version ($SERVER_MAJOR) doesn't match client version ($CLIENT_MAJOR)${NC}"
    echo -e "${YELLOW}   Consider installing PostgreSQL@$SERVER_MAJOR for better compatibility${NC}\n"
  else
    echo -e "${GREEN}✓${NC} Client and server versions match\n"
  fi
else
  echo -e "${YELLOW}⚠️  Could not determine server version${NC}\n"
fi

# Create migrations tracking table if it doesn't exist
echo -e "${YELLOW}📊 Creating migrations tracking table...${NC}"
if ! psql $PSQL_PARAMS -c "
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
EXECUTED_MIGRATIONS=$(psql $PSQL_PARAMS -t -c "SELECT migration_name FROM $MIGRATIONS_TABLE ORDER BY migration_name;" 2>/dev/null | tr -d ' ')

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
  if psql $PSQL_PARAMS -f "$MIGRATION_FILE" 2>&1; then
    # Record the migration as executed
    if ! psql $PSQL_PARAMS -c "INSERT INTO $MIGRATIONS_TABLE (migration_name) VALUES ('$MIGRATION_NAME');" 2>&1; then
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

  # Reload PostgREST schema cache
  echo ""
  echo -e "${YELLOW}🔄 Reloading PostgREST schema cache...${NC}"
  if psql $PSQL_PARAMS -c "NOTIFY pgrst, 'reload schema';" 2>&1; then
    echo -e "${GREEN}✅ Schema cache reloaded${NC}"
  else
    echo -e "${YELLOW}⚠️  Could not reload schema cache (this is normal if PostgREST is not listening)${NC}"
    echo -e "${YELLOW}   The schema will be reloaded automatically on next API request${NC}"
  fi
fi

