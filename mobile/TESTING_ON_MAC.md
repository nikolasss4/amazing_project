# Testing RiskLaba Mobile on Mac

Complete guide to running and testing the app on your Mac.

## Method 1: iOS Simulator (Recommended)

### Prerequisites Check

```bash
# Check if Xcode Command Line Tools installed
xcode-select -p
```

If you see a path like `/Applications/Xcode.app/Contents/Developer`, you're good!

If not:

```bash
# Install Xcode Command Line Tools
xcode-select --install

# This opens a dialog - click Install
# Takes 2-3 minutes
```

### Install & Run

```bash
# 1. Navigate to project
cd /Users/host/Desktop/risklaba/mobile

# 2. Install dependencies (first time only)
npm install

# 3. Start Metro bundler
npm start
```

You'll see:

```
› Press i │ open iOS simulator
› Press w │ open web
› Press r │ reload app
```

**Press `i`** to launch iOS Simulator.

### What Happens:

1. ✅ iOS Simulator launches (takes 30-60 seconds first time)
2. ✅ App builds (takes 2-3 minutes first time)
3. ✅ App installs on virtual iPhone
4. ✅ App opens automatically

**Subsequent launches**: Only takes 10-20 seconds!

### Simulator Controls

- **Rotate**: `Cmd + ←` or `Cmd + →`
- **Home**: `Cmd + Shift + H`
- **Lock Screen**: `Cmd + L`
- **Screenshot**: `Cmd + S`
- **Shake (for dev menu)**: `Cmd + Ctrl + Z`

### Test the App

Once app is running:

1. **Trade Screen** (default):
   - Tap different pairs → chart should update
   - Select timeframe → chart interval changes
   - Enter amount → type in number
   - Toggle Buy/Sell → colors change
   - Tap "Place Order" → success modal appears

2. **Community Tab** (middle icon):
   - See leaderboard table
   - Swipe celebrity cards horizontally
   - Scroll social feed

3. **Learn Tab** (right icon):
   - Read scenario
   - Tap Up/Down/Flat
   - Card flips to show answer
   - XP bar updates
   - Tap "Next Scenario"

4. **AI Assistant** (sparkles icon, bottom right):
   - Tap to open overlay
   - Screenshot captured automatically
   - Type message → send
   - AI responds after brief delay
   - Tap X to close

### Troubleshooting Simulator

**"No devices available"**
```bash
# Open Xcode
# Go to: Window → Devices and Simulators
# Click "+" to add iPhone 15
# Try npm run ios again
```

**Simulator is slow**
```bash
# In Simulator: I/O → Show Simulator Keyboard (uncheck)
# Reduces lag
```

**Build failed**
```bash
cd ios
pod install
cd ..
npm run ios
```

---

## Method 2: Web Browser (Fastest)

Perfect for quick UI checks.

### Run

```bash
cd /Users/host/Desktop/risklaba/mobile
npm install
npm start
# Press 'w'
```

**Or directly:**
```bash
npm run web
```

Opens `http://localhost:19006` in your browser.

### What Works

✅ All screens visible
✅ Navigation works
✅ Button interactions
✅ Styling and layout
✅ Most animations
✅ Mock data displays

### What Doesn't Work

❌ AI Assistant screenshot capture (shows placeholder)
❌ Haptic feedback (no vibration in browser)
❌ Some native animations may differ
❌ Camera/device APIs

### Best Use Cases

- Quick visual checks
- Testing layout changes
- Verifying navigation
- Debugging UI issues

---

## Method 3: Physical iPhone

If you have an iPhone handy.

### Setup

1. **Install Expo Go** from App Store (free)

2. **Run on Mac:**
   ```bash
   cd /Users/host/Desktop/risklaba/mobile
   npm install
   npm start
   ```

3. **Connect:**
   - Ensure Mac and iPhone on same WiFi
   - Open Camera app on iPhone
   - Scan QR code shown in terminal
   - App opens in Expo Go

### Benefits

✅ Real device performance
✅ All native features work
✅ True haptic feedback
✅ Accurate touch interactions
✅ Real camera/sensors

---

## Method 4: Android Emulator

If you prefer Android testing.

### Prerequisites

Download Android Studio:
https://developer.android.com/studio

### Setup (One Time)

```bash
# Install Android Studio
# Open Android Studio
# Go to: More Actions → Virtual Device Manager
# Create new device (Pixel 5)
# Start emulator
```

### Run

```bash
cd /Users/host/Desktop/risklaba/mobile
npm install
npm start
# Press 'a' for Android
```

---

## Recommended Testing Order

### First Launch (Comprehensive)

1. **Web** (30 sec) - Verify compilation
   ```bash
   npm start → press 'w'
   ```

2. **iOS Simulator** (5 min) - Full testing
   ```bash
   npm start → press 'i'
   ```

3. **Test all features** (10 min) - See checklist below

### Daily Development

Just iOS Simulator:
```bash
npm start → press 'i'
```

Fast reload on save!

---

## Testing Checklist

Use this to verify everything works:

