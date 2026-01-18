# Pear Protocol Authentication API

## Overview

Pear Protocol uses **EIP-712 typed data signing** to authenticate wallet ownership. This is a 3-step process:

1. **Get EIP-712 message** from the backend
2. **Sign the message** with the user's wallet
3. **Submit signature** to authenticate and receive JWT tokens

Each step is detailed below, along with code examples for popular libraries. For the client ID, use `HLHackathon1` - `HLHackathon10`.

---

## Step 1: Get EIP-712 Message

Request a signable message from the backend.

### Request

```
GET /auth/eip712-message
```

### Query Parameters

| Parameter  | Type   | Required | Description                          |
|------------|--------|----------|--------------------------------------|
| `address`  | string | Yes      | User's wallet address (e.g., `0x...`) |
| `clientId` | string | Yes      | Your application's client ID         |

### Example

```bash
curl -X GET "https://hl-v2.pearprotocol.io/auth/eip712-message?address=0x123&clientId=HLHackathon1"
```

### Response

```json
{
    "primaryType": "Authentication",
    "domain": {
        "name": "Pear Protocol",
        "version": "1",
        "chainId": 42161,
        "verifyingContract": "0x0000000000000000000000000000000000000001"
    },
    "types": {
        "Authentication": [
            {
                "name": "address",
                "type": "address"
            },
            {
                "name": "clientId",
                "type": "string"
            },
            {
                "name": "timestamp",
                "type": "uint256"
            },
            {
                "name": "action",
                "type": "string"
            }
        ]
    },
    "message": {
        "address": "0x123",
        "clientId": "HLHackathon9",
        "timestamp": 1768641175,
        "action": "authenticate"
    },
    "timestamp": 1768641175
}
```

---

## Step 2: Sign the Message

Sign the EIP-712 message using your preferred library. The user's wallet will display a human-readable signature request.

### Using Wagmi (React)

```typescript
import { useSignTypedData } from 'wagmi';

function SignMessage({ eip712Message }) {
  const { signTypedDataAsync } = useSignTypedData();

  const sign = async () => {
    // Remove EIP712Domain from types - wagmi adds it automatically
    const { EIP712Domain, ...types } = eip712Message.types;

    const signature = await signTypedDataAsync({
      domain: eip712Message.domain,
      types: types,
      primaryType: eip712Message.primaryType,
      message: eip712Message.message,
    });

    return signature;
  };

  return <button onClick={sign}>Sign</button>;
}
```

### Using Viem

```typescript
import { createWalletClient, custom } from 'viem';
import { arbitrum } from 'viem/chains';

const walletClient = createWalletClient({
  chain: arbitrum,
  transport: custom(window.ethereum),
});

// Remove EIP712Domain from types - viem adds it automatically
const { EIP712Domain, ...types } = eip712Message.types;

const signature = await walletClient.signTypedData({
  account: '0x123',
  domain: eip712Message.domain,
  types: types,
  primaryType: eip712Message.primaryType,
  message: eip712Message.message,
});
```

### Using Ethers.js v6

```typescript
import { BrowserProvider } from 'ethers';

const provider = new BrowserProvider(window.ethereum);
const signer = await provider.getSigner();

// Remove EIP712Domain from types - ethers adds it automatically
const { EIP712Domain, ...types } = eip712Message.types;

const signature = await signer.signTypedData(
  eip712Message.domain,
  types,
  eip712Message.message
);
```

### Using Ethers.js v5

```typescript
import { ethers } from 'ethers';

const provider = new ethers.providers.Web3Provider(window.ethereum);
const signer = provider.getSigner();

// Remove EIP712Domain from types - ethers adds it automatically
const { EIP712Domain, ...types } = eip712Message.types;

const signature = await signer._signTypedData(
  eip712Message.domain,
  types,
  eip712Message.message
);
```

### Using Web3.js

```typescript
import Web3 from 'web3';

const web3 = new Web3(window.ethereum);
const address = '0x123';

const signature = await web3.eth.signTypedData(address, {
  domain: eip712Message.domain,
  types: eip712Message.types,
  primaryType: eip712Message.primaryType,
  message: eip712Message.message,
});
```

### Using @metamask/eth-sig-util (Node.js / Backend)

```typescript
import { signTypedData, SignTypedDataVersion } from '@metamask/eth-sig-util';

const privateKey = Buffer.from('your-private-key-hex', 'hex');

const signature = signTypedData({
  privateKey,
  data: {
    domain: eip712Message.domain,
    types: eip712Message.types,
    primaryType: eip712Message.primaryType,
    message: eip712Message.message,
  },
  version: SignTypedDataVersion.V4,
});
```

### Signature Output

All methods return a hex signature string:

