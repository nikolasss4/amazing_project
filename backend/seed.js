// Quick seed script to create test users
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  // Create test users
  const user1 = await prisma.user.upsert({
    where: { username: 'alice' },
    update: {},
    create: {
      id: '11111111-1111-1111-1111-111111111111',
      username: 'alice',
      email: 'alice@test.com',
    },
  });

  const user2 = await prisma.user.upsert({
    where: { username: 'bob' },
    update: {},
    create: {
      id: '22222222-2222-2222-2222-222222222222',
      username: 'bob',
      email: 'bob@test.com',
    },
  });

  console.log('✅ Created test users:', { user1, user2 });
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

