/**
 * AssetService - Fetches available trading assets
 * - Pairs/Baskets: From Pear Protocol API
 * - Single: From Hyperliquid API
 * 
 * Backend endpoint: /api/trade/instruments
 * 
 * Configuration:
 * - By default, uses fallback assets (no backend connection required)
 * - To connect to backend: Call AssetService.setBackendUrl('http://your-backend-url')
 * - For development: Use your machine's IP address (e.g., 'http://192.168.1.100:8000')
 * - For production: Use your production backend URL
 */

import { BACKEND_BASE_URL } from '@app/config';

export interface Instrument {
  symbol: string;
  name: string;
  base_currency: string;
  quote_currency: string;
  min_order_size?: number;
  price_decimals?: number;
  size_decimals?: number;
  source: 'pear' | 'hyperliquid';
  currentPrice?: number;
  change24h?: number;
}

export interface InstrumentsResponse {
  instruments: Instrument[];
  count: number;
  cached_at?: string;
}

class AssetServiceClass {
  /**
   * Backend API base URL
   * For development: Use your machine's IP address (e.g., http://192.168.1.100:8000)
   * For production: Use your production backend URL
   * Set via setBackendUrl() or update this default
   */
  private backendBaseUrl: string | null = BACKEND_BASE_URL; // Initialize from config

