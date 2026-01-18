# 🚀 Quick Debug Steps - Start Here!

## 30-Second Test

### 1. Start Backend (if not running)
```bash
cd backend
python3 -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

### 2. Start Mobile App (if not running)
```bash
cd mobile
npm start
# Press 'w' for web, 'i' for iOS simulator, or 'a' for Android
```

### 3. Find the Test Button
Look at the **top-right corner** of your TradeScreen.

You'll see two buttons:
- 🧪 **Blue Flask Icon** (new test button)
- 💼 **"Add Wallet"** button

### 4. Press the Flask Button (🧪)

### 5. Open Console
- **Metro Bundler:** Check the terminal where you ran `npm start`
- **Chrome DevTools:** If using web, press F12
- **Expo DevTools:** Press `j` in Metro terminal to open

### 6. Read the Results

**✅ If you see this:**
```
✅ ALL TESTS PASSED!
Your backend is accessible and working correctly.
```
→ **Backend is working!** Now try the wallet connection.

**❌ If you see this:**
```
❌ FAILED!
Error: connect ECONNREFUSED
💡 Connection refused - backend might not be running or wrong IP
```
→ **Backend not accessible.** Check the solutions below.

## Next Step: Try Wallet Connection

If tests pass, try connecting the wallet:

1. Press **"Add Wallet"** button
2. Enter: `0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb`
3. Press **"Connect Wallet"**
4. Watch the console for detailed logs
5. Check backend terminal for incoming requests

**You should see:**
```
================================================================================
🔐 STEP 1: Getting EIP-712 message
================================================================================
⏳ Making GET request...
✅ Response received!
```

## Quick Fixes

### Backend Not Running
```bash
# Check if backend is running
lsof -i :8000

# If nothing shows up, start it:
cd backend
python3 -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

### Wrong IP Address (Mobile Device)
```bash
# Get your computer's IP
ifconfig | grep "inet " | grep -v 127.0.0.1

# Update these files with your IP:
# 1. mobile/src/features/wallet/services/WalletService.ts (line 20)
# 2. mobile/src/features/trade/services/TradeService.ts (line 29)
# Change: http://10.0.11.138:8000
# To: http://YOUR_IP:8000
```

### Firewall Blocking
```bash
# Mac: Allow incoming connections in System Preferences > Security & Privacy > Firewall
# Or temporarily disable firewall for testing
```

## What to Report

After testing, let me know:
1. ✅ or ❌ - Did the test button pass or fail?
2. 📝 - Copy/paste the console output
3. 🖥️ - Copy/paste any backend terminal output
4. 📱 - What platform are you testing on? (web/iOS/Android)

## Visual Guide

```
┌─────────────────────────────────────────────────────┐
│ New Trade                                   🧪  💼  │ ← Look here!
│ Long one asset, short another                       │
├─────────────────────────────────────────────────────┤
│                                                      │
│         [Pairs] [Baskets] [Single]                  │
│                                                      │
└─────────────────────────────────────────────────────┘

🧪 = Test Connection Button (PRESS THIS FIRST!)
💼 = Add Wallet Button (try this after test passes)
```

## Expected Flow

```
Press 🧪 Test Button
     ↓
Check Console
     ↓
✅ Tests Pass → Try Add Wallet Button
     ↓
Enter Address & Connect
     ↓
Check Console for detailed logs
     ↓
Check Backend Terminal for requests
     ↓
✅ Success! API calls working
```

## That's It!

The test button will tell you if your backend is accessible. The rest of the logging will show you exactly what's happening during wallet connection.

**Run the test now and let me know what happens!** 🚀
