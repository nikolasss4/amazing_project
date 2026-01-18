// Seed script for tracked X accounts
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('Seeding tracked X accounts...');

  const accounts = [
    // Crypto influencers
    { platform: 'x', accountHandle: 'elonmusk', accountName: 'Elon Musk', accountType: 'celebrity' },
    { platform: 'x', accountHandle: 'michael_saylor', accountName: 'Michael Saylor', accountType: 'influencer' },
    { platform: 'x', accountHandle: 'VitalikButerin', accountName: 'Vitalik Buterin', accountType: 'influencer' },
    { platform: 'x', accountHandle: 'cz_binance', accountName: 'CZ Binance', accountType: 'influencer' },
    { platform: 'x', accountHandle: 'CathieDWood', accountName: 'Cathie Wood', accountType: 'influencer' },
    
    // Finance & Markets
    { platform: 'x', accountHandle: 'TheStalwart', accountName: 'Joe Weisenthal', accountType: 'blogger' },
    { platform: 'x', accountHandle: 'markets', accountName: 'Bloomberg Markets', accountType: 'influencer' },
    { platform: 'x', accountHandle: 'zerohedge', accountName: 'Zero Hedge', accountType: 'blogger' },
    
    // Politicians & Policy
    { platform: 'x', accountHandle: 'JeromePowell', accountName: 'Jerome Powell', accountType: 'politician' },
    { platform: 'x', accountHandle: 'SecYellen', accountName: 'Janet Yellen', accountType: 'politician' },
    
    // Tech
    { platform: 'x', accountHandle: 'elonmusk', accountName: 'Elon Musk', accountType: 'celebrity' },
    { platform: 'x', accountHandle: 'sama', accountName: 'Sam Altman', accountType: 'influencer' },
  ];

  for (const account of accounts) {
    try {
      await prisma.trackedAccount.upsert({
        where: { accountHandle: account.accountHandle },
        update: {},
        create: {
          ...account,
          isActive: true,
        },
      });
      console.log(`✅ Created/Updated account: @${account.accountHandle}`);
    } catch (error) {
      console.error(`❌ Error seeding @${account.accountHandle}:`, error.message);
    }
  }

  console.log('');
  console.log('✅ Seeding complete!');
  console.log(`📊 ${accounts.length} accounts configured`);
}

main()
  .catch((e) => {
    console.error('Error seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

