# Pear Protocol Authentication - How It Works

## Overview

The Pear Protocol authentication system allows users to securely authenticate using their Ethereum wallets and manage agent wallets for automated trading on Hyperliquid. This document explains how the implementation works.

## Architecture

```
┌─────────────┐         ┌──────────────┐         ┌─────────────────┐
│   Frontend  │────────▶│   Backend    │────────▶│ Pear Protocol  │
│  (Wallet)   │◀────────│   FastAPI    │◀────────│      API       │
└─────────────┘         └──────────────┘         └─────────────────┘
      │                        │                          │
      │  1. Sign EIP-712      │   2. Forward request    │
      │     message           │      with signature      │
      │                        │                          │
      │  3. Receive JWT       │   4. Get JWT tokens     │
      │     tokens             │                          │
      └────────────────────────┴──────────────────────────┘
```

## Complete Authentication Flow

### 1. **Get EIP-712 Message** (`GET /api/trade/pear/auth/eip712-message`)

**What happens:**
- Frontend requests a typed message structure for the user's wallet address
- Backend forwards this request to Pear Protocol API
- Pear Protocol generates a timestamped EIP-712 message

**Code Flow:**
```python
# Router: router_pear.py
@router.get("/auth/eip712-message")
async def get_eip712_message(address: str, client_id: str):
    return await service.get_eip712_message(address, client_id)

# Service: pear_service.py
async def get_eip712_message(self, address: str, client_id: str):
    response = await self._request(
        "GET",
        f"/auth/eip712-message?address={address}&clientId={client_id}"
    )
    return PearEIP712MessageResponse(**response)
```

**Response Example:**
```json
{
  "domain": {
    "name": "Pear Protocol",
    "version": "1",
    "chainId": 42161,
    "verifyingContract": "0x0000000000000000000000000000000000000001"
  },
  "types": {
    "Authentication": [
      {"name": "address", "type": "address"},
      {"name": "clientId", "type": "string"},
      {"name": "timestamp", "type": "uint256"},
      {"name": "action", "type": "string"}
    ]
  },
  "message": {
    "address": "0x742d35cc6634c0532925a3b844bc9e7595f0beb",
    "clientId": "APITRADER",
    "timestamp": 1768682226,
    "action": "authenticate"
  }
}
```

### 2. **User Signs Message with Wallet**

**What happens:**
- Frontend uses Web3 library (ethers.js, web3.js) to sign the EIP-712 message
- User approves signature in their wallet (MetaMask, WalletConnect, etc.)
- Signature is cryptographically bound to user's private key

**Frontend Code Example:**
```javascript
// Using ethers.js
const signature = await signer._signTypedData(
  eipData.domain,
  eipData.types,
  eipData.message
);
```

### 3. **Login with Signature** (`POST /api/trade/pear/auth/login`)

**What happens:**
- Frontend sends wallet address and signature to backend
- Backend forwards to Pear Protocol for verification
- Pear Protocol verifies signature matches address
- If valid, returns JWT access token and refresh token

**Code Flow:**
```python
# Router: router_pear.py
@router.post("/auth/login")
async def login_with_signature(request: PearLoginRequest):
    return await service.login_with_signature(request)

# Service: pear_service.py
async def login_with_signature(self, request: PearLoginRequest):
    response = await self._request("POST", "/auth/login", data=request.model_dump())
    auth_response = PearAuthTokenResponse(**response)
    
    # Store token for subsequent requests
    self.set_access_token(auth_response.access_token)
    
    return auth_response
```

**Request:**
```json
{
  "method": "eip712",
  "address": "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb",
  "client_id": "APITRADER",
  "details": {
    "signature": "0x..."
  }
}
```

**Response:**
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refresh_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "expires_in": 3600,
  "token_type": "Bearer"
}
```

### 4. **Token Management**

**Access Token Storage:**
```python
def set_access_token(self, token: str) -> None:
    """Store access token and reset HTTP client to use it."""
    self._access_token = token
    if self._client:
        self._client = None  # Force recreation with new token
```

**HTTP Client Creation:**
```python
async def _get_client(self) -> httpx.AsyncClient:
    if self._client is None:
        auth_token = self._access_token or self.api_key
        headers = {"Content-Type": "application/json"}
        
        # Only add Authorization if token exists (important!)
        if auth_token:
            headers["Authorization"] = f"Bearer {auth_token}"
        
        self._client = httpx.AsyncClient(
            base_url=self.base_url,
            headers=headers,
            timeout=30.0
        )
    return self._client
```

### 5. **Token Refresh** (`POST /api/trade/pear/auth/refresh`)

**What happens:**
- When access token expires (typically after 1 hour)
- Frontend sends refresh token to get new access token
- Backend gets new tokens from Pear Protocol

**Code:**
```python
async def refresh_access_token(self, refresh_token: str):
    response = await self._request(
        "POST",
        "/auth/refresh",
        data={"refresh_token": refresh_token}
    )
    auth_response = PearAuthTokenResponse(**response)
    self.set_access_token(auth_response.access_token)
    return auth_response
```

## Agent Wallet Management

Agent wallets allow Pear Protocol to execute trades on Hyperliquid on behalf of the user.

### Agent Wallet Lifecycle

```
NOT_FOUND ──create──▶ PENDING_APPROVAL ──approve──▶ ACTIVE
                                                        │
                                                        │ (after 180 days)
                                                        ▼
                                                     EXPIRED
                                                        │
                                                        └──create──▶ ...
