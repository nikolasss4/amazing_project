# Pear Protocol Authentication Flow

This document explains how to authenticate with Pear Protocol and set up an agent wallet for trading on Hyperliquid.

## Authentication Flow

### 1. Get EIP-712 Message

First, retrieve the EIP-712 message structure that needs to be signed by the user's wallet.

```bash
GET /api/trade/pear/auth/eip712-message?address={wallet_address}&client_id=APITRADER
```

**Response:**
```json
{
  "domain": {
    "name": "Pear Protocol",
    "version": "1",
    "chainId": 1
  },
  "types": {
    "Login": [
      {"name": "address", "type": "address"},
      {"name": "timestamp", "type": "uint256"}
    ]
  },
  "message": {
    "address": "0x...",
    "timestamp": 1234567890
  }
}
```

### 2. Sign the Message

Sign the EIP-712 message using the user's wallet (e.g., MetaMask, WalletConnect):

```javascript
// Example using ethers.js
const signature = await signer._signTypedData(
  eipData.domain,
  eipData.types,
  eipData.message
);
```

### 3. Login with Signature

Send the signed message to obtain access and refresh tokens:

```bash
POST /api/trade/pear/auth/login
Content-Type: application/json

{
  "method": "eip712",
  "address": "0x...",
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

### 4. Use Access Token

Include the access token in all subsequent API requests:

```bash
Authorization: Bearer {access_token}
```

### 5. Refresh Token

When the access token expires, use the refresh token to get a new one:

```bash
POST /api/trade/pear/auth/refresh
Content-Type: application/json

{
  "refresh_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

## Agent Wallet Setup

After authentication, you need to set up an agent wallet to allow Pear Protocol to execute trades on Hyperliquid on your behalf.

### 1. Check Agent Wallet Status

```bash
GET /api/trade/pear/agent-wallet
Authorization: Bearer {access_token}
```

**Possible Responses:**

- **NOT_FOUND**: No wallet exists
```json
{
  "address": null,
  "status": "NOT_FOUND",
  "expires_at": null,
  "created_at": null
}
```

- **ACTIVE**: Wallet is active and ready to use
```json
{
  "address": "0xAgent123...",
  "status": "ACTIVE",
  "expires_at": "2026-06-17T00:00:00Z",
  "created_at": "2026-01-17T00:00:00Z"
}
```

- **EXPIRED**: Wallet has expired and needs to be recreated
```json
{
  "address": "0xAgent123...",
  "status": "EXPIRED",
  "expires_at": "2026-01-16T00:00:00Z",
  "created_at": "2025-12-17T00:00:00Z"
}
```

### 2. Create Agent Wallet

If no wallet exists or it has expired:

```bash
POST /api/trade/pear/agent-wallet
Authorization: Bearer {access_token}
```

**Response:**
```json
{
  "address": "0xAgent456...",
  "status": "PENDING_APPROVAL",
  "expires_at": "2026-07-17T00:00:00Z",
  "created_at": "2026-01-17T10:30:00Z"
}
```

### 3. Approve Agent Wallet

The user must sign a message to approve the agent wallet. This authorizes Pear Protocol to use the agent wallet on Hyperliquid.

```bash
POST /api/trade/pear/agent-wallet/approve
Authorization: Bearer {access_token}
Content-Type: application/json

{
  "agent_address": "0xAgent456...",
  "signature": "0x..."
}
```

**Response:**
```json
{
  "status": "approved",
  "agent_address": "0xAgent456..."
}
```

### 4. Start Trading

Once the agent wallet is approved, you can use the trading endpoints:

- Create pair trades
- Manage bucket strategies
- View positions
- Execute trades

## Complete Example (JavaScript/TypeScript)

```javascript
import { ethers } from 'ethers';

// 1. Get EIP-712 message
const walletAddress = '0x...';
const eipResponse = await fetch(
  `https://api.example.com/api/trade/pear/auth/eip712-message?address=${walletAddress}&client_id=APITRADER`
);
const eipData = await eipResponse.json();

// 2. Sign the message
const provider = new ethers.providers.Web3Provider(window.ethereum);
const signer = provider.getSigner();
const signature = await signer._signTypedData(
  eipData.domain,
  eipData.types,
  eipData.message
);

// 3. Login
const loginResponse = await fetch(
  'https://api.example.com/api/trade/pear/auth/login',
  {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      method: 'eip712',
      address: walletAddress,
      client_id: 'APITRADER',
      details: { signature }
    })
  }
);
const { access_token, refresh_token } = await loginResponse.json();

// 4. Check agent wallet
const agentWalletResponse = await fetch(
  'https://api.example.com/api/trade/pear/agent-wallet',
  {
    headers: { 'Authorization': `Bearer ${access_token}` }
  }
);
const agentWallet = await agentWalletResponse.json();

// 5. Create agent wallet if needed
if (agentWallet.status === 'NOT_FOUND' || agentWallet.status === 'EXPIRED') {
  const createResponse = await fetch(
    'https://api.example.com/api/trade/pear/agent-wallet',
    {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${access_token}` }
    }
  );
  const newWallet = await createResponse.json();
  
  // 6. Approve the agent wallet
  // Note: The signature here would be obtained from signing a specific
  // approval message from Hyperliquid. See Pear Protocol docs for details.
  const approvalSignature = await getApprovalSignature(newWallet.address);
  
  await fetch(
    'https://api.example.com/api/trade/pear/agent-wallet/approve',
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${access_token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        agent_address: newWallet.address,
        signature: approvalSignature
      })
    }
  );
}

// 7. Start trading!
const tradeResponse = await fetch(
  'https://api.example.com/api/trade/pear/pairs',
  {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${access_token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      long_symbol: 'ETH',
      short_symbol: 'BTC',
      size: 1000,
      leverage: 2.0
    })
  }
);
```

## Important Notes

1. **Client ID**: Use `"APITRADER"` for individual integrations. Contact Pear Protocol team for partner integrations.

2. **Token Expiration**: Access tokens expire after a certain time (typically 1 hour). Use the refresh token to get a new access token.

3. **Agent Wallet Lifecycle**:
   - Agent wallets are valid for **180 days**
   - They are rotated every **30 days**
   - Always check the status before trading

4. **Security**:
   - Never share your access token or refresh token
   - Store tokens securely (e.g., httpOnly cookies, secure storage)
   - The agent wallet private key is encrypted and stored by Pear Protocol

5. **Rate Limits**: Be aware of API rate limits. Implement exponential backoff for retries.

## Related Documentation

- [Pear Protocol API Docs](https://docs.pearprotocol.io/api-integration/access-management/agent-wallet-setup)
- [Hyperliquid Agent Wallet Documentation](https://hyperliquid.gitbook.io/)
