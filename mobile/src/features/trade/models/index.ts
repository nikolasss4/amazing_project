export interface TradePair {
  symbol: string;
  displayName: string;
  currentPrice: number;
  change24h: number;
}

export interface TradeOrder {
  pair: TradePair;
  side: 'buy' | 'sell';
  type: 'market' | 'limit';
  amount: number;
  price?: number;
}

// Mock data
export const mockTradePairs: TradePair[] = [
  { symbol: 'BTCUSD', displayName: 'BTC/USD', currentPrice: 67500, change24h: 2.5 },
  { symbol: 'ETHUSD', displayName: 'ETH/USD', currentPrice: 3200, change24h: -1.2 },
  { symbol: 'AAPL', displayName: 'AAPL', currentPrice: 178.5, change24h: 0.8 },
  { symbol: 'TSLA', displayName: 'TSLA', currentPrice: 242.8, change24h: 3.2 },
  { symbol: 'SOLUSD', displayName: 'SOL/USD', currentPrice: 145.3, change24h: 5.1 },
];
