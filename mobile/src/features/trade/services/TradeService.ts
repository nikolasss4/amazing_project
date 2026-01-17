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

import { TradeOrder, TradeTheme, TradePair } from '../models';

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

class TradeServiceClass {
  /**
   * Base URL for Pear Execution API
   * Mainnet: hl-v2.pearprotocol.io (production environment)
   */
  private apiBaseUrl = 'https://hl-v2.pearprotocol.io';
  private clientId = 'HLHackathon1'; // Default, can be rotated

  /**
   * Access token getter function
   * Set via setAccessTokenGetter() when authentication is implemented
   */
  private accessTokenGetter: (() => Promise<string>) | null = null;

  /**
   * Get access token for API authentication
   * TODO: Implement when Step 2 (Authentication) is completed
   * For now, returns empty string - will need to be replaced with actual token
   */
  private async getAccessToken(): Promise<string> {
    if (this.accessTokenGetter) {
      return await this.accessTokenGetter();
    }
    // TODO: Replace with actual AuthService.getAccessToken() when authentication is implemented
    // For now, return empty string - API calls will fail with 401 until auth is implemented
    return '';
  }

  /**
   * Submit a trade order to Pear Execution API
   * Routes to appropriate endpoint based on order type:
   * - Single token trades -> /orders/spot
   * - Pair/basket trades -> /positions
   */
  async submitOrder(order: TradeOrder): Promise<PearTradeResponse> {
    try {
      // Get access token (will be empty until auth is implemented)
      const accessToken = await this.getAccessToken();

      // Route to appropriate endpoint based on order type
      if (order.type === 'single' && order.pair) {
        // Single spot order
        return await this.submitSpotOrder(order, accessToken);
      } else if (order.type === 'theme') {
        // Pair or basket trade (position)
        return await this.submitPosition(order, accessToken);
      } else {
        return {
          success: false,
          error: 'Invalid order type. Must be single token or theme trade.',
        };
      }
    } catch (error) {
      console.error('TradeService error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
      };
    }
  }

  /**
   * Submit a single spot order
   * Endpoint: POST /orders/spot
   */
  private async submitSpotOrder(
    order: TradeOrder,
    accessToken: string
  ): Promise<PearTradeResponse> {
    try {
      // Convert to Pear API format
      const asset = order.pair!.symbol.replace('USD', '').replace('/', '');
      const requestBody: PearSpotOrderRequest = {
        asset,
        isBuy: order.side === 'long',
        amount: order.amount,
      };

      const response = await fetch(`${this.apiBaseUrl}/orders/spot`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(accessToken && { Authorization: `Bearer ${accessToken}` }),
        },
        body: JSON.stringify(requestBody),
      });

      return await this.handleApiResponse(response);
    } catch (error) {
      console.error('Spot order error:', error);
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
    accessToken: string
  ): Promise<PearTradeResponse> {
    try {
      // Convert to Pear API format
      const requestBody = this.convertToPositionRequest(order);

      const response = await fetch(`${this.apiBaseUrl}/positions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(accessToken && { Authorization: `Bearer ${accessToken}` }),
        },
        body: JSON.stringify(requestBody),
      });

      return await this.handleApiResponse(response);
    } catch (error) {
      console.error('Position trade error:', error);
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
    const isPairTrade = order.type === 'theme' && order.theme?.type === 'pair';
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

    if (!response.ok) {
      // Handle error response
      let errorMessage = `API error: ${response.status} ${response.statusText}`;

      if (isJson) {
        try {
          const errorData = (await response.json()) as PearErrorResponse;
          errorMessage = errorData.error?.message || errorMessage;
        } catch (e) {
          // Failed to parse error JSON, use default message
        }
      }

      return {
        success: false,
        error: errorMessage,
      };
    }

    // Handle success response
    if (isJson) {
      try {
        const data = (await response.json()) as PearSuccessResponse;
        return {
          success: true,
          orderId: data.orderId,
          positionId: data.positionId,
          message: data.message || 'Order executed successfully',
        };
      } catch (e) {
        return {
          success: false,
          error: 'Failed to parse API response',
        };
      }
    }

    // Non-JSON success response
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
   * Set access token getter function
   * Call this when authentication is implemented to provide token retrieval
   */
  setAccessTokenGetter(getter: () => Promise<string>): void {
    this.getAccessToken = getter;
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
}

export const TradeService = new TradeServiceClass();