```
0x4355c47d63924e8a72e509b65029052eb6c299d53a04e167c5775fd466751c9d07299936d304c153f6443dfa05f40ff007d72911b6f72307f996231605b915621c
```

---

## Step 3: Authenticate with Signature

Submit the signature to receive JWT tokens.

### Request

```
POST /auth/login
Content-Type: application/json
```

### Request Body

| Field               | Type   | Required | Description                              |
|---------------------|--------|----------|------------------------------------------|
| `method`            | string | Yes      | Must be `"eip712"`                       |
| `address`           | string | Yes      | User's wallet address                    |
| `clientId`          | string | Yes      | Your application's client ID             |
| `details.signature` | string | Yes      | The signature from Step 2                |
| `details.timestamp` | number | Yes      | The timestamp from the EIP-712 message   |

### Example

```bash
curl -X POST "https://hl-v2.pearprotocol.io/auth/login" \
  -H "Content-Type: application/json" \
  -d '{
    "method": "eip712",
    "address": "0x123",
    "clientId": "HLHackathon1",
    "details": {
      "signature": "0x4355c47d63924e8a72e509b65029052eb6c299d53a04e167c5775fd466751c9d07299936d304c153f6443dfa05f40ff007d72911b6f72307f996231605b915621c",
      "timestamp": 1705510800000
    }
  }'
```

### Response

```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJhZGRyZXNzIjoiMHg3NDJkMzVDYzY2MzRDMDUzMjkyNWEzYjg0NEJjOWU3NTk1ZjViQzE1IiwiaWF0IjoxNzA1NTEwODAwLCJleHAiOjE3MDU1MTQ0MDB9.abc123",
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJhZGRyZXNzIjoiMHg3NDJkMzVDYzY2MzRDMDUzMjkyNWEzYjg0NEJjOWU3NTk1ZjViQzE1IiwiaWF0IjoxNzA1NTEwODAwLCJleHAiOjE3MDYxMTU2MDB9.xyz789",
  "tokenType": "Bearer",
  "expiresIn": 3600,
  "address": "0x123",
  "clientId": "HLHackathon1"
}
```

### Response Fields

| Field          | Type   | Description                              |
|----------------|--------|------------------------------------------|
| `accessToken`  | string | JWT for authenticating API requests      |
| `refreshToken` | string | Token to refresh expired access tokens   |
| `tokenType`    | string | Always `"Bearer"`                        |
| `expiresIn`    | number | Seconds until access token expires       |
| `address`      | string | Authenticated wallet address             |
| `clientId`     | string | Your application's client ID             |

---

## Step 4: Setup Hyperliquid Permissions

Before you can trade through Pear Protocol, you need to complete these one-time setup steps on Hyperliquid.

### Prerequisites

