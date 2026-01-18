// Seed script for news sources
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('Seeding news sources...');

  // Create mock news source (DISABLED - use real APIs only)
  const mockSource = await prisma.newsSource.upsert({
    where: { name: 'mock' },
    update: { active: false }, // Disable mock data
    create: {
      name: 'mock',
      category: 'macro',
      active: false, // Disabled by default - use real APIs
    },
  });

  console.log('✅ Created/Updated news source (DISABLED):', mockSource);

  // Add NewsAPI source (now active!)
  const newsapiSource = await prisma.newsSource.upsert({
    where: { name: 'newsapi' },
    update: {},
    create: {
      name: 'newsapi',
      category: 'macro',
      active: true, // Active by default
    },
  });
  console.log('✅ Created/Updated news source:', newsapiSource);

  // Add CryptoPanic source (crypto news)
  const cryptoPanicSource = await prisma.newsSource.upsert({
    where: { name: 'cryptopanic' },
    update: {},
    create: {
      name: 'cryptopanic',
      category: 'crypto',
      active: true,
    },
  });
  console.log('✅ Created/Updated news source:', cryptoPanicSource);

  // Optionally add placeholder sources for future providers
  const placeholders = [
    { name: 'reuters', category: 'macro', active: false },
    { name: 'bloomberg', category: 'macro', active: false },
    { name: 'coindesk', category: 'crypto', active: false },
    { name: 'techcrunch', category: 'tech', active: false },
    { name: 'politico', category: 'politics', active: false },
  ];

  for (const source of placeholders) {
    await prisma.newsSource.upsert({
      where: { name: source.name },
      update: {},
      create: source,
    });
    console.log(`✅ Created/Updated news source: ${source.name}`);
  }

  console.log('');
  console.log('✅ Seeding complete!');
}

main()
  .catch((e) => {
    console.error('Error seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

