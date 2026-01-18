#!/bin/bash

echo "=== TESTING QR BUTTON FUNCTIONALITY ==="
echo ""
echo "1. Checking if server is running..."
curl -s http://localhost:8081/status 2>&1 | grep -q "running" && echo "✅ Server is running" || echo "❌ Server not running"

echo ""
echo "2. Checking backend..."
curl -s http://localhost:3000/health 2>&1 | grep -q "ok" && echo "✅ Backend is running" || echo "❌ Backend not running"

echo ""
echo "3. Opening browser for you to test..."
echo "   URL: http://localhost:8081"
echo ""
echo "MANUAL TEST STEPS:"
echo "=================="
echo "1. Open http://localhost:8081 in your browser"
echo "2. Open browser DevTools (F12 or Cmd+Option+I)"
echo "3. Go to Console tab"
echo "4. Navigate to Community tab (bottom navigation)"
echo "5. Click the QR code icon (top right)"
echo ""
echo "EXPECTED BEHAVIOR:"
echo "- Alert popup should appear with 3 options:"
echo "  • Show My QR Code"
echo "  • Scan QR Code"  
echo "  • Cancel"
echo ""
echo "If nothing happens:"
echo "- Check Console for errors"
echo "- Take a screenshot and share it"
echo ""
echo "If you see errors about 'Platform' or 'require':"
echo "- The web fallback code has an issue"
echo "- I will fix it immediately"
echo ""

# Try to open browser automatically
if command -v open &> /dev/null; then
    open http://localhost:8081
elif command -v xdg-open &> /dev/null; then
    xdg-open http://localhost:8081
fi