1. **Deposit funds to Hyperliquid** (minimum $10 USDC)
   - Go to [app.hyperliquid.xyz](https://app.hyperliquid.xyz)
   - Connect your wallet
   - Deposit USDC from Arbitrum

### 4a. Approve Builder Code

The builder code allows Pear Protocol to receive builder fees from your trades. This is a one-time approval.

**Documentation:** [Builder Code Setup](https://docs.pearprotocol.io/api-integration/access-management/builder-code)

**Pear Protocol Builder Address:** `0x563b4cc82aa48e5b4ee0be1564ad7f547f5f399a`

**Install SDK:**

```bash
npm install @nktkas/hyperliquid
```

**SDK Repository:** [github.com/nktkas/hyperliquid](https://github.com/nktkas/hyperliquid)

```typescript
import { HyperliquidClient } from "@nktkas/hyperliquid";
import { privateKeyToAccount } from "viem/accounts";

const PEAR_BUILDER_ADDRESS = "0xA47D4d99191db54A4829cdf3de2417E527c3b042";

async function approveBuilderCode() {
  const account = privateKeyToAccount("0xYOUR_PRIVATE_KEY");

  const client = new HyperliquidClient({
    wallet: account,
  });

  // Approve builder fee (max fee in basis points, e.g., 10 = 0.1%)
  const result = await client.exchange.approveBuilderFee({
    builder: PEAR_BUILDER_ADDRESS,
    maxFeeRate: "1%", 
  });

  console.log("Builder code approved:", result);
  return result;
}
```

### 4b. Approve Agent Wallet

The agent wallet allows Pear Protocol to execute trades on your behalf without requiring your signature for each trade.

**Documentation:** [Agent Wallet Setup](https://docs.pearprotocol.io/api-integration/access-management/agent-wallet-setup)

```typescript
import { HyperliquidClient } from "@nktkas/hyperliquid";
import { privateKeyToAccount, generatePrivateKey } from "viem/accounts";

async function approveAgentWallet() {
  const account = privateKeyToAccount("0xYOUR_PRIVATE_KEY");

  const client = new HyperliquidClient({
    wallet: account,
  });

  // Generate a new agent wallet or use an existing one
  const agentPrivateKey = generatePrivateKey();
  const agentAccount = privateKeyToAccount(agentPrivateKey);

  const result = await client.exchange.approveAgent({
    agentAddress: agentAccount.address,
    agentName: "Pear Protocol",
  });

  console.log("Agent wallet approved:", result);
  console.log("Agent address:", agentAccount.address);
  console.log("Agent private key (save this!):", agentPrivateKey);

  return {
    result,
    agentAddress: agentAccount.address,
    agentPrivateKey,
  };
}
```

### Complete Setup Script

Here's a complete script that performs all setup steps:

```typescript
import { HyperliquidClient } from "@nktkas/hyperliquid";
import { privateKeyToAccount, generatePrivateKey } from "viem/accounts";

const PEAR_BUILDER_ADDRESS = "0xA47D4d99191db54A4829cdf3de2417E527c3b042";

async function setupPearProtocol(privateKey: string) {
  const account = privateKeyToAccount(privateKey as `0x${string}`);

  const client = new HyperliquidClient({
    wallet: account,
  });

  console.log("Setting up Pear Protocol for:", account.address);

  // Step 1: Approve builder fee
  console.log("\n1. Approving builder code...");
  const builderResult = await client.exchange.approveBuilderFee({
    builder: PEAR_BUILDER_ADDRESS,
    maxFeeRate: "1%",
  });
  console.log("Builder code approved:", builderResult);

  // Step 2: Create and approve agent wallet
  console.log("\n2. Creating and approving agent wallet...");
  const agentPrivateKey = generatePrivateKey();
  const agentAccount = privateKeyToAccount(agentPrivateKey);

  const agentResult = await client.exchange.approveAgent({
    agentAddress: agentAccount.address,
    agentName: "PearProtocol",
  });
  console.log("Agent wallet approved:", agentResult);

  // Summary
  console.log("\n=== Setup Complete ===");
  console.log("User address:", account.address);
  console.log("Agent address:", agentAccount.address);
  console.log("Agent private key:", agentPrivateKey);
  console.log("\nSave the agent private key securely!");

  return {
    userAddress: account.address,
    agentAddress: agentAccount.address,
    agentPrivateKey,
  };
}

// Usage
setupPearProtocol("0xYOUR_PRIVATE_KEY");
```

---

## Using the Access Token

Include the access token in the `Authorization` header for authenticated API requests:

```bash
curl -X GET "https://hl-v2.pearprotocol.io/api/positions" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

---

## Token Refresh

Refresh an expired access token using the refresh token.

### Request

```
POST /auth/refresh
Content-Type: application/json
```

### Request Body

```json
{
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

### Example

```bash
curl -X POST "https://hl-v2.pearprotocol.io/auth/refresh" \
  -H "Content-Type: application/json" \
  -d '{
    "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJhZGRyZXNzIjoiMHg3NDJkMzVDYzY2MzRDMDUzMjkyNWEzYjg0NEJjOWU3NTk1ZjViQzE1IiwiaWF0IjoxNzA1NTEwODAwLCJleHAiOjE3MDYxMTU2MDB9.xyz789"
  }'
```

### Response

```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "tokenType": "Bearer",
  "expiresIn": 3600
}
```

---

## Logout

Invalidate the refresh token.

### Request

```
POST /auth/logout
Content-Type: application/json
```

### Request Body

```json
{
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

### Example

```bash
curl -X POST "https://hl-v2.pearprotocol.io/auth/logout" \
  -H "Content-Type: application/json" \
  -d '{
    "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }'
```

### Response

```json
{
  "message": "Logged out successfully"
}
```

---

## Complete Flow Examples

### Using Wagmi + React

```typescript
import { useAccount, useSignTypedData } from 'wagmi';

const API_BASE_URL = "https://hl-v2.pearprotocol.io";
const CLIENT_ID = "HLHackathon1";

function useAuthenticate() {
  const { address } = useAccount();
  const { signTypedDataAsync } = useSignTypedData();

  const authenticate = async () => {
    if (!address) throw new Error("Wallet not connected");

    // Step 1: Get EIP-712 message
    const eip712Response = await fetch(
      `${API_BASE_URL}/auth/eip712-message?address=${address}&clientId=${CLIENT_ID}`
    );
    const eip712Message = await eip712Response.json();

    // Step 2: Sign the message
    const { EIP712Domain, ...types } = eip712Message.types;
    const signature = await signTypedDataAsync({
      domain: eip712Message.domain,
      types: types,
      primaryType: eip712Message.primaryType,
      message: eip712Message.message,
    });

    // Step 3: Authenticate with signature
    const authResponse = await fetch(`${API_BASE_URL}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        method: "eip712",
        address: address,
        clientId: CLIENT_ID,
        details: {
          signature: signature,
          timestamp: eip712Message.timestamp,
        },
      }),
    });
    const tokens = await authResponse.json();

    // Store tokens
    localStorage.setItem("accessToken", tokens.accessToken);
    localStorage.setItem("refreshToken", tokens.refreshToken);

    return tokens;
  };

  return { authenticate };
}
```

### Using Viem

```typescript
import { createWalletClient, custom } from 'viem';
import { arbitrum } from 'viem/chains';

const API_BASE_URL = "https://hl-v2.pearprotocol.io";
const CLIENT_ID = "HLHackathon1";

async function authenticateWithViem() {
  const walletClient = createWalletClient({
    chain: arbitrum,
    transport: custom(window.ethereum),
  });

  const [address] = await walletClient.getAddresses();

  // Step 1: Get EIP-712 message
  const eip712Response = await fetch(
    `${API_BASE_URL}/auth/eip712-message?address=${address}&clientId=${CLIENT_ID}`
  );
  const eip712Message = await eip712Response.json();

  // Step 2: Sign the message
  const { EIP712Domain, ...types } = eip712Message.types;
  const signature = await walletClient.signTypedData({
    account: address,
    domain: eip712Message.domain,
    types: types,
    primaryType: eip712Message.primaryType,
    message: eip712Message.message,
  });

  // Step 3: Authenticate with signature
  const authResponse = await fetch(`${API_BASE_URL}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      method: "eip712",
      address: address,
      clientId: CLIENT_ID,
      details: {
        signature: signature,
        timestamp: eip712Message.timestamp,
      },
    }),
  });
  const tokens = await authResponse.json();

  localStorage.setItem("accessToken", tokens.accessToken);
  localStorage.setItem("refreshToken", tokens.refreshToken);

  return tokens;
}
```

### Using Ethers.js v6

```typescript
import { BrowserProvider } from 'ethers';

const API_BASE_URL = "https://hl-v2.pearprotocol.io";
const CLIENT_ID = "HLHackathon1";

async function authenticateWithEthers() {
  const provider = new BrowserProvider(window.ethereum);
  const signer = await provider.getSigner();
  const address = await signer.getAddress();

  // Step 1: Get EIP-712 message
  const eip712Response = await fetch(
    `${API_BASE_URL}/auth/eip712-message?address=${address}&clientId=${CLIENT_ID}`
  );
  const eip712Message = await eip712Response.json();

  // Step 2: Sign the message
  const { EIP712Domain, ...types } = eip712Message.types;
  const signature = await signer.signTypedData(
    eip712Message.domain,
    types,
    eip712Message.message
  );

  // Step 3: Authenticate with signature
  const authResponse = await fetch(`${API_BASE_URL}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      method: "eip712",
      address: address,
      clientId: CLIENT_ID,
      details: {
        signature: signature,
        timestamp: eip712Message.timestamp,
      },
    }),
  });
  const tokens = await authResponse.json();

  localStorage.setItem("accessToken", tokens.accessToken);
  localStorage.setItem("refreshToken", tokens.refreshToken);

  return tokens;
}
```

### Using Web3.js

```typescript
import Web3 from 'web3';

const API_BASE_URL = "https://hl-v2.pearprotocol.io";
const CLIENT_ID = "HLHackathon1";

async function authenticateWithWeb3() {
  const web3 = new Web3(window.ethereum);
  const accounts = await web3.eth.requestAccounts();
  const address = accounts[0];

  // Step 1: Get EIP-712 message
  const eip712Response = await fetch(
    `${API_BASE_URL}/auth/eip712-message?address=${address}&clientId=${CLIENT_ID}`
  );
  const eip712Message = await eip712Response.json();

  // Step 2: Sign the message
  const signature = await web3.eth.signTypedData(address, {
    domain: eip712Message.domain,
    types: eip712Message.types,
    primaryType: eip712Message.primaryType,
    message: eip712Message.message,
  });

  // Step 3: Authenticate with signature
  const authResponse = await fetch(`${API_BASE_URL}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      method: "eip712",
      address: address,
      clientId: CLIENT_ID,
      details: {
        signature: signature,
        timestamp: eip712Message.timestamp,
      },
    }),
  });
  const tokens = await authResponse.json();

  localStorage.setItem("accessToken", tokens.accessToken);
  localStorage.setItem("refreshToken", tokens.refreshToken);

  return tokens;
}
```

---

## API Endpoints Summary

| Method | Endpoint              | Description                    |
|--------|-----------------------|--------------------------------|
| GET    | `/auth/eip712-message` | Get EIP-712 message to sign   |
| POST   | `/auth/login`          | Authenticate with signature   |
| POST   | `/auth/refresh`        | Refresh access token          |
| POST   | `/auth/logout`         | Invalidate refresh token      |
