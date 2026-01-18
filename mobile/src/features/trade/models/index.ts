export interface TradePair {
  symbol: string;
  displayName: string;
  currentPrice: number;
  change24h: number;
}

export interface TradeTheme {
  id: string;
  name: string;
  description: string;
  icon: string;
  tokens: string[];
  change24h: number;
  type: 'basket' | 'pair';
  // For pair trades
  longAsset?: string;
  shortAsset?: string;
}

export interface TradeCondition {
  asset: string;
  operator: 'gt' | 'lt' | 'gte' | 'lte';
  value: number;
}

export interface TradeOrder {
  type: 'theme' | 'pair' | 'single';
  theme?: TradeTheme;
  pair?: TradePair;
  side: 'long' | 'short';
  orderType: 'market' | 'limit';
  amount: number;
  price?: number;
  condition?: TradeCondition;
}

// Mock themes/narratives (kept for backward compatibility but no longer used in UI)

// Available assets for trading (common on Pear/Hyperliquid)
export interface AvailableAsset {
  symbol: string;
  displayName: string;
  currentPrice?: number;
  change24h?: number;
}

export const availableAssets: AvailableAsset[] = [
  // Major tokens
  { symbol: 'BTC', displayName: 'Bitcoin', currentPrice: 67500, change24h: 2.5 },
  { symbol: 'ETH', displayName: 'Ethereum', currentPrice: 3200, change24h: -1.2 },
  { symbol: 'SOL', displayName: 'Solana', currentPrice: 145.3, change24h: 5.1 },
  // AI tokens
  { symbol: 'HYPE', displayName: 'Hyperliquid', currentPrice: 28.5, change24h: 3.2 },
  { symbol: 'ASTER', displayName: 'Aster', currentPrice: 1.8, change24h: -2.1 },
  { symbol: 'AI', displayName: 'AI Token', currentPrice: 0.45, change24h: 5.8 },
  // Layer 2s
  { symbol: 'ARB', displayName: 'Arbitrum', currentPrice: 1.2, change24h: 2.3 },
  { symbol: 'OP', displayName: 'Optimism', currentPrice: 2.8, change24h: 1.5 },
  { symbol: 'STRK', displayName: 'Starknet', currentPrice: 0.9, change24h: -0.8 },
  // DeFi
  { symbol: 'UNI', displayName: 'Uniswap', currentPrice: 8.5, change24h: -1.2 },
  { symbol: 'AAVE', displayName: 'Aave', currentPrice: 95.2, change24h: 0.8 },
  { symbol: 'MKR', displayName: 'Maker', currentPrice: 2500, change24h: -0.5 },
  // Solana ecosystem
  { symbol: 'RAY', displayName: 'Raydium', currentPrice: 1.8, change24h: 4.2 },
  { symbol: 'JUP', displayName: 'Jupiter', currentPrice: 0.65, change24h: 3.1 },
];

// Mock data for single pairs (for backward compatibility)
export const mockTradePairs: TradePair[] = [
  { symbol: 'BTCUSD', displayName: 'BTC/USD', currentPrice: 67500, change24h: 2.5 },
  { symbol: 'ETHUSD', displayName: 'ETH/USD', currentPrice: 3200, change24h: -1.2 },
  { symbol: 'SOLUSD', displayName: 'SOL/USD', currentPrice: 145.3, change24h: 5.1 },
];

// Basket themes (kept for backward compatibility but no longer used in UI)
