import { prisma } from '../../config/database';
import { getCommunityFeed, getCommunityNarratives } from '../community-api.service';

describe('community-api.service', () => {
  beforeEach(async () => {
    await prisma.narrativeMetric.deleteMany({});
    await prisma.detectedNarrativeArticle.deleteMany({});
    await prisma.detectedNarrative.deleteMany({});
    await prisma.externalPost.deleteMany({});
    await prisma.newsArticle.deleteMany({});
  });

  afterAll(async () => {
    await prisma.narrativeMetric.deleteMany({});
    await prisma.detectedNarrativeArticle.deleteMany({});
    await prisma.detectedNarrative.deleteMany({});
    await prisma.externalPost.deleteMany({});
    await prisma.newsArticle.deleteMany({});
    await prisma.$disconnect();
  });

  it('returns narratives with sources and velocity', async () => {
    const news = await prisma.newsArticle.create({
      data: {
        source: 'reuters',
        title: 'AI rally boosts $NVDA',
        content: 'Stocks surge as AI demand grows.',
        url: 'https://news.example.com/ai-rally',
        publishedAt: new Date('2026-01-17T10:00:00Z'),
      },
    });

    const post = await prisma.externalPost.create({
      data: {
        platform: 'x',
        authorHandle: 'elonmusk',
        content: '$NVDA is on a breakout.',
        engagement: JSON.stringify({ likes: 10, reposts: 2 }),
        publishedAt: new Date('2026-01-17T11:00:00Z'),
        url: 'https://x.com/elonmusk/status/1',
        postId: '1',
      },
    });

    const narrative = await prisma.detectedNarrative.create({
      data: {
        title: '$NVDA Market Movement',
        summary: 'Discussion around $NVDA',
        sentiment: 'bullish',
        articles: {
          create: [
            { articleId: news.id },
            { articleId: post.id },
          ],
        },
      },
    });

    await prisma.narrativeMetric.create({
      data: {
        narrativeId: narrative.id,
        period: '24h',
        mentionCount: 2,
        velocity: 2.8,
      },
    });

    const narratives = await getCommunityNarratives(10);

    expect(narratives.length).toBeGreaterThan(0);
    const item = narratives.find((n) => n.id === narrative.id);
    expect(item).toBeTruthy();
    expect(item?.sources).toEqual(expect.arrayContaining(['news', 'x']));
    expect(item?.velocity).toBe(2.8);
  });

  it('returns merged feed items from news and x', async () => {
    await prisma.newsArticle.create({
      data: {
        source: 'bloomberg',
        title: 'Crypto markets stabilize',
        content: 'Bitcoin steadies after volatility.',
        url: 'https://news.example.com/crypto-stable',
        publishedAt: new Date('2026-01-17T09:00:00Z'),
      },
    });

    await prisma.externalPost.create({
      data: {
        platform: 'x',
        authorHandle: 'michael_saylor',
        content: '$BTC is digital gold.',
        engagement: JSON.stringify({ likes: 5, reposts: 1 }),
        publishedAt: new Date('2026-01-17T12:00:00Z'),
        url: 'https://x.com/michael_saylor/status/2',
        postId: '2',
      },
    });

    const feed = await getCommunityFeed(10);

    expect(feed.length).toBeGreaterThan(0);
    expect(feed.some((item) => item.platform === 'news')).toBe(true);
    expect(feed.some((item) => item.platform === 'x')).toBe(true);
  });
});

