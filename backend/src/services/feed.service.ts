import { prisma } from '../config/database';

export interface SocialPostResponse {
  id: string;
  author: string;
  handle: string;
  content: string;
  tickersMentioned: string[];
  sentiment: 'bullish' | 'bearish' | 'neutral';
  timestamp: Date;
  likes: number;
}

/**
 * Get social feed posts
 */
export async function getFeed(
  limit: number = 20,
  offset: number = 0,
  sentiment?: 'bullish' | 'bearish' | 'neutral',
  ticker?: string
): Promise<{ posts: SocialPostResponse[]; total: number }> {
  const whereClause: any = {
    ...(sentiment && { sentiment }),
    ...(ticker && {
      tickers: {
        some: {
          ticker,
        },
      },
    }),
  };

  const total = await prisma.socialPost.count({ where: whereClause });

  const posts = await prisma.socialPost.findMany({
    where: whereClause,
    include: {
      user: {
        select: {
          username: true,
        },
      },
      tickers: {
        select: {
          ticker: true,
        },
      },
    },
    orderBy: { createdAt: 'desc' },
    take: limit,
    skip: offset,
  });

  const formatted: SocialPostResponse[] = posts.map((post) => ({
    id: post.id,
    author: post.user.username,
    handle: `@${post.user.username}`, // In production, use actual handle
    content: post.content,
    tickersMentioned: post.tickers.map((t) => t.ticker),
    sentiment: post.sentiment as 'bullish' | 'bearish' | 'neutral',
    timestamp: post.createdAt,
    likes: post.likesCount,
  }));

  return { posts: formatted, total };
}

/**
 * Create new social post
 */
export async function createPost(
  userId: string,
  content: string,
  sentiment: 'bullish' | 'bearish' | 'neutral',
  tickers: string[] = []
): Promise<{ id: string }> {
  // Extract tickers from content if not provided (basic regex)
  const extractedTickers = tickers.length > 0 
    ? tickers 
    : extractTickersFromContent(content);

  const post = await prisma.socialPost.create({
    data: {
      userId,
      content,
      sentiment,
      tickers: {
        create: extractedTickers.map((ticker) => ({
          ticker: ticker.toUpperCase(),
        })),
      },
    },
  });

  return { id: post.id };
}

/**
 * Basic ticker extraction from content (e.g., $NVDA, $BTC)
 */
function extractTickersFromContent(content: string): string[] {
  const tickerRegex = /\$([A-Z]{1,5})\b/g;
  const matches = content.matchAll(tickerRegex);
  const tickers = Array.from(matches, (m) => m[1]);
  return [...new Set(tickers)]; // Remove duplicates
}

