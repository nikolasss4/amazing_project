#!/bin/bash

# Script to clear all caches and fix Xcode simulator issues

echo "🧹 Clearing Metro Bundler and Xcode caches..."
echo ""

cd "$(dirname "$0")"

# Clear Metro cache
echo "1. Clearing Metro bundler cache..."
rm -rf node_modules/.cache 2>/dev/null
rm -rf .expo 2>/dev/null
echo "   ✅ Metro cache cleared"

# Clear Xcode derived data
echo "2. Clearing Xcode derived data..."
rm -rf ~/Library/Developer/Xcode/DerivedData/* 2>/dev/null
echo "   ✅ Xcode derived data cleared"

# Clear iOS build folder
echo "3. Clearing iOS build folder..."
rm -rf ios/build 2>/dev/null
echo "   ✅ iOS build folder cleared"

echo ""
echo "✅ All caches cleared!"
echo ""
echo "Next steps:"
echo "1. In Xcode: Product → Clean Build Folder (Shift+Cmd+K)"
echo "2. Run: npx expo start --clear"
echo "3. Then: npx expo run:ios"
echo ""
