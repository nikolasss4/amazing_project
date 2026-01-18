#!/bin/bash
# Complete Setup Script for Community Page Data
# This ensures all data is ingested and narratives are built

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}🚀 Community Page Data Setup${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

cd "$(dirname "$0")"

# Check if backend is running
echo -e "${YELLOW}1️⃣  Checking if backend is running...${NC}"
if ! curl -s http://127.0.0.1:3000/health > /dev/null 2>&1; then
    echo -e "${RED}❌ Backend is NOT running${NC}"
    echo ""
    echo "Please start the backend first:"
    echo "  cd backend && npm run dev"
    exit 1
fi
echo -e "${GREEN}✅ Backend is running${NC}"
echo ""

# Check API keys
echo -e "${YELLOW}2️⃣  Checking API keys...${NC}"
if [ ! -f .env ]; then
    echo -e "${RED}❌ .env file not found${NC}"
    echo ""
    echo "Create it from the example:"
    echo "  cp .env.example .env"
    echo ""
    echo "Then add your API keys:"
    echo "  - NEWSAPI_KEY (required)"
    echo "  - OPENAI_API_KEY (required)"
    exit 1
fi

source .env 2>/dev/null || true

if [ -z "$NEWSAPI_KEY" ]; then
    echo -e "${RED}❌ NEWSAPI_KEY not set in .env${NC}"
    echo ""
    echo "Get your key from: https://newsapi.org/register"
    echo "Then add it to .env:"
    echo "  NEWSAPI_KEY=your_key_here"
    exit 1
fi

if [ -z "$OPENAI_API_KEY" ]; then
    echo -e "${YELLOW}⚠️  OPENAI_API_KEY not set${NC}"
    echo "   Sentiment analysis won't work without it"
    echo "   Get key from: https://platform.openai.com/api-keys"
fi

echo -e "${GREEN}✅ API keys configured${NC}"
echo ""

# Step 1: Seed news sources
echo -e "${YELLOW}3️⃣  Seeding news sources...${NC}"
if [ -f "seed-news-sources.js" ]; then
    node seed-news-sources.js
    echo -e "${GREEN}✅ News sources seeded${NC}"
else
    echo -e "${YELLOW}⚠️  seed-news-sources.js not found, skipping...${NC}"
fi
echo ""

# Step 2: Ingest news
echo -e "${YELLOW}4️⃣  Ingesting news articles...${NC}"
echo "   This may take a minute..."
INGEST_RESPONSE=$(curl -s -X POST "http://127.0.0.1:3000/api/v1/news/ingest?limit=50" \
  -H "x-user-id: 11111111-1111-1111-1111-111111111111" \
  -H "Content-Type: application/json")

if echo "$INGEST_RESPONSE" | grep -q "error\|Error"; then
    echo -e "${RED}❌ News ingestion failed${NC}"
    echo "   Response: $INGEST_RESPONSE"
    exit 1
fi

ARTICLE_COUNT=$(echo "$INGEST_RESPONSE" | grep -o '"articlesIngested":[0-9]*' | grep -o '[0-9]*' || echo "0")
echo -e "${GREEN}✅ Ingested ${ARTICLE_COUNT} news articles${NC}"
echo ""

if [ "$ARTICLE_COUNT" = "0" ]; then
    echo -e "${YELLOW}⚠️  No articles were ingested${NC}"
    echo "   This might mean:"
    echo "   - NEWSAPI_KEY is invalid"
    echo "   - Rate limit reached (100 requests/day free tier)"
    echo "   - Network issue"
    echo ""
    echo "   Try checking your NEWSAPI_KEY and try again"
    exit 1
fi

# Step 3: Build narratives
echo -e "${YELLOW}5️⃣  Building narratives from news...${NC}"
echo "   This may take a minute..."
if npm run build:narratives 2>&1 | tee /tmp/narrative-build.log; then
    echo -e "${GREEN}✅ Narratives built successfully${NC}"
else
    echo -e "${RED}❌ Failed to build narratives${NC}"
    echo "   Check the logs above for errors"
    exit 1
fi
echo ""

# Step 4: Verify data
echo -e "${YELLOW}6️⃣  Verifying data...${NC}"
NARRATIVE_RESPONSE=$(curl -s "http://127.0.0.1:3000/api/narratives?limit=5" \
  -H "x-user-id: 11111111-1111-1111-1111-111111111111")

if echo "$NARRATIVE_RESPONSE" | grep -q "error\|Error"; then
    echo -e "${RED}❌ API returned error${NC}"
    echo "   Response: $NARRATIVE_RESPONSE"
    exit 1
fi

# Count narratives in response
NARRATIVE_COUNT=$(echo "$NARRATIVE_RESPONSE" | grep -o '"id"' | wc -l | tr -d ' ')

if [ "$NARRATIVE_COUNT" = "0" ]; then
    echo -e "${YELLOW}⚠️  No narratives returned by API${NC}"
    echo "   This might mean narratives were built but filtered out"
    echo "   Check that crypto news sources are active"
else
    echo -e "${GREEN}✅ API returned ${NARRATIVE_COUNT} narratives${NC}"
fi
echo ""

# Summary
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}📊 Setup Complete!${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo -e "${GREEN}✅ Data pipeline is set up${NC}"
echo ""
echo "Next steps:"
echo "  1. Refresh your Community page"
echo "  2. You should now see market narratives"
echo ""
echo "If you still don't see data:"
echo "  - Check browser console for errors"
echo "  - Verify backend is running: curl http://127.0.0.1:3000/health"
echo "  - Test API: curl http://127.0.0.1:3000/api/narratives?limit=5 -H 'x-user-id: 11111111-1111-1111-1111-111111111111'"
echo ""
