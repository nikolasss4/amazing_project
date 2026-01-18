// Quick verification script for CryptoPanic setup
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('🔍 Verifying CryptoPanic Configuration...\n');

  // Check env vars
  const token = process.env.CRYPTOPANIC_TOKEN;
  const baseUrl = process.env.CRYPTOPANIC_BASE_URL || 'https://cryptopanic.com/api/developer/v2';

  if (!token) {
    console.log('❌ CRYPTOPANIC_TOKEN not set in environment');
    console.log('   Set it in your .env file:');
    console.log('   CRYPTOPANIC_TOKEN=your_token_here');
    console.log('   CRYPTOPANIC_BASE_URL=https://cryptopanic.com/api/developer/v2\n');
  } else {
    console.log('✅ CRYPTOPANIC_TOKEN is set');
    console.log(`✅ CRYPTOPANIC_BASE_URL: ${baseUrl}\n`);
  }

  // Check database sources
  const sources = await prisma.newsSource.findMany({
    where: {
      name: { in: ['mock', 'cryptopanic', 'newsapi'] },
    },
  });

  console.log('📊 News Source Status:');
  sources.forEach((source) => {
    const status = source.active ? '✅ ACTIVE' : '❌ DISABLED';
    console.log(`   ${status} - ${source.name} (${source.category})`);
  });

  // Check recent articles
  const recentArticles = await prisma.newsArticle.findMany({
    where: {
      source: 'cryptopanic',
    },
    orderBy: { createdAt: 'desc' },
    take: 5,
  });

  console.log(`\n📰 Recent CryptoPanic Articles: ${recentArticles.length}`);
  if (recentArticles.length > 0) {
    recentArticles.forEach((article, i) => {
      console.log(`   ${i + 1}. ${article.title.substring(0, 60)}...`);
      console.log(`      Source: ${article.source} | Published: ${article.publishedAt.toISOString().split('T')[0]}`);
    });
    console.log('\n✅ CryptoPanic data is in the database!');
  } else {
    console.log('\n⚠️  No CryptoPanic articles found.');
    console.log('   Run: POST /api/v1/news/ingest?limit=20');
    console.log('   Or: curl -X POST http://localhost:3000/api/v1/news/ingest?limit=20 -H "x-user-id: test"\n');
  }

  // Check mock articles (should be minimal)
  const mockArticles = await prisma.newsArticle.findMany({
    where: { source: 'mock' },
    take: 1,
  });

  if (mockArticles.length > 0) {
    console.log('⚠️  WARNING: Mock articles found in database');
    console.log('   Consider cleaning up: DELETE /api/v1/news/cleanup?daysOld=1\n');
  }
}

main()
  .catch((e) => {
    console.error('Error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

