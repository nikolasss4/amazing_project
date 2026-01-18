// Seed script for test narratives
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('Seeding narratives and articles...');

  // Ensure we have a test user
  const user = await prisma.user.upsert({
    where: { username: 'alice' },
    update: {},
    create: {
      id: '11111111-1111-1111-1111-111111111111',
      username: 'alice',
      email: 'alice@test.com',
    },
  });
  console.log('✅ User ready:', user.username);

  // Create test news articles
  const articles = [
    {
      id: 'art-001',
      source: 'cryptopanic',
      title: 'Bitcoin Surges Past $100K as Institutional Adoption Accelerates',
      url: 'https://example.com/btc-100k',
      content: 'Bitcoin has broken through the $100,000 barrier for the first time, driven by massive institutional buying from hedge funds and corporate treasuries.',
      publishedAt: new Date(),
    },
    {
      id: 'art-002',
      source: 'cryptopanic',
      title: 'Ethereum Layer 2 Solutions See Record TVL Growth',
      url: 'https://example.com/eth-l2',
      content: 'Ethereum L2 networks including Arbitrum and Optimism have reached new highs in total value locked, surpassing $50 billion combined.',
      publishedAt: new Date(Date.now() - 3600000),
    },
    {
      id: 'art-003',
      source: 'cryptopanic',
      title: 'Solana DeFi Ecosystem Expands with New Protocols',
      url: 'https://example.com/sol-defi',
      content: 'The Solana ecosystem continues to grow with multiple new DeFi protocols launching, attracting developers with low fees and high throughput.',
      publishedAt: new Date(Date.now() - 7200000),
    },
    {
      id: 'art-004',
      source: 'cryptopanic',
      title: 'SEC Signals Positive Outlook for Crypto ETFs',
      url: 'https://example.com/sec-etf',
      content: 'The Securities and Exchange Commission has indicated a more favorable stance towards cryptocurrency ETF applications.',
      publishedAt: new Date(Date.now() - 10800000),
    },
    {
      id: 'art-005',
      source: 'cryptopanic',
      title: 'Major Bank Announces Crypto Custody Services',
      url: 'https://example.com/bank-custody',
      content: 'One of the largest banks has announced plans to offer cryptocurrency custody services to institutional clients starting next quarter.',
      publishedAt: new Date(Date.now() - 14400000),
    },
  ];

  for (const article of articles) {
    await prisma.newsArticle.upsert({
      where: { url: article.url },
      update: { title: article.title, content: article.content, publishedAt: article.publishedAt },
      create: article,
    });
  }
  console.log('✅ Created', articles.length, 'news articles');

  // Create test narratives
  const narratives = [
    {
      id: 'nar-001',
      title: 'Bitcoin Institutional Adoption Wave',
      summary: 'Major institutions are increasingly adopting Bitcoin, driving prices to new highs as corporate treasuries and hedge funds accumulate.',
      sentiment: 'bullish',
    },
    {
      id: 'nar-002',
      title: 'Ethereum L2 Scaling Success',
      summary: 'Layer 2 solutions are successfully scaling Ethereum with record TVL, reducing gas fees and improving user experience.',
      sentiment: 'bullish',
    },
    {
      id: 'nar-003',
      title: 'Regulatory Clarity Emerging',
      summary: 'US regulators showing more positive stance towards crypto assets, potentially opening doors for more institutional products.',
      sentiment: 'bullish',
    },
    {
      id: 'nar-004',
      title: 'DeFi Renaissance on Alternative L1s',
      summary: 'Solana and other L1s seeing renewed DeFi activity and innovation with new protocols launching.',
      sentiment: 'neutral',
    },
  ];

  for (const narrative of narratives) {
    await prisma.detectedNarrative.upsert({
      where: { id: narrative.id },
      update: { title: narrative.title, summary: narrative.summary, sentiment: narrative.sentiment, updatedAt: new Date() },
      create: narrative,
    });
  }
  console.log('✅ Created', narratives.length, 'narratives');

  // Get actual article IDs from database
  const dbArticles = await prisma.newsArticle.findMany({ select: { id: true, url: true } });
  const articleIdMap = {};
  for (const a of dbArticles) {
    if (a.url.includes('btc-100k')) articleIdMap['art-001'] = a.id;
    if (a.url.includes('eth-l2')) articleIdMap['art-002'] = a.id;
    if (a.url.includes('sol-defi')) articleIdMap['art-003'] = a.id;
    if (a.url.includes('sec-etf')) articleIdMap['art-004'] = a.id;
    if (a.url.includes('bank-custody')) articleIdMap['art-005'] = a.id;
  }

  // Link articles to narratives
  const links = [
    { narrativeId: 'nar-001', articleId: articleIdMap['art-001'] || 'art-001' },
    { narrativeId: 'nar-001', articleId: articleIdMap['art-005'] || 'art-005' },
    { narrativeId: 'nar-002', articleId: articleIdMap['art-002'] || 'art-002' },
    { narrativeId: 'nar-003', articleId: articleIdMap['art-004'] || 'art-004' },
    { narrativeId: 'nar-004', articleId: articleIdMap['art-003'] || 'art-003' },
  ];

  for (const link of links) {
    await prisma.detectedNarrativeArticle.upsert({
      where: {
        narrativeId_articleId: {
          narrativeId: link.narrativeId,
          articleId: link.articleId,
        },
      },
      update: {},
      create: link,
    });
  }
  console.log('✅ Linked articles to narratives');

  // Create narrative metrics
  for (const narrative of narratives) {
    await prisma.narrativeMetric.upsert({
      where: {
        id: `metric-${narrative.id}`,
      },
      update: {
        velocity: Math.random() * 100 + 10,
        mentionCount: Math.floor(Math.random() * 10) + 2,
        calculatedAt: new Date(),
      },
      create: {
        id: `metric-${narrative.id}`,
        narrativeId: narrative.id,
        period: '24h',
        velocity: Math.random() * 100 + 10,
        mentionCount: Math.floor(Math.random() * 10) + 2,
        calculatedAt: new Date(),
      },
    });
  }
  console.log('✅ Created narrative metrics');

  console.log('');
  console.log('🎉 Seeding complete! The Global page should now show narratives.');
}

main()
  .catch((e) => {
    console.error('Error seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
