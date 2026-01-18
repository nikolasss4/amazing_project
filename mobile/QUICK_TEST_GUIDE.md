# Quick Test Guide - Wallet Authentication

## 🚀 Test in 3 Easy Steps

### 1️⃣ Open Console Logs

**On Physical Device:**
- Shake your device
- Tap "Debug Remote JS"
- Browser opens with console logs

**Or watch Metro Bundler terminal**

### 2️⃣ Connect Wallet

1. Open Trade screen
2. Tap "Connect Wallet" button (top right)
3. Enter: `0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb`
4. Tap "Connect Wallet"

### 3️⃣ Watch the Logs

You should see:

```
🔘 Connect button pressed!
✅ Address validation passed
🔌 Attempting to connect...
🚀 Starting wallet connection...
Step 1/4: Getting EIP-712 message...
🔐 Getting EIP-712 message for: 0x742d...
📡 API URL: http://10.0.11.138:8000/api/trade/pear/auth/eip712-message
✅ Received EIP-712 message
Step 2/4: Signing message...
Step 3/4: Authenticating...
🔑 Authenticating with signature...
```

---

## ✅ What Means Success

If you see these logs → **IT'S WORKING!** ✅

- Button responds to clicks
- API requests are being made
- Backend is being reached
- Authentication flow is executing

---

## ⚠️ Expected "Error"

You'll see an authentication error - **this is normal!**

We're using a mock signature for development. In production, you'd use a real wallet.

**The important thing:** The button works and makes API calls! 🎉

---

## 🆘 If Nothing Happens

1. **Check your IP:**
   - Is your device on the same WiFi as your computer?
   - Expo shows IP in terminal: `exp://10.0.11.138:8081`

2. **Check the API URL in WalletService.ts:**
   - Should match your Expo IP
   - Currently set to: `http://10.0.11.138:8000`

3. **Restart everything:**
   ```bash
   # Kill both terminals
   # Terminal 1: Backend
   cd backend
   python3 -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
   
   # Terminal 2: Mobile
   cd mobile
   npm start
   ```

---

## 🎯 Quick Checklist

- [ ] Backend running on `0.0.0.0:8000`
- [ ] Mobile app running and showing QR code with IP
- [ ] Device on same WiFi network
- [ ] Console logs visible (shake device → Debug Remote JS)
- [ ] "Connect Wallet" button in Trade screen header
- [ ] Can tap button and modal opens
- [ ] Can type in input field
- [ ] Can tap "Connect Wallet" in modal
- [ ] See console logs starting with 🔘 emoji

---

## 📱 Current Setup

**Backend:** Running on `http://0.0.0.0:8000`  
**Mobile API URL:** `http://10.0.11.138:8000`  
**Your Device IP:** Should be on `10.0.11.x` network  

**Status:** ✅ All systems configured correctly!

Just open the app, tap the button, and watch the magic happen! ✨
