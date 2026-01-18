#!/bin/bash
# Data Pipeline Checker - Verify all steps are working

echo "🔍 Checking Data Pipeline..."
echo ""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if backend is running
echo "1️⃣  Checking if backend is running..."
if curl -s http://127.0.0.1:3000/health > /dev/null 2>&1; then
    echo -e "${GREEN}✅ Backend is running${NC}"
else
    echo -e "${RED}❌ Backend is NOT running${NC}"
    echo "   Start it with: cd backend && npm run dev"
    exit 1
fi

# Check API keys
echo ""
echo "2️⃣  Checking API keys in .env..."
cd backend

if [ ! -f .env ]; then
    echo -e "${RED}❌ .env file not found${NC}"
    echo "   Create it: cp .env.example .env"
    exit 1
fi

source .env 2>/dev/null || true

if [ -z "$NEWSAPI_KEY" ]; then
    echo -e "${YELLOW}⚠️  NEWSAPI_KEY not set${NC}"
else
    echo -e "${GREEN}✅ NEWSAPI_KEY is set${NC}"
fi

if [ -z "$OPENAI_API_KEY" ]; then
    echo -e "${YELLOW}⚠️  OPENAI_API_KEY not set${NC}"
else
    echo -e "${GREEN}✅ OPENAI_API_KEY is set${NC}"
fi

if [ -z "$DATABASE_URL" ]; then
    echo -e "${RED}❌ DATABASE_URL not set${NC}"
    exit 1
else
    echo -e "${GREEN}✅ DATABASE_URL is set${NC}"
fi

# Check database connection
echo ""
echo "3️⃣  Checking database connection..."
if npx prisma db execute --stdin <<< "SELECT 1" > /dev/null 2>&1; then
    echo -e "${GREEN}✅ Database connection works${NC}"
else
    echo -e "${RED}❌ Database connection failed${NC}"
    echo "   Check your DATABASE_URL"
    exit 1
fi

# Check if news articles exist
echo ""
echo "4️⃣  Checking for news articles in database..."
ARTICLE_COUNT=$(npx prisma db execute --stdin <<< "SELECT COUNT(*) as count FROM NewsArticle;" 2>/dev/null | grep -o '[0-9]*' | head -1 || echo "0")

if [ "$ARTICLE_COUNT" = "0" ] || [ -z "$ARTICLE_COUNT" ]; then
    echo -e "${YELLOW}⚠️  No news articles found (count: ${ARTICLE_COUNT})${NC}"
    echo "   You need to ingest news first!"
    echo ""
    echo "   Run: curl -X POST \"http://localhost:3000/api/v1/news/ingest?limit=20\" \\"
    echo "     -H \"x-user-id: 11111111-1111-1111-1111-111111111111\""
else
    echo -e "${GREEN}✅ Found ${ARTICLE_COUNT} news articles${NC}"
fi

# Check if narratives exist
echo ""
echo "5️⃣  Checking for narratives in database..."
NARRATIVE_COUNT=$(npx prisma db execute --stdin <<< "SELECT COUNT(*) as count FROM DetectedNarrative;" 2>/dev/null | grep -o '[0-9]*' | head -1 || echo "0")

if [ "$NARRATIVE_COUNT" = "0" ] || [ -z "$NARRATIVE_COUNT" ]; then
    echo -e "${YELLOW}⚠️  No narratives found (count: ${NARRATIVE_COUNT})${NC}"
    echo "   You need to build narratives from news articles!"
    echo ""
    echo "   Run: cd backend && npm run build:narratives"
else
    echo -e "${GREEN}✅ Found ${NARRATIVE_COUNT} narratives${NC}"
fi

# Test API endpoint
echo ""
echo "6️⃣  Testing /api/narratives endpoint..."
RESPONSE=$(curl -s "http://127.0.0.1:3000/api/narratives?limit=5" \
  -H "x-user-id: 11111111-1111-1111-1111-111111111111" 2>&1)

if echo "$RESPONSE" | grep -q "error\|Error"; then
    echo -e "${RED}❌ API endpoint returned error${NC}"
    echo "   Response: $RESPONSE"
else
    COUNT=$(echo "$RESPONSE" | grep -o '"id"' | wc -l | tr -d ' ')
    if [ "$COUNT" = "0" ]; then
        echo -e "${YELLOW}⚠️  API returned empty array (no narratives)${NC}"
    else
        echo -e "${GREEN}✅ API returned ${COUNT} narratives${NC}"
    fi
fi

# Summary
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📊 Summary"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

if [ "$ARTICLE_COUNT" = "0" ]; then
    echo -e "${YELLOW}⚠️  STEP 1: Ingest news articles${NC}"
    echo "   curl -X POST \"http://localhost:3000/api/v1/news/ingest?limit=20\" \\"
    echo "     -H \"x-user-id: 11111111-1111-1111-1111-111111111111\""
fi

if [ "$NARRATIVE_COUNT" = "0" ] && [ "$ARTICLE_COUNT" != "0" ]; then
    echo -e "${YELLOW}⚠️  STEP 2: Build narratives${NC}"
    echo "   cd backend && npm run build:narratives"
fi

if [ "$ARTICLE_COUNT" != "0" ] && [ "$NARRATIVE_COUNT" != "0" ]; then
    echo -e "${GREEN}✅ Data pipeline is working!${NC}"
    echo "   Your Community page should show data now."
fi

echo ""
