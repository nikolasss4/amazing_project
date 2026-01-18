# Debug Logging Guide

## ✅ Debug Statements Added

I've added comprehensive debug logging to help track wallet authentication requests.

---

## 📍 Where Debug Statements Were Added

### 1. **Main Application (`main.py`)**

#### Request/Response Middleware:
```python
====================================================================================================
📥 INCOMING REQUEST: 21:19:14
Method: GET
Path: /api/trade/pear/auth/eip712-message
Client: 10.0.11.138
Headers: {...}
====================================================================================================
```

Shows every request that hits the backend.

#### Health Check:
```python
💚 Health check endpoint called
```

#### Global Exception Handler:
```python
❌ UNHANDLED EXCEPTION
Path: /api/...
Method: POST
Error: ...
```

### 2. **Authentication Endpoints (`router_pear.py`)**

#### Get EIP-712 Message:
```python
================================================================================
🔐 GET EIP-712 MESSAGE REQUEST RECEIVED
Address: 0x742d35...
Client ID: APITRADER
================================================================================
✅ EIP-712 message generated successfully
Domain: {...}
Message timestamp: 1768684754
================================================================================
```

#### Login with Signature:
```python
================================================================================
🔑 LOGIN REQUEST RECEIVED
Method: eip712
Address: 0x742d35...
Client ID: APITRADER
Signature (first 20 chars): 0xaaaaaaaaaaaaaaaa...
================================================================================
```

On success:
```python
✅ LOGIN SUCCESSFUL
Access token generated (first 20 chars): eyJhbGciOiJIUzI1NiI...
================================================================================
```

On failure:
```python
❌ LOGIN FAILED
Error: ...
================================================================================
```

#### Get Agent Wallet:
```python
================================================================================
💼 GET AGENT WALLET REQUEST
User: {...}
================================================================================
Agent wallet status: ACTIVE
Agent wallet address: 0x...
================================================================================
```

---

## 🔍 How to Use for Debugging

### Scenario 1: Mobile App Button Click Testing

**When you tap "Connect Wallet" in the mobile app, look for:**

1. **Request arrives at backend:**
```
====================================================================================================
📥 INCOMING REQUEST: 21:19:14
Method: GET
Path: /api/trade/pear/auth/eip712-message
Client: 10.0.11.138  ← Your mobile device IP
====================================================================================================
```

2. **Endpoint processes request:**
```
🔐 GET EIP-712 MESSAGE REQUEST RECEIVED
Address: 0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb
```

3. **Pear Protocol API called:**
```
HTTP Request: GET https://hl-v2.pearprotocol.io/auth/eip712-message?...
```

4. **Success response:**
```
✅ EIP-712 message generated successfully
📤 RESPONSE: 200
```

**If you DON'T see these logs:** The mobile app isn't reaching the backend!

---

### Scenario 2: Login Attempt

**After signing, you should see:**

1. **Login request arrives:**
```
====================================================================================================
📥 INCOMING REQUEST
Method: POST
Path: /api/trade/pear/auth/login
Client: 10.0.11.138
====================================================================================================
```

2. **Login endpoint receives data:**
```
🔑 LOGIN REQUEST RECEIVED
Address: 0x742d...
Signature (first 20 chars): 0xaaaaaaaaaa...
```

3. **Authentication with Pear:**
```
HTTP Request: POST https://hl-v2.pearprotocol.io/auth/login
```

4. **Result:**
   - Success: `✅ LOGIN SUCCESSFUL`
   - Failure: `❌ LOGIN FAILED` + error details

---

### Scenario 3: No Requests Arriving

**If you see NO logs when tapping the button:**

**Problem:** Mobile app can't reach backend

**Check:**
1. Is backend running? `ps aux | grep uvicorn`
2. Is it on `0.0.0.0:8000`? Check terminal startup logs
3. Is mobile app using correct IP? Check `WalletService.ts` API_BASE_URL
4. Are both on same WiFi network?
5. Is firewall blocking port 8000?

---

## 🧪 Quick Tests

### Test 1: Backend is Running
```bash
curl http://localhost:8000/health
```

**Expected in terminal:**
```
💚 Health check endpoint called
```

