# 🔧 Wallet Connection Testing Guide

## What I've Done

I've added comprehensive debugging tools to help identify exactly why the wallet connection isn't triggering API calls to your backend.

## 🎯 Quick Test (Easiest Way)

### Step 1: Run Your App

```bash
cd mobile
npm start
```

### Step 2: Look for the Test Button

In your TradeScreen, you'll now see a **blue flask icon** (🧪) next to the "Add Wallet" button in the top-right corner.

### Step 3: Press the Test Button

When you press it, check your Metro bundler console. You'll see:

```
🚀 STARTING CONNECTION TESTS
================================================================================
⚙️  CURRENT API CONFIGURATION
🌐 Platform: web (or ios/android)
📡 API Base URL: http://localhost:8000
================================================================================

🏥 TEST 1: Health Endpoint
================================================================================
📡 URL: http://localhost:8000/health
⏳ Making request...
✅ SUCCESS!
📊 Status: 200
📦 Data: {"status":"healthy","app":"gamified-trading-api"}
================================================================================

🔐 TEST 2: EIP-712 Message Endpoint
================================================================================
📡 URL: http://localhost:8000/api/trade/pear/auth/eip712-message
📍 Test Address: 0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb
⏳ Making request...
✅ SUCCESS!
📊 Status: 200
================================================================================

✅ ALL TESTS PASSED!
Your backend is accessible and working correctly.
```

### Step 4: Check Backend Logs

In your backend terminal, you should see:

```
====================================================================================================
📥 INCOMING REQUEST: 12:34:56
Method: GET
Path: /health
Client: 127.0.0.1 (or your device IP)
====================================================================================================
```

## ✅ If Tests Pass

If the test button works, your backend IS accessible! Try connecting wallet again and check the detailed logs:

1. Press "Add Wallet"
2. Enter address: `0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb`
3. Press "Connect Wallet"
4. Watch the console for detailed step-by-step logging

You'll see:

```
================================================================================
🔘 WALLET CONNECT BUTTON PRESSED
================================================================================
📝 Input address: 0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb
🌐 Current platform: web
✅ Address validation passed
🔌 Calling store.connect()...

================================================================================
🔐 STEP 1: Getting EIP-712 message
================================================================================
📍 Address: 0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb
🌐 Platform: web
📡 API Base URL: http://localhost:8000
📡 Full URL: http://localhost:8000/api/trade/pear/auth/eip712-message
⏳ Making GET request...
✅ Response received!
📊 Status: 200

================================================================================
✍️  STEP 2: Signing EIP-712 message
================================================================================
⚠️  Using MOCK signature (production would use WalletConnect)
✅ Mock signature generated

================================================================================
🔑 STEP 3: Authenticating with signature
================================================================================
📡 URL: http://localhost:8000/api/trade/pear/auth/login
⏳ Making POST request...
✅ Authentication successful!

✅ store.connect() completed successfully!
```

## ❌ If Tests Fail

### Error: ECONNREFUSED

```
❌ FAILED!
Error: connect ECONNREFUSED 127.0.0.1:8000
💡 Connection refused - backend might not be running or wrong IP
```

**Solution:**
1. Check backend is running: `lsof -i :8000`
2. If not running, start it: `cd backend && python3 -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000`

### Error: ETIMEDOUT

```
❌ FAILED!
Error: timeout of 5000ms exceeded
💡 Connection timeout - check your network/firewall
```

**Solution for Web:**
- Backend should be accessible at `localhost:8000`
- Try: `curl http://localhost:8000/health`

**Solution for Mobile Device:**
1. Get your Mac's IP address:
   ```bash
   ifconfig | grep "inet " | grep -v 127.0.0.1
   # Example output: inet 10.0.11.138
   ```

2. Update IP in both service files:
   - `mobile/src/features/wallet/services/WalletService.ts` (line 20)
   - `mobile/src/features/trade/services/TradeService.ts` (line 29)
   
   Change `http://10.0.11.138:8000` to your actual IP

3. Make sure your phone/simulator is on the same network as your Mac

4. Test connection from device browser: `http://YOUR_IP:8000/health`

### Error: Network request failed

```
❌ FAILED!
Error: Network request failed
```

**Possible causes:**
1. Firewall blocking connections
2. Backend not listening on 0.0.0.0 (check it says `--host 0.0.0.0` in the uvicorn command)
3. Wrong IP address in mobile app

## 🔍 Detailed Logging

All API calls now have extensive logging showing:

- **Request details:** URL, method, parameters
- **Response details:** Status code, data
- **Error details:** Error type, message, network info
- **Step progression:** Each authentication step is logged

## 📱 Platform-Specific Notes

### Web (localhost)
- Uses `http://localhost:8000`
- Should work immediately if backend is running
- Check browser console for logs

### iOS Simulator
- Uses `http://localhost:8000` (simulator shares host network)
- Check Metro bundler console for logs
- May need to enable network access in Xcode

### Android Emulator
- Needs special IP: `http://10.0.2.2:8000`
- Update both service files to use `10.0.2.2` instead of `localhost`
- Check Metro bundler console for logs

### Physical Device
- Needs your computer's LAN IP (e.g., `http://10.0.11.138:8000`)
- Device must be on same WiFi network
- Check router isn't isolating devices (AP Isolation)

## 🧹 After Debugging

Once you've identified and fixed the issue, remove the test button:

1. Remove the test button from `TradeScreen.tsx` (search for "DEBUG: Test Connection Button")
2. Remove the import: `import { runConnectionTests, getAPIConfig } from '../../wallet/services/testConnection';`
3. Remove the handler: `handleTestConnection`
4. Optional: Keep the detailed logging in WalletService for production debugging

## 🎯 Next Steps

1. **Press the test button** (🧪) to verify backend connectivity
2. **Check console logs** for detailed error messages
3. **Try wallet connection** and follow the step-by-step logs
4. **Check backend logs** to see if requests are arriving

If tests pass but wallet connection still fails, the issue is in the authentication flow (signature, token storage, etc.) not connectivity.

## 💡 Common Issues & Solutions

### Issue: "Failed to get authentication message"
- Backend not running
- Wrong API URL configured
- Firewall blocking connection

### Issue: "Authentication failed"
- Mock signature not accepted by backend
- Backend expecting real wallet signature
- Token storage failing

### Issue: Connection works from test script but not from app
- Different IP configuration between services
- CORS issue (check backend allows your origin)
- App state management issue

### Issue: Wallet connects but trade button doesn't work
- Access token not being retrieved correctly
- Token expired or invalid
- Different API base URL in TradeService
