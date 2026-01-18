# Backend Connection Guide

## 🎯 Overview

This guide explains how the "Place Trade" button connects to your backend API.

## 📡 Complete Request Flow

### 1. User Presses Button

**File:** `mobile/src/features/trade/screens/TradeScreen.tsx` (line 729)

```tsx
<Button
  variant={tradeType === 'pair' || side === 'long' ? 'success' : 'error'}
  onPress={handlePlaceTrade}  // <-- Button handler
  fullWidth
  disabled={!canPlaceTrade() || isSubmitting}
  loading={isSubmitting}
>
  Place Trade
</Button>
```

### 2. Handler Processes Trade

**Function:** `handlePlaceTrade()` (line 60-142)

```tsx
const handlePlaceTrade = async () => {
  setIsSubmitting(true);
  
  // Build order object based on trade type
  const order = {
    type: 'pair' | 'basket' | 'single',
    theme: selectedTheme,
    pair: selectedPair,
    side: 'long' | 'short',
    orderType: 'market' | 'limit',
    amount: parseFloat(amount),
  };

  // Submit to backend
  const response = await TradeService.submitOrder(order);
  
  if (response.success) {
    setShowSuccess(true);
  } else {
    setError(response.error);
  }
};
```

### 3. TradeService Makes HTTP Request

**File:** `mobile/src/features/trade/services/TradeService.ts`

```tsx
// ✅ NOW CONFIGURED TO YOUR BACKEND
private apiBaseUrl = getApiBaseUrl();

// Dynamic URL based on platform:
// - Web: http://localhost:8000/api/trade/pear
// - Mobile: http://10.0.11.138:8000/api/trade/pear

async submitOrder(order: TradeOrder) {
  const accessToken = await this.getAccessToken(); // From WalletService
  
  if (order.type === 'single') {
    // POST http://localhost:8000/api/trade/pear/orders/spot
    return await this.submitSpotOrder(order, accessToken);
  } else {
    // POST http://localhost:8000/api/trade/pear/positions
    return await this.submitPosition(order, accessToken);
  }
}
```

### 4. Backend Receives Request

**File:** `backend/app/main.py` (line 121)

```python
# Pear router mounted at /api/trade/pear
app.include_router(pear_router, prefix="/api/trade/pear", tags=["Pear Protocol"])
```

**File:** `backend/app/trade/router_pear.py`

Your backend handles these endpoints:
- `POST /api/trade/pear/orders/spot` - Single token trades
- `POST /api/trade/pear/positions` - Pair/basket trades

## 🔐 Authentication Flow

The TradeService automatically gets the access token from WalletService:

```tsx
// TradeService.ts
private async getAccessToken(): Promise<string> {
  const token = WalletService.getAccessToken();
  return token || '';
}
```

### How Authentication Works:

1. **User connects wallet** (Add Wallet button)
2. **WalletService authenticates:**
   ```
   GET  /api/trade/pear/auth/eip712-message?address=0x...
   POST /api/trade/pear/auth/login
   POST /api/trade/pear/agent-wallet
   ```
3. **Access token stored** in AsyncStorage
4. **TradeService uses token** for all API calls

## 🔧 What I Changed

### 1. Updated API Base URL

**Before:**
```tsx
private apiBaseUrl = 'https://hl-v2.pearprotocol.io';
```

**After:**
```tsx
// Dynamic based on platform
const getApiBaseUrl = () => {
  if (Platform.OS === 'web') {
    return 'http://localhost:8000/api/trade/pear';
  }
  return 'http://10.0.11.138:8000/api/trade/pear';
};
```

### 2. Connected to WalletService

**Before:**
```tsx
private async getAccessToken(): Promise<string> {
  return ''; // TODO: implement
}
```

**After:**
```tsx
private async getAccessToken(): Promise<string> {
  const token = WalletService.getAccessToken();
  return token || '';
}
```

## 🧪 Testing the Connection

### Step 1: Start Backend
```bash
cd backend
python3 -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

### Step 2: Start Mobile App
```bash
cd mobile
npm start
```

### Step 3: Connect Wallet
1. Press "Add Wallet" button
2. Enter wallet address: `0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb`
3. Complete authentication flow

### Step 4: Place a Trade
1. Select trade type (Pairs/Baskets/Single)
2. Choose assets
3. Enter amount
4. Press "Place Trade" button

### Step 5: Check Backend Logs

You should see requests in your backend terminal:
```
📥 INCOMING REQUEST: 12:34:56
Method: POST
Path: /api/trade/pear/positions
Headers: {
  'authorization': 'Bearer eyJ...',
  'content-type': 'application/json'
}
```

## 🌐 Platform-Specific URLs

### Web (localhost)
```
http://localhost:8000/api/trade/pear
```

### iOS Simulator
```
http://localhost:8000/api/trade/pear
```

### Android Emulator
```
http://10.0.2.2:8000/api/trade/pear
```
*Note: Update TradeService if using Android*

### Physical Device
```
http://10.0.11.138:8000/api/trade/pear
```
*Replace with your computer's LAN IP*

## 🔍 Debugging

### Check if Backend is Running
```bash
curl http://localhost:8000/health
# Should return: {"status": "healthy"}
```

### Check API Endpoints
```bash
# Visit in browser
http://localhost:8000/docs
```

### View Request/Response in App
Open Metro bundler console to see logs:
```
🔐 Getting EIP-712 message for: 0x742d...
✅ Authentication successful!
📤 Submitting trade order...
✅ Trade placed successfully!
```

### Check Backend Logs
Your backend has debug logging middleware that prints:
- All incoming requests
- Request headers
- Response status codes

## 📝 API Request Format

### Single Token Trade
```json
POST /api/trade/pear/orders/spot
{
  "asset": "BTC",
  "isBuy": true,
  "amount": 100
}
```

### Pair Trade
```json
POST /api/trade/pear/positions
{
  "slippage": 0.01,
  "executionType": "MARKET",
  "leverage": 1,
  "usdValue": 100,
  "longAssets": [{"asset": "ETH", "weight": 1.0}],
  "shortAssets": [{"asset": "BTC", "weight": 1.0}]
}
```

## ✅ Success Response
```json
{
  "success": true,
  "orderId": "order_123",
  "message": "Order executed successfully"
}
```

## ❌ Error Response
```json
{
  "success": false,
  "error": "Insufficient balance"
}
```

## 🚀 Next Steps

1. **Test the connection** - Press the button and check backend logs
2. **Handle edge cases** - Test with no wallet, invalid amounts, etc.
3. **Add production config** - Set up environment variables for production URLs
4. **Monitor requests** - Use network inspector in development

## 💡 Tips

- **CORS is enabled** on backend (line 75-81 in main.py)
- **Debug middleware** logs all requests (line 31-49 in main.py)
- **Access token** is automatically included in all requests
- **Error handling** shows user-friendly messages in modal

## 📞 Need Help?

- Check backend logs for request details
- Check mobile console for client-side errors
- Verify wallet is connected before trading
- Ensure backend is running on port 8000
