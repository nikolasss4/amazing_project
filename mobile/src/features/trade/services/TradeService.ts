/**
 * TradeService - Pear Execution API integration
 * Handles pair trades, basket trades, and single token trades
 * 
 * Pear API Docs: https://docs.pearprotocol.io/api-integration/overview
 * Authentication: https://docs.pearprotocol.io/api-integration/access-management/authentication-process
 * 
 * ClientIDs: HLHackathon1 through HLHackathon10
 * 
 * API Endpoints:
 * - Single spot orders: POST /orders/spot
 * - Pair/basket trades: POST /positions
 */

import { Platform } from 'react-native';
import { TradeOrder, TradeTheme, TradePair } from '../models';
import { useWalletStore } from '../../../app/store';

// Dynamic API Base URL - matches WalletService configuration
// For iOS Simulator: use 'localhost'
// For Android Emulator: use '10.0.2.2'
// For physical device: use your machine's LAN IP (e.g., '10.0.11.138')
// For web: use 'localhost'
const getApiBaseUrl = () => {
  if (Platform.OS === 'web') {
    return 'http://localhost:8000/api/trade/pear';
  }
  // For mobile devices, use LAN IP
  return 'http://10.0.11.138:8000/api/trade/pear';
};

/**
 * Request format for single spot orders
 * Endpoint: POST /orders/spot
 */
export interface PearSpotOrderRequest {
  asset: string; // Asset symbol (e.g., "USDH", "BTC")
  isBuy: boolean; // true for buy, false for sell
  amount: number; // Minimum 0.1
}

/**
 * Request format for pair/basket position trades
 * Endpoint: POST /positions
 */
export interface PearPositionRequest {
  slippage: number; // Slippage tolerance (0.01 = 1%)
  executionType: 'SYNC' | 'MARKET' | 'TRIGGER' | 'TWAP' | 'LADDER' | 'TP' | 'SL' | 'SPOT_MARKET' | 'SPOT_LIMIT' | 'SPOT_TWAP';
  leverage: number; // Leverage (1-100)
  usdValue: number; // Total notional USD size
  longAssets?: Array<{ asset: string; weight: number }>; // Assets to go long
  shortAssets?: Array<{ asset: string; weight: number }>; // Assets to go short
  // Conditional execution (for TRIGGER type)
  triggerValue?: string;
  triggerType?: 'PRICE' | 'PRICE_RATIO' | 'WEIGHTED_RATIO' | 'BTC_DOM' | 'CROSS_ASSET_PRICE' | 'PREDICTION_MARKET_OUTCOME';
  direction?: 'MORE_THAN' | 'LESS_THAN';
  assetName?: string; // For CROSS_ASSET_PRICE triggers
  marketCode?: string; // For prediction market triggers
  // TWAP options
  twapDuration?: number; // Duration in minutes
  twapIntervalSeconds?: number; // Default 30
  randomizeExecution?: boolean;
  // Risk management
  stopLoss?: { type: 'PERCENTAGE' | 'DOLLAR' | 'POSITION_VALUE'; value: number } | null;
  takeProfit?: { type: 'PERCENTAGE' | 'DOLLAR' | 'POSITION_VALUE'; value: number } | null;
}

/**
 * API Error response format
 */
export interface PearErrorResponse {
  error: {
    message: string;
    code: string;
    type?: string | null;
    param?: string | null;
  };
}

/**
 * API Success response format
 */
export interface PearSuccessResponse {
  success: boolean;
  orderId?: string;
  positionId?: string;
  message?: string;
  data?: any;
}

export interface PearTradeResponse {
  success: boolean;
  orderId?: string;
  positionId?: string;
  message?: string;
  error?: string;
}

/**
 * Asset position details from Pear Protocol
 */
export interface PearAssetPosition {
  coin: string;
  entryPrice: number;
  actualSize: number;
  leverage: number;
  marginUsed: number;
  positionValue: number;
  unrealizedPnl: number;
  entryPositionValue: number;
  initialWeight: number;
  fundingPaid: number;
}

