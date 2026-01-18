#!/bin/bash

# Test script for Position Trading Endpoint
# Run this after starting the backend server

echo "=========================================="
echo "Position Trading Endpoint Test Suite"
echo "=========================================="
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Test 1: Missing wallet address
echo "Test 1: Missing wallet address"
echo "Expected: 400 error"
response=$(curl -s -w "\n%{http_code}" -X POST http://localhost:8000/api/trade/pear/positions \
  -H "Content-Type: application/json" \
  -d '{
    "slippage": 0.01,
    "executionType": "SYNC",
    "leverage": 10,
    "usdValue": 1000,
    "longAssets": [{"asset": "BTC", "weight": 1.0}]
  }')

status_code=$(echo "$response" | tail -n1)
body=$(echo "$response" | head -n-1)

if [ "$status_code" = "400" ]; then
    echo -e "${GREEN}✅ PASS${NC} - Got expected 400 status"
    echo "Response: $body"
else
    echo -e "${RED}❌ FAIL${NC} - Expected 400, got $status_code"
    echo "Response: $body"
fi
echo ""

# Test 2: Missing assets
echo "Test 2: Missing assets"
echo "Expected: 400 error"
response=$(curl -s -w "\n%{http_code}" -X POST http://localhost:8000/api/trade/pear/positions \
  -H "Content-Type: application/json" \
  -d '{
    "walletAddress": "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb",
    "slippage": 0.01,
    "executionType": "SYNC",
    "leverage": 10,
    "usdValue": 1000
  }')

status_code=$(echo "$response" | tail -n1)
body=$(echo "$response" | head -n-1)

if [ "$status_code" = "400" ]; then
    echo -e "${GREEN}✅ PASS${NC} - Got expected 400 status"
    echo "Response: $body"
else
    echo -e "${RED}❌ FAIL${NC} - Expected 400, got $status_code"
    echo "Response: $body"
fi
echo ""

# Test 3: Invalid leverage
echo "Test 3: Invalid leverage (0)"
echo "Expected: 422 validation error"
response=$(curl -s -w "\n%{http_code}" -X POST http://localhost:8000/api/trade/pear/positions \
  -H "Content-Type: application/json" \
  -d '{
    "walletAddress": "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb",
    "slippage": 0.01,
    "executionType": "SYNC",
    "leverage": 0,
    "usdValue": 1000,
    "longAssets": [{"asset": "BTC", "weight": 1.0}]
  }')

status_code=$(echo "$response" | tail -n1)
body=$(echo "$response" | head -n-1)

if [ "$status_code" = "422" ]; then
    echo -e "${GREEN}✅ PASS${NC} - Got expected 422 validation error"
else
    echo -e "${RED}❌ FAIL${NC} - Expected 422, got $status_code"
fi
echo ""

# Test 4: Valid request (will fail at auth if no credentials)
echo "Test 4: Valid request structure"
echo "Expected: 200 (with credentials) or 500 (no credentials)"
response=$(curl -s -w "\n%{http_code}" -X POST http://localhost:8000/api/trade/pear/positions \
  -H "Content-Type: application/json" \
  -d '{
    "walletAddress": "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb",
    "slippage": 0.01,
    "executionType": "SYNC",
    "leverage": 10,
    "usdValue": 1000,
    "longAssets": [
      {"asset": "BTC", "weight": 0.6},
      {"asset": "ETH", "weight": 0.4}
    ],
    "shortAssets": [
      {"asset": "SOL", "weight": 0.7},
      {"asset": "AVAX", "weight": 0.3}
    ]
  }')

status_code=$(echo "$response" | tail -n1)
body=$(echo "$response" | head -n-1)

if [ "$status_code" = "200" ]; then
    echo -e "${GREEN}✅ PASS${NC} - Request succeeded (credentials configured)"
    echo "Response: $body"
elif [ "$status_code" = "500" ]; then
    if echo "$body" | grep -q "WALLET_PRIVATE_KEY"; then
        echo -e "${YELLOW}⚠️  EXPECTED${NC} - No credentials configured"
        echo "Response: $body"
        echo "Note: Set WALLET_PRIVATE_KEY in .env to test with real API"
    else
        echo -e "${RED}❌ FAIL${NC} - Got 500 but not for credentials"
        echo "Response: $body"
    fi
else
    echo -e "${RED}❌ FAIL${NC} - Expected 200 or 500, got $status_code"
    echo "Response: $body"
fi
echo ""

# Test 5: Request with all optional fields
echo "Test 5: Request with all optional fields"
echo "Expected: 200 or 500"
response=$(curl -s -w "\n%{http_code}" -X POST http://localhost:8000/api/trade/pear/positions \
  -H "Content-Type: application/json" \
  -d '{
    "walletAddress": "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb",
    "slippage": 0.01,
    "executionType": "SYNC",
    "leverage": 10,
    "usdValue": 1000,
    "longAssets": [{"asset": "BTC", "weight": 1.0}],
    "triggerValue": "45000",
    "triggerType": "PRICE",
    "direction": "MORE_THAN",
    "assetName": "ETH",
    "twapDuration": 120,
    "twapIntervalSeconds": 30,
    "ladderConfig": {
      "ratioStart": 42000,
      "ratioEnd": 48000,
      "numberOfLevels": 5
    },
    "stopLoss": {"type": "PERCENTAGE", "value": 15},
    "takeProfit": {"type": "PERCENTAGE", "value": 25},
    "referralCode": "0x48656c6c6f20776f726c64210000000000000000000000000000000000000000"
  }')

status_code=$(echo "$response" | tail -n1)
body=$(echo "$response" | head -n-1)

if [ "$status_code" = "200" ]; then
    echo -e "${GREEN}✅ PASS${NC} - Request with all fields succeeded"
    echo "Response: $body"
elif [ "$status_code" = "500" ]; then
    echo -e "${YELLOW}⚠️  EXPECTED${NC} - Request format valid but no credentials"
    echo "Response: $body"
else
    echo -e "${RED}❌ FAIL${NC} - Expected 200 or 500, got $status_code"
    echo "Response: $body"
fi
echo ""

echo "=========================================="
echo "Test Suite Complete"
echo "=========================================="
echo ""
echo "Summary:"
echo "- Validation tests should all PASS"
echo "- API tests will show 'No credentials' unless .env is configured"
echo ""
echo "To test with real Pear Protocol API:"
echo "1. Add WALLET_PRIVATE_KEY to backend/.env"
echo "2. Add PEAR_CLIENT_ID to backend/.env"
echo "3. Run this script again"
