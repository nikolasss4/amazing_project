export interface LeaderboardEntry {
  rank: number;
  userId: string;
  username: string;
  avatar?: string;
  returnPercent: number;
  winRate: number;
  tradesCount: number;
}

export interface CelebrityPortfolio {
  id: string;
  name: string;
  avatar?: string;
  strategyLabel: string;
  topHoldings: string[];
  returnPercent: number;
  lastUpdated: Date;
}

export interface SocialPost {
  id: string;
  author: string;
  handle: string;
  avatar?: string;
  content: string;
  tickersMentioned: string[];
  sentiment: 'bullish' | 'bearish' | 'neutral';
  timestamp: Date;
  likes: number;
}

// Mock data
// Mock friends leaderboard (subset of users + current user) - Top 7
export const mockFriendsLeaderboard: LeaderboardEntry[] = [
  {
    userId: 'user-you',
    username: 'You',
    rank: 1,
    returnPercent: 15.8,
    winRate: 72,
    tradesCount: 45,
  },
  {
    userId: 'user-1',
    username: 'Alice',
    rank: 3,
    returnPercent: 12.4,
    winRate: 68,
    tradesCount: 89,
  },
  {
    userId: 'user-4',
    username: 'Charlie',
    rank: 5,
    returnPercent: 8.9,
    winRate: 65,
    tradesCount: 67,
  },
  {
    userId: 'user-2',
    username: 'Bob',
    rank: 8,
    returnPercent: 5.2,
    winRate: 58,
    tradesCount: 34,
  },
  {
    userId: 'user-7',
    username: 'David',
    rank: 12,
    returnPercent: 4.8,
    winRate: 56,
    tradesCount: 52,
  },
  {
    userId: 'user-9',
    username: 'Emma',
    rank: 15,
    returnPercent: 3.5,
    winRate: 54,
    tradesCount: 41,
  },
  {
    userId: 'user-12',
    username: 'Frank',
    rank: 18,
    returnPercent: 2.1,
    winRate: 52,
    tradesCount: 38,
  },
];

export const mockLeaderboard: LeaderboardEntry[] = [
  {
    rank: 1,
    userId: '1',
    username: 'CryptoKing',
    returnPercent: 142.5,
    winRate: 78,
    tradesCount: 234,
  },
  {
    rank: 2,
    userId: '2',
    username: 'WallStreetBear',
    returnPercent: 98.3,
    winRate: 72,
    tradesCount: 189,
  },
  {
    rank: 3,
    userId: '3',
    username: 'TechBull',
    returnPercent: 87.1,
    winRate: 69,
    tradesCount: 156,
  },
  {
    rank: 4,
    userId: '4',
    username: 'DayTraderPro',
    returnPercent: 65.4,
    winRate: 64,
    tradesCount: 402,
  },
  {
    rank: 5,
    userId: '5',
    username: 'SwingMaster',
    returnPercent: 54.2,
    winRate: 61,
    tradesCount: 128,
  },
  {
    rank: 6,
    userId: '6',
    username: 'TradeGuru',
    returnPercent: 48.7,
    winRate: 59,
    tradesCount: 145,
  },
  {
    rank: 7,
    userId: '7',
    username: 'MarketWhiz',
    returnPercent: 42.3,
    winRate: 57,
    tradesCount: 167,
  },
  {
    rank: 8,
    userId: '8',
    username: 'ProfitSeeker',
    returnPercent: 38.9,
    winRate: 55,
    tradesCount: 132,
  },
  {
    rank: 9,
    userId: '9',
    username: 'BullRun',
    returnPercent: 35.6,
    winRate: 53,
    tradesCount: 98,
  },
  {
    rank: 10,
    userId: '10',
    username: 'StockMaster',
    returnPercent: 32.1,
    winRate: 51,
    tradesCount: 211,
  },
  {
    rank: 11,
    userId: '11',
    username: 'AlphaTrader',
    returnPercent: 29.8,
    winRate: 49,
    tradesCount: 178,
  },
  {
    rank: 12,
    userId: '12',
    username: 'TradingPro',
    returnPercent: 27.4,
    winRate: 47,
    tradesCount: 156,
  },
  {
    rank: 13,
    userId: '13',
    username: 'MarketMaven',
    returnPercent: 25.2,
    winRate: 45,
    tradesCount: 143,
  },
  {
    rank: 14,
    userId: '14',
    username: 'TradeExpert',
    returnPercent: 23.7,
    winRate: 43,
    tradesCount: 134,
  },
  {
    rank: 15,
    userId: '15',
    username: 'ProfitHunter',
    returnPercent: 21.5,
    winRate: 41,
    tradesCount: 125,
  },
  {
    rank: 16,
    userId: '16',
    username: 'BullTrader',
    returnPercent: 19.8,
    winRate: 39,
    tradesCount: 117,
  },
  {
    rank: 17,
    userId: '17',
    username: 'StockWizard',
    returnPercent: 18.3,
    winRate: 37,
    tradesCount: 109,
  },
  {
    rank: 18,
    userId: '18',
    username: 'TradeKing',
    returnPercent: 16.9,
    winRate: 35,
    tradesCount: 101,
  },
  {
    rank: 19,
    userId: '19',
    username: 'MarketGenius',
    returnPercent: 15.4,
    winRate: 33,
    tradesCount: 93,
  },
  {
    rank: 20,
    userId: '20',
    username: 'ProfitPro',
    returnPercent: 14.2,
    winRate: 31,
    tradesCount: 85,
  },
  {
    rank: 21,
    userId: '21',
    username: 'BullMaster',
    returnPercent: 12.8,
    winRate: 29,
    tradesCount: 77,
  },
  {
    rank: 22,
    userId: '22',
    username: 'StockExpert',
    returnPercent: 11.5,
    winRate: 27,
    tradesCount: 69,
  },
  {
    rank: 23,
    userId: '23',
    username: 'TradeHero',
    returnPercent: 10.2,
    winRate: 25,
    tradesCount: 61,
  },
  {
    rank: 24,
    userId: '24',
    username: 'MarketLeader',
    returnPercent: 9.1,
    winRate: 23,
    tradesCount: 53,
  },
  {
    rank: 25,
    userId: '25',
    username: 'ProfitChamp',
    returnPercent: 8.3,
    winRate: 21,
    tradesCount: 45,
  },
];

