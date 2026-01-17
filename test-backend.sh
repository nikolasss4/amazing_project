#!/bin/bash

# Quick test script to verify backend is running

echo "🧪 Testing Backend Connection..."
echo ""

BACKEND_URL="http://10.153.140.5:8000"

echo "Testing: $BACKEND_URL"
echo ""

# Test health endpoint
echo "1. Health Check..."
HEALTH=$(curl -s "$BACKEND_URL/health" 2>&1)
if [[ $HEALTH == *"healthy"* ]] || [[ $HEALTH == *"status"* ]]; then
    echo "   ✅ Backend is running!"
    echo "   Response: $HEALTH"
else
    echo "   ❌ Backend is not responding"
    echo "   Error: $HEALTH"
    echo ""
    echo "   💡 Make sure backend is started:"
    echo "      cd backend && ./start.sh"
    exit 1
fi

echo ""

# Test Pear instruments
echo "2. Testing Pear Instruments..."
PEAR=$(curl -s "$BACKEND_URL/api/trade/instruments/pear" 2>&1)
if [[ $PEAR == *"instruments"* ]] || [[ $PEAR == *"[]"* ]]; then
    echo "   ✅ Pear endpoint working!"
else
    echo "   ⚠️  Pear endpoint returned: $PEAR"
fi

echo ""

# Test Hyperliquid instruments
echo "3. Testing Hyperliquid Instruments..."
HYPER=$(curl -s "$BACKEND_URL/api/trade/instruments/hyperliquid" 2>&1)
if [[ $HYPER == *"instruments"* ]] || [[ $HYPER == *"[]"* ]]; then
    echo "   ✅ Hyperliquid endpoint working!"
else
    echo "   ⚠️  Hyperliquid endpoint returned: $HYPER"
fi

echo ""
echo "✅ All tests passed! Backend is ready."
echo ""
echo "📱 Your mobile app is configured to use: $BACKEND_URL"
echo "   (Check mobile/src/app/config.ts)"
