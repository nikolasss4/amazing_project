/**
 * Mock X Provider (for testing without API key)
 * 
 * Generates realistic fake X posts for testing the ingestion pipeline
 * Use this when you don't have a real API key configured
 */

import { SocialSourceProvider, ExternalPost } from '../interfaces/SocialSourceProvider';

interface MockTweet {
  handle: string;
  content: string;
  likes: number;
  reposts: number;
  date: Date;
}

const MOCK_TWEETS: Record<string, MockTweet[]> = {
  elonmusk: [
    {
      handle: 'elonmusk',
      content: '$TSLA production hitting new records. Exciting times ahead for sustainable energy! 🚗⚡',
      likes: 125000,
      reposts: 18000,
      date: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hours ago
    },
    {
      handle: 'elonmusk',
      content: 'SpaceX Starship launch update: Next test flight scheduled for next month. Mars, here we come! 🚀',
      likes: 250000,
      reposts: 35000,
      date: new Date(Date.now() - 5 * 60 * 60 * 1000), // 5 hours ago
    },
    {
      handle: 'elonmusk',
      content: 'AI development needs more oversight. Working with policymakers on responsible AI frameworks.',
      likes: 89000,
      reposts: 12000,
      date: new Date(Date.now() - 12 * 60 * 60 * 1000), // 12 hours ago
    },
  ],
  VitalikButerin: [
    {
      handle: 'VitalikButerin',
      content: '$ETH gas fees continue to drop with latest optimizations. Layer 2 scaling solutions showing great progress.',
      likes: 45000,
      reposts: 8000,
      date: new Date(Date.now() - 3 * 60 * 60 * 1000),
    },
    {
      handle: 'VitalikButerin',
      content: 'Excited about the latest Ethereum Improvement Proposals (EIPs). The future of decentralized finance looks bright.',
      likes: 38000,
      reposts: 6500,
      date: new Date(Date.now() - 8 * 60 * 60 * 1000),
    },
  ],
  cz_binance: [
    {
      handle: 'cz_binance',
      content: '$BNB utility expanding across DeFi ecosystem. New partnerships announced next week.',
      likes: 52000,
      reposts: 9000,
      date: new Date(Date.now() - 1 * 60 * 60 * 1000),
    },
    {
      handle: 'cz_binance',
      content: 'Crypto adoption accelerating globally. Seeing strong growth in emerging markets.',
      likes: 67000,
      reposts: 11000,
      date: new Date(Date.now() - 6 * 60 * 60 * 1000),
    },
  ],
  michael_saylor: [
    {
      handle: 'michael_saylor',
      content: '$BTC is digital property. MicroStrategy continues to accumulate. Bitcoin is the future of money.',
      likes: 78000,
      reposts: 14000,
      date: new Date(Date.now() - 4 * 60 * 60 * 1000),
    },
    {
      handle: 'michael_saylor',
      content: 'Institutions are finally understanding Bitcoin. Seeing massive interest from corporate treasuries.',
      likes: 62000,
      reposts: 10000,
      date: new Date(Date.now() - 10 * 60 * 60 * 1000),
    },
  ],
  CathieDWood: [
    {
      handle: 'CathieDWood',
      content: '$TSLA remains a top conviction holding. Innovation in EVs and AI will drive long-term growth.',
      likes: 43000,
      reposts: 7500,
      date: new Date(Date.now() - 7 * 60 * 60 * 1000),
    },
    {
      handle: 'CathieDWood',
      content: 'Deflation is the real risk. Technology is deflationary. This changes everything for asset allocation.',
      likes: 38000,
      reposts: 6200,
      date: new Date(Date.now() - 14 * 60 * 60 * 1000),
    },
  ],
};

export class MockXProvider implements SocialSourceProvider {
  getPlatformName(): string {
    return 'x';
  }

  async isAvailable(): Promise<boolean> {
    return true;
  }

  async fetchRecentPostsByHandle(handle: string, limit: number = 10): Promise<ExternalPost[]> {
    const cleanHandle = handle.startsWith('@') ? handle.slice(1) : handle;
    
    // Get mock tweets for this handle
    const mockTweets = MOCK_TWEETS[cleanHandle] || [];
    
    return mockTweets.slice(0, limit).map((tweet, index) => ({
      platform: 'x' as const,
      post_id: `mock_${cleanHandle}_${index}_${Date.now()}`,
      author_handle: tweet.handle,
      content: tweet.content,
      url: `https://twitter.com/${tweet.handle}/status/mock_${index}`,
      engagement: {
        likes: tweet.likes,
        reposts: tweet.reposts,
        replies: Math.floor(tweet.reposts * 0.3),
        views: tweet.likes * 10,
      },
      created_at: tweet.date,
    }));
  }

  async fetchFromMultipleHandles(handles: string[], limit: number = 10): Promise<ExternalPost[]> {
    const allPosts: ExternalPost[] = [];
    
    for (const handle of handles) {
      const posts = await this.fetchRecentPostsByHandle(handle, limit);
      allPosts.push(...posts);
    }
    
    return allPosts;
  }
}