/**
 * Open position from Pear Protocol
 */
export interface PearOpenPosition {
  positionId: string;
  address: string;
  pearExecutionFlag: string;
  stopLoss?: {
    type: string;
    value: number;
    isTrailing: boolean;
    trailingDeltaValue?: number;
    trailingActivationValue?: number;
  } | null;
  takeProfit?: {
    type: string;
    value: number;
    isTrailing: boolean;
    trailingDeltaValue?: number;
    trailingActivationValue?: number;
  } | null;
  entryRatio: number;
  markRatio: number;
  entryPriceRatio: number;
  markPriceRatio: number;
  entryPositionValue: number;
  positionValue: number;
  marginUsed: number;
  unrealizedPnl: number;
  unrealizedPnlPercentage: number;
  longAssets: PearAssetPosition[];
  shortAssets: PearAssetPosition[];
  createdAt: string;
  updatedAt: string;
}

/**
 * Response from get open positions endpoint
 */
export interface GetOpenPositionsResponse {
  success: boolean;
  positions: PearOpenPosition[];
  count: number;
  error?: string;
}

/**
 * Multi-pair order leg format
 */
export interface MultiPairLeg {
  longAsset: string;
  shortAsset: string;
  weight: number;
}

/**
 * Multi-pair order format (from TradeScreen)
 */
export interface MultiPairOrder {
  type: 'multi-pair';
  legs: MultiPairLeg[];
  amount: number;
  orderType: 'market' | 'limit';
}

class TradeServiceClass {
  /**
   * Base URL for Pear Execution API
   * Dynamically determined based on platform (web/mobile)
   */
  private apiBaseUrl = getApiBaseUrl();
  private clientId = 'HLHackathon1'; // Default, can be rotated

  /**
   * Get access token for API authentication
   * Uses wallet store to get the stored access token
   */
  private async getAccessToken(): Promise<string> {
    const token = useWalletStore.getState().getAccessToken();
    return token || '';
  }

