# Quick Start Guide

Get RiskLaba Mobile running on your iOS simulator in 5 minutes.

## Prerequisites Check

Run these commands to verify your setup:

```bash
# Check Node.js (need 18+)
node --version

# Check npm
npm --version

# Check Xcode (need 15+)
xcodebuild -version
```

If any are missing:
- Node.js: Download from [nodejs.org](https://nodejs.org/)
- Xcode: Install from Mac App Store

## Installation

1. **Navigate to mobile directory**
   ```bash
   cd mobile
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

   This takes 2-3 minutes. Grab coffee ☕

3. **Start Metro bundler**
   ```bash
   npm start
   ```

4. **Open iOS app**

   Press `i` in the terminal, or in a new terminal:
   ```bash
   npm run ios
   ```

   First build takes 3-5 minutes. Subsequent builds are faster.

## Troubleshooting

### "Command not found: expo"
```bash
npm install -g expo-cli
```

### "Unable to boot simulator"
1. Open Xcode
2. Go to Window → Devices and Simulators
3. Click "+" to add iPhone 15 simulator
4. Try again

### "Metro bundler not running"
```bash
# Kill any existing processes
killall -9 node
# Start fresh
npm start
```

### "Pods installation failed"
```bash
cd ios
pod install
cd ..
npm run ios
```

### Build errors
```bash
# Clean build
cd ios
rm -rf build
rm -rf Pods
rm Podfile.lock
pod install
cd ..
npm run ios
```

## What You Should See

After successful launch:

1. **Trade Screen** (default):
   - Pair selector chips (BTC/USD, ETH/USD, etc.)
   - TradingView chart
   - Trade ticket (Buy/Sell toggle, amount input)
   - Balance chip at top

2. **Bottom Navigation**:
   - Left pill: 3 icons (Trade, Community, Learn)
   - Right pill: AI sparkles icon

3. **Test the features**:
   - Tap pairs to switch charts
   - Enter amount and place trade (shows success modal)
   - Tap Community tab → see leaderboard
   - Tap Learn tab → answer scenario questions
   - Tap AI button → opens assistant overlay

## Quick Feature Tour

### Trade Page
- Select a trading pair
- Choose timeframe (1H, 1D, 1W, 1M)
- Toggle Buy/Sell
- Enter amount
- Place order → success modal

### Community Page
- Scroll leaderboard (ranked traders)
- Swipe celebrity portfolio cards
- Read social feed with sentiment badges

### Learn Page
- Read scenario
- Select Up/Down/Flat
- Card flips to show answer
- See XP and streak update
- Tap "Next Scenario"

### AI Assistant
- Tap AI button (bottom right)
- Screenshot auto-captured
- Type question
- Get contextual response
- Mock AI for now (keyword matching)

## Development Workflow

### Hot Reload
- Save file → app reloads automatically
- Shake device → open dev menu
- Press `r` in terminal → reload manually

### Debug
- Shake device → Enable Debug Mode
- Chrome DevTools: Press `j` in terminal
- React DevTools: Install from Chrome Web Store

### Common Commands
```bash
npm start          # Start Metro
npm run ios        # Run iOS
npm run android    # Run Android
npm run lint       # Check TypeScript
```

## File Structure at a Glance

```
mobile/
├── src/
│   ├── app/           # Navigation, theme, stores
│   ├── features/      # Trade, Community, Learn, Assistant
│   └── ui/            # Shared components
├── App.tsx            # Entry point
└── package.json
```

## Making Changes

### Edit a Screen
```bash
# Open Trade screen
code src/features/trade/screens/TradeScreen.tsx
```

### Add a Component
```bash
# Create in ui/components/
code src/ui/components/MyComponent.tsx
```

### Update Theme
```bash
# Edit design tokens
code src/app/theme/tokens.ts
```

### Change Navigation
```bash
# Edit tab bar
code src/app/navigation/CustomTabBar.tsx
```

## Next Steps

1. **Read the README**: Full documentation
2. **Read ARCHITECTURE.md**: Understand the structure
3. **Explore features**: Check out each screen's code
4. **Connect backend**: Replace mock data with real APIs

## Need Help?

- Check README.md for detailed docs
- Review ARCHITECTURE.md for design decisions
- Check Expo docs: https://docs.expo.dev/
- React Native docs: https://reactnative.dev/

---

**You're ready to build! 🚀**