```

### 6. **Check Agent Wallet Status** (`GET /api/trade/pear/agent-wallet`)

**What happens:**
- Check if user has an existing agent wallet
- Returns status: NOT_FOUND, ACTIVE, or EXPIRED

**Code:**
```python
async def get_agent_wallet(self):
    response = await self._request("GET", "/agent-wallet")
    status = AgentWalletStatus(response.get("status", "NOT_FOUND"))
    return PearAgentWalletResponse(
        address=response.get("address"),
        status=status,
        expires_at=response.get("expires_at"),
        created_at=response.get("created_at")
    )
```

### 7. **Create Agent Wallet** (`POST /api/trade/pear/agent-wallet`)

**What happens:**
- Pear Protocol generates a new Ethereum wallet
- Private key is encrypted and stored securely by Pear
- Wallet is valid for 180 days, rotated every 30 days

**Code:**
```python
async def create_agent_wallet(self):
    response = await self._request("POST", "/agent-wallet")
    return PearCreateAgentWalletResponse(
        address=response["address"],
        status=response["status"],
        expires_at=response["expires_at"],
        created_at=response["created_at"]
    )
```

### 8. **Approve Agent Wallet** (`POST /api/trade/pear/agent-wallet/approve`)

**What happens:**
- User signs a message approving the agent wallet
- This authorizes Pear Protocol to use the agent wallet on Hyperliquid
- Signature is sent to Hyperliquid to register the agent wallet

**Code:**
```python
async def approve_agent_wallet(self, agent_address: str, signature: str):
    await self._request(
        "POST",
        "/agent-wallet/approve",
        data={"agent_address": agent_address, "signature": signature}
    )
    return True
```

## Security Considerations

### 1. **EIP-712 Signatures**
- Industry-standard for structured data signing
- Prevents signature replay attacks (timestamp included)
- User sees readable message in wallet, not raw hash

### 2. **JWT Tokens**
- Short-lived access tokens (1 hour typical)
- Longer-lived refresh tokens
- Stored securely by frontend (httpOnly cookies recommended)

### 3. **Agent Wallet Security**
- Private keys never leave Pear Protocol servers
- Keys are encrypted at rest
- Automatic rotation every 30 days
- User must explicitly approve via signature

### 4. **No API Key Needed for Authentication**
- Users authenticate with their own wallet
- No shared secrets or API keys to manage
- Each user's wallet = their identity

## Error Handling

### Common Errors:

1. **Invalid Signature (401)**
   - Signature doesn't match address
   - Timestamp expired
   - Wrong chain ID

2. **Expired Token (403)**
   - Access token expired
   - Solution: Use refresh token

3. **Missing Agent Wallet (404)**
   - No agent wallet created
   - Solution: Create and approve one

4. **Expired Agent Wallet**
   - Wallet > 180 days old
   - Solution: Create new agent wallet

## Configuration

### Environment Variables:

```bash
# Pear Protocol API
PEAR_API_URL=https://hl-v2.pearprotocol.io
PEAR_API_KEY=  # Optional, for direct API access
```

### Important Notes:

1. **PEAR_API_KEY is optional** - Not needed for wallet-based authentication
2. **Base URL** - Must be `hl-v2.pearprotocol.io` (not the old URL)
3. **Client ID** - Use `"APITRADER"` for individual integrations

## Testing

### Manual Test with curl:

```bash
# 1. Get EIP-712 message
curl "http://localhost:8000/api/trade/pear/auth/eip712-message?address=0x...&client_id=APITRADER"

# 2. Sign message with wallet (use ethers.js, etc.)

# 3. Login with signature
curl -X POST "http://localhost:8000/api/trade/pear/auth/login" \
  -H "Content-Type: application/json" \
  -d '{
    "method": "eip712",
    "address": "0x...",
    "client_id": "APITRADER",
    "details": {"signature": "0x..."}
  }'

# 4. Use access token
curl "http://localhost:8000/api/trade/pear/agent-wallet" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

### Automated Test:

```bash
python3 test_pear_auth.py
```

## Integration Examples

### React + ethers.js:

```typescript
import { ethers } from 'ethers';

async function authenticateWithPear() {
  // 1. Get EIP-712 message
  const response = await fetch(
    `/api/trade/pear/auth/eip712-message?address=${address}&client_id=APITRADER`
  );
  const eipData = await response.json();
  
  // 2. Sign with wallet
  const provider = new ethers.providers.Web3Provider(window.ethereum);
  const signer = provider.getSigner();
  const signature = await signer._signTypedData(
    eipData.domain,
    eipData.types,
    eipData.message
  );
  
  // 3. Login
  const loginResponse = await fetch('/api/trade/pear/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      method: 'eip712',
      address,
      client_id: 'APITRADER',
      details: { signature }
    })
  });
  
  const { access_token, refresh_token } = await loginResponse.json();
  
  // 4. Store tokens
  localStorage.setItem('pear_access_token', access_token);
  localStorage.setItem('pear_refresh_token', refresh_token);
  
  return access_token;
}
```

## Summary

The Pear Protocol authentication implementation provides:

✅ **Secure wallet-based authentication** using EIP-712 signatures  
✅ **JWT token management** with access and refresh tokens  
✅ **Agent wallet lifecycle** management (create, approve, rotate)  
✅ **Clean API design** following FastAPI best practices  
✅ **Comprehensive error handling** and logging  
✅ **Type safety** with Pydantic schemas  
✅ **Production-ready** with proper security measures  

The system is now ready for integration with frontend applications and can handle the complete user authentication and trading flow.
