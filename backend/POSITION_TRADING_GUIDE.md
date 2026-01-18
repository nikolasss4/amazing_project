# Position Trading Endpoint - Complete Guide

## Overview

The position trading endpoint allows you to execute complex trades on Pear Protocol, including:
- **Long/Short Baskets**: Trade multiple assets simultaneously with custom weights
- **Pair Trading**: Long one asset while shorting another
- **Conditional Orders**: Execute trades when price triggers are met
- **TWAP Execution**: Time-weighted average price execution
- **Ladder Orders**: Gradual entry/exit at multiple price levels
- **Risk Management**: Built-in stop loss and take profit

## Endpoint

```
POST /api/trade/pear/positions
```

## Authentication

The endpoint uses server-side authentication with credentials from `.env`:
- `PEAR_CLIENT_ID` - Your Pear Protocol client ID
- `WALLET_PRIVATE_KEY` - Private key for server-side signing
- `PEAR_API_URL` - Pear Protocol API base URL (default: https://hl-v2.pearprotocol.io)

## Request Format

### Required Fields

| Field | Type | Description |
|-------|------|-------------|
| `walletAddress` | string | User's wallet address (required) |
| `slippage` | float | Slippage tolerance (e.g., 0.01 = 1%) |
| `executionType` | string | "SYNC" or "ASYNC" |
| `leverage` | float | Trading leverage (1-100) |
| `usdValue` | float | Total position size in USD |
| `longAssets` or `shortAssets` | array | At least one must be provided |

### Asset Format

Each asset in `longAssets` or `shortAssets`:

```json
{
  "asset": "BTC",
  "weight": 0.6
}
```

Weights should sum to 1.0 for each side.

### Optional Fields

| Field | Type | Description |
|-------|------|-------------|
| `triggerValue` | string | Price trigger value |
| `triggerType` | string | "PRICE", "MARKET_CAP", etc. |
| `direction` | string | "MORE_THAN" or "LESS_THAN" |
| `assetName` | string | Asset to watch for trigger |
| `marketCode` | string | Market prediction code (e.g., "KALSHI:EVENT_CODE") |
| `twapDuration` | integer | TWAP duration in seconds |
| `twapIntervalSeconds` | integer | Interval between TWAP trades |
| `randomizeExecution` | boolean | Randomize TWAP execution timing |
| `ladderConfig` | object | Ladder order configuration |
| `stopLoss` | object | Stop loss configuration |
| `takeProfit` | object | Take profit configuration |
| `referralCode` | string | 32-byte hex referral code |

### Ladder Configuration

```json
{
  "ratioStart": 42000,
  "ratioEnd": 48000,
  "numberOfLevels": 5
}
```

### Stop Loss / Take Profit

```json
{
  "type": "PERCENTAGE",  // or "DOLLAR", "POSITION_VALUE"
  "value": 15
}
```

## Example Requests

### 1. Simple Long/Short Basket

```bash
curl -X POST http://localhost:8000/api/trade/pear/positions \
  -H "Content-Type: application/json" \
  -d '{
    "walletAddress": "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb",
    "slippage": 0.01,
    "executionType": "SYNC",
    "leverage": 10,
    "usdValue": 1000,
    "longAssets": [
      {"asset": "BTC", "weight": 0.6},
      {"asset": "ETH", "weight": 0.4}
    ],
    "shortAssets": [
      {"asset": "SOL", "weight": 0.7},
      {"asset": "AVAX", "weight": 0.3}
    ]
  }'
```

### 2. Position with Risk Management

```bash
curl -X POST http://localhost:8000/api/trade/pear/positions \
  -H "Content-Type: application/json" \
  -d '{
    "walletAddress": "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb",
    "slippage": 0.01,
    "executionType": "SYNC",
    "leverage": 10,
    "usdValue": 1000,
    "longAssets": [{"asset": "BTC", "weight": 1.0}],
    "stopLoss": {
      "type": "PERCENTAGE",
      "value": 15
    },
    "takeProfit": {
      "type": "PERCENTAGE",
      "value": 25
    }
  }'
```

### 3. Conditional Order with TWAP

```bash
curl -X POST http://localhost:8000/api/trade/pear/positions \
  -H "Content-Type: application/json" \
  -d '{
    "walletAddress": "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb",
    "slippage": 0.01,
    "executionType": "ASYNC",
    "leverage": 5,
    "usdValue": 5000,
    "longAssets": [{"asset": "ETH", "weight": 1.0}],
    "triggerValue": "3500",
    "triggerType": "PRICE",
    "direction": "MORE_THAN",
    "assetName": "ETH",
    "twapDuration": 300,
    "twapIntervalSeconds": 60
  }'
```

### 4. Full Example with All Features

```bash
curl -X POST http://localhost:8000/api/trade/pear/positions \
  -H "Content-Type: application/json" \
  -d '{
    "walletAddress": "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb",
    "slippage": 0.01,
    "executionType": "SYNC",
    "leverage": 10,
    "usdValue": 1000,
    "longAssets": [
      {"asset": "BTC", "weight": 0.6},
      {"asset": "ETH", "weight": 0.4}
    ],
    "shortAssets": [
      {"asset": "SOL", "weight": 0.7},
      {"asset": "AVAX", "weight": 0.3}
    ],
    "triggerValue": "45000",
    "triggerType": "PRICE",
    "direction": "MORE_THAN",
    "assetName": "ETH",
    "marketCode": "KALSHI:EVENT_CODE",
    "twapDuration": 120,
    "twapIntervalSeconds": 30,
    "randomizeExecution": false,
    "ladderConfig": {
      "ratioStart": 42000,
      "ratioEnd": 48000,
      "numberOfLevels": 5
    },
    "stopLoss": {
      "type": "PERCENTAGE",
      "value": 15
    },
    "takeProfit": {
      "type": "PERCENTAGE",
      "value": 25
    },
    "referralCode": "0x48656c6c6f20776f726c64210000000000000000000000000000000000000000"
  }'
```

## Response Format

### Success Response (200 OK)

```json
{
  "orderId": "a1b2c3d4e5f67890abcdef1234567891",
  "fills": []
}
```

The `fills` array will contain execution details if the order was filled immediately:

```json
{
  "orderId": "a1b2c3d4e5f67890abcdef1234567891",
  "fills": [
    {
      "asset": "BTC",
      "price": 67500,
      "size": 0.008888,
      "side": "long"
    },
    {
      "asset": "ETH",
      "price": 3200,
      "size": 0.125,
      "side": "long"
    }
  ]
}
```

### Error Responses

#### Missing Wallet Address (400)

```json
{
  "detail": "walletAddress is required. Please provide your wallet address to execute trades."
}
```

#### Missing Assets (400)

```json
{
  "detail": "At least one of longAssets or shortAssets must be provided."
}
```

#### Validation Error (422)

```json
{
  "detail": [
    {
      "loc": ["body", "leverage"],
      "msg": "ensure this value is greater than or equal to 1",
      "type": "value_error.number.not_ge"
    }
  ]
}
```

#### API Error (500)

```json
{
  "detail": "Failed to create position: Authentication failed"
}
```

## Testing

### Unit Tests

Run all unit tests:

```bash
cd backend
python3 -m pytest tests/test_position_trading.py -v
```

### Integration Tests

Run validation tests:

```bash
python3 -m pytest tests/test_pear_endpoints.py::TestPearPositionEndpoint -v
```

### Test with Real Credentials

1. Set up your `.env` file:

```bash
PEAR_CLIENT_ID=HLHackathon9
WALLET_PRIVATE_KEY=0x...your_private_key...
PEAR_API_URL=https://hl-v2.pearprotocol.io
```

2. Run the credential test:

```bash
python3 -m pytest tests/test_pear_endpoints.py::TestPearPositionEndpoint::test_position_creation_with_credentials -v -s
```

## Frontend Integration

Example TypeScript/React usage:

```typescript
import axios from 'axios';

interface CreatePositionRequest {
  walletAddress: string;
  slippage: number;
  executionType: 'SYNC' | 'ASYNC';
  leverage: number;
  usdValue: number;
  longAssets?: Array<{asset: string; weight: number}>;
  shortAssets?: Array<{asset: string; weight: number}>;
  stopLoss?: {type: string; value: number};
  takeProfit?: {type: string; value: number};
}

async function createPosition(request: CreatePositionRequest) {
  try {
    const response = await axios.post(
      'http://localhost:8000/api/trade/pear/positions',
      request
    );
    
    console.log('Order ID:', response.data.orderId);
    console.log('Fills:', response.data.fills);
    
    return response.data;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      console.error('Error:', error.response?.data?.detail);
    }
    throw error;
  }
}

// Example usage
const result = await createPosition({
  walletAddress: userWallet,
  slippage: 0.01,
  executionType: 'SYNC',
  leverage: 10,
  usdValue: 1000,
  longAssets: [
    {asset: 'BTC', weight: 0.6},
    {asset: 'ETH', weight: 0.4}
  ],
  stopLoss: {type: 'PERCENTAGE', value: 15},
  takeProfit: {type: 'PERCENTAGE', value: 25}
});
```

## Mobile Integration

Example React Native usage with the mobile app:

```typescript
// In mobile/src/api/trading.ts
import {API_BASE_URL} from './config';

export const createPosition = async (
  walletAddress: string,
  request: PositionRequest
) => {
  const response = await fetch(`${API_BASE_URL}/api/trade/pear/positions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      ...request,
      walletAddress,
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'Failed to create position');
  }

  return response.json();
};
```

## Troubleshooting

### "walletAddress is required"

Make sure you're including the `walletAddress` field in your request body.

### "At least one of longAssets or shortAssets must be provided"

Include at least one asset in either `longAssets` or `shortAssets` array.

### Authentication Errors

1. Verify `WALLET_PRIVATE_KEY` is set in `.env`
2. Check `PEAR_CLIENT_ID` is correct
3. Ensure the private key has the `0x` prefix

### API Connection Errors

1. Verify `PEAR_API_URL` is accessible
2. Check your network connection
3. Review backend logs for detailed error messages

## Best Practices

1. **Always include stop loss**: Protect against unexpected price movements
2. **Use appropriate slippage**: Higher slippage for volatile assets
3. **Test with small amounts first**: Verify the flow before large trades
4. **Monitor fills array**: Check execution prices and sizes
5. **Handle errors gracefully**: Display clear messages to users
6. **Validate weights**: Ensure they sum to 1.0 for each side
7. **Use TWAP for large orders**: Reduces market impact

## Additional Resources

- [Pear Protocol Documentation](https://docs.pearprotocol.io)
- [Backend Implementation](./app/trade/router_pear.py)
- [Service Layer](./app/trade/services/pear_service.py)
- [Schema Definitions](./app/trade/schemas.py)