### Test 2: Backend is Accessible from LAN
```bash
curl http://10.0.11.138:8000/health
```

**Expected in terminal:**
```
====================================================================================================
📥 INCOMING REQUEST
Method: GET
Path: /health
Client: 10.0.11.138
====================================================================================================
💚 Health check endpoint called
📤 RESPONSE: 200
====================================================================================================
```

### Test 3: EIP-712 Endpoint Works
```bash
curl "http://10.0.11.138:8000/api/trade/pear/auth/eip712-message?address=0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb&client_id=APITRADER"
```

**Expected in terminal:**
```
📥 INCOMING REQUEST
Path: /api/trade/pear/auth/eip712-message
🔐 GET EIP-712 MESSAGE REQUEST RECEIVED
Address: 0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb
✅ EIP-712 message generated successfully
```

---

## 📊 What Each Emoji Means

- 📥 **Incoming Request** - Request received by backend
- 📤 **Response** - Response sent back
- 🔐 **EIP-712 Message** - Getting signature message
- 🔑 **Login** - Authentication attempt
- 💼 **Agent Wallet** - Agent wallet operations
- 💚 **Health Check** - Health endpoint called
- ✅ **Success** - Operation succeeded
- ❌ **Error** - Operation failed
- ⚠️ **Warning** - Potential issue

---

## 🎯 Common Debugging Scenarios

### Scenario: "Button does nothing"

**Look for:**
1. Any 📥 logs when button is tapped?
   - **YES:** Button works, request reaches backend ✅
   - **NO:** Mobile app networking issue ❌

### Scenario: "Authentication fails"

**Look for:**
1. Does 🔐 EIP-712 request succeed? (✅ symbol)
2. Does 🔑 Login request arrive?
3. What error message after ❌ LOGIN FAILED?

Common errors:
- `500 Error`: Mock signature rejected (expected!)
- `Network error`: Can't reach Pear Protocol API
- `401/403`: Invalid signature format

### Scenario: "Agent wallet issues"

**Look for:**
1. 💼 GET AGENT WALLET REQUEST logs
2. Status returned: NOT_FOUND, ACTIVE, or EXPIRED?
3. Any errors in the response?

---

## 🚀 Testing the Complete Flow

### Step-by-Step with Expected Logs:

1. **Open mobile app, go to Trade screen**
   - No logs yet (no requests)

2. **Tap "Connect Wallet" button**
   - Expected: Nothing (modal just opens)

3. **Enter address and tap "Connect Wallet" in modal**
   
   **Expected Backend Logs:**
   ```
   📥 INCOMING REQUEST: GET /api/trade/pear/auth/eip712-message
   Client: 10.0.11.138
   🔐 GET EIP-712 MESSAGE REQUEST RECEIVED
   Address: 0x742d35...
   ✅ EIP-712 message generated successfully
   📤 RESPONSE: 200
   
   📥 INCOMING REQUEST: POST /api/trade/pear/auth/login
   🔑 LOGIN REQUEST RECEIVED
   Address: 0x742d35...
   Signature: 0xaaaa...
   ❌ LOGIN FAILED
   Error: ...
   📤 RESPONSE: 500
   ```

4. **If you see these logs:**
   - ✅ Everything is working!
   - ✅ Mobile → Backend communication works
   - ✅ Backend → Pear Protocol communication works
   - ❌ Mock signature rejected (expected!)

5. **If you DON'T see logs:**
   - Problem is in mobile app networking
   - Check API_BASE_URL in WalletService.ts
   - Check network connectivity

---

## 📝 Summary

**Debug logging added to:**
- ✅ All incoming requests (middleware)
- ✅ EIP-712 message endpoint
- ✅ Login endpoint
- ✅ Agent wallet endpoints
- ✅ Global exception handler
- ✅ Health check endpoint

**What to look for:**
- 📥 Requests arriving from mobile device IP
- 🔐 EIP-712 processing
- 🔑 Login attempts
- ✅/❌ Success/failure indicators

**Next step:** Tap the "Connect Wallet" button in your mobile app and watch the backend terminal for these logs!

---

**Backend terminal is ready to show detailed logs! Test the wallet connection now and watch what happens!** 🔍
