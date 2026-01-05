#!/bin/bash

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🔍 Checking Vercel Environment Variables${NC}\n"

# Check if vercel CLI is installed
if ! command -v vercel &> /dev/null; then
    echo -e "${YELLOW}⚠️  Vercel CLI not found. Installing...${NC}"
    npm install -g vercel
fi

echo -e "${BLUE}📋 Fetching environment variables from Vercel...${NC}\n"

# Pull environment variables
vercel env pull .env.vercel.check --yes 2>/dev/null

if [ -f ".env.vercel.check" ]; then
    echo -e "${GREEN}✓${NC} Successfully pulled environment variables\n"
    
    # Check for required variables
    echo -e "${BLUE}Checking required variables:${NC}\n"
    
    REQUIRED_VARS=("NEXT_PUBLIC_SUPABASE_URL" "NEXT_PUBLIC_SUPABASE_ANON_KEY")
    MISSING_VARS=()
    
    for VAR in "${REQUIRED_VARS[@]}"; do
        if grep -q "^${VAR}=" .env.vercel.check; then
            echo -e "${GREEN}✓${NC} $VAR is set"
        else
            echo -e "${RED}✗${NC} $VAR is MISSING"
            MISSING_VARS+=("$VAR")
        fi
    done
    
    # Check optional variables
    echo -e "\n${BLUE}Optional variables:${NC}\n"
    if grep -q "^OPENAI_API_KEY=" .env.vercel.check; then
        echo -e "${GREEN}✓${NC} OPENAI_API_KEY is set"
    else
        echo -e "${YELLOW}○${NC} OPENAI_API_KEY is not set (optional)"
    fi
    
    # Clean up
    rm .env.vercel.check
    
    if [ ${#MISSING_VARS[@]} -gt 0 ]; then
        echo -e "\n${RED}❌ Missing required environment variables!${NC}"
        echo -e "${YELLOW}To add them, run:${NC}"
        for VAR in "${MISSING_VARS[@]}"; do
            echo -e "  vercel env add ${VAR}"
        done
        exit 1
    else
        echo -e "\n${GREEN}✅ All required environment variables are set!${NC}"
    fi
else
    echo -e "${RED}❌ Failed to pull environment variables${NC}"
    echo -e "${YELLOW}Make sure you're logged in to Vercel:${NC}"
    echo -e "  vercel login"
    exit 1
fi


