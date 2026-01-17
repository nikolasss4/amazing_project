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

// Mock themes/narratives for basket and pair trading
export const mockThemes: TradeTheme[] = [
  {
    id: 'ai-tokens',
    name: 'AI Tokens',
    description: 'Bet on AI ecosystem tokens going up',
    icon: '🤖',
    tokens: ['HYPE', 'ASTER', 'AI'],
    change24h: 5.2,
    type: 'basket',
  },
  {
    id: 'l2s',
    name: 'Layer 2s',
    description: 'Bet on L2 scaling solutions',
    icon: '⚡',
    tokens: ['ARB', 'OP', 'STRK'],
    change24h: 3.8,
    type: 'basket',
  },
  {
    id: 'defi',
    name: 'DeFi',
    description: 'Bet on decentralized finance tokens',
    icon: '💎',
    tokens: ['UNI', 'AAVE', 'MKR'],
    change24h: -1.5,
    type: 'basket',
  },
  {
    id: 'sol-ecosystem',
    name: 'SOL Ecosystem',
    description: 'Bet on Solana ecosystem tokens',
    icon: '☀️',
    tokens: ['SOL', 'RAY', 'JUP'],
    change24h: 7.1,
    type: 'basket',
  },
  {
    id: 'hype-vs-aster',
    name: 'HYPE vs ASTER',
    description: 'Long HYPE, Short ASTER',
    icon: '⚖️',
    tokens: ['HYPE', 'ASTER'],
    change24h: 2.3,
    type: 'pair',
    longAsset: 'HYPE',
    shortAsset: 'ASTER',
  },
  {
    id: 'eth-vs-btc',
    name: 'ETH vs BTC',
    description: 'Long ETH, Short BTC',
    icon: '📊',
    tokens: ['ETH', 'BTC'],
    change24h: -0.8,
    type: 'pair',
    longAsset: 'ETH',
    shortAsset: 'BTC',
  },
];

// Mock data for single pairs
export const mockTradePairs: TradePair[] = [
  { symbol: 'BTCUSD', displayName: 'BTC/USD', currentPrice: 67500, change24h: 2.5 },
  { symbol: 'ETHUSD', displayName: 'ETH/USD', currentPrice: 3200, change24h: -1.2 },
  { symbol: 'SOLUSD', displayName: 'SOL/USD', currentPrice: 145.3, change24h: 5.1 },
];