### 🎯 Trade Screen
- [ ] App launches successfully
- [ ] Balance shows "$10,000"
- [ ] Can see 5 trading pairs (BTC/USD, ETH/USD, AAPL, TSLA, SOL/USD)
- [ ] Tap pair → chart updates
- [ ] Timeframe chips (1H, 1D, 1W, 1M) → chart changes
- [ ] Buy/Sell toggle → colors change (green/red)
- [ ] Market/Limit radio buttons work
- [ ] Can type in amount field
- [ ] "Place Order" button disabled when empty
- [ ] Tap "Place Order" → success modal appears
- [ ] Modal auto-dismisses after 2 seconds

### 👥 Community Screen
- [ ] Tap Community tab → navigates
- [ ] Leaderboard shows 5 users
- [ ] Period toggle (today/week/month) works
- [ ] Can scroll leaderboard table
- [ ] Celebrity portfolios carousel → swipe left/right
- [ ] See 3 celebrity cards
- [ ] Social feed shows 4 posts
- [ ] Sentiment badges visible (Bullish/Bearish/Neutral)
- [ ] Ticker pills ($BTC, etc.) visible
- [ ] Can scroll entire page

### 🎓 Learn Screen
- [ ] Tap Learn tab → navigates
- [ ] XP shows "0" initially
- [ ] Streak shows "0 day streak"
- [ ] Scenario text displays
- [ ] Three answer buttons (Up/Down/Flat) visible
- [ ] Tap answer → card flips smoothly
- [ ] See correct/incorrect feedback
- [ ] XP updates (+10)
- [ ] Explanation text shows
- [ ] Tap "Next Scenario" → new card loads
- [ ] Progress bar animates

### 🤖 AI Assistant
- [ ] AI button visible (bottom right, sparkles icon)
- [ ] Tap AI button → overlay opens
- [ ] Screenshot thumbnail visible at top
- [ ] Empty state message shows
- [ ] Can type in text input
- [ ] Send button enabled when text entered
- [ ] Tap send → user message appears
- [ ] Loading indicator appears
- [ ] AI response appears after ~1 second
- [ ] Can send multiple messages
- [ ] Tap X to close → returns to previous screen
- [ ] AI button works from all 3 tabs

### 🧭 Navigation
- [ ] Bottom navigation always visible
- [ ] Left pill has 3 icons
- [ ] Right pill has sparkles icon
- [ ] Tap icons → navigation works
- [ ] Active tab highlighted in blue
- [ ] Glass blur effect visible on nav
- [ ] Nav persists when scrolling pages

### 🎨 UI/UX
- [ ] Dark theme (black background)
- [ ] Glass panels have frosted blur
- [ ] All text readable (white/gray)
- [ ] Buttons animate on press (scale down)
- [ ] No visual glitches
- [ ] Smooth scrolling
- [ ] Consistent spacing
- [ ] Icons render correctly

### Performance
- [ ] App launches in <5 seconds
- [ ] Animations run smoothly (no lag)
- [ ] Navigation instant (<300ms)
- [ ] No crashes
- [ ] No console errors (check Metro terminal)

---

## Debugging

### View Logs

**Metro terminal** shows:
- Console.logs from app
- Errors and warnings
- Build status

**Simulator logs:**
```bash
# While simulator running:
xcrun simctl spawn booted log stream --predicate 'processImagePath endswith "RiskLaba"'
```

### React DevTools

```bash
# In Metro terminal, press 'j'
# Opens Chrome with React DevTools
```

### Reload App

- **Fast Refresh**: Automatic on file save
- **Full Reload**: Press `r` in Metro terminal
- **Clear Cache**:
  ```bash
  npm start -- --clear
  ```

### Common Issues

**"Module not found"**
```bash
npm install
npm start
```

**"Build failed"**
```bash
cd ios
rm -rf Pods
rm Podfile.lock
pod install
cd ..
npm run ios
```

**"Port 8081 already in use"**
```bash
killall -9 node
npm start
```

**Simulator frozen**
```bash
# Quit Simulator
# Open Activity Monitor
# Kill any "Simulator" processes
# Try again
```

---

## Recording Demo

### Take Screenshots

**In Simulator**: `Cmd + S`
Saves to Desktop

### Record Video

**In Simulator**:
1. Right-click simulator window
2. Click "Record Screen"
3. Do demo
4. Click stop in menu bar

Or use QuickTime:
1. Open QuickTime
2. File → New Screen Recording
3. Click record button
4. Select Simulator window
5. Do demo
6. Click stop

---

## Next Steps After Testing

Once you've verified everything works:

1. **Read ARCHITECTURE.md** - Understand structure
2. **Review code** - Check out key files
3. **Plan backend** - See DEVELOPMENT_CHECKLIST.md
4. **Start building** - Pick a feature to enhance

---

## Quick Commands Reference

```bash
# Start development server
npm start

# iOS Simulator
npm run ios

# Web browser
npm run web

# Android emulator
npm run android

# Clear cache
npm start -- --clear

# Kill all Node processes
killall -9 node

# Reinstall dependencies
rm -rf node_modules
npm install
```

---

## Getting Help

**Expo docs**: https://docs.expo.dev/
**React Native docs**: https://reactnative.dev/
**Simulator guide**: https://developer.apple.com/documentation/xcode/running-your-app-in-simulator-or-on-a-device

**Check logs for errors** - Most issues show clear error messages in Metro terminal!

---

**Ready to test? Run `npm start` and press `i`! 🚀**