  /**
   * Submit a trade order to Pear Execution API
   * Routes to appropriate endpoint based on order type:
   * - Single token trades -> /orders/spot
   * - Pair/basket trades -> /positions
   * - Multi-pair trades -> /positions (aggregated)
   */
  async submitOrder(order: TradeOrder | MultiPairOrder, walletAddress: string): Promise<PearTradeResponse> {
    console.log('\n' + '='.repeat(80));
    console.log('SUBMITTING TRADE ORDER');
    console.log('='.repeat(80));
    console.log('Platform:', Platform.OS);
    console.log('Order Type:', order.type);
    console.log('Amount:', order.amount);
    console.log('Wallet:', walletAddress);
    console.log('API Base URL:', this.apiBaseUrl);
    
    try {
      // Get access token
      console.log('Getting access token...');
      const accessToken = await this.getAccessToken();
      console.log('Access token:', accessToken ? accessToken.substring(0, 20) + '...' : 'NONE');

      // Route to appropriate endpoint based on order type
      if (order.type === 'multi-pair') {
        console.log('Routing to MULTI-PAIR position endpoint');
        return await this.submitMultiPairPosition(order as MultiPairOrder, accessToken, walletAddress);
      } else if (order.type === 'single' && (order as TradeOrder).pair) {
        console.log('Routing to SINGLE spot order endpoint');
        return await this.submitSpotOrder(order as TradeOrder, accessToken, walletAddress);
      } else if (order.type === 'pair' || order.type === 'theme') {
        console.log('Routing to PAIR/BASKET position endpoint');
        return await this.submitPosition(order as TradeOrder, accessToken, walletAddress);
      } else {
        console.error('Invalid order type!');
        return {
          success: false,
          error: 'Invalid order type. Must be single token, pair trade, or multi-pair.',
        };
      }
    } catch (error) {
      console.error('TradeService error:', error);
      console.log('='.repeat(80) + '\n');
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
      };
    }
  }

  /**
   * Submit a multi-pair position trade
   * This is for the new "Make Your Bet" interface
   */
  private async submitMultiPairPosition(
    order: MultiPairOrder,
    accessToken: string,
    walletAddress: string
  ): Promise<PearTradeResponse> {
    // Build URL with authorization as query param so backend can forward to Pear API
    const baseUrl = `${this.apiBaseUrl}/positions`;
    const url = accessToken 
      ? `${baseUrl}?authorization=${encodeURIComponent(accessToken)}`
      : baseUrl;
    
    try {
      // Build long and short assets from legs
      // For Pear Protocol pair trades, both longAssets AND shortAssets are required
      const longAssets: Array<{ asset: string; weight: number }> = [];
      const shortAssets: Array<{ asset: string; weight: number }> = [];
      
      for (const leg of order.legs) {
        // Add actual trading assets (skip USDC as it will be added with weight 0)
        if (leg.longAsset !== 'USDC') {
          longAssets.push({ asset: leg.longAsset, weight: leg.weight / 100 });
        }
        if (leg.shortAsset !== 'USDC') {
          shortAssets.push({ asset: leg.shortAsset, weight: leg.weight / 100 });
        }
      }

      // Always include USDC with minimal weight in both arrays
      // This ensures both longAssets and shortAssets are never empty
      longAssets.push({ asset: 'USDC', weight: 0.0001 });
      shortAssets.push({ asset: 'USDC', weight: 0.0001 });

      const requestBody = {
        slippage: 0.01,
        executionType: 'MARKET',  // Use MARKET for immediate execution
        leverage: 1,
        usdValue: order.amount,
        longAssets,
        shortAssets,
        // Default stopLoss and takeProfit at 100%
        stopLoss: {
          type: 'PERCENTAGE',
          value: 100,
        },
        takeProfit: {
          type: 'PERCENTAGE',
          value: 100,
        },
        walletAddress,
      };

      console.log('\n' + '='.repeat(80));
      console.log('MULTI-PAIR POSITION REQUEST');
      console.log('='.repeat(80));
      console.log('URL:', url);
      console.log('Access Token:', accessToken ? accessToken.substring(0, 20) + '...' : 'NONE');
      console.log('Body:', JSON.stringify(requestBody, null, 2));
      console.log('Making POST request to Pear Protocol via backend...');

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      console.log('Response Status:', response.status);
      return await this.handleApiResponse(response);
    } catch (error) {
      console.error('Multi-pair position error:', error);
      console.log('='.repeat(80) + '\n');
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to execute multi-pair trade',
      };
    }
  }

  /**
   * Submit a single spot order
   * Endpoint: POST /orders/spot
   */
  private async submitSpotOrder(
    order: TradeOrder,
    accessToken: string,
    walletAddress: string
  ): Promise<PearTradeResponse> {
    // Build URL with authorization as query param so backend can forward to Pear API
    const baseUrl = `${this.apiBaseUrl}/orders/spot`;
    const url = accessToken 
      ? `${baseUrl}?authorization=${encodeURIComponent(accessToken)}`
      : baseUrl;
    
    try {
      // Convert to Pear API format
      const asset = order.pair!.symbol.replace('USD', '').replace('/', '');
      const requestBody: any = {
        asset,
        isBuy: order.side === 'long',
        amount: order.amount,
        walletAddress, // Include wallet address
      };

      console.log('\n' + '='.repeat(80));
      console.log('SPOT ORDER REQUEST');
      console.log('='.repeat(80));
      console.log('URL:', url);
      console.log('Access Token:', accessToken ? accessToken.substring(0, 20) + '...' : 'NONE');
      console.log('Body:', JSON.stringify(requestBody, null, 2));
      console.log('Making POST request...');

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      console.log('Response Status:', response.status);
      return await this.handleApiResponse(response);
    } catch (error) {
      console.error('Spot order error:', error);
      console.log('='.repeat(80) + '\n');
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to execute spot order',
      };
    }
  }

  /**
   * Submit a pair or basket position trade
   * Endpoint: POST /positions
   */
  private async submitPosition(
    order: TradeOrder,
    accessToken: string,
    walletAddress: string
  ): Promise<PearTradeResponse> {
    // Build URL with authorization as query param so backend can forward to Pear API
    const baseUrl = `${this.apiBaseUrl}/positions`;
    const url = accessToken 
      ? `${baseUrl}?authorization=${encodeURIComponent(accessToken)}`
      : baseUrl;
    
    try {
      // Convert to Pear API format
      const requestBody = {
        ...this.convertToPositionRequest(order),
        walletAddress, // Include wallet address
      };

      console.log('\n' + '='.repeat(80));
      console.log('POSITION ORDER REQUEST');
      console.log('='.repeat(80));
      console.log('URL:', url);
      console.log('Access Token:', accessToken ? accessToken.substring(0, 20) + '...' : 'NONE');
      console.log('Body:', JSON.stringify(requestBody, null, 2));
      console.log('Making POST request to Pear Protocol via backend...');

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      console.log('Response Status:', response.status);
      return await this.handleApiResponse(response);
    } catch (error) {
      console.error('Position trade error:', error);
      console.log('='.repeat(80) + '\n');
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to execute position trade',
      };
    }
  }

  /**
   * Convert TradeOrder to Pear Position API request format
   */
  private convertToPositionRequest(order: TradeOrder): PearPositionRequest {
    const isLong = order.side === 'long';
    const isPairTrade = (order.type === 'pair' || order.type === 'theme') && order.theme?.type === 'pair';
    const isBasketTrade = order.type === 'theme' && order.theme?.type === 'basket';

    // Determine execution type based on order type and conditions
    let executionType: PearPositionRequest['executionType'] = 'MARKET';
    if (order.orderType === 'limit') {
      executionType = 'SPOT_LIMIT';
    } else if (order.condition) {
      executionType = 'TRIGGER';
    } else {
      executionType = 'MARKET';
    }

    const baseRequest: PearPositionRequest = {
      slippage: 0.01, // 1% default slippage tolerance
      executionType,
      leverage: 1, // Default to 1x (no leverage) for simplicity
      usdValue: order.amount,
    };

    // Handle pair trades
    if (isPairTrade && order.theme) {
      if (isLong) {
        baseRequest.longAssets = [{ asset: order.theme.longAsset!, weight: 1.0 }];
        baseRequest.shortAssets = [{ asset: order.theme.shortAsset!, weight: 1.0 }];
      } else {
        // Short pair trade = reverse the long/short
        baseRequest.longAssets = [{ asset: order.theme.shortAsset!, weight: 1.0 }];
        baseRequest.shortAssets = [{ asset: order.theme.longAsset!, weight: 1.0 }];
      }
    }

    // Handle basket trades
    if (isBasketTrade && order.theme) {
      const tokens = order.theme.tokens;
      const weightPerToken = 1.0 / tokens.length;

      if (isLong) {
        baseRequest.longAssets = tokens.map((token) => ({
          asset: token,
          weight: weightPerToken,
        }));
        // Default: short against ETH
        baseRequest.shortAssets = [{ asset: 'ETH', weight: 1.0 }];
      } else {
        // Short basket trade
        baseRequest.shortAssets = tokens.map((token) => ({
          asset: token,
          weight: weightPerToken,
        }));
        // Default: long ETH
        baseRequest.longAssets = [{ asset: 'ETH', weight: 1.0 }];
      }
    }

    // Add conditional execution (trigger)
    if (order.condition) {
      baseRequest.triggerType = 'PRICE'; // Default to price trigger
      baseRequest.triggerValue = order.condition.value.toString();
      baseRequest.direction =
        order.condition.operator === 'gt' || order.condition.operator === 'gte'
          ? 'MORE_THAN'
          : 'LESS_THAN';
      baseRequest.assetName = order.condition.asset;
    }

    return baseRequest;
  }

  /**
   * Handle API response and convert to our format
   */
  private async handleApiResponse(response: Response): Promise<PearTradeResponse> {
    const contentType = response.headers.get('content-type');
    const isJson = contentType?.includes('application/json');

    console.log('📋 Content-Type:', contentType);
    console.log('📋 Is JSON:', isJson);

    if (!response.ok) {
      console.error('❌ Response NOT OK!');
      console.error('📊 Status:', response.status, response.statusText);
      
      // Handle error response
      let errorMessage = `API error: ${response.status} ${response.statusText}`;

      if (isJson) {
        try {
          const errorData = (await response.json()) as PearErrorResponse;
          console.error('📦 Error Data:', errorData);
          errorMessage = errorData.error?.message || errorMessage;
        } catch (e) {
          console.error('Failed to parse error JSON:', e);
        }
      } else {
        try {
          const text = await response.text();
          console.error('📦 Error Text:', text);
        } catch (e) {
          console.error('Failed to read error text:', e);
        }
      }

      console.log('='.repeat(80) + '\n');
      return {
        success: false,
        error: errorMessage,
      };
    }

    // Handle success response
    console.log('✅ Response OK!');
    
    if (isJson) {
      try {
        const data = (await response.json()) as PearSuccessResponse;
        console.log('📦 Success Data:', data);
        console.log('='.repeat(80) + '\n');
        return {
          success: true,
          orderId: data.orderId,
          positionId: data.positionId,
          message: data.message || 'Order executed successfully',
        };
      } catch (e) {
        console.error('❌ Failed to parse success JSON:', e);
        console.log('='.repeat(80) + '\n');
        return {
          success: false,
          error: 'Failed to parse API response',
        };
      }
    }

    // Non-JSON success response
    console.log('✅ Non-JSON success response');
    console.log('='.repeat(80) + '\n');
    return {
      success: true,
      message: 'Order executed successfully',
    };
  }

  /**
   * Set client ID (for rotating between HLHackathon1-10)
   */
  setClientId(clientId: string): void {
    this.clientId = clientId;
  }

  /**
   * Get available themes/pairs from API
   * TODO: Implement when Pear API provides this endpoint
   */
  async getAvailableThemes(): Promise<TradeTheme[]> {
    // This would fetch from Pear API
    // For now, return empty array (using mock data from models)
    return [];
  }

  /**
   * Get available pairs from API
   * TODO: Implement when Pear API provides this endpoint
   */
  async getAvailablePairs(): Promise<TradePair[]> {
    // This would fetch from Pear API
    // For now, return empty array (using mock data from models)
    return [];
  }

  /**
   * Get open positions from Pear Protocol
   * Calls backend which proxies to Pear Protocol API
   */
  async getOpenPositions(accessToken?: string): Promise<GetOpenPositionsResponse> {
    console.log('\n' + '='.repeat(80));
    console.log('FETCHING OPEN POSITIONS');
    console.log('='.repeat(80));
    console.log('Platform:', Platform.OS);
    console.log('API Base URL:', this.apiBaseUrl);
    console.log('Access Token:', accessToken ? accessToken.substring(0, 20) + '...' : 'NONE');

    try {
      // Get access token from store if not provided
      const token = accessToken || await this.getAccessToken();
      
      const url = `${this.apiBaseUrl}/positions/open${token ? `?authorization=${encodeURIComponent(token)}` : ''}`;
      console.log('Request URL:', url);
      console.log('Making GET request...');

      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
        },
      });

      console.log('Response Status:', response.status);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Error Response:', errorText);
        console.log('='.repeat(80) + '\n');
        return {
          success: false,
          positions: [],
          count: 0,
          error: `Failed to fetch positions: ${response.status} ${response.statusText}`,
        };
      }

      const data = await response.json();
      console.log('Response Data:', JSON.stringify(data, null, 2));
      console.log('='.repeat(80) + '\n');

      return {
        success: data.success ?? true,
        positions: data.positions ?? [],
        count: data.count ?? 0,
        error: data.error,
      };
    } catch (error) {
      console.error('Failed to fetch open positions:', error);
      console.log('='.repeat(80) + '\n');
      return {
        success: false,
        positions: [],
        count: 0,
        error: error instanceof Error ? error.message : 'Failed to fetch positions',
      };
    }
  }
}

export const TradeService = new TradeServiceClass();