export const mockCelebrityPortfolios: CelebrityPortfolio[] = [
  {
    id: '1',
    name: 'Nancy P.',
    strategyLabel: 'Tech-focused',
    topHoldings: ['NVDA', 'MSFT', 'AAPL'],
    returnPercent: 45.2,
    lastUpdated: new Date(),
  },
  {
    id: '2',
    name: 'Warren B.',
    strategyLabel: 'Value investing',
    topHoldings: ['BAC', 'AAPL', 'KO'],
    returnPercent: 12.8,
    lastUpdated: new Date(),
  },
  {
    id: '3',
    name: 'Cathie W.',
    strategyLabel: 'Innovation',
    topHoldings: ['TSLA', 'COIN', 'ROKU'],
    returnPercent: -8.5,
    lastUpdated: new Date(),
  },
];

export const mockSocialPosts: SocialPost[] = [
  {
    id: '1',
    author: 'Market Analyst',
    handle: '@marketwizard',
    content: 'Strong earnings beat for $NVDA. AI demand continues to surge. Bullish outlook maintained.',
    tickersMentioned: ['NVDA'],
    sentiment: 'bullish',
    timestamp: new Date(Date.now() - 3600000),
    likes: 142,
  },
  {
    id: '2',
    author: 'Crypto Insider',
    handle: '@cryptonews',
    content: '$BTC breaking resistance at 67k. Next target 70k if momentum holds.',
    tickersMentioned: ['BTC'],
    sentiment: 'bullish',
    timestamp: new Date(Date.now() - 7200000),
    likes: 89,
  },
  {
    id: '3',
    author: 'Tech Trader',
    handle: '@techstocks',
    content: '$TSLA guidance concerns. Margin compression in Q4. Watching closely.',
    tickersMentioned: ['TSLA'],
    sentiment: 'bearish',
    timestamp: new Date(Date.now() - 10800000),
    likes: 67,
  },
  {
    id: '4',
    author: 'Market Watch',
    handle: '@marketwatch',
    content: 'Fed decision today. Markets pricing in hold. Watching for forward guidance on $SPY.',
    tickersMentioned: ['SPY'],
    sentiment: 'neutral',
    timestamp: new Date(Date.now() - 14400000),
    likes: 203,
  },
];
