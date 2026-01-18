const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

const USERS = [
  { id: '11111111-1111-1111-1111-111111111111', username: 'alice', email: 'alice@test.com' },
  { id: '22222222-2222-2222-2222-222222222222', username: 'bob', email: 'bob@test.com' },
  { id: '33333333-3333-3333-3333-333333333333', username: 'carol', email: 'carol@test.com' },
  { id: '44444444-4444-4444-4444-444444444444', username: 'dave', email: 'dave@test.com' },
  { id: '55555555-5555-5555-5555-555555555555', username: 'eve', email: 'eve@test.com' },
  { id: '66666666-6666-6666-6666-666666666666', username: 'frank', email: 'frank@test.com' },
  { id: '77777777-7777-7777-7777-777777777777', username: 'grace', email: 'grace@test.com' },
  { id: '88888888-8888-8888-8888-888888888888', username: 'heidi', email: 'heidi@test.com' },
  { id: '99999999-9999-9999-9999-999999999999', username: 'ivan', email: 'ivan@test.com' },
  { id: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', username: 'judy', email: 'judy@test.com' },
];

const PERIODS = ['today', 'week', 'month', 'all_time'];

function randomBetween(min, max) {
  return Math.round((Math.random() * (max - min) + min) * 100) / 100;
}

async function upsertFriendship(userId, friendId) {
  if (userId === friendId) return;
  await prisma.friendship.upsert({
    where: {
      userId_friendId: { userId, friendId },
    },
    update: {},
    create: {
      userId,
      friendId,
    },
  });
}

async function main() {
  console.log('Seeding leaderboard demo users and metrics...');

  for (const user of USERS) {
    await prisma.user.upsert({
      where: { username: user.username },
      update: {},
      create: user,
    });
  }

  for (const user of USERS) {
    for (const period of PERIODS) {
      const returnPercent = randomBetween(-5, 35);
      const winRate = randomBetween(45, 85);
      const tradesCount = Math.floor(Math.random() * 80) + 10;

      await prisma.userMetric.upsert({
        where: {
          userId_period: { userId: user.id, period },
        },
        update: {
          returnPercent,
          winRate,
          tradesCount,
        },
        create: {
          userId: user.id,
          period,
          returnPercent,
          winRate,
          tradesCount,
        },
      });
    }
  }

  // Seed a small friend graph around Alice for friends leaderboard
  const aliceId = USERS[0].id;
  const friendIds = USERS.slice(1, 5).map((u) => u.id);
  for (const friendId of friendIds) {
    await upsertFriendship(aliceId, friendId);
    await upsertFriendship(friendId, aliceId);
  }

  console.log('✅ Seeded users, metrics, and friendships for leaderboard demo.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

