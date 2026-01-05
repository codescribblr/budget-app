#!/bin/bash

# Verify Backup Script
# Compares two backup files to ensure they contain the same data
#
# Usage:
#   ./scripts/verify-backup.sh <backup1.sql> <backup2.sql>
#   ./scripts/verify-backup.sh <backup1.sql> <backup2.sql> --metadata <metadata1.json> <metadata2.json>

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

BACKUP1="$1"
BACKUP2="$2"
METADATA1=""
METADATA2=""

# Parse arguments
if [ "$3" = "--metadata" ] && [ -n "$4" ] && [ -n "$5" ]; then
  METADATA1="$4"
  METADATA2="$5"
fi

if [ -z "$BACKUP1" ] || [ -z "$BACKUP2" ]; then
  echo -e "${RED}❌ Error: Two backup files required${NC}"
  echo ""
  echo "Usage:"
  echo "  ./scripts/verify-backup.sh <backup1.sql> <backup2.sql>"
  echo "  ./scripts/verify-backup.sh <backup1.sql> <backup2.sql> --metadata <metadata1.json> <metadata2.json>"
  exit 1
fi

if [ ! -f "$BACKUP1" ]; then
  echo -e "${RED}❌ Error: Backup file not found: $BACKUP1${NC}"
  exit 1
fi

if [ ! -f "$BACKUP2" ]; then
  echo -e "${RED}❌ Error: Backup file not found: $BACKUP2${NC}"
  exit 1
fi

echo -e "${BLUE}🔍 Verifying backups...${NC}\n"
echo -e "   Backup 1: ${BACKUP1}"
echo -e "   Backup 2: ${BACKUP2}"
echo ""

# Compare file sizes
SIZE1=$(stat -f%z "$BACKUP1" 2>/dev/null || stat -c%s "$BACKUP1" 2>/dev/null || echo "0")
SIZE2=$(stat -f%z "$BACKUP2" 2>/dev/null || stat -c%s "$BACKUP2" 2>/dev/null || echo "0")

echo -e "${BLUE}📊 File Sizes:${NC}"
echo -e "   Backup 1: $(numfmt --to=iec-i --suffix=B "$SIZE1" 2>/dev/null || echo "${SIZE1} bytes")"
echo -e "   Backup 2: $(numfmt --to=iec-i --suffix=B "$SIZE2" 2>/dev/null || echo "${SIZE2} bytes")"

if [ "$SIZE1" = "$SIZE2" ]; then
  echo -e "   ${GREEN}✅ Sizes match${NC}"
else
  SIZE_DIFF=$((SIZE1 - SIZE2))
  PERCENT_DIFF=$(echo "scale=2; ($SIZE_DIFF * 100) / $SIZE2" | bc 2>/dev/null || echo "0")
  echo -e "   ${YELLOW}⚠️  Size difference: ${PERCENT_DIFF}%${NC}"
fi
echo ""

# Compare checksums
echo -e "${BLUE}🔐 Checksums:${NC}"
SHA256_1=$(sha256sum "$BACKUP1" 2>/dev/null | cut -d' ' -f1 || shasum -a 256 "$BACKUP1" 2>/dev/null | cut -d' ' -f1 || echo "")
SHA256_2=$(sha256sum "$BACKUP2" 2>/dev/null | cut -d' ' -f1 || shasum -a 256 "$BACKUP2" 2>/dev/null | cut -d' ' -f1 || echo "")

if [ -n "$SHA256_1" ] && [ -n "$SHA256_2" ]; then
  echo -e "   Backup 1 SHA256: ${SHA256_1:0:16}..."
  echo -e "   Backup 2 SHA256: ${SHA256_2:0:16}..."
  if [ "$SHA256_1" = "$SHA256_2" ]; then
    echo -e "   ${GREEN}✅ Checksums match - backups are identical!${NC}"
    echo ""
    echo -e "${GREEN}✅ Verification passed: Backups are identical${NC}"
    exit 0
  else
    echo -e "   ${RED}❌ Checksums differ - backups are different${NC}"
  fi
else
  echo -e "   ${YELLOW}⚠️  Could not calculate checksums${NC}"
fi
echo ""

# Compare metadata if provided
if [ -n "$METADATA1" ] && [ -n "$METADATA2" ] && [ -f "$METADATA1" ] && [ -f "$METADATA2" ]; then
  echo -e "${BLUE}📋 Metadata Comparison:${NC}"
  
  if command -v jq >/dev/null 2>&1; then
    TABLE_COUNT_1=$(jq -r '.table_count // "unknown"' "$METADATA1" 2>/dev/null || echo "unknown")
    TABLE_COUNT_2=$(jq -r '.table_count // "unknown"' "$METADATA2" 2>/dev/null || echo "unknown")
    ROW_COUNT_1=$(jq -r '.row_count // "unknown"' "$METADATA1" 2>/dev/null || echo "unknown")
    ROW_COUNT_2=$(jq -r '.row_count // "unknown"' "$METADATA2" 2>/dev/null || echo "unknown")
    
    echo -e "   Table count - Backup 1: $TABLE_COUNT_1, Backup 2: $TABLE_COUNT_2"
    if [ "$TABLE_COUNT_1" = "$TABLE_COUNT_2" ] && [ "$TABLE_COUNT_1" != "unknown" ]; then
      echo -e "   ${GREEN}✅ Table counts match${NC}"
    else
      echo -e "   ${YELLOW}⚠️  Table counts differ${NC}"
    fi
    
    echo -e "   Row count - Backup 1: $ROW_COUNT_1, Backup 2: $ROW_COUNT_2"
    if [ "$ROW_COUNT_1" = "$ROW_COUNT_2" ] && [ "$ROW_COUNT_1" != "unknown" ]; then
      echo -e "   ${GREEN}✅ Row counts match${NC}"
    else
      echo -e "   ${YELLOW}⚠️  Row counts differ${NC}"
    fi
    echo ""
  else
    echo -e "   ${YELLOW}⚠️  jq not installed, skipping metadata comparison${NC}"
    echo ""
  fi
fi

# If checksums differ, provide more details
if [ "$SHA256_1" != "$SHA256_2" ] && [ -n "$SHA256_1" ] && [ -n "$SHA256_2" ]; then
  echo -e "${YELLOW}⚠️  Backups differ. Possible reasons:${NC}"
  echo -e "   1. Backups were created at different times (data changed)"
  echo -e "   2. Different pg_dump versions were used"
  echo -e "   3. Different PostgreSQL server versions"
  echo -e "   4. One backup is incomplete or corrupted"
  echo ""
  echo -e "${BLUE}💡 Tip: Check the metadata files for more details:${NC}"
  if [ -n "$METADATA1" ] && [ -f "$METADATA1" ]; then
    echo -e "   Metadata 1: $METADATA1"
  fi
  if [ -n "$METADATA2" ] && [ -f "$METADATA2" ]; then
    echo -e "   Metadata 2: $METADATA2"
  fi
  exit 1
fi

echo -e "${GREEN}✅ Verification complete${NC}"


