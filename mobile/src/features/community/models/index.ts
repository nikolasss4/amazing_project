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