  /**
   * Fetch available assets from Pear Protocol
   * Used for pair and basket trading
   */
  async getPearAssets(): Promise<Instrument[]> {
    // If no backend URL is set, use fallback immediately
    if (!this.backendBaseUrl) {
      // Silently use fallback assets (no warning needed)
      return this.getFallbackPearAssets();
    }

    try {
      // Create abort controller for timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout

      const response = await fetch(`${this.backendBaseUrl}/api/trade/instruments/pear`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        signal: controller.signal,
      });

      clearTimeout(timeoutId);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch Pear assets: ${response.statusText}`);
      }

      const data: InstrumentsResponse = await response.json();
      return data.instruments.map(asset => ({
        ...asset,
        // Add mock price data if not available
        currentPrice: asset.currentPrice || this.getMockPrice(asset.symbol),
        change24h: asset.change24h || this.getMockChange(asset.symbol),
      }));
    } catch (error) {
      // Silently fall back to mock data - don't show error to user
      return this.getFallbackPearAssets();
    }
  }

  /**
   * Fetch available assets from Hyperliquid
   * Used for single token trading
   */
  async getHyperliquidAssets(): Promise<Instrument[]> {
    // If no backend URL is set, use fallback immediately
    if (!this.backendBaseUrl) {
      // Silently use fallback assets (no warning needed)
      return this.getFallbackHyperliquidAssets();
    }

    try {
      // Create abort controller for timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout

      const response = await fetch(`${this.backendBaseUrl}/api/trade/instruments/hyperliquid`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        signal: controller.signal,
      });

      clearTimeout(timeoutId);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch Hyperliquid assets: ${response.statusText}`);
      }

      const data: InstrumentsResponse = await response.json();
      return data.instruments.map(asset => ({
        ...asset,
        // Add mock price data if not available
        currentPrice: asset.currentPrice || this.getMockPrice(asset.symbol),
        change24h: asset.change24h || this.getMockChange(asset.symbol),
      }));
    } catch (error) {
      // Silently fall back to mock data - don't show error to user
      return this.getFallbackHyperliquidAssets();
    }
  }

  /**
   * Get all available assets (both Pear and Hyperliquid)
   */
  async getAllAssets(): Promise<Instrument[]> {
    // If no backend URL is set, use fallback immediately
    if (!this.backendBaseUrl) {
      console.warn('Backend URL not configured. Using fallback assets.');
      return [...this.getFallbackPearAssets(), ...this.getFallbackHyperliquidAssets()];
    }

    try {
      // Create abort controller for timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout

      const response = await fetch(`${this.backendBaseUrl}/api/trade/instruments`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        signal: controller.signal,
      });

      clearTimeout(timeoutId);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch assets: ${response.statusText}`);
      }

      const data: InstrumentsResponse = await response.json();
      return data.instruments.map(asset => ({
        ...asset,
        currentPrice: asset.currentPrice || this.getMockPrice(asset.symbol),
        change24h: asset.change24h || this.getMockChange(asset.symbol),
      }));
    } catch (error) {
      // Silently fall back to mock data
      return [...this.getFallbackPearAssets(), ...this.getFallbackHyperliquidAssets()];
    }
  }

  /**
   * Set backend base URL (for different environments)
   */
  setBackendUrl(url: string): void {
    this.backendBaseUrl = url;
  }

  /**
   * Mock price generator (fallback)
   */
  private getMockPrice(symbol: string): number {
    const prices: Record<string, number> = {
      BTC: 67500,
      ETH: 3200,
      SOL: 145.3,
      HYPE: 28.5,
      ASTER: 1.8,
      AI: 0.45,
      ARB: 1.2,
      OP: 2.8,
      STRK: 0.9,
      UNI: 8.5,
      AAVE: 95.2,
      MKR: 2500,
      RAY: 1.8,
      JUP: 0.65,
    };
    return prices[symbol] || 100;
  }

  /**
   * Mock change generator (fallback)
   */
  private getMockChange(symbol: string): number {
    const changes: Record<string, number> = {
      BTC: 2.5,
      ETH: -1.2,
      SOL: 5.1,
      HYPE: 3.2,
      ASTER: -2.1,
      AI: 5.8,
      ARB: 2.3,
      OP: 1.5,
      STRK: -0.8,
      UNI: -1.2,
      AAVE: 0.8,
      MKR: -0.5,
      RAY: 4.2,
      JUP: 3.1,
    };
    return changes[symbol] || 0;
  }

  /**
   * Fallback Pear assets
   */
  private getFallbackPearAssets(): Instrument[] {
    return [
      { symbol: 'HYPE', name: 'Hyperliquid', base_currency: 'HYPE', quote_currency: 'USD', source: 'pear', currentPrice: 28.5, change24h: 3.2 },
      { symbol: 'ASTER', name: 'Aster', base_currency: 'ASTER', quote_currency: 'USD', source: 'pear', currentPrice: 1.8, change24h: -2.1 },
      { symbol: 'AI', name: 'AI Token', base_currency: 'AI', quote_currency: 'USD', source: 'pear', currentPrice: 0.45, change24h: 5.8 },
      { symbol: 'ARB', name: 'Arbitrum', base_currency: 'ARB', quote_currency: 'USD', source: 'pear', currentPrice: 1.2, change24h: 2.3 },
      { symbol: 'OP', name: 'Optimism', base_currency: 'OP', quote_currency: 'USD', source: 'pear', currentPrice: 2.8, change24h: 1.5 },
      { symbol: 'STRK', name: 'Starknet', base_currency: 'STRK', quote_currency: 'USD', source: 'pear', currentPrice: 0.9, change24h: -0.8 },
      { symbol: 'UNI', name: 'Uniswap', base_currency: 'UNI', quote_currency: 'USD', source: 'pear', currentPrice: 8.5, change24h: -1.2 },
      { symbol: 'AAVE', name: 'Aave', base_currency: 'AAVE', quote_currency: 'USD', source: 'pear', currentPrice: 95.2, change24h: 0.8 },
      { symbol: 'MKR', name: 'Maker', base_currency: 'MKR', quote_currency: 'USD', source: 'pear', currentPrice: 2500, change24h: -0.5 },
      { symbol: 'RAY', name: 'Raydium', base_currency: 'RAY', quote_currency: 'USD', source: 'pear', currentPrice: 1.8, change24h: 4.2 },
      { symbol: 'JUP', name: 'Jupiter', base_currency: 'JUP', quote_currency: 'USD', source: 'pear', currentPrice: 0.65, change24h: 3.1 },
      { symbol: 'BTC', name: 'Bitcoin', base_currency: 'BTC', quote_currency: 'USD', source: 'pear', currentPrice: 67500, change24h: 2.5 },
      { symbol: 'ETH', name: 'Ethereum', base_currency: 'ETH', quote_currency: 'USD', source: 'pear', currentPrice: 3200, change24h: -1.2 },
      { symbol: 'SOL', name: 'Solana', base_currency: 'SOL', quote_currency: 'USD', source: 'pear', currentPrice: 145.3, change24h: 5.1 },
    ];
  }

  /**
   * Fallback Hyperliquid assets
   */
  private getFallbackHyperliquidAssets(): Instrument[] {
    return [
      { symbol: 'BTC', name: 'Bitcoin', base_currency: 'BTC', quote_currency: 'USD', source: 'hyperliquid', currentPrice: 67500, change24h: 2.5 },
      { symbol: 'ETH', name: 'Ethereum', base_currency: 'ETH', quote_currency: 'USD', source: 'hyperliquid', currentPrice: 3200, change24h: -1.2 },
      { symbol: 'SOL', name: 'Solana', base_currency: 'SOL', quote_currency: 'USD', source: 'hyperliquid', currentPrice: 145.3, change24h: 5.1 },
    ];
  }
}

export const AssetService = new AssetServiceClass();
