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

// All mock data has been removed.
// Data is now fetched from real backend APIs via CommunityService.
